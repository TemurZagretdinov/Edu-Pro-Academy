import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !error.config?.url?.includes("/auth/login")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth_user");
      const path = window.location.pathname;
      const loginPath = path.startsWith("/teacher") ? "/teacher/login" : path.startsWith("/student") ? "/student/login" : "/admin/login";
      window.location.assign(loginPath);
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Backend server bilan aloqa yo'q. Backend ishga tushganini tekshiring.";
    if (error.response.status === 401) return "Email yoki parol noto'g'ri";
    if (error.response.status === 403) return "Sizda bu bo'limga kirish huquqi yo'q";
    if (error.response.status === 404) return "So'ralgan API endpoint topilmadi";
    if (error.response.status === 422) return "Forma ma'lumotlari noto'g'ri yuborildi";
    if (error.response.status >= 500) {
      const detail = error.response.data?.detail;
      return typeof detail === "string" ? detail : "Backendda xatolik yuz berdi";
    }

    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((item) => item.msg).join(", ");
    if (error.response) return `Request failed with status ${error.response.status}`;
    return error.message;
  }
  return "Unexpected error";
}

export function getResponseStatus(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}

export function getAuthErrorMessage(error: unknown) {
  const status = getResponseStatus(error);

  if (status === 422) return "Forma ma'lumotlari noto'g'ri yuborildi";
  if (status === 401) return "Email yoki parol noto'g'ri";
  if (status === 409) return "Admin allaqachon yaratilgan";

  return getErrorMessage(error);
}
