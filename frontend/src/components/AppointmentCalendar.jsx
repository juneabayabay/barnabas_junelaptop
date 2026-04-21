// src/components/AppointmentCalendar.jsx
import React, { useState, useEffect } from "react";
import AxiosInstance from "./AxiosInstance"; // your configured axios with interceptors
import "./style/AppointmentCalendar.css"; // import the CSS design

// Initialize constants directly here
const CLINIC_OPEN = 9;   // 9 AM
const CLINIC_CLOSE = 18; // 6 PM
const LUNCH_START = 12;  // 12 PM
const LUNCH_END = 13;    // 1 PM
const MAX_PATIENTS_DAY = 10;

const SERVICES = [
  { id:'cleaning',   name:'Teeth Cleaning',     tier:'minor', duration:1, price:500 },
  { id:'checkup',    name:'General Check-up',   tier:'minor', duration:1, price:300 },
  { id:'extraction', name:'Tooth Extraction',   tier:'major', duration:2, price:1200 },
  { id:'whitening',  name:'Teeth Whitening',    tier:'major', duration:2, price:2500 },
  { id:'ortho',      name:'Orthodontic Check',  tier:'ortho', duration:1, price:800 },
  { id:'braces',     name:'Braces Installation',tier:'major', duration:3, price:15000 },
];

// Helper to format hours
const fmtHour = (hour) => {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
};

export default function AppointmentCalendar({ role, username }) {
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  // Load appointments from backend
  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data } = await AxiosInstance.get("appointments/");
      setAppointments(data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  };

  // Calendar grid
  const renderCalendar = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const dayAppointments = (d) =>
      appointments.filter(
        (a) => a.day === d && a.month === month && a.year === year
      );

    return (
      <div className="calendar-grid">
        {Array.from({ length: totalDays }, (_, i) => {
          const day = i + 1;
          const appts = dayAppointments(day);
          const active = appts.filter((a) =>
            ["confirmed", "pencil", "walkin", "paid"].includes(a.status)
          );
          const pending = appts.filter((a) => a.status === "pending");
          const isFull = active.length >= MAX_PATIENTS_DAY;

          return (
            <div
              key={day}
              className={`day-cell ${isFull ? "full" : ""}`}
              onClick={() => setSelectedDay({ day, month, year })}
            >
              <div className="day-num">{day}</div>
              <div className="day-info">
                {active.length > 0 && (
                  <span>{active.length}/{MAX_PATIENTS_DAY}</span>
                )}
                {pending.length > 0 && <span>{pending.length} pending</span>}
                {isFull && <span>FULL</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Day view
  const renderDayView = () => {
    if (!selectedDay) return null;
    const { day, month, year } = selectedDay;
    const dayAppts = appointments.filter(
      (a) => a.day === day && a.month === month && a.year === year
    );

    const handleStatusChange = async (id, status) => {
      await AxiosInstance.patch(`appointments/${id}/`, { status });
      fetchAppointments();
    };

    const handleCancel = async (id) => {
      await AxiosInstance.patch(`appointments/${id}/`, { status: "cancelled" });
      fetchAppointments();
    };

    return (
      <div className="day-view">
        <h3>
          {new Date(year, month, day).toLocaleDateString("default", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </h3>
        <div className="time-grid">
          {Array.from({ length: CLINIC_CLOSE - CLINIC_OPEN + 1 }, (_, i) => {
            const hour = CLINIC_OPEN + i;
            const isLunch = hour >= LUNCH_START && hour < LUNCH_END;
            const appt = dayAppts.find((a) => a.time === hour);

            return (
              <div key={hour} className={`time-slot ${isLunch ? "lunch" : ""}`}>
                <span>{fmtHour(hour)}</span>
                {appt ? (
                  <div className={`appt-block status-${appt.status}`}>
                    <strong>
                      {SERVICES.find((s) => s.id === appt.service)?.name}
                    </strong>
                    <small>{appt.patient}</small>
                    {role !== "client" && appt.status === "pending" && (
                      <div>
                        <button
                          onClick={() => handleStatusChange(appt.id, "confirmed")}
                        >
                          Confirm
                        </button>
                        <button
                          className="deny-btn"
                          onClick={() => handleStatusChange(appt.id, "denied")}
                        >
                          Deny
                        </button>
                      </div>
                    )}
                    {["confirmed", "pencil", "walkin"].includes(appt.status) && (
                      <button className="cancel-btn" onClick={() => handleCancel(appt.id)}>Cancel</button>
                    )}
                  </div>
                ) : (
                  !isLunch && role !== "client" && (
                    <button>+ Add Appointment</button>
                  )
                )}
              </div>
            );
          })}
        </div>
        <button onClick={() => setSelectedDay(null)}>Back to Calendar</button>
      </div>
    );
  };

  return (
    <div className="appointment-calendar">
      <h2>
        {currentDate.toLocaleString("default", { month: "long" })}{" "}
        {currentDate.getFullYear()}
      </h2>
      {!selectedDay ? renderCalendar() : renderDayView()}
    </div>
  );
}
