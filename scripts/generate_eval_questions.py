"""
Script tự động sinh tập câu hỏi đánh giá (evaluation questions) từ tài liệu môn học.
Hỗ trợ sinh đa dạng loại câu hỏi (factual, multi_hop, out_of_scope, ambiguous).

Sử dụng: python scripts/generate_eval_questions.py

==============================================================================
TODO - 3 ĐIỂM CẦN TỰ KIỂM TRA TRƯỚC KHI CHẠY:

1. [SAMPLE_QUERIES - BẮT BUỘC KIỂM TRA]
   Trong hàm load_context_chunks_from_qdrant_or_dir() bên dưới, biến `sample_queries`
   chứa các câu hỏi dùng để truy vấn Qdrant lấy ngữ cảnh mẫu làm seed sinh câu hỏi eval.
   Hiện tại để là ví dụ chung về "Machine Learning / AI" — CÓ THỂ KHÔNG ĐÚNG với tài
   liệu thật đang ingest trong Qdrant của project.
   → Hãy thay bằng 5-8 câu hỏi thuộc đúng domain/chủ đề môn học thật có trong Qdrant.

2. [get_llm() - ĐÃ XÁC NHẬN]
   Hàm `get_llm(temperature=0.3)` trong `src/services/llm.py` tồn tại và đúng signature.
   Tham số: model_name (str|None), temperature (float|None), provider (str|None).
   Trả về: BaseChatModel. KHÔNG cần sửa.

3. [RAGService.search_course_materials() - ĐÃ XÁC NHẬN]
   Class RAGService trong `src/services/rag_service.py` là @staticmethod.
   Signature: search_course_materials(course_id=None, query="", material_id=None,
   assignment_id=None, top_k=None) -> list[dict[str, Any]]
   Mỗi phần tử trả về là dict với key: "content", "metadata", "score". KHÔNG cần sửa.
==============================================================================
"""

import os
import json
import logging
import random
import time
from typing import Any, Dict, List, Optional

from langchain_core.messages import HumanMessage, SystemMessage

from src.services.llm import get_llm
from src.services.rag_service import RAGService

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def load_context_chunks_from_qdrant_or_dir(
    docs_dir: str = "data/course_materials",
    sample_limit: int = 40,
) -> List[Dict[str, Any]]:
    """
    Tải các đoạn ngữ cảnh (context chunks) từ thư mục tài liệu địa phương
    hoặc trích xuất trực tiếp từ Qdrant Vector Store thực tế.

    Args:
        docs_dir: Thư mục chứa tài liệu môn học (PDF/TXT/MD).
        sample_limit: Số lượng đoạn ngữ cảnh mẫu tối đa cần tải.

    Returns:
        List[Dict[str, Any]]: Danh sách các chunk dạng {"file_name": ..., "content": ...}.
    """
    chunks: List[Dict[str, Any]] = []

    # 1. Thử tải từ thư mục địa phương nếu tồn tại và có file
    if os.path.exists(docs_dir) and os.path.isdir(docs_dir):
        files = [
            os.path.join(docs_dir, f)
            for f in os.listdir(docs_dir)
            if f.endswith((".pdf", ".txt", ".md"))
        ]
        if files:
            logger.info(f"Đang tải tài liệu từ thư mục địa phương '{docs_dir}' ({len(files)} tệp)...")
            for fpath in files[:10]:
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        text = f.read().strip()
                    if text:
                        chunks.append({
                            "file_name": os.path.basename(fpath),
                            "content": text[:2000],
                        })
                except Exception as e:
                    logger.warning(f"Không thể đọc tệp '{fpath}': {e}")

    # 2. Nếu chưa đủ chunks, lấy từ Qdrant Vector Store sản phẩm
    if len(chunks) < 5:
        logger.info("Đang trích xuất ngữ cảnh thực tế từ cơ sở dữ liệu Vector Qdrant...")

        # TODO [SAMPLE_QUERIES]: Thay các câu hỏi bên dưới bằng câu hỏi đúng với
        # domain/chủ đề môn học thật đang có trong Qdrant của project.
        # Ví dụ hiện tại chỉ là placeholder về chủ đề "Machine Learning/AI".
        sample_queries = [
            "Khái niệm Machine Learning và AI",
            "Phân loại thuật toán học máy có giám sát",
            "Đánh giá mô hình overfitting underfitting",
            "Quy trình chuẩn bị dữ liệu khai phá dữ liệu",
            "Thuật toán phân cụm k-means và PCA",
            "Đánh giá bài toán hồi quy và phân loại",
            "Xử lý dữ liệu rỗng và outlier trong Pandas",
            "Thư viện Scikit-learn và mô hình học máy",
        ]

        for q in sample_queries:
            try:
                docs = RAGService.search_course_materials(query=q, top_k=3)
                for doc in docs:
                    content = doc.get("content", "").strip()
                    file_name = doc.get("metadata", {}).get("file_name", "Course_Material")
                    if content and not any(c["content"] == content for c in chunks):
                        chunks.append({"file_name": file_name, "content": content})
            except Exception as e:
                logger.warning(f"Lỗi truy vấn Qdrant cho sample '{q}': {e}")

    logger.info(f"Đã chuẩn bị tổng cộng {len(chunks)} đoạn ngữ cảnh thực tế.")
    return chunks[:sample_limit]


def generate_synthetic_question(
    category: str,
    context_chunks: List[Dict[str, Any]],
    llm: Any,
) -> Optional[Dict[str, str]]:
    """
    Sinh 1 câu hỏi tổng hợp + ground_truth theo đúng thể loại category bằng LLM.

    Args:
        category: Thể loại câu hỏi ('factual', 'multi_hop', 'out_of_scope', 'ambiguous').
        context_chunks: Danh sách các chunk ngữ cảnh làm tư liệu sinh câu hỏi.
        llm: LLM client sản phẩm (BaseChatModel).

    Returns:
        Optional[Dict[str, str]]: {question, ground_truth, category} hoặc None nếu thất bại.
    """
    category_instructions: Dict[str, str] = {
        "factual": (
            "Generate a direct factual question requiring specific information available in the context. "
            "The ground_truth must be a concise, accurate answer derived entirely from the context."
        ),
        "multi_hop": (
            "Generate a multi-hop or comparison question that requires combining or comparing "
            "multiple points from the context. "
            "The ground_truth must synthesize information from all relevant parts."
        ),
        "out_of_scope": (
            "Generate a question NOT covered by the material at all "
            "(e.g. weather, gold price, sports results, stock market). "
            "The ground_truth must clearly state the material does not provide information on this topic."
        ),
        "ambiguous": (
            "Generate a vague question that lacks clear context "
            "(e.g. 'What does that function do?', 'How do I adjust this parameter?'). "
            "The ground_truth must explain the ambiguity or provide assumed interpretations."
        ),
    }

    selected = random.sample(context_chunks, min(len(context_chunks), 2)) if context_chunks else []
    ctx_text = (
        "\n\n".join([f"[{c['file_name']}]\n{c['content']}" for c in selected])
        if selected
        else "No context available."
    )

    prompt = f"""You are a RAG evaluation dataset builder.
Task: Generate exactly 1 test question of type '{category}' and its ground_truth answer.

CONTEXT FROM COURSE MATERIALS:
{ctx_text}

REQUIREMENTS FOR TYPE '{category}':
{category_instructions.get(category, "")}

OUTPUT FORMAT:
Write the question and ground_truth in Vietnamese.
Return ONLY valid JSON, no extra text:
{{
  "question": "Vietnamese question text here",
  "ground_truth": "Vietnamese ground truth answer here"
}}"""

    messages = [
        SystemMessage(content="You are a RAG evaluation question generator. Always respond with valid JSON only."),
        HumanMessage(content=prompt),
    ]

    try:
        resp = llm.invoke(messages)
        content = resp.content if isinstance(resp.content, str) else str(resp.content)
        content = content.strip()
        # Loại bỏ markdown code fence nếu có
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            if content.startswith("json"):
                content = content[4:].strip()
        data = json.loads(content)
        q = data.get("question", "").strip()
        gt = data.get("ground_truth", "").strip()
        if q and gt:
            return {"question": q, "ground_truth": gt, "category": category}
    except Exception as e:
        logger.warning(f"Lỗi khi sinh câu hỏi thể loại '{category}': {e}")
    return None


def generate_questions(
    docs_dir: str = "data/course_materials",
    output_file: str = "eval_questions.json",
    target_per_category: int = 10,
) -> List[Dict[str, Any]]:
    """
    Sinh tập câu hỏi kiểm thử + ground_truth từ tài liệu thật và lưu ra eval_questions.json.

    Args:
        docs_dir: Thư mục tài liệu hoặc nguồn dữ liệu.
        output_file: Đường dẫn tệp lưu kết quả JSON.
        target_per_category: Số lượng câu hỏi mục tiêu cho mỗi thể loại.

    Returns:
        List[Dict[str, Any]]: Tập danh sách câu hỏi đã sinh.
    """
    logger.info("==================================================")
    logger.info("       BƯỚC 1: SINH CÂU HỎI & GROUND TRUTH        ")
    logger.info("==================================================")

    llm = get_llm(temperature=0.3)
    chunks = load_context_chunks_from_qdrant_or_dir(docs_dir=docs_dir)

    categories = ["factual", "multi_hop", "out_of_scope", "ambiguous"]
    generated_questions: List[Dict[str, Any]] = []

    for cat in categories:
        logger.info(f"Đang sinh các câu hỏi thể loại '{cat}' (Mục tiêu: {target_per_category} câu)...")
        cat_count = 0
        attempts = 0
        max_attempts = target_per_category * 2

        while cat_count < target_per_category and attempts < max_attempts:
            attempts += 1
            res = generate_synthetic_question(category=cat, context_chunks=chunks, llm=llm)
            if res and not any(q["question"] == res["question"] for q in generated_questions):
                generated_questions.append(res)
                cat_count += 1
                logger.info(f"  + [{cat_count}/{target_per_category}] '{res['question'][:60]}...'")
            # Delay để tránh TPM rate limit (~8000 token/phút) của Groq.
            # Mỗi call tốn ~1600 token → tối đa 5 call/phút → sleep 12s/call.
            time.sleep(12.0)

    # Thống kê kết quả
    stats = {cat: sum(1 for q in generated_questions if q["category"] == cat) for cat in categories}
    logger.info("\n--- THỐNG KÊ SỐ LƯỢNG CÂU HỎI THEO CATEGORY ---")
    for cat, count in stats.items():
        logger.info(f"  - {cat:<15}: {count} câu")
        if count < 5:
            logger.warning(f"  ⚠️  CẢNH BÁO: Category '{cat}' có ít hơn 5 câu ({count} câu)!")

    # Lưu ra tệp
    out_dir = os.path.dirname(output_file)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(generated_questions, f, ensure_ascii=False, indent=2)

    logger.info(f"\n✅ Đã tạo thành công {len(generated_questions)} câu hỏi và lưu tại '{output_file}'.\n")
    return generated_questions


if __name__ == "__main__":
    generate_questions()
