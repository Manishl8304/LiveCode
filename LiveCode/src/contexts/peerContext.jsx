import {
  useContext,
  createContext,
  useMemo,
  useEffect,
  useState,
  useRef,
} from "react";
import { FaRoadCircleExclamation } from "react-icons/fa6";

const peerContext = createContext();

export const PeerProvider = (props) => {
  const peersRef = useRef(new Map());
  const [remoteStreams, setRemoteStreams] = useState([]);
  const pendingCandidates = useRef(new Map());

  const createNewConnection = async ({ remoteEmail, stream, socket }) => {

    let iceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
    ];
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/turn-credentials`);
      iceServers = await res.json();
      console.log("Fetched fresh ICE servers:", iceServers);
    } catch (err) {
      console.warn("Failed to fetch TURN credentials, using STUN fallback:", err);
    }

    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10,
    });

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate && remoteEmail) {
        socket.emit("ice-candidate", {
          email: remoteEmail,
          candidate: event.candidate,
        });
      }
    };

    // this function is fired when another side of connection adds their stream
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => {
        const existing = prev.find((p) => p.id === remoteEmail);

        if (existing) {
          // FIX: Old code mutated stream in-place — React couldn't detect the change
          // since the object reference stayed the same, causing inconsistent re-renders
          // existing.stream.addTrack(event.track);
          // return [...prev];

          // NEW: Create a new MediaStream with all existing + new tracks
          // This gives React a new object reference so it properly re-renders
          const newStream = new MediaStream([
            ...existing.stream.getTracks(),
            event.track,
          ]);
          return prev.map((p) =>
            p.id === remoteEmail ? { ...p, stream: newStream } : p
          );
        }

        const newStream = new MediaStream();
        newStream.addTrack(event.track);

        return [...prev, { id: remoteEmail, stream: newStream }];
      });
    };

    pc.onconnectionstatechange = () => {
      console.log("connection state:", pc.connectionState);
    };

    peersRef.current.set(remoteEmail, pc);
  };

  /*
  Input: remoteEmail(email of new user entered)
  OutPut: offer
  Description: 
   - fetches pc from map
   - creates offer
   - stores offer in local Description
  */
  const createOffer = async ({ remoteEmail }) => {
    const pc = peersRef.current.get(remoteEmail);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  };

  /*
  Input: remoteEmail(email of remote user who calls), offer
  OutPut: answer
  Description: 
   - fetches pc from map
   - sets offer in remote description
   - creates answer
   - sets answer in local description
  */
  const createAnswer = async ({ remoteEmail, offer }) => {
    const pc = peersRef.current.get(remoteEmail);
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    const buffers = pendingCandidates.current.get(remoteEmail) || [];

    for (const buffer of buffers) {
      await pc.addIceCandidate(buffer);
    }
    pendingCandidates.current.delete(remoteEmail);
    return answer;
  };

  const setAnswer = async ({ fromEmail, answer }) => {
    const pc = peersRef.current.get(fromEmail);
    await pc.setRemoteDescription(answer);

    const buffers = pendingCandidates.current.get(fromEmail) || [];

    for (const buffer of buffers) {
      await pc.addIceCandidate(buffer);
    }
    pendingCandidates.current.delete(fromEmail);
  };

  const addIceCandidate = async ({ fromEmail, candidate }) => {
    const pc = peersRef.current.get(fromEmail);
    // FIX: If PC doesn't exist yet (because createNewConnection is awaiting TURN creds),
    // we MUST buffer the candidates instead of dropping them
    
    if (!pc || !pc.remoteDescription) {
      // Buffer it until PC is created AND remote description is set
      const buffer = pendingCandidates.current.get(fromEmail) || [];
      buffer.push(candidate);
      pendingCandidates.current.set(fromEmail, buffer);
      return;
    }
    await pc.addIceCandidate(candidate);
  };

  const leaveMeeting = () => {
    peersRef.current.forEach((pc) => pc.close());

    peersRef.current.clear();
    setRemoteStreams([]);
  };
  
  const leaveMeetingPeer = ({ email }) => {
    const pc = peersRef.current.get(email);
    if (!pc) return;
    peersRef.current.delete(email);
    pc.close();
    setRemoteStreams((prev) => prev.filter((stream) => stream.id != email));
  };

  return (
    <peerContext.Provider
      value={{
        createOffer,
        createAnswer,
        setAnswer,
        remoteStreams,
        createNewConnection,
        addIceCandidate,
        leaveMeeting,
        leaveMeetingPeer,
      }}
    >
      {props.children}
    </peerContext.Provider>
  );
};

export const usePeer = () => useContext(peerContext);
