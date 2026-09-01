# ARCHITECTURE DOCUMENT — LITA LEARNING (Project P-043)
---

## 1. System Architecture Overview

Hệ thống **Lita Learning** được xây dựng theo kiến trúc **AI-First Multi-Agent Backend** với hai LangGraph Agent Engine riêng biệt, phục vụ luồng **PLAN - LEARN - REFLECT**:

```text
╔══════════════════════════════════════════════════════════════════════════════╗
║                      CLIENT LAYER — Single Page App                         ║
║         React 18 + Vite 5 + TypeScript + Ant Design + Tailwind CSS          ║
║  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐  ║
║  │  Calendar   │ │  Chat (RAG)  │ │  Courses &   │ │ Study Session       │  ║
║  │  Weekly     │ │  Socratic    │ │  Assignments │ │ Kiến Thức Trọng Tâm │  ║
║  │  Planner    │ │  Tutor UI    │ │  Materials   │ │ Workspace / Reflect │  ║
║  └─────────────┘ └──────────────┘ └──────────────┘ └─────────────────────┘  ║
╚══════════════════════════════╤═══════════════════════════════════════════════╝
                               │ REST API / JWT Bearer (axios proxy :5173 → :8000)
                               ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                   API GATEWAY — FastAPI 0.115+ (Async)                      ║
║            CORS Middleware · JWT Security · Pydantic v2 Validation          ║
║                                                                              ║
║  /auth  /courses  /weekly-plans  /planner  /chat  /assignments  /notifs     ║
╚═══════╤══════════╤══════════════╤══════════╤══════╤═════════════════════════╝
        │          │              │          │      │
        ▼          ▼              ▼          ▼      ▼
╔═══════════╗ ╔══════════════╗ ╔══════════════════════════════════════════════╗
║ BUSINESS  ║ ║  COMPANION   ║ ║          PLANNER AGENT ENGINE                ║
║ SERVICES  ║ ║  AGENT       ║ ║          (LangGraph StateGraph)               ║
║           ║ ║  (LangGraph  ║ ║                                               ║
║ auth      ║ ║  StateGraph) ║ ║  load_context ──► analyze_and_decide         ║
║ course    ║ ║              ║ ║       │                    │                  ║
║ material  ║ ║  retrieve_   ║ ║       ▼                    ▼                  ║
║ assignment║ ║  context     ║ ║  PlannerContext    execute_planner_tools      ║
║ goal      ║ ║  ──►         ║ ║  Builder          (create/update/delete task) ║
║ weekly_   ║ ║  generate_   ║ ║       │                    │                  ║
║ plan      ║ ║  rag_resp    ║ ║       └────────────────────┘                  ║
║ reminder  ║ ║              ║ ║                    ▼                          ║
║ email     ║ ║  Intent      ║ ║          generate_summary                     ║
║ (Brevo /  ║ ║  Classifier  ║ ║                                               ║
║  SMTP)    ║ ║  + Socratic  ║ ║  PlannerTools: create_plan / update_task /    ║
║ scheduler ║ ║  Guardrail   ║ ║  delete_task / schedule_conflict_check        ║
╚═══════════╝ ╚══════════════╝ ╚══════════════════════════════════════════════╝
        │              │                           │
        └──────────────┴───────────────────────────┘
                               │
                               ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                    AI & RAG RETRIEVAL PIPELINE                               ║
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐     ║
║  │  LLM Factory — get_llm() — src/services/llm.py                      │     ║
║  │  Groq (gpt-oss-120b / llama-3.3-70b) │ Gemini (Vision OCR / Chat)   │     ║
║  │  OpenRouter │ OpenAI fallback                                        │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐     ║
║  │  RAG Service — src/services/rag_service.py                          │     ║
║  │  Upload ──► Gemini Vision OCR ──► Chunking ──► ResilientEmbeddings  │     ║
║  │         ──► Qdrant upsert ──► Query ──► FlashRank Reranker          │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
╚══════════════════════════════════════════════════════════════════════════════╝
                               │
                               ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                       PERSISTENCE & STORAGE LAYER                           ║
║                                                                              ║
║  PostgreSQL 16 (asyncpg)  │  Redis 7  │  Qdrant Vector DB (course_materials)║
║  Cloudflare R2 / MinIO (Object Storage — boto3)                             ║
║  Email: Brevo REST API (HTTPS:443) / Gmail SMTP fallback                    ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Luồng xử lý hai Agent AI chính

```text
┌────────────────────────────────────┐  ┌────────────────────────────────────┐
│  COMPANION AGENT (Chat & RAG)      │  │  PLANNER AGENT (Scheduling)        │
│  src/agents/graph.py               │  │  src/agents/planner_graph.py        │
│                                    │  │                                    │
│  POST /api/v1/chat                 │  │  POST /api/v1/planner/run           │
│  [Intent Classifier]               │  │  [load_context] PlannerContext      │
│  ──► [retrieve_context]            │  │  ──► [analyze_and_decide]           │
│      StudentLearningContextService │  │  ──► [execute_planner_tools]        │
│      + Qdrant RAG (slide/formula)  │  │      conflict_check vs CourseSchedule│
│  ──► [generate_rag_response]       │  │  ──► [generate_summary]             │
│      Groq LLM + Socratic Guardrail │  │      auto_apply: persist / preview  │
│      Stream SSE Response           │  │                                    │
└────────────────────────────────────┘  └────────────────────────────────────┘
```

---

## 3. Mô tả các thành phần hệ thống

### 3.1. Frontend (React 18 + Vite 5)
- **Location:** `frontend/`
- **Tech:** React 18, Vite 5, TypeScript, Ant Design, Tailwind CSS, Framer Motion, React Router DOM v6
- **Proxy:** `vite.config.ts` proxy `/api` → `http://localhost:8000`
- **Key Features:** Calendar/Weekly Planner, Chat & Socratic Tutor, Courses & Assignments, Study Session Workspace, Reflection Modal

### 3.2. Backend API (FastAPI 0.115+)
- **Location:** `src/main.py`, `src/routers/`
- **Routers:** `/auth`, `/courses`, `/weekly-plans`, `/planner`, `/chat`, `/assignments`, `/goals`, `/notifications`, `/sessions`
- **Startup:** DB init, Redis init, Reminder Scheduler (60s interval)

### 3.3. Companion AI Agent (Chat & RAG)
- **Location:** `src/agents/graph.py`, `src/agents/companion_agent.py`, `src/agents/nodes/rag_nodes.py`
- **StateGraph Nodes:** `retrieve_context` → `generate_rag_response`
- **Intent Classification:** 7 categories (assignment / course / goal / schedule / general / greeting / score)
- **Guardrail:** Socratic Tutoring — từ chối giải bài hộ, gợi mở tư duy

### 3.4. Planner AI Agent (Scheduling)
- **Location:** `src/agents/planner_graph.py`, `src/agents/nodes/planner_nodes.py`, `src/agents/tools/planner_tools.py`
- **StateGraph Nodes:** `load_context` → `analyze_and_decide` → `execute_planner_tools` → `generate_summary`
- **Conflict Check:** `src/services/schedule_utils.py` — tránh trùng lịch học giảng đường

### 3.5. RAG Pipeline
- **Location:** `src/services/rag_service.py`
- **Multimodal Extraction:** PPTX (slide-by-slide), DOCX (paragraphs + images), XLSX/CSV (Markdown Table), Images (Gemini Vision OCR → LaTeX)
- **Embeddings:** `ResilientEmbeddings` — Google `gemini-embedding-001` (3072-dim), SHA-256 hash fallback
- **Vector Store:** Qdrant — collection `course_materials`
- **Reranker:** FlashRank `ms-marco-TinyBERT-L-2-v2` Cross-Encoder

### 3.6. LLM Factory
- **Location:** `src/services/llm.py`
- **Providers:** Groq (`gpt-oss-120b`, `llama-3.3-70b`), Google Gemini (`gemini-2.5-flash`), OpenRouter, OpenAI
- **Config:** `LLM_PROVIDER` + `MODEL_NAME` trong `.env`

### 3.7. Database Layer (PostgreSQL 16 + Async SQLAlchemy 2.0)
- **DB Groups (src/db/models/):**
  - `identity/`: `users`, `roles`, `user_roles`, `anonymous_profiles`
  - `learning/`: `courses`, `course_materials`, `course_schedules`, `enrollments`, `assignments`, `assignment_checklists`, `submissions`, `student_assignment_progress`, `student_checklist_progress`
  - `planning/`: `weekly_goals`, `tasks`, `goals`, `notifications`
  - `reflection/`: `reflection_sessions`, `reflection_messages`
  - `ai/`: `ai_interactions`, `academic_integrity_logs`
  - `chat/`: `chat_sessions`, `chat_messages`
  - `knowledge/`: `knowledge_items`

### 3.8. Cache & Queue (Redis 7)
- **Uses:** OTP storage (6-digit, 10min TTL), Session cache, Reminder notification queue

### 3.9. Object Storage (Cloudflare R2 / MinIO)
- **SDK:** boto3 (S3-compatible), Bucket: `project-materials`

### 3.10. Email Service
- **Primary:** Brevo REST API (HTTPS port 443)
- **Fallback:** Gmail SMTP (TLS port 587)
- **Use Cases:** OTP verification, password reset, study reminder notifications

---

## 4. Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Frontend | React 18 + Vite 5 (SPA) | Hiệu năng cao, HMR, không cần SSR |
| API | FastAPI 0.115+ | Async, Pydantic v2, OpenAPI auto-docs |
| Agent Engine | LangGraph ≥ 0.2 | StateGraph linh hoạt, multi-node AI workflow |
| Primary LLM | Groq (gpt-oss-120b / llama-3.3-70b) | ~300 tokens/s, chi phí tối ưu |
| Vision OCR | Google Gemini Vision API | Nhận diện chữ + công thức LaTeX từ slide |
| Embeddings | Google gemini-embedding-001 (3072-dim) | Độ chính xác cao, tài liệu tiếng Việt |
| Vector DB | Qdrant | Hiệu năng cao, hỗ trợ Cloud & Local |
| Reranker | FlashRank TinyBERT Cross-Encoder | Tái xếp hạng RAG cực nhanh (<2ms) |
| Primary DB | PostgreSQL 16 + asyncpg | Bền vững, chuẩn production |
| Caching | Redis 7 | OTP, Session cache, Reminder queue |
| Object Storage | Cloudflare R2 / MinIO (boto3) | Chi phí thấp, S3-compatible |
| Email | Brevo REST API + Gmail SMTP fallback | Delivery rate cao, không phụ thuộc SMTP đơn |

