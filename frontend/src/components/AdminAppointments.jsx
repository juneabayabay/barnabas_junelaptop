import React, { useEffect, useState } from "react";
import AxiosInstance from "./AxiosInstance";
import {
  Box, Typography, Button, LinearProgress, Chip, IconButton, useTheme,
  useMediaQuery, Dialog, DialogTitle, DialogContent, DialogActions,
  Alert, Snackbar, Tabs, Tab, Avatar, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Tooltip
} from "@mui/material";
import {
  CheckCircle, Cancel, Visibility, AccessTime, CalendarToday, Person,
  MedicalServices, Comment, Pending, ConfirmationNumber, Close, Refresh,
  CheckCircleOutline, DeleteOutline, DoneAll, EventNote, ErrorOutline
} from "@mui/icons-material";
import "./style/AdminAppointments.css";

const statusConfig = {
  confirmed: { color: 'success', icon: <CheckCircle sx={{ fontSize: 16 }} />, label: 'Confirmed' },
  cancelled: { color: 'error', icon: <Cancel sx={{ fontSize: 16 }} />, label: 'Cancelled' },
  completed: { color: 'info', icon: <ConfirmationNumber sx={{ fontSize: 16 }} />, label: 'Completed' },
  pending: { color: 'warning', icon: <Pending sx={{ fontSize: 16 }} />, label: 'Pending' }
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ open: false, text: "", type: "success" });
  const [selectedId, setSelectedId] = useState(null);
  const [dialog, setDialog] = useState({ open: false, type: '', appointment: null });
  const [tabValue, setTabValue] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      console.log("Token:", token ? "Exists" : "Missing");
      
      const { data } = await AxiosInstance.get("appointments/");
      console.log("Raw API Response:", data);
      console.log("Number of appointments:", data.length);
      
      // Log each appointment's status
      data.forEach(app => {
        console.log(`Appointment ${app.id}: Status=${app.status}, User=${app.user_username}, Date=${app.date}`);
      });
      
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => {
          const dateCompare = new Date(b.date) - new Date(a.date);
          if (dateCompare !== 0) return dateCompare;
          return (b.time || '').localeCompare(a.time || '');
        });
        setAppointments(sorted);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error("Fetch error details:", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);
      
      const errorMsg = error.response?.status === 401 ? "Please login again" : 
                       error.response?.status === 403 ? "You don't have permission to view appointments" :
                       error.response?.status === 500 ? "Server error. Please try again later." :
                       "Could not fetch appointments. Please check your connection.";
      setError(errorMsg);
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchAppointments(); 
    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (text, type = "success") => {
    setToast({ open: true, text, type });
    setTimeout(() => setToast(prev => ({ ...prev, open: false })), 3000);
  };

  const updateStatus = async (id, status) => {
    setLoading(true);
    try {
      await AxiosInstance.patch(`appointments/${id}/`, { status });
      showToast(`Appointment ${status === 'completed' ? 'marked as completed' : status} successfully!`, "success");
      await fetchAppointments();
      setDialog({ open: false, type: '', appointment: null });
      setSelectedId(null);
    } catch (error) {
      console.error("Update error:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || `Error updating appointment`;
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const getFilteredApps = () => {
    if (tabValue === 0) return appointments;
    const statusMap = { 
      1: 'pending', 
      2: 'confirmed', 
      3: 'completed', 
      4: 'cancelled' 
    };
    return appointments.filter(a => a.status === statusMap[tabValue]);
  };

  const counts = {
    total: appointments.length,
    pending: appointments.filter(a => a?.status === 'pending').length,
    confirmed: appointments.filter(a => a?.status === 'confirmed').length,
    completed: appointments.filter(a => a?.status === 'completed').length,
    cancelled: appointments.filter(a => a?.status === 'cancelled').length
  };

  const stats = [
    { label: 'Total', value: counts.total, icon: <EventNote />, tab: 0, color: '#2ca6a4' },
    { label: 'Pending', value: counts.pending, icon: <Pending />, tab: 1, color: '#ff9800' },
    { label: 'Confirmed', value: counts.confirmed, icon: <CheckCircle />, tab: 2, color: '#4caf50' },
    { label: 'Completed', value: counts.completed, icon: <ConfirmationNumber />, tab: 3, color: '#2196f3' },
    { label: 'Cancelled', value: counts.cancelled, icon: <Cancel />, tab: 4, color: '#f44336' }
  ];

  const filteredApps = getFilteredApps();

  const getUserName = (appt) => {
    return appt.user_username || appt.user?.username || appt.user?.email?.split('@')[0] || 'Patient';
  };

  const getServiceName = (appt) => {
    return appt.service || appt.other_concern || 'General Checkup';
  };

  const getOtherConcern = (appt) => {
    return appt.other_concern || appt.notes || '';
  };

  return (
    <Box className="appointments-wrapper">
      <div className="appointments-bg-animation">
        {[...Array(6)].map((_, i) => <div key={i} className={`appointments-bg-circle appointments-bg-circle-${i + 1}`}></div>)}
      </div>
      <div className="appointments-particles">
        {[...Array(30)].map((_, i) => <div key={i} className="appointments-particle" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 15}s`, animationDuration: `${8 + Math.random() * 15}s` }}></div>)}
      </div>

      <Box className="appointments-content">
        {/* Header */}
        <Box className="appointments-header-glass fade-down">
          <Box className="header-left">
            <div className="header-badge"><MedicalServices sx={{ fontSize: 18 }} /><Typography variant="caption">Admin Dashboard</Typography></div>
            <Typography variant="h4" className="header-title">Appointment Management</Typography>
            <Typography variant="body2" className="header-subtitle">Manage and track all patient appointments from one centralized dashboard.</Typography>
          </Box>
          <Button variant="outlined" size="small" onClick={fetchAppointments} startIcon={<Refresh />} className="refresh-btn" disabled={loading}>Refresh</Button>
        </Box>

        {/* Stats Cards */}
        <div className="stats-grid fade-up">
          {stats.map(stat => (
            <div key={stat.label} className={`stat-card ${stat.label.toLowerCase()}-stat`} onClick={() => setTabValue(stat.tab)}>
              <div className="stat-icon-wrapper" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>{stat.icon}</div>
              <div className="stat-details">
                <Typography variant="body2" className="stat-label">{stat.label}</Typography>
                <Typography variant="h3" className="stat-value">{stat.value}</Typography>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs-container fade-up">
          <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} variant={isMobile ? "scrollable" : "fullWidth"} scrollButtons="auto" className="custom-tabs">
            <Tab label={`All (${counts.total})`} />
            <Tab label={`Pending (${counts.pending})`} />
            <Tab label={`Confirmed (${counts.confirmed})`} />
            <Tab label={`Completed (${counts.completed})`} />
            <Tab label={`Cancelled (${counts.cancelled})`} />
          </Tabs>
        </div>

        {/* Loading State */}
        {loading && (
          <Box className="loading-overlay">
            <LinearProgress sx={{ width: 300, borderRadius: 10, '& .MuiLinearProgress-bar': { bgcolor: '#2ca6a4' } }} />
            <Typography sx={{ mt: 2, color: '#6c757d' }}>Loading appointments...</Typography>
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Box className="error-state">
            <ErrorOutline sx={{ fontSize: 64, color: '#f44336', mb: 2 }} />
            <Typography variant="h6" color="error">{error}</Typography>
            <Button 
              variant="contained" 
              onClick={fetchAppointments} 
              sx={{ mt: 2, bgcolor: '#2ca6a4' }}
              startIcon={<Refresh />}
            >
              Try Again
            </Button>
          </Box>
        )}

        {/* Appointments Table */}
        {!error && (
          <div className="appointments-list-section fade-up">
            <div className="section-header">
              <div className="section-title-wrapper">
                <CalendarToday sx={{ color: '#2ca6a4' }} />
                <Typography variant="h5" className="section-title">
                  {['All Appointments', 'Pending Appointments', 'Confirmed Appointments', 'Completed Appointments', 'Cancelled Appointments'][tabValue]}
                </Typography>
              </div>
              <Chip label={`${filteredApps.length} ${filteredApps.length === 1 ? 'Appointment' : 'Appointments'}`} size="small" className="total-chip" />
            </div>

            {filteredApps.length === 0 && !loading ? (
              <Box className="empty-state">
                <MedicalServices sx={{ fontSize: 64, color: '#2ca6a4', opacity: 0.5 }} />
                <Typography variant="h6" color="textSecondary">No appointments found</Typography>
                <Typography variant="body2" color="textSecondary">
                  {tabValue === 0 ? "No appointments have been booked yet" :
                   tabValue === 1 ? "No pending appointments awaiting confirmation" :
                   tabValue === 2 ? "No confirmed appointments" :
                   tabValue === 3 ? "No completed appointments" : "No cancelled appointments"}
                </Typography>
                {tabValue === 1 && (
                  <Button 
                    variant="contained" 
                    onClick={fetchAppointments} 
                    sx={{ mt: 2, bgcolor: '#2ca6a4' }}
                    startIcon={<Refresh />}
                  >
                    Refresh
                  </Button>
                )}
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
                    {filteredApps.map((appt, idx) => (
                      <React.Fragment key={appt.id}>
                        <TableRow className="appointment-table-row" sx={{ animationDelay: `${idx * 0.05}s` }}>
                          <TableCell>
                            <div className="patient-info-row">
                              <Avatar className="patient-avatar-small"><Person sx={{ fontSize: 20 }} /></Avatar>
                              <div>
                                <Typography variant="body1" className="patient-name-row">
                                  {getUserName(appt)}
                                </Typography>
                                {appt.user_email && (
                                  <Typography variant="caption" color="textSecondary" sx={{ fontSize: '11px', display: 'block' }}>
                                    {appt.user_email}
                                  </Typography>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="date-time-info">
                              <CalendarToday sx={{ fontSize: 14, color: '#2ca6a4', mr: 0.5 }} />
                              <Typography variant="body2">{formatDate(appt.date)}</Typography>
                              <AccessTime sx={{ fontSize: 14, color: '#2ca6a4', ml: 1, mr: 0.5 }} />
                              <Typography variant="body2">{formatTime(appt.time)}</Typography>
                            </div>
                          </TableCell>
                          <TableCell>
                            <MedicalServices sx={{ fontSize: 14, color: '#2ca6a4', mr: 0.5 }} />
                            <Typography variant="body2">{getServiceName(appt)}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              icon={statusConfig[appt.status]?.icon} 
                              label={statusConfig[appt.status]?.label || appt.status} 
                              size="small" 
                              color={statusConfig[appt.status]?.color} 
                              className="status-chip-table" 
                            />
                          </TableCell>
                          <TableCell>
                            <div className="action-buttons">
                              {/* Pending appointments - can confirm or cancel */}
                              {appt.status === "pending" && (
                                <>
                                  <Tooltip title="Confirm Appointment">
                                    <Button 
                                      variant="contained" 
                                      className="action-btn confirm-btn" 
                                      size="small" 
                                      onClick={() => setDialog({ open: true, type: 'confirm', appointment: appt })} 
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
                                      onClick={() => setDialog({ open: true, type: 'cancel', appointment: appt })} 
                                      startIcon={<Cancel />}
                                    >
                                      Cancel
                                    </Button>
                                  </Tooltip>
                                </>
                              )}
                              
                              {/* Confirmed appointments - can complete or cancel */}
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
                                      onClick={() => setDialog({ open: true, type: 'cancel', appointment: appt })} 
                                      startIcon={<Cancel />}
                                    >
                                      Cancel
                                    </Button>
                                  </Tooltip>
                                </>
                              )}
                              
                              {/* Completed or cancelled - just show status */}
                              {appt.status === "completed" && (
                                <Chip label="Completed" color="info" size="small" />
                              )}
                              {appt.status === "cancelled" && (
                                <Chip label="Cancelled" color="error" size="small" />
                              )}
                              
                              <Tooltip title="View Details">
                                <IconButton size="small" onClick={() => setSelectedId(selectedId === appt.id ? null : appt.id)}>
                                  <Visibility sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            </div>
                            
                            {/* Expanded details */}
                            {selectedId === appt.id && (
                              <div className="expanded-details-row">
                                <Divider sx={{ my: 1 }} />
                                <div className="expanded-details-content">
                                  <Typography variant="subtitle2" sx={{ color: '#2ca6a4', mb: 1 }}>Additional Information</Typography>
                                  <div className="expanded-details-grid">
                                    <div className="detail-item-row">
                                      <EventNote sx={{ fontSize: 16, color: '#2ca6a4' }} />
                                      <Typography variant="body2"><strong>Booked:</strong> {new Date(appt.created_at).toLocaleString()}</Typography>
                                    </div>
                                    {getOtherConcern(appt) && (
                                      <div className="detail-item-row">
                                        <MedicalServices sx={{ fontSize: 16, color: '#2ca6a4' }} />
                                        <Typography variant="body2"><strong>Concern:</strong> {getOtherConcern(appt)}</Typography>
                                      </div>
                                    )}
                                    {appt.notes && (
                                      <div className="detail-item-row">
                                        <Comment sx={{ fontSize: 16, color: '#2ca6a4' }} />
                                        <Typography variant="body2"><strong>Notes:</strong> {appt.notes}</Typography>
                                      </div>
                                    )}
                                    {appt.urgency_level && (
                                      <div className="detail-item-row">
                                        <Pending sx={{ fontSize: 16, color: '#2ca6a4' }} />
                                        <Typography variant="body2"><strong>Urgency:</strong> {['Low', 'Medium', 'High'][appt.urgency_level - 1]}</Typography>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </div>
        )}
      </Box>

      {/* Confirm Dialog */}
      <Dialog open={dialog.open && dialog.type === 'confirm'} onClose={() => setDialog({ ...dialog, open: false })} maxWidth="sm" fullWidth className="confirm-dialog">
        <DialogTitle className="confirm-dialog-title">
          <CheckCircle sx={{ color: '#4caf50', fontSize: 28, mr: 1 }} />
          Confirm Appointment
        </DialogTitle>
        <DialogContent>
          {dialog.appointment && (
            <Box>
              <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                Please review the appointment details before confirming
              </Alert>
              <div className="appointment-summary">
                {[
                  { icon: <Person />, label: 'Patient', value: getUserName(dialog.appointment) },
                  { icon: <CalendarToday />, label: 'Date', value: formatDate(dialog.appointment.date) },
                  { icon: <AccessTime />, label: 'Time', value: formatTime(dialog.appointment.time) },
                  { icon: <MedicalServices />, label: 'Service', value: getServiceName(dialog.appointment) }
                ].map((item, i) => (
                  <div key={i} className="summary-item">
                    <div className="summary-icon">{item.icon}</div>
                    <div>
                      <Typography variant="caption" color="textSecondary">{item.label}</Typography>
                      <Typography variant="body1" fontWeight="bold">{item.value}</Typography>
                    </div>
                  </div>
                ))}
              </div>
              <Alert severity="success" sx={{ mt: 3, borderRadius: 2, bgcolor: '#e8f5e9' }}>
                Confirming will notify the patient and mark the appointment as confirmed.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="confirm-dialog-actions">
          <Button onClick={() => setDialog({ ...dialog, open: false })} variant="outlined" startIcon={<Close />}>Cancel</Button>
          <Button 
            onClick={() => updateStatus(dialog.appointment?.id, "confirmed")} 
            variant="contained" 
            startIcon={<CheckCircle />} 
            className="confirm-action-btn"
          >
            Confirm Appointment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={dialog.open && dialog.type === 'cancel'} onClose={() => setDialog({ ...dialog, open: false })} maxWidth="sm" fullWidth className="cancel-dialog">
        <DialogTitle className="cancel-dialog-title">
          <Cancel sx={{ color: '#f44336', fontSize: 28, mr: 1 }} />
          Cancel Appointment
        </DialogTitle>
        <DialogContent>
          {dialog.appointment && (
            <Box>
              <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                Are you sure you want to cancel this appointment?
              </Alert>
              <div className="appointment-summary">
                {[
                  { icon: <Person />, label: 'Patient', value: getUserName(dialog.appointment) },
                  { icon: <CalendarToday />, label: 'Date', value: formatDate(dialog.appointment.date) },
                  { icon: <AccessTime />, label: 'Time', value: formatTime(dialog.appointment.time) },
                  { icon: <MedicalServices />, label: 'Service', value: getServiceName(dialog.appointment) }
                ].map((item, i) => (
                  <div key={i} className="summary-item">
                    <div className="summary-icon">{item.icon}</div>
                    <div>
                      <Typography variant="caption" color="textSecondary">{item.label}</Typography>
                      <Typography variant="body1" fontWeight="bold">{item.value}</Typography>
                    </div>
                  </div>
                ))}
              </div>
              <Alert severity="error" sx={{ mt: 3, borderRadius: 2, bgcolor: '#ffebee' }}>
                This action cannot be undone. The patient will be notified.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions className="cancel-dialog-actions">
          <Button onClick={() => setDialog({ ...dialog, open: false })} variant="outlined" startIcon={<Close />}>Keep Appointment</Button>
          <Button 
            onClick={() => updateStatus(dialog.appointment?.id, "cancelled")} 
            variant="contained" 
            startIcon={<DeleteOutline />} 
            className="cancel-action-btn" 
            color="error"
          >
            Cancel Appointment
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={toast.type} sx={{ fontSize: '1rem' }}>{toast.text}</Alert>
      </Snackbar>
    </Box>
  );
}