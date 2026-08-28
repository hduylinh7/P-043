"""
Script chạy LangGraph Agent sản phẩm trên danh sách câu hỏi kiểm thử.
Trích xuất context thực tế từ Qdrant và câu trả lời sinh ra,
lưu ra dataset định dạng RAGAS chuẩn.

Sử dụng: python scripts/run_agent_eval_dataset.py

==============================================================================
TODO - 3 ĐIỂM CẦN TỰ KIỂM TRA TRƯỚC KHI CHẠY:

1. [SAMPLE_QUERIES trong generate_eval_questions.py - XEM FILE KIA]
   Xem TODO trong scripts/generate_eval_questions.py.

2. [get_llm() và RAGService - ĐÃ XÁC NHẬN]
   Không liên quan trực tiếp file này. Đã xác nhận đúng ở generate_eval_questions.py.

3. [AgentState schema - ĐÃ XÁC NHẬN]
   Schema AgentState trong `src/agents/state.py` có các field:
     - "query": str           ← state_input dùng key này ✓
     - "messages": list[BaseMessage] với add_messages reducer ← ✓
     - "course_id": str|None  ← optional, không bắt buộc khi eval
     - "retrieved_docs": list[dict] ← output key lấy contexts ✓
     - "context_text": str    ← fallback output key ✓
     - "response": str        ← output key lấy câu trả lời ✓
   build_graph() trong src/agents/graph.py KHÔNG có checkpointer (graph.compile()
   không truyền checkpointer), nên config thread_id vô hại nhưng an toàn để giữ.
==============================================================================
"""

import asyncio
import json
import logging
import os
import sys
from typing import Any, Dict, List, Union

# Thêm project root vào sys.path để import từ src.*
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_core.documents import Document
from langchain_core.messages import HumanMessage

from src.agents.graph import build_graph

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


def extract_content(doc: Union[Dict[str, Any], Document, Any]) -> str:
    """
    Helper trích xuất text content từ một document, xử lý cả 2 kiểu:
    - dict: lấy doc.get("content", "")
    - LangChain Document object: lấy doc.page_content

    Args:
        doc: Phần tử document từ retrieved_docs (dict hoặc Document object).

    Returns:
        str: Nội dung văn bản đã trích xuất, rỗng nếu không lấy được.
    """
    if isinstance(doc, dict):
        return doc.get("content", "").strip()
    if isinstance(doc, Document):
        return (doc.page_content or "").strip()
    # Fallback cho các kiểu không xác định
    content = getattr(doc, "page_content", None) or getattr(doc, "content", None)
    return str(content).strip() if content else ""


async def run_agent_on_dataset_async(
    questions_file: str = "eval_questions.json",
    output_file: str = "eval_dataset.json",
    failures_file: str = "eval_failures.json",
) -> Dict[str, List[Any]]:
    """
    Đọc tệp eval_questions.json, gọi LangGraph Agent thực tế, lấy câu trả lời +
    context trích xuất từ Qdrant. Ghi kết quả thành công ra eval_dataset.json (chuẩn RAGAS)
    và các câu hỏi lỗi ra eval_failures.json (tách riêng để không làm sai điểm RAGAS).

    Args:
        questions_file: Đường dẫn tệp chứa các câu hỏi kiểm thử (JSON).
        output_file: Đường dẫn tệp xuất dataset RAGAS chỉ gồm kết quả thành công (JSON).
        failures_file: Đường dẫn tệp lưu các câu hỏi bị lỗi khi gọi agent (JSON).

    Returns:
        Dict[str, List[Any]]: Dataset theo cấu trúc chuẩn RAGAS
            {question, contexts, answer, ground_truth, category}.
    """
    logger.info("==================================================")
    logger.info("    BƯỚC 2: CHẠY AGENT TRÊN TẬP DỮ LIỆU ĐÁNH GIÁ   ")
    logger.info("==================================================")

    if not os.path.exists(questions_file):
        raise FileNotFoundError(
            f"Không tìm thấy tệp câu hỏi '{questions_file}'. "
            "Vui lòng chạy Bước 1 (generate_questions) trước."
        )

    with open(questions_file, "r", encoding="utf-8") as f:
        questions_data: List[Dict[str, Any]] = json.load(f)

    logger.info(f"Đã tải {len(questions_data)} câu hỏi từ '{questions_file}'.")
    logger.info("Khởi tạo LangGraph Agent sản phẩm...")

    agent_app = build_graph()

    # Dataset RAGAS — chỉ chứa các câu hỏi thành công
    ragas_dataset: Dict[str, List[Any]] = {
        "question": [],
        "contexts": [],
        "answer": [],
        "ground_truth": [],
        "category": [],
    }

    # Danh sách câu hỏi lỗi — tách riêng để không ảnh hưởng đến điểm RAGAS
    failures: List[Dict[str, str]] = []

    for idx, item in enumerate(questions_data, start=1):
        q_text = item.get("question", "").strip()
        gt_text = item.get("ground_truth", "").strip()
        category = item.get("category", "unspecified")

        logger.info(f"[{idx}/{len(questions_data)}] '{q_text[:70]}...'")

        try:
            state_input = {
                "query": q_text,
                "messages": [HumanMessage(content=q_text)],
            }

            # Thread_id riêng biệt cho mỗi câu hỏi — tránh state bị lẫn khi dùng checkpointer
            config = {"configurable": {"thread_id": f"eval-{idx}"}}

            state_output = await agent_app.ainvoke(state_input, config=config)

            # Lấy câu trả lời thực tế
            actual_answer = state_output.get("response", "").strip()
            if not actual_answer and state_output.get("messages"):
                last_msg = state_output["messages"][-1]
                actual_answer = str(getattr(last_msg, "content", "")).strip()

            # Trích xuất contexts thực tế từ Qdrant — xử lý cả dict lẫn Document object
            retrieved_docs = state_output.get("retrieved_docs", [])
            extracted_contexts: List[str] = []
            for doc in retrieved_docs:
                content = extract_content(doc)
                if content:
                    extracted_contexts.append(content)

            # Fallback: dùng context_text nếu retrieved_docs rỗng
            if not extracted_contexts:
                ctx_str = state_output.get("context_text", "").strip()
                no_ctx_sentinel = "No relevant course material context was found in the database."
                if ctx_str and ctx_str != no_ctx_sentinel:
                    extracted_contexts = [ctx_str]

            if not extracted_contexts:
                extracted_contexts = ["No relevant context found in vector store."]

            ragas_dataset["question"].append(q_text)
            ragas_dataset["contexts"].append(extracted_contexts)
            ragas_dataset["answer"].append(actual_answer)
            ragas_dataset["ground_truth"].append(gt_text)
            ragas_dataset["category"].append(category)

            logger.info(
                f"  ✓ Thành công | answer: {len(actual_answer)} ký tự | "
                f"chunks: {len(extracted_contexts)}"
            )

        except Exception as e:
            error_msg = str(e)
            logger.error(
                f"  ❌ Thất bại | câu hỏi #{idx} ('{q_text[:50]}...'): {error_msg}"
            )
            # Ghi vào danh sách lỗi riêng — KHÔNG đưa vào eval_dataset.json
            failures.append({
                "question": q_text,
                "category": category,
                "error_message": error_msg,
            })

        # Tránh vượt quá tốc độ gọi API
        await asyncio.sleep(1.0)

    # Lưu eval_dataset.json (chỉ các câu thành công)
    out_dir = os.path.dirname(output_file)
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(ragas_dataset, f, ensure_ascii=False, indent=2)

    # Lưu eval_failures.json (các câu lỗi — tách riêng)
    if failures:
        fail_dir = os.path.dirname(failures_file)
        if fail_dir:
            os.makedirs(fail_dir, exist_ok=True)
        with open(failures_file, "w", encoding="utf-8") as f:
            json.dump(failures, f, ensure_ascii=False, indent=2)

    total = len(questions_data)
    success_count = len(ragas_dataset["question"])
    failure_count = len(failures)

    logger.info("==================================================")
    logger.info("🎉 Hoàn thành xử lý dataset!")
    logger.info(f"  - Tổng số câu hỏi   : {total}")
    logger.info(f"  - Thành công         : {success_count} → '{output_file}'")
    logger.info(
        f"  - Thất bại           : {failure_count}"
        + (f" → '{failures_file}'" if failure_count > 0 else " (không có lỗi)")
    )
    logger.info("==================================================\n")

    return ragas_dataset


def run_agent_on_dataset(
    questions_file: str = "eval_questions.json",
    output_file: str = "eval_dataset.json",
    failures_file: str = "eval_failures.json",
) -> Dict[str, List[Any]]:
    """Sync wrapper cho run_agent_on_dataset_async."""
    return asyncio.run(
        run_agent_on_dataset_async(
            questions_file=questions_file,
            output_file=output_file,
            failures_file=failures_file,
        )
    )


if __name__ == "__main__":
    run_agent_on_dataset()
