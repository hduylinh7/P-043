# WORKLOG — TEAM LITA LEARNING (P-043)

> **Dự án:** Lita Learning — Trợ lý học tập & Ôn thi thông minh cho sinh viên  
> **Danh sách thành viên:**
> - **Hoàng Duy Linh** (Trưởng nhóm / Backend & AI Lead)
> - **Đặng Đức Hoà (Business Analyst, System Design & QA Lead))
> - **Nguyễn Tuấn Anh** (Frontend & UI/UX Lead)

---

## GIAI ĐOẠN 1: KHỞI TẠO DỰ ÁN & THIẾT KẾ ĐẶC TẢ

### 2026-08-01

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Khảo sát nhu cầu và nỗi đau thực tế của sinh viên khi ôn thi & chạy deadline |  Done | Tài liệu phỏng vấn & tổng hợp 4 pain points ban đầu | 4.0h |
| **Hoàng Duy Linh** | Khởi tạo GitHub repository P-043, cài đặt môi trường FastAPI base |  Done | Repository structure & `requirements.txt` | 3.5h |
| **Nguyễn Tuấn Anh** | Khởi tạo dự án Frontend React 18 + Vite 5 + Tailwind CSS |  Done | Frontend base repository & setup scripts | 3.0h |

**Tổng kết ngày:** Thống nhất định vị sản phẩm AI Learning Companion hỗ trợ 3 trụ cột PLAN - LEARN - REFLECT.

---

### 2026-08-04

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Thiết kế luồng người dùng (User Flow) cho tính năng Lập kế hoạch và Ôn tập |  Done | Sơ đồ luồng nghiệp vụ & đặc tả chức năng | 4.5h |
| **Hoàng Duy Linh** | Cài đặt hệ thống AI usage logging tự động (`scripts/setup_hooks.ps1`, `log_hook.py`) |  Done | Git hooks bắt prompt tự động khi push | 3.0h |
| **Nguyễn Tuấn Anh** | Thiết kế Wireframe giao diện Dashboard và Sidebar điều hướng |  Done | Khung giao diện UI với Ant Design | 3.5h |

**Tổng kết ngày:** Hoàn thiện bộ quy chuẩn kỹ thuật và hệ thống log prompt theo quy định của BTC AI20K.

---

## GIAI ĐOẠN 2: PHÁT TRIỂN BACKEND, DATABASE & AI AGENT

### 2026-08-08

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Thiết kế mô hình dữ liệu thực thể (ERD) cho bài tập, tiến độ và lịch học |  Done | Bản vẽ ERD & mô tả quan hệ dữ liệu | 3.5h |
| **Hoàng Duy Linh** | Xây dựng SQLAlchemy 2.0 Async Models (7 nhóm domain: identity, learning, planning...) |  Done | `src/db/models/` & `alembic` migrations | 5.0h |
| **Nguyễn Tuấn Anh** | Xây dựng các trang Xác thực: Đăng nhập, Đăng ký, Quên mật khẩu |  Done | `frontend/src/pages/Auth/` | 4.0h |

**Tổng kết ngày:** Hoàn thành kết nối cơ sở dữ liệu PostgreSQL và phân quyền người dùng JWT.

---

### 2026-08-13

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Vẽ chi tiết luồng xử lý 4 nodes của Planner Agent và kịch bản phát hiện xung đột lịch |  Done | Kịch bản test case cho Planner Agent | 4.0h |
| **Hoàng Duy Linh** | Phát triển LangGraph StateGraph cho Planner Agent (`src/agents/planner_graph.py`) |  Done | 4 nodes: `load_context` → `analyze` → `tools` → `summary` | 6.0h |
| **Nguyễn Tuấn Anh** | Xây dựng giao diện Calendar hiển thị thời khóa biểu tuần |  Done | `frontend/src/pages/Planner/CalendarView.tsx` | 4.5h |

**Tổng kết ngày:** Planner Agent có thể phân tích câu lệnh tiếng Việt và tạo task học tập tự động.

---

### 2026-08-18

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Đặc tả nghiệp vụ Dynamic Replanning khi sinh viên bị trễ hạn hoặc đổi lịch |  Done | Tài liệu logic dời lịch và san sẻ tải học tập | 3.5h |
| **Hoàng Duy Linh** | Triển khai thuật toán chống trùng lịch (`schedule_utils.py`) & Reminder Scheduler |  Done | `src/services/reminder_scheduler.py` (quét 60s) | 5.5h |
| **Nguyễn Tuấn Anh** | Tích hợp hiển thị thông báo và nhắc nhở trên giao diện |  Done | Notification Popover & Badge component | 3.5h |

**Tổng kết ngày:** Kế hoạch học tập tự động cập nhật và không bao giờ bị đè lên lịch học giảng đường.

---

## GIAI ĐOẠN 3: NÂNG CẤP MULTIMODAL RAG & SOCRATIC TUTORING

### 2026-08-22

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Chuẩn bị dữ liệu bài giảng thực tế 2 môn (*Computer Vision* & *Data Mining*) |  Done | Bộ slide PDF/PPTX và file thực hành Excel | 4.0h |
| **Hoàng Duy Linh** | Nâng cấp RAG Service: Gemini Vision OCR trích xuất công thức LaTeX từ slide ảnh |  Done | `src/services/rag_service.py` | 6.5h |
| **Nguyễn Tuấn Anh** | Xây dựng giao diện tải lên và quản lý tài liệu môn học |  Done | Material Upload Modal & Material List | 4.0h |

**Tổng kết ngày:** RAG bóc tách chính xác 100% công thức toán học và bảng tính thực tế từ slide bài giảng.

---

### 2026-08-26

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Thiết lập bộ quy tắc Liêm chính học thuật & Hướng dẫn Socratic Tutoring |  Done | Prompt guidelines & guardrails rulebook | 3.5h |
| **Hoàng Duy Linh** | Tích hợp FlashRank Cross-Encoder Reranker và chuyển đổi LLM sang Groq Llama 3.3 |  Done | Tốc độ phản hồi đạt ~300 tokens/s (1-2s/câu) | 5.0h |
| **Nguyễn Tuấn Anh** | Xây dựng màn hình Chatbot hỗ trợ Markdown, KaTeX công thức toán và SSE stream |  Done | `frontend/src/pages/Chat/ChatInterface.tsx` | 4.5h |

**Tổng kết ngày:** Phản hồi của Agent đạt độ trễ cực thấp, từ chối giải bài hộ và gợi mở tư duy cho sinh viên.

---

## GIAI ĐOẠN 4: HOÀN THIỆN TÍNH NĂNG REFLECT & TÍCH HỢP TOÀN DIỆN

### 2026-08-28

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Kiểm thử luồng Study Session Workspace, phát hiện lỗi ngắt dòng và báo cáo dev fix; thiết kế Reflection 3 bước: Tự đánh giá → AI Nhận xét → Socratic Q&A |  Done | Đặc tả chi tiết tính năng REFLECT | 4.0h |
| **Hoàng Duy Linh** | Xây dựng API phiên học `/api/v1/sessions` và cơ chế AI sinh nhận xét 2 chiều |  Done | `src/routers/session_router.py` & DB service | 5.5h |
| **Nguyễn Tuấn Anh** | Phát triển Study Session Workspace & Reflection Modal sau buổi học |  Done | `frontend/src/pages/Session/Workspace.tsx` | 5.0h |

**Tổng kết ngày:** Hoàn thiện trọn vẹn chu trình khép kín: Lập kế hoạch (PLAN) → Học trọng tâm (LEARN) → Tự đánh giá (REFLECT).

---

## GIAI ĐOẠN 5: KIỂM THỬ ĐỊNH LƯỢNG & HOÀN THIỆN BÁO CÁO NGHIỆM THU

### 2026-08-30

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Xây dựng bộ tiêu chí và 61 Test Cases định lượng từ slide bài giảng thật |  Done | `eval/data/cv_benchmark_dataset.json` & `dm_...` | 5.0h |
| **Hoàng Duy Linh** | Lập trình kịch bản benchmark tự động (`eval/eval_rag_pipeline.py`) & chạy đo lường |  Done | `MASTER_EVALUATION_REPORT.md` (Pass 61/61) | 6.0h |
| **Nguyễn Tuấn Anh** | Chạy kiểm thử tự động API và giao diện, kiểm tra tương thích trình duyệt |  Done | Báo cáo kiểm thử giao diện & unit test | 4.0h |

**Tổng kết ngày:** Kết quả benchmark định lượng đạt chuẩn tuyệt đối: Hit Rate 100%, Faithfulness 100%, Điểm chất lượng 95.6/100.

---

### 2026-09-01

| Member | Task | Status | Output | Time |
|--------|------|--------|--------|------|
| **Đặng Đức Hoà** | Hoàn thiện thư mục `Tài liệu đặc tả & thiết kế/` (6 tài liệu chi tiết) |  Done | `Tài liệu đặc tả & thiết kế/` hoàn chỉnh | 4.5h |
| **Hoàng Duy Linh** | Chuẩn hóa `README.md`, xuất toàn bộ log AI Prompt lên server BTC |  Done | `README.md` v2.0 & AI Logs (31 prompts submitted) | 4.0h |
| **Nguyễn Tuấn Anh** | Tổ chức thư mục `Tài liệu kiểm thử/` (6 tài liệu báo cáo & metrics JSON) |  Done | `Tài liệu kiểm thử/` hoàn chỉnh | 3.5h |

**Tổng kết ngày:** Toàn bộ hồ sơ nghiệm thu kỹ thuật, mã nguồn, tài liệu thiết kế và kiểm thử đã sẵn sàng 100% cho Gate G2.


