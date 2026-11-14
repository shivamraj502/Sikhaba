import axiosInstance from './axiosInstance';

export const getPlans = () => axiosInstance.get('/subscription/plans');
export const getMySubscription = () => axiosInstance.get('/subscription/me');
export const createOrder = (plan) => axiosInstance.post('/subscription/create-order', { plan });
export const verifyPayment = (data) => axiosInstance.post('/subscription/verify', data);