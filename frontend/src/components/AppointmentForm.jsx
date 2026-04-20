import React, { useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./style/Calendar.css";
import AxiosInstance from "./AxiosInstance";
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

export default function AppointmentForm() {
  const [date, setDate] = useState(new Date());
  const [form, setForm] = useState({ date: "", time: "", service: "", other_concern: "" });
  const [loading, setLoading] = useState(false);
  const [showOther, setShowOther] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const formatDateKey = (d) => d.toISOString().split("T")[0];

  // Convert AM/PM to 24-hour HH:MM
  const convertTo24Hour = (timeStr) => {
    const [hourMinute, suffix] = timeStr.split(" ");
    let [hour, minute] = hourMinute.split(":");
    hour = parseInt(hour, 10);
    if (suffix === "PM" && hour !== 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, "0")}:${minute}`;
  };

  // Generate allowed times: 9am–6pm, skip 12–1pm, Mon–Sat only
  const generateTimes = () => {
    const day = date.getDay();
    if (day === 0) return []; // Sunday
    const times = [];
    for (let h = 9; h <= 18; h++) {
      if (h === 12) continue; // skip lunch
      const suffix = h >= 12 ? "PM" : "AM";
      const hour12 = h > 12 ? h - 12 : h;
      times.push(`${hour12}:00 ${suffix}`);
    }
    return times;
  };

  // Prevent booking past times
  const isPastTime = (time) => {
    const now = new Date();
    const selectedDate = new Date(date);
    const [hourStr, suffix] = time.split(" ");
    let hour = parseInt(hourStr);
    if (suffix === "PM" && hour !== 12) hour += 12;
    if (suffix === "AM" && hour === 12) hour = 0;
    selectedDate.setHours(hour, 0, 0, 0);
    return selectedDate < now;
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setForm({ ...form, date: formatDateKey(date) });
    setConfirmOpen(true);
  };

  const confirmBooking = async () => {
    setLoading(true);
    try {
      const payload = {
        date: form.date,
        time: convertTo24Hour(form.time),
        service: showOther ? null : form.service,
        other_concern: showOther ? form.other_concern : null,
      };
      await AxiosInstance.post("appointments/", payload);
      setSuccessMessage("Appointment booked successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setForm({ date: "", time: "", service: "", other_concern: "" });
    } catch (error) {
      console.error(error);
      setSuccessMessage("Error booking appointment");
      setTimeout(() => setSuccessMessage(""), 3000);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f8f9fa", p: 4 }}>
      <Box sx={{ maxWidth: 600, width: "100%", backgroundColor: "white", p: 4, borderRadius: 2, boxShadow: 3 }}>
        <Typography variant="h4" gutterBottom align="center" color="primary">
          Appointment Calendar
        </Typography>

        <Calendar onChange={setDate} value={date} className="react-calendar" minDate={new Date()} />

        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Slots for {date.toDateString()}</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 2 }}>
            {generateTimes().map((time, i) => (
              <Button key={i} variant={form.time === time ? "contained" : "outlined"} onClick={() => setForm({ ...form, time })} disabled={isPastTime(time)}>
                {time}
              </Button>
            ))}
          </Stack>
        </Box>

        <Box sx={{ mt: 4 }}>
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <FormControl fullWidth disabled={showOther}>
                <InputLabel>Service</InputLabel>
                <Select name="service" value={form.service} onChange={handleChange} required={!showOther}>
                  <MenuItem value="Consultation">Consultation</MenuItem>
                  <MenuItem value="Cleaning">Cleaning</MenuItem>
                  <MenuItem value="Extraction">Extraction</MenuItem>
                  <MenuItem value="Whitening">Whitening</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={showOther}
                    onChange={(e) => {
                      setShowOther(e.target.checked);
                      if (e.target.checked) {
                        setForm({ ...form, service: "" });
                      } else {
                        setForm({ ...form, other_concern: "" });
                      }
                    }}
                  />
                }
                label="Other Concerns"
              />

              {showOther && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Other Concern</InputLabel>
                    <Select name="other_concern" value={form.other_concern} onChange={handleChange} required>
                      <MenuItem value="Braces">Braces</MenuItem>
                      <MenuItem value="Implants">Implants</MenuItem>
                      <MenuItem value="Dentures">Dentures</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                  </FormControl>

                  {form.other_concern === "Other" && (
                    <TextField name="other_concern" label="Please specify" value={form.other_concern} onChange={handleChange} fullWidth />
                  )}
                </>
              )}

              <Button type="submit" variant="contained" color="primary" disabled={loading}>
                {loading ? "Booking..." : "Book Appointment"}
              </Button>
            </Stack>
          </form>
        </Box>

        {successMessage && (
          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography color={successMessage.includes("Error") ? "error" : "success"}>{successMessage}</Typography>
            <LinearProgress sx={{ mt: 1, borderRadius: 1 }} color={successMessage.includes("Error") ? "error" : "success"} />
          </Box>
        )}
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Appointment</DialogTitle>
        <DialogContent>
          <Typography>Date: {formatDateKey(date)}</Typography>
          <Typography>Time: {form.time}</Typography>
          {form.service && <Typography>Service: {form.service}</Typography>}
          {showOther && <Typography>Other Concern: {form.other_concern}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button onClick={confirmBooking} variant="contained" color="primary">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
