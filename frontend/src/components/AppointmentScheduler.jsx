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
  Stepper,
  Step,
  StepLabel,
  Grid,
  Badge,
  Container,
  useMediaQuery,
  useTheme,
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
const MAX_PATIENTS_DAY = 12;

const SERVICES = [
  { id: "cleaning", name: "Teeth Cleaning", duration: 30, price: "₱1,000" },
  { id: "extraction", name: "Tooth Extraction", duration: 45, price: "₱1,000" },
  { id: "filling", name: "Dental Filling", duration: 60, price: "₱1,000" },
  { id: "orthodontic", name: "Orthodontic Procedure", duration: 90, price: "₱50,000" },
];

// Helper functions
const fmtTime = (hour, minute) => {
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = CLINIC_OPEN; hour < CLINIC_CLOSE; hour++) {
    if (hour >= LUNCH_START && hour < LUNCH_END) continue;
    
    slots.push({
      hour,
      minute: 0,
      time: fmtTime(hour, 0),
      timeValue: `${hour}:00`,
    });
    
    slots.push({
      hour,
      minute: 30,
      time: fmtTime(hour, 30),
      timeValue: `${hour}:30`,
    });
  }
  return slots;
};

const isPastDate = (year, month, day) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(year, month, day);
  return checkDate < today;
};

const isSunday = (year, month, day) => {
  return new Date(year, month, day).getDay() === 0;
};

const getAvailableTimeSlots = (existingAppointments, date) => {
  const allSlots = generateTimeSlots();
  
  return allSlots.map(slot => {
    const appointmentsAtSlot = existingAppointments.filter(
      a => a.time === `${slot.hour}:${slot.minute.toString().padStart(2, '0')}` && a.status !== "cancelled"
    );
    const isAvailable = appointmentsAtSlot.length < MAX_PATIENTS_PER_SLOT;
    
    return {
      ...slot,
      available: isAvailable,
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
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  
  // Form state
  const [form, setForm] = useState({ 
    date: "", 
    time: "", 
    timeValue: "",
    service: "", 
    serviceDetails: null,
    other_concern: "",
    patient_name: username || "",
    patient_email: "",
    patient_phone: "",
    notes: ""
  });
  const [showOther, setShowOther] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [myAppointments, setMyAppointments] = useState([]);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastSeverity, setToastSeverity] = useState("success");

  useEffect(() => {
    fetchAppointments();
    if (username) {
      fetchMyAppointments();
    }
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
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
    setTimeout(() => setToastOpen(false), 4000);
  };

  const handleDateSelect = (day, month, year) => {
    if (isPastDate(year, month, day)) {
      showToast("Cannot book appointments for past dates", "warning");
      return;
    }
    
    if (isSunday(year, month, day)) {
      showToast("Clinic is closed on Sundays", "warning");
      return;
    }
    
    setSelectedDay({ day, month, year });
    setActiveStep(1);
  };

  const handleTimeSlotSelect = (slot) => {
    if (!slot.available) {
      showToast("This time slot is fully booked", "warning");
      return;
    }
    setSelectedTimeSlot(slot);
    setForm({ 
      ...form, 
      date: `${selectedDay.year}-${String(selectedDay.month + 1).padStart(2, '0')}-${String(selectedDay.day).padStart(2, '0')}`,
      time: slot.time,
      timeValue: slot.timeValue
    });
    setActiveStep(2);
  };

  const handleServiceSelect = (serviceId) => {
    const service = SERVICES.find(s => s.id === serviceId);
    setForm({ 
      ...form, 
      service: serviceId, 
      serviceDetails: service 
    });
    // Don't change step here - stay on service selection page
  };

  const handleBack = () => {
    if (activeStep === 1) {
      setSelectedDay(null);
      setActiveStep(0);
    } else if (activeStep === 2) {
      setSelectedTimeSlot(null);
      setActiveStep(1);
    } else if (activeStep === 3) {
      setActiveStep(2);
    }
  };

  const handleConfirmOpen = () => {
    // Validate service is selected or other concerns is checked
    if (!form.service && !showOther) {
      showToast("Please select a service or specify your concerns", "warning");
      return;
    }
    
    if (!form.patient_name || !form.patient_email || !form.patient_phone) {
      showToast("Please fill in all required fields", "warning");
      return;
    }
    
    setConfirmOpen(true);
  };

  const confirmBooking = async () => {
    setLoading(true);
    try {
      const payload = {
        date: form.date,
        time: form.timeValue,
        service: showOther ? null : form.service,
        other_concern: showOther ? form.other_concern : null,
        patient_name: form.patient_name,
        patient_email: form.patient_email,
        patient_phone: form.patient_phone,
        notes: form.notes,
        status: "confirmed"
      };
      
      await AxiosInstance.post("appointments/", payload);
      
      showToast("✅ Appointment booked successfully! Check your email for confirmation.", "success");
      
      // Reset form
      setForm({ date: "", time: "", timeValue: "", service: "", serviceDetails: null, other_concern: "", patient_name: username || "", patient_email: "", patient_phone: "", notes: "" });
      setShowOther(false);
      setSelectedDay(null);
      setSelectedTimeSlot(null);
      setActiveStep(0);
      fetchAppointments();
      fetchMyAppointments();
    } catch (error) {
      console.error(error);
      showToast(error.response?.data?.message || "Error booking appointment", "error");
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  const cancelAppointment = async () => {
    setLoading(true);
    try {
      await AxiosInstance.delete(`appointments/${selectedAppointment.id}/`);
      showToast("Appointment cancelled successfully", "success");
      fetchAppointments();
      fetchMyAppointments();
      setCancelDialogOpen(false);
      setSelectedAppointment(null);
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

    const getDayAppointments = (day) => {
      return appointments.filter(a => {
        const appDate = new Date(a.date);
        return appDate.getDate() === day && 
               appDate.getMonth() === month && 
               appDate.getFullYear() === year &&
               a.status !== "cancelled";
      });
    };

    const days = [...blanks, ...Array.from({ length: totalDays }, (_, i) => i + 1)];
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, bgcolor: 'background.default', minHeight: '70vh' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
          <IconButton 
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            sx={{ bgcolor: 'background.paper', boxShadow: 2, '&:hover': { transform: 'scale(1.05)' } }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" color="primary">
            {currentDate.toLocaleString("default", { month: "long" })} {year}
          </Typography>
          <IconButton 
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            sx={{ bgcolor: 'background.paper', boxShadow: 2, '&:hover': { transform: 'scale(1.05)' } }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: { xs: 1, sm: 1.5 }, 
          mb: 2 
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Typography 
              key={day} 
              textAlign="center" 
              fontWeight="bold" 
              color="text.secondary"
              sx={{ fontSize: { xs: '14px', sm: '16px', md: '18px' }, py: 1 }}
            >
              {isMobile ? day.charAt(0) : day}
            </Typography>
          ))}
        </Box>
        
        <Box sx={{ width: '100%' }}>
          {weeks.map((week, weekIdx) => (
            <Box 
              key={weekIdx} 
              sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(7, 1fr)', 
                gap: { xs: 1, sm: 1.5 },
                mb: { xs: 1, sm: 1.5 }
              }}
            >
              {week.map((day, dayIdx) => {
                if (!day) {
                  return <Box key={`empty-${weekIdx}-${dayIdx}`} sx={{ p: { xs: 1.5, sm: 2 }, bgcolor: '#f5f5f5', borderRadius: 2 }} />;
                }
                
                const isPast = isPastDate(year, month, day);
                const isSun = isSunday(year, month, day);
                const dayAppts = getDayAppointments(day);
                const totalBooked = dayAppts.length;
                const isFull = totalBooked >= MAX_PATIENTS_DAY;
                
                let bgColor = 'background.paper';
                let borderColor = 'transparent';
                if (isSun) {
                  bgColor = '#ffebee';
                  borderColor = '#ef9a9a';
                } else if (isPast) {
                  bgColor = '#f5f5f5';
                } else if (isFull) {
                  bgColor = '#fff3e0';
                  borderColor = '#ff9800';
                }
                
                return (
                  <Box
                    key={`day-${day}`}
                    onClick={() => !isPast && !isSun && handleDateSelect(day, month, year)}
                    sx={{
                      p: { xs: 1.5, sm: 2, md: 2.5 },
                      bgcolor: bgColor,
                      borderRadius: 2,
                      border: `2px solid ${borderColor}`,
                      cursor: (isPast || isSun) ? 'not-allowed' : 'pointer',
                      opacity: (isPast || isSun) ? 0.6 : 1,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      minHeight: { xs: '90px', sm: '110px', md: '130px' },
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': {
                        transform: (!isPast && !isSun) ? 'translateY(-4px) scale(1.02)' : 'none',
                        boxShadow: (!isPast && !isSun) ? 3 : 'none',
                      },
                    }}
                  >
                    <Typography 
                      fontWeight="bold" 
                      variant={isMobile ? "body1" : "h6"}
                      color={isSun ? 'error' : isPast ? 'text.disabled' : 'text.primary'}
                    >
                      {day}
                    </Typography>
                    {!isPast && !isSun && (
                      <>
                        <Box sx={{ mt: 'auto', pt: 1 }}>
                          <Badge 
                            badgeContent={totalBooked} 
                            color={isFull ? "error" : "primary"} 
                            max={MAX_PATIENTS_DAY}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                          >
                            <EventAvailableIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                          </Badge>
                        </Box>
                        {isFull && (
                          <Chip 
                            label="FULL" 
                            size="small" 
                            color="error" 
                            sx={{ 
                              position: 'absolute', 
                              top: 8, 
                              right: 8, 
                              fontSize: '10px',
                              fontWeight: 'bold'
                            }} 
                          />
                        )}
                      </>
                    )}
                    {isSun && (
                      <Typography variant="caption" color="error" sx={{ mt: 1, fontWeight: 'bold' }}>
                        CLOSED
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      </Paper>
    );
  };

  const renderTimeSlots = () => {
    if (!selectedDay) return null;
    
    const dayAppts = appointments.filter(a => {
      const appDate = new Date(a.date);
      return appDate.getDate() === selectedDay.day && 
             appDate.getMonth() === selectedDay.month && 
             appDate.getFullYear() === selectedDay.year &&
             a.status !== "cancelled";
    });
    
    const slots = getAvailableTimeSlots(dayAppts, selectedDay);
    
    return (
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, minHeight: '70vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={() => {
              setSelectedDay(null);
              setActiveStep(0);
            }}
            variant="outlined"
            size="large"
          >
            Back to Calendar
          </Button>
          <Typography variant="h5" color="primary" fontWeight="bold">
            {new Date(selectedDay.year, selectedDay.month, selectedDay.day).toLocaleDateString("default", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Select Time Slot
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose your preferred time (30-minute intervals)
        </Typography>
        
        <Grid container spacing={2}>
          {slots.map((slot) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={`${slot.hour}-${slot.minute}`}>
              <Button
                fullWidth
                variant={slot.available ? "outlined" : "contained"}
                disabled={!slot.available}
                onClick={() => handleTimeSlotSelect(slot)}
                sx={{
                  py: 2,
                  flexDirection: 'column',
                  textTransform: 'none',
                  gap: 1,
                  borderRadius: 2,
                  borderWidth: 2,
                  transition: 'all 0.3s ease',
                  '&:hover': slot.available ? {
                    transform: 'translateY(-2px)',
                    boxShadow: 2,
                    borderWidth: 2,
                  } : {},
                }}
              >
                <AccessTimeIcon sx={{ fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">
                  {slot.time}
                </Typography>
                {!slot.available && (
                  <Chip label="Booked" size="small" color="error" />
                )}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>
    );
  };

  const renderServiceSelection = () => {
    return (
      <Paper elevation={0} sx={{ p: { xs: 2, sm: 3, md: 4 }, minHeight: '70vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={handleBack}
            variant="outlined"
            size="large"
          >
            Back
          </Button>
          <Typography variant="h5" color="primary" fontWeight="bold">
            Select Dental Service
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 4 }} />
        
        <Paper elevation={0} sx={{ bgcolor: '#e3f2fd', p: 2, mb: 3, borderRadius: 2 }}>
          <Typography variant="body1" fontWeight="bold">
            Selected Date & Time:
          </Typography>
          <Typography variant="h6" color="primary">
            {form.date} at {form.time}
          </Typography>
        </Paper>
        
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Available Services
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Click on a service to select it
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          {SERVICES.map((service, index) => (
            <Box key={service.id}>
              <Button
                fullWidth
                onClick={() => handleServiceSelect(service.id)}
                sx={{
                  justifyContent: 'space-between',
                  textTransform: 'none',
                  py: 2.5,
                  px: 3,
                  borderRadius: 2,
                  transition: 'all 0.3s ease',
                  bgcolor: form.service === service.id ? '#e3f2fd' : 'transparent',
                  border: form.service === service.id ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                    transform: 'translateX(8px)',
                  },
                }}
              >
                <Box textAlign="left">
                  <Typography variant="h6" fontWeight="bold">
                    {service.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Duration: {service.duration} minutes
                  </Typography>
                </Box>
                <Typography variant="h5" color="primary" fontWeight="bold">
                  {service.price}
                </Typography>
              </Button>
              {index < SERVICES.length - 1 && <Divider sx={{ my: 1 }} />}
            </Box>
          ))}
        </Box>
        
        <Divider sx={{ my: 4 }} />
        
        <Typography variant="h6" gutterBottom fontWeight="bold">
          Other Concerns
        </Typography>
        
        <FormControlLabel
          control={
            <Checkbox
              checked={showOther}
              onChange={(e) => {
                setShowOther(e.target.checked);
                if (e.target.checked) {
                  // Clear selected service when choosing other concerns
                  setForm({ ...form, service: "", serviceDetails: null });
                }
              }}
              sx={{ '& .MuiSvgIcon-root': { fontSize: 28 } }}
            />
          }
          label={<Typography variant="body1">I have other concerns not listed above</Typography>}
        />
        
        {showOther && (
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Please describe your concerns"
            placeholder="Tell us more about what you need..."
            value={form.other_concern}
            onChange={(e) => setForm({ ...form, other_concern: e.target.value })}
            sx={{ mt: 2 }}
          />
        )}
        
        <Box sx={{ mt: 4 }}>
          <Button 
            variant="contained" 
            onClick={handleConfirmOpen}
            disabled={!form.service && !showOther}
            fullWidth
            size="large"
            sx={{ py: 1.5, fontSize: '1.1rem' }}
          >
            Continue to Confirmation
          </Button>
        </Box>
      </Paper>
    );
  };

  const renderMyAppointments = () => {
    if (myAppointments.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center', height: '100%' }}>
          <CalendarIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>No appointments scheduled</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Book your first dental appointment today!
          </Typography>
          <Button variant="contained" onClick={() => setActiveStep(0)}>
            Book an Appointment
          </Button>
        </Paper>
      );
    }
    
    return (
      <Paper sx={{ p: { xs: 2, sm: 3 }, height: '100%', overflow: 'auto' }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          My Appointments
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack spacing={2}>
          {myAppointments.map((appt, index) => (
            <Box key={appt.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box flex={1}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {new Date(appt.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {fmtTime(Math.floor(appt.time.split(':')[0]), parseInt(appt.time.split(':')[1]))}
                  </Typography>
                  <Chip 
                    label={appt.status.toUpperCase()} 
                    color={appt.status === 'confirmed' ? 'success' : appt.status === 'pending' ? 'warning' : 'error'}
                    size="small"
                    sx={{ mt: 1, fontWeight: 'bold' }}
                  />
                </Box>
                <IconButton 
                  color="error" 
                  onClick={() => {
                    setSelectedAppointment(appt);
                    setCancelDialogOpen(true);
                  }}
                  size="small"
                >
                  <CancelIcon />
                </IconButton>
              </Box>
              {index < myAppointments.length - 1 && <Divider sx={{ mt: 2 }} />}
            </Box>
          ))}
        </Stack>
      </Paper>
    );
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f7fa' }}>
      <Container maxWidth={false} sx={{ py: { xs: 2, sm: 3, md: 4 }, px: { xs: 2, sm: 3, md: 4 } }}>
        <Typography variant={isMobile ? "h4" : "h3"} gutterBottom align="center" fontWeight="bold" color="primary" sx={{ mb: 4 }}>
          🦷 Dental Clinic Appointment Scheduler
        </Typography>
        
        <Stepper activeStep={activeStep} sx={{ mb: 4, bgcolor: 'transparent' }}>
          <Step><StepLabel>Select Date</StepLabel></Step>
          <Step><StepLabel>Select Time</StepLabel></Step>
          <Step><StepLabel>Choose Service</StepLabel></Step>
          <Step><StepLabel>Confirm</StepLabel></Step>
        </Stepper>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={activeStep === 0 ? 12 : 9}>
            {activeStep === 0 && renderCalendar()}
            {activeStep === 1 && renderTimeSlots()}
            {activeStep === 2 && renderServiceSelection()}
          </Grid>
          
          {username && activeStep === 0 && (
            <Grid item xs={12} md={3}>
              {renderMyAppointments()}
            </Grid>
          )}
        </Grid>
        
        {/* Confirmation Dialog */}
        <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle sx={{ bgcolor: '#1976d2', color: 'white' }}>
            <Box display="flex" alignItems="center" gap={1}>
              <ConfirmationNumberIcon />
              <Typography variant="h6">Confirm Your Appointment</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <Alert severity="info" icon={<CheckCircleIcon />}>
                Please review your appointment details carefully before confirming
              </Alert>
              
              {/* Date & Time Section */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                  📅 Date & Time
                </Typography>
                <Typography variant="h6">
                  {form.date} at {form.time}
                </Typography>
              </Paper>
              
              {/* Service Details Section */}
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                  💊 Service Details
                </Typography>
                {!showOther && form.serviceDetails ? (
                  <>
                    <Typography variant="h6">
                      {form.serviceDetails.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Duration: {form.serviceDetails.duration} minutes | Price: {form.serviceDetails.price}
                    </Typography>
                  </>
                ) : showOther ? (
                  <>
                    <Typography variant="h6">
                      Other Concerns
                    </Typography>
                    {form.other_concern && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        Details: {form.other_concern}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography color="error">No service selected</Typography>
                )}
              </Paper>
              
              {/* Patient Information Section */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
                  👤 Patient Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      label="Full Name *"
                      value={form.patient_name}
                      onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                      fullWidth
                      required
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email Address *"
                      type="email"
                      value={form.patient_email}
                      onChange={(e) => setForm({ ...form, patient_email: e.target.value })}
                      fullWidth
                      required
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Phone Number *"
                      value={form.patient_phone}
                      onChange={(e) => setForm({ ...form, patient_phone: e.target.value })}
                      fullWidth
                      required
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Additional Notes (Optional)"
                      multiline
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 2 }}>
            <Button onClick={() => setConfirmOpen(false)} variant="outlined" size="large">
              Cancel
            </Button>
            <Button onClick={confirmBooking} variant="contained" disabled={loading} size="large" sx={{ px: 4 }}>
              {loading ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Cancel Appointment Dialog */}
        <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogContent>
            <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
              Are you sure you want to cancel this appointment?
            </Alert>
            {selectedAppointment && (
              <Typography variant="body1">
                📅 {new Date(selectedAppointment.date).toLocaleDateString()} at {fmtTime(
                  Math.floor(selectedAppointment.time.split(':')[0]),
                  parseInt(selectedAppointment.time.split(':')[1])
                )}
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCancelDialogOpen(false)}>No, Keep It</Button>
            <Button onClick={cancelAppointment} color="error" variant="contained">
              Yes, Cancel
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Toast Message */}
        <Snackbar
          open={toastOpen}
          autoHideDuration={4000}
          onClose={() => setToastOpen(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity={toastSeverity} sx={{ fontSize: '1rem', alignItems: 'center' }}>
            {toastMessage}
          </Alert>
        </Snackbar>
        
        {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}
      </Container>
    </Box>
  );
}