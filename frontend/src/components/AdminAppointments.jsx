import React, { useEffect, useState } from "react";
import AxiosInstance from "./AxiosInstance";
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  CheckCircle,
  Cancel,
  Visibility,
  AccessTime,
  CalendarToday,
  Person,
  MedicalServices,
  Comment,
  Pending,
  ConfirmationNumber,
} from "@mui/icons-material";
import "./style/AdminAppointments.css";

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get("appointments/");
      setAppointments(response.data);
    } catch (error) {
      console.error(error);
      setMessage({ text: "Error fetching appointments", type: "error" });
      setTimeout(() => setMessage(null), 3000);
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
      setMessage({ text: `Appointment ${status} successfully!`, type: "success" });
      setTimeout(() => setMessage(null), 3000);
      fetchAppointments();
    } catch (error) {
      console.error(error);
      setMessage({ text: "Error updating appointment", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      default:
        return 'warning';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle sx={{ fontSize: 16 }} />;
      case 'cancelled':
        return <Cancel sx={{ fontSize: 16 }} />;
      case 'completed':
        return <ConfirmationNumber sx={{ fontSize: 16 }} />;
      default:
        return <Pending sx={{ fontSize: 16 }} />;
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const pendingAppointments = appointments.filter(a => a.status === 'pending').length;
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmed').length;
  const completedAppointments = appointments.filter(a => a.status === 'completed').length;
  const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;

  return (
    <Box className="appointments-wrapper">
      {/* Animated Background Elements */}
      <div className="appointments-bg-animation">
        <div className="appointments-bg-circle appointments-bg-circle-1"></div>
        <div className="appointments-bg-circle appointments-bg-circle-2"></div>
        <div className="appointments-bg-circle appointments-bg-circle-3"></div>
        <div className="appointments-bg-circle appointments-bg-circle-4"></div>
        <div className="appointments-bg-circle appointments-bg-circle-5"></div>
        <div className="appointments-bg-circle appointments-bg-circle-6"></div>
      </div>

      {/* Floating particles */}
      <div className="appointments-particles">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="appointments-particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 15}s`,
            animationDuration: `${8 + Math.random() * 15}s`
          }}></div>
        ))}
      </div>

      <Box className="appointments-content">
        {/* Header Section */}
        <Box className="appointments-header-glass fade-down">
          <Box className="header-left">
            <div className="header-badge">
              <MedicalServices sx={{ fontSize: 18 }} />
              <Typography variant="caption">Appointment Management</Typography>
            </div>
            <Typography variant="h4" className="header-title">
              Appointment Overview
            </Typography>
            <Typography variant="body2" className="header-subtitle">
              Manage and track all patient appointments from one centralized dashboard.
            </Typography>
          </Box>
          <Box className="header-right">
            <div className="stats-badge">
              <Typography variant="body2">Total: {appointments.length}</Typography>
            </div>
          </Box>
        </Box>

        {/* Stats Cards */}
        <div className="stats-grid fade-up">
          <div className="stat-card pending-stat">
            <div className="stat-icon-wrapper">
              <Pending sx={{ fontSize: 28 }} />
            </div>
            <div className="stat-details">
              <Typography variant="body2" className="stat-label">Pending</Typography>
              <Typography variant="h3" className="stat-value">{pendingAppointments}</Typography>
            </div>
          </div>
          <div className="stat-card confirmed-stat">
            <div className="stat-icon-wrapper">
              <CheckCircle sx={{ fontSize: 28 }} />
            </div>
            <div className="stat-details">
              <Typography variant="body2" className="stat-label">Confirmed</Typography>
              <Typography variant="h3" className="stat-value">{confirmedAppointments}</Typography>
            </div>
          </div>
          <div className="stat-card completed-stat">
            <div className="stat-icon-wrapper">
              <ConfirmationNumber sx={{ fontSize: 28 }} />
            </div>
            <div className="stat-details">
              <Typography variant="body2" className="stat-label">Completed</Typography>
              <Typography variant="h3" className="stat-value">{completedAppointments}</Typography>
            </div>
          </div>
          <div className="stat-card cancelled-stat">
            <div className="stat-icon-wrapper">
              <Cancel sx={{ fontSize: 28 }} />
            </div>
            <div className="stat-details">
              <Typography variant="body2" className="stat-label">Cancelled</Typography>
              <Typography variant="h3" className="stat-value">{cancelledAppointments}</Typography>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <Box className="loading-overlay">
            <LinearProgress sx={{ width: '300px', borderRadius: '10px', bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: '#2ca6a4' } }} />
            <Typography variant="body2" sx={{ mt: 2, color: '#6c757d' }}>Loading appointments...</Typography>
          </Box>
        )}

        {/* Message Toast */}
        {message && (
          <div className={`message-toast ${message.type}`}>
            <Typography variant="body2">
              {message.type === 'success' ? <CheckCircle sx={{ fontSize: 16, mr: 1 }} /> : <Cancel sx={{ fontSize: 16, mr: 1 }} />}
              {message.text}
            </Typography>
          </div>
        )}

        {/* Appointments List */}
        <div className="appointments-list-section fade-up">
          <div className="section-header">
            <div className="section-title-wrapper">
              <CalendarToday sx={{ color: '#2ca6a4' }} />
              <Typography variant="h5" className="section-title">All Appointments</Typography>
            </div>
            <Chip 
              label={`${appointments.length} Total`} 
              size="small" 
              className="total-chip"
            />
          </div>

          {appointments.length === 0 && !loading ? (
            <Box className="empty-state">
              <MedicalServices sx={{ fontSize: 64, color: '#2ca6a4', opacity: 0.5 }} />
              <Typography variant="h6" color="textSecondary">No appointments found</Typography>
              <Typography variant="body2" color="textSecondary">New appointments will appear here</Typography>
            </Box>
          ) : (
            <div className="appointments-grid">
              {appointments.map((appt, index) => (
                <div 
                  key={appt.id} 
                  className={`appointment-card fade-up ${selectedAppointment === appt.id ? 'expanded' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="appointment-header">
                    <div className="patient-info">
                      <div className="patient-avatar">
                        <Person sx={{ fontSize: 24 }} />
                      </div>
                      <div>
                        <Typography variant="subtitle1" className="patient-name">
                          {appt.user}
                        </Typography>
                        <div className="appointment-meta">
                          <Chip 
                            icon={getStatusIcon(appt.status)}
                            label={getStatusLabel(appt.status)}
                            size="small"
                            color={getStatusColor(appt.status)}
                            className="status-chip"
                          />
                        </div>
                      </div>
                    </div>
                    <IconButton 
                      className="expand-btn"
                      onClick={() => setSelectedAppointment(selectedAppointment === appt.id ? null : appt.id)}
                    >
                      <Visibility sx={{ fontSize: 20 }} />
                    </IconButton>
                  </div>

                  <div className="appointment-details">
                    <div className="detail-item">
                      <CalendarToday sx={{ fontSize: 18, color: '#2ca6a4' }} />
                      <Typography variant="body2">
                        <strong>Date:</strong> {new Date(appt.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </Typography>
                    </div>
                    <div className="detail-item">
                      <AccessTime sx={{ fontSize: 18, color: '#2ca6a4' }} />
                      <Typography variant="body2">
                        <strong>Time:</strong> {appt.time}
                      </Typography>
                    </div>
                    {appt.service && (
                      <div className="detail-item">
                        <MedicalServices sx={{ fontSize: 18, color: '#2ca6a4' }} />
                        <Typography variant="body2">
                          <strong>Service:</strong> {appt.service}
                        </Typography>
                      </div>
                    )}
                    {appt.other_concern && (
                      <div className="detail-item">
                        <Comment sx={{ fontSize: 18, color: '#2ca6a4' }} />
                        <Typography variant="body2">
                          <strong>Concern:</strong> {appt.other_concern}
                        </Typography>
                      </div>
                    )}
                  </div>

                  {appt.status === "pending" && (
                    <div className="appointment-actions">
                      <Button
                        variant="contained"
                        className="action-btn confirm-btn"
                        size="small"
                        onClick={() => updateStatus(appt.id, "confirmed")}
                        startIcon={<CheckCircle />}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="outlined"
                        className="action-btn cancel-btn"
                        size="small"
                        onClick={() => updateStatus(appt.id, "cancelled")}
                        startIcon={<Cancel />}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {appt.status === "confirmed" && (
                    <div className="appointment-actions">
                      <Button
                        variant="contained"
                        className="action-btn complete-btn"
                        size="small"
                        onClick={() => updateStatus(appt.id, "completed")}
                        startIcon={<ConfirmationNumber />}
                      >
                        Mark Completed
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Box>
    </Box>
  );
}