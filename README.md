# Inventory Management — Frontend

Ứng dụng **React + Vite + TypeScript + Axios**: form nhập kho (mã phiếu, NCC, ngày, bảng sản phẩm có thêm/xóa dòng).

## Cấu trúc `src/` (theo mô-đun / trang)

```
src/
├── components/          # UI theo domain
│   ├── common/          # Dùng chung (modal import, phiếu, bảng dòng…)
│   ├── home/
│   ├── auth/
│   ├── inbound/
│   ├── outbound/
│   ├── catalog/
│   └── stockAudit/
├── pages/               # Lớp “trang” / điều hướng nội bộ
│   ├── Auth/
│   ├── Home/
│   └── inventory/
├── layouts/             # Bọc layout (mở rộng sau)
├── hooks/               # Hook dùng chung (vd. useAuth)
├── services/            # Gọi HTTP / kiểu API (trước là `api/`)
├── store/               # Trạng thái persistence nhẹ (vd. auth mock)
├── styles/              # CSS toàn cục (`index.css`)
├── utils/
├── data/                # Mock dữ liệu UI
├── App.tsx
└── main.tsx
```

## Cấu hình

```bash
cp .env.example .env
```

Mặc định gọi API qua **Vite proxy** tới `http://localhost:3000` với đường dẫn `/api/...`, nên `.env` có thể để trống `VITE_API_BASE_URL`.

**Đăng nhập dev** (backend đã chạy `database/init.sql`): tên đăng nhập **`admin`**, mật khẩu **`admin123`**.

Nếu gọi trực tiếp (không proxy), set:

```env
VITE_API_BASE_URL=http://localhost:3000
```

## Chạy local

Backend phải chạy trước (port 3000) và CORS đã mở cho `http://localhost:5173`.

```bash
npm install
npm run dev
```

Mở **http://localhost:5173**

## Tính năng

- Validation form (mã, NCC, ngày, từng dòng sản phẩm).
- Trạng thái loading khi tải danh mục / gửi phiếu.
- Hiển thị lỗi từ API (`message`).
- Bảng dòng: thêm/xóa, thành tiền theo dòng, ước tính tổng.
- Danh sách phiếu: lọc, phân trang, cột trạng thái; xác nhận nháp từ bảng.
- Form: lưu nháp / đã xác nhận, đính kèm URL (https).
- Cảnh báo lệch SL chứng từ vs thực nhập trên từng dòng.
- Chi tiết: in phiếu (cửa sổ in), liên kết đính kèm, xác nhận nếu đang nháp.

## Build production

```bash
npm run build
npm run preview
```

## Cấu trúc gợi ý

```
src/
├── api/          # Axios + gọi REST
├── components/   # UI tái sử dụng
├── utils/
├── App.tsx
└── main.tsx
```
