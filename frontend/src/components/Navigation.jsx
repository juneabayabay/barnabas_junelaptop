// src/components/Navigation.jsx
import React, { useState, useEffect } from "react";
import AxiosInstance from "./AxiosInstance";

const SECTIONS = [
  "calendar",
  "reports",
  "patients",
  "waitlist",
  "clinicInfo",
];

const roleLabels = {
  admin: "Administrator",
  receptionist: "Receptionist",
  client: "Patient",
};

export default function Navigation({ username, role }) {
  const [activeSection, setActiveSection] = useState("calendar");
  const [topbarTitle, setTopbarTitle] = useState("Calendar");
  const [waitlist, setWaitlist] = useState([]);

  // Fetch waitlist from backend
  useEffect(() => {
    if (activeSection === "waitlist") {
      loadWaitlist();
    }
  }, [activeSection]);

  const loadWaitlist = async () => {
    try {
      const { data } = await AxiosInstance.get("waitlist/");
      setWaitlist(data.filter((w) => w.status === "waiting"));
    } catch (err) {
      console.error("Error loading waitlist:", err);
    }
  };

  const assignWaitlistEntry = async (id) => {
    try {
      await AxiosInstance.post(`waitlist/${id}/assign/`);
      setWaitlist((prev) =>
        prev.map((w) => (w.id === id ? { ...w, status: "assigned" } : w))
      );
      alert("Assigned slot from waiting list.");
    } catch (err) {
      alert("Failed to assign slot.");
    }
  };

  const removeWaitlistEntry = async (id) => {
    try {
      await AxiosInstance.delete(`waitlist/${id}/`);
      setWaitlist((prev) => prev.filter((w) => w.id !== id));
      alert("Removed from waiting list.");
    } catch (err) {
      alert("Failed to remove entry.");
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case "calendar":
        return <div>📅 Calendar Section</div>;
      case "reports":
        return <div>📊 Reports Section</div>;
      case "patients":
        return <div>👥 Patients Section</div>;
      case "waitlist":
        return (
          <div>
            <h3>Waiting List</h3>
            {waitlist.length === 0 ? (
              <p>No patients on the waiting list.</p>
            ) : (
              waitlist.map((w, i) => (
                <div key={w.id} className="waitlist-row">
                  <div className="waitlist-pos">{i + 1}</div>
                  <div className="waitlist-info">
                    <div className="waitlist-name">{w.patient}</div>
                    <div className="waitlist-meta">
                      {w.service} · Preferred{" "}
                      {new Date(
                        w.preferredYear,
                        w.preferredMonth,
                        w.preferredDay
                      ).toLocaleDateString("default", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      at {w.preferredHour}:00
                    </div>
                  </div>
                  <div className="waitlist-actions">
                    <button onClick={() => assignWaitlistEntry(w.id)}>
                      Assign Slot
                    </button>
                    <button onClick={() => removeWaitlistEntry(w.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        );
      case "clinicInfo":
        return <div>🏥 Clinic Information Section</div>;
      default:
        return null;
    }
  };

  return (
    <div className="navigation-container">
      <div className="sidebar">
        <div className="sidebar-avatar">
          {username ? username.charAt(0).toUpperCase() : "U"}
        </div>
        <div className="sidebar-username">{username || "User"}</div>
        <div className="sidebar-role">{roleLabels[role] || role}</div>
        <div className="sidebar-date">
          {new Date().toLocaleDateString("default", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div className="nav-items">
          {SECTIONS.map((sec) => (
            <div
              key={sec}
              className={`nav-item ${activeSection === sec ? "active" : ""}`}
              onClick={() => {
                setActiveSection(sec);
                setTopbarTitle(
                  sec === "calendar"
                    ? "Calendar"
                    : sec === "reports"
                    ? "Reports"
                    : sec === "patients"
                    ? "Patients"
                    : sec === "waitlist"
                    ? "Waiting List"
                    : "Clinic Information"
                );
              }}
            >
              {sec}
            </div>
          ))}
        </div>
      </div>
      <div className="topbar">
        <h2 className="topbar-title">{topbarTitle}</h2>
      </div>
      <div className="section-content">{renderSection()}</div>
    </div>
  );
}
