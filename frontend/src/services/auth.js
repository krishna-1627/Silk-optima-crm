import api from './api';

export async function loginUser(payload) {
    const { data } = await api.post('/login', payload);
    return data;
}

export async function loginAdmin(payload) {
    const { data } = await api.post('/api/admin/login', payload);
    return data;
}

export async function registerUser(payload) {
    const { data } = await api.post('/register', payload);
    return data;
}

export async function fetchCurrentUser() {
    const { data } = await api.get('/me');
    return data;
}

export async function updateCurrentUser(payload) {
    const { data } = await api.patch('/me', payload);
    return data;
}

export async function sendForgotPasswordOtp(payload) {
    const { data } = await api.post('/forgot-password/send-otp', payload);
    return data;
}

export async function verifyForgotPasswordOtp(payload) {
    const { data } = await api.post('/forgot-password/verify-otp', payload);
    return data;
}

export async function resetForgotPassword(payload) {
    const { data } = await api.post('/forgot-password/reset', payload);
    return data;
}

export const sendRegisterOtp = async(data) => {
    const response = await api.post('/register/send-otp', data);
    return response.data;
};

export const verifyRegisterOtp = async(data) => {
    const response = await api.post('/register/verify-otp', data);
    return response.data;
};