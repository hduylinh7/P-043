# CẤU TRÚC DỰ ÁN — LITA LEARNING (P-043)
> **Nguồn dữ liệu:** Cấu trúc thư mục và mã nguồn thực tế của dự án (`src/`, `frontend/`, `tests/`)  

## Tổng quan

Dự án **Lita Learning** (AI20K Build Phase — Team P-043) là một hệ thống AI Learning Companion hoàn chỉnh gồm:

- **Backend:** FastAPI (Python 3.11+) — REST API, JWT Auth, LangGraph Agent Engine
- **AI Agent:** LangGraph StateGraph — 2 Agent: Companion Agent (Chat/RAG) + Planner Agent (Scheduling)
- **LLM:** Groq (`gpt-oss-120b`, `llama-3.3-70b`) + Google Gemini Vision OCR
- **RAG:** Qdrant Vector DB + `gemini-embedding-001` + FlashRank Reranker
- **Database:** PostgreSQL 16 (Async SQLAlchemy 2.0 + Alembic)
- **Cache:** Redis 7 (OTP, Session, Reminder Queue)
- **Storage:** Cloudflare R2 / MinIO (boto3 — S3-compatible)
- **Email:** Brevo REST API + Gmail SMTP fallback
- **Frontend:** React 18 + Vite 5 + TypeScript + Ant Design + Tailwind CSS

---

## Cây thư mục

```
P-043/
├── src/                          # Backend source code
│   ├── main.py                   # FastAPI entrypoint, CORS, router, scheduler
│   ├── config.py                 # Pydantic BaseSettings — env vars
│   ├── agents/                   # AI Agent Engine (LangGraph)
│   │   ├── graph.py              # Companion Agent StateGraph
│   │   ├── planner_graph.py      # Planner Agent StateGraph
│   │   ├── companion_agent.py    # Intent Classifier + Socratic Guardrail
│   │   ├── state.py              # AgentState schema
│   │   ├── planner_state.py      # PlannerAgentState schema
│   │   ├── nodes/
│   │   │   ├── rag_nodes.py      # retrieve_context + generate_rag_response
│   │   │   └── planner_nodes.py  # load_context / analyze_and_decide / execute_planner_tools / generate_summary
│   │   └── tools/
│   │       └── planner_tools.py  # create_plan / update_task / delete_task / conflict_check
│   ├── routers/                  # FastAPI routers (API endpoints)
│   │   ├── auth_router.py        # /register /login /refresh /logout /otp
│   │   ├── course_router.py      # /courses CRUD + enrollment
│   │   ├── assignment_router.py  # /assignments + checklists + submissions
│   │   ├── weekly_plan_router.py # /weekly-plans + tasks
│   │   ├── planner_router.py     # /planner/run (Planner Agent entry)
│   │   ├── chat_router.py        # /chat (Companion Agent entry — streaming SSE)
│   │   ├── goal_router.py        # /goals CRUD
│   │   ├── session_router.py     # /sessions (Study Session)
│   │   ├── notification_router.py# /notifications
│   │   └── system_router.py      # /health
│   ├── services/                 # Business logic layer
│   │   ├── auth_service.py       # Xác thực, JWT, OTP, password reset
│   │   ├── course_service.py     # Quản lý môn học, tài liệu, lịch học
│   │   ├── assignment_service.py # Bài tập, checklist, submission, scoring
│   │   ├── weekly_plan_service.py# Kế hoạch tuần, task CRUD, Dynamic Replanning
│   │   ├── planner_agent_service.py # Khởi chạy Planner Agent
│   │   ├── planner_context_builder.py # Tổng hợp ngữ cảnh cho Planner Agent
│   │   ├── rag_service.py        # RAG pipeline: OCR → Chunk → Embed → Qdrant → Rerank
│   │   ├── student_context_service.py # Tổng hợp ngữ cảnh học tập cho Companion Agent
│   │   ├── instructor_context_service.py # Ngữ cảnh giảng viên
│   │   ├── material_service.py   # Xử lý upload & quản lý tài liệu
│   │   ├── goal_service.py       # Mục tiêu học tập cá nhân
│   │   ├── email_service.py      # Brevo REST API + Gmail SMTP fallback
│   │   ├── redis_service.py      # OTP, session cache, queue
│   │   ├── llm.py                # LLM Factory: Groq / Gemini / OpenRouter / OpenAI
│   │   ├── schedule_utils.py     # Kiểm tra xung đột lịch học
│   │   ├── reminder_service.py   # Logic gửi thông báo nhắc nhở
│   │   ├── reminder_scheduler.py # Background scheduler (60s interval)
│   │   ├── db_service.py         # DB helper utilities
│   │   └── storage/              # Object storage (Cloudflare R2 / MinIO)
│   ├── db/                       # Database layer
│   │   ├── database.py           # Async SQLAlchemy engine + SessionLocal
│   │   ├── base.py               # DeclarativeBase
│   │   ├── enums.py              # Enum types (UserRole, TaskStatus...)
│   │   └── models/               # SQLAlchemy ORM models (7 domain groups)
│   │       ├── identity/         # users, roles, user_roles, anonymous_profiles
│   │       ├── learning/         # courses, course_materials, course_schedules,
│   │       │                     # enrollments, assignments, assignment_checklists,
│   │       │                     # submissions, student_assignment_progress,
│   │       │                     # student_checklist_progress, questions
│   │       ├── planning/         # weekly_goals, tasks, goals, notifications
│   │       ├── reflection/       # reflection_sessions, reflection_messages
│   │       ├── ai/               # ai_interactions, academic_integrity_logs
│   │       ├── chat/             # chat_sessions, chat_messages
│   │       ├── integration/      # Tích hợp ngoài (nếu có)
│   │       └── knowledge/        # knowledge_items
│   ├── models/                   # Pydantic schemas (DTOs / Request & Response)
│   ├── repositories/             # Repository pattern (tầng truy vấn DB)
│   └── core/
│       └── security.py           # bcrypt, JWT AccessToken/RefreshToken
│
├── frontend/                     # React 18 + Vite 5 SPA
│   ├── src/
│   │   ├── main.tsx              # React entrypoint
│   │   ├── App.tsx               # Router chính (React Router DOM v6)
│   │   ├── pages/                # Trang: Login, Register, Dashboard, Courses,
│   │   │                         # Assignments, Calendar, Chat, Study Session
│   │   ├── components/           # Các component tái sử dụng (Sidebar, Chat, Calendar...)
│   │   ├── services/             # Axios HTTP client → FastAPI backend
│   │   ├── context/              # AuthContext, ThemeContext (Global State)
│   │   └── types/                # TypeScript interfaces & types
│   └── vite.config.ts            # Proxy: /api → http://localhost:8000
│
├── alembic/                      # DB Schema Version Control
│   ├── env.py                    # Alembic config → SQLAlchemy Models
│   └── versions/                 # Migration scripts
│
├── eval/                         # RAG & AI Evaluation
│   ├── results/
│   │   ├── MASTER_EVALUATION_REPORT.md  # Tổng hợp kết quả đánh giá
│   │   └── rag_eval_report.md    # Chi tiết từng chỉ số RAG
│   └── *.py                      # Test scripts đánh giá (61 test cases)
│
├── tests/                        # Automated tests (pytest)
│   ├── conftest.py               # Fixtures (mock DB, Redis, test client)
│   ├── test_agents/              # Test LangGraph nodes & tools
│   ├── test_api/                 # Test FastAPI endpoints
│   └── test_db_schema.py         # Test SQLAlchemy models
│
├── scripts/                      # Automation scripts
│   ├── setup_hooks.ps1           # Cài Git Hook trên Windows
│   ├── setup_hooks.sh            # Cài Git Hook trên Linux/macOS
│   ├── log_antigravity.py        # Quét log prompt Antigravity IDE
│   ├── log_hook.py               # Hook ghi log AI prompt khi git push
│   └── submit_log.py             # Đẩy log lên server BTC
│
├── docs/                         # Tài liệu kỹ thuật bổ sung
├── presentation/                 # Slide thuyết trình Demo Day
│
├── Tài liệu đặc tả & thiết kế/   # Tài liệu đặc tả & thiết kế sản phẩm
│   ├── 00_INDEX.md               # Mục lục & Tech stack tổng quan
│   ├── 01_PAIN_POINTS.md         # Đặc tả bài toán: 3 nỗi đau cốt lõi
│   ├── 02_FEATURE_SPEC.md        # Đặc tả chi tiết 3 tính năng cốt lõi (PLAN/LEARN/REFLECT)
│   ├── 03_ARCHITECTURE_DIAGRAM.md# Sơ đồ & thiết kế kiến trúc hệ thống 5 tầng
│   ├── 04_RAG_AI_PIPELINE.md     # Thiết kế & nâng cấp RAG AI Pipeline
│   └── 05_PROJECT_STRUCTURE.md   # File này
│
├── README.md                     # Tài liệu chính: giới thiệu, hướng dẫn, API
├── ARCHITECTURE_DIAGRAM.md       # Sơ đồ & kiến trúc hệ thống
├── PAIN_POINT.md                 # Bài toán & 3 pain points
├── RAG_Upgrade_Summary.md        # Lịch sử nâng cấp RAG pipeline
├── WORKLOG.md                    # Work log hàng ngày của team
├── JOURNAL.md                    # Nhật ký phát triển dự án
├── Dockerfile                    # Container image Backend
├── docker-compose.yml            # Orchestration: Backend + PostgreSQL + Redis + Qdrant
├── render.yaml                   # Render.com deployment config
├── requirements.txt              # Python dependencies
├── alembic.ini                   # Alembic config
└── ruff.toml                     # Python linter & formatter config
```

---

## Các file config quan trọng

| File | Mô tả |
|---|---|
| `.env` | API Keys (Groq, Gemini, Brevo, Qdrant), DB URL, Redis URL, JWT Secret |
| `.env.example` | Template env — không chứa giá trị thật |
| `src/config.py` | Pydantic `BaseSettings` — tải và validate toàn bộ env vars |
| `docker-compose.yml` | Chạy Backend + PostgreSQL 16 + Redis 7 + Qdrant |
| `render.yaml` | Deploy lên Render.com (production) |
| `alembic.ini` | Kết nối Alembic với PostgreSQL |
| `ruff.toml` | Quy chuẩn code Python (E, W, F, I rules) |

---

## Biến môi trường chính (`.env`)

| Biến | Giá trị mẫu | Dùng cho |
|---|---|---|
| `LLM_PROVIDER` | `groq` | Chọn provider LLM |
| `MODEL_NAME` | `llama-3.3-70b-versatile` | Tên model LLM |
| `GROQ_API_KEY` | `gsk_...` | Groq API |
| `GOOGLE_API_KEY` | `AIza...` | Gemini Vision OCR + Embeddings |
| `EMBEDDING_MODEL_NAME` | `models/gemini-embedding-001` | Vector embeddings |
| `QDRANT_URL` | `https://xxx.qdrant.io` | Qdrant Cloud |
| `QDRANT_API_KEY` | `...` | Qdrant Auth |
| `DATABASE_URL` | `postgresql+asyncpg://...` | PostgreSQL |
| `REDIS_URL` | `redis://...` | Redis |
| `JWT_SECRET_KEY` | `...` | JWT signing |
| `BREVO_API_KEY` | `xkeysib-...` | Email service |
| `R2_ENDPOINT_URL` | `https://...r2.cloudflarestorage.com` | Object Storage |


