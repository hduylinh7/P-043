"""Course materials repository for RAG benchmark evaluation.

Contains structured text, technical specifications, and slide notes
from actual lecture slides for CS_COMPUTER_VISION.
"""

SAMPLE_COURSE_MATERIALS = [
    # =========================================================================
    # THỊ GIÁC MÁY TÍNH (COMPUTER VISION) - LECTURE SLIDES CHƯƠNG 1 -> 5
    # =========================================================================
    {
        "course_id": "CS_COMPUTER_VISION",
        "course_name": "Thị Giác Máy Tính (Computer Vision)",
        "material_id": "mat-cv-ch01",
        "file_name": "BaiGiang_Chuong1_GioiThieu_TGMT_OpenCV.pptx",
        "content": (
            "CHƯƠNG 1: GIỚI THIỆU THỊ GIÁC MÁY TÍNH & THƯ VIỆN OPENCV\n\n"
            "1. THỊ GIÁC MÁY TÍNH LÀ GÌ? (Slide 7)\n"
            "- Thị giác máy tính là lĩnh vực nghiên cứu tập trung vào vấn đề 'helping computers to see'. "
            "Computers are able to recognize and process the objects from the video/images as a human can able to recognize.\n"
            "- Thị giác máy tính đang là một trong những lĩnh vực hot nhất của khoa học máy tính và nghiên cứu trí tuệ nhân tạo.\n"
            "- Về mặt tổng thể chúng vẫn chưa thể cạnh tranh với sức mạnh thị giác của mắt người, đã có rất nhiều ứng dụng hữu ích "
            "được tạo ra để khai thác tiềm năng của chúng.\n"
            "- Trong một số lĩnh vực hẹp, nhiều hệ thống học sâu (DL) dựa trên thị giác máy tính đã có độ chính xác bằng hoặc vượt con người.\n\n"
            "2. TÍNH CHẤT ĐA NGÀNH VÀ VỊ TRÍ TRONG CÂY AI (Slide 8)\n"
            "- Đây là một lĩnh vực đa ngành - đa lĩnh vực (interdisciplinary field), sử dụng các phương pháp chuyên biệt "
            "và các thuật toán phức tạp trong xử lý.\n"
            "- Các lĩnh vực liên quan: Computer Science (Graphs, Algorithms, Machine Learning, Speech, NLP, Image Processing, Systems Architecture), "
            "Physics (Optics, Solid-State Physics), Mathematics, Neuroscience, Psychology, Engineering, Biology.\n"
            "- Cây phân cấp trí tuệ nhân tạo: Artificial Intelligence -> Machine Learning -> Computer Vision.\n\n"
            "3. PHÂN BIỆT XỬ LÝ ẢNH (IMAGE PROCESSING) VÀ THỊ GIÁC MÁY TÍNH (COMPUTER VISION) (Slide 14 - 15)\n"
            "- Xử lý ảnh (Image processing): là quá trình tạo ra ảnh mới từ ảnh có sẵn, VD: tăng độ sáng, cắt ảnh, khử nhiễu,... "
            "không tập trung vào việc hiểu nội dung của bức ảnh. Cả đầu vào và đầu ra đều là ảnh (Both input and output are images).\n"
            "- Thị giác máy tính (Computer vision): tập trung vào việc hiểu những gì máy móc nhìn thấy (making sense of what a machine sees), "
            "sử dụng xử lý ảnh để xử lý dữ liệu thô (tiền xử lý dữ liệu ảnh). Hệ thống nhận đầu vào là ảnh và cho đầu ra là tri thức cụ thể theo nhiệm vụ (task-specific knowledge).\n"
            "- Ứng dụng Xử lý ảnh (Image Processing): Smoothing & Sharpening (làm mịn & tăng độ sắc nét), Change Contrast & Brightness (thay đổi độ tương phản & độ sáng), "
            "Highlight Edges & Regions (làm nổi bật cạnh & vùng), Watermarking (đóng dấu bản quyền), Compression (nén ảnh), Calibration (hiệu chỉnh).\n"
            "- Ứng dụng Thị giác máy tính (Computer Vision): Labelling (gán nhãn), Position (xác định vị trí), Identification (nhận dạng), "
            "Measurement (đo lường), Action (nhận dạng hành động), Projection (chiếu).\n\n"
            "4. ỨNG DỤNG CỦA THỊ GIÁC MÁY TÍNH (Slide 19)\n"
            "- 7 ứng dụng cụ thể: Face Recognition (nhận dạng khuôn mặt), Image Classification (phân loại ảnh), Object Detection (phát hiện đối tượng), "
            "Emotion Detection (nhận dạng cảm xúc), Object Tracking (theo dõi đối tượng), Video Analytics (phân tích video), Segmentation (phân đoạn ảnh).\n"
            "- 3 giai đoạn xử lý: Acquisition (thu nhận dữ liệu ảnh) -> Process (xử lý) -> Analysis (phân tích).\n\n"
            "5. THƯ VIỆN OPENCV (Slide OpenCV & Slide 33)\n"
            "- OpenCV (Open Source Computer Vision) là một trong những thư viện mã nguồn mở hàng đầu cho thị giác máy tính, machine learning, xử lý ảnh.\n"
            "- Chính thức được ra mắt đầu tiên vào năm 1999, OpenCV là thư viện mã nguồn mở miễn phí cho cả học thuật và thương mại.\n"
            "- Hỗ trợ đa nền tảng gồm: Windows, Linux, Mac OS, iOS và Android.\n"
            "- Được viết bằng C/C++ nên tốc độ tính toán rất nhanh, có thể sử dụng với các ứng dụng thời gian thực.\n"
            "- Hỗ trợ ngôn ngữ lập trình C/C++, Python và Java.\n"
            "- Các tính năng nổi bật của OpenCV: Bộ công cụ hỗ trợ 2D và 3D, Nhận diện khuôn mặt, Nhận diện cử chỉ, "
            "Nhận dạng chuyển động, đối tượng, hành vi, Tương tác giữa con người và máy tính (HCI), Điều khiển Robot, Hỗ trợ thực tế tăng cường (AR)."
        ),
    },
    {
        "course_id": "CS_COMPUTER_VISION",
        "course_name": "Thị Giác Máy Tính (Computer Vision)",
        "material_id": "mat-cv-ch02",
        "file_name": "BaiGiang_Chuong2_XuLyAnhCoBan.pptx",
        "content": (
            "CHƯƠNG 2: XỬ LÝ ẢNH CƠ BẢN VỚI OPENCV\n\n"
            "1. THAY ĐỔI KÍCH THƯỚC ẢNH (RESIZE) (Slide 8 - 9)\n"
            "- Thay đổi kích thước (Zoom in, Zoom out) là một trong những kỹ thuật xử lý ảnh thông dụng.\n"
            "- Ảnh có kích thước lớn sẽ chiếm nhiều bộ nhớ, số lượng tập dữ liệu ảnh thường rất lớn. Do đó cần giảm kích thước ảnh. "
            "Resize là một kỹ thuật phổ biến. Trong OpenCV, sử dụng hàm cv2.resize.\n"
            "- Một số kích thước ảnh ML thường dùng: 32×32, 64×64, 96×96, 256×256.\n"
            "- Phương thức: cv2.resize(src, dsize, interpolation)\n"
            "  + src: ảnh gốc cần thay đổi kích thước.\n"
            "  + dsize (width, height): Kích thước ảnh muốn thay đổi.\n"
            "  + interpolation: chỉ định thuật toán thực hiện resize.\n\n"
            "2. CÁC PHƯƠNG PHÁP NỘI SUY (INTERPOLATION) KHI RESIZE TRONG OPENCV (Slide 10)\n"
            "- INTER_NEAREST – nội suy láng giềng gần nhất.\n"
            "- INTER_LINEAR – nội suy song tuyến tính (mặc định).\n"
            "- INTER_AREA – resampling using pixel area relation. Phương pháp ưu tiên khi thu nhỏ ảnh vì cho kết quả không bị hiện tượng moiré.\n"
            "- INTER_CUBIC – nội suy xoắn bậc 3, trên 4×4 pixel láng giềng.\n"
            "- INTER_LANCZOS4 – nội suy Lanczos trên 8×8 pixel láng giềng.\n"
            "- Quy tắc thông thường: dùng cv.INTER_AREA để thu nhỏ ảnh; dùng cv.INTER_CUBIC và cv.INTER_LINEAR để phóng to ảnh.\n\n"
            "3. XOAY ẢNH (ROTATE) (Slide 21)\n"
            "- OpenCV hỗ trợ phương thức xoay ảnh: cv2.rotate(img, rotateCode)\n"
            "  + img: ảnh gốc muốn xoay.\n"
            "  + rotateCode: các chế độ xoay ảnh:\n"
            "    * cv2.ROTATE_90_CLOCKWISE: Xoay 90 độ theo chiều kim đồng hồ.\n"
            "    * cv2.ROTATE_90_COUNTERCLOCKWISE: Xoay 90 độ ngược chiều kim đồng hồ.\n"
            "    * cv2.ROTATE_180: Xoay ảnh 180 độ (lật ảnh).\n\n"
            "4. LẬT ẢNH (FLIP) (Slide 28)\n"
            "- OpenCV hỗ trợ phương thức lật ảnh: cv2.flip(img, flipCode)\n"
            "  + img: ảnh gốc muốn lật.\n"
            "  + flipCode: các chế độ lật ảnh:\n"
            "    * flipCode = 0: Lật ảnh theo chiều ngang (trục X - lật dọc lên/xuống).\n"
            "    * flipCode > 0: Lật ảnh theo chiều dọc (trục Y - lật ngang trái/phải).\n"
            "    * flipCode < 0: Lật ảnh theo cả chiều dọc (Y) và chiều ngang (X)."
        ),
    },
    {
        "course_id": "CS_COMPUTER_VISION",
        "course_name": "Thị Giác Máy Tính (Computer Vision)",
        "material_id": "mat-cv-ch03",
        "file_name": "BaiGiang_Chuong3_CaiThienAnh_Histogram_Loc.pptx",
        "content": (
            "CHƯƠNG 3: CẢI THIỆN ẢNH, HISTOGRAM VÀ CÁC BỘ LỌC KHÔNG GIAN\n\n"
            "1. CẢI THIỆN ẢNH LÀ GÌ? (Slide 8)\n"
            "- Cải thiện ảnh là quá trình làm cho ảnh trở nên hữu ích hơn. Là quá trình xử lý một hình ảnh để cho kết quả phù hợp hơn với kết quả ban đầu.\n"
            "- Làm nổi các chi tiết cần quan tâm trong ảnh.\n"
            "- Làm cho ảnh trở nên trực quan, hấp dẫn hơn.\n\n"
            "2. PHÂN LOẠI CÁC KIỂU CẢI THIỆN ẢNH (Slide 9)\n"
            "Các kỹ thuật cải thiện ảnh được phân thành 2 nhóm chính:\n"
            "- Các kỹ thuật theo miền không gian: thao tác trực tiếp lên các pixel điểm ảnh. Gồm: Các phép toán trên điểm ảnh, Các bộ lọc, Kỹ thuật Histogram.\n"
            "- Các kỹ thuật theo miền tần số: Ảnh được xem như tín hiệu 2 chiều. Tác động lên tần số để cải thiện chất lượng ảnh (Biến đổi Fourrier, biến đổi sóng...).\n\n"
            "3. CÁC PHÉP TOÁN TRÊN ĐIỂM ẢNH (Slide 11 - 12)\n"
            "- Thao tác xử lý điểm ảnh có dạng công thức: s = T(r)\n"
            "  Trong đó: s là điểm ảnh sau khi xử lý; r là điểm ảnh ban đầu; T là phép toán/hàm xử lý điểm ảnh.\n"
            "- Các phép biến đổi T tiêu biểu:\n"
            "  + Phép đảo ảnh: s = max - r (ví dụ với ảnh mức xám 8-bit: s = 255 - r).\n"
            "  + Phép biến đổi Logarit.\n"
            "  + Phép biến đổi Gamma (Power-Law Transform).\n"
            "  + Cắt ngưỡng (chuyển đổi sang ảnh nhị phân): s = 0 nếu r < 128; s = 255 nếu r >= 128.\n\n"
            "4. BIỂU ĐỒ HISTOGRAM CỦA ẢNH (Slide 35 & 37)\n"
            "- Biểu đồ Histogram của ảnh là một dạng biểu đồ biểu diễn sự phân bố của số lượng điểm ảnh tương ứng với mức độ sáng tối của bức ảnh.\n"
            "- Trục dọc (y): biểu diễn số lượng điểm ảnh, các đỉnh càng cao thì càng có nhiều điểm ảnh ở khu vực đó và độ chi tiết càng nhiều.\n"
            "- Trục ngang (x): tính từ trái qua phải với mốc giá trị từ 0 đến 255 biểu diễn độ sáng của mỗi khu vực ảnh. Gốc giá trị 0 được coi là tối nhất (đen tuyền) trong khi càng dịch sang phải giá trị này càng tăng, ngọn sáng nhất của ánh sáng ở giá trị 255.\n"
            "- Nhận biết ảnh sáng tối qua Histogram:\n"
            "  + Ảnh tối: Histogram nghiêng về bên trái (các pixel có giá trị thấp gần 0).\n"
            "  + Ảnh sáng: Histogram nghiêng về bên phải (các pixel có giá trị cao gần 255).\n\n"
            "5. LỌC TRUNG VỊ (MEDIAN FILTER) (Slide Lọc trung vị)\n"
            "- Khái niệm: Giá trị trung vị X của một tập hợp là giá trị sao cho một nửa giá trị trong tập hợp nhỏ hơn hoặc bằng X và một nửa còn lại lớn hơn hoặc bằng X.\n"
            "- Cách thực hiện: Sắp xếp giá trị của các pixel trong vùng lân cận (có kích thước bằng kích thước bộ lọc). Xác định giá trị trung vị của chúng và gán giá trị cho pixel trong ảnh được lọc.\n\n"
            "6. NHIỄU TRONG ẢNH (NOISE) (Slide Nhiễu trong ảnh)\n"
            "- Khái niệm: Nhiễu xuất hiện trong quá trình thu nhận ảnh, số hoá và truyền ảnh. Cảm biến ảnh có thể bị ảnh hưởng bởi các điều kiện môi trường. Nhiễu có thể can thiệp vào ảnh trong quá trình truyền ảnh, lượng tử hoá và số hoá.\n"
            "- Biểu thức mô hình ảnh nhiễu: g(x,y) = f(x,y) + α(x,y)\n"
            "  Trong đó: f(x,y) là ảnh gốc; α(x,y) là nhiễu; g(x,y) là ảnh sau khi bị nhiễu tác động.\n\n"
            "7. MẶT NẠ LỌC (KERNEL / MASK) VÀ PHÉP NHÂN TÍCH CHẬP (CONVOLUTION) (Slide 33 & 34)\n"
            "- Mặt nạ lọc còn được gọi là kernel, filter, mask, là một ma trận vuông có kích thước 3x3, 4x4, 5x5, 7x7... Mặt nạ lọc di chuyển trên ảnh và thao tác lân cận với điểm ảnh.\n"
            "- Nhân tích chập (Convolution) là cho ma trận ảnh nhân với một ma trận lọc (Kernel). Ma trận lọc còn gọi là cửa sổ chập, cửa sổ lọc, mặt nạ. "
            "Việc nhân ảnh với ma trận lọc giống như việc trượt ma trận lọc theo hàng trên ảnh và nhân với từng vùng của ảnh, cộng các kết quả lại tạo thành kết quả của điểm ảnh trung tâm."
        ),
    },
    {
        "course_id": "CS_COMPUTER_VISION",
        "course_name": "Thị Giác Máy Tính (Computer Vision)",
        "material_id": "mat-cv-ch04",
        "file_name": "BaiGiang_Chuong4_PhatHienBien.pptx",
        "content": (
            "CHƯƠNG 4: PHÁT HIỆN BIÊN TRONG ẢNH (EDGE DETECTION)\n\n"
            "1. KHÁI NIỆM ĐIỂM BIÊN VÀ ĐƯỜNG BIÊN (Slide 5)\n"
            "- Điểm biên: Một điểm ảnh được coi là điểm biên nếu có sự thay đổi nhanh hoặc đột ngột về mức xám (hoặc màu). "
            "Ví dụ: trong ảnh nhị phân, điểm đen được coi là điểm biên nếu lân cận của nó có ít nhất một điểm trắng.\n"
            "- Đường biên còn được gọi là đường bao (boundary): là tập hợp các điểm biên liên tiếp.\n\n"
            "2. Ý NGHĨA VÀ ỨNG DỤNG CỦA PHÁT HIỆN BIÊN (Slide 7)\n"
            "- Ý nghĩa của đường biên: Đường biên là một loại đặc trưng cục bộ tiêu biểu trong phân tích, nhận dạng ảnh. "
            "Người ta sử dụng biên làm phân cách các vùng xám (hoặc màu) cách biệt. Ngược lại, người ta cũng sử dụng các vùng ảnh để tìm phân cách.\n"
            "- 4 Ứng dụng chính của phát hiện biên (Edge detection):\n"
            "  (1) Giảm bớt thông tin không cần thiết trong ảnh mà vẫn giữ nguyên cấu trúc của ảnh.\n"
            "  (2) Trích xuất các đặc tính quan trọng của ảnh như đường cong, góc và đường thẳng.\n"
            "  (3) Nhận dạng các đối tượng, ranh giới và phân đoạn ảnh.\n"
            "  (4) Đóng vai trò quan trọng trong nhận dạng và thị giác máy tính.\n\n"
            "3. PHƯƠNG PHÁP TOÁN HỌC PHÁT HIỆN BIÊN: GRADIENT VÀ LAPLACE (Slide 13)\n"
            "- Theo toán học, điểm biên là nơi điểm ảnh có sự biến đổi mức xám u(x) một cách đột ngột.\n"
            "- Nếu lấy đạo hàm bậc nhất của u(x) -> Gradient.\n"
            "- Nếu lấy đạo hàm bậc hai của u(x) -> Laplace.\n\n"
            "4. PHÁT HIỆN BIÊN BẰNG GRADIENT (Slide 14)\n"
            "- Gradient là một vectơ có các thành phần biểu thị tốc độ thay đổi mức xám của điểm ảnh (theo hai hướng x,y đối với ảnh 2 chiều):\n"
            "  ∆f = [ ∂f(x,y)/∂x , ∂f(x,y)/∂y ] = [ f'_x , f'_y ]\n"
            "  Trong đó xấp xỉ rời rạc:\n"
            "  f'_x ≈ (f(x + dx, y) - f(x,y)) / dx\n"
            "  f'_y ≈ (f(x, y + dy) - f(x,y)) / dy\n"
            "- dx, dy là khoảng cách giữa 2 điểm kế cận theo hướng x,y tương ứng (trong thực tế chọn dx = dy = 1 pixel)."
        ),
    },
    {
        "course_id": "CS_COMPUTER_VISION",
        "course_name": "Thị Giác Máy Tính (Computer Vision)",
        "material_id": "mat-cv-ch05",
        "file_name": "BaiGiang_Chuong5_PhanVungAnh.pptx",
        "content": (
            "CHƯƠNG 5: PHÂN VÙNG ẢNH (IMAGE SEGMENTATION)\n\n"
            "1. GIỚI THIỆU PHÂN VÙNG ẢNH VÀ ỨNG DỤNG (Slide 4)\n"
            "- Phân vùng ảnh (image segmentation) là một kỹ thuật quan trọng trong thị giác máy tính. Đây là tiền đề của quá trình xử lý dữ liệu hình ảnh.\n"
            "- Phân vùng ảnh được ứng dụng trong nhiều lĩnh vực khác nhau như: lĩnh vực hình ảnh y tế (medical imaging), phát hiện và nhận dạng đối tượng, "
            "hệ thống camera giám sát, hệ thống điều khiển giao thông...\n"
            "- Kết quả phân vùng tốt sẽ tạo điều kiện thuận lợi cho các khâu xử lý về sau, đảm bảo tính hiệu quả cao, gia tăng mức độ chính xác, "
            "đồng thời giảm thiểu nguồn lực tính toán.\n\n"
            "2. PHÂN VÙNG ẢNH LÀ GÌ? CƠ CHẾ HOẠT ĐỘNG (Slide 5)\n"
            "- Phân vùng ảnh là một phương pháp mà trong đó, hình ảnh kỹ thuật số được chia thành nhiều nhóm con khác nhau được gọi là segments.\n"
            "- Một cách dễ hiểu, phân vùng ảnh là một quá trình gán nhãn (assigning a label) cho mỗi điểm ảnh trong một bức ảnh, "
            "các điểm ảnh trong cùng một nhãn sẽ có những đặc tính giống nhau về màu sắc, cường độ hoặc kết cấu của ảnh."
        ),
    },
    # =========================================================================
    # KHAI PHÁ DỮ LIỆU & HỌC MÁY (DATA MINING) - LECTURE SLIDES
    # =========================================================================
    {
        "course_id": "CS_DATA_MINING",
        "course_name": "Khai Phá Dữ Liệu & Học Máy (Data Mining)",
        "material_id": "mat-dm-ch01",
        "file_name": "BaiGiang_Chuong1_TongQuanDuLieu.pptx",
        "content": (
            "CHƯƠNG 1: TỔNG QUAN VỀ DỮ LIỆU VÀ KHAI PHÁ DỮ LIỆU\n\n"
            "1. DỮ LIỆU LÀ GÌ? (Slide 1)\n"
            "- Dữ liệu là tập hợp các dữ kiện có thể ở dạng số, chữ, hình ảnh, âm thanh... về một sự kiện hoặc đối tượng nào đó.\n"
            "- Ví dụ: dữ liệu nhiệt độ đo đạc, thông tin căn cước công dân, thẻ bảo hiểm y tế, tin nhắn điện thoại...\n\n"
            "2. PHÂN BIỆT DỮ LIỆU (DATA) VÀ THÔNG TIN (INFORMATION) (Slide 2)\n"
            "- Dữ liệu: là một tập hợp các dữ kiện ở dạng thô, chưa được xử lý về một sự kiện, thực thể hay bất cứ một điều gì khác. "
            "Có thể ở dạng văn bản, hình ảnh, âm thanh... thu thập từ các quan sát, hồ sơ, ghi chép.\n"
            "- Thông tin: là dữ liệu đã được xử lý, phân tích và sắp xếp để có ý nghĩa và mục đích sử dụng cụ thể. "
            "Thông tin giúp người dùng hiểu được bản chất của dữ liệu và đưa ra quyết định phù hợp.\n\n"
            "3. 3 TÍNH CHẤT BẮT BUỘC CỦA DỮ LIỆU VÀ QUÁ TRÌNH XỬ LÝ (Slide 3)\n"
            "- Dữ liệu phải đảm bảo 3 tính chất: (1) Tính chính xác, (2) Tính đầy đủ, (3) Tính thời điểm.\n"
            "- Mô hình: Data -> Processing -> Information.\n"
            "- Ví dụ: Các dữ liệu đo đạc về thời tiết, dữ liệu ảnh vệ tinh... được xử lý (Processing) -> Thông tin dự báo thời tiết.\n\n"
            "4. CÁC NGUỒN CUNG CẤP DỮ LIỆU (SOURCES OF DATA) (Slide 4 - 5)\n"
            "- Lượng dữ liệu khổng lồ đến từ rất nhiều nguồn khác nhau và được tạo ra với tốc độ ngày càng nhanh:\n"
            "  + Dữ liệu hành chính: phát sinh từ chương trình của một tổ chức chính phủ hoặc phi chính phủ như hồ sơ bệnh án điện tử, hồ sơ bảo hiểm, hồ sơ ngân hàng...\n"
            "  + Dữ liệu từ hoạt động thương mại: phát sinh từ hoạt động thương mại như giao dịch tín dụng, giao dịch thương mại điện tử, mua sắm trực tuyến...\n"
            "  + Dữ liệu thông qua đo đạc, thu thập từ thiết bị cảm biến IoT: như cảm biến nhiệt độ, độ ẩm, ánh sáng, cảm biến đường đi, không khí...\n"
            "  + Dữ liệu từ các thiết bị cá nhân: như điện thoại di động, smartwatch, GPS.\n"
            "  + Dữ liệu hành vi: như tìm kiếm trực tuyến sản phẩm dịch vụ.\n"
            "  + Dữ liệu từ các phương tiện truyền thông xã hội.\n\n"
            "5. QUY MÔ DỮ LIỆU TOÀN CẦU VÀ DATA NEVER SLEEP (Slide 6 - 7)\n"
            "- Dữ liệu không bao giờ ngủ - Data Never Sleep: Dữ liệu đang được sinh ra mỗi ngày, mỗi giờ, mỗi phút và mỗi giây.\n"
            "- Ước tính đến năm 2025, sẽ có 463 Exabytes dữ liệu được sinh ra mỗi ngày, lượng dữ liệu dự kiến đạt 180 Zettabytes.\n"
            "- Quy đổi đơn vị: 1 Zettabyte (ZB) ~ 10^3 Exabytes ~ 10^6 Petabytes ~ 10^9 Terabytes ~ 10^12 Gigabytes (GB).\n"
            "- Hình dung trực quan: 1 ZB quy đổi nặng tương đương 10 tỷ xe tải hoặc 500.000 tàu sân bay; trung bình mỗi cư dân trên thế giới nhận 10.000 cuốn sách; "
            "xếp chồng số sách đó chiều cao sẽ khoảng 5 lần quãng đường từ Trái Đất đến Mặt Trời.\n\n"
            "6. TẦM QUAN TRỌNG CỦA DỮ LIỆU - 'DATA IS THE NEW GOLD' (Slide 8 - 9)\n"
            "- 'Dữ liệu là nguồn tài nguyên quý của Quốc gia, là động lực, nguồn lực cho sự phát triển trong kỷ nguyên số' (TT Phạm Minh Chính - 25/02/2023).\n"
            "- 'Chìa khóa của đổi mới sáng tạo trong chuyển đổi số là dữ liệu và kết nối' (Bộ Thông tin và Truyền thông).\n"
            "- 'Data is the new gold' - Dữ liệu là tài sản: Dữ liệu ngày càng trở nên quan trọng và đặc biệt hữu ích cho dù ở lĩnh vực hay bất kỳ ngành nghề nào. "
            "Khai thác dữ liệu tốt sẽ đóng vai trò quyết định giúp cho các tổ chức, tập đoàn đưa ra các giải pháp ngắn hạn nhanh chóng và kịp thời, "
            "cũng như xây dựng và triển khai các chiến lược phát triển hợp lý trong tương lai.\n\n"
            "7. CÁC LOẠI DỮ LIỆU CƠ BẢN THEO CẤU TRÚC (Slide 10 - 14)\n"
            "- Dữ liệu có cấu trúc (Structured Data): Là dạng dữ liệu được tổ chức và phân loại theo một cấu trúc xác định, định dạng chuẩn hóa "
            "để con người và phần mềm dễ dàng truy cập, tìm kiếm, phân tích. Thường lưu trữ ở dạng bảng (hàng và cột, Excel, CSDL quan hệ). Chiếm 10-20% dữ liệu thực tế.\n"
            "- Dữ liệu phi cấu trúc (Unstructured Data): Là dạng dữ liệu không có mô hình dữ liệu, lược đồ xác định trước hoặc chưa được sắp xếp theo cấu trúc định sẵn. "
            "Do không có quy tắc rõ ràng nên khó truy cập và phân tích hơn (VD: văn bản tự do, video, âm thanh, email, MXH). Chiếm 80-90% tổng lượng dữ liệu.\n"
            "- Dữ liệu bán cấu trúc (Semi-structured Data): Nằm giữa có cấu trúc và phi cấu trúc, thiếu mô hình bảng cụ thể nhưng sử dụng các thẻ nhãn nội bộ (tags, key-value) "
            "giúp bóc tách thông tin dễ hơn phi cấu trúc. Phổ biến: XML, JSON, tập tin log.\n\n"
            "8. PHÂN LOẠI DỮ LIỆU: ĐỊNH TÍNH VÀ ĐỊNH LƯỢNG (Slide 15 - 19)\n"
            "- Cây phân cấp (Types of Data): Data -> Categorical/Qualitative (Nominal, Ordinal) và Numerical/Quantitative (Discrete, Continuous).\n"
            "- Dữ liệu định tính (Qualitative Data): Không thể đo lường bởi các con số (tên, giới tính, màu sắc, cảm xúc...).\n"
            "  + Dữ liệu định danh (Nominal data): Nhãn mô tả, phân loại đối tượng, chỉ dùng phép toán = hoặc != (VD: Màu sắc Xanh, Đỏ, Vàng; Tên người).\n"
            "  + Dữ liệu nhị phân (Binary data): Trường hợp đặc biệt của định danh chỉ có đúng 2 giá trị (Y/N, 0/1, T/F).\n"
            "  + Dữ liệu trật tự (Ordinal data): Nhãn có thứ tự sắp xếp, áp dụng thêm các phép toán >, <, >=, <= (VD: Học vị B.Sc < M.Sc < Ph.D; Hạnh kiểm Kém, TB, Khá, Giỏi).\n"
            "- Dữ liệu định lượng (Quantitative Data): Có thể đo lường bởi con số và tính toán số học (+, -, *, /).\n"
            "  + Dữ liệu rời rạc (Discrete data): Đo lường được số lượng giá trị hữu hạn, đại diện bởi số nguyên (VD: Tuổi - Age, số học sinh, số bàn thắng).\n"
            "  + Dữ liệu liên tục (Continuous data): Đo lường được giá trị vô hạn trong một khoảng, đại diện bởi số thực (VD: Mức lương - Salary, chiều cao, cân nặng, vận tốc)."
        ),
    },
    {
        "course_id": "CS_DATA_MINING",
        "course_name": "Khai Phá Dữ Liệu & Học Máy (Data Mining)",
        "material_id": "mat-dm-ch01b",
        "file_name": "BaiGiang_Chuong1_DinhNghia_BuocThucHien_UngDung.pptx",
        "content": (
            "CHƯƠNG 1 (tiếp theo): ĐỊNH NGHĨA KPDL, CÁC BƯỚC THỰC HIỆN VÀ ỨNG DỤNG\n\n"
            "1. ĐỊNH NGHĨA KHAI PHÁ DỮ LIỆU (Slide 20-22)\n"
            "- Khai phá dữ liệu (đôi khi còn gọi là khám phá tri thức) là một quá trình phân tích dữ liệu theo nhiều khía cạnh và tổng hợp nó lại "
            "để có được thông tin hữu ích hay tri thức. Như vậy có thể coi nó là bước quan trọng nhất trong quá trình phát hiện tri thức (insight).\n"
            "- [Data Mining: A process used by companies to turn raw data into useful information]\n"
            "- Theo J.Han và M.Kamber (2006) Data Mining Concepts and Techniques, Elsevier Inc, 2006:\n"
            "  + Quan niệm 1: Khai phá dữ liệu (Data Mining) là quá trình trích chọn ra tri thức từ trong một tập hợp rất lớn dữ liệu. "
            "Khai phá dữ liệu = Phát hiện tri thức từ dữ liệu (KDD: Knowledge Discovery From Data).\n"
            "  + Quan niệm 2: Khai phá dữ liệu là một bước quan trọng trong quá trình phát hiện tri thức từ dữ liệu (KDD).\n"
            "- Hà Quang Thụy và các tác giả (2009) Giáo trình Khai phá dữ liệu Web, NXB Giáo dục, 2009:\n"
            "  Khái niệm: Phát hiện tri thức trong cơ sở dữ liệu (đôi khi còn được gọi là khai phá dữ liệu) là một quá trình không tầm thường nhằm "
            "phát hiện ra những mẫu có giá trị, mẫu mới, hữu ích tiềm năng và có thể hiểu được từ dữ liệu.\n"
            "- DATA MINING - QUY TRÌNH KHAI PHÁ 'KIM CƯƠNG' TỪ DỮ LIỆU.\n\n"
            "2. CÁC BƯỚC THỰC HIỆN KPDL (KPDL PROCESS) (Slide 23-24)\n"
            "- Bước 3: Chuẩn bị dữ liệu (Preparation):\n"
            "  + Dữ liệu thu thập được đều là dữ liệu thô (Raw Data), chứa rất nhiều nhiều (noise), dữ liệu thiếu, dữ liệu sai định dạng, "
            "không nhất quán... Dữ liệu này không thể phân tích được → Cần phải được tiền xử lý và làm sạch.\n"
            "  + Là bước quan trọng, chiếm nhiều thời gian và nguồn lực nhất trong bất kỳ dự án phân tích dữ liệu nào (80%).\n"
            "- Bước 4: Xây dựng mô hình (Modeling):\n"
            "  + Chúng ta chọn và xây dựng các mô hình khai thác dữ liệu (data mining models) để giải quyết các câu hỏi, vấn đề "
            "phục vụ cho mục tiêu cốt lõi đã xác định ở bước trước.\n"
            "  + Tùy thuộc vào từng bài toán cụ thể như: phân lớp (classification), hồi quy (regression/prediction), "
            "phân cụm (clustering), phân hạng (ranking) để lựa chọn thuật toán trong ứng dụng giúp giải quyết vấn đề.\n"
            "  + Sơ đồ Data Mining: Predictive (Classification, Regression, Time Series Analysis) và Descriptive (Clustering, Summarization, "
            "Association Rules, Sequence Discovery).\n\n"
            "3. ỨNG DỤNG CỦA KHAI PHÁ DỮ LIỆU (Slide 25-28)\n"
            "- Phân tích dữ liệu tài chính (Financial Data Analysis):\n"
            "  + Dự đoán khả năng vay và thanh toán của khách hàng, phân tích chính sách tín dụng đối với khách hàng.\n"
            "  + Phân tích hành vi khách hàng (vay, gửi tiền).\n"
            "  + Phân loại và phân nhóm khách hàng mục tiêu cho tiếp thị tài chính.\n"
            "  + Phát hiện các hoạt động rửa tiền và tội phạm tài chính khác.\n"
            "- Công nghiệp bán lẻ (Retail Industry):\n"
            "  + Khai phá dữ liệu trên kho dữ liệu khách hàng.\n"
            "  + Phân tích đa chiều trong kho dữ liệu khách hàng về doanh số bán hàng, khách hàng, sản phẩm, thời gian và khu vực.\n"
            "  + Phân tích hiệu quả của các chiến dịch bán hàng, Marketing.\n"
            "  + Quản trị mối quan hệ khách hàng (CRM).\n"
            "  + Giới thiệu và tư vấn sản phẩm phù hợp cho khách hàng.\n"
            "- Công nghiệp viễn thông (Telecommunication Industry):\n"
            "  + Phân tích dữ liệu đa chiều viễn thông.\n"
            "  + Xây dựng các mô hình phát hiện gian lận.\n"
            "  + Phát hiện bất thường trong giao dịch viễn thông.\n"
            "  + Phân tích hành vi sử dụng dịch vụ viễn thông của khách hàng.\n"
            "  + Sử dụng các công cụ trực quan trong phân tích dữ liệu viễn thông.\n"
            "- Phân tích dữ liệu sinh học (Biological Data Analysis):\n"
            "  Khai phá dữ liệu sinh học là một phần rất quan trọng của lĩnh vực Tin - Sinh học (Bioinformatics). "
            "Các ứng dụng trong sinh học:\n"
            "  + Lập chỉ mục, tìm kiếm tương tự, bất thường trong cơ sở dữ liệu Gen.\n"
            "  + Xây dựng mô hình khai phá các mạng di truyền và cấu trúc của Gen, protein.\n"
            "  + Xây dựng các công cụ trực quan trong phân tích dữ liệu di truyền."
        ),
    },
    {
        "course_id": "CS_DATA_MINING",
        "course_name": "Khai Phá Dữ Liệu & Học Máy (Data Mining)",
        "material_id": "mat-dm-clustering",
        "file_name": "BaiGiang_PhanCumDuLieu_KMeans.pptx",
        "content": (
            "CHƯƠNG: TỔNG QUAN VỀ PHÂN CỤM DỮ LIỆU VÀ THUẬT TOÁN K-MEANS\n\n"
            "1. TỔNG QUAN VỀ PHÂN CỤM DỮ LIỆU (CLUSTERING) (Slide 29-30)\n"
            "- Phân cụm dữ liệu (Clustering) là một kỹ thuật trong khai phá dữ liệu (Data mining) nhằm tìm kiếm, "
            "phát hiện các cụm, các mẫu dữ liệu tự nhiên tiềm ẩn, quan tâm trong tập dữ liệu lớn, từ đó cung cấp thông tin, "
            "tri thức hữu ích cho ra quyết định.\n"
            "- [What is Clustering? Grouping same objects/data sets (as per characteristics) -> Identifying structures & patterns "
            "-> Allowing business to get deeper comprehension].\n"
            "- Phân cụm (Clustering) được sử dụng để nhóm các đối tượng dữ liệu lại với nhau dựa trên mức độ tương đồng giữa chúng.\n\n"
            "2. MỤC TIÊU CỦA PHÂN CỤM VÀ TIÊU CHÍ ĐÁNH GIÁ (Slide 31-32)\n"
            "- Mục tiêu của phân cụm:\n"
            "  + Tìm kiếm các nhóm dữ liệu tự nhiên: Tìm các cụm đối tượng sao cho các đối tượng trong cùng một cụm có tính tương đồng cao hơn so với các đối tượng trong các cụm khác.\n"
            "  + Khám phá cấu trúc dữ liệu ẩn: Xác định các mẫu ẩn hoặc các đặc điểm chung giữa các đối tượng dữ liệu mà không cần thông tin nhãn.\n"
            "  + Phân tích dữ liệu: Hỗ trợ các nhà phân tích dữ liệu trong việc khám phá các đặc điểm tiềm ẩn và phát hiện các mối quan hệ phức tạp giữa tập các biến số.\n"
            "- Tiêu chí đánh giá chất lượng phân cụm:\n"
            "  + Phân cụm không dựa trên 1 tiêu chuẩn chung nào, mà dựa vào tiêu chí mà người dùng cung cấp trong từng trường hợp.\n"
            "  + Khoảng cách/sự khác biệt giữa các cụm: Cần được CỰC ĐẠI HÓA (Inter-cluster distance maximization).\n"
            "  + Khoảng cách/sự khác biệt bên trong một cụm: Cần được CỰC TIỂU HÓA (Intra-cluster distance minimization).\n\n"
            "3. THUẬT TOÁN K-MEANS (Slide 33-34)\n"
            "- K-Means là thuật toán quan trọng và phổ biến trong kỹ thuật phân cụm dữ liệu.\n"
            "- Ý tưởng chính của thuật toán K-Means là tìm cách phân nhóm các đối tượng (Objects) đã cho vào k cụm (k là số các cụm được xác định trước, k là số nguyên dương) "
            "sao cho tổng bình phương khoảng cách giữa các đối tượng đến tâm nhóm (centroid) là nhỏ nhất.\n"
            "- Mỗi cụm được gán với một trung tâm (centroid).\n"
            "- Mỗi điểm dữ liệu được gán với một cụm nếu nó gần trung tâm của cụm đó nhất.\n"
            "- Số k các cụm cần được chỉ rõ trước khi chạy thuật toán.\n"
            "- Đầu vào:\n"
            "  + Tập các điểm dữ liệu biểu diễn các đối tượng X = {x1, x2, ..., xn}.\n"
            "  + Số lượng cụm k (số lượng cụm mong muốn).\n"
            "- Đầu ra:\n"
            "  + Tâm cụm (centroid): Tập k - {c1, c2, ...ck} tâm tương ứng của mỗi cụm.\n"
            "  + Nhãn của các cụm: Mỗi điểm dữ liệu trong tập đầu vào được gán một nhãn, chỉ ra nó thuộc cụm nào."
        ),
    },
]




