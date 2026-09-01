# WEEKLY JOURNAL — LITA LEARNING (TEAM P-043)

> **Dự án:** Lita Learning — Trợ lý học tập & Ôn thi thông minh cho sinh viên  
> **Thành viên:**
> - **Hoàng Duy Linh** (MSSV: `2A202601159`) — Trưởng nhóm / Backend & AI Lead
> - **Đặng Đức Hoà** (MSSV: `2A202601351`) — BA, System Design & QA Lead
> - **Nguyễn Tuấn Anh** (MSSV: `2A202601395`) — Frontend & UI/UX Lead

---

## Tuần 1: Khảo sát Nỗi đau, Định vị Bài toán & Thiết kế Mô hình 3 Trụ Cột

### Mục tiêu tuần này
- [x] Khảo sát thực tế các khó khăn của sinh viên đại học trong quá trình ôn tập và làm bài tập.
- [x] Thống nhất định vị sản phẩm: AI Learning Companion (không giải bài hộ, hỗ trợ tư duy).
- [x] Thiết lập mô hình hoạt động 3 trụ cột: **PLAN → LEARN → REFLECT**.
- [x] Cài đặt môi trường phát triển ban đầu, Git repository và Git hooks theo quy chuẩn BTC.

### Đã hoàn thành
- **Đặng Đức Hoà:** Hoàn thành tài liệu phân tích 3 nỗi đau cốt lõi của sinh viên; trực tiếp vẽ & thiết kế toàn bộ sơ đồ luồng sản phẩm (Product Flow 3 trụ cột PLAN - LEARN - REFLECT) và luồng tương tác của AI Agent.
- **Hoàng Duy Linh:** Khởi tạo repository, cấu hình FastAPI project base, thiết lập môi trường Python 3.11+, cài đặt script logging AI prompt tự động (`scripts/setup_hooks.ps1`, `log_hook.py`).
- **Nguyễn Tuấn Anh:** Thiết lập bộ khung giao diện ban đầu React 18 + Vite 5 + TypeScript + Tailwind CSS, nghiên cứu Ant Design components cho Calendar và Chat.

### Khó khăn & Giải pháp
| Khó khăn | Giải pháp | Kết quả |
|----------|-----------|---------|
| Sinh viên có xu hướng muốn AI "giải bài hộ" để đối phó deadline. | Đặt nguyên tắc Socratic Tutoring ngay từ tầng thiết kế nghiệp vụ (BA): AI từ chối đưa đáp án trực tiếp, chỉ gợi mở phương pháp. | Thống nhất định hướng sản phẩm liêm chính học thuật. |
| Môi trường phát triển của các thành viên khác nhau (Windows, Linux). | Chuẩn hóa scripts cài đặt Git hooks riêng cho Windows (`.ps1`) và Linux (`.sh`). | Tự động ghi nhận 100% prompt logs khi làm việc. |

### Bài học
- Cần làm rõ phạm vi sản phẩm (Scope) sớm để tránh lan man sang việc làm một chatbot thông thường.
- Phải gắn chặt AI vào ngữ cảnh dữ liệu môn học thật của sinh viên thay vì prompt chung chung.

### Kế hoạch tuần sau
- [ ] Thiết kế cơ sở dữ liệu PostgreSQL 16 và kiến trúc hệ thống 5 tầng.
- [ ] Xây dựng khung AI Agent Engine với LangGraph.

---

## Tuần 2: Thiết kế Kiến trúc Hệ thống, Database Schema & Cấu trúc AI Agent

### Mục tiêu tuần này
- [x] Hoàn thiện tài liệu thiết kế kiến trúc hệ thống 5 tầng (Client → API Gateway → Services/Agent → RAG Pipeline → Storage).
- [x] Thiết kế và triển khai Database Schema hoàn chỉnh với Async SQLAlchemy 2.0 và Alembic migrations.
- [x] Xây dựng khung StateGraph cơ bản cho Agent trên LangGraph.

### Đã hoàn thành
- **Đặng Đức Hoà:** Trực tiếp vẽ sơ đồ kiến trúc luồng 2 AI Agent độc lập (Companion Agent Flow & Planner Agent Flow), sơ đồ thực thể dữ liệu ERD và tài liệu đặc tả luồng xử lý hệ thống.
- **Hoàng Duy Linh:** Triển khai 7 nhóm domain models trong `src/db/models/` (identity, learning, planning, reflection, ai, chat, knowledge), cấu hình kết nối PostgreSQL asyncpg và Redis caching.
- **Nguyễn Tuấn Anh:** Xây dựng các trang khung giao diện: Auth (Login/Register), Dashboard Layout, Sidebar điều hướng, và khung chat tương tác.

### Khó khăn & Giải pháp
| Khó khăn | Giải pháp | Kết quả |
|----------|-----------|---------|
| Xung đột giữa mô hình chat tự do và mô hình lập lịch có cấu trúc. | Tách biệt thành 2 AI Agent riêng: Companion Agent (RAG/Chat) và Planner Agent (Scheduling). | Codebase phân tách module rõ ràng, độc lập. |
| Quản lý migrations database async trên SQLAlchemy 2.0. | Cấu hình `alembic/env.py` hỗ trợ `asyncpg` qua `run_sync`. | Migration trơn tru, không lỗi async context. |

### Bài học
- Cấu trúc DB cần tính trước cho việc lưu trữ lịch học cố định (`course_schedules`) để phục vụ thuật toán chống trùng lịch sau này.

### Kế hoạch tuần sau
- [ ] Triển khai chi tiết LangGraph Planner Agent và Dynamic Replanning.
- [ ] Xây dựng dịch vụ kiểm tra xung đột thời gian biểu.

---

## Tuần 3: Phát triển Planner Agent & Thuật toán Dynamic Replanning

### Mục tiêu tuần này
- [x] Xây dựng hoàn chỉnh chu trình 4 nodes của `Planner Agent` (`src/agents/planner_graph.py`).
- [x] Xây dựng bộ công cụ `PlannerTools` (tạo/sửa/xóa task và kiểm tra xung đột thời gian).
- [x] Triển khai thuật toán Dynamic Replanning khi sinh viên trễ hạn hoặc đổi lịch.
- [x] Xây dựng Background Reminder Scheduler quét task và gửi email thông báo định kỳ.

### Đã hoàn thành
- **Đặng Đức Hoà:** Vẽ chi tiết sơ đồ luồng chu trình 4 nodes của Planner Agent (load_context → analyze → execute_tools → summary); xây dựng kịch bản nghiệp vụ lập lịch: lệnh tiếng Việt tự nhiên, dời lịch khi bận đột xuất, xử lý khi trùng tiết học giảng đường.
- **Hoàng Duy Linh:** Hoàn thành `PlannerContextBuilder` (tổng hợp deadline, goals, lịch cố định), `planner_nodes.py`, `planner_tools.py`, và `schedule_utils.py` chống trùng lịch. Viết `reminder_scheduler.py` chạy nền 60s.
- **Nguyễn Tuấn Anh:** Phát triển màn hình Weekly Planner / Calendar UI, hỗ trợ hiển thị lịch học tuần trực quan, phân biệt rõ lịch học trên lớp và task tự học AI sinh.

### Khó khăn & Giải pháp
| Khó khăn | Giải pháp | Kết quả |
|----------|-----------|---------|
| LLM sinh lịch học có thể vô tình đè lên tiết học cố định trên lớp. | Bổ sung hàm kiểm tra cứng `check_task_conflict_with_fixed_schedules` đối chiếu trực tiếp bảng `course_schedules` trước khi lưu DB. | 100% ngăn chặn việc trùng lịch giảng đường. |
| Gửi email qua SMTP cổng 465/587 đôi khi bị chặn hoặc chậm trên Cloud. | Tích hợp Brevo REST API (HTTPS port 443) làm kênh gửi chính, giữ SMTP Gmail làm kênh dự phòng. | Tỷ lệ gửi email thông báo đạt độ tin cậy cao. |

### Bài học
- Agent không nên tự ý thay đổi DB trực tiếp nếu chưa qua bước validate nghiệp vụ bằng code Python thuần để đảm bảo an toàn dữ liệu.

### Kế hoạch tuần sau
- [ ] Xây dựng Multimodal RAG Pipeline: Gemini Vision OCR + Qdrant + FlashRank Reranker.
- [ ] Tích hợp Socratic Guardrail vào Companion Agent.

---

## Tuần 4: Xây dựng Multimodal RAG Pipeline & Socratic AI Tutoring

### Mục tiêu tuần này
- [x] Xây dựng module trích xuất tài liệu đa định dạng (PPTX slide-by-slide, DOCX, XLSX Table, Images OCR).
- [x] Tích hợp mô hình Vector Embeddings chất lượng cao (`gemini-embedding-001`) và Qdrant Vector DB.
- [x] Tích hợp FlashRank Cross-Encoder Reranker để tối ưu độ chính xác tra cứu.
- [x] Thiết lập Socratic Tutoring Guardrail cho Companion Agent.

### Đã hoàn thành
- **Đặng Đức Hoà:** Chuẩn bị tài liệu slide bài giảng thật cho 2 môn học (*Thị giác máy tính* & *Khai phá dữ liệu*), xây dựng tập câu hỏi đối chuẩn thực tế.
- **Hoàng Duy Linh:** Hoàn thành `src/services/rag_service.py`: tích hợp Gemini Vision OCR bóc tách công thức toán LaTeX từ ảnh/slide; chuyển đổi bảng tính Excel thành Markdown Table; tích hợp FlashRank (`ms-marco-TinyBERT-L-2-v2`); chuyển LLM sang Groq (`llama-3.3-70b-versatile` / `gpt-oss-120b`).
- **Nguyễn Tuấn Anh:** Xây dựng giao diện upload tài liệu môn học, tích hợp hiển thị công thức toán học KaTeX/Markdown trong khung Chat.

### Khó khăn & Giải pháp
| Khó khăn | Giải pháp | Kết quả |
|----------|-----------|---------|
| Slide có công thức toán dạng ảnh chụp không đọc được bằng thư viện bóc tách text thông thường. | Tích hợp Gemini Vision OCR chuyên dụng chuyển ảnh công thức thành mã LaTeX chuẩn. | Bóc tách chính xác 100% các công thức toán $Q_1, Q_2, Q_3$, ma trận, tích chập... |
| Tốc độ sinh phản hồi qua OpenAI đôi khi mất 10-15s, trải nghiệm chậm. | Chuyển đổi LLM Engine sang Groq API với tốc độ xử lý siêu tốc ~300 tokens/s. | Thời gian phản hồi giảm xuống chỉ còn 1 - 2 giây. |

### Bài học
- Khâu Chunking và bóc tách theo đúng thứ tự slide tự nhiên ($1 \rightarrow 2 \rightarrow 10$) quyết định trực tiếp tới chất lượng tra cứu ngữ cảnh của RAG.

### Kế hoạch tuần sau
- [ ] Hoàn thiện luồng Workspace Ôn luyện và Reflection Modal 3 bước.
- [ ] Tích hợp End-to-End giữa Frontend và Backend.

---

## Tuần 5: Hoàn thiện Tính năng Learn & Reflect, Tích hợp Toàn diện

### Mục tiêu tuần này
- [x] Hoàn thiện luồng LEARN: Xem kiến thức trọng tâm + Workspace làm bài tập luyện tập trước khi làm bài thật.
- [x] Hoàn thiện luồng REFLECT: Tự đánh giá 1 phút + Phản hồi AI 2 chiều + Kết nối Socratic Tutor.
- [x] Tích hợp toàn diện Frontend và Backend (SSE Streaming Chat, State sync).

### Đã hoàn thành
- **Đặng Đức Hoà:** Thực hiện kiểm thử toàn bộ luồng người dùng (User Acceptance Testing), phát hiện các lỗi bất thường trong luồng RAG và lập lịch để báo cáo lại cho Linh và Tuấn Anh sửa; tinh chỉnh nội dung Reflection Form (Mức độ hiểu bài, Điểm sáng, Khó khăn gặp phải) và kịch bản nhận xét 2 chiều từ AI.
- **Hoàng Duy Linh:** Xây dựng API `/api/v1/sessions` và `/api/v1/chat` hỗ trợ Server-Sent Events (SSE) streaming; tích hợp `StudentLearningContextService` tổng hợp toàn diện ngữ cảnh học tập cho Agent.
- **Nguyễn Tuấn Anh:** Hoàn thành giao diện Study Session Workspace, tích hợp Reflection Modal 3 bước mượt mà với Framer Motion và Ant Design.

### Khó khăn & Giải pháp
| Khó khăn | Giải pháp | Kết quả |
|----------|-----------|---------|
| Sinh viên làm xong bài hay quên tự đánh giá bản thân. | Thiết kế Reflection Modal xuất hiện tự động sau khi bấm hoàn thành bài tập, giao diện ngắn gọn chỉ mất 60 giây. | Giúp sinh viên hình thành thói quen tự nhìn nhận và đúc kết kiến thức. |
| Streaming response tiếng Việt bị lỗi ngắt chữ nếu buffer UTF-8 bị cắt giữa chừng. | Xử lý TextDecoder streaming buffer phía client TypeScript và cấu hình SSE đúng chuẩn. | Chữ hiển thị mượt mà, không lỗi font hay giật lag. |

### Bài học
- Trải nghiệm tương tác thời gian thực (Micro-interactions, phản hồi nhanh) giúp tăng đáng kể động lực học tập của sinh viên.

### Kế hoạch tuần sau
- [ ] Xây dựng bộ benchmark đánh giá định lượng 61 Test Cases.
- [ ] Hoàn thiện toàn bộ tài liệu đặc tả, tài liệu thiết kế và tài liệu kiểm thử.

---

## Tuần 6: Đánh giá Định lượng RAG, Chuẩn hóa Tài liệu & Nghiệm thu Gate G2

### Mục tiêu tuần này
- [x] Xây dựng kịch bản benchmark tự động (`eval/eval_rag_pipeline.py`) trên 61 Test Cases trích xuất từ slide thật.
- [x] Đo lường định lượng các chỉ số Hit Rate, Faithfulness, Latency, Academic Integrity Guardrails.
- [x] Chuẩn hóa toàn bộ tài liệu dự án: `README.md`, `Tài liệu đặc tả & thiết kế/`, `Tài liệu kiểm thử/`.
- [x] Đẩy toàn bộ AI Prompt Logs lên hệ thống đánh giá của BTC.

### Đã hoàn thành
- **Đặng Đức Hoà:** Hoàn thiện 6 tài liệu đặc tả & thiết kế trong thư mục `Tài liệu đặc tả & thiết kế/` (Pain Points, Feature Spec, Architecture Diagram, RAG Pipeline, Project Structure). Rà soát và chuẩn hóa 3 nỗi đau cốt lõi trong `README.md`.
- **Hoàng Duy Linh:** Chạy benchmark tự động 61 Test Cases, sinh báo cáo định lượng `MASTER_EVALUATION_REPORT.md` (Đạt 100% Pass, Hit Rate 100%, Faithfulness 100%, Điểm chất lượng 95.6/100). Quét và đồng bộ 100% AI Logs lên hệ thống BTC.
- **Nguyễn Tuấn Anh:** Xây dựng tài liệu kiểm thử trong thư mục `Tài liệu kiểm thử/` (6 file tài liệu và JSON metrics). Kiểm tra và tối ưu toàn bộ giao diện cho Demo Day.

### Khó khăn & Giải pháp
| Khó khăn | Giải pháp | Kết quả |
|----------|-----------|---------|
| Cần bằng chứng đánh giá định lượng khách quan trên tài liệu học thuật thật. | Xây dựng bộ dataset 61 Test Cases từ 2 môn học thực tế (`CS_COMPUTER_VISION` & `CS_DATA_MINING`) và chạy kịch bản đo lường tự động. | Báo cáo nghiệm thu định lượng đạt chuẩn xuất sắc với đầy đủ số liệu và log JSON đối chứng. |
| Tài liệu nằm rải rác dễ gây khó khăn cho hội đồng chấm điểm. | Gom nhóm và tổ chức thành 2 thư mục chuyên biệt: `Tài liệu đặc tả & thiết kế/` và `Tài liệu kiểm thử/`, kèm chỉ dẫn nguồn gốc rõ ràng. | Cấu trúc tài liệu chuyên nghiệp, chuẩn mực. |

### Bài học
- Kiểm thử tự động và đo lường định lượng từ sớm giúp đội ngũ tự tin về chất lượng sản phẩm trước khi bước vào nghiệm thu.


