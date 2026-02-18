import "./App.css";
import AppRoutes from "./routes/appRoutes.jsx";
import { SocketProvider } from "./contexts/socketContext.jsx";
import { PeerProvider } from "./contexts/peerContext.jsx";
import { useAuth } from "./contexts/authContext.jsx";
function App() {
  return (
    <>
      <SocketProvider>
        <PeerProvider>
          <AppRoutes />
        </PeerProvider>
      </SocketProvider>
    </>
  );
}

export default App;
