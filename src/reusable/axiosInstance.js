import axios from 'axios';

const axiosInstance = axios.create({
    // URL gốc của Spring Boot server
    baseURL: `http://localhost:8080/api`,
});

/**
 * Interceptor (Bộ chặn) này sẽ chạy TRƯỚC MỖI REQUEST.
 * Nó sẽ lấy token từ localStorage và đính kèm vào header.
 */
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

/**
 * (Tùy chọn - Nâng cao)
 * Interceptor này xử lý lỗi. Nếu nhận lỗi 401 (Unauthorized),
 * nó có thể tự động logout user và redirect về trang login.
 */
axiosInstance.interceptors.response.use((response) => {
    // Nếu request thành công, chỉ trả về data
    return response;
}, (error) => {
    if (error.response && error.response.status === 401) {
        // Token hết hạn hoặc không hợp lệ
        console.error("Lỗi 401: Unauthorized. Đang đăng xuất...");

        // Xóa token hỏng
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // Báo cho các tab khác biết (nếu bạn dùng event listener)
        window.dispatchEvent(new Event('authChange'));

        // Redirect về trang login
        window.location.href = '/login';
    }
    return Promise.reject(error);
});


export default axiosInstance;