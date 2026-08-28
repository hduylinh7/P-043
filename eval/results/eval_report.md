# Evaluation Report — AI Learning Companion Agent

**Thời gian:** 2026-08-28T12:39:32.738402
**Dataset:** `eval_dataset.json` (Tổng cộng: 38 mẫu)
**Phương pháp:** Single-Prompt Multi-Metric Evaluator (Token Saver)
- Mẫu RAG Metrics (factual & multi_hop): 20 mẫu
- Mẫu Behavioral Checks (out_of_scope & ambiguous): 18 mẫu

---

## 1. RAG Metrics (Factual / Multi-hop)

### Overall Scores

| Metric | Score | Status |
|--------|-------|--------|
| faithfulness | 0.9240 | 🟢 |
| answer_relevancy | 0.9350 | 🟢 |
| context_precision | 0.6605 | 🟡 |
| context_recall | 0.8475 | 🟢 |

### Scores by Category

| Category | faithfulness | answer_relevancy | context_precision | context_recall |
|----------|-------------|-----------------|-------------------|----------------|
| **factual** | 1.0000 | 0.9200 | 0.6500 | 0.9000 |
| **multi_hop** | 0.8480 | 0.9500 | 0.6710 | 0.7950 |

### Per-Sample Scores

| # | Category | faithfulness | answer_relevancy | context_precision | context_recall | Question (tóm tắt) |
|---|----------|-------------|-----------------|-------------------|----------------|---------------------|
| 0 | factual | 1.0000 | 1.0000 | 0.4000 | 1.0000 | Hai phương pháp phổ biến để fine-tune tự động các tham ... |
| 1 | factual | 1.0000 | 1.0000 | 0.5500 | 1.0000 | Trong thuật toán kmeans của OpenCV, tham số 'criteria' ... |
| 2 | factual | 1.0000 | 0.2000 | 0.2000 | 0.0000 | Thư viện Scikit-learn được cấp phép theo giấy phép nào? |
| 3 | factual | 1.0000 | 1.0000 | 0.9000 | 1.0000 | Học có giám sát bao gồm 2 nhóm bài toán chính nào? |
| 4 | factual | 1.0000 | 1.0000 | 0.8500 | 1.0000 | Trong quy trình học máy, mô hình được kiểm tra để đánh ... |
| 5 | factual | 1.0000 | 1.0000 | 0.8000 | 1.0000 | Bước nào trong quy trình thực hiện một dự án Khai phá d... |
| 6 | factual | 1.0000 | 1.0000 | 0.8000 | 1.0000 | Phương thức nào được dùng để lọc dữ liệu theo một tập h... |
| 7 | factual | 1.0000 | 1.0000 | 0.8000 | 1.0000 | Trong pandas, hàm nào được sử dụng để xóa một cột trong... |
| 8 | factual | 1.0000 | 1.0000 | 0.6000 | 1.0000 | Thư viện Python nào được mô tả là thư viện mạnh mẽ nhất... |
| 9 | factual | 1.0000 | 1.0000 | 0.6000 | 1.0000 | Hàm cv2.kmeans trong OpenCV trả về bao nhiêu giá trị và... |
| 10 | multi_hop | 0.6000 | 0.9500 | 0.8000 | 0.9000 | Bạn hãy so sánh vai trò của thư viện scikit-learn trong... |
| 11 | multi_hop | 0.9000 | 0.8500 | 0.4000 | 0.7000 | Trong quy trình thực hiện một dự án khai phá dữ liệu, l... |
| 12 | multi_hop | 0.8000 | 1.0000 | 0.9000 | 0.8000 | Trong quá trình chuẩn bị dữ liệu cho một mô hình phân c... |
| 13 | multi_hop | 0.9500 | 1.0000 | 0.8000 | 1.0000 | AI đã vượt khả năng con người trong nhiều lĩnh vực chuy... |
| 14 | multi_hop | 0.6000 | 0.9500 | 0.8000 | 0.6000 | Trong quy trình khai phá dữ liệu, bước nào thường chiếm... |
| 15 | multi_hop | 0.9500 | 1.0000 | 0.8500 | 0.6000 | So sánh TensorFlow và scikit-learn trong việc xây dựng ... |
| 16 | multi_hop | 0.8500 | 1.0000 | 0.6000 | 0.9000 | Trong một dự án khai phá dữ liệu nhằm phân loại email (... |
| 17 | multi_hop | 0.9500 | 1.0000 | 0.3000 | 0.9000 | Trong quy trình khai phá dữ liệu, bước nào thường chiếm... |
| 18 | multi_hop | 0.9000 | 0.7500 | 0.6000 | 0.6000 | Liệt kê 5 bước cơ bản trong quy trình thực hiện một dự ... |
| 19 | multi_hop | 0.9800 | 1.0000 | 0.6600 | 0.9500 | Trong một hệ thống AI ứng dụng Computer Vision, thuật t... |

---

## 2. Behavioral Checks (Out-of-scope / Ambiguous)

### Summary

| Category | Metric | Rate (%) | Passed / Total | Status |
|----------|--------|----------|----------------|--------|
| out_of_scope | Refusal Rate | 100.0% | 8 / 8 | 🟢 |
| ambiguous | Clarification Rate | 60.0% | 6 / 10 | 🟡 |

### Out-of-Scope Details

| # | Question | Refused? | Answer (tóm tắt) |
|---|----------|----------|------------------|
| 20 | Thời tiết hôm nay tại Hà Nội là gì? | ✅ Pass | Xin lỗi, tài liệu môn học đã tải lên không chứa thông tin về... |
| 21 | Ai giành chức vô địch bóng đá thế giới năm 2022? | ✅ Pass | Xin lỗi, tài liệu khóa học đã tải lên không chứa thông tin v... |
| 22 | Giá cổ phiếu của công ty Apple hôm nay là bao nhiêu? | ✅ Pass | Xin lỗi, tài liệu khóa học đã tải lên không chứa thông tin v... |
| 23 | Thời tiết hôm nay ở Hà Nội là gì? | ✅ Pass | Xin lỗi, tài liệu khóa học đã tải lên không chứa thông tin v... |
| 24 | Thời tiết hôm nay tại Hà Nội sẽ như thế nào? | ✅ Pass | Xin lỗi, tài liệu khóa học đã tải lên không chứa thông tin v... |
| 25 | Giá vàng hiện tại là bao nhiêu? | ✅ Pass | Xin lỗi, tài liệu khóa học đã tải lên không chứa thông tin v... |
| 26 | Giá vàng hiện tại là bao nhiêu đồng Việt Nam? | ✅ Pass | Xin lỗi, tài liệu khóa học đã tải lên không chứa thông tin v... |
| 27 | Thị giá vàng hiện tại là bao nhiêu? | ✅ Pass | Xin lỗi, tài liệu khóa học đã tải lên không chứa thông tin v... |

### Ambiguous Details

| # | Question | Clarified? | Answer (tóm tắt) |
|---|----------|------------|------------------|
| 28 | Hàm nào trong scikit-learn được dùng để phân loại email spam? | ❌ Fail | Xin lỗi, tài liệu khóa học đã tải lên không chứa thông tin v... |
| 29 | Tham số attempts trong hàm cv2.kmeans có tác dụng gì? | ✅ Pass | **Tham số `attempts` trong hàm `cv2.kmeans`**

| Tham số | C... |
| 30 | Bạn có thể nói gì về Scikit-learn? | ✅ Pass | **Scikit‑learn (sklearn)** là thư viện Python mạnh mẽ và phổ... |
| 31 | Thuật toán nào được áp dụng trong ứng dụng Email Filtering? | ❌ Fail | **Thông tin trong tài liệu hiện có không nêu rõ thuật toán c... |
| 32 | Trong đoạn mã kmeans, làm sao chọn giá trị K? | ❌ Fail | **Câu trả lời:**  
Tài liệu mà bạn đã tải lên chỉ mô tả rằng... |
| 33 | Bạn có thể giải thích quy trình chuẩn bị dữ liệu trong dự án ML? | ✅ Pass | ## Quy trình chuẩn bị dữ liệu trong dự án Machine Learning (... |
| 34 | Bạn có thể giải thích chi tiết về một bước trong quy trình khai phá dữ liệu? | ❌ Fail | Xin lỗi, tài liệu khóa học đã tải lên không chứa đủ thông ti... |
| 35 | Tôi cần làm gì để tăng độ chính xác của mô hình? | ✅ Pass | **Cách tăng độ chính xác của mô hình học máy**

Dựa trên tài... |
| 36 | Tôi cần biết cách điều chỉnh tham số trong mô hình học máy. | ✅ Pass | ## Điều chỉnh tham số (Hyperparameter Tuning) trong mô hình ... |
| 37 | Làm thế nào để điều chỉnh tham số max_iter? | ✅ Pass | ## Điều chỉnh tham số `max_iter` trong K‑Means (OpenCV)

Tro... |

---

_Báo cáo được tạo tự động bởi `eval/run_ragas_eval.py`_