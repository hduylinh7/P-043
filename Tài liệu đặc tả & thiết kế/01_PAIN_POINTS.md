# NỖI ĐAU (PAIN POINTS) CỦA SINH VIÊN & ĐẶC TẢ BÀI TOÁN

> **Nguồn file gốc trong dự án:** `PAIN_POINT.md` & `README.md` (Mục 1.2)  

---

## 1. Bối cảnh thực tế

Trong môi trường đại học, sinh viên phải đồng thời xử lý khối lượng kiến thức lớn, nhiều môn học, bài tập thực hành và deadline liên tục rải rác. Phần lớn sinh viên vẫn gặp khó khăn lớn trong cả 3 giai đoạn của quá trình học tập:

1. **Trước khi học (Lập kế hoạch):** Bối rối, không biết sắp xếp thời gian khi đối mặt với nhiều bài tập và deadline rải rác.
2. **Trong khi học (Nắm bắt kiến thức):** Hoang mang trước hàng trăm trang slide, tài liệu, không biết đâu là kiến thức trọng tâm và dễ lạm dụng AI để chép bài.
3. **Sau khi học (Đúc kết & Ôn tập):** Nộp bài xong là chuyển sang việc khác ngay, lướt qua luôn mà không nhìn nhận lại điểm mạnh, điểm yếu hay đúc kết bài học.

**Lita Learning** được xây dựng nhằm biến AI từ công cụ thụ động "hỏi — đáp" thành một **trợ lý học tập đồng hành chủ động**, giải quyết trọn vẹn 3 giai đoạn: **Lập kế hoạch (PLAN) → Học tập đúng trọng tâm (LEARN) → Tự đánh giá & Ôn tập (REFLECT)**.

---

## 2. Bảng tổng hợp ba nỗi đau cốt lõi ("Nỗi đau ai thấu")

| STT | Nỗi đau thực tế | Vấn đề cụ thể | Hậu quả | Giải pháp của Lita Learning |
|:---:|-----------------|---------------|---------|-----------------------------|
| **01** | **Bối rối trong việc lập kế hoạch với nhiều bài tập & deadline rải rác** | Không có thói quen lên lịch sớm; khi tự lên lịch thì chia thời gian cảm tính, dễ vỡ kế hoạch khi bận đột xuất. | **"Nước đến chân mới nhảy"**, thức đêm dồn bài trước kỳ thi, stress và kết quả kém. | **Dynamic Weekly Planning:** AI tự động phân bổ lịch học tuần thông minh dựa trên hạn bài tập, deadline, lịch học cố định, thời gian rảnh. |
| **02** | **Hoang mang không biết đâu là kiến thức trọng tâm khi làm bài** | Slide, giáo trình PDF, file Excel bài tập và sơ đồ đồ sộ; sinh viên không biết trọng tâm ở đâu nên dễ ỷ lại, nhờ AI giải bài hộ. | **"Lạm dụng AI quá mức"**, chép lời giải máy móc, vi phạm liêm chính học thuật và mất gốc tư duy. | **Kiến Thức Trọng Tâm & Bài Tập Ôn Luyện (RAG + Vision OCR):** Trích xuất tóm tắt kiến thức cốt lõi từ slide tài liệu và tự động tạo bài tập luyện tập để sinh viên ôn tập vững vàng trước khi làm bài tập thật do giáo viên giao. |
| **03** | **Học xong nộp bài là bỏ qua, không nhìn nhận lại điểm yếu** | Sau khi hoàn thành một buổi học/bài tập, sinh viên thường lướt qua luôn sang việc khác, không bao giờ nhìn nhận lại điểm mạnh, điểm yếu hay đúc kết bài học. | **"Nhanh quên, học vẹt"**, không biết mình hổng kiến thức ở đâu, dẫn đến việc lặp lại sai lầm trong các bài thi sau này. | **Study Session Reflection & AI Analysis:** Sinh viên tự đánh giá phản hồi 1 phút sau buổi học; AI lập tức nhận xét 2 chiều (Điểm sáng, Cần lưu ý, Gợi ý tiếp theo) và sinh viên có thể kết nối ngay Socratic Tutor để ôn tập kiến thức nếu muốn. |

---

## 3. Phân tích chi tiết từng nỗi đau & giải pháp công nghệ

### 3.1. Nỗi đau 1: Bối rối trong việc lập kế hoạch với nhiều bài tập & deadline rải rác

* **Vấn đề thực tế:** Sinh viên thường không có thói quen lập kế hoạch ôn tập từ sớm. Khi tự lập lịch (bằng Google Calendar hay ghi chú thủ công), việc chia thời gian thường mang tính cảm tính (ví dụ chia đều số ngày mà không cân nhắc độ khó). Khi có việc bận đột xuất hoặc nghỉ 1 buổi, toàn bộ lịch dồn ứ, đỏ chót, sinh ra hiệu ứng "domino" làm đổ sụp ý chí và dẫn đến việc bỏ cuộc.
* **Hậu quả:** Tình trạng "nước đến chân mới nhảy", thức đêm dồn việc sát ngày thi, kết quả không như ý muốn và áp lực tinh thần đè nặng.
* **Giải pháp của Lita Learning:**
  * **Phân bổ thời gian thông minh (AI Planner Agent):** Phân tích danh sách bài tập, hạn nộp (due date), mục tiêu điểm số và lịch học cố định trên giảng đường để tự động tạo kế hoạch học tập tối ưu.
  * **Dynamic Replanning (Kế hoạch Động):** Khi sinh viên trễ tiến độ hoặc bận đột xuất, AI tính toán lại và san sẻ khối lượng còn thiếu sang các khoảng thời gian trống tiếp theo, giữ cho kế hoạch luôn khả thi và trong tầm kiểm soát.

---

### 3.2. Nỗi đau 2: Hoang mang không biết đâu là kiến thức trọng tâm khi làm bài

* **Vấn đề thực tế:** Tài liệu môn học rất đồ sộ gồm hàng chục slide bài giảng, file Word, đề cương, dữ liệu bảng tính Excel và các sơ đồ/công thức toán học phức tạp. Sinh viên không xác định được nội dung cốt lõi, dẫn đến việc học lan man hoặc có tâm lý lạm dụng AI (yêu cầu AI giải bài hộ để đối phó deadline).
* **Hậu quả:** Sinh viên vi phạm liêm chính học thuật, chép bài máy móc, không hiểu bản chất và mất gốc kiến thức.
* **Giải pháp của Lita Learning:**
  * **Kiến thức trọng tâm (Multimodal RAG + Vision OCR):** Bóc tách tài liệu bài giảng, trích xuất chính xác công thức toán LaTeX, sơ đồ và tóm tắt các khái niệm cốt lõi trước mỗi buổi học.
  * **Workspace Ôn luyện chuẩn bị:** AI sinh ra các bài tập rèn luyện tương ứng từ slide để sinh viên thực hành nắm chắc kiến thức trước khi làm bài tập chính thức của giáo viên.
  * **Socratic Guardrail:** AI từ chối giải bài hộ trực tiếp, đóng vai trò gia sư định hướng tư duy và gợi mở câu hỏi dẫn dắt.

---

### 3.3. Nỗi đau 3: Học xong nộp bài là bỏ qua, không nhìn nhận lại điểm yếu

* **Vấn đề thực tế:** Sinh viên có thói quen sau khi hoàn thành một buổi học hoặc bài tập là chuyển ngay sang công việc khác, lướt qua luôn mà không dành thời gian nhìn nhận lại bản thân xem mình đã nắm chắc phần nào và phần nào còn mơ hồ.
* **Hậu quả:** Học trước quên sau ("học vẹt"), không phát hiện lỗ hổng kiến thức kịp thời, dẫn đến việc lặp lại các lỗi sai tương tự trong các bài kiểm tra/kỳ thi quan trọng.
* **Giải pháp của Lita Learning:**
  * **Reflection 1 phút sau buổi học:** Sau khi hoàn thành phiên học trong Workspace, sinh viên điền nhanh form tự đánh giá mức độ hiểu bài và khó khăn gặp phải.
  * **AI Phân tích 2 chiều:** AI lập tức phân tích và đưa ra phản hồi cá nhân hóa gồm 3 phần: *Điểm sáng* (kiến thức đã nắm vững), *Cần lưu ý* (lỗ hổng cần củng cố) và *Gợi ý tiếp theo* (tài liệu/bài tập nên xem lại).
  * **Socratic Tutor on-demand:** Sinh viên có thể chủ động mở ngay phiên đối thoại với Socratic AI Tutor để được giải thích cặn kẽ các vướng mắc còn tồn đọng.


