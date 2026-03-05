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

  // queue to store ice candidates until remote description is set
  const candidateQueue = useRef(new Map());

  const createNewConnection = ({ remoteEmail, stream, socket }) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        // ADD A TURN SERVER HERE FOR PROD
        // { urls: "turn:your-turn-server.com", username: "user", credential: "pwd" }
      ],
    });

    // 1. Set Listeners FIRST
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          email: remoteEmail,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      setRemoteStreams((prev) => {
        if (prev.find((item) => item.id === remoteEmail)) return prev;
        return [...prev, { id: remoteEmail, stream: remoteStream }];
      });
    };

    // 2. Add tracks SECOND
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    peersRef.current.set(remoteEmail, pc);

    // 3. Check if there were pending candidates for this specific email
    if (candidateQueue.current.has(remoteEmail)) {
      flushCandidates(remoteEmail);
    }
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

    // flush queued candidates
    flushCandidates(remoteEmail);

    return answer;
  };

  const setAnswer = async ({ fromEmail, answer }) => {
    const pc = peersRef.current.get(fromEmail);

    await pc.setRemoteDescription(answer);

    // flush queued candidates
    flushCandidates(fromEmail);
  };

  const addIceCandidate = async ({ fromEmail, candidate }) => {
    const pc = peersRef.current.get(fromEmail);

    if (!pc) return;

    // if remote description exists, add immediately
    if (pc.remoteDescription && pc.remoteDescription.type) {
      await pc.addIceCandidate(candidate);
    } else {
      // otherwise store candidate in queue
      if (!candidateQueue.current.has(fromEmail)) {
        candidateQueue.current.set(fromEmail, []);
      }
      candidateQueue.current.get(fromEmail).push(candidate);
    }
  };

  const flushCandidates = async (email) => {
    const pc = peersRef.current.get(email);
    const queued = candidateQueue.current.get(email);

    if (!pc || !queued) return;

    for (const candidate of queued) {
      await pc.addIceCandidate(candidate);
    }

    candidateQueue.current.delete(email);
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
