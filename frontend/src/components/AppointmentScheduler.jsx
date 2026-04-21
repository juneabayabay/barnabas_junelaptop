// src/components/AppointmentScheduler.jsx
import React, { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./style/AppointmentCalendar.css";
import AxiosInstance from "./AxiosInstance";
import "./style/styles.css";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";

// Constants
const CLINIC_OPEN = 9;
const CLINIC_CLOSE = 18;
const LUNCH_START = 12;
const LUNCH_END = 13;
const MAX_PATIENTS_DAY = 10;

const SERVICES = [
  { id: "cleaning", name: "Teeth Cleaning" },
  { id: "checkup", name: "General Check-up" },
  { id: "extraction", name: "Tooth Extraction" },
  { id: "whitening", name: "Teeth Whitening" },
  { id: "ortho", name: "Orthodontic Check" },
  { id: "braces", name: "Braces Installation" },
];

// Helper
const fmtHour = (hour) => {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:00 ${ampm}`;
};

export default function AppointmentScheduler({ role = "client", username }) {
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  // Form state
  const [form, setForm] = useState({ date: "", time: "", service: "", other_concern: "" });
  const [showOther, setShowOther] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

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

  // Booking logic
  const handleSubmit = (time) => {
    setForm({ ...form, date: `${selectedDay.year}-${selectedDay.month + 1}-${selectedDay.day}`, time });
    setConfirmOpen(true);
  };

  const confirmBooking = async () => {
    setLoading(true);
    try {
      const payload = {
        date: form.date,
        time: form.time,
        service: showOther ? null : form.service,
        other_concern: showOther ? form.other_concern : null,
      };
      await AxiosInstance.post("appointments/", payload);
      setSuccessMessage("Appointment booked successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setForm({ date: "", time: "", service: "", other_concern: "" });
      fetchAppointments();
    } catch (error) {
      console.error(error);
      setSuccessMessage("Error booking appointment");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  // Calendar grid
  const renderCalendar = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const dayAppointments = (d) =>
      appointments.filter((a) => a.day === d && a.month === month && a.year === year);

    return (
      <div className="calendar-grid">
        {Array.from({ length: totalDays }, (_, i) => {
          const day = i + 1;
          const appts = dayAppointments(day);
          const active = appts.filter((a) => ["confirmed", "pencil", "walkin", "paid"].includes(a.status));
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
                {active.length > 0 && <span>{active.length}/{MAX_PATIENTS_DAY}</span>}
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
    const dayAppts = appointments.filter((a) => a.day === day && a.month === month && a.year === year);

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
                    <strong>{SERVICES.find((s) => s.id === appt.service)?.name}</strong>
                    <small>{appt.patient}</small>
                  </div>
                ) : (
                  !isLunch && (
                    <Button variant="outlined" onClick={() => handleSubmit(fmtHour(hour))}>
                      + Add Appointment
                    </Button>
                  )
                )}
              </div>
            );
          })}
        </div>
        <Button onClick={() => setSelectedDay(null)}>Back to Calendar</Button>
      </div>
    );
  };

  return (
    <Box className="appointment-calendar">
      <Typography variant="h5">
        {currentDate.toLocaleString("default", { month: "long" })} {currentDate.getFullYear()}
      </Typography>
      {!selectedDay ? renderCalendar() : renderDayView()}

      {/* Booking Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Appointment</DialogTitle>
        <DialogContent>
          <Typography>Date: {form.date}</Typography>
          <Typography>Time: {form.time}</Typography>
          <FormControl fullWidth disabled={showOther} sx={{ mt: 2 }}>
            <InputLabel>Service</InputLabel>
            <Select
              name="service"
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
              required={!showOther}
            >
              {SERVICES.map((s) => (
                <MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Checkbox
                checked={showOther}
                onChange={(e) => {
                  setShowOther(e.target.checked);
                  if (e.target.checked) setForm({ ...form, service: "" });
                  else setForm({ ...form, other_concern: "" });
                }}
              />
            }
            label="Other Concerns"
          />
          {showOther && (
            <TextField
              name="other_concern"
              label="Please specify"
              value={form.other_concern}
              onChange={(e) => setForm({ ...form, other_concern: e.target.value })}
              fullWidth
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmBooking} variant="contained" color="primary" disabled={loading}>
            {loading ? "Booking..." : "Confirm"}
          </Button>
        </DialogActions>
        {successMessage && (
          <Box sx={{ p: 2 }}>
            <Typography color={successMessage.includes("Error") ? "error" : "success"}>
              {successMessage}
            </Typography>
            <LinearProgress
              sx={{ mt: 1, borderRadius: 1 }}
              color={successMessage.includes("Error") ? "error" : "success"}
            />
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
