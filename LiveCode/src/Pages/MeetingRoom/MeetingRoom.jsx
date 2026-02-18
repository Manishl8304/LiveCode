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

export const MeetingRoom = () => {
  console.log("meeting room");
  const navigate = useNavigate();

  const socket = useSocket();
  const user = useAuth();

  const [code, setCode] = useState("// Start coding...");
  const isRemoteChange = useRef(false);

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
  const [myStream, setMyStream] = useState(null);
  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    getUserMediaStream();
  }, []);

  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream, myVideoRef]);

  useEffect(() => {
    return () => {
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [myStream]);

  useEffect(() => {
    const handleJoinedRoom = async ({ email }) => {
      console.log(`email joined this room ${email}`);

      const stream = await getUserMediaStream();
      createNewConnection({ remoteEmail: email, stream, socket });

      const offer = await createOffer({ remoteEmail: email });
      socket.emit("call-user", { email, offer });
    };

    const handleIncomingCall = async ({ fromEmail, offer }) => {
      console.log("incoming call from", fromEmail);
      const stream = await getUserMediaStream();
      createNewConnection({ remoteEmail: fromEmail, stream, socket });

      const answer = await createAnswer({ remoteEmail: fromEmail, offer });
      console.log(answer);

      socket.emit("call-accepted", { fromEmail, answer });
    };

    const handleCallAccepted = async ({ fromEmail, answer }) => {
      console.log("call accepted");

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

  ["-"];
  const toggleMic = () => {
    if (!myStream) return;

    setMicOn(!micOn);
    const audioTrack = myStream.getAudioTracks()[0];
    console.log("audio", audioTrack);
    if (!audioTrack) return;

    console.log("audio", audioTrack);
    audioTrack.enabled = !audioTrack.enabled;
    console.log("mic", audioTrack.enabled);
  };

  const toggleCamera = () => {
    if (!myStream) return;

    setCamOn(!camOn);
    const videoTrack = myStream.getVideoTracks()[0];
    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
  };

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

      leaveMeeting();
      if (myStream) {
        myStream.getTracks().forEach((track) => track.stop());
        setMyStream(null);
      }
      navigate("/home");
    };

    window.addEventListener("beforeunload", handleTabClose);

    return () => {
      window.removeEventListener("beforeunload", handleTabClose);
    };
  }, []);

  console.log("remoteMeeting", remoteStreams);
  console.log(myVideoRef);
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
              <video
                key={peer.id}
                className={styles.remoteVideo}
                ref={(video) => {
                  if (video && video.srcObject !== peer.stream) {
                    video.srcObject = peer.stream;
                  }
                }}
                autoPlay
                playsInline
              />
            ))}
            {/* Kept your mock videos intact below */}
            <video
              className={styles.remoteVideo}
              src="https://www.w3schools.com/html/mov_bbb.mp4"
              autoPlay
              playsInline
              muted
            />
            <video
              className={styles.remoteVideo}
              src="https://www.w3schools.com/html/mov_bbb.mp4"
              autoPlay
              playsInline
              muted
            />
            <video
              className={styles.remoteVideo}
              src="https://www.w3schools.com/html/mov_bbb.mp4"
              autoPlay
              playsInline
              muted
            />
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
