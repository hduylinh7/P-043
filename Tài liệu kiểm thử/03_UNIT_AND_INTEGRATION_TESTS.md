#  KIỂM THỬ TỰ ĐỘNG (UNIT & INTEGRATION TESTS) — LITA LEARNING

> **Nguồn file gốc trong dự án:** Thư mục 	ests/ (	ests/test_planner_agent.py, 	ests/test_planner_tools.py, 	ests/test_reminder_service.py, 	ests/test_db_schema.py...)  

> **Dự án:** Lita Learning — AI Learning Companion (P-043)  
> **Framework kiểm thử:** `pytest`, `pytest-asyncio`, `httpx` (Async Client)

---

## 1. Danh sách các Module Kiểm thử Tự động (`tests/`)

| Tên tệp kiểm thử | Phạm vi kiểm thử | Mục tiêu xác thực |
|------------------|-------------------|-------------------|
| `test_planner_agent.py` | LangGraph Planner Agent | Kiểm thử chu trình 4 node (`load_context` → `analyze_and_decide` → `execute_planner_tools` → `generate_summary`). |
| `test_planner_tools.py` | Bộ công cụ của Planner Agent | Kiểm thử các hàm tạo task, sửa task, xóa task và kiểm tra xung đột thời gian. |
| `test_planner_context_builder.py` | Tầng trích xuất Context | Kiểm thử tổng hợp dữ liệu bài tập, hạn nộp, lịch học cố định, mục tiêu cá nhân. |
| `test_course_schedule.py` | Lịch học cố định (Giảng đường) | Kiểm thử CRUD lịch học cố định và ràng buộc tránh xếp lịch trùng. |
| `test_unified_calendar_and_planner_conflict.py` | Lịch hợp nhất & Xung đột | Kiểm thử thuật toán phát hiện và ngăn ngừa xung đột lịch học giảng đường. |
| `test_reminder_service.py` | Dịch vụ Nhắc nhở & Scheduler | Kiểm thử logic lọc task sắp đến hạn và gửi email thông báo định kỳ. |
| `test_db_schema.py` | Cơ sở dữ liệu SQLAlchemy 2.0 | Kiểm thử toàn vẹn quan hệ giữa 7 nhóm bảng: identity, learning, planning, reflection, ai, chat, knowledge. |
| `test_api/` | FastAPI REST Endpoints | Kiểm thử xác thực JWT, bảo mật CORS, mã hóa mật khẩu, format dữ liệu request/response. |
| `test_agents/` | Từng nút (Node) trong LangGraph | Kiểm thử độc lập từng node và luồng StateGraph. |

---

## 2. Kịch bản kiểm thử trọng điểm

### 2.1. Kiểm thử AI Planner Agent & Ngăn ngừa Xung đột Lịch
* **Kịch bản 1 — Tạo kế hoạch học tập tự động:**
  * Đầu vào: Yêu cầu "Tạo kế hoạch ôn tập môn Computer Vision tuần này".
  * Kết quả mong muốn: Agent tự động nhận diện các buổi học, tính toán số giờ ôn tập hợp lý và xếp lịch vào các khung giờ rảnh.
* **Kịch bản 2 — Xung đột với lịch học giảng đường (`CourseSchedule`):**
  * Đầu vào: Yêu cầu xếp buổi tự học vào sáng Thứ 2 (08:00 - 11:00) — trùng với tiết học trên lớp.
  * Kết quả mong muốn: `schedule_conflict_check` bắt được xung đột, AI tự động dời sang khung giờ rảnh khác (ví dụ: chiều Thứ 2 hoặc sáng Thứ 3).

### 2.2. Kiểm thử Dynamic Replanning
* **Kịch bản 3 — Dời lịch khi sinh viên bận đột xuất:**
  * Đầu vào: "Thứ 3 mình bận đi khám bệnh, dời task ôn tập hôm đó sang hôm khác".
  * Kết quả mong muốn: AI hủy task Thứ 3, tìm khung giờ trống tiếp theo trong tuần và chuyển task sang đó mà không làm lỡ deadline bài tập.

### 2.3. Kiểm thử Reminder Scheduler
* **Kịch bản 4 — Nhắc nhở bài tập sắp đến hạn:**
  * Đầu vào: Scheduler quét DB mỗi 60 giây, phát hiện bài tập có deadline trong vòng 24 giờ.
  * Kết quả mong muốn: Gửi email nhắc nhở qua Brevo REST API / Gmail SMTP và lưu thông báo vào bảng `notifications`.

---

## 3. Lệnh thực thi & Đánh giá kết quả

```bash
# Chạy toàn bộ test suite
pytest tests/ -v --tb=short

# Kiểm tra độ phủ code (Coverage)
pytest --cov=src tests/
```

