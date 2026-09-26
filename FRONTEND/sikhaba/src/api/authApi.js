import axiosInstance from './axiosInstance';

export const signup = (data) => axiosInstance.post('/auth/signup', data);
export const login = (data) => axiosInstance.post('/auth/login', data);
export const sendOtp = (phone) => axiosInstance.post('/auth/otp/send', { phone });
export const verifyOtp = (data) => axiosInstance.post('/auth/otp/verify', data);
export const getMyProfile = () => axiosInstance.get('/auth/me');
export const updateProfile = (data) => axiosInstance.put('/auth/me', data);