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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Tabs,
  Tab,
  Avatar,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
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
  Email,
  Phone,
  EventNote,
  Close,
  Refresh,
  CheckCircleOutline,
  DeleteOutline,
  DoneAll,
} from "@mui/icons-material";
import "./style/AdminAppointments.css";

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ open: false, text: "", type: "success" });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [openCancelDialog, setOpenCancelDialog] = useState(false);
  const [selectedActionAppointment, setSelectedActionAppointment] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const response = await AxiosInstance.get("appointments/");
      // Sort appointments by date and time (newest first)
      const sortedData = response.data.sort((a, b) => {
        const dateCompare = new Date(b.date) - new Date(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
      });
      setAppointments(sortedData);
    } catch (error) {
      console.error(error);
      showMessage("Error fetching appointments", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage({ open: true, text, type });
    setTimeout(() => setMessage({ ...message, open: false }), 3000);
  };

  const updateStatus = async (id, status) => {
    setLoading(true);
    try {
      await AxiosInstance.patch(`appointments/${id}/`, { status });
      showMessage(`Appointment ${status} successfully!`, "success");
      fetchAppointments();
      setOpenConfirmDialog(false);
      setOpenCancelDialog(false);
      setSelectedActionAppointment(null);
    } catch (error) {
      console.error(error);
      showMessage(error.response?.data?.message || `Error ${status} appointment`, "error");
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
      case 'pending':
        return 'warning';
      case 'pencil':
        return 'default';
      default:
        return 'default';
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
      case 'pending':
        return <Pending sx={{ fontSize: 16 }} />;
      default:
        return <Pending sx={{ fontSize: 16 }} />;
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      completed: 'Completed',
      cancelled: 'Cancelled',
      pencil: 'Pencil Booking',
      waiting: 'Waiting List'
    };
    return labels[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getFilteredAppointments = () => {
    switch (tabValue) {
      case 0:
        return appointments;
      case 1:
        return appointments.filter(a => a.status === 'pending');
      case 2:
        return appointments.filter(a => a.status === 'confirmed');
      case 3:
        return appointments.filter(a => a.status === 'completed');
      case 4:
        return appointments.filter(a => a.status === 'cancelled');
      default:
        return appointments;
    }
  };

  const filteredAppointments = getFilteredAppointments();
  
  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const handleConfirmClick = (appointment) => {
    setSelectedActionAppointment(appointment);
    setOpenConfirmDialog(true);
  };

  const handleCancelClick = (appointment) => {
    setSelectedActionAppointment(appointment);
    setOpenCancelDialog(true);
  };

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
              <Typography variant="caption">Admin Dashboard</Typography>
            </div>
            <Typography variant="h4" className="header-title">
              Appointment Management
            </Typography>
            <Typography variant="body2" className="header-subtitle">
              Manage and track all patient appointments from one centralized dashboard.
            </Typography>
          </Box>
          <Box className="header-right">
            <Button 
              variant="outlined" 
              size="small" 
              onClick={fetchAppointments}
              startIcon={<Refresh />}
              className="refresh-btn"
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        <div className="stats-grid fade-up">
          <div className="stat-card total-stat" onClick={() => setTabValue(0)}>
            <div className="stat-icon-wrapper">
              <EventNote sx={{ fontSize: 28 }} />
            </div>
            <div className="stat-details">
              <Typography variant="body2" className="stat-label">Total</Typography>
              <Typography variant="h3" className="stat-value">{appointments.length}</Typography>
            </div>
          </div>
          <div className="stat-card pending-stat" onClick={() => setTabValue(1)}>
            <div className="stat-icon-wrapper">
              <Pending sx={{ fontSize: 28 }} />
            </div>
            <div className="stat-details">
              <Typography variant="body2" className="stat-label">Pending</Typography>
              <Typography variant="h3" className="stat-value">{pendingCount}</Typography>
            </div>
          </div>
          <div className="stat-card confirmed-stat" onClick={() => setTabValue(2)}>
            <div className="stat-icon-wrapper">
              <CheckCircle sx={{ fontSize: 28 }} />
            </div>
            <div className="stat-details">
              <Typography variant="body2" className="stat-label">Confirmed</Typography>
              <Typography variant="h3" className="stat-value">{confirmedCount}</Typography>
            </div>
          </div>
          <div className="stat-card completed-stat" onClick={() => setTabValue(3)}>
            <div className="stat-icon-wrapper">
              <ConfirmationNumber sx={{ fontSize: 28 }} />
            </div>
            <div className="stat-details">
              <Typography variant="body2" className="stat-label">Completed</Typography>
              <Typography variant="h3" className="stat-value">{completedCount}</Typography>
            </div>
          </div>
          <div className="stat-card cancelled-stat" onClick={() => setTabValue(4)}>
            <div className="stat-icon-wrapper">
              <Cancel sx={{ fontSize: 28 }} />
            </div>
            <div className="stat-details">
              <Typography variant="body2" className="stat-label">Cancelled</Typography>
              <Typography variant="h3" className="stat-value">{cancelledCount}</Typography>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container fade-up">
          <Tabs 
            value={tabValue} 
            onChange={(e, newValue) => setTabValue(newValue)}
            variant={isMobile ? "scrollable" : "fullWidth"}
            scrollButtons="auto"
            className="custom-tabs"
          >
            <Tab label="All" />
            <Tab label={`Pending (${pendingCount})`} />
            <Tab label={`Confirmed (${confirmedCount})`} />
            <Tab label={`Completed (${completedCount})`} />
            <Tab label={`Cancelled (${cancelledCount})`} />
          </Tabs>
        </div>

        {/* Loading State */}
        {loading && (
          <Box className="loading-overlay">
            <LinearProgress sx={{ width: '300px', borderRadius: '10px', bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: '#2ca6a4' } }} />
            <Typography variant="body2" sx={{ mt: 2, color: '#6c757d' }}>Loading appointments...</Typography>
          </Box>
        )}

        {/* Appointments List - Vertical Table Layout */}
        <div className="appointments-list-section fade-up">
          <div className="section-header">
            <div className="section-title-wrapper">
              <CalendarToday sx={{ color: '#2ca6a4' }} />
              <Typography variant="h5" className="section-title">
                {tabValue === 0 ? "All Appointments" : 
                 tabValue === 1 ? "Pending Appointments" :
                 tabValue === 2 ? "Confirmed Appointments" :
                 tabValue === 3 ? "Completed Appointments" : "Cancelled Appointments"}
              </Typography>
            </div>
            <Chip 
              label={`${filteredAppointments.length} ${filteredAppointments.length === 1 ? 'Appointment' : 'Appointments'}`} 
              size="small" 
              className="total-chip"
            />
          </div>

          {filteredAppointments.length === 0 && !loading ? (
            <Box className="empty-state">
              <MedicalServices sx={{ fontSize: 64, color: '#2ca6a4', opacity: 0.5 }} />
              <Typography variant="h6" color="textSecondary">No appointments found</Typography>
              <Typography variant="body2" color="textSecondary">
                {tabValue === 1 ? "No pending appointments awaiting confirmation" :
                 tabValue === 2 ? "No confirmed appointments" :
                 tabValue === 3 ? "No completed appointments" :
                 tabValue === 4 ? "No cancelled appointments" :
                 "New appointments will appear here"}
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} className="appointments-table-container" elevation={0}>
              <Table className="appointments-table" stickyHeader>
                <TableHead>
                  <TableRow className="table-header-row">
                    <TableCell className="table-header-cell">Patient</TableCell>
                    <TableCell className="table-header-cell">Date & Time</TableCell>
                    <TableCell className="table-header-cell">Service</TableCell>
                    <TableCell className="table-header-cell">Status</TableCell>
                    <TableCell className="table-header-cell actions-cell">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAppointments.map((appt, index) => (
                    <TableRow 
                      key={appt.id} 
                      className={`appointment-table-row ${selectedAppointment === appt.id ? 'expanded' : ''}`}
                      sx={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <TableCell className="patient-cell">
                        <div className="patient-info-row">
                          <Avatar className="patient-avatar-small">
                            <Person sx={{ fontSize: 20 }} />
                          </Avatar>
                          <div>
                            <Typography variant="body1" className="patient-name-row">
                              {appt.user?.username || appt.user || 'Patient'}
                            </Typography>
                            {selectedAppointment === appt.id && appt.other_concern && (
                              <Typography variant="caption" color="textSecondary">
                                Concern: {appt.other_concern}
                              </Typography>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="date-cell">
                        <div className="date-time-info">
                          <CalendarToday sx={{ fontSize: 14, color: '#2ca6a4', mr: 0.5 }} />
                          <Typography variant="body2">{formatDate(appt.date)}</Typography>
                          <AccessTime sx={{ fontSize: 14, color: '#2ca6a4', ml: 1, mr: 0.5 }} />
                          <Typography variant="body2">{formatTime(appt.time)}</Typography>
                        </div>
                      </TableCell>
                      <TableCell className="service-cell">
                        <MedicalServices sx={{ fontSize: 14, color: '#2ca6a4', mr: 0.5 }} />
                        <Typography variant="body2">
                          {appt.service || appt.other_concern || 'General Checkup'}
                        </Typography>
                      </TableCell>
                      <TableCell className="status-cell">
                        <Chip 
                          icon={getStatusIcon(appt.status)}
                          label={getStatusLabel(appt.status)}
                          size="small"
                          color={getStatusColor(appt.status)}
                          className="status-chip-table"
                        />
                      </TableCell>
                      <TableCell className="actions-cell">
                        <div className="action-buttons">
                          {appt.status === "pending" && (
                            <>
                              <Tooltip title="Confirm Appointment">
                                <Button
                                  variant="contained"
                                  className="action-btn confirm-btn"
                                  size="small"
                                  onClick={() => handleConfirmClick(appt)}
                                  startIcon={<CheckCircleOutline />}
                                >
                                  Confirm
                                </Button>
                              </Tooltip>
                              <Tooltip title="Cancel Appointment">
                                <Button
                                  variant="outlined"
                                  className="action-btn cancel-btn"
                                  size="small"
                                  onClick={() => handleCancelClick(appt)}
                                  startIcon={<Cancel />}
                                >
                                  Cancel
                                </Button>
                              </Tooltip>
                            </>
                          )}

                          {appt.status === "confirmed" && (
                            <>
                              <Tooltip title="Mark as Completed">
                                <Button
                                  variant="contained"
                                  className="action-btn complete-btn"
                                  size="small"
                                  onClick={() => updateStatus(appt.id, "completed")}
                                  startIcon={<DoneAll />}
                                >
                                  Complete
                                </Button>
                              </Tooltip>
                              <Tooltip title="Cancel Appointment">
                                <Button
                                  variant="outlined"
                                  className="action-btn cancel-btn"
                                  size="small"
                                  onClick={() => handleCancelClick(appt)}
                                  startIcon={<Cancel />}
                                >
                                  Cancel
                                </Button>
                              </Tooltip>
                            </>
                          )}

                          {appt.status === "completed" && (
                            <Chip label="Completed" color="info" size="small" />
                          )}

                          {appt.status === "cancelled" && (
                            <Chip label="Cancelled" color="error" size="small" />
                          )}

                          <Tooltip title="View Details">
                            <IconButton 
                              size="small"
                              className="view-details-btn"
                              onClick={() => setSelectedAppointment(selectedAppointment === appt.id ? null : appt.id)}
                            >
                              <Visibility sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </div>
                        
                        {/* Expanded details row */}
                        {selectedAppointment === appt.id && (
                          <div className="expanded-details-row">
                            <Divider sx={{ my: 1 }} />
                            <div className="expanded-details-content">
                              <Typography variant="subtitle2" sx={{ color: '#2ca6a4', mb: 1 }}>
                                Additional Information
                              </Typography>
                              <div className="expanded-details-grid">
                                <div className="detail-item-row">
                                  <EventNote sx={{ fontSize: 16, color: '#2ca6a4' }} />
                                  <Typography variant="body2">
                                    <strong>Booked on:</strong> {new Date(appt.created_at).toLocaleString()}
                                  </Typography>
                                </div>
                                {appt.notes && (
                                  <div className="detail-item-row">
                                    <Comment sx={{ fontSize: 16, color: '#2ca6a4' }} />
                                    <Typography variant="body2">
                                      <strong>Notes:</strong> {appt.notes}
                                    </Typography>
                                  </div>
                                )}
                                {appt.preferred_time && (
                                  <div className="detail-item-row">
                                    <AccessTime sx={{ fontSize: 16, color: '#2ca6a4' }} />
                                    <Typography variant="body2">
                                      <strong>Preferred Time:</strong> {appt.preferred_time}
                                    </Typography>
                                  </div>
                                )}
                                {appt.urgency_level && (
                                  <div className="detail-item-row">
                                    <Pending sx={{ fontSize: 16, color: '#2ca6a4' }} />
                                    <Typography variant="body2">
                                      <strong>Urgency Level:</strong> {appt.urgency_level === 1 ? 'Low' : appt.urgency_level === 2 ? 'Medium' : 'High'}
                                    </Typography>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </Box>

      {/* Confirm Appointment Dialog */}
      <Dialog 
        open={openConfirmDialog} 
        onClose={() => setOpenConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
        className="confirm-dialog"
      >
        <DialogTitle className="confirm-dialog-title">
          <CheckCircle sx={{ color: '#4caf50', fontSize: 28, mr: 1 }} />
          Confirm Appointment
        </DialogTitle>
        <DialogContent>
          {selectedActionAppointment && (
            <Box className="confirm-dialog-content">
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                Please review the appointment details before confirming
              </Alert>
              
              <div className="appointment-summary">
                <div className="summary-item">
                  <Person sx={{ color: '#2ca6a4' }} />
                  <div>
                    <Typography variant="caption" color="textSecondary">Patient</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedActionAppointment.user?.username || selectedActionAppointment.user}
                    </Typography>
                  </div>
                </div>
                
                <div className="summary-item">
                  <CalendarToday sx={{ color: '#2ca6a4' }} />
                  <div>
                    <Typography variant="caption" color="textSecondary">Date</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatDate(selectedActionAppointment.date)}
                    </Typography>
                  </div>
                </div>
                
                <div className="summary-item">
                  <AccessTime sx={{ color: '#2ca6a4' }} />
                  <div>
                    <Typography variant="caption" color="textSecondary">Time</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatTime(selectedActionAppointment.time)}
                    </Typography>
                  </div>
                </div>
                
                {(selectedActionAppointment.service || selectedActionAppointment.other_concern) && (
                  <div className="summary-item">
                    <MedicalServices sx={{ color: '#2ca6a4' }} />
                    <div>
                      <Typography variant="caption" color="textSecondary">Service/Concern</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedActionAppointment.service || selectedActionAppointment.other_concern}
                      </Typography>
                    </div>
                  </div>
                )}
              </div>
              
              <Alert severity="success" sx={{ mt: 3, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                Confirming this appointment will notify the patient and mark it as confirmed.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="confirm-dialog-actions">
          <Button 
            onClick={() => setOpenConfirmDialog(false)} 
            variant="outlined"
            startIcon={<Close />}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => selectedActionAppointment && updateStatus(selectedActionAppointment.id, "confirmed")} 
            variant="contained"
            startIcon={<CheckCircle />}
            className="confirm-action-btn"
          >
            Confirm Appointment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Appointment Dialog */}
      <Dialog 
        open={openCancelDialog} 
        onClose={() => setOpenCancelDialog(false)}
        maxWidth="sm"
        fullWidth
        className="cancel-dialog"
      >
        <DialogTitle className="cancel-dialog-title">
          <Cancel sx={{ color: '#f44336', fontSize: 28, mr: 1 }} />
          Cancel Appointment
        </DialogTitle>
        <DialogContent>
          {selectedActionAppointment && (
            <Box className="cancel-dialog-content">
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                Are you sure you want to cancel this appointment?
              </Alert>
              
              <div className="appointment-summary">
                <div className="summary-item">
                  <Person sx={{ color: '#2ca6a4' }} />
                  <div>
                    <Typography variant="caption" color="textSecondary">Patient</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedActionAppointment.user?.username || selectedActionAppointment.user}
                    </Typography>
                  </div>
                </div>
                
                <div className="summary-item">
                  <CalendarToday sx={{ color: '#2ca6a4' }} />
                  <div>
                    <Typography variant="caption" color="textSecondary">Date</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatDate(selectedActionAppointment.date)}
                    </Typography>
                  </div>
                </div>
                
                <div className="summary-item">
                  <AccessTime sx={{ color: '#2ca6a4' }} />
                  <div>
                    <Typography variant="caption" color="textSecondary">Time</Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {formatTime(selectedActionAppointment.time)}
                    </Typography>
                  </div>
                </div>
                
                {(selectedActionAppointment.service || selectedActionAppointment.other_concern) && (
                  <div className="summary-item">
                    <MedicalServices sx={{ color: '#2ca6a4' }} />
                    <div>
                      <Typography variant="caption" color="textSecondary">Service/Concern</Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedActionAppointment.service || selectedActionAppointment.other_concern}
                      </Typography>
                    </div>
                  </div>
                )}
              </div>
              
              <Alert severity="error" sx={{ mt: 3, borderRadius: 2, bgcolor: '#ffebee' }}>
                This action cannot be undone. The patient will be notified of the cancellation.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="cancel-dialog-actions">
          <Button 
            onClick={() => setOpenCancelDialog(false)} 
            variant="outlined"
            startIcon={<Close />}
          >
            Keep Appointment
          </Button>
          <Button 
            onClick={() => selectedActionAppointment && updateStatus(selectedActionAppointment.id, "cancelled")} 
            variant="contained"
            startIcon={<DeleteOutline />}
            className="cancel-action-btn"
            color="error"
          >
            Cancel Appointment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for messages */}
      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={() => setMessage({ ...message, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={message.type} sx={{ fontSize: '1rem', alignItems: 'center' }}>
          {message.text}
        </Alert>
      </Snackbar>
    </Box>
  );
}