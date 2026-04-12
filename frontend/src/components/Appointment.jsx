import React, { useEffect, useMemo, useState } from "react";
import AxiosInstance from "./AxiosInstance";
import { Box, Button, TextField, Select, MenuItem, InputLabel, FormControl } from "@mui/material";

const Appointment = () => {
  const [appointments, setAppointments] = useState([]);
  const [procedure, setProcedure] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour < 21; hour++) {
      if (hour === 12) continue; // skip lunch
      for (let min of [0, 15, 30, 45]) {
        const h = hour.toString().padStart(2, "0");
        const m = min.toString().padStart(2, "0");
        slots.push(`${h}:${m}`);
      }
    }
    return slots;
  };

  const timeSlots = useMemo(() => generateTimeSlots(), []);

  const GetAppointments = () => {
    AxiosInstance.get("api/appointments/")
      .then((res) => setAppointments(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    GetAppointments();
  }, []);

  const BookAppointment = (e) => {
    e.preventDefault();
    if (!date || !time) return;
    const startTime = new Date(`${date}T${time}:00`);

    AxiosInstance.post("appointments/", {
      procedure_type: procedure,
      start_time: startTime.toISOString(),
    })
      .then(() => {
        setProcedure("");
        setDate("");
        setTime("");
        GetAppointments();
      })
      .catch((err) => console.error(err));
  };

  const renderedAppointments = useMemo(() => {
    return appointments.map((item, index) => (
      <Box key={index} sx={{ p: 2, m: 2, boxShadow: 3 }}>
        <div><strong>Procedure:</strong> {item.procedure_type}</div>
        <div><strong>Date:</strong> {new Date(item.start_time).toLocaleDateString()}</div>
        <div><strong>Time:</strong> {new Date(item.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        <div><strong>Status:</strong> {item.status}</div>
      </Box>
    ));
  }, [appointments]);

  return (
    <div>
      <h2>Book an Appointment</h2>
      <form onSubmit={BookAppointment} style={{ marginBottom: "20px" }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Procedure</InputLabel>
          <Select value={procedure} onChange={(e) => setProcedure(e.target.value)} required>
            <MenuItem value="cleaning">Cleaning / Oral Prophylaxis</MenuItem>
            <MenuItem value="extraction">Impacted Tooth Extraction</MenuItem>
            <MenuItem value="scaling">Deep Scaling / Periodontal Cleaning</MenuItem>
            <MenuItem value="orthodontics">Orthodontics (Braces)</MenuItem>
            <MenuItem value="bridge">Fixed Bridge</MenuItem>
            <MenuItem value="consultation">Consultation</MenuItem>
          </Select>
        </FormControl>

        <TextField
          type="date"
          label="Preferred Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
          InputLabelProps={{ shrink: true }}
        />

                <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Preferred Time</InputLabel>
          <Select value={time} onChange={(e) => setTime(e.target.value)} required>
            {timeSlots.map((slot, idx) => (
              <MenuItem key={idx} value={slot}>{slot}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button type="submit" variant="contained" color="primary">
          Book Appointment
        </Button>
      </form>

      <h3>My Appointments</h3>
      {appointments.length === 0 ? (
        <p>No appointments yet.</p>
      ) : (
        <div>{renderedAppointments}</div>
      )}
    </div>
  );
};

export default Appointment;

