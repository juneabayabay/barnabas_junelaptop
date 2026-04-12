// src/components/Services.jsx

import React from "react";
import "./style/Services.css";

const Services = () => {
  return (
    <div className="services-container">
      <div className="services-card">
        <h2 className="services-title">Our Services</h2>
        <p className="services-text">
          At Barnabas Dental Clinic, we offer a wide range of treatments to keep
          your smile healthy and bright. Our services are designed to meet the
          needs of patients of all ages, combining modern technology with
          compassionate care.
        </p>

        <ul className="services-list">
          <li>Routine Check‑ups & Cleaning</li>
          <li>Cosmetic Dentistry (Whitening, Veneers)</li>
          <li>Orthodontics (Braces & Aligners)</li>
          <li>Restorative Dentistry (Fillings, Crowns)</li>
          <li>Oral Surgery & Extractions</li>
          <li>Pediatric Dentistry</li>
        </ul>

        <p className="services-text">
          Whatever your dental needs, our team is here to provide personalized
          care and ensure you leave with a confident smile.
        </p>
      </div>
    </div>
  );
};

export default Services;
