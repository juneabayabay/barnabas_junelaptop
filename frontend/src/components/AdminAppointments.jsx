import React, { useEffect, useState } from "react";
import AxiosInstance from "./AxiosInstance";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  LinearProgress,
} from "@mui/material";

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get("appointments/");
      setAppointments(response.data);
    } catch (error) {
      console.error(error);
      setMessage("Error fetching appointments");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const updateStatus = async (id, status) => {
    setLoading(true);
    try {
      await AxiosInstance.patch(`appointments/${id}/`, { status });
      setMessage(`Appointment ${status}`);
      setTimeout(() => setMessage(""), 3000);
      fetchAppointments();
    } catch (error) {
      console.error(error);
      setMessage("Error updating appointment");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom align="center" color="primary">
        Dentist Appointment Management
      </Typography>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {message && (
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography color={message.includes("Error") ? "error" : "success"}>
            {message}
          </Typography>
        </Box>
      )}

      <Stack spacing={2}>
        {appointments.map((appt) => (
          <Paper key={appt.id} sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {appt.user}
              </Typography>
              <Typography>Date: {appt.date}</Typography>
              <Typography>Time: {appt.time}</Typography>
              {appt.service && <Typography>Service: {appt.service}</Typography>}
              {appt.other_concern && <Typography>Other Concern: {appt.other_concern}</Typography>}
              <Typography>Status: {appt.status}</Typography>
            </Box>
            <Box>
              {appt.status === "pending" && (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    onClick={() => updateStatus(appt.id, "confirmed")}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    onClick={() => updateStatus(appt.id, "cancelled")}
                  >
                    Cancel
                  </Button>
                </Stack>
              )}
            </Box>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
}
