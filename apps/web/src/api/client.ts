import axios from 'axios';
import { message } from 'antd';

export const apiClient = axios.create({
  baseURL: '/api',
});

// Gắn JWT token vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý lỗi 401 tự động điều hướng về login, 403 báo quyền truy cập
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      message.error(
        'Bạn không có quyền truy cập chức năng này (Tài nguyên chỉ dành cho Quản trị viên / HR)',
      );
    } else {
      const msg = error.response?.data?.message || 'Đã có lỗi xảy ra';
      message.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
    return Promise.reject(error);
  },
);
