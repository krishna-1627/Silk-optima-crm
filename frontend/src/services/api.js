import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
});

api.interceptors.request.use((config) => {
    try {
        const token =
            window?.localStorage?.getItem("silk-optima-token") ||
            window?.sessionStorage?.getItem("silk-optima-token") ||
            window?.localStorage?.getItem("auth_token") ||
            window?.sessionStorage?.getItem("auth_token");
        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    } catch (e) {
        // ignore storage errors
    }
    return config;
});

export default api;