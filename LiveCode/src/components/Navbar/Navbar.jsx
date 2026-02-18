import React from "react";
import { CiSettings } from "react-icons/ci";
import styles from "./Navbar.module.css";
import { FaCode } from "react-icons/fa";

export const Navbar = () => {
  return (
    <>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <FaCode className={styles.headerIcon} />
          <div className={styles.title}>LiveCode</div>
        </div>
        <CiSettings className={styles.settingsIcon} />
      </div>
    </>
  );
};
