import io
import logging
import os
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


def _get_embedding_function() -> GoogleGenerativeAIEmbeddings:
    """Instantiate Google Generative AI Embeddings (text-embedding-004)."""
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
    return GoogleGenerativeAIEmbeddings(
        model=model_name,
        google_api_key=api_key,
    )


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
    """Extract plain text from file bytes (PDF, TXT, MD, etc.)."""
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
    def search_course_materials(course_id: str, query: str, top_k: int = 4) -> list[dict[str, Any]]:
        """Perform similarity search scoped strictly to course_id."""
        try:
            vector_store = _get_vector_store()
            results = vector_store.similarity_search_with_score(
                query=query,
                k=top_k,
                filter={"course_id": course_id},
            )
            formatted_results = []
            for doc, score in results:
                formatted_results.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": float(score),
                })
            return formatted_results
        except Exception as e:
            logger.error(f"Error searching course materials for course {course_id}: {e}")
            return []
