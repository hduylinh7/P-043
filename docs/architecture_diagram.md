# 🏗️ Architecture Diagram — AI20K Learning Companion (P-043)

## System Overview

Hệ thống **AI20K Learning Companion** là một AI Agent platform hoàn chỉnh gồm 5 lớp:
**Frontend → Backend API → Business Services & AI Agent Engine → Data Layer**, kết nối với các **External Services** (Groq, Gemini, SMTP).

---

## 1. Full Component Diagram

```mermaid
graph TB
    %% ─────────── LAYER 1: USER ───────────
    Student([🎓 Student User])

    %% ─────────── LAYER 2: FRONTEND ───────────
    subgraph Frontend["🖥️  FRONTEND — React 18 / Next.js + TypeScript"]
        direction LR
        ChatUI[Chat UI]
        AuthPages[Auth Pages]
        SessionMgr[Session Manager]
        CtxLayer["Context\n(AuthContext / ChatContext)"]
    end

    %% ─────────── LAYER 3: BACKEND API ───────────
    subgraph BackendAPI["⚙️  BACKEND API — FastAPI (Python 3.11+)"]
        direction TB
        subgraph Routers["API Routers  /api/v1"]
            direction LR
            R_auth[auth_router]
            R_chat[chat_router]
            R_session[session_router]
            R_course[course_router]
            R_planner[planner_router]
            R_assign[assignment_router]
            R_goal[goal_router]
            R_weekly[weekly_plan_router]
            R_system[system_router]
        end
        JWTAuth["🔒 JWT Auth — Core Security\n(bcrypt + AccessToken + RefreshToken)"]
    end

    %% ─────────── LAYER 4a: BUSINESS SERVICES ───────────
    subgraph Services["🔧  BUSINESS SERVICES"]
        direction TB
        S_auth[auth_service]
        S_course[course_service]
        S_material[material_service]
        S_weekly[weekly_plan_service]
        S_assign[assignment_service]
        S_goal[goal_service]
        S_rag["rag_service\n(RAG Pipeline + OCR)"]
        S_email[email_service]
        S_redis[redis_service]
        S_ctx[student_context_service]
        S_planner[planner_agent_service]
    end

    %% ─────────── LAYER 4b: AI AGENT ENGINE ───────────
    subgraph AgentEngine["🤖  AI AGENT ENGINE — LangGraph"]
        direction TB
        CompAgent["Companion Agent\n(StateGraph)"]
        PlanAgent["Planner Agent\n(StateGraph)"]
        subgraph Nodes["Nodes"]
            N_rag[rag_nodes]
            N_plan[planner_nodes]
            N_example[example_node]
        end
        subgraph Tools["Tools"]
            T_planner[planner_tools]
        end
        LLMSvc["LLM Service\nGroq llama-3.3-70b-versatile\n/ OpenAI gpt-4o-mini"]
    end

    %% ─────────── LAYER 5: DATA ───────────
    subgraph DataLayer["🗄️  DATA LAYER"]
        direction LR
        PG[("🐘 PostgreSQL 16\nchat_sessions · chat_messages\nusers · courses · assignments\nweekly_plans · goals · materials")]
        Redis[("⚡ Redis 7\nSession cache\nRate limiting\nResponse cache")]
        Chroma[("🔮 ChromaDB\nVector Store\nGemini embedding-001")]
        Storage[("📦 MinIO / R2\nPDF · PPTX · Excel\nImages · Docs")]
    end

    %% ─────────── EXTERNAL SERVICES ───────────
    subgraph External["☁️  EXTERNAL SERVICES"]
        E_groq["Groq API\nLlama 3.3 70B\n~300 tokens/s"]
        E_openai["OpenAI API\nGPT-4o-mini"]
        E_gemini["Google Gemini\nembedding-001 + Vision OCR"]
        E_smtp["SMTP\nEmail Service"]
        E_langsmith["LangSmith\nTracing & Observability"]
    end

    %% ─────────── DATA FLOW ARROWS ───────────
    Student -->|"HTTP"| Frontend
    Frontend -->|"REST/HTTP + JWT Bearer"| BackendAPI
    BackendAPI --> Services
    BackendAPI --> AgentEngine
    Services --> AgentEngine

    AgentEngine --> LLMSvc
    LLMSvc -->|"Inference"| E_groq
    LLMSvc -->|"Fallback"| E_openai
    LLMSvc -.->|"Tracing"| E_langsmith

    S_rag -->|"Semantic Search"| Chroma
    S_rag -->|"Multimodal OCR"| E_gemini
    Chroma -->|"Embedding"| E_gemini
    S_material --> Storage

    Services --> PG
    Services --> Redis
    S_email --> E_smtp

    %% ─────────── STYLING ───────────
    classDef frontendStyle fill:#1E3A5F,stroke:#60A5FA,color:#fff
    classDef backendStyle fill:#2D1B69,stroke:#A78BFA,color:#fff
    classDef serviceStyle fill:#1A3A2A,stroke:#34D399,color:#fff
    classDef agentStyle fill:#1C2E1A,stroke:#86EFAC,color:#fff
    classDef dataStyle fill:#2A1A00,stroke:#F97316,color:#fff
    classDef externalStyle fill:#1A1A2E,stroke:#94A3B8,color:#c0c0c0,stroke-dasharray:5 5
    classDef userStyle fill:#0F172A,stroke:#38BDF8,color:#fff

    class Student userStyle
    class ChatUI,AuthPages,SessionMgr,CtxLayer frontendStyle
    class R_auth,R_chat,R_session,R_course,R_planner,R_assign,R_goal,R_weekly,R_system,JWTAuth backendStyle
    class S_auth,S_course,S_material,S_weekly,S_assign,S_goal,S_rag,S_email,S_redis,S_ctx,S_planner serviceStyle
    class CompAgent,PlanAgent,N_rag,N_plan,N_example,T_planner,LLMSvc agentStyle
    class PG,Redis,Chroma,Storage dataStyle
    class E_gemini,E_groq,E_openai,E_smtp,E_langsmith externalStyle
```

---

## 2. Agent Execution Flow

```mermaid
graph LR
    START(["🎓 User Request"])
    START --> ParseCtx["Parse Input\n& Load Context\n(student_context_service)"]
    ParseCtx --> AgentState["LangGraph\nAgentState"]

    AgentState --> RouteDecide{"Router Node\nDecide Intent"}

    RouteDecide -->|"Lập kế hoạch"| PlanTool["Planner Agent\n(planner_nodes\n+ planner_tools)"]
    RouteDecide -->|"Hỏi tài liệu"| RAGTool["RAG Node\n(rag_nodes\n→ ChromaDB)"]
    RouteDecide -->|"Tư vấn học"| LLMResp["Companion Agent\n(LLM Direct Response)"]

    PlanTool --> WritePlan["Write Weekly Plan\n→ PostgreSQL"]
    RAGTool --> VectorSearch["Vector Search\n→ ChromaDB\n→ Generate Answer"]
    LLMResp --> HintResp["Return Hint\n(không giải bài hộ)"]

    WritePlan --> Response(["✅ Response to UI"])
    VectorSearch --> Response
    HintResp --> Response
```

---

## 3. RAG Pipeline Detail

```mermaid
graph TD
    Upload["📂 Upload Tài Liệu\n(PDF / PPTX / DOCX / Excel / Image)"]

    Upload --> TypeCheck{"Loại File?"}

    TypeCheck -->|".pdf"| PDF["pypdf\nExtract text"]
    TypeCheck -->|".pptx"| PPTX["python-pptx\nSlide text (sorted)\n+ Image OCR"]
    TypeCheck -->|".docx"| DOCX["python-docx\nParagraphs\n+ Image OCR"]
    TypeCheck -->|".xlsx / .csv"| Excel["openpyxl / pandas\nMarkdown Table"]
    TypeCheck -->|".jpg / .png"| Img["Gemini Vision\nOCR Extract"]

    PPTX --> OCR["🔍 Gemini Vision OCR\n(ppt/media/* images)"]
    DOCX --> OCR
    OCR --> Chunks

    PDF --> Chunks["✂️ Text Chunking\n(RecursiveCharacterTextSplitter)"]
    Excel --> Chunks
    Img --> Chunks

    Chunks --> Embed["📐 Embed\n(gemini-embedding-001)"]
    Embed --> Store[("🔮 ChromaDB\nVector Store")]

    Query["💬 User Query"] --> QueryEmbed["Embed Query\n(gemini-embedding-001)"]
    QueryEmbed --> Search["Similarity Search\n(Top-K chunks)"]
    Store --> Search
    Search --> Context["Retrieved Context"]
    Context --> LLM["🤖 LLM\n(Groq Llama 3.3 70B)"]
    LLM --> Answer["✅ Grounded Answer"]
```

---

## 4. Data Flow — Luồng dữ liệu chính

| # | Từ | Đến | Giao thức / Phương thức | Mô tả |
|---|----|----|------------------------|-------|
| 1 | **Student** | **Frontend** | HTTP | Giao diện React/Next.js nhận tương tác |
| 2 | **Frontend** | **FastAPI** | REST/HTTP + JWT Bearer | Xác thực mọi request |
| 3 | **FastAPI Routers** | **Services** | Function call | Định tuyến theo domain nghiệp vụ |
| 4 | **Services** | **Agent Engine** | Function call | Kích hoạt LangGraph StateGraph |
| 5 | **Agent** | **LLM Service** | API call | Gửi prompt, nhận inference |
| 6 | **LLM Service** | **Groq API** | HTTPS | Llama 3.3 70B (~300 tokens/s) |
| 7 | **LLM Service** | **OpenAI API** | HTTPS | GPT-4o-mini (fallback) |
| 8 | **rag_service** | **ChromaDB** | Local | Semantic vector search top-K |
| 9 | **rag_service** | **Gemini Vision** | HTTPS | OCR ảnh từ PPTX/DOCX/Image |
| 10 | **ChromaDB** | **Gemini Embedding** | HTTPS | Tạo vector embedding |
| 11 | **Services** | **PostgreSQL** | asyncpg | CRUD: sessions, messages, users, courses... |
| 12 | **Services** | **Redis** | TCP | Cache response, rate limiting |
| 13 | **material_service** | **MinIO / R2** | S3 API | Lưu/đọc file tài liệu |
| 14 | **email_service** | **SMTP** | SMTP/TLS | Gửi email xác nhận, reset password |
| 15 | **LangGraph** | **LangSmith** | HTTPS | Tracing & observability (tuỳ chọn) |

---

## 5. Components Summary

| Component | Technology | Phiên bản | File / Location |
|-----------|-----------|-----------|----------------|
| **Frontend** | React 18, Next.js, TypeScript, Tailwind | — | `frontend/` |
| **Backend Entry** | FastAPI, Uvicorn | ≥ 0.115 | `src/main.py` |
| **Config** | Pydantic Settings | ≥ 2.7 | `src/config.py` |
| **Auth** | JWT (bcrypt + HS256) | — | `src/core/security.py` |
| **Companion Agent** | LangGraph StateGraph | ≥ 0.2 | `src/agents/companion_agent.py` |
| **Planner Agent** | LangGraph StateGraph | ≥ 0.2 | `src/agents/planner_graph.py` |
| **RAG Nodes** | LangChain + ChromaDB | — | `src/agents/nodes/rag_nodes.py` |
| **Planner Nodes** | LangGraph Nodes | — | `src/agents/nodes/planner_nodes.py` |
| **Planner Tools** | LangChain `@tool` | — | `src/agents/tools/planner_tools.py` |
| **RAG Pipeline** | ChromaDB + Gemini Embedding + Vision | — | `src/services/rag_service.py` |
| **LLM Factory** | Groq / OpenAI / Gemini | — | `src/services/llm.py` |
| **Weekly Planner** | Business logic | — | `src/services/weekly_plan_service.py` |
| **PostgreSQL ORM** | Async SQLAlchemy 2.0 + asyncpg | ≥ 2.0 | `src/db/database.py` |
| **DB Migration** | Alembic | ≥ 1.13 | `alembic/` |
| **Redis Cache** | aioredis / redis-py | ≥ 5.0 | `src/services/redis_service.py` |
| **Vector Store** | ChromaDB (local persist) | ≥ 0.5 | `data/chroma/` |
| **File Storage** | boto3 (S3-compatible: MinIO / R2) | ≥ 1.34 | `src/services/storage/` |
| **Container** | Docker + docker-compose | v2.20+ | `Dockerfile`, `docker-compose.yml` |

---

## 6. Design Decisions

| Quyết định | Lựa chọn | Lý do |
|-----------|----------|-------|
| **Agent Framework** | LangGraph | StateGraph linh hoạt, hỗ trợ loop & branching |
| **Primary LLM** | Groq `llama-3.3-70b-versatile` | ~300 tokens/s, chi phí thấp, đủ mạnh cho tiếng Việt |
| **Embedding** | `gemini-embedding-001` | Độ chính xác cao hơn `text-embedding-004` (đã xác nhận fix lỗi 404) |
| **Vision OCR** | Gemini Vision API | Đọc được ảnh, sơ đồ, công thức LaTeX trong PPTX/DOCX |
| **Vector DB** | ChromaDB (local) | Không cần cloud, deploy đơn giản, phù hợp MVP |
| **Backend** | FastAPI 0.115+ | Async native, Pydantic type safety, auto Swagger docs |
| **Database** | PostgreSQL 16 | Bền vững, chuẩn production, hỗ trợ asyncpg |
| **Cache** | Redis 7 | Phản hồi tức thì cho queries lặp lại, rate limiting |
| **Storage** | MinIO / Cloudflare R2 | S3-compatible, dễ chuyển đổi môi trường |
| **Auth** | JWT HS256 + bcrypt | Stateless, secure, dễ scale |
| **ORM** | Async SQLAlchemy 2.0 | Native async, type-safe, tương thích Alembic |
| **Linter** | Ruff | Nhanh hơn flake8/black 10–100x |
