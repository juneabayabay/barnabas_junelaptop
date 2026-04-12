// src/components/About.jsx

import React from "react";
import "./style/About.css";

const About = () => {
  return (
    <div className="about-container">
      <div className="about-card">
        <h2 className="about-title">About Barnabas Dental Clinic</h2>
        <p className="about-text">
          At Barnabas Dental Clinic, we believe that every smile tells a story.
          Since our founding, we have been committed to providing compassionate
          care, modern treatments, and a welcoming environment for patients of
          all ages.
        </p>
        <p className="about-text">
          With state‑of‑the‑art equipment and a philosophy centered on
          personalized treatment, we strive to create smiles that last a
          lifetime. Whether you’re here for a routine check‑up or a complete
          smile makeover, you can trust us to deliver excellence in every
          appointment.
        </p>
      </div>
    </div>
  );
};

export default About;
