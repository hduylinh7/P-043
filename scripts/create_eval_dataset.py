"""
Script tổng hợp tạo evaluation dataset cho dự án AI Learning Companion Agent.
Thực hiện 2 bước chính:
1. generate_questions(): Sinh câu hỏi + ground_truth từ tài liệu thực (Qdrant/Local) -> eval_questions.json
2. run_agent_on_dataset(): Chạy LangGraph Agent sản phẩm, lấy context thực tế từ Qdrant + answer -> eval_dataset.json (RAGAS format)

Chạy: python scripts/create_eval_dataset.py
"""

import sys
import os

# Đảm bảo PYTHONPATH bao gồm thư mục gốc dự án
sys.path.insert(0, os.path.abspath("."))

from scripts.generate_eval_questions import generate_questions
from scripts.run_agent_eval_dataset import run_agent_on_dataset


def create_eval_dataset(
    docs_dir: str = "data/course_materials",
    questions_file: str = "eval_questions.json",
    dataset_file: str = "eval_dataset.json",
    target_per_category: int = 10
):
    """
    Thực hiện quy trình 2 bước tạo evaluation dataset chuẩn RAGAS từ dữ liệu thực tế.
    
    Args:
        docs_dir: Thư mục chứa tài liệu môn học.
        questions_file: Tệp đường dẫn lưu câu hỏi đã sinh ở bước 1.
        dataset_file: Tệp đường dẫn lưu dataset RAGAS hoàn chỉnh ở bước 2.
        target_per_category: Số lượng câu hỏi mục tiêu cho mỗi thể loại (factual, multi_hop, out_of_scope, ambiguous).
    """
    print("==================================================")
    print("   QUY TRÌNH TẠO EVALUATION DATASET CHO RAGAS     ")
    print("==================================================")

    # Bước 1: Sinh câu hỏi + ground_truth từ tài liệu thật
    print("\n---> Đang thực hiện BƯỚC 1: Sinh câu hỏi & ground_truth...")
    generate_questions(
        docs_dir=docs_dir,
        output_file=questions_file,
        target_per_category=target_per_category
    )

    # Bước 2: Chạy LangGraph Agent trên danh sách câu hỏi thu được
    print("\n---> Đang thực hiện BƯỚC 2: Chạy LangGraph Agent và trích xuất ngữ cảnh...")
    run_agent_on_dataset(
        questions_file=questions_file,
        output_file=dataset_file
    )

    print("\n✨ HOÀN THÀNH QUY TRÌNH! Dataset đã sẵn sàng tại 'eval_dataset.json' cho RAGAS Evaluation.\n")


if __name__ == "__main__":
    create_eval_dataset()
