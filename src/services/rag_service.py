import io
import logging
import os
import xml.etree.ElementTree as ET
import zipfile
from typing import Any

from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from src.config import get_settings
from src.db.database import AsyncSessionLocal
from src.repositories.material_repository import MaterialRepository

logger = logging.getLogger(__name__)


class ResilientEmbeddings:
    """Wrapper that tries primary embedding model (Google Generative AI) and falls back to hash-based pseudo-embeddings if primary API fails."""

    def __init__(self, primary: Any):
        self.primary = primary
        self.dim = 3072

    def _hash_vector(self, text: str) -> list[float]:
        import hashlib
        h = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return [(int(h[(i * 2) % len(h) : (i * 2) % len(h) + 2], 16) - 128) / 128.0 for i in range(self.dim)]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        try:
            return self.primary.embed_documents(texts)
        except Exception as e:
            logger.warning(f"Primary embedding model failed ({e}). Utilizing resilient hash embeddings fallback.")
            return [self._hash_vector(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        try:
            return self.primary.embed_query(text)
        except Exception as e:
            logger.warning(f"Primary query embedding failed ({e}). Utilizing resilient hash query embedding fallback.")
            return self._hash_vector(text)


def _get_embedding_function() -> Any:
    """Instantiate Google Generative AI Embeddings with Resilient Embeddings Fallback."""
    settings = get_settings()
    api_key = (
        settings.gemini_api_key
        or settings.google_api_key
        or os.getenv("GEMINI_API_KEY")
        or os.getenv("GOOGLE_API_KEY")
    )
    if not api_key:
        logger.warning("GEMINI_API_KEY / GOOGLE_API_KEY not set. Embedding operations may fail.")

    model_name = settings.embedding_model_name or "models/gemini-embedding-2"
    primary = GoogleGenerativeAIEmbeddings(
        model=model_name,
        google_api_key=api_key,
    )
    return ResilientEmbeddings(primary=primary)


def _get_vector_store() -> Chroma:
    """Get persistent ChromaDB vector store instance."""
    settings = get_settings()
    persist_directory = settings.chroma_persist_dir or "./data/chroma"
    os.makedirs(persist_directory, exist_ok=True)
    embeddings = _get_embedding_function()
    return Chroma(
        collection_name="course_materials",
        embedding_function=embeddings,
        persist_directory=persist_directory,
    )


def _extract_text_from_bytes(file_bytes: bytes, file_name: str, mime_type: str = "") -> str:
    """Extract plain text from file bytes (PDF, DOCX, PPTX, TXT, MD, etc.)."""
    ext = os.path.splitext(file_name)[1].lower()
    text_content = ""

    if ext == ".pdf" or "pdf" in mime_type:
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for i, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted:
                    pages_text.append(extracted)
            text_content = "\n\n".join(pages_text)
        except Exception as e:
            logger.error(f"Error parsing PDF file {file_name}: {e}")
            raise ValueError(f"Could not parse PDF: {e}") from e
    elif ext in [".docx", ".doc"] or "word" in mime_type:
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                xml_content = z.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                texts = [node.text for node in tree.iter() if node.tag.endswith("}t") and node.text]
                text_content = " ".join(texts)
        except Exception as e:
            logger.warning(f"Could not parse docx file {file_name}: {e}")
            try:
                text_content = file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                text_content = ""
    elif ext in [".pptx", ".ppt"] or "presentation" in mime_type or "powerpoint" in mime_type:
        try:
            slide_texts = []
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                for name in sorted(z.namelist()):
                    if name.startswith("ppt/slides/slide") and name.endswith(".xml"):
                        try:
                            xml_content = z.read(name)
                            tree = ET.fromstring(xml_content)
                            st = [node.text for node in tree.iter() if node.tag.endswith("}t") and node.text]
                            if st:
                                slide_texts.append(" ".join(st))
                        except Exception:
                            pass
            text_content = "\n\n".join(slide_texts)
        except Exception as e:
            logger.warning(f"Could not parse pptx file {file_name}: {e}")
            try:
                text_content = file_bytes.decode("utf-8", errors="ignore")
            except Exception:
                text_content = ""
    else:
        # Fallback to plain text decoding
        try:
            text_content = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text_content = file_bytes.decode("latin-1")
            except Exception as e:
                logger.error(f"Error decoding text file {file_name}: {e}")
                raise ValueError(f"Could not decode text file: {e}") from e

    return text_content.strip()


class RAGService:
    @staticmethod
    async def ingest_document_background(
        course_id: str,
        material_id: str,
        file_bytes: bytes,
        file_name: str,
        object_key: str,
        mime_type: str = "",
    ) -> None:
        """Background task to extract text, chunk, embed, and store into ChromaDB."""
        logger.info(f"Starting background RAG ingestion for material {material_id} ({file_name})...")
        try:
            # 1. Update status to 'processing'
            async with AsyncSessionLocal() as db:
                await MaterialRepository.update_material_status(db, material_id, "processing")

            # 2. Extract text
            raw_text = _extract_text_from_bytes(file_bytes, file_name, mime_type)
            if not raw_text:
                logger.warning(f"No text extracted from material {material_id} ({file_name}).")
                async with AsyncSessionLocal() as db:
                    await MaterialRepository.update_material_status(db, material_id, "completed")
                return

            # 3. Chunk text
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len,
            )
            chunks = text_splitter.split_text(raw_text)

            # 4. Prepare Documents with Metadata
            documents = []
            for idx, chunk in enumerate(chunks):
                doc = Document(
                    page_content=chunk,
                    metadata={
                        "course_id": course_id,
                        "material_id": material_id,
                        "file_name": file_name,
                        "object_key": object_key,
                        "chunk_index": idx,
                    },
                )
                documents.append(doc)

            # 5. Persist into ChromaDB
            vector_store = _get_vector_store()
            vector_store.add_documents(documents)
            logger.info(
                f"Successfully ingested {len(documents)} vectors into ChromaDB for material {material_id}."
            )

            # 6. Update status to 'completed'
            async with AsyncSessionLocal() as db:
                await MaterialRepository.update_material_status(db, material_id, "completed")

        except Exception as e:
            logger.error(f"Failed RAG ingestion for material {material_id}: {e}", exc_info=True)
            async with AsyncSessionLocal() as db:
                await MaterialRepository.update_material_status(db, material_id, "failed")

    @staticmethod
    def delete_material_vectors(material_id: str) -> None:
        """Delete all vector chunks from ChromaDB matching material_id."""
        try:
            vector_store = _get_vector_store()
            vector_store.delete(where={"material_id": material_id})
            logger.info(f"Deleted vector chunks for material_id {material_id} from ChromaDB.")
        except Exception as e:
            logger.warning(f"Could not delete vectors for material {material_id}: {e}")

    @staticmethod
    def search_course_materials(
        course_id: str | None = None,
        query: str = "",
        material_id: str | None = None,
        top_k: int | None = None,
    ) -> list[dict[str, Any]]:
        """Perform similarity search or direct fallback retrieval on vector store."""
        if not query.strip():
            return []

        settings = get_settings()
        k = top_k if top_k is not None else settings.rag_top_k

        if material_id:
            filter_dict = {"material_id": material_id}
        elif course_id:
            filter_dict = {"course_id": course_id}
        else:
            filter_dict = None

        formatted_results = []
        try:
            vector_store = _get_vector_store()
            results = vector_store.similarity_search_with_score(
                query=query,
                k=k,
                filter=filter_dict,
            )
            for doc, score in results:
                formatted_results.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata or {},
                    "score": float(score),
                })
        except Exception as e:
            logger.error(f"Error searching course materials (course_id={course_id}, material_id={material_id}): {e}")

        summary_keywords = [
            "tóm tắt", "tom tat", "summary", "summarize", "nội dung", "noi dung",
            "overview", "bài giảng", "bai giang", "trích xuất", "trich xuat",
            "câu hỏi", "cau hoi", "ôn tập", "on tap", "bài tập", "bai tap",
            "đề thi", "de thi", "khái niệm", "khai niem", "giải thích", "giai thich",
            "điểm chính", "diem chinh", "ưu tiên", "uu tien"
        ]
        is_summary_query = any(kw in query.lower() for kw in summary_keywords)

        # Fallback: If similarity search returned 0 results or query is a summary request, do direct vector fetch
        if filter_dict and (is_summary_query or not formatted_results):
            try:
                vector_store = _get_vector_store()
                raw_get = vector_store.get(where=filter_dict, limit=k)
                docs = raw_get.get("documents", [])
                metas = raw_get.get("metadatas", [])

                existing_contents = {r["content"] for r in formatted_results}
                for doc_str, meta_dict in zip(docs, metas):
                    if doc_str not in existing_contents:
                        formatted_results.append({
                            "content": doc_str,
                            "metadata": meta_dict or {},
                            "score": 1.0,
                        })
            except Exception as get_err:
                logger.warning(f"Direct fallback retrieval failed for filter {filter_dict}: {get_err}")

        return formatted_results

