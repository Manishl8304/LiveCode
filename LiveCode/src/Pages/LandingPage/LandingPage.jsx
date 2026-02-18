import { useState } from "react";
import { sendOtp, verifyOtp } from "../../services/conn";
import { useNavigate } from "react-router-dom";
import styles from "./LandingPage.module.css";

const LandingPage = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState(null);

  /* - it is a function imported from usenavigate() funtion
 - pass a url string to navigate function, it will push it to browser history stack
  */
  const navigate = useNavigate();

  /*
 - returns if email is not set
 - sets step++ if res is recieved
 - logs error to console if there's some error
  */
  const handleSendOtp = async () => {
    if (!email.trim()) {
      setMessage("Please enter a valid email.");
      return;
    }

    try {
      const res = await sendOtp(email);
      setStep(step + 1);
      setMessage(null);
    } catch (err) {
      console.error(err.message);
      setMessage("Failed to send OTP. Please try again.");
    }
  };

  /*
 - returns if otp is not set
 - nag=vigates to home if otp is verified
 - logs error to console if there's some error
  */
  const handleSubmit = async () => {
    if (!otp) {
      setMessage("Please enter the OTP.");
      return;
    }
    try {
      const res = await verifyOtp(email, otp);
      navigate("/home");
    } catch (err) {
      console.log(err.message);
      setMessage("Invalid OTP. Please try again.");
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* LEFT SIDE: App Branding & Vibe */}
      <div className={styles.heroSection}>
        <h1 className={styles.brandName}>Livecode</h1>
        <p className={styles.tagline}>
          Real-time collaborative code editing paired with HD video and audio.
          Built for developers, by developers.
        </p>

        {/* Decorative Code Window to show what the app does */}
        <div className={styles.mockCodeWindow}>
          <div>
            <span className={styles.codeKeyword}>import</span> {`{ usePeer }`}{" "}
            <span className={styles.codeKeyword}>from</span>{" "}
            <span className={styles.codeString}>'../contexts'</span>;
          </div>
          <br />
          <div>
            <span className={styles.codeKeyword}>const</span>{" "}
            <span className={styles.codeFunction}>startPairProgramming</span> ={" "}
            <span className={styles.codeKeyword}>async</span> () {`=> {`}
          </div>
          <div>
            &nbsp;&nbsp;<span className={styles.codeKeyword}>await</span>{" "}
            connectAudioVideo();
          </div>
          <div>&nbsp;&nbsp;syncMonacoEditor();</div>
          <div>{`};`}</div>
        </div>
      </div>

      {/* RIGHT SIDE: The Login Form */}
      <div className={styles.loginSection}>
        <div className={styles.loginCard}>
          <h2 className={styles.title}>Welcome back</h2>
          <p className={styles.subtitle}>Log in to join your workspace</p>

          <p className={styles.message}>{message}</p>

          <div className={styles.inputGroup}>
            <input
              className={styles.input}
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={step >= 2}
            />

            {step < 2 && (
              <button className={styles.submitBtn} onClick={handleSendOtp}>
                Send one-time passcode
              </button>
            )}

            {step >= 2 && (
              <>
                <input
                  className={styles.input}
                  type="number"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(Number(e.target.value))}
                />
                <button className={styles.submitBtn} onClick={handleSubmit}>
                  Verify & Join
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
