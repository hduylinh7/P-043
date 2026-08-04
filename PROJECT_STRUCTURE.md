# 📁 BÁO CÁO PHÂN TÍCH TOÀN BỘ CẤU TRÚC DỰ ÁN (PROJECT STRUCTURE ANALYSIS)

## 📌 Tổng quan dự án
Dự án là một hệ thống **AI Agent System** hoàn chỉnh (thuộc dự án **VinUni AI20K Build Phase - Team P-043**), bao gồm các thành phần cốt lõi:
- **Backend:** FastAPI (Python 3.11+) xử lý RESTful APIs, xác thực JWT, quản lý phiên chat và kết nối cơ sở dữ liệu.
- **AI Agent Engine:** LangGraph + OpenAI (`gpt-4o-mini`), hỗ trợ StateGraph, nodes, custom tools và khả năng suy luận linh hoạt.
- **Cơ sở dữ liệu (Database):** PostgreSQL (Async SQLAlchemy 2.0 + Alembic migration) lưu trữ dữ liệu người dùng, phiên trò chuyện, phản hồi và cấu hình agent.
- **Bộ nhớ đệm (Cache):** Redis hỗ trợ caching phản hồi, rate limiting và lưu trữ session tạm thời.
- **Frontend:** React 18 / Next.js + TypeScript + Tailwind CSS cung cấp giao diện chat thời gian thực.
- **AI Usage Logging:** Hệ thống script tự động ghi log prompt AI tuân thủ quy định của BTC VinUni AI20K.

---

## 📂 Chi Tiết Từng Thư Mục & Vai Trò

### 1. ⚙️ Thư mục Cấu hình Tooling & AI Logging
- **`.agents/`**:
  - `rules/`: Chứa các quy tắc chuẩn khi phát triển dành cho AI coding assistant.
  - `workflows/`: Định nghĩa các quy trình công việc tự động (ví dụ: ghi log AI, kiểm thử, deployment).
- **`.ai-log/`**:
  - Nơi lưu trữ tập trung lịch sử các câu lệnh (prompt logs) được gọi qua các công cụ hỗ trợ lập trình AI (Cursor, Claude Code, Gemini CLI, Antigravity, Copilot...).
- **`.claude/`**, **`.codex/`**, **`.cursor/`**, **`.gemini/`**:
  - Các thư mục chứa file cấu hình riêng, hook hoặc setting cho từng công cụ AI IDE / Assistant tương ứng.
- **`.github/`**:
  - `workflows/`: Chứa các kịch bản CI/CD (GitHub Actions) để tự động hóa build, test và deploy.
  - `hooks/`: Chứa git hooks tự động gửi log prompt AI khi lập trình viên thực hiện `git push`.
- **`.venv/`**:
  - Môi trường ảo Python (Virtual Environment) local chứa tất cả các dependencies/gói thư viện đã cài đặt.

---

### 2. 🧠 Thư mục Mã Nguồn Backend (`src/`)
Thư mục trung tâm chứa toàn bộ mã nguồn phía server (FastAPI + LangGraph + SQLAlchemy + Redis).

- **`src/main.py`**:
  - Điểm khởi chạy ứng dụng FastAPI (Entry Point). Định nghĩa app, đăng ký CORS middleware, include các API routers và cấu hình startup/shutdown events.
- **`src/config.py`**:
  - Quản lý tập trung toàn bộ biến môi trường (Database URL, Redis URL, JWT Secret Key, API Keys, App Environment) bằng Pydantic `BaseSettings`.
- **`src/agents/`**: *Module quản lý AI Agent bằng LangGraph*
  - `graph.py`: Khởi tạo và compile StateGraph của Agent (kết nối giữa các Node và Edge).
  - `state.py`: Định nghĩa Pydantic/TypedDict schema quản lý trạng thái agent (`AgentState`).
  - `nodes/`: Chứa các hàm xử lý logic tại từng nút của đồ thị agent (ví dụ: node suy luận LLM, node gọi tool, node xử lý lỗi).
  - `tools/`: Chứa tập hợp các công cụ custom (`@tool`) cho phép Agent thực thi nhiệm vụ (truy vấn DB, tính toán, gọi API ngoài, v.v.).
- **`src/api/`**:
  - Chứa các endpoint API wrapper / phiên bản cũ, hỗ trợ tích hợp routing bổ sung.
- **`src/core/`**:
  - `security.py`: Chứa các hàm mã hóa mật khẩu (`bcrypt`), tạo và xác thực JWT token (AccessToken, RefreshToken), kiểm tra quyền người dùng.
- **`src/db/`**: *Tầng Quản lý Cơ sở dữ liệu (PostgreSQL)*
  - `database.py`: Cấu hình SQLAlchemy Async Engine (`asyncpg`), SessionLocal factory và dependency injection `get_db()`.
  - `base.py`: Đóng vai trò làm `DeclarativeBase` cha cho tất cả các SQLAlchemy Models.
  - `enums.py`: Định nghĩa các kiểu dữ liệu dạng Enum dùng trong DB (UserRole, SessionStatus, MessageType...).
  - `models/`: Chứa danh sách các bảng database được chia nhóm theo domain nghiệp vụ:
    - `identity/`: Bảng liên quan đến người dùng, vai trò, quyền (`User`, `Role`, `Permission`).
    - `chat/`: Bảng quản lý phiên hội thoại và tin nhắn (`ChatSession`, `ChatMessage`).
    - `ai/`: Bảng lưu trữ cấu hình model, prompt template, lịch sử agent (`AgentConfig`, `PromptTemplate`).
    - `integration/`, `knowledge/`, `learning/`, `planning/`, `reflection/`: Các bảng phục vụ tính năng mở rộng bộ nhớ dài hạn, lập kế hoạch và tự suy ngẫm của Agent.
- **`src/models/`**: *Pydantic Schemas (DTOs)*
  - `auth.py`: Pydantic models validate dữ liệu Đăng ký, Đăng nhập, Token Response, Password Reset.
  - `schemas.py`: Pydantic models validate các dữ liệu truyền nhận chung trong ứng dụng.
- **`src/repositories/`**: *Repository Pattern*
  - `user_repository.py`: Tách biệt tầng truy vấn dữ liệu trực tiếp với Database (CRUD User) giúp code sạch và dễ unit test.
- **`src/routers/`**: *Các API Endpoints của FastAPI*
  - `auth_router.py`: API Đăng ký (`/register`), Đăng nhập (`/login`), Refresh Token (`/refresh`), Đăng xuất (`/logout`).
  - `chat_router.py`: API tương tác gửi câu hỏi và nhận câu trả lời từ AI Agent.
  - `session_router.py`: API quản lý danh sách phiên hội thoại (tạo mới, xóa, lấy lịch sử session).
  - `system_router.py`: API Health Check (`/healthz`) kiểm tra trạng thái hoạt động của Server, Database, Redis.
- **`src/services/`**: *Tầng Nghiệp Vụ (Business Logic)*
  - `auth_service.py`: Xử lý nghiệp vụ xác thực người dùng phức tạp, kiểm tra tài khoản, quản lý session login.
  - `email_service.py`: Xử lý gửi email xác nhận / đặt lại mật khẩu.
  - `redis_service.py`: Quản lý kết nối và thao tác với Redis Cache (lưu đệm response, rate limit counter).
  - `db_service.py`: Hỗ trợ thao tác kết nối DB tổng quát.
  - `llm.py`: Khởi tạo đối tượng kết nối LLM (OpenAI ChatOpenAI).

---

### 3. 🎨 Thư mục Giao diện Người dùng (`frontend/`)
Ứng dụng Web Single-Page Application (SPA) xây dựng bằng React 18 / Next.js, Vite, TypeScript và Tailwind CSS.

- `frontend/src/main.tsx` & `App.tsx`: Điểm khởi tạo và router chính của ứng dụng React.
- `frontend/src/components/`: Các thành phần giao diện nhỏ tái sử dụng (ChatBox, MessageList, Sidebar, Header, LoadingSpinner).
- `frontend/src/pages/`: Các màn hình trang chính (Trang đăng nhập, Trang đăng ký, Màn hình Dashboard Chat chính).
- `frontend/src/services/`: HTTP Client (Axios/Fetch) dùng để gửi request tới FastAPI Backend endpoints.
- `frontend/src/context/`: Quản lý Trạng thái Toàn cục (Global State) như `AuthContext` (trạng thái đăng nhập người dùng) và `ChatContext`.
- `frontend/src/types/`: Khai báo các interface / type định nghĩa dữ liệu phía TypeScript.
- `frontend/public/`: Lưu trữ tài nguyên tĩnh (Images, Icons, Favicon).

---

### 4. 🗄️ Thư mục Database Migrations (`alembic/`)
- Quản lý việc theo dõi và thay đổi cấu trúc bảng cơ sở dữ liệu (Database Schema Version Control).
  - `env.py`: Cấu hình kết nối Alembic với SQLAlchemy Models trong `src/db/`.
  - `versions/`: Chứa danh sách các file script migration SQL được sinh tự động hoặc viết tay.

---

### 5. 📖 Thư mục Tài liệu & Hướng dẫn (`docs/`)
- `architecture_diagram.md`: Mô tả sơ đồ thiết kế hệ thống và luồng dữ liệu giữa các thành phần.
- `guide/`: Các bài viết hướng dẫn kỹ thuật chi tiết dành cho thành viên phát triển dự án.

---

### 6. 📊 Thư mục Đánh giá AI (`eval/`)
- `results/`: Nơi lưu trữ tập trung dữ liệu đánh giá (evaluation metrics, benchmark logs) nhằm đo lường hiệu năng và chất lượng phản hồi của AI Agent.

---

### 7. 🎤 Thư mục Thuyết trình (`presentation/`)
- `README.md`: Hướng dẫn chuẩn bị tài liệu, slide trình chiếu và sản phẩm cho Demo Day dự án.

---

### 8. 🛠️ Thư mục Scripts Tự động hóa (`scripts/`)
- Chứa toàn bộ các script hỗ trợ lập trình viên cài đặt môi trường và tuân thủ AI Usage Logging của BTC AI20K VinUni.
  - `setup_hooks.sh` & `setup_hooks.ps1`: Script cài đặt Git Hook tự động trên Linux/macOS và Windows.
  - `log_hook.py`: Hook ghi nhận prompt từ Claude Code, Cursor, Codex, Copilot.
  - `log_antigravity.py`: Scanner chuyên dụng quét log prompt của Google Antigravity IDE.
  - `log_manual.py`: Công cụ thủ công để lập trình viên tự ghi log prompt nếu dùng ChatGPT web.
  - `submit_log.py`: Tự động đẩy dữ liệu log lên server của BTC khi `git push`.

---

### 9. 🧪 Thư mục Kiểm thử Tự động (`tests/`)
- Chứa toàn bộ bộ kiểm thử tự động (Unit test và Integration test) chạy bằng `pytest`.
  - `conftest.py`: Khai báo các test fixtures (mock DB session, test client, mock Redis).
  - `test_agents/`: Kiểm thử các nút (nodes), công cụ (tools) và đồ thị (graph) của LangGraph Agent.
  - `test_api/`: Kiểm thử các endpoint API của FastAPI (Auth, Chat, Session, System).
  - `test_db_schema.py`: Kiểm thử tính hợp lệ của cơ sở dữ liệu và mã nguồn SQLAlchemy models.

---

### 10. 📄 Các File Cấu Hình & Tài liệu Gốc (Root Level Files)
- `ARCHITECTURE.md`: Tài liệu tổng quan kiến trúc hệ thống bằng Tiếng Việt.
- `README.md`: Tài liệu giới thiệu dự án, hướng dẫn cài đặt và các bước phát triển nhanh.
- `Dockerfile` & `docker-compose.yml`: File đóng gói container Docker cho Backend, Frontend, Postgres, Redis.
- `Makefile`: Định nghĩa các phím tắt lệnh (`make run`, `make test`, `make lint`, `make migrate`).
- `requirements.txt`: Khai báo danh sách các thư viện Python dự án phụ thuộc.
- `alembic.ini`: File cấu hình chung cho công cụ quản lý DB Alembic.
- `ruff.toml`: Định nghĩa quy chuẩn viết code Python (linter & formatter Ruff).
- `.env` & `.env.example`: Lưu trữ cấu hình biến môi trường bảo mật.
