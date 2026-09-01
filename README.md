# LITA LEARNING — AI20K Companion (P-043)

## TRỢ LÝ HỌC TẬP THÔNG MINH CHO SINH VIÊN

> **Lita Learning** là hệ thống trợ lý AI Agent thông minh kết hợp **LangGraph Multi-Agent Engine + Dynamic Planning + Multimodal RAG (Groq LLM · Gemini Vision OCR · FlashRank Re-ranking · Qdrant Vector Store)** giúp sinh viên tự động hóa lập kế hoạch học tập, hỗ trợ hỏi đáp tài liệu bám sát chuẩn mực liêm chính học thuật trong quá trình ôn tập. Ôn tập chủ động với kiến thức trọng tâm, câu hỏi ôn tập được thiết lập tự động.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2+-1C3C3C?logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)](https://redis.io)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-DC2626?logo=qdrant&logoColor=white)](https://qdrant.tech)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Mục lục

1. [Bài toán — Problem Definition](#1-bài-toán--problem-definition)
2. [Giải pháp — Technical Solution](#2-giải-pháp--technical-solution)
3. [Kiến trúc hệ thống](#3-kiến-trúc-hệ-thống)
4. [Các thành phần AI cốt lõi](#4-các-thành-phần-ai-cốt-lõi)
5. [Multimodal RAG, FlashRank & Vision OCR](#5-multimodal-rag-flashrank--vision-ocr)
6. [Academic Integrity & Socratic Tutoring](#6-academic-integrity--socratic-tutoring)
7. [Tech Stack thực tế](#7-tech-stack-thực-tế)
8. [Tính khả thi — Feasibility](#8-tính-khả-thi--feasibility)
9. [Quick Start](#9-quick-start)
10. [Environment Variables](#10-environment-variables)
11. [Database Setup & Migration](#11-database-setup--migration)
12. [API Reference & Sample Queries](#12-api-reference--sample-queries)
13. [Testing & Evaluation](#13-testing--evaluation)
14. [Project Structure](#14-project-structure)
15. [Lộ trình phát triển (Roadmap)](#15-lộ-trình-phát-triển-roadmap)
16. [Deliverables Checklist (Gate G2)](#16-deliverables-checklist-gate-g2)
17. [Thông tin nhóm phát triển (Team Members)](#17-thông-tin-nhóm-phát-triển-team-members)

---

# 1. BÀI TOÁN — PROBLEM DEFINITION

## 1.1. Bối cảnh thực tế

Trong môi trường đại học, sinh viên phải đồng thời xử lý khối lượng kiến thức lớn, nhiều môn học, bài tập thực hành và deadline liên tục rải rác. Phần lớn sinh viên vẫn gặp khó khăn trong 3 giai đoạn của quá trình học:

1. **Trước khi học (Lập kế hoạch):** Bối rối, không biết sắp xếp thời gian khi đối mặt với nhiều bài tập và deadline rải rác.
2. **Trong khi học (Nắm bắt kiến thức):** Hoang mang trước hàng trăm trang slide, tài liệu, không biết đâu là kiến thức trọng tâm và dễ lạm dụng AI để chép bài.
3. **Sau khi học (Đúc kết & Ôn tập):** Nộp bài xong là chuyển sang việc khác ngay, lướt qua luôn mà không nhìn nhận lại điểm mạnh, điểm yếu hay đúc kết bài học.

**Lita Learning** được xây dựng nhằm biến AI từ công cụ thụ động "hỏi — đáp" thành một **trợ lý học tập đồng hành chủ động**, giải quyết trọn vẹn 3 giai đoạn: **Lập kế hoạch (PLAN) → Học tập đúng trọng tâm (LEARN) → Tự đánh giá & Ôn tập (REFLECT)**.

---

## 1.2. Ba nỗi đau cốt lõi của sinh viên ("Nỗi đau ai thấu")

| STT | Nỗi đau thực tế | Vấn đề cụ thể | Hậu quả | Giải pháp của Lita Learning |
|:---:|-----------------|---------------|---------|-----------------------------|
| **01** | **Bối rối trong việc lập kế hoạch với nhiều bài tập & deadline rải rác** | Không có thói quen lên lịch sớm; khi tự lên lịch thì chia thời gian cảm tính, dễ vỡ kế hoạch khi bận đột xuất. | **"Nước đến chân mới nhảy"**, thức đêm dồn bài trước kỳ thi, stress và kết quả kém. | **Dynamic Weekly Planning:** AI tự động phân bổ lịch học tuần thông minh dựa trên hạn bài tập, deadline, lịch học cố định, thời gian rảnh. |
| **02** | **Hoang mang không biết đâu là kiến thức trọng tâm khi làm bài** | Slide, giáo trình PDF, file Excel bài tập và sơ đồ đồ sộ; sinh viên không biết trọng tâm ở đâu nên dễ ỷ lại, nhờ AI giải bài hộ. | **"Lạm dụng AI quá mức"**, chép lời giải máy móc, vi phạm liêm chính học thuật và mất gốc tư duy. | **Kiến Thức Trọng Tâm & Bài Tập Ôn Luyện (RAG + Vision OCR):** Trích xuất tóm tắt kiến thức cốt lõi từ slide tài liệu và tự động tạo bài tập luyện tập để sinh viên ôn tập vững vàng trước khi làm bài tập thật do giáo viên giao. |
| **03** | **Học xong nộp bài là bỏ qua, không nhìn nhận lại điểm yếu** | Sau khi hoàn thành một buổi học/bài tập, sinh viên thường lướt qua luôn sang việc khác, không bao giờ nhìn nhận lại điểm mạnh, điểm yếu hay đúc kết bài học. | **"Nhanh quên, học vẹt"**, không biết mình hổng kiến thức ở đâu, dẫn đến việc lặp lại sai lầm trong các bài thi sau này. | **Study Session Reflection & AI Analysis:** Sinh viên tự đánh giá phản hồi 1 phút sau buổi học; AI lập tức nhận xét 2 chiều (Điểm sáng, Cần lưu ý, Gợi ý tiếp theo) và sinh viên có thể kết nối ngay Socratic Tutor để ôn tập kiến thức nếu muốn. |

---

## 1.3. Đối tượng sử dụng mục tiêu (Target User)

* **Primary User (Người dùng chính):** Sinh viên đại học (đặc biệt khối ngành Kỹ thuật, Công nghệ thông tin, Kinh tế, Khoa học dữ liệu) đối mặt với khối lượng tài liệu, slide đồ sộ, nhiều môn học cùng lúc và deadline dày đặc.
* **Secondary User (Người dùng phụ):** Giảng viên, Trợ giảng mong muốn sinh viên chủ động nắm bắt kiến thức trọng tâm từ slide tài liệu và tự giác rèn luyện tư duy mà không ỷ lại vào việc chép lời giải AI.

---

# 2. GIẢI PHÁP — TECHNICAL SOLUTION

## 2.1. Ba trụ cột năng lực cốt lõi

```
  ┌─────────────────────────────────────────────────────────────┐
  │                        LITA LEARNING                        │
  └──────────────────────────────┬──────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
   [ 01 — PLAN ]           [ 02 — LEARN ]          [ 03 — REFLECT ]
  Dynamic Weekly Planning     Multimodal RAG + OCR    Socratic AI Tutoring
  Tự động phân bổ kế hoạch  Hỏi đáp bám sát slide,  Định hướng tư duy &
     (Dynamic Replanning)  công thức & sơ đồ toán  Reflect & Review ôn tập

```

1. **PLAN (Lập kế hoạch động):** Phân tích danh sách bài tập, deadline, độ ưu tiên và thời gian rảnh, lịch học cố định trên giảng đường để tự động sinh kế hoạch học tập.

2. **LEARN (Học trọng tâm & Ôn luyện chuẩn bị):** Mỗi buổi học trong kế hoạch tuần chính là một phiên "Ôn tập chuẩn bị cho bài tập thật của giáo viên". Sinh viên xem **Kiến thức trọng tâm (Khái niệm cốt lõi, công thức, sơ đồ trích xuất từ slide tài liệu)**, sau đó vào **Workspace làm bài tập luyện tập do AI Agent tạo** để rèn luyện trước khi bắt tay làm bài tập chính thức.

3. **REFLECT (Tự đánh giá & Phản hồi 2 chiều):** Sau mỗi buổi học, sinh viên dành 1 phút tự nhìn nhận bản thân; AI lập tức phân tích đưa ra nhận xét cá nhân hóa (Điểm sáng — Cần lưu ý — Gợi ý tiếp theo) và mở phiên trao đổi với Socratic Tutor để giải đáp ngay các vướng mắc còn tồn đọng.

---

# 3. KIẾN TRÚC HỆ THỐNG

## 3.1. Sơ đồ Kiến trúc Tổng quát

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
║  │  ┌──────────────┐ ┌────────────────────┐ ┌────────────────────────┐ │     ║
║  │  │ Groq API     │ │ Google Gemini       │ │ OpenRouter /           │ │     ║
║  │  │ gpt-oss-120b │ │ gemini-2.5-flash   │ │ OpenAI fallback        │ │     ║
║  │  │ llama-3.3-70b│ │ (Vision OCR/Chat)  │ │                        │ │     ║
║  │  └──────────────┘ └────────────────────┘ └────────────────────────┘ │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
║                                                                              ║
║  ┌─────────────────────────────────────────────────────────────────────┐     ║
║  │  RAG Service — src/services/rag_service.py                          │     ║
║  │                                                                     │     ║
║  │  Upload Tài liệu ──► Gemini Vision OCR (PPTX/DOCX/IMG/LaTeX)       │     ║
║  │       ──► Chunking (RecursiveCharacterTextSplitter)                 │     ║
║  │       ──► ResilientEmbeddings (gemini-embedding-001, SHA-256 fallbk)│     ║
║  │       ──► Qdrant Vector DB upsert (collection: course_materials)    │     ║
║  │       ──► Query: vector search ──► FlashRank Reranker               │     ║
║  │              (ms-marco-TinyBERT-L-2-v2)                             │     ║
║  └─────────────────────────────────────────────────────────────────────┘     ║
╚══════════════════════════════════════════════════════════════════════════════╝
                               │
                               ▼
╔══════════════════════════════════════════════════════════════════════════════╗
║                       PERSISTENCE & STORAGE LAYER                           ║
║                                                                              ║
║  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐    ║
║  │  PostgreSQL 16  │  │  Redis 7         │  │  Qdrant Vector Database  │    ║
║  │  (asyncpg)      │  │  OTP Cache       │  │  course_materials        │    ║
║  │                 │  │  Session Cache   │  │  3072-dim embeddings     │    ║
║  │  identity/      │  │  Reminder Queue  │  └──────────────────────────┘    ║
║  │  learning/      │  └──────────────────┘                                  ║
║  │  planning/      │  ┌──────────────────────────────────────────────────┐  ║
║  │  reflection/    │  │  Cloudflare R2 / MinIO (Object Storage — boto3)  │  ║
║  │  ai/ chat/      │  │  Course Materials Files (PDF, PPTX, DOCX, XLSX)  │  ║
║  │  knowledge/     │  └──────────────────────────────────────────────────┘  ║
║  └─────────────────┘                                                         ║
║                       ┌──────────────────────────────┐                      ║
║                       │  Email: Brevo REST API        │                      ║
║                       │  (HTTPS:443) / Gmail SMTP     │                      ║
║                       │  OTP · Password Reset · Notif │                      ║
║                       └──────────────────────────────┘                      ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

## 3.2. Luồng xử lý hai Agent AI chính

```text
┌────────────────────────────────────┐  ┌────────────────────────────────────┐
│  COMPANION AGENT (Chat & RAG)      │  │  PLANNER AGENT (Scheduling)        │
│  src/agents/graph.py               │  │  src/agents/planner_graph.py        │
│                                    │  │                                    │
│  POST /api/v1/chat                 │  │  POST /api/v1/planner/run           │
│         │                          │  │         │                          │
│         ▼                          │  │         ▼                          │
│  [Intent Classifier]               │  │  [load_context]                    │
│  Phân loại: assignment /           │  │  PlannerContextBuilder:            │
│  course / goal / schedule /        │  │  - Danh sách bài tập & deadline    │
│  general / greeting / score        │  │  - Lịch học cố định (CourseSchedule│
│         │                          │  │  - Weekly plan & tasks hiện tại    │
│         ▼                          │  │  - Goals học tập cá nhân           │
│  [retrieve_context]                │  │         │                          │
│  StudentLearningContextService:    │  │         ▼                          │
│  - Courses, Assignments, Goals     │  │  [analyze_and_decide]              │
│  - Weekly Plan, Active Session     │  │  LLM phân tích câu lệnh ngôn ngữ   │
│  + Qdrant RAG (nếu hỏi nội dung   │  │  tự nhiên: thứ / giờ / môn học     │
│    slide / công thức / khái niệm)  │  │         │                          │
│         │                          │  │         ▼                          │
│         ▼                          │  │  [execute_planner_tools]           │
│  [generate_rag_response]           │  │  PlannerTools: create/update/      │
│  Groq LLM + Socratic Guardrail:    │  │  delete task + conflict_check      │
│  - Hỏi đáp bám sát slide/tài liệu │  │  (tránh trùng lịch giảng đường)    │
│  - Từ chối giải bài hộ sinh viên   │  │         │                          │
│  - Gợi mở tư duy Socratic          │  │         ▼                          │
│  - Nhận xét Reflection buổi học    │  │  [generate_summary]                │
│         │                          │  │  Tổng hợp & trả kết quả cho SV     │
│         ▼                          │  │                                    │
│  Stream SSE Response               │  │  auto_apply=True: persist DB       │
│  (streaming=True)                  │  │  auto_apply=False: preview only    │
└────────────────────────────────────┘  └────────────────────────────────────┘
```

---

# 4. CÁC THÀNH PHẦN AI CỐT LÕI

## 4.1. Lita Dynamic Planning Engine

### Phân bổ thời gian thông minh
Hệ thống tự động phân tích:
* Số lượng bài tập và thời hạn nộp bài (due date).
* Mục tiêu học tập cá nhân (GPA, điểm A, hoàn thành môn).
* Ước tính số giờ cần thiết cho từng chủ đề / assignment.
* Lịch rảnh trong tuần của sinh viên.

Từ đó, hệ thống ưu tiên phân bổ thời gian cho các bài tập gấp và môn học khó, thay vì chia thời gian một cách cảm tính.

### Thuật toán Dynamic Replanning (Tránh hiệu ứng Domino)

```text
Kế hoạch học tập ban đầu
        │
        ▼
Thứ 2 ──► Ôn tập Chương 1 (2h)
Thứ 3 ──► Ôn tập Chương 2 (2h) ──► (Sinh viên bận đột xuất / nghỉ học)
Thứ 4 ──► Làm Assignment 1 (3h)
Thứ 5 ──► Ôn tập Chương 3 (2h)
        │
        │ Kích hoạt Dynamic Replanning
        ▼
Tính toán lại khối lượng bài tập & Deadline
        │
        ├──► Tự động dời nội dung Chương 2 sang slot trống Thứ 4 / Thứ 5
        ├──► Cân đối lại thời lượng học mà không làm quá tải sinh viên
        └──► Đảm bảo hoàn thành đúng hạn trước kỳ thi / deadline
```

---

# 5. MULTIMODAL RAG, FLASHRANK & VISION OCR

## 5.1. Quy trình xử lý tài liệu tài liệu (RAG Pipeline)

```text
Sinh viên tải lên tài liệu
          │
          ▼
┌──────────────────────────────────┐
│  Định dạng: PDF / PPTX / DOCX /  │
│  XLSX / CSV / JPG / PNG / WEBP   │
└─────────────────┬────────────────┘
                  ▼
┌──────────────────────────────────┐
│  Trích xuất văn bản & Hình ảnh   │
│  - PPTX: Sắp xếp slide tự nhiên  │
│  - XLSX/CSV: Markdown Table      │
│  - Image/Slide: Gemini Vision OCR│
└─────────────────┬────────────────┘
                  ▼
┌──────────────────────────────────┐
│  Chuẩn hoá nội dung & Chunking   │
│  (RecursiveCharacterTextSplitter)│
└─────────────────┬────────────────┘
                  ▼
┌──────────────────────────────────┐
│  Vector Embeddings (3072-dim)    │
│  Google Gemini / Hash Fallback   │
└─────────────────┬────────────────┘
                  ▼
┌──────────────────────────────────┐
│  Qdrant Cloud / Local Vector DB  │
│  (Collection: course_materials)  │
└─────────────────┬────────────────┘
                  ▼
┌──────────────────────────────────┐
│  FlashRank Cross-Encoder         │
│  (ms-marco-TinyBERT-L-2-v2)      │
│  Tái xếp hạng Top-K kết quả RAG  │
└──────────────────────────────────┘
```

## 5.2. Khả năng đọc hiểu đa định dạng thực tế

* **PowerPoint (`.pptx`):** Tự động bóc tách slide theo thứ tự số tự nhiên (`slide1 → slide2 → ... → slide10`), đọc chữ và bóc tách toàn bộ hình ảnh đính kèm trong slide.
* **Word (`.docx`):** Bóc tách đoạn văn bản kết hợp trích xuất các hình ảnh đồ thị/sơ đồ nhúng trong file.
* **Excel / CSV (`.xlsx`, `.csv`):** Đọc cấu trúc bảng và chuyển đổi thành **Markdown Table**, giúp LLM phân tích chính xác số liệu hàng/cột.
* **Hình ảnh & Sơ đồ (`.png`, `.jpg`, `.webp`):** Sử dụng Gemini Vision OCR nhận diện văn bản tiếng Việt/Anh, ký hiệu toán học và chuyển đổi thành mã công thức **LaTeX** ($Q_1, Q_2, \sigma, \mu, \int$).

## 5.3. Trải nghiệm Học trọng tâm & Ôn luyện trước khi làm bài thật

Các buổi học trong kế hoạch của Lita được thiết kế nhằm **"Ôn tập chuẩn bị cho bài tập thật của giáo viên giao"** theo quy trình khép kín:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Chi tiết Buổi học & Mục tiêu (Learning Objectives)       │
│ - Tên buổi học: "Ôn tập chuẩn bị cho: [Tên bài tập thật]"  │
│ - Xác định rõ 3 mục tiêu bài học cần hoàn thành             │
│ - Nút chọn: [Kiến Thức Trọng Tâm] hoặc [Vào Bài Học]       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Đọc Kiến Thức Trọng Tâm (Trích xuất từ Slide RAG)        │
│ - Tóm tắt điểm cần đặc biệt chú ý trong bài                 │
│ - Danh sách Khái niệm cốt lõi (Định nghĩa, Đặc điểm, Ví dụ) │
│ - Nút "Hỏi nhanh về khái niệm này" kết nối Socratic Tutor   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Sau khi nắm vững lý thuyết
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Vào Bài Học (Workspace) — Làm bài do AI Agent tạo        │
│ - Thực hành các bài tập luyện tập do AI sinh ra dựa trên   │
│   slide tài liệu và bài tập của giáo viên                   │
│ - Củng cố kỹ năng & tự tin 100% trước khi làm bài nộp thật  │
└─────────────────────────────────────────────────────────────┘
```

---

# 6. ACADEMIC INTEGRITY & SOCRATIC TUTORING

## 6.1. Phương pháp hướng dẫn Socratic

Lita được thiết lập luật bảo vệ đạo đức học thuật nghiêm ngặt trong hệ thống prompt và cơ sở dữ liệu (`AcademicIntegrityLog`):

```text
Sinh viên gửi câu hỏi bài tập
               │
               ▼
AI kiểm tra ý định (Intent Classifier)
               │
   ┌───────────┴───────────┐
   ▼                       ▼
Sinh viên hỏi kiến thức    Sinh viên yêu cầu "giải hộ / cho đáp án"
   │                       │
   ▼                       ▼
Truy xuất ngữ cảnh RAG     Từ chối giải bài trực tiếp
   │                       │
   ▼                       ▼
Giải thích bản chất &      Đưa ra gợi ý bước 1, đặt câu hỏi
cung cấp ví dụ tương tự    gợi mở để sinh viên tự tìm ra đáp án
```

## 6.2. Study Session Reflection & AI Analysis (Quy trình tự đánh giá & phản hồi 2 chiều)

Sau khi hoàn thành một buổi học hoặc bài tập, hệ thống kích hoạt quy trình phản hồi khép kín 3 bước:

```text
┌─────────────────────────────────────────────────────────────┐
│ Bước 1: Sinh viên tự đánh giá phản hồi (Self-Reflection)    │
│ - Hôm nay đã học/nắm được nội dung gì chính?                │
│ - Phần nào hiểu rõ và tự tin nhất? (Điểm mạnh)              │
│ - Phần nào còn vướng mắc hoặc cần ôn thêm? (Điểm yếu)       │
│ - Mức độ hiểu bài & Đạt mục tiêu buổi học (Dropdown chọn)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ Lưu phản hồi
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 2: AI phân tích & Nhận xét tổng quan (AI Analysis)     │
│   Nhận xét tổng quan: Đánh giá độ sâu kiến thức buổi học     │
│   Điểm sáng / Hiểu tốt: Ghi nhận khái niệm đã nắm vững      │
│   Cần lưu ý / Ôn tập thêm: Chỉ rõ phần kỹ năng cần rèn       │
│   Gợi ý tiếp theo: Hành động cụ thể cần làm buổi tới         │
└──────────────────────────────┬──────────────────────────────┘
                               │ 1-Click "Trao đổi với Socratic Tutor"
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ Bước 3: Trao đổi sâu với Socratic Tutor (Bù đắp lỗ hổng)   │
│ - Tự động nạp context từ nhận xét của AI vào phiên chat     │
│ - Socratic Tutor gợi mở chiến thuật ôn tập & giải thích lý  │
│   thuyết, không đưa đáp án trực tiếp                        │
└─────────────────────────────────────────────────────────────┘
```

---

# 7. TECH STACK THỰC TẾ

Toàn bộ công nghệ dưới đây đều **đã được cài đặt, tích hợp code thực tế** trong kho mã nguồn:

| Tầng hệ thống | Công nghệ sử dụng | Vai trò & Đặc điểm |
|---|---|---|
| **Frontend** | React 18, Vite 5, TypeScript | Single Page App (SPA), Ant Design, Tailwind CSS, Framer Motion |
| **Backend API** | FastAPI 0.115+, Async SQLAlchemy 2.0 | REST API bất đồng bộ (async/await), Pydantic v2 validation |
| **AI Agent Engine** | LangGraph ≥ 0.2, LangChain ≥ 0.3 | StateGraph, Agent Memory, Tool Execution, Intent Routing |
| **LLM Inference** | Groq API (`openai/gpt-oss-120b`, `llama-3.3-70b`) | Tốc độ xử lý siêu tốc ~300 tokens/s, tối ưu chi phí |
| **LLM Providers phụ** | OpenRouter, Google Gemini (`gemini-2.5-flash`), OpenAI | Hỗ trợ chuyển đổi đa nhà cung cấp linh hoạt qua config |
| **Vision OCR** | Google Gemini Vision API | Nhận diện chữ, sơ đồ, công thức toán LaTeX từ ảnh/slide |
| **Embedding** | Google `gemini-embedding-001` / `gemini-embedding-2` | 3072 chiều, bọc qua `ResilientEmbeddings` (SHA-256 fallback) |
| **Reranker** | FlashRank (`ms-marco-TinyBERT-L-2-v2`) | Cross-Encoder re-ranking tăng độ chuẩn xác truy xuất RAG |
| **Vector Database** | Qdrant Vector Database (Cloud / Local) | Lưu trữ và tìm kiếm vector tài liệu môn học (`course_materials`) |
| **Primary Database** | PostgreSQL 16 (hỗ trợ SQLite cho dev) | Quản lý người dùng, môn học, bài tập, kế hoạch tuần, phiên chat |
| **Cache & State** | Redis 7 | Quản lý OTP, JWT Token Rotation, Session state, Cache |
| **Object Storage** | Cloudflare R2 / MinIO (S3-compatible) | Lưu trữ file slide, PDF bài giảng, hình ảnh đính kèm |
| **Email Service** | Brevo REST API (HTTPS 443) / Gmail SMTP | Gửi email xác thực tài khoản OTP & thông báo deadline |
| **Container & CI** | Docker, docker-compose, Alembic, Ruff | Đóng gói môi trường chạy, migration DB và chuẩn hoá mã nguồn |

---

# 8. TÍNH KHẢ THI — FEASIBILITY

* **Khả thi về Kỹ thuật (Technical Feasibility):** Sử dụng các tiêu chuẩn công nghệ hiện đại (FastAPI, LangGraph, Qdrant, React Vite), các tầng được module hóa rõ ràng thông qua Repository & Service Pattern.
* **Khả thi về Kinh tế (Economic Feasibility):** Tối ưu hóa chi phí token thông qua Groq API giá rẻ, kết hợp Redis caching và FlashRank Reranker giúp giảm thiểu tối đa số lượng token thừa gửi tới LLM.
* **Khả thi về Trải nghiệm (UX Feasibility):** Tính năng **Dynamic Replanning** giải quyết triệt để sự thất vọng của sinh viên khi bị vỡ kế hoạch học tập cá nhân.

---

# 9. QUICK START

### Yêu cầu hệ thống
* Python 3.11+
* Node.js 18+ (khuyên dùng Node 20+)
* Docker & Docker Compose v2.20+
* Git

---

### Option A — Chạy local (Development)

#### 1. Clone mã nguồn & Cài đặt môi trường Python
```bash
git clone https://github.com/AI20K-Build-Phase-Cohort-3/P-043.git
cd P-043

# Tạo và kích hoạt virtualenv
python -m venv .venv
# Windows:
.\.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Cài đặt thư viện
pip install -r requirements.txt
```

#### 2. Cấu hình biến môi trường
```bash
cp .env.example .env
# Mở .env và điền GROQ_API_KEY, GEMINI_API_KEY, JWT_SECRET_KEY
```

#### 3. Khởi chạy PostgreSQL & Redis (Docker)
```bash
docker compose up postgres redis -d
```

#### 4. Chạy Database Migration
```bash
alembic upgrade head
```

#### 5. Chạy Backend
```bash
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```
* Backend API: `http://localhost:8000`
* Swagger UI Docs: `http://localhost:8000/docs`

#### 6. Chạy Frontend (Vite)
```bash
cd frontend
npm install
npm run dev
```
* Frontend Web UI: `http://localhost:3000` (hoặc `http://localhost:5173`)

---

### Option B — Docker Compose (Toàn bộ stack)

```bash
# 1. Cấu hình .env
cp .env.example .env

# 2. Khởi chạy tất cả containers
docker compose up --build -d

# 3. Theo dõi log backend
docker compose logs -f backend
```

---

# 10. ENVIRONMENT VARIABLES

Cấu hình mẫu tối ưu trong file `.env`:

```env
# ---- App Configuration ----
APP_ENV=development
APP_PORT=8000
APP_HOST=0.0.0.0
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
LOG_LEVEL=INFO

# ---- LLM & Embeddings ----
LLM_PROVIDER=groq
MODEL_NAME=openai/gpt-oss-120b
GROQ_API_KEY=gsk_your_groq_key_here
GEMINI_API_KEY=your_gemini_api_key_here
EMBEDDING_MODEL_NAME=models/gemini-embedding-001
ENABLE_RERANKER=True
RERANKER_MODEL_NAME=ms-marco-TinyBERT-L-2-v2

# ---- Database & Cache ----
DATABASE_URL=postgresql+asyncpg://postgres:postgrespassword@localhost:5432/p043_db
REDIS_URL=redis://localhost:6379/0

# ---- Vector Store (Qdrant) ----
VECTOR_STORE_TYPE=qdrant
QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
QDRANT_COLLECTION_NAME=course_materials

# ---- JWT Authentication & Google OAuth ----
JWT_SECRET_KEY=supersecretjwtkeychangeinproduction1234567890
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
RESET_TOKEN_EXPIRE_SECONDS=3600
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
INSTRUCTOR_INVITE_CODE=VINUNI-2026-AI

# ---- Email (Brevo REST API / SMTP) ----
BREVO_API_KEY=your_brevo_api_key_here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=noreply@ailearningcompanion.com
SMTP_TLS=true

# ---- Object Storage (Cloudflare R2 / MinIO) ----
STORAGE_PROVIDER=r2
S3_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
S3_BUCKET=project-materials
S3_ACCESS_KEY=your_s3_access_key
S3_SECRET_KEY=your_s3_secret_key
S3_REGION=auto
MAX_UPLOAD_SIZE_MB=50

# ---- AI Logging Hooks ----
AI_LOG_SERVER=https://ai-logs.note.transformerlabs.ai/api/ingest
AI_LOG_API_KEY=your_ai_log_api_key
AI_LOG_DIR=.ai-log
```

---

# 11. DATABASE SETUP & MIGRATION

Hệ thống sử dụng **Alembic** để quản lý phiên bản database schema bất đồng bộ:

```bash
# Áp dụng tất cả migrations
alembic upgrade head

# Xem lịch sử migrations
alembic history

# Tạo revision migration tự động khi cập nhật SQLAlchemy models
alembic revision --autogenerate -m "add_new_feature"
```

### Các nhóm bảng (SQLAlchemy Models)
* **Identity:** `users`, `roles`, `user_roles`, `anonymous_profiles`.
* **Learning:** `courses`, `course_materials`, `course_schedules`, `enrollments`, `assignments`, `assignment_checklists`, `submissions`, `student_assignment_progress`, `student_checklist_progress`.
* **Planning:** `weekly_plans`, `goals`, `weekly_goals`, `tasks`, `notifications`.
* **Chat & AI:** `chat_sessions`, `chat_messages`, `agent_memories`, `ai_logs`, `academic_integrity_logs`.
* **Reflection & Knowledge:** `reflection_sessions`, `reflection_messages`, `documents`, `document_chunks`.

---

# 12. API REFERENCE & SAMPLE QUERIES

## 12.1. Danh mục API Endpoints (`/api/v1`)

* **Authentication (`/auth`):**
  * `POST /auth/register` — Đăng ký tài khoản mới (gửi OTP 6 số).
  * `POST /auth/verify-email` — Xác thực email bằng mã OTP.
  * `POST /auth/login` — Đăng nhập nhận Access + Refresh Token.
  * `POST /auth/google` — Đăng nhập qua Google OAuth.
  * `POST /auth/refresh` — Làm mới token với cơ chế xoay vòng trên Redis.
  * `POST /auth/forgot-password`, `/verify-reset-code`, `/reset-password` — Khôi phục mật khẩu.
  * `POST /auth/assign-role` — Gán quyền Sinh viên / Giảng viên (kèm mã mời).
* **AI Companion Chat (`/chat` & `/sessions`):**
  * `POST /chat/message` — Gửi tin nhắn hỏi đáp AI (tích hợp RAG, Socratic Tutoring).
  * `GET /chat/history/{session_id}` — Lấy lịch sử tin nhắn.
  * `GET /sessions`, `POST /sessions`, `DELETE /sessions/{id}` — Quản lý phiên hội thoại.
* **Môn học & Tài liệu (`/courses`):**
  * `GET /courses`, `POST /courses` — Quản lý môn học.
  * `POST /courses/{id}/materials` — Upload slide/PDF/Word/Excel trích xuất nội dung vào Qdrant RAG.
* **Kế hoạch học tập (`/weekly-plans` & `/planner`):**
  * `GET /weekly-plans` — Lấy kế hoạch học tập tuần hiện tại.
  * `POST /weekly-plans/generate` — AI tự động sinh kế hoạch học tập tuần.
  * `POST /planner/run` — Chạy Planner Agent tối ưu hóa & tự động Re-plan lịch học.
* **Bài tập & Mục tiêu (`/assignments` & `/goals`):**
  * `GET /assignments`, `POST /assignments`, `POST /assignments/{id}/submit` — Quản lý deadline & tiến độ bài tập.
  * `GET /goals`, `POST /goals` — Quản lý mục tiêu học tập cá nhân.
* **Thông báo (`/notifications`):**
  * `GET /notifications`, `PATCH /notifications/{id}/read`, `POST /notifications/read-all` — Quản lý nhắc nhở deadline.

## 12.2. Câu hỏi mẫu (Sample Queries)

```text
[Lập kế hoạch]: "Tạo cho tôi kế hoạch ôn tập môn Xác Suất Thống Kê trong 3 tuần tới, mục tiêu đạt điểm A. Tôi có thể học 2 tiếng mỗi tối."
```

```text
[Dynamic Replanning]: "Hôm nay tôi bận đột xuất từ 14h-18h không học được. Hãy tự động điều chỉnh lại lịch học tuần này giúp tôi."
```

```text
[Hỏi đáp tài liệu RAG]: "Dựa trên slide bài giảng môn Thống Kê tôi đã upload, hãy giải thích khái niệm Tứ phân vị (Quartile) và công thức tính Q1, Q2, Q3."
```

```text
[Study Session Reflection & Socratic Tutoring]: "Tôi vừa hoàn thành buổi học 'Ôn tập chuẩn bị cho: PTDL1_BT_tự luận'. Nhận xét AI gợi ý tôi nên ôn thêm 'Cần thực hành nhiều hơn để củng cố kỹ năng áp dụng công thức vào bài tập thực tế'. Hãy hướng dẫn tôi phương pháp ôn tập hiệu quả!"
```

```text
[Socratic Tutoring]: "Tôi không hiểu cách tính ma trận nghịch đảo 3x3, hãy gợi ý cho tôi từng bước làm nhưng đừng giải bài tập hộ tôi."
```

---

# 13. TESTING & EVALUATION

### 13.1. Chạy kiểm thử tự động (Unit & Integration Tests)
```bash
# Chạy toàn bộ test suite (Backend, Agents, Database, Scheduler)
pytest tests/ -v

# Chạy kèm báo cáo coverage chi tiết
pytest tests/ -v --cov=src --cov-report=html

# Kiểm tra code style & linter (Ruff)
make lint
```

---

### 13.2. Bộ Đánh Giá Định Lượng RAG (RAG Automated Evaluation Benchmark Suite)

Dự án tích hợp bộ benchmark định lượng tự động độc lập tại thư mục `eval/`, xây dựng trên **61 Test Cases thực tế (100% trích xuất từ Slide bài giảng được số hóa)** nhằm đánh giá năng lực Tra cứu, Phản hồi học thuật và Cơ chế Kiểm soát (Guardrails):

####  Cấu trúc thư mục Benchmark (`eval/`)
* **Dữ liệu Benchmark Dataset (`eval/data/`):**
  * [`eval/data/cv_benchmark_dataset.json`](./eval/data/cv_benchmark_dataset.json): **30 Test Cases** môn Thị Giác Máy Tính (`CS_COMPUTER_VISION`).
  * [`eval/data/dm_benchmark_dataset.json`](./eval/data/dm_benchmark_dataset.json): **31 Test Cases** môn Khai Phá Dữ Liệu (`CS_DATA_MINING`).
  * [`eval/data/rag_benchmark_dataset.json`](./eval/data/rag_benchmark_dataset.json): Bộ Golden Benchmark tổng hợp.
  * [`eval/data/sample_materials.py`](./eval/data/sample_materials.py): Tài liệu bài giảng mẫu số hóa.
* **Kịch bản chạy tự động:**
  * [`eval/eval_rag_pipeline.py`](./eval/eval_rag_pipeline.py): Script thực thi benchmark tính toán điểm số Context Hit Rate, Precision, Faithfulness, Relevance, Latency.
  * [`eval/generate_master_report.py`](./eval/generate_master_report.py): Script tổng hợp và xuất Báo Cáo Nghiệm Thu Tổng Quan (Master Report).

####  Lệnh thực thi Benchmark
```bash
# 1. Chạy đánh giá định lượng toàn bộ pipeline RAG
python eval/eval_rag_pipeline.py

# 2. Sinh báo cáo tổng kết Master Evaluation Report
python eval/generate_master_report.py
```

####  Bảng Kết Quả Nghiệm Thu Tổng Quan (Master Evaluation Summary)

| Môn Học (Course) | Mã Môn | Số Lượng TC | Tỷ Lệ Pass | Hit Rate | Faithfulness | Điểm Chất Lượng | Trạng Thái |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Thị Giác Máy Tính** (Computer Vision) | `CS_COMPUTER_VISION` | **30** | **100% (30/30)** | **100.0%** | **100.0%** | **97.8 / 100** | ** XUẤT SẮC** |
| **Khai Phá Dữ Liệu** (Data Mining) | `CS_DATA_MINING` | **31** | **100% (31/31)** | **100.0%** | **100.0%** | **93.3 / 100** | ** XUẤT SẮC** |
| **TỔNG HỢP TOÀN HỆ THỐNG** | **ALL** | **61** | **100% (61/61)** | **100.0%** | **100.0%** | **95.6 / 100** | ** ĐẠT CHUẨN NGHIỆM THU** |

####  Các tệp báo cáo & dữ liệu chỉ số chi tiết (`eval/results/` & `Tài liệu kiểm thử/`)
* **[01_MASTER_EVALUATION_REPORT.md](file:///c:/AI_thuc_chien_khoa_3/bao_cao_tong_ket/P-043/Tài liệu kiểm thử/01_MASTER_EVALUATION_REPORT.md):** Báo cáo tổng kết nghiệm thu toàn diện phân bổ theo 61 kịch bản kiểm thử.
* **[02_RAG_EVAL_REPORT.md](file:///c:/AI_thuc_chien_khoa_3/bao_cao_tong_ket/P-043/Tài liệu kiểm thử/02_RAG_EVAL_REPORT.md):** Báo cáo chi tiết từng kịch bản RAG (Độ trễ trung bình `1.06 ms`, Context Precision `94.1%`, Academic Integrity `100%`).
* **[03_UNIT_AND_INTEGRATION_TESTS.md](file:///c:/AI_thuc_chien_khoa_3/bao_cao_tong_ket/P-043/Tài liệu kiểm thử/03_UNIT_AND_INTEGRATION_TESTS.md):** Tài liệu kiểm thử tự động Unit Test & Integration Test (Pytest).
* **[04_TEST_CASES_SPECIFICATION.md](file:///c:/AI_thuc_chien_khoa_3/bao_cao_tong_ket/P-043/Tài liệu kiểm thử/04_TEST_CASES_SPECIFICATION.md):** Danh mục đặc tả chi tiết 61 Test Cases trích xuất từ slide bài giảng thực tế.
* **[rag_eval_metrics.json](file:///c:/AI_thuc_chien_khoa_3/bao_cao_tong_ket/P-043/Tài liệu kiểm thử/rag_eval_metrics.json):** Tệp dữ liệu JSON thô lưu trữ toàn bộ chỉ số định lượng phục vụ kiểm tra tự động.

---

# 14. PROJECT STRUCTURE

```
P-043/
├── README.md                       # Tài liệu hướng dẫn chính của dự án
├── ARCHITECTURE.md                 # Tài liệu thiết kế kiến trúc chi tiết
├── requirements.txt                # Python backend dependencies
├── Makefile                        # Phím tắt thực thi lệnh nhanh
├── Dockerfile                      # Dockerfile build backend FastAPI
├── docker-compose.yml              # Cấu hình stack Docker (Backend, Frontend, Postgres, Redis)
├── alembic.ini                     # Cấu hình Alembic DB migration
├── ruff.toml                       # Cấu hình chuẩn code style Ruff
├── .env.example                    # Template biến môi trường
├── .env                            # Cấu hình biến môi trường thực tế
│
├── src/                            # Mã nguồn Backend (FastAPI + LangGraph)
│   ├── main.py                     # Entry point khởi tạo ứng dụng FastAPI & CORS
│   ├── config.py                   # Pydantic Settings quản lý biến môi trường
│   │
│   ├── agents/                     # AI Agent Engine (LangGraph)
│   │   ├── companion_agent.py      # Companion Agent (Chat, Socratic, RAG)
│   │   ├── graph.py                # StateGraph định nghĩa luồng Agent
│   │   ├── state.py                # Schema AgentState
│   │   ├── planner_graph.py        # Planner Agent StateGraph
│   │   ├── planner_state.py        # Planner state schema
│   │   ├── nodes/                  # Các Node xử lý trong StateGraph
│   │   │   ├── rag_nodes.py        # Node truy xuất và tổng hợp tài liệu RAG
│   │   │   └── planner_nodes.py    # Node thuật toán lập lịch và re-plan
│   │   └── tools/                  # Các Tools được Agent gọi tự động
│   │       └── planner_tools.py    # Planner Tools (@tool)
│   │
│   ├── routers/                    # API Endpoints (FastAPI Routers)
│   │   ├── auth_router.py          # /api/v1/auth/* (OTP, Google OAuth, JWT)
│   │   ├── chat_router.py          # /api/v1/chat/* (AI Chat)
│   │   ├── session_router.py       # /api/v1/sessions/* (Chat Sessions)
│   │   ├── course_router.py        # /api/v1/courses/* (Courses & Materials)
│   │   ├── assignment_router.py    # /api/v1/assignments/* (Assignments & Progress)
│   │   ├── planner_router.py       # /api/v1/planner/* (Planner Agent)
│   │   ├── goal_router.py          # /api/v1/goals/* (Academic Goals)
│   │   ├── weekly_plan_router.py   # /api/v1/weekly-plans/* (Weekly Schedules)
│   │   ├── notification_router.py  # /api/v1/notifications/* (Alerts & Reminders)
│   │   └── system_router.py        # /api/v1/system/* (Health checks)
│   │
│   ├── services/                   # Tầng Nghiệp vụ (Business Logic)
│   │   ├── auth_service.py         # Xác thực, OTP, Google OAuth, phân quyền
│   │   ├── course_service.py       # Quản lý môn học
│   │   ├── material_service.py     # Quản lý tài liệu học tập
│   │   ├── rag_service.py          # RAG pipeline, Gemini Vision OCR, FlashRank Reranker
│   │   ├── weekly_plan_service.py  # Thuật toán phân bổ kế hoạch học tập
│   │   ├── assignment_service.py   # Quản lý bài tập và tiến độ sinh viên
│   │   ├── planner_agent_service.py# Điều phối luồng Planner Agent
│   │   ├── planner_context_builder.py # Xây dựng ngữ cảnh cho Planner
│   │   ├── student_context_service.py # Xây dựng ngữ cảnh học tập sinh viên
│   │   ├── instructor_context_service.py # Ngữ cảnh cho giảng viên
│   │   ├── reminder_service.py     # Xử lý thông báo nhắc nhở deadline
│   │   ├── reminder_scheduler.py   # Background scheduler cho reminders
│   │   ├── schedule_utils.py       # Tiện ích tính toán thời gian lịch học
│   │   ├── llm.py                  # Factory khởi tạo LLM đa nhà cung cấp
│   │   ├── redis_service.py        # Cache, OTP, Session & Token rotation
│   │   ├── email_service.py        # Gửi email qua Brevo REST API / SMTP
│   │   ├── db_service.py           # Tiện ích cơ sở dữ liệu
│   │   └── storage/                # Quản lý Object Storage (Cloudflare R2 / MinIO)
│   │
│   ├── core/
│   │   └── security.py             # JWT encode/decode, bcrypt hash, OTP generator
│   │
│   ├── db/                         # Tầng Cơ sở dữ liệu
│   │   ├── database.py             # AsyncEngine & AsyncSessionLocal
│   │   ├── base.py                 # DeclarativeBase SQLAlchemy
│   │   ├── enums.py                # Các kiểu Enum trong DB
│   │   └── models/                 # SQLAlchemy ORM Models phân nhóm
│   │       ├── identity/           # User, Role, UserRole, AnonymousProfile
│   │       ├── learning/           # Course, Material, Schedule, Assignment, Submission
│   │       ├── planning/           # Goal, WeeklyGoal, Task, Notification
│   │       ├── chat/               # ChatSession, ChatMessage
│   │       ├── ai/                 # AgentMemory, Recommendation, AILog, IntegrityLog
│   │       ├── reflection/         # ReflectionSession, ReflectionMessage
│   │       ├── knowledge/          # Document, DocumentChunk
│   │       └── integration/        # SyncLog
│   │
│   ├── models/                     # Pydantic Schemas & DTOs
│   │   ├── auth.py                 # Request/Response schemas cho Auth
│   │   └── schemas.py              # Schemas cho Courses, Plans, Chat, Goals
│   │
│   └── repositories/               # Data Access Repository Pattern
│       ├── user_repository.py      # Thao tác bảng users
│       └── material_repository.py  # Thao tác bảng course_materials
│
├── frontend/                       # Frontend SPA (React 18 + Vite + TypeScript)
│   ├── index.html                  # HTML template
│   ├── vite.config.ts              # Cấu hình Vite & Proxy port 8000
│   ├── tailwind.config.js          # Cấu hình Tailwind CSS
│   ├── package.json                # Dependencies: Antd, Framer Motion, Lucide, Axios
│   ├── Dockerfile                  # Build container frontend
│   └── src/
│       ├── App.tsx                 # Routing chính (React Router DOM v6)
│       ├── main.tsx                # Entry point
│       ├── components/             # Reusable UI Components
│       ├── pages/                  # Chat, Planner, Courses, Auth pages
│       ├── services/               # Axios API client
│       ├── context/                # AuthContext, ChatContext
│       └── types/                  # TypeScript Interfaces
│
├── alembic/                        # Database Migration Scripts
│   ├── env.py                      # Cấu hình async migration
│   └── versions/                   # Các file migration revision
│
├── eval/                           # RAG Evaluation Benchmark Suite
│   ├── eval_rag_pipeline.py        # Kịch bản đánh giá Hit Rate, Faithfulness, Latency
│   ├── generate_master_report.py   # Báo cáo đánh giá tổng hợp
│   ├── data/                       # Dữ liệu tài liệu mẫu để benchmark
│   └── results/                    # Báo cáo kết quả đánh giá (report.md)
│
├── tests/                          # Automated Test Suite
│   ├── conftest.py                 # Pytest fixtures (Mock DB, Redis)
│   ├── test_agents/                # Tests cho Agent nodes, tools, StateGraph
│   ├── test_api/                   # Integration tests cho REST API
│   ├── test_planner_agent.py       # Test kịch bản lập lịch của Planner
│   ├── test_reminder_service.py    # Test logic nhắc nhở deadline
│   └── test_db_schema.py           # Test tính toàn vẹn của DB schema
│
├── docs/                           # Tài liệu thiết kế & kiến trúc
│   └── architecture_diagram.md
│
└── scripts/                        # Automation scripts
    ├── setup_hooks.sh              # Git hooks (Linux/macOS)
    ├── setup_hooks.ps1             # Git hooks (Windows)
    └── log_antigravity.py          # AI usage logging
```

---

# 15. LỘ TRÌNH PHÁT TRIỂN (ROADMAP)

### Giai đoạn 1 (0 – 3 tháng): Tích hợp LMS & Spaced Repetition
* **LMS Sync:** Đồng bộ tự động Course, Syllabus, Assignment từ Canvas, Moodle, Google Classroom.
* **Spaced Repetition Flashcards:** Tự động tạo flashcards từ tài liệu RAG và lên lịch ôn tập ngắt quãng (SM-2 Algorithm).

### Giai đoạn 2 (3 – 9 tháng): Học nhóm & Voice Agent
* **Study Group Companion:** Phân chia nhiệm vụ học nhóm và theo dõi tiến độ chéo giữa các thành viên.
* **Realtime Voice Tutor:** Vấn đáp kiến thức trực tiếp với AI Tutor bằng giọng nói thời gian thực.

### Giai đoạn 3 (9 – 18 tháng): Knowledge Graph & SaaS EdTech
* **Adaptive Knowledge Graph:** Bản đồ hóa lỗ hổng kiến thức của từng sinh viên để đề xuất lộ trình học bù đắp.
* **SaaS EdTech Platform:** Đóng gói giải pháp cho các trường đại học và viện đào tạo triển khai quy mô lớn.

---

# 16. DELIVERABLES CHECKLIST (P2)

- [x] **Source Code:** Mã nguồn hoàn chỉnh trên GitHub Repository.
- [x] **README.md:** Tài liệu tổng quan dự án chuẩn theo cấu trúc quy định của BTC AI20K.
- [x] **Architecture Document & Diagram:** Tài liệu kiến trúc 5 tầng (`ARCHITECTURE_DIAGRAM.md` / `Sơ đồ kiến trúc.md`).
- [x] **AI Prompt Logs:** Tự động ghi nhận và đồng bộ thông qua Git Hook (`.ai-log/`).
- [ ] **Live URL / Deployment:** Đường dẫn ứng dụng chạy thực tế trên Cloud.
- [ ] **Video Demo:** Video quay demo luồng trải nghiệm người dùng (3 – 5 phút).
- [ ] **Pitch Deck / Presentation:** Slide trình bày cho Demo Day (`presentation/`).
- [x] **Weekly Journal:** Nhật ký phát triển định kỳ (`JOURNAL.md`).
- [x] **Worklog:** Ghi nhận đóng góp chi tiết của từng thành viên (`WORKLOG.md`).
- [x] **Evaluation Evidence:** Bộ kiểm thử và báo cáo benchmark định lượng RAG 61 test cases (`eval/results/MASTER_EVALUATION_REPORT.md`).

---

# 17. THÔNG TIN NHÓM PHÁT TRIỂN (TEAM MEMBERS)

### Nhóm P-043 — VinUni AI20K Build Phase (Cohort 3)

| STT | Họ và Tên | Mã Sinh Viên (MSSV) | Vai trò chính trong dự án | Phân công nhiệm vụ chi tiết |
|:---:|-----------|:-------------------:|---------------------------|-----------------------------|
| **1** | **Hoàng Duy Linh** | `2A202601159` | **Trưởng nhóm / Backend & AI Lead** | Phụ trách kiến trúc Backend (FastAPI, SQLAlchemy Async), triển khai hệ thống LangGraph AI Agents, xây dựng Multimodal RAG Pipeline (Gemini Vision OCR + Qdrant + FlashRank). |
| **2** | **Đặng Đức Hoà** | `2A202601351` | **BA, System Design & QA/Testing** | Phụ trách phân tích nghiệp vụ (BA), vẽ & thiết kế 1 phần luồng sản phẩm (Product Flow), xây dựng tài liệu đặc tả & thiết kế sản phẩm; trực tiếp kiểm thử sản phẩm (Testing/QA), phát hiện lỗi và phản hồi cho các thành viên trong nhóm. |
| **3** | **Nguyễn Tuấn Anh** | `2A202601395` | **Frontend & UI/UX Lead** | Phụ trách phát triển toàn bộ giao diện Web SPA (React 18, Vite 5, Ant Design, Tailwind CSS), tích hợp API và tối ưu trải nghiệm tương tác với RAG/Chatbot, bộ tiêu chí đánh giá. |

---

## License

MIT License — VinUni AI20K Build Phase Cohort 3 — Team P-043

<div align="center">
  <sub>Built with ❤️ by Team P-043 — VinUni AI20K Build Phase · 2025</sub>
</div>
