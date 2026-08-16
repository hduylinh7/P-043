# 🎓 AI20K Learning Companion — P-043

> **Trợ lý AI Agent** kết hợp **LangGraph + RAG (Groq Llama 3.3 70B · Gemini Vision OCR)** giúp sinh viên tự động hóa lập kế hoạch ôn thi, phân bổ thời gian học thông minh và hỗ trợ hỏi đáp tài liệu không vi phạm đạo đức học thuật.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2+-1C3C3C?logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Mục lục

- [🎯 Vấn đề & Giải pháp](#-vấn-đề--giải-pháp)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ Kiến trúc hệ thống](#️-kiến-trúc-hệ-thống)
- [⚡ Quick Start](#-quick-start)
  - [Option A — Chạy local (Development)](#option-a--chạy-local-development)
  - [Option B — Docker Compose (Recommended)](#option-b--docker-compose-recommended)
- [🔑 Environment Variables](#-environment-variables)
- [🗃️ Database Setup & Migration](#️-database-setup--migration)
- [📡 API Reference](#-api-reference)
- [💬 Sample Queries — Câu hỏi mẫu](#-sample-queries--câu-hỏi-mẫu)
- [🧪 Testing](#-testing)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)

---

## 🎯 Vấn đề & Giải pháp

### 🚨 Pain Points của sinh viên

| # | Vấn đề | Mô tả |
|---|--------|-------|
| 1 | **"Nước đến chân mới nhảy"** | Không có kế hoạch ôn tập sớm, dồn ứ bài vở trước kỳ thi 1–2 tuần gây quá tải |
| 2 | **Hoang mang tài liệu** | Đề cương slide, sách, PDF hàng trăm trang không biết bắt đầu từ đâu |
| 3 | **Vi phạm học thuật** | Nhờ AI giải bài hộ thay vì học bản chất của vấn đề |

### 💡 Giải pháp của P-043

- **Dynamic Weekly Plan** — AI phân tích các bài tập, deadline , mục tiêu các nhân, phân bổ thời gian hợp lí cho từng mục tiêu, bài tập.
- **Multimodal RAG + OCR** — Đọc PDF, Excel, ảnh sơ đồ bài giảng qua Gemini Vision để trích xuất trọng tâm các kiến thức trong tài liệu ôn tập.
- **AI Tutor (Companion Agent)** — Chatbot gợi ý hướng tư duy, giải thích kiến thức dựa trên tài liệu — **không giải bài hộ**.

---

## 🛠️ Tech Stack

| Layer | Technology | Phiên bản | Mô tả |
|-------|-----------|-----------|-------|
| **AI Agent** | LangGraph + LangChain | ≥ 0.2 / ≥ 0.3 | StateGraph, Nodes, Tools |
| **LLM** | Groq `llama-3.3-70b-versatile` | — | ~300 tokens/s, chi phí thấp |
| **LLM (fallback)** | OpenAI `gpt-4o-mini` | — | Dự phòng khi cần |
| **Embedding** | Google `gemini-embedding-001` | — | Semantic vector search |
| **Vision OCR** | Google Gemini Vision | — | Đọc ảnh, sơ đồ, PPTX |
| **Backend** | FastAPI + Async SQLAlchemy 2.0 | ≥ 0.115 | REST API async high-performance |
| **Frontend** | React 18 / Next.js + TypeScript | — | Chat UI, Weekly Plan |
| **Database** | PostgreSQL 16 | — | Lưu trữ bền vững |
| **Cache** | Redis 7 | — | Session cache, Rate limiting |
| **Vector Store** | ChromaDB | ≥ 0.5 | RAG document embeddings |
| **Storage** | MinIO / Cloudflare R2 (S3-compatible) | — | Lưu trữ file tài liệu |
| **Container** | Docker + docker-compose | — | Deployment & Dev environment |
| **Migration** | Alembic | ≥ 1.13 | Schema version control |

---

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                    Student (Browser)                        │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────────┐
│          Frontend — React 18 / Next.js + TypeScript         │
│   Chat UI │ Auth Pages │ Session Manager │ ChatContext       │
└────────────────────────┬────────────────────────────────────┘
                         │ REST/HTTP + JWT Bearer
┌────────────────────────▼────────────────────────────────────┐
│              FastAPI Backend (Python 3.11+)                  │
│  /api/v1: auth · chat · session · course · planner          │
│           assignment · goal · weekly_plan · system          │
│                  JWT Auth (Core Security)                    │
└───────────┬─────────────────────────────┬───────────────────┘
            │                             │
┌───────────▼──────────┐   ┌─────────────▼───────────────────┐
│  Business Services   │   │   AI Agent Engine (LangGraph)    │
│  auth · course       │   │   Companion Agent (StateGraph)   │
│  material · weekly   │──►│   Planner Agent (StateGraph)     │
│  assignment · rag    │   │   Nodes: rag_nodes, planner_nodes│
│  email · redis       │   │   Tools: planner_tools           │
└───────────┬──────────┘   │   LLM: Groq / OpenAI / Gemini   │
            │              └────────────┬────────────────────-┘
            │                           │
┌───────────▼───────────────────────────▼───────────────────-─┐
│                       Data Layer                             │
│  PostgreSQL 16  │  Redis 7 Cache  │  ChromaDB Vector Store  │
│  (users, chats, │  (session, rate │  (embeddings, RAG docs) │
│  courses, plans)│   limit, cache) │                         │
└──────────────────────────────────────────────────────────────┘
```

> 📌 Xem sơ đồ chi tiết tại [`ARCHITECTURE.md`](./ARCHITECTURE.md) và [`docs/architecture_diagram.md`](./docs/architecture_diagram.md)

---

## ⚡ Quick Start

### Yêu cầu hệ thống

| Công cụ | Phiên bản tối thiểu |
|---------|---------------------|
| Python | 3.11+ |
| Node.js | 18+ |
| Docker & Docker Compose | v2.20+ |
| Git | 2.x |

---

### Option A — Chạy local (Development)

#### Bước 1: Clone & cài đặt môi trường Python

```bash
git clone https://github.com/AI20K-Build-Phase-Cohort-3/P-043.git
cd P-043

# Tạo virtual environment
python -m venv .venv

# Kích hoạt (Windows PowerShell)
.\.venv\Scripts\Activate.ps1

# Kích hoạt (Linux / macOS)
source .venv/bin/activate

# Cài đặt dependencies
pip install -r requirements.txt
```

#### Bước 2: Cấu hình biến môi trường

```bash
# Sao chép file mẫu
cp .env.example .env
```

Mở `.env` và điền các giá trị cần thiết (xem chi tiết ở [mục Environment Variables](#-environment-variables)).

#### Bước 3: Khởi động PostgreSQL & Redis (cần Docker)

```bash
# Chỉ chạy các services hạ tầng (không build backend/frontend)
docker compose up postgres redis -d
```

#### Bước 4: Chạy Database Migration

```bash
alembic upgrade head
```

#### Bước 5: Khởi chạy Backend

```bash
# Cách 1: dùng Makefile
make run

# Cách 2: trực tiếp
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

> ✅ Backend sẵn sàng tại: `http://localhost:8000`
> 📄 API Docs (Swagger): `http://localhost:8000/docs`
> 📄 ReDoc: `http://localhost:8000/redoc`

#### Bước 6: Khởi chạy Frontend

```bash
cd frontend
npm install
npm run dev
```

> ✅ Frontend sẵn sàng tại: `http://localhost:3000`

---

### Option B — Docker Compose (Recommended)

Chạy toàn bộ stack (PostgreSQL + Redis + Backend + Frontend) bằng một lệnh duy nhất:

```bash
# 1. Cấu hình .env (bắt buộc)
cp .env.example .env
# → Điền GROQ_API_KEY, GEMINI_API_KEY, JWT_SECRET_KEY vào .env

# 2. Build & khởi chạy tất cả services
docker compose up --build -d

# 3. Xem logs theo dõi
docker compose logs -f backend
```

| Service | URL | Ghi chú |
|---------|-----|---------|
| Frontend | `http://localhost:3000` | React / Next.js |
| Backend API | `http://localhost:8000` | FastAPI |
| API Docs | `http://localhost:8000/docs` | Swagger UI |
| PostgreSQL | `localhost:5432` | DB: `p043_db` |
| Redis | `localhost:6379` | Cache |

```bash
# Dừng tất cả services
docker compose down

# Dừng và xóa data volumes
docker compose down -v
```

---

## 🔑 Environment Variables

Tạo file `.env` từ `.env.example`. Dưới đây là toàn bộ biến môi trường và ý nghĩa:

### 🤖 LLM & Embeddings

| Biến | Giá trị mặc định | Bắt buộc | Mô tả |
|------|-----------------|----------|-------|
| `LLM_PROVIDER` | `groq` | ✅ | Provider LLM: `groq` \| `openai` \| `gemini` |
| `MODEL_NAME` | `llama-3.3-70b-versatile` | ✅ | Tên model LLM |
| `GROQ_API_KEY` | — | ✅ (nếu dùng Groq) | API key từ [console.groq.com](https://console.groq.com) |
| `OPENAI_API_KEY` | — | ✅ (nếu dùng OpenAI) | API key từ [platform.openai.com](https://platform.openai.com) |
| `GEMINI_API_KEY` | — | ✅ | API key Gemini (dùng cho Embedding & Vision OCR) |
| `EMBEDDING_MODEL_NAME` | `models/gemini-embedding-001` | ✅ | Model embedding cho ChromaDB RAG |

```env
# .env — LLM Configuration
LLM_PROVIDER=groq
MODEL_NAME=llama-3.3-70b-versatile
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaSy_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMBEDDING_MODEL_NAME=models/gemini-embedding-001
```

> **Chuyển đổi LLM Provider:**
> ```env
> # Dùng OpenAI
> LLM_PROVIDER=openai
> MODEL_NAME=gpt-4o-mini
>
> # Dùng Gemini
> LLM_PROVIDER=gemini
> MODEL_NAME=gemini-2.0-flash
> ```

### 🗄️ Database

| Biến | Giá trị mẫu | Bắt buộc | Mô tả |
|------|------------|----------|-------|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:password@localhost:5432/p043_db` | ✅ | PostgreSQL connection string (async) |

```env
# PostgreSQL (Production / Docker)
DATABASE_URL=postgresql+asyncpg://postgres:postgrespassword@localhost:5432/p043_db

# SQLite (Development nhanh, không cần PostgreSQL)
# DATABASE_URL=sqlite+aiosqlite:///./data/app.db
```

### ⚡ Redis Cache

| Biến | Giá trị mặc định | Bắt buộc | Mô tả |
|------|-----------------|----------|-------|
| `REDIS_URL` | `redis://localhost:6379/0` | ✅ | Redis connection URL |

### 🔮 Vector Store (ChromaDB)

| Biến | Giá trị mặc định | Mô tả |
|------|-----------------|-------|
| `CHROMA_PERSIST_DIR` | `./data/chroma` | Thư mục lưu vector embeddings local |

### 🔒 JWT Authentication

| Biến | Giá trị mặc định | Bắt buộc | Mô tả |
|------|-----------------|----------|-------|
| `JWT_SECRET_KEY` | — | ✅ | Secret key bảo mật (ít nhất 32 ký tự random) |
| `JWT_ALGORITHM` | `HS256` | — | Thuật toán ký JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | — | Thời gian hết hạn Access Token (phút) |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | — | Thời gian hết hạn Refresh Token (ngày) |

```bash
# Sinh JWT_SECRET_KEY ngẫu nhiên (Linux/macOS)
openssl rand -hex 32

# Sinh JWT_SECRET_KEY ngẫu nhiên (Python)
python -c "import secrets; print(secrets.token_hex(32))"
```

### 📦 Object Storage (MinIO / Cloudflare R2)

| Biến | Mô tả |
|------|-------|
| `STORAGE_PROVIDER` | `minio` hoặc `r2` |
| `S3_ENDPOINT` | URL endpoint S3-compatible (ví dụ: `http://localhost:9000`) |
| `S3_BUCKET` | Tên bucket (ví dụ: `course-materials`) |
| `S3_ACCESS_KEY` | Access key |
| `S3_SECRET_KEY` | Secret key |
| `S3_REGION` | Region (mặc định `us-east-1` hoặc `auto` cho R2) |
| `MAX_UPLOAD_SIZE_MB` | Giới hạn dung lượng upload (MB), mặc định `50` |

### 📧 SMTP Email

| Biến | Giá trị mẫu | Mô tả |
|------|------------|-------|
| `SMTP_HOST` | `smtp.gmail.com` | SMTP server |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | `your@gmail.com` | Email đăng nhập |
| `SMTP_PASSWORD` | `app_password_here` | Mật khẩu ứng dụng Gmail |
| `SMTP_FROM` | `noreply@ailearningcompanion.com` | Địa chỉ gửi hiển thị |
| `SMTP_TLS` | `true` | Bật TLS |

### ⚙️ App Configuration

| Biến | Giá trị mặc định | Mô tả |
|------|-----------------|-------|
| `APP_ENV` | `development` | Môi trường: `development` \| `production` |
| `APP_PORT` | `8000` | Port backend |
| `APP_HOST` | `0.0.0.0` | Host binding |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins (phân tách bằng `,`) |
| `LOG_LEVEL` | `INFO` | Mức log: `DEBUG` \| `INFO` \| `WARNING` \| `ERROR` |

### 🔍 LangSmith Tracing (tuỳ chọn)

| Biến | Mô tả |
|------|-------|
| `LANGCHAIN_API_KEY` | API key từ [smith.langchain.com](https://smith.langchain.com) |
| `LANGCHAIN_PROJECT` | Tên project trên LangSmith (ví dụ: `ai20k-agent`) |
| `LANGCHAIN_TRACING_V2` | `true` để bật tracing |

---

## 🗃️ Database Setup & Migration

### Tạo database mới

```bash
# Nếu dùng Docker PostgreSQL (đã khởi động)
docker exec -it p043_postgres psql -U postgres -c "CREATE DATABASE p043_db;"
```

### Chạy migration

```bash
# Áp dụng tất cả migration (tạo schema lần đầu)
alembic upgrade head

# Xem lịch sử migration
alembic history

# Rollback 1 version
alembic downgrade -1

# Tạo migration mới khi thay đổi models
alembic revision --autogenerate -m "add new table"
```

### Schema chính

| Bảng | Mô tả |
|------|-------|
| `users` | Tài khoản sinh viên |
| `chat_sessions` | Phiên hội thoại |
| `chat_messages` | Tin nhắn trong phiên |
| `courses` | Môn học sinh viên đăng ký |
| `assignments` | Bài tập / deadline |
| `weekly_plans` | Kế hoạch học tập theo tuần |
| `goals` | Mục tiêu học tập |
| `course_materials` | Tài liệu đính kèm môn học |

---

## 📡 API Reference

Base URL: `http://localhost:8000/api/v1`

> 📄 Xem Swagger UI đầy đủ tại: `http://localhost:8000/docs`

### 🔐 Authentication (`/auth`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/auth/register` | Đăng ký tài khoản mới |
| `POST` | `/auth/login` | Đăng nhập, nhận `access_token` + `refresh_token` |
| `POST` | `/auth/refresh` | Làm mới Access Token bằng Refresh Token |
| `POST` | `/auth/logout` | Đăng xuất, vô hiệu hóa token |

```bash
# Đăng nhập
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "student@example.com", "password": "securepassword"}'

# Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### 💬 Chat Agent (`/chat`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/chat/message` | Gửi tin nhắn đến Companion Agent |
| `GET` | `/chat/history/{session_id}` | Lấy lịch sử chat của session |

```bash
# Gửi tin nhắn đến AI
curl -X POST http://localhost:8000/api/v1/chat/message \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "uuid-session-id",
    "message": "Giải thích khái niệm đạo hàm riêng theo tài liệu tôi đã upload."
  }'
```

### 📚 Session Management (`/sessions`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/sessions` | Lấy danh sách tất cả phiên chat |
| `POST` | `/sessions` | Tạo phiên chat mới |
| `DELETE` | `/sessions/{session_id}` | Xóa phiên chat |

### 📖 Courses (`/courses`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/courses` | Danh sách môn học |
| `POST` | `/courses` | Thêm môn học mới |
| `GET` | `/courses/{id}` | Chi tiết môn học |
| `POST` | `/courses/{id}/materials` | Upload tài liệu cho môn học |

### 📅 Weekly Planner (`/weekly-plans`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/weekly-plans` | Lấy kế hoạch học tập hiện tại |
| `POST` | `/weekly-plans/generate` | Yêu cầu AI tạo kế hoạch tuần |
| `PUT` | `/weekly-plans/{id}` | Cập nhật / điều chỉnh kế hoạch |

### 📝 Assignments (`/assignments`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/assignments` | Danh sách bài tập / deadline |
| `POST` | `/assignments` | Thêm assignment mới |
| `PUT` | `/assignments/{id}` | Cập nhật trạng thái |

### 🎯 Goals (`/goals`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/goals` | Xem mục tiêu học tập |
| `POST` | `/goals` | Tạo mục tiêu mới |

### 🤖 Planner Agent (`/planner`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `POST` | `/planner/run` | Chạy Planner Agent để sinh/điều chỉnh kế hoạch |

### 🩺 System Health (`/system`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| `GET` | `/system/health` | Kiểm tra trạng thái Backend, DB, Redis |
| `GET` | `/health` | Health check nhanh (root level) |

```bash
curl http://localhost:8000/health
# {"status": "ok", "env": "development"}
```

---

## 💬 Sample Queries — Câu hỏi mẫu

Sau khi đăng nhập và tạo session, gửi các câu hỏi mẫu dưới đây để trải nghiệm hệ thống:

### 📅 Lập kế hoạch học tập

```
"Tạo cho tôi kế hoạch ôn tập môn Xác Suất Thống Kê trong 4 tuần tới,
mục tiêu đạt điểm A. Tôi có thể học 2 giờ mỗi ngày vào buổi tối."
```

```
"Lên lịch ôn thi cuối kỳ cho 3 môn: Giải Tích, Vật Lý và Lập Trình.
Kỳ thi bắt đầu từ ngày 15/01, tôi muốn hoàn thành ôn tập trước 3 ngày."
```

### 🔄 Dynamic Replanning

```
"Hôm nay tôi bận đột xuất từ 14h–18h, không học được. 
Hãy cập nhật lại lịch học tuần này giúp tôi mà không để dồn ứ bài."
```

```
"Tôi vừa hoàn thành Chương 3 sớm hơn 2 ngày so với kế hoạch.
Hãy điều chỉnh lịch để tôi bắt đầu Chương 4 sớm hơn."
```

### 📖 RAG — Hỏi đáp tài liệu

> *(Cần upload tài liệu qua `POST /courses/{id}/materials` trước)*

```
"Dựa trên slide bài giảng tôi đã upload, hãy giải thích
khái niệm Tứ phân vị (Quartile) và cách tính Q1, Q2, Q3."
```

```
"Trong tài liệu PDF môn Thống Kê, công thức tính
Độ lệch chuẩn (Standard Deviation) được trình bày như thế nào?"
```

### ✍️ Sinh câu hỏi ôn tập (Reflect & Review)

```
"Sinh cho tôi 10 câu hỏi trắc nghiệm A/B/C/D về Chương 2: Phân phối xác suất,
dựa trên slide bài giảng và kèm lời giải thích đáp án đúng."
```

```
"Tạo bộ flashcard 15 câu hỏi nhanh về các định nghĩa quan trọng
trong môn Giải Tích mà tôi có thể ôn trong 10 phút."
```

### 🧭 Tư vấn học tập

```
"Tôi đang gặp khó khăn với phần Tích phân bội. 
Hãy gợi ý cho tôi hướng tiếp cận học phần này hiệu quả nhất,
nhưng đừng giải bài tập hộ tôi."
```

---

## 🧪 Testing

### Chạy toàn bộ test suite

```bash
# Cách 1: Makefile
make test

# Cách 2: Trực tiếp
pytest tests/ -v

# Chạy với coverage report
pytest tests/ -v --cov=src --cov-report=html
# Xem report tại: htmlcov/index.html
```

### Chạy từng nhóm test

```bash
# Test API endpoints
pytest tests/test_api/ -v

# Test AI Agent (nodes, tools, graph)
pytest tests/test_agents/ -v

# Test database schema
pytest tests/test_db_schema.py -v

# Test một file cụ thể
pytest tests/test_api/test_auth.py -v
```

### Linting & Formatting

```bash
# Kiểm tra code style (Ruff)
make lint

# Auto-format code
make format

# Type checking (mypy)
make typecheck

# Chạy tất cả: lint + format + test
make check
```

---

## 📁 Project Structure

```
P-043/
├── 📄 README.md                    # File này
├── 📄 ARCHITECTURE.md              # Kiến trúc hệ thống
├── 📄 requirements.txt             # Python dependencies
├── 📄 Makefile                     # Shortcut commands
├── 📄 Dockerfile                   # Docker build backend
├── 📄 docker-compose.yml           # Toàn bộ stack
├── 📄 alembic.ini                  # Cấu hình DB migration
├── 📄 ruff.toml                    # Cấu hình linter/formatter
├── 📄 .env.example                 # Template biến môi trường
│
├── 📂 src/                         # 🧠 Backend source code
│   ├── main.py                     # FastAPI entry point
│   ├── config.py                   # Pydantic Settings (env vars)
│   ├── 📂 agents/                  # AI Agent Engine (LangGraph)
│   │   ├── companion_agent.py      # Companion Agent (chat + RAG)
│   │   ├── graph.py                # StateGraph definition
│   │   ├── state.py                # AgentState schema
│   │   ├── planner_graph.py        # Planner Agent graph
│   │   ├── planner_state.py        # Planner state schema
│   │   ├── 📂 nodes/
│   │   │   ├── rag_nodes.py        # RAG retrieval node
│   │   │   ├── planner_nodes.py    # Planning logic nodes
│   │   │   └── example_node.py     # Example node template
│   │   └── 📂 tools/
│   │       ├── planner_tools.py    # Planner tools (@tool)
│   │       └── example_tool.py     # Example tool template
│   ├── 📂 routers/                 # API Endpoints
│   │   ├── auth_router.py          # /auth/*
│   │   ├── chat_router.py          # /chat/*
│   │   ├── session_router.py       # /sessions/*
│   │   ├── course_router.py        # /courses/*
│   │   ├── assignment_router.py    # /assignments/*
│   │   ├── planner_router.py       # /planner/*
│   │   ├── goal_router.py          # /goals/*
│   │   ├── weekly_plan_router.py   # /weekly-plans/*
│   │   └── system_router.py        # /system/*
│   ├── 📂 services/                # Business Logic
│   │   ├── auth_service.py         # Auth business logic
│   │   ├── course_service.py       # Course management
│   │   ├── rag_service.py          # RAG + OCR pipeline ⭐
│   │   ├── weekly_plan_service.py  # Weekly planning logic
│   │   ├── assignment_service.py   # Assignment management
│   │   ├── planner_agent_service.py# Planner Agent service
│   │   ├── student_context_service.py # Context builder
│   │   ├── llm.py                  # LLM provider factory
│   │   ├── redis_service.py        # Redis cache service
│   │   ├── email_service.py        # Email sending
│   │   └── db_service.py           # DB utilities
│   ├── 📂 core/
│   │   └── security.py             # JWT + bcrypt auth
│   ├── 📂 db/                      # Database layer
│   │   ├── database.py             # AsyncEngine + SessionLocal
│   │   ├── base.py                 # DeclarativeBase
│   │   ├── enums.py                # DB Enums
│   │   └── 📂 models/              # SQLAlchemy models
│   │       ├── identity/           # User, Role, Permission
│   │       ├── chat/               # ChatSession, ChatMessage
│   │       ├── ai/                 # AgentConfig, PromptTemplate
│   │       └── knowledge/          # Course, Material, Plan
│   ├── 📂 models/                  # Pydantic schemas (DTOs)
│   │   ├── auth.py                 # Auth request/response
│   │   └── schemas.py              # General schemas
│   └── 📂 repositories/            # Repository pattern
│       └── user_repository.py      # User CRUD
│
├── 📂 frontend/                    # 🖥️ React / Next.js UI
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # App pages
│   │   ├── services/               # HTTP client (Axios)
│   │   ├── context/                # AuthContext, ChatContext
│   │   └── types/                  # TypeScript interfaces
│   └── public/                     # Static assets
│
├── 📂 alembic/                     # DB migration scripts
│   ├── env.py
│   └── versions/                   # Migration files
│
├── 📂 data/                        # Local data (dev)
│   ├── app.db                      # SQLite (dev fallback)
│   └── chroma/                     # ChromaDB vector store
│
├── 📂 tests/                       # Test suite
│   ├── conftest.py                 # Fixtures (mock DB, Redis)
│   ├── test_agents/                # Agent unit tests
│   ├── test_api/                   # API integration tests
│   └── test_db_schema.py           # DB schema tests
│
├── 📂 docs/                        # Documentation
│   └── architecture_diagram.md
│
└── 📂 scripts/                     # Automation scripts
    ├── setup_hooks.sh              # Git hooks (Linux/macOS)
    ├── setup_hooks.ps1             # Git hooks (Windows)
    └── log_antigravity.py          # AI usage logger
```

---

## 🤝 Contributing

1. Fork repository và tạo branch mới: `git checkout -b feature/ten-tinh-nang`
2. Viết code tuân thủ chuẩn Ruff: `make lint && make format`
3. Viết test cho tính năng mới: `pytest tests/ -v`
4. Commit theo chuẩn Conventional Commits: `git commit -m "feat: add weekly plan auto-replan"`
5. Tạo Pull Request vào branch `main`

### Conventional Commit Types

| Prefix | Mô tả |
|--------|-------|
| `feat:` | Thêm tính năng mới |
| `fix:` | Sửa lỗi |
| `docs:` | Cập nhật tài liệu |
| `refactor:` | Tái cấu trúc code |
| `test:` | Thêm / sửa test |
| `chore:` | Cập nhật config, dependencies |

---

## 📊 Deliverables Checklist (Gate G2)

- [x] **Source Code** — Hoàn thiện trên GitHub
- [x] **Repo PRs** — Đã merge ≥ 10 PRs (hiện tại: 23 PRs merged)
- [x] **README.md** — Setup, env vars, sample queries (file này)
- [x] **Architecture Diagram** — `docs/architecture_diagram.md`
- [x] **Eval Evidences** — `eval/results/report.md` (5 manual test cases)
- [ ] **MVP Video Demo** — Video 3 phút quay end-to-end user flow

---

## 📄 License

MIT License — VinUni AI20K Build Phase Cohort 3 — Team P-043

---

<div align="center">
  <sub>Built with ❤️ by Team P-043 — VinUni AI20K Build Phase · 2025</sub>
</div>
