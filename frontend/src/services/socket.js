import { io } from "socket.io-client";
import { SERVER_URL } from "./api";

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"]
});

export const connectSocket = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  socket.auth = { token };
  if (!socket.connected) socket.connect();
  return true;
};

export const disconnectSocket = () => {
  if (socket.connected) socket.disconnect();
};
