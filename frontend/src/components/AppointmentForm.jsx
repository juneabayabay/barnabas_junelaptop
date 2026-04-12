// src/components/AppointmentForm.jsx

import { useState } from "react";
import AxiosInstance from "./AxiosInstance";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import "./style/AppointmentForm.css";

export default function AppointmentForm({ onBooked }) {
  const [form, setForm] = useState({ date: "", time: "", service: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await AxiosInstance.post("appointments/", form);
      alert("Appointment booked");
      if (onBooked) onBooked(form);
      setForm({ date: "", time: "", service: "" });
    } catch (error) {
      console.error(error);
      alert("Error booking appointment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box className="appointment-form-container">
      <Paper elevation={4} className="appointment-form-card">
        <Typography
          variant="h5"
          gutterBottom
          className="appointment-form-title"
        >
          Book Appointment
        </Typography>

        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              type="date"
              name="date"
              label="Date"
              InputLabelProps={{ shrink: true }}
              value={form.date}
              onChange={handleChange}
              required
              fullWidth
            />

            <TextField
              type="time"
              name="time"
              label="Time"
              InputLabelProps={{ shrink: true }}
              value={form.time}
              onChange={handleChange}
              required
              fullWidth
            />

            <TextField
              type="text"
              name="service"
              label="Service"
              placeholder="Enter service"
              value={form.service}
              onChange={handleChange}
              required
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
            >
              {loading ? "Booking..." : "Book Appointment"}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Box>
  );
}
