import axiosInstance from './axiosInstance';

export const getLiveRooms = () => axiosInstance.get('/rooms');
export const createRoom = (data) => axiosInstance.post('/rooms', data);
export const joinRoom = (roomId) => axiosInstance.post(`/rooms/${roomId}/join`);
export const leaveRoom = (roomId) => axiosInstance.post(`/rooms/${roomId}/leave`);
export const endRoom = (roomId) => axiosInstance.post(`/rooms/${roomId}/end`);
export const requestToSpeak = (roomId) => axiosInstance.post(`/rooms/${roomId}/speak-request`);
export const getPendingRequests = (roomId) => axiosInstance.get(`/rooms/${roomId}/speak-requests`);
export const respondToRequest = (roomId, requestId, approve) =>
  axiosInstance.post(`/rooms/${roomId}/speak-requests/${requestId}/respond`, { approve });