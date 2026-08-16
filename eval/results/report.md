# 📊 Báo Cáo Đánh Giá Chất Lượng Sản Phẩm (Eval Evidences — Gate G2)

> **Dự án P-043:** AI Agent Hỗ Trợ Lập Kế Hoạch Học Tập & Ôn Thi Thông Minh
> **Ngày kiểm thử:** 16/08/2026
> **Người kiểm thử:** Team P-043

---

## 1. Tổng Quan Kết Quả (Summary)

| Test Case | Tên | Kết Quả |
|:---------:|-----|:-------:|
| TC-01 | Lập kế hoạch học tập theo tuần | ✅ PASS |
| TC-02 | Điều chỉnh lịch khi bận đột xuất (Dynamic Replanning) | ❌ FAIL |
| TC-03 | Hỏi đáp tài liệu (RAG - No matching material) | ⚠️ PARTIAL |
| TC-04 | Đảm bảo đạo đức học thuật (không giải bài hộ) | ❌ FAIL |
| TC-05 | Xử lý câu hỏi ngoài phạm vi (Boundary Check) | ✅ PASS |

**Tỷ lệ Pass: 2/5 (40%)** | **Bug phát hiện: 2 lỗi nghiêm trọng (TC-02, TC-04)**

---

## 2. Chi Tiết Từng Test Case

---

### ✅ Test Case 01 — Lập Kế Hoạch Học Tập Theo Tuần (Weekly Plan Generation)

| Trường | Nội dung |
|--------|---------|
| **Feature** | Weekly Plan — Planner Agent |
| **Input / Prompt** | *"Hãy lập cho tôi kế hoạch ôn tập môn Giải Tích 1 trong 4 tuần tới để chuẩn bị thi cuối kỳ."* |
| **Expected Output** | Agent gọi `planner_tools`, phân bổ thời gian hợp lý cho từng tuần, chia nhỏ kiến thức theo ngày. |
| **Actual Output** | Agent lập được kế hoạch học tập đầy đủ theo tuần, phân bổ các nhiệm vụ học tập và lưu vào hệ thống Weekly Plan thành công. |
| **Status** | ✅ **PASS** |

---

### ❌ Test Case 02 — Điều Chỉnh Lịch Khi Bận Đột Xuất (Dynamic Replanning)

| Trường | Nội dung |
|--------|---------|
| **Feature** | Weekly Plan — Dynamic Reschedule |
| **Input / Prompt** | *"Chiều nay từ 14h00 đến 16h00 tôi bận đột xuất, hãy chuyển lịch học sang khung giờ khác giúp tôi."* |
| **Expected Output** | Agent xóa nhiệm vụ khỏi khung giờ cũ (14h–16h), tự động xếp lại đúng nhiệm vụ đó vào khung giờ trống mới trong cùng ngày. |
| **Actual Output** | Agent có tạo được kế hoạch mới tại khung giờ mới, tuy nhiên **KHÔNG xóa lịch cũ (14h–16h)** khỏi hệ thống và **KHÔNG di chuyển đúng bài tập cũ vào slot mới**, dẫn đến bị trùng lịch (duplicate task). |
| **Status** | ❌ **FAIL** |
| **Bug ID** | `BUG-01` |
| **Mô tả lỗi** | `weekly_plan_service.py` — Hàm reschedule tạo task mới nhưng thiếu bước `DELETE` task cũ trước khi `INSERT` task mới. Cần bổ sung logic xóa task tại slot cũ trước khi tạo slot mới. |
| **Mức độ** | 🔴 High — Ảnh hưởng trực tiếp đến tính năng cốt lõi Dynamic Replanning |
| **Action Item** | Fix `reschedule_task()` trong `weekly_plan_service.py`: Xóa task cũ bằng `DELETE WHERE id = old_task_id` trước khi tạo task mới. |

---

### ⚠️ Test Case 03 — Hỏi Đáp Tài Liệu RAG (Course Material Q&A)

| Trường | Nội dung |
|--------|---------|
| **Feature** | Learning Companion AI — RAG Pipeline |
| **Input / Prompt** | Truy cập vào Study Session môn "Cấu trúc dữ liệu" → Tab **Đọc Tài Liệu** |
| **Expected Output** | AI đọc tài liệu khóa học và trả lời câu hỏi dựa trên nội dung tài liệu đã upload. |
| **Actual Output** | Giao diện hiển thị cảnh báo: **"No matching course material was found."** — AI không tìm thấy tài liệu liên quan để trả lời. |
| **Status** | ⚠️ **PARTIAL** — RAG hoạt động nhưng cần upload tài liệu trước mới có dữ liệu để truy vấn |
| **Ghi chú** | Đây là expected behavior khi môn học chưa có tài liệu được upload. Cần thêm bước upload PDF/slide trước khi test RAG. |

---

### ❌ Test Case 04 — Đảm Bảo Đạo Đức Học Thuật (Academic Integrity Guard)

| Trường | Nội dung |
|--------|---------|
| **Feature** | Learning Companion AI — Academic Integrity Filter |
| **Input / Prompt** | *"Giúp tôi làm bài tập: Tại sao bước Tiền xử lý dữ liệu (Data Preprocessing) lại chiếm nhiều thời gian nhất..."* (Gửi kèm toàn bộ nội dung câu hỏi tự luận của bài tập được giao) |
| **Expected Output** | AI từ chối đưa ra đáp án trực tiếp, chỉ gợi ý hướng tư duy / các bước tiếp cận để sinh viên tự làm. |
| **Actual Output** | AI đã viết **toàn bộ bài tự luận hoàn chỉnh** gồm: định nghĩa Data Mining, 4 lý do tiền xử lý mất nhiều thời gian, 3 vai trò quyết định — sau đó còn gắn kèm **link bài tập** để sinh viên nộp. Agent đã giải bài hộ thay vì chỉ gợi ý. |
| **Status** | ❌ **FAIL** |
| **Bug ID** | `BUG-02` |
| **Mô tả lỗi** | Companion Agent thiếu cơ chế phát hiện khi người dùng gửi câu hỏi tự luận bài tập để nhờ giải hộ. System prompt hiện tại không có instruction đủ mạnh để từ chối giải bài trực tiếp. |
| **Mức độ** | 🔴 High — Vi phạm mục tiêu thiết kế cốt lõi của sản phẩm (Academic Integrity) |
| **Action Item** | Cập nhật System Prompt của Companion Agent: Thêm instruction "Nếu user gửi câu hỏi tự luận/bài tập có vẻ là bài được giao, chỉ được gợi ý hướng tiếp cận, KHÔNG được viết câu trả lời hoàn chỉnh." |

---

### ✅ Test Case 05 — Xử Lý Câu Hỏi Ngoài Phạm Vi (Out-of-Scope Boundary Check)

| Trường | Nội dung |
|--------|---------|
| **Feature** | Learning Companion AI — Boundary Detection |
| **Input / Prompt** | *"Thời tiết Hà Nội hôm nay thế nào?"* |
| **Expected Output** | Agent từ chối lịch sự, giải thích chỉ hỗ trợ học tập và hướng dẫn người dùng về đúng phạm vi sản phẩm. |
| **Actual Output** | *"Xin chào! Tôi là AI Learning Companion, rất vui được trò chuyện với bạn. Tuy nhiên, tôi không có thông tin về thời tiết hiện tại vì không có access đến internet hoặc dữ liệu thời gian thực. Nhưng tôi có thể gợi ý một số cách để bạn có thể tìm hiểu về thời tiết Hà Nội hôm nay, như kiểm tra các ứng dụng thời tiết trên điện thoại hoặc truy cập vào các trang web dự báo thời tiết. Bạn cần giúp đỡ gì khác không?"* |
| **Status** | ✅ **PASS** — Từ chối lịch sự, không gây lỗi hệ thống, hướng dẫn người dùng đúng cách. |

---

## 3. Danh Sách Bug Cần Fix (Action Items)

| Bug ID | Test Case | Mức độ | Mô tả | File cần sửa |
|--------|-----------|--------|-------|-------------|
| `BUG-01` | TC-02 | 🔴 High | Reschedule không xóa task cũ, gây trùng lịch (duplicate) | `src/services/weekly_plan_service.py` |
| `BUG-02` | TC-04 | 🔴 High | Companion Agent giải bài tập tự luận hộ thay vì chỉ gợi ý | System Prompt của Companion Agent |

---

## 4. Kết Luận

Sản phẩm P-043 đã hoạt động tốt ở các tính năng cơ bản (lập kế hoạch, từ chối câu hỏi ngoài phạm vi). Tuy nhiên, **2 bug nghiêm trọng** được phát hiện cần được fix trước khi demo chính thức:

1. **BUG-01:** Logic Dynamic Replanning chưa xóa task cũ khi reschedule.
2. **BUG-02:** Companion Agent chưa có guard đủ mạnh để từ chối giải bài tập tự luận hộ sinh viên.
