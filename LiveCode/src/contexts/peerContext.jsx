import {
  useContext,
  createContext,
  useMemo,
  useEffect,
  useState,
  useRef,
} from "react";

const peerContext = createContext();

export const PeerProvider = (props) => {
  const peersRef = useRef(new Map());
  const [remoteStreams, setRemoteStreams] = useState([]);

  const createNewConnection = ({ remoteEmail, stream, socket }) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
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

    // const remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams((prev) => {
        if (prev.find((item) => item.id === remoteEmail)) {
          return prev;
        }
        return [...prev, { id: remoteEmail, stream: remoteStream }];
      });
    };

    peersRef.current.set(remoteEmail, pc);
  };

  const createOffer = async ({ remoteEmail }) => {
    const pc = peersRef.current.get(remoteEmail);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  };

  const createAnswer = async ({ remoteEmail, offer }) => {
    const pc = peersRef.current.get(remoteEmail);
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  };

  const setAnswer = async ({ fromEmail, answer }) => {
    const pc = peersRef.current.get(fromEmail);
    await pc.setRemoteDescription(answer);
  };

  const addIceCandidate = async ({ fromEmail, candidate }) => {
    const pc = peersRef.current.get(fromEmail);
    if (pc) {
      await pc.addIceCandidate(candidate);
    }
  };

  const leaveMeeting = () => {
    peersRef.current.forEach((pc) => pc.close());

    peersRef.current.clear();
    setRemoteStreams([]);
  };
  const leaveMeetingPeer = ({ email }) => {
    console.log(email, "wants to leave");
    const pc = peersRef.current.get(email);
    if (!pc) return;
    console.log(pc, "pc");
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
