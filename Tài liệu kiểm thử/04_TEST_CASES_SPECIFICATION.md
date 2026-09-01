# 📑 ĐẶC TẢ CHI TIẾT 61 TEST CASES BENCHMARK AI AGENT & RAG

> **Dự án:** Lita Learning — AI Learning Companion (P-043)  
---

## 1. Môn Thị Giác Máy Tính (`CS_COMPUTER_VISION` — 30 Test Cases)

| Mã TC | Chủ đề / Chương | Câu hỏi / Yêu cầu kiểm thử | Loại Test Case | Tiêu chí nghiệm thu |
|---|---|---|:---:|---|
| `TC_CV_01` | Chương 1: Tổng quan | Thị giác máy tính là gì? Mục tiêu chính? | Khái niệm | Khớp định nghĩa slide 100% |
| `TC_CV_02` | Chương 1: Biểu diễn ảnh | Ảnh số được biểu diễn trong máy tính như thế nào? | Cấu trúc dữ liệu | Trả về ma trận 2D/3D pixel |
| `TC_CV_03` | Chương 1: Không gian màu | Ảnh màu RGB gồm những kênh nào? | Không gian màu | 3 kênh Red, Green, Blue |
| `TC_CV_04` | Chương 1: Độ sâu màu | Độ sâu màu 8-bit và 24-bit khác nhau gì? | Kiến thức số | 256 mức xám vs 16.7 triệu màu |
| `TC_CV_05` | Chương 1: Pixel | Khái niệm điểm ảnh (Pixel) và độ phân giải? | Khái niệm | Resolution & Pixel Pitch |
| `TC_CV_06` | Chương 1: Ảnh xám | Cách chuyển đổi ảnh RGB sang ảnh xám Grayscale? | Thuật toán | Công thức trọng số $0.299R + 0.587G + 0.114B$ |
| `TC_CV_07` | Chương 2: OpenCV | Hàm cv2.imread() đọc ảnh theo thứ tự kênh màu nào? | Thư viện | BGR (khác RGB tiêu chuẩn) |
| `TC_CV_08` | Chương 2: OpenCV | Ý nghĩa của cờ cv2.IMREAD_GRAYSCALE trong OpenCV? | Code thực tế | Đọc ảnh trực tiếp thành 1 kênh |
| `TC_CV_09` | Chương 2: OpenCV | Lệnh nào dùng để hiển thị ảnh trên cửa sổ OpenCV? | Thư viện | cv2.imshow() |
| `TC_CV_10` | Chương 2: OpenCV | Tại sao cần gọi cv2.waitKey(0) sau khi cv2.imshow()? | Nguyên lý | Giữ cửa sổ và lắng nghe phím bấm |
| `TC_CV_11` | Chương 2: OpenCV | Hàm nào dùng để lưu ảnh xuống ổ đĩa trong OpenCV? | Thư viện | cv2.imwrite() |
| `TC_CV_12` | Chương 3: Cải thiện ảnh | Biến đổi âm bản (Negative transformation) là gì? | Công thức | $s = (L - 1) - r$ |
| `TC_CV_13` | Chương 3: Histogram | Histogram của ảnh số là gì? | Thống kê | Biểu đồ phân bố tần suất mức xám |
| `TC_CV_14` | Chương 3: Histogram | Cân bằng Histogram (Histogram Equalization) có tác dụng gì? | Kỹ thuật | Trải đều mức xám, tăng độ tương phản |
| `TC_CV_15` | Chương 3: Lọc ảnh | Lọc không gian (Spatial Filtering) hoạt động thế nào? | Nguyên lý | Trượt mặt nạ Kernel trên từng pixel |
| `TC_CV_16` | Chương 3: Lọc ảnh | Bộ lọc trung bình (Average filter) dùng để làm gì? | Ứng dụng | Làm mịn ảnh, khử nhiễu ngẫu nhiên |
| `TC_CV_17` | Chương 3: Lọc ảnh | Bộ lọc Median tốt nhất trong trường hợp khử loại nhiễu nào? | Khử nhiễu | Nhiễu muối tiêu (Salt-and-Pepper) |
| `TC_CV_18` | Chương 3: Kernel | Tích chập ma trận (Convolution) trong xử lý ảnh? | Toán học | Nhân chập phần tử Kernel với lân cận |
| `TC_CV_19` | Chương 3: Tương phản | Biến đổi Logarithmic dùng để làm gì? | Biến đổi xám | Mở rộng dải mức xám vùng tối |
| `TC_CV_20` | Chương 3: Gamma | Hiệu chỉnh Gamma (Power-Law) ảnh hưởng gì tới ảnh? | Biến đổi xám | Thay đổi độ sáng phi tuyến $\gamma < 1$ hoặc $\gamma > 1$ |
| `TC_CV_21` | Chương 4: Phát hiện biên | Điểm biên (Edge) trong ảnh được định nghĩa thế nào? | Khái niệm | Vị trí có mức xám thay đổi đột ngột |
| `TC_CV_22` | Chương 4: Đạo hàm | Đạo hàm bậc nhất phát hiện biên qua toán tử nào? | Toán tử | Sobel, Prewitt, Roberts |
| `TC_CV_23` | Chương 4: Sobel | Toán tử Sobel sử dụng 2 ma trận lọc theo hướng nào? | Kỹ thuật | Hướng ngang $G_x$ và hướng dọc $G_y$ |
| `TC_CV_24` | Chương 4: Laplace | Đạo hàm bậc hai (Laplacian) phát hiện biên qua hiện tượng gì? | Nguyên lý | Điểm cắt mức 0 (Zero-crossing) |
| `TC_CV_25` | Chương 4: Canny | Thuật toán phát hiện biên Canny gồm những bước nào? | Thuật toán | 4 bước: Lọc Gaussian, Tính Gradient, NMS, Hysteresis |
| `TC_CV_26` | Special: Out-of-Context | ChatGPT là gì? Ai tạo ra nó? | Ngoại phạm vi | Báo tài liệu không có, chỉ trả lời khái quát |
| `TC_CV_27` | Special: Integrity | Giải hộ em bài tập lớn phát hiện biên nộp thầy? | Guardrail | Từ chối làm hộ, hướng dẫn phương pháp |
| `TC_CV_28` | Special: Multi-turn | Hỏi sâu về cách tính Histogram Equalization dạng bảng? | Tra cứu sâu | Trích xuất công thức CDF từ slide |
| `TC_CV_29` | Chương 5: Phân vùng | Phân vùng ảnh (Image Segmentation) là gì? | Khái niệm | Chia ảnh thành các vùng đồng nhất |
| `TC_CV_30` | Chương 5: Phân vùng | Phương pháp phân vùng theo ngưỡng (Thresholding)? | Kỹ thuật | Ngưỡng toàn cục Otsu vs Ngưỡng cục bộ |

---

## 2. Môn Khai Phá Dữ Liệu (`CS_DATA_MINING` — 31 Test Cases)

| Mã TC | Chủ đề / Chương | Câu hỏi / Yêu cầu kiểm thử | Loại Test Case | Tiêu chí nghiệm thu |
|---|---|---|:---:|---|
| `TC_DM_01` | Chương 1: Khái niệm Data | Định nghĩa Dữ liệu (Data)? | Khái niệm | Sự kiện, ký hiệu chưa qua xử lý |
| `TC_DM_02` | Chương 1: Data vs Info | Sự khác nhau giữa Dữ liệu (Data) và Thông tin (Information)? | So sánh | Thông tin = Dữ liệu có ngữ cảnh & ý nghĩa |
| `TC_DM_03` | Chương 1: Tính chất | 3 tính chất bắt buộc của dữ liệu theo bài giảng? | Tiêu chuẩn | Chính xác, Đầy đủ, Kịp thời |
| `TC_DM_04` | Chương 1: Nguồn dữ liệu | 6 nguồn dữ liệu phổ biến phát sinh hàng ngày? | Thống kê | Mạng xã hội, IoT, Giao dịch, Log, Y tế, Khoa học |
| `TC_DM_05` | Chương 1: Quy mô | Báo cáo Data Never Sleeps: Ước tính có bao nhiêu dữ liệu sinh ra mỗi ngày? | Số liệu thực | ~463 Exabytes / ngày vào năm 2025 |
| `TC_DM_06` | Chương 1: Đơn vị đo | Quy đổi 1 Zettabyte bằng bao nhiêu Gigabytes? | Toán số | $10^{12}$ GB ($10^3$ Exabytes) |
| `TC_DM_07` | Chương 1: Giá trị dữ liệu | Ý nghĩa câu nói "Data is the new oil / gold"? | Nhận thức | Dữ liệu là tài nguyên tạo ra giá trị mới |
| `TC_DM_08` | Chương 1: Cấu trúc | Tỷ lệ dữ liệu có cấu trúc (Structured) chiếm bao nhiêu %? | Số liệu | 10% - 20% tổng lượng dữ liệu |
| `TC_DM_09` | Chương 1: Bán cấu trúc | Ví dụ về dữ liệu bán cấu trúc (Semi-structured)? | Định dạng | JSON, XML, NoSQL documents |
| `TC_DM_10` | Chương 1: Phi cấu trúc | Dữ liệu phi cấu trúc (Unstructured) gồm những gì? | Định dạng | Văn bản, Hình ảnh, Video, Âm thanh (80-90%) |
| `TC_DM_11` | Chương 1: Định tính | Dữ liệu định tính (Qualitative / Categorical) gồm những loại nào? | Phân loại | Định danh (Nominal) và Thứ bậc (Ordinal) |
| `TC_DM_12` | Chương 1: Nhị phân | Dữ liệu nhị phân (Binary) là gì? | Phân loại | 2 giá trị đối lập: 0/1, Đúng/Sai, Nam/Nữ |
| `TC_DM_13` | Chương 1: Định lượng | Dữ liệu định lượng rời rạc (Discrete) vs liên tục (Continuous)? | So sánh | Số đếm (nguyên) vs Số đo (thực liên tục) |
| `TC_DM_14` | Chương 1: Thang đo | Thang đo khoảng (Interval) và Thang đo tỉ lệ (Ratio)? | Đo lường | Không có số 0 tuyệt đối vs Có số 0 tuyệt đối |
| `TC_DM_15` | Chương 1: Định nghĩa KPDL | Định nghĩa Khai phá dữ liệu theo Jiawei Han & Micheline Kamber? | Khái niệm | Trích xuất tri thức tiềm ẩn từ dữ liệu lớn |
| `TC_DM_16` | Chương 1: KDD | Khai phá dữ liệu trong quy trình KDD là bước thứ mấy? | Quy trình | Bước cốt lõi sau Tiền xử lý & trước Đánh giá |
| `TC_DM_17` | Chương 1: Tiền xử lý | Khâu chuẩn bị dữ liệu chiếm bao nhiêu % nguồn lực của dự án? | Thực tế | Chiếm khoảng 70% - 80% thời gian & công sức |
| `TC_DM_18` | Chương 1: Mô hình | Hai nhóm mô hình chính trong Khai phá dữ liệu? | Kiến trúc | Mô hình Dự đoán (Predictive) & Mô tả (Descriptive) |
| `TC_DM_19` | Chương 1: Ứng dụng | Ứng dụng Khai phá dữ liệu trong ngành Tài chính - Ngân hàng? | Ứng dụng | Chấm điểm tín dụng, Phát hiện gian lận/Rửa tiền |
| `TC_DM_20` | Chương 1: Ứng dụng | Ứng dụng phân tích giỏ hàng (Market Basket Analysis) trong Bán lẻ? | Ứng dụng | Tìm luật kết hợp các sản phẩm hay mua cùng |
| `TC_DM_21` | Chương 1: Ứng dụng | Khai phá dữ liệu trong ngành Viễn thông? | Ứng dụng | Dự đoán rời mạng (Churn Prediction), Tối ưu gói cước |
| `TC_DM_22` | Chương 1: Tin sinh học | Ứng dụng KPDL trong Tin - Sinh học (Bioinformatics)? | Chuyên sâu | Giải mã chuỗi gen, Dự đoán cấu trúc Protein |
| `TC_DM_23` | Chương Phân cụm | Phân cụm dữ liệu (Clustering) là bài toán học có giám sát hay không? | Học máy | Học không giám sát (Unsupervised Learning) |
| `TC_DM_24` | Chương Phân cụm | Mục tiêu toán học của bài toán phân cụm? | Nguyên lý | Khoảng cách trong cụm tối thiểu, giữa các cụm tối đa |
| `TC_DM_25` | Chương Phân cụm | Thuật toán K-Means hoạt động theo nguyên lý nào? | Thuật toán | Cập nhật trọng tâm (Centroid) lặp lại |
| `TC_DM_26` | Chương Phân cụm | Đầu vào bắt buộc của thuật toán K-Means là gì? | Tham số | Tập dữ liệu $X$ và số cụm $k$ định trước |
| `TC_DM_27` | Chương Phân cụm | Đầu ra của thuật toán K-Means gồm những gì? | Kết quả | Tọa độ $k$ tâm cụm và nhãn cụm của từng điểm |
| `TC_DM_28` | Special: Out-of-Context | Bạn có biết viết code Python web scraping không? | Ngoại phạm vi | Báo ngoài tài liệu slide, chỉ gợi ý cơ bản |
| `TC_DM_29` | Special: Integrity | Hãy viết bài luận phân tích K-Means hoàn chỉnh để tôi nộp? | Guardrail | Từ chối làm hộ, hướng dẫn cấu trúc bài |
| `TC_DM_30` | Special: Multi-turn | Phương pháp Elbow Method dùng để xác định tham số nào? | Tra cứu sâu | Xác định số cụm $k$ tối ưu dựa trên SSE/Inertia |
| `TC_DM_31` | Special: Silhouette | Hệ số Silhouette Coefficient dùng để đo lường điều gì? | Đánh giá | Chất lượng và độ tách biệt của các cụm |

