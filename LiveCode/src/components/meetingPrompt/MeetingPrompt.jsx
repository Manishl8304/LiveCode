import { useEffect, useRef, useState } from "react";
import styles from "./MeetingPrompt.module.css";
import { RxCross1 } from "react-icons/rx";
import { useSocket } from "../../contexts/socketContext";
import { useAuth } from "../../contexts/authContext";
import { useNavigate } from "react-router-dom";

export const MeetingPrompt = (props) => {
  if (!props.isOpen) return <></>;

  const socket = useSocket();
  const user = useAuth();
  const navigate = useNavigate();
  const [meetingLink, setMeetingLink] = useState(null);

  const currUserDetail = {
    email: user.user?.email,
    socketId: socket.id,
  };

  useEffect(() => {
    /*
    Brief: a function to handle an emit message("created-meeting") recieved from server
    Input: {meetingId}
    OutPut: None
    Description: user A requests to create a meeting -> server responds with meeting Id -> user A joins that meeting room -> user A navigate to meetingRoom Page
    */
    const handleCreatedMeeting = ({ meetingId }) => {
      socket.emit("join-room", {
        // email: currUserDetail.email,
        email: "random4038@gmail.com",
        meetingId: meetingId,
      });
      navigate(`${meetingId}`);
    };

    socket.on("created-meeting", handleCreatedMeeting);
    return () => {
      socket.off("created-meeting", handleCreatedMeeting);
    };
  }, []);

  /*
    Brief: a function to create meeting
    Input: None
    OutPut: None
    Description: user A requests to create a meeting -> server creates a meeting Id -> sends "created-meeting" message
    */
  const createInstantMeeting = () => {
    socket.emit("create-meeting");
  };

  /*
    Brief: a function to join meeting
    Input: None
    OutPut: None
    Description: user B requests to join a meeting -> server adds user B to room-> user B navigate to meetingRoom Page
    */
  const joinMeeting = () => {
    socket.emit("join-room", {
      // email: currUserDetail.email,
      email: "manishaggarwal8304@gmail.com",
      meetingId: meetingLink,
    });
    navigate(`${meetingLink}`);
  };

  if (props.modelType == "join")
    return (
      <>
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Join Meeting</div>
              <RxCross1
                className={styles.closeIcon}
                onClick={() => props.closeModel()}
              />
            </div>

            {/* Input */}
            <input
              type="text"
              className={styles.meetingInput}
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="Enter meeting code"
            />

            {/* Actions */}
            <div className={styles.modalActions}>
              <button className={styles.cancelButton}>Cancel</button>
              <button className={styles.joinButton} onClick={joinMeeting}>
                Join Meeting
              </button>
            </div>
          </div>
        </div>
      </>
    );
  if (props.modelType == "new")
    return (
      <>
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Create Meeting</div>
              <RxCross1
                className={styles.closeIcon}
                onClick={() => props.closeModel()}
              />
            </div>

            {/* Actions */}
            <div className={styles.modalActions}>
              <button className={styles.cancelButton}>Cancel</button>
              <button
                className={styles.joinButton}
                onClick={createInstantMeeting}
              >
                Create Meeting
              </button>
            </div>
          </div>
        </div>
      </>
    );

  return <div>MeetingPrompt</div>;
};
