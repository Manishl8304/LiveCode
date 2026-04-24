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
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { MonacoBinding } from 'y-monaco';

const RemoteVideo = ({ peer, className }) => {
  console.log("in remote video", peer);
  const videoRef = useRef(null);
  const [playError, setPlayError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    console.log("current box", video);
    console.log("peer stream", peer.stream);
    if (!video || !peer.stream) return;

    console.log("passed check");

    const playStream = async () => {
      try {
        if (video.srcObject !== peer.stream) {
          video.srcObject = peer.stream;
        }
        video.play().catch((err) => {
          console.warn("Autoplay blocked:", err);
          setPlayError(true);
        });
        setPlayError(false);
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
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);

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

  // to fetch media on first mountung of meeting page, as meeting waiting room consists of media
  useEffect(() => {
    const init = async () => {
      await getUserMediaStream();
    };
    init();
  }, []);

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
      await createNewConnection({ remoteEmail: email, stream, socket });
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
      await createNewConnection({ remoteEmail: fromEmail, stream, socket });

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

    return () => {
      socket.off("joined-room", handleJoinedRoom);
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-accepted", handleCallAccepted);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
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
      // socket.emit("leave-meeting", { meetingId: params.meetingId });
      handleLeaveMeeting();
    };

    window.addEventListener("beforeunload", handleTabClose);

    return () => {
      window.removeEventListener("beforeunload", handleTabClose);
    };
  }, []);

  console.log("remoteStreams", remoteStreams);

  // FIX: Old code used a ternary to conditionally render entirely different component trees.
  // When remoteStreams went from [] to [{...}], React UNMOUNTED the waiting room and MOUNTED
  // the meeting room — this removed the video element from the DOM mid-play(), causing:
  // "AbortError: The play() request was interrupted because the media was removed from the document"
  //
  // return remoteStreams.length == 0 ? (
  //   <div className={styles.waitingRoomContainer}>...waiting room...</div>
  // ) : (
  //   <div className={styles.meetingWrapper}>...meeting room...</div>
  // );

  // NEW: Render BOTH trees always, use CSS display:none to hide the inactive one.
  // This keeps video elements in the DOM so play() is never interrupted.
  const inMeeting = remoteStreams.length > 0;

  useEffect(() => {
    const ydoc = new Y.Doc();

    const provider = new WebrtcProvider(
      params.meetingId, // room name = your meetingId ✅
      ydoc, // the shared doc
    );

    ydocRef.current = ydoc;
    providerRef.current = provider;

    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      provider.destroy();
      ydoc.destroy();
    };
  }, [params.meetingId]);

  return (
    <>
      {/* Waiting Room — hidden when in meeting */}
      <div
        className={styles.waitingRoomContainer}
        style={{ display: inMeeting ? "none" : undefined }}
      >
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

      {/* Meeting Room — hidden until remote streams arrive */}
      <div
        className={styles.meetingWrapper}
        style={{ display: inMeeting ? undefined : "none" }}
      >
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
              onMount={(editor) => {
                if (ydocRef.current && providerRef.current) {
                  bindingRef.current = new MonacoBinding(
                    ydocRef.current.getText("monaco"), // shared text
                    editor.getModel(), // monaco model
                    new Set([editor]), // editor instance
                    providerRef.current.awareness, // cursor sharing
                  );
                }
              }}
            />
          </Panel>
        </PanelGroup>
      </div>
    </>
  );
};
