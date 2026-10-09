import { io } from 'socket.io-client';

let socket = null;

export const initSocket = () => {
  if (socket) return socket;
  socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000', {
    withCredentials: true,
    transports: ['websocket']
  });
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
