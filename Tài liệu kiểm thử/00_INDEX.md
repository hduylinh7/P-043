# BỘ TÀI LIỆU KIỂM THỬ SẢN PHẨM — LITA LEARNING (P-043)

> **Dự án:** Lita Learning — AI Learning Companion (P-043)  
> **Nguồn tổng hợp:** 100% từ các tệp mã nguồn và báo cáo kiểm thử có sẵn trong thư mục `eval/` và `tests/`.

---

## 1. Danh mục tài liệu & Đường dẫn file gốc

| STT | Tên tài liệu trong thư mục này | Nguồn file gốc trong dự án | Mục đích / Nội dung |
|:---:|--------------------------------|----------------------------|---------------------|
| **01** | `00_INDEX.md` | `eval/results/MASTER_EVALUATION_REPORT.md` + `tests/` | Mục lục & bảng tổng hợp kết quả nghiệm thu toàn hệ thống. |
| **02** | `01_MASTER_EVALUATION_REPORT.md` | `eval/results/MASTER_EVALUATION_REPORT.md` | Báo cáo nghiệm thu định lượng RAG trên 61 Test Cases (100% Pass). |
| **03** | `02_RAG_EVAL_REPORT.md` | `eval/results/rag_eval_report.md` | Báo cáo kỹ thuật chi tiết các chỉ số RAG (Hit rate, Precision, Latency 1.06ms). |
| **04** | `03_UNIT_AND_INTEGRATION_TESTS.md` | Thư mục `tests/` (10 file test pytest) | Đặc tả các kịch bản kiểm thử tự động Backend, Agent, Lịch học, Database Schema. |
| **05** | `04_TEST_CASES_SPECIFICATION.md` | `eval/data/cv_benchmark_dataset.json` & `eval/data/dm_benchmark_dataset.json` | Danh mục đặc tả chi tiết 61 kịch bản kiểm thử trích xuất từ slide thật. |
| **06** | `rag_eval_metrics.json` | `eval/results/rag_eval_metrics.json` | Tệp dữ liệu JSON thô ghi nhận toàn bộ kết quả đo lường kiểm thử. |

---

## 2. Tóm tắt kết quả nghiệm thu toàn hệ thống

### 2.1. Đánh giá Định lượng RAG & AI Agent (Benchmark 61 Test Cases)
*(Nguồn dữ liệu: `eval/results/MASTER_EVALUATION_REPORT.md`)*

| Môn học thực tế | Mã môn | Số lượng Test Cases | Tỷ lệ Pass | Hit Rate | Faithfulness | Điểm Chất lượng | Trạng thái |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Thị Giác Máy Tính** (Computer Vision) | `CS_COMPUTER_VISION` | **30** | **100% (30/30)** | **100.0%** | **100.0%** | **97.8 / 100** | **XUẤT SẮC** |
| **Khai Phá Dữ Liệu** (Data Mining) | `CS_DATA_MINING` | **31** | **100% (31/31)** | **100.0%** | **100.0%** | **93.3 / 100** | **XUẤT SẮC** |
| **TỔNG HỢP TOÀN BỘ HỆ THỐNG** | **ALL** | **61** | **100% (61/61)** | **100.0%** | **100.0%** | **95.6 / 100** | **ĐẠT CHUẨN NGHIỆM THU** |

### 2.2. Hiệu năng & Cơ chế Kiểm soát (Guardrails)
*(Nguồn dữ liệu: `eval/results/rag_eval_report.md`)*
* **Tốc độ truy xuất & Reranking:** Trung bình **1.06 ms** / truy vấn (FlashRank TinyBERT Cross-Encoder).
* **Thời gian sinh phản hồi:** **1 - 2 giây** với Groq LLM (~300 tokens/giây).
* **Độ chính xác ngữ cảnh (Context Precision):** **94.1%**.
* **Tuân thủ Liêm chính học thuật (Academic Integrity):** **100.0%** (100% từ chối giải bài hộ, chuyển sang phương pháp gợi mở Socratic Tutoring).

---

## 3. Hướng dẫn chạy kiểm thử tự động

### Chạy Unit & Integration Test (Pytest):
*(Mã nguồn: `tests/`)*
```bash
# Kích hoạt môi trường
.venv\Scripts\activate

# Chạy toàn bộ test suite
pytest tests/ -v

# Chạy riêng kiểm thử AI Planner Agent
pytest tests/test_planner_agent.py -v
pytest tests/test_planner_tools.py -v
```

### Chạy Benchmark RAG tự động (61 Test Cases):
*(Mã nguồn: `eval/eval_rag_pipeline.py` & `eval/generate_master_report.py`)*
```bash
# Chạy bộ đánh giá RAG
python eval/eval_rag_pipeline.py

# Sinh lại báo cáo Master Report
python eval/generate_master_report.py
```
