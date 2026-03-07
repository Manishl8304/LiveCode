import React, { useState, useCallback } from "react";
import { useEffect, useRef } from "react";
import { useSocket } from "../../contexts/socketContext";
import { usePeer } from "../../contexts/peerContext";
import Editor from "@monaco-editor/react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/authContext";
import styles from "./MeetingRoom.module.css";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";
import { MdVideocam, MdVideocamOff } from "react-icons/md";
import { MdCallEnd } from "react-icons/md";

const RemoteVideo = ({ peer, className }) => {
  const videoRef = useRef(null);
  const [playError, setPlayError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !peer.stream) return;

    const playStream = async () => {
      try {
        if (video.srcObject !== peer.stream) {
          video.srcObject = peer.stream;
        }
        await video.play();
        setPlayError(false);
        console.log("remote stream has been set")
      } catch (err) {
        console.warn("Autoplay blocked:", err);
        setPlayError(true);
      }
    };

    playStream();
  }, [peer.stream]);

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      <video ref={videoRef} className={className} autoPlay playsInline />
      {playError && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            zIndex: 10,
          }}
        >
          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current
                  .play()
                  .then(() => setPlayError(false))
                  .catch((e) => console.error(e));
              }
            }}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              backgroundColor: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
            }}
          >
            Click to Play Stream
          </button>
        </div>
      )}
    </div>
  );
};

export const MeetingRoom = () => {
  const navigate = useNavigate();

  const socket = useSocket();
  const user = useAuth();

  const [code, setCode] = useState("// Start coding...");
  const isRemoteChange = useRef(false);

  // mystreams
  const [myStream, setMyStream] = useState(null);
  const [micOn, setMicOn] = useState(false);
  const [camOn, setCamOn] = useState(false);

  const {
    createOffer,
    createAnswer,
    setAnswer,
    remoteStreams,
    createNewConnection,
    addIceCandidate,
    leaveMeeting,
    leaveMeetingPeer,
  } = usePeer();

  const params = useParams();
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // to fetch media on first mountung of meeting page, as meeting waiting room consists of media
  useEffect(() => {
    const init = async () => {
      await getUserMediaStream();
    };
    init();
  }, []);

  // set mystream state to myvideo ref
  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream, myVideoRef]);

  /*
  - previous stream cleanup if stream changes
  - cleanup on unmounting of component 
  */
  useEffect(() => {
    return () => {
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [myStream]);

  useEffect(() => {
    /*
    Brief: a funtion to handle if a new user enter my meeting.
    Input: email( user joined the meeting)
    Output: None
    Description: 
     - fetches mystream beacuse when sockets were registered myStream was null 
     - creates new connection
     - creates an offer
     - sends offer to new user
    */
    const handleJoinedRoom = async ({ email }) => {
      console.log(email, "joined this room");
      const stream = await getUserMediaStream();
      createNewConnection({ remoteEmail: email, stream, socket });
      console.log("calling", email);

      const offer = await createOffer({ remoteEmail: email });
      socket.emit("call-user", { email, offer });
    };

    /*
    Brief: a funtion to handle an incoming call.
    Input: fromEmail( user who called), offer
    Output: None
    Description: 
     - fetches mystream beacuse when sockets were registered myStream was null 
     - creates new connection
     - creates an offer
     - sends offer to new user
    */
    const handleIncomingCall = async ({ fromEmail, offer }) => {
      console.log("incoming call from", fromEmail);
      const stream = await getUserMediaStream();
      createNewConnection({ remoteEmail: fromEmail, stream, socket });

      const answer = await createAnswer({ remoteEmail: fromEmail, offer });

      console.log("call accepted of ", fromEmail);
      socket.emit("call-accepted", { fromEmail, answer });
    };

    const handleCallAccepted = async ({ fromEmail, answer }) => {
      console.log(fromEmail, "accepted my call");
      await setAnswer({ fromEmail, answer });
    };

    const handleIceCandidate = async ({ fromEmail, candidate }) => {
      await addIceCandidate({ fromEmail, candidate });
    };

    const handleUserLeft = ({ email }) => {
      leaveMeetingPeer({ email });
    };

    socket.on("joined-room", handleJoinedRoom);
    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-accepted", handleCallAccepted);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-left", handleUserLeft);
    socket.on("code-change", ({ code }) => {
      isRemoteChange.current = true;
      setCode(code);
    });

    return () => {
      socket.off("joined-room", handleJoinedRoom);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
      socket.off("code-change");
    };
  }, []);

  /*
  INPUT: None
  OUTPUT: myStream(current stream of user including audio and video)
  DESCRIPTION:  
   - on initial render function is created with myStream = NULL
   - when called first it fetches stream, then stores in state
   - gets status of current mic, stores it in state
   - gets status of current video, stores it in state
   - return stream
   - function is created again with mystream = currentStream in storage since dependency has been changed
   - next time when function is called it just returns without fetching it again as myStream is something now
  */
  const getUserMediaStream = useCallback(async () => {
    if (myStream) return myStream;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setMyStream(stream);
    setMicOn(stream.getAudioTracks()[0].enabled);
    setCamOn(stream.getVideoTracks()[0].enabled);
    return stream;
  }, [myStream]);

  const handleCodeChange = (value) => {
    if (isRemoteChange.current) {
      isRemoteChange.current = false;
      return;
    }
    setCode(value);
    socket.emit("code-change", {
      meetingId: params.meetingId,
      code: value,
    });
  };

  /*
  INPUT: None
  OUTPUT: None
  DESCRIPTION:  
  - toggles current mic in myStream
  - updates micOn state
  */
  const toggleMic = useCallback(() => {
    if (!myStream) return;
    const audioTrack = myStream.getAudioTracks()[0];
    if (!audioTrack) return;

    setMicOn(!micOn);
    audioTrack.enabled = !audioTrack.enabled;
  }, [myStream, micOn]);

  /*
  INPUT: None
  OUTPUT: None
  DESCRIPTION:  
  - toggles current video in myStream
  - updates camOn state
  */
  const toggleCamera = useCallback(() => {
    if (!myStream) return;
    const videoTrack = myStream.getVideoTracks()[0];
    if (!videoTrack) return;

    setCamOn(!camOn);
    videoTrack.enabled = !videoTrack.enabled;
  }, [myStream, camOn]);

  const handleLeaveMeeting = () => {
    socket.emit("leave-meeting", { meetingId: params.meetingId });

    leaveMeeting();
    if (myStream) {
      myStream.getTracks().forEach((track) => track.stop());
      setMyStream(null);
    }

    navigate("/home");
  };

  useEffect(() => {
    const handleTabClose = () => {
      socket.emit("leave-meeting", { meetingId: params.meetingId });
      handleLeaveMeeting();
    };

    window.addEventListener("beforeunload", handleTabClose);

    return () => {
      window.removeEventListener("beforeunload", handleTabClose);
    };
  }, []);

  console.log("remoteStreams", remoteStreams);
  return remoteStreams.length == 0 ? (
    <div className={styles.waitingRoomContainer}>
      <video
        className={styles.waitingVideo}
        ref={(video) => {
          if (video && video.srcObject !== myStream) {
            video.srcObject = myStream;
          }
        }}
        autoPlay
        playsInline
        muted
      />

      <div className={styles.controls}>
        <span
          className={`${micOn ? "" : styles.redBack} ${styles.inputControlBtn}`}
          onClick={toggleMic}
        >
          {micOn ? (
            <FaMicrophone className={styles.controlButton} />
          ) : (
            <FaMicrophoneSlash className={styles.controlButton} />
          )}
        </span>
        <span
          className={`${camOn ? "" : styles.redBack} ${styles.inputControlBtn}`}
          onClick={toggleCamera}
        >
          {camOn ? (
            <MdVideocam className={styles.controlButton} />
          ) : (
            <MdVideocamOff className={styles.controlButton} />
          )}
        </span>

        <span className={styles.inputControlBtn} onClick={handleLeaveMeeting}>
          <MdCallEnd />
        </span>
      </div>
    </div>
  ) : (
    <div className={styles.meetingWrapper}>
      <PanelGroup direction="horizontal" className={styles.panelGroup}>
        <Panel defaultSize={30} minSize={20} className={styles.videoPanel}>
          <div className={styles.activeLocalContainer}>
            <video
              className={styles.localVideo}
              ref={(video) => {
                if (video && video.srcObject !== myStream) {
                  video.srcObject = myStream;
                }
              }}
              autoPlay
              playsInline
              muted
            />

            <div className={styles.controls}>
              <span
                className={`${micOn ? "" : styles.redBack} ${styles.inputControlBtn}`}
                onClick={toggleMic}
              >
                {micOn ? (
                  <FaMicrophone className={styles.controlButton} />
                ) : (
                  <FaMicrophoneSlash className={styles.controlButton} />
                )}
              </span>
              <span
                className={`${camOn ? "" : styles.redBack} ${styles.inputControlBtn}`}
                onClick={toggleCamera}
              >
                {camOn ? (
                  <MdVideocam className={styles.controlButton} />
                ) : (
                  <MdVideocamOff className={styles.controlButton} />
                )}
              </span>

              <span
                className={styles.inputControlBtn}
                onClick={handleLeaveMeeting}
              >
                <MdCallEnd />
              </span>
            </div>
          </div>

          <div className={styles.remoteContainer}>
            {remoteStreams.map((peer) => (
              <RemoteVideo
                key={peer.id}
                peer={peer}
                className={styles.remoteVideo}
              />
            ))}
          </div>
        </Panel>

        <PanelResizeHandle className={styles.resizeHandle} />

        <Panel className={styles.editorPanel}>
          <Editor
            height="100%"
            language="javascript"
            value={code}
            onChange={(value) => handleCodeChange(value)}
          />
        </Panel>
      </PanelGroup>
    </div>
  );
};
