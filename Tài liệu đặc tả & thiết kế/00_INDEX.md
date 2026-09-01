# TÀI LIỆU ĐẶC TẢ & THIẾT KẾ — LITA LEARNING (P-043)
> **Sản phẩm:** Lita Learning — AI Learning Companion  
---

## 1. Danh mục tài liệu & Nguồn gốc file trong dự án

| STT | Tên tài liệu trong thư mục này | Nguồn file gốc trong dự án | Nội dung chi tiết |
|:---:|--------------------------------|----------------------------|-------------------|
| **01** | `01_PAIN_POINTS.md` | `PAIN_POINT.md` & `README.md` (Mục 1.2) | Đặc tả bài toán: 3 nỗi đau cốt lõi của sinh viên và giải pháp công nghệ. |
| **02** | `02_FEATURE_SPEC.md` | `src/agents/planner_graph.py`, `src/services/rag_service.py`, `src/services/weekly_plan_service.py`, `src/agents/companion_agent.py` | Đặc tả chi tiết 3 tính năng cốt lõi: PLAN / LEARN / REFLECT (User Story, Luồng xử lý, DB, API). |
| **03** | `03_ARCHITECTURE_DIAGRAM.md` | `ARCHITECTURE_DIAGRAM.md` & `src/main.py` | Sơ đồ & thiết kế kiến trúc hệ thống 5 tầng, luồng 2 AI Agent độc lập, chi tiết thành phần & Design Decisions. |
| **04** | `04_RAG_AI_PIPELINE.md` | `RAG_Upgrade_Summary.md` & `src/services/rag_service.py` | Thiết kế & nâng cấp pipeline Multimodal RAG + Vision OCR + FlashRank Reranker. |
| **05** | `05_PROJECT_STRUCTURE.md` | `PROJECT_STRUCTURE.md` & Cấu trúc thực tế `src/`, `frontend/`, `tests/` | Mô tả cấu trúc thư mục & vai trò từng module trong hệ thống. |

---

## 2. Thông tin nhóm phát triển (Team P-043)

| STT | Họ và Tên | Mã Sinh Viên (MSSV) | Vai trò chính trong dự án | Phân công nhiệm vụ chi tiết |
|:---:|-----------|:-------------------:|---------------------------|-----------------------------|
| **1** | **Hoàng Duy Linh** | `2A202601159` | **Trưởng nhóm / Backend & AI Lead** | Phụ trách kiến trúc Backend (FastAPI, SQLAlchemy Async), triển khai hệ thống LangGraph AI Agents, xây dựng Multimodal RAG Pipeline (Gemini Vision OCR + Qdrant + FlashRank). |
| **2** | **Đặng Đức Hoà** | `2A202601351` | **BA, System Design & QA/Testing** | Phụ trách phân tích nghiệp vụ (BA), trực tiếp vẽ & thiết kế toàn bộ luồng sản phẩm (Product Flow), luồng kiến trúc AI Agent (Companion & Planner Agent Flow), xây dựng tài liệu đặc tả & thiết kế sản phẩm; trực tiếp kiểm thử sản phẩm (Testing/QA), phát hiện lỗi và phản hồi đội ngũ phát triển. |
| **3** | **Nguyễn Tuấn Anh** | `2A202601395` | **Frontend & UI/UX Lead** | Phụ trách phát triển toàn bộ giao diện Web SPA (React 18, Vite 5, Ant Design, Tailwind CSS), tích hợp API và tối ưu trải nghiệm tương tác với RAG/Chatbot, bộ tiêu chí đánh giá. |

---

## 3. Tóm tắt sản phẩm

**Lita Learning** là AI Learning Companion giúp sinh viên đại học lập kế hoạch, nắm chắc kiến thức trọng tâm và tự đánh giá hiệu quả qua 3 trụ cột:

```
[ PLAN ]                [ LEARN ]                  [ REFLECT ]
Dynamic Weekly          Multimodal RAG + OCR        Socratic AI Tutoring
Planning                Kiến thức trọng tâm         + Self-Evaluation
Tự động phân bổ         từ slide/tài liệu           Phản hồi cá nhân hóa
lịch học tuần           + AI bài tập luyện tập      sau mỗi buổi học
```

## 4. Stack công nghệ chính

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript + Ant Design + Tailwind CSS |
| Backend | FastAPI 0.115+ (Async) + Pydantic v2 |
| AI Agent | LangGraph StateGraph (Companion Agent + Planner Agent) |
| LLM | Groq (`gpt-oss-120b`, `llama-3.3-70b`) + Google Gemini Vision OCR |
| RAG | Qdrant Vector DB + `gemini-embedding-001` + FlashRank Reranker |
| Database | PostgreSQL 16 (asyncpg) + Async SQLAlchemy 2.0 |
| Cache | Redis 7 |
| Storage | Cloudflare R2 / MinIO (S3-compatible) |
| Email | Brevo REST API + Gmail SMTP fallback |
