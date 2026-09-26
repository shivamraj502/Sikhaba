import axiosInstance from './axiosInstance';

export const getMySubscription = () => axiosInstance.get('/subscription/me');