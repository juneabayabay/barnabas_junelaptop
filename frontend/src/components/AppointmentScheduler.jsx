// src/components/AppointmentScheduler.jsx
import React, { useState, useEffect } from "react";
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
  Checkbox,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
  Snackbar,
  Chip,
  Paper,
  Divider,
  IconButton,
  Grid,
  Container,
  useMediaQuery,
  useTheme,
  Fade,
  Zoom,
  Slide,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  CalendarToday as CalendarIcon,
  ArrowBack as ArrowBackIcon,
  EventAvailable as EventAvailableIcon,
  Warning as WarningIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
} from "@mui/icons-material";

// Constants
const CLINIC_OPEN = 9;
const CLINIC_CLOSE = 18;
const LUNCH_START = 12;
const LUNCH_END = 13;
const MAX_PATIENTS_PER_SLOT = 2;

const SERVICES = [
  { id: "cleaning", name: "Teeth Cleaning", duration: 60, price: "₱1,000", minHours: 1 },
  { id: "extraction", name: "Tooth Extraction", duration: 60, price: "₱1,500", minHours: 1 },
  { id: "filling", name: "Dental Filling", duration: 60, price: "₱2,000", minHours: 1 },
  { id: "orthodontic", name: "Orthodontic Procedure", duration: 180, price: "₱50,000", minHours: 3 },
];

const fmtTime = (hour, minute) => {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = CLINIC_OPEN; hour < CLINIC_CLOSE; hour++) {
    if (hour >= LUNCH_START && hour < LUNCH_END) continue;
    slots.push({ hour, minute: 0, time: fmtTime(hour, 0), timeValue: `${hour}:00` });
    slots.push({ hour, minute: 30, time: fmtTime(hour, 30), timeValue: `${hour}:30` });
  }
  return slots;
};

const getAvailableTimeSlots = (existingAppointments, selectedDate, selectedService) => {
  const allSlots = generateTimeSlots();
  const requiredDuration = selectedService?.duration || 30;
  const requiredHours = Math.ceil(requiredDuration / 60);
  
  return allSlots.map((slot, index) => {
    // Check if slot is available
    const appointmentsAtSlot = existingAppointments.filter(
      a => a.time === `${slot.hour}:${slot.minute.toString().padStart(2, '0')}` && a.status !== "cancelled"
    );
    const isAvailable = appointmentsAtSlot.length < MAX_PATIENTS_PER_SLOT;
    
    // Check if there's enough time before lunch or closing
    let hasEnoughTime = true;
    const slotEndHour = slot.hour + (slot.minute + requiredDuration) / 60;
    const slotEndMinute = (slot.minute + requiredDuration) % 60;
    
    if (slotEndHour > LUNCH_START && slot.hour < LUNCH_END) {
      hasEnoughTime = false; // Would run into lunch
    }
    if (slotEndHour > CLINIC_CLOSE || (slotEndHour === CLINIC_CLOSE && slotEndMinute > 0)) {
      hasEnoughTime = false; // Would exceed closing time
    }
    
    // Check consecutive slots for long procedures
    let hasConsecutiveSlots = true;
    if (requiredHours > 1) {
      for (let i = 1; i < requiredHours * 2; i++) {
        const nextSlot = allSlots[index + i];
        if (!nextSlot) {
          hasConsecutiveSlots = false;
          break;
        }
        const nextSlotAppointments = existingAppointments.filter(
          a => a.time === `${nextSlot.hour}:${nextSlot.minute.toString().padStart(2, '0')}` && a.status !== "cancelled"
        );
        if (nextSlotAppointments.length >= MAX_PATIENTS_PER_SLOT) {
          hasConsecutiveSlots = false;
          break;
        }
      }
    }
    
    return {
      ...slot,
      available: isAvailable && hasEnoughTime && hasConsecutiveSlots,
      bookedCount: appointmentsAtSlot.length,
      maxPerSlot: MAX_PATIENTS_PER_SLOT,
    };
  });
};

export default function AppointmentScheduler({ role = "client", username }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [step, setStep] = useState(0); // 0: date, 1: service, 2: time, 3: confirm
  const [form, setForm] = useState({ 
    patient_name: username || "",
    patient_email: "",
    patient_phone: "",
    notes: "",
    other_concern: ""
  });
  const [showOther, setShowOther] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myAppointments, setMyAppointments] = useState([]);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    fetchAppointments();
    if (username) fetchMyAppointments();
  }, [username]);

  const fetchAppointments = async () => {
    try {
      const { data } = await AxiosInstance.get("appointments/");
      setAppointments(data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    }
  };

  const fetchMyAppointments = async () => {
    try {
      const { data } = await AxiosInstance.get(`appointments/?patient=${username}`);
      setMyAppointments(data);
    } catch (err) {
      console.error("Error fetching my appointments:", err);
    }
  };

  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
    setTimeout(() => setToast({ ...toast, open: false }), 4000);
  };

  const isPastDate = (year, month, day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(year, month, day) < today;
  };

  const isSunday = (year, month, day) => new Date(year, month, day).getDay() === 0;

  const handleDateSelect = (day, month, year) => {
    if (isPastDate(year, month, day)) {
      showToast("Cannot book appointments for past dates", "warning");
      return;
    }
    if (isSunday(year, month, day)) {
      showToast("Clinic is closed on Sundays", "warning");
      return;
    }
    setSelectedDate({ day, month, year });
    setStep(1);
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setStep(2);
  };

  const handleTimeSlotSelect = (slot) => {
    if (!slot.available) {
      showToast("This time slot is not available for your selected service", "warning");
      return;
    }
    setSelectedTimeSlot(slot);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 1) setSelectedDate(null);
    if (step === 2) setSelectedService(null);
    if (step === 3) setSelectedTimeSlot(null);
    setStep(Math.max(0, step - 1));
  };

  const confirmBooking = async () => {
    if (!form.patient_name || !form.patient_email || !form.patient_phone) {
      showToast("Please fill in all required fields", "warning");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        date: `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`,
        time: selectedTimeSlot.timeValue,
        service: showOther ? null : selectedService?.id,
        other_concern: showOther ? form.other_concern : null,
        patient_name: form.patient_name,
        patient_email: form.patient_email,
        patient_phone: form.patient_phone,
        notes: form.notes,
        status: "pending"
      };
      
      await AxiosInstance.post("appointments/", payload);
      showToast("✅ Appointment reserved! Please wait for confirmation via email.", "success");
      
      // Reset form
      setSelectedDate(null);
      setSelectedService(null);
      setSelectedTimeSlot(null);
      setStep(0);
      setForm({ patient_name: username || "", patient_email: "", patient_phone: "", notes: "", other_concern: "" });
      setShowOther(false);
      fetchAppointments();
      fetchMyAppointments();
    } catch (error) {
      showToast(error.response?.data?.message || "Error booking appointment", "error");
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    setLoading(true);
    try {
      await AxiosInstance.delete(`appointments/${appointmentId}/`);
      showToast("Appointment cancelled successfully", "success");
      fetchAppointments();
      fetchMyAppointments();
    } catch (error) {
      showToast("Error cancelling appointment", "error");
    } finally {
      setLoading(false);
    }
  };

  const renderCalendar = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const blanks = Array(firstDayOfMonth).fill(null);
    const days = [...blanks, ...Array.from({ length: totalDays }, (_, i) => i + 1)];
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

    const getDayBookings = (day) => appointments.filter(a => {
      const d = new Date(a.date);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year && a.status !== "cancelled";
    }).length;

    return (
      <Fade in={step === 0} timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4, bgcolor: 'background.paper' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <IconButton onClick={() => setCurrentDate(new Date(year, month - 1, 1))} sx={{ bgcolor: 'action.hover' }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {currentDate.toLocaleString("default", { month: "long" })} {year}
            </Typography>
            <IconButton onClick={() => setCurrentDate(new Date(year, month + 1, 1))} sx={{ bgcolor: 'action.hover' }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 2 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
              <Typography key={day} textAlign="center" fontWeight="bold" color="text.secondary">{day}</Typography>
            ))}
          </Box>
          
          {weeks.map((week, idx) => (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
              {week.map((day, i) => {
                if (!day) return <Box key={i} sx={{ p: 2 }} />;
                
                const isPast = isPastDate(year, month, day);
                const isSun = isSunday(year, month, day);
                const bookings = getDayBookings(day);
                
                return (
                  <Zoom in key={i}>
                    <Paper
                      elevation={0}
                      onClick={() => !isPast && !isSun && handleDateSelect(day, month, year)}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        textAlign: 'center',
                        cursor: isPast || isSun ? 'not-allowed' : 'pointer',
                        opacity: isPast || isSun ? 0.5 : 1,
                        bgcolor: isSun ? '#ffebee' : 'background.paper',
                        borderRadius: 2,
                        transition: 'all 0.3s',
                        '&:hover': !isPast && !isSun ? { transform: 'translateY(-4px)', boxShadow: 3, bgcolor: '#e3f2fd' } : {},
                      }}
                    >
                      <Typography fontWeight="bold" variant="h6">{day}</Typography>
                      {!isPast && !isSun && bookings > 0 && (
                        <Chip label={`${bookings} booked`} size="small" color="primary" sx={{ mt: 0.5, fontSize: '10px' }} />
                      )}
                      {isSun && <Typography variant="caption" color="error">Closed</Typography>}
                    </Paper>
                  </Zoom>
                );
              })}
            </Box>
          ))}
        </Paper>
      </Fade>
    );
  };

  const renderServiceSelection = () => {
    const dateStr = selectedDate ? new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString() : "";
    
    return (
      <Slide direction="left" in={step === 1} mountOnEnter unmountOnExit timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3 }}>Back</Button>
          
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            Selected Date: <strong>{dateStr}</strong>
          </Alert>
          
          <Typography variant="h5" fontWeight="bold" gutterBottom>Select Dental Service</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Duration affects available time slots
          </Typography>
          
          <Stack spacing={2}>
            {SERVICES.map(service => (
              <Paper
                key={service.id}
                elevation={0}
                onClick={() => handleServiceSelect(service)}
                sx={{
                  p: 2,
                  border: `2px solid ${selectedService?.id === service.id ? '#1976d2' : '#e0e0e0'}`,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  bgcolor: selectedService?.id === service.id ? '#e3f2fd' : 'background.paper',
                  '&:hover': { transform: 'translateX(8px)', borderColor: '#1976d2' }
                }}
              >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                  <Box>
                    <Typography variant="h6" fontWeight="bold">{service.name}</Typography>
                    <Typography variant="body2" color="text.secondary">Duration: {service.duration} min</Typography>
                  </Box>
                  <Typography variant="h5" color="primary" fontWeight="bold">{service.price}</Typography>
                </Box>
              </Paper>
            ))}
          </Stack>
          
          <Divider sx={{ my: 3 }} />
          
          <FormControlLabel
            control={<Checkbox checked={showOther} onChange={(e) => setShowOther(e.target.checked)} />}
            label="I have other concerns not listed"
          />
          
          {showOther && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Please describe your concerns"
              value={form.other_concern}
              onChange={(e) => setForm({ ...form, other_concern: e.target.value })}
              sx={{ mt: 2 }}
            />
          )}
        </Paper>
      </Slide>
    );
  };

  const renderTimeSlots = () => {
    if (!selectedDate || !selectedService) return null;
    
    const dayAppts = appointments.filter(a => {
      const d = new Date(a.date);
      return d.getDate() === selectedDate.day && 
             d.getMonth() === selectedDate.month && 
             d.getFullYear() === selectedDate.year &&
             a.status !== "cancelled";
    });
    
    const slots = getAvailableTimeSlots(dayAppts, selectedDate, selectedService);
    const dateStr = new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString();
    
    return (
      <Slide direction="left" in={step === 2} mountOnEnter unmountOnExit timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3 }}>Back</Button>
          
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <strong>{dateStr}</strong> | Service: <strong>{selectedService.name}</strong> ({selectedService.duration} min)
          </Alert>
          
          <Typography variant="h5" fontWeight="bold" gutterBottom>Select Time Slot</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedService.duration > 60 && "⚠️ Long procedure - needs consecutive slots"}
          </Typography>
          
          <Grid container spacing={2}>
            {slots.map((slot, idx) => (
              <Grid item xs={6} sm={4} md={3} key={idx}>
                <Zoom in timeout={idx * 50}>
                  <Button
                    fullWidth
                    variant={slot.available ? "outlined" : "contained"}
                    disabled={!slot.available}
                    onClick={() => handleTimeSlotSelect(slot)}
                    sx={{
                      py: 2,
                      borderRadius: 2,
                      borderWidth: 2,
                      transition: 'all 0.3s',
                      '&:hover': slot.available && { transform: 'translateY(-4px)', boxShadow: 2 }
                    }}
                  >
                    <Stack alignItems="center">
                      <AccessTimeIcon />
                      <Typography fontWeight="bold">{slot.time}</Typography>
                      {!slot.available && <Chip label="Unavailable" size="small" color="error" sx={{ mt: 0.5 }} />}
                    </Stack>
                  </Button>
                </Zoom>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Slide>
    );
  };

  const renderConfirmation = () => {
    if (!selectedDate || !selectedService || !selectedTimeSlot) return null;
    
    const dateStr = new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString();
    
    return (
      <Slide direction="up" in={step === 3} mountOnEnter unmountOnExit timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 4 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>Confirm Your Appointment</Typography>
          
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="info" icon={<ConfirmationNumberIcon />}>
              Please review your details before confirming
            </Alert>
            
            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" color="primary" fontWeight="bold">📅 Appointment Details</Typography>
              <Typography variant="h6">{dateStr} at {selectedTimeSlot.time}</Typography>
              <Typography variant="body1" sx={{ mt: 1 }}>
                <strong>Service:</strong> {selectedService.name} ({selectedService.duration} min) - {selectedService.price}
              </Typography>
              {showOther && form.other_concern && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  <strong>Concerns:</strong> {form.other_concern}
                </Typography>
              )}
            </Paper>
            
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" color="primary" fontWeight="bold">👤 Your Information</Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField label="Full Name *" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Email *" type="email" value={form.patient_email} onChange={(e) => setForm({ ...form, patient_email: e.target.value })} fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Phone *" value={form.patient_phone} onChange={(e) => setForm({ ...form, patient_phone: e.target.value })} fullWidth size="small" />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Notes (Optional)" multiline rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} fullWidth size="small" />
                </Grid>
              </Grid>
            </Paper>
          </Stack>
          
          <Box display="flex" gap={2} sx={{ mt: 3 }}>
            <Button variant="outlined" onClick={handleBack} fullWidth size="large">Back</Button>
            <Button variant="contained" onClick={confirmBooking} disabled={loading} fullWidth size="large">
              {loading ? "Booking..." : "Confirm Reservation"}
            </Button>
          </Box>
        </Paper>
      </Slide>
    );
  };

  const renderMyAppointments = () => (
    <Paper elevation={3} sx={{ p: 2, borderRadius: 4, height: 'fit-content', position: 'sticky', top: 20 }}>
      <Typography variant="h6" fontWeight="bold" gutterBottom>My Appointments</Typography>
      <Divider sx={{ mb: 2 }} />
      {myAppointments.length === 0 ? (
        <Box textAlign="center" py={3}>
          <CalendarIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">No appointments</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {myAppointments.map(app => (
            <Paper key={app.id} variant="outlined" sx={{ p: 1.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box>
                  <Typography variant="body2" fontWeight="bold">{new Date(app.date).toLocaleDateString()}</Typography>
                  <Typography variant="caption" color="text.secondary">{app.time}</Typography>
                  <Chip label={app.status} size="small" color={app.status === 'confirmed' ? 'success' : 'warning'} sx={{ mt: 0.5, fontSize: '10px' }} />
                </Box>
                <IconButton size="small" color="error" onClick={() => cancelAppointment(app.id)}>
                  <CancelIcon fontSize="small" />
                </IconButton>
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', py: 4 }}>
      <Container maxWidth="xl">
        <Typography variant={isMobile ? "h4" : "h3"} align="center" gutterBottom fontWeight="bold" sx={{ color: '#1976d2', mb: 4 }}>
          🦷 Dental Clinic Scheduler
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} lg={step === 0 ? 12 : 9}>
            <Box sx={{ maxWidth: step === 0 ? 900 : '100%', mx: 'auto', width: '100%' }}>
              {step === 0 && renderCalendar()}
              {step === 1 && renderServiceSelection()}
              {step === 2 && renderTimeSlots()}
              {step === 3 && renderConfirmation()}
            </Box>
          </Grid>
          
          {username && step === 0 && (
            <Grid item xs={12} lg={3}>
              {renderMyAppointments()}
            </Grid>
          )}
        </Grid>
        
        <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={toast.severity} sx={{ fontSize: '1rem' }}>{toast.message}</Alert>
        </Snackbar>
        
        {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}
      </Container>
    </Box>
  );
}