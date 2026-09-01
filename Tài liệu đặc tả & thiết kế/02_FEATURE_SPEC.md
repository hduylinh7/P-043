# ĐẶC TẢ TÍNH NĂNG CHI TIẾT — LITA LEARNING (P-043)

> **Nguồn mã nguồn trong dự án:** `src/agents/planner_graph.py`, `src/services/rag_service.py`, `src/services/weekly_plan_service.py`, `src/agents/companion_agent.py`  
---

## 1. TÍNH NĂNG PLAN — Lập kế hoạch học tập động

### 1.1. Mô tả tổng quan
Sinh viên ra lệnh bằng ngôn ngữ tự nhiên (tiếng Việt/Anh) để tạo hoặc điều chỉnh kế hoạch học tập tuần. AI Planner Agent phân tích toàn bộ ngữ cảnh học tập và sinh ra kế hoạch tối ưu, tránh xung đột với lịch học cố định trên giảng đường.

### 1.2. User Story
- **Là** sinh viên, **tôi muốn** nhắn lệnh "Tạo kế hoạch ôn tập môn Computer Vision từ thứ 2 đến thứ 6" để **nhận được** một kế hoạch tuần tự động, tránh trùng giờ học chính thức.
- **Là** sinh viên, **tôi muốn** nhắn "Dời buổi học thứ 3 sang thứ 5" khi bị bận để **kế hoạch được tự động cập nhật** mà không cần mở Calendar thủ công.

### 1.3. Luồng xử lý
```
Sinh viên gõ lệnh (Chat UI)
       │
       ▼
POST /api/v1/planner/run
       │
       ▼
[LangGraph — Planner Agent]
  ├── Node 1: load_context
  │     PlannerContextBuilder:
  │     - Danh sách assignments + deadline + estimated_hours
  │     - Lịch học cố định (CourseSchedule: thứ, giờ, phòng)
  │     - Weekly plan & tasks đang tồn tại
  │     - Goals cá nhân (mục tiêu điểm, GPA)
  │
  ├── Node 2: analyze_and_decide
  │     LLM phân tích ngôn ngữ tự nhiên:
  │     - Xác định ý định: tạo mới / cập nhật / xóa task
  │     - Xác định thứ, giờ, môn học, số giờ ôn tập
  │     - Ưu tiên theo deadline gấp & độ khó ước tính
  │
  ├── Node 3: execute_planner_tools
  │     PlannerTools:
  │     - create_task: tạo task học tập mới
  │     - update_task: dời lịch, thay đổi thời lượng
  │     - delete_task: hủy task
  │     - check_task_conflict_with_fixed_schedules:
  │       Kiểm tra xung đột với CourseSchedule (giảng đường)
  │
  └── Node 4: generate_summary
        Tóm tắt kết quả → trả về text + danh sách tasks
        auto_apply=True: Lưu vào DB ngay
        auto_apply=False: Preview trước khi xác nhận
```

### 1.4. Cơ sở dữ liệu liên quan
| Bảng | Mô tả |
|---|---|
| `weekly_goals` | Mục tiêu học tập theo tuần |
| `tasks` | Các buổi học/ôn tập trong kế hoạch tuần |
| `course_schedules` | Lịch học cố định (giảng đường) — để check xung đột |
| `assignments` | Danh sách bài tập & deadline |
| `goals` | Mục tiêu điểm số cá nhân |

### 1.5. Dynamic Replanning
Khi sinh viên báo trễ tiến độ hoặc thay đổi lịch, hệ thống tự động:
- Tính lại phân bổ khối lượng còn lại
- Điều chỉnh các task chưa hoàn thành sang các ngày còn trống
- Đảm bảo kế hoạch vẫn hoàn thành trước deadline

---

## 2. TÍNH NĂNG LEARN — Học trọng tâm & Ôn luyện

### 2.1. Mô tả tổng quan
Mỗi "bài tập" trong kế hoạch tuần thực chất là một **phiên ôn tập chuẩn bị cho bài tập chính thức của giáo viên**. Trước khi làm bài thật, sinh viên trải qua 2 bước:
1. Xem **Kiến thức trọng tâm** — khái niệm cốt lõi, công thức, sơ đồ được AI trích xuất từ slide/tài liệu đã upload
2. Làm **Bài tập luyện tập** trong Workspace — do AI Agent tạo, bám sát nội dung slide

### 2.2. User Story
- **Là** sinh viên, **tôi muốn** bấm vào buổi học trong kế hoạch để **xem phần kiến thức trọng tâm** AI đã tóm tắt từ slide, giúp tôi ôn nhanh trước khi làm bài.
- **Là** sinh viên, **tôi muốn** làm bài tập luyện tập trong Workspace để **thực hành kiến thức** trước khi bắt tay vào bài tập thật của giáo viên.

### 2.3. Luồng RAG — Trích xuất Kiến thức Trọng tâm
```
Giáo viên/SV upload tài liệu (PPTX / DOCX / PDF / XLSX / Ảnh)
       │
       ▼
RAG Service (src/services/rag_service.py)
  ├── Gemini Vision OCR: Đọc chữ + công thức LaTeX từ ảnh/slide
  ├── Chunking: RecursiveCharacterTextSplitter
  ├── ResilientEmbeddings: gemini-embedding-001 (3072-dim)
  │     SHA-256 hash fallback nếu API lỗi
  └── Qdrant upsert: collection "course_materials"

Sinh viên mở Study Session → Xem Kiến thức Trọng tâm
       │
       ▼
RAG Query Pipeline:
  ├── Qdrant vector search (top-K)
  ├── FlashRank Reranker (ms-marco-TinyBERT-L-2-v2)
  └── Groq LLM tổng hợp → Hiển thị Khái niệm + Công thức + Sơ đồ
```

### 2.4. Workspace — AI tạo bài tập luyện tập
- AI Agent phân tích nội dung slide đã được index trong Qdrant
- Sinh ra câu hỏi luyện tập (trắc nghiệm / tự luận) phù hợp với nội dung
- Áp dụng Socratic Guardrail: **không giải bài hộ** — chỉ gợi mở tư duy

### 2.5. API Endpoints liên quan
| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/v1/courses/{id}/materials` | Upload tài liệu |
| GET | `/api/v1/assignments/{id}` | Lấy thông tin bài tập |
| POST | `/api/v1/chat` | Chat với Companion Agent (RAG) |
| GET/POST | `/api/v1/sessions` | Quản lý Study Session |

---

## 3. TÍNH NĂNG REFLECT — Tự đánh giá & Phản hồi AI

### 3.1. Mô tả tổng quan
Sau mỗi buổi học trong Workspace, sinh viên dành khoảng 1 phút điền phiếu tự nhìn nhận bản thân. AI lập tức phân tích và trả về nhận xét cá nhân hóa, sau đó sinh viên có thể mở phiên Socratic Tutor để giải đáp các vướng mắc còn tồn đọng.

### 3.2. User Story
- **Là** sinh viên, **tôi muốn** điền nhanh cảm nhận sau buổi học (hiểu bao nhiêu %, khó ở điểm nào) để **nhận phản hồi từ AI** về điểm sáng, điểm cần cải thiện và gợi ý tiếp theo.
- **Là** sinh viên, **tôi muốn** sau khi đọc nhận xét AI, **hỏi thêm về điểm chưa hiểu** và được AI giải thích theo phương pháp Socratic (gợi mở, không đưa đáp án trực tiếp).

### 3.3. Luồng Reflect 3 bước
```
Bước 1: SV tự điền Reflection Form
  - Tôi hiểu khoảng bao nhiêu % nội dung hôm nay?
  - Điểm nào tôi nắm tốt nhất?
  - Điểm nào tôi còn mơ hồ / cần xem lại?
  - Tôi có gặp khó khăn gì trong buổi học không?
       │
       ▼
Bước 2: AI phân tích & phản hồi cá nhân hóa
  Companion Agent (Groq LLM):
  ├── Điểm sáng: "Bạn đã nắm chắc khái niệm Mean, Median..."
  ├── Cần lưu ý: "Phần Variance và Standard Deviation còn..."
  └── Gợi ý tiếp theo: "Hãy xem lại slide 12-15, thử giải..."
       │
       ▼
Bước 3: Mở phiên Socratic Tutor
  SV hỏi về điểm còn vướng mắc
  → Companion Agent hỗ trợ theo Socratic Method:
     - KHÔNG đưa đáp án trực tiếp
     - Gợi mở bằng câu hỏi dẫn dắt
     - Giải thích khái niệm liên quan từ tài liệu đã học
```

### 3.4. Cơ sở dữ liệu liên quan
| Bảng | Mô tả |
|---|---|
| `reflection_sessions` | Lưu phiên Reflect (thời gian, session_id, assignment_id) |
| `reflection_messages` | Nội dung câu hỏi/trả lời trong phiên Reflect |
| `ai_interactions` | Log tương tác AI (prompt, response, model) |
| `academic_integrity_logs` | Log các lần AI từ chối giải bài hộ |

---

## 4. TÍNH NĂNG HỖ TRỢ — Companion Chat & Thông báo

### 4.1. Companion Chat (Chat toàn cục)
Intent Classifier tự động phân loại câu hỏi sinh viên vào 7 nhóm:

| Intent | Ví dụ câu hỏi | Xử lý |
|---|---|---|
| `assignment` | "Tôi còn bài nào chưa nộp?" | Query DB assignment + submission |
| `course` | "Tôi đang học môn nào?" | Query DB enrollment + courses |
| `score` | "Điểm bài tập 1 môn CV là bao nhiêu?" | Query DB submission scores |
| `goal` | "Mục tiêu GPA của tôi là gì?" | Query DB goals |
| `schedule` | "Hôm nay tôi cần làm gì?" | Query DB weekly plan + tasks |
| `general` | "Giải thích cho tôi về CNN là gì?" | RAG + slide context |
| `greeting` | "Chào Lita!" | LLM direct response |

### 4.2. Hệ thống Thông báo & Nhắc nhở
- **Reminder Scheduler**: Chạy nền mỗi 60 giây, kiểm tra các task sắp đến hạn
- **Email Notification**: Gửi email nhắc nhở qua Brevo REST API (fallback: Gmail SMTP)
- **In-app Notification**: Lưu trong bảng `notifications`, hiển thị trong giao diện


