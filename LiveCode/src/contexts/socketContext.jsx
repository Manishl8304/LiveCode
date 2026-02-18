import { createContext, useContext, useMemo } from "react";
import { io } from "socket.io-client";
const socketContext = createContext();
export const SocketProvider = ({ children }) => {
  console.log("in socket provider");
  const socket = useMemo(() => io("http://localhost:8001"), []);
  console.log("csocke", socket);
  return (
    <socketContext.Provider value={socket}>{children}</socketContext.Provider>
  );
};

export const useSocket = () => useContext(socketContext);
