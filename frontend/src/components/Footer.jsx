// src/components/Footer.jsx

import React from "react";
import "./style/Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-text">
          © {new Date().getFullYear()} Barnabas Dental Clinic. All rights reserved.
        </p>
        <div className="footer-links">
          <a href="/about">About</a>
          <a href="/services">Services</a>
          <a href="/calendar">Appointments</a>
          <a href="/contact">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
