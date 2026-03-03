import { createContext, useContext, useMemo } from "react";
import { io } from "socket.io-client";
const socketContext = createContext();
export const SocketProvider = ({ children }) => {
  const socket = useMemo(() => io(import.meta.env.VITE_BACKEND_URL), []);
  return (
    <socketContext.Provider value={socket}>{children}</socketContext.Provider>
  );
};

export const useSocket = () => useContext(socketContext);
