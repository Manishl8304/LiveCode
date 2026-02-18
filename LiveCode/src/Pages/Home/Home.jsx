import styles from "./Home.module.css";
import { FaCode } from "react-icons/fa";
import { FaUserGroup } from "react-icons/fa6";
import { SlCalender } from "react-icons/sl";
import { IoMdTime } from "react-icons/io";
import { useState } from "react";
import { MeetingPrompt } from "../../components/meetingPrompt/MeetingPrompt";
import { useAuth } from "../../contexts/authContext";

const Home = () => {
  let role = "interviewer";

  const [showModel, setShowModel] = useState(null);
  const [modelType, setmodelType] = useState(null);

  return (
    <div className={styles.home}>
      <MeetingPrompt
        isOpen={showModel}
        closeModel={() => {
          setShowModel(false);
        }}
        modelType={modelType}
      />
      {/* Header */}
      <div className={styles.homeHeader}>
        <p className={styles.homeTitle}>Welcome Back!</p>
        <p className={styles.homeSubtitle}>
          {role === "interviewer"
            ? "Manage your interviews and review candidates effectively"
            : "Access your upcoming interview"}
        </p>
      </div>

      {/* Content */}
      {role === "interviewer" ? (
        <div className={styles.homeCards}>
          <div
            className={`${styles.homeCard} ${styles.greenBack}`}
            onClick={() => {
              setShowModel(true);
              setmodelType("new");
            }}
          >
            <FaCode className={styles.cardIcon} />
            <div className={styles.cardTitle}>New Call</div>
            <div className={styles.cardDescription}>Start an instant call</div>
          </div>

          <div
            className={`${styles.homeCard} ${styles.purpleBack}`}
            onClick={() => {
              setShowModel(true);
              setmodelType("join");
            }}
          >
            <FaUserGroup className={styles.cardIcon} />
            <div className={styles.cardTitle}>Join Interview</div>
            <div className={styles.cardDescription}>
              Enter via invitation link
            </div>
          </div>

          <div className={`${styles.homeCard} ${styles.blueBack}`}>
            <SlCalender className={styles.cardIcon} />
            <div className={styles.cardTitle}>Schedule</div>
            <div className={styles.cardDescription}>
              Plan upcoming interviews
            </div>
          </div>

          <div className={`${styles.homeCard} ${styles.yellowBack}`}>
            <IoMdTime className={styles.cardIcon} />
            <div className={styles.cardTitle}>Recordings</div>
            <div className={styles.cardDescription}>Access past interviews</div>
          </div>
        </div>
      ) : (
        <div className={styles.candidateView}>will do somethin here</div>
      )}
    </div>
  );
};

export default Home;
