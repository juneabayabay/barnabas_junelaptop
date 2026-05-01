// src/components/AppointmentScheduler.jsx
import React, { useState, useEffect } from "react";
import "react-calendar/dist/Calendar.css";
import "./style/AppointmentScheduler.css";
import AxiosInstance from "./AxiosInstance";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tabs,
  Tab,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  Cancel as CancelIcon,
  CalendarToday as CalendarIcon,
  ArrowBack as ArrowBackIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  MedicalServices as MedicalServicesIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Schedule as ScheduleIcon,
  Queue as QueueIcon,
  Star as StarIcon,
  Notifications as NotificationsIcon,
} from "@mui/icons-material";

// Constants
const CLINIC_OPEN = 9;
const CLINIC_CLOSE = 18;
const LUNCH_START = 12;
const LUNCH_END = 13;
const MAX_PATIENTS_PER_SLOT = 2;

// Service definitions matching backend SERVICE_CHOICES
const SERVICES = [
  { id: "consultation", name: "Consultation", duration: 30, price: "₱500", description: "Initial dental check-up and assessment" },
  { id: "teeth_cleaning", name: "Teeth Cleaning", duration: 60, price: "₱800", description: "Professional dental cleaning and polishing" },
  { id: "tooth_extraction", name: "Tooth Extraction", duration: 60, price: "₱1,500", description: "Safe removal of problematic teeth" },
  { id: "dental_filling", name: "Dental Filling", duration: 60, price: "₱1,200", description: "Restore decayed or damaged teeth" },
  { id: "orthodontic", name: "Orthodontic Procedure", duration: 180, price: "₱5,000", description: "Braces and alignment treatment" },
  { id: "root_canal", name: "Root Canal Treatment", duration: 90, price: "₱3,000", description: "Save infected teeth" },
  { id: "dental_implant", name: "Dental Implant", duration: 120, price: "₱15,000", description: "Permanent tooth replacement" },
  { id: "teeth_whitening", name: "Teeth Whitening", duration: 60, price: "₱2,500", description: "Professional whitening treatment" },
];

const OTHER_CONCERNS = [
  "Gum Pain",
  "Sensitive Teeth",
  "Broken Tooth",
  "Bad Breath",
  "Bleeding Gums",
  "Loose Tooth",
  "Jaw Pain",
  "Mouth Sores"
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
    slots.push({ hour, minute: 0, time: fmtTime(hour, 0), timeValue: `${hour.toString().padStart(2, '0')}:00` });
    slots.push({ hour, minute: 30, time: fmtTime(hour, 30), timeValue: `${hour.toString().padStart(2, '0')}:30` });
  }
  return slots;
};

const getAvailableTimeSlots = (existingAppointments, selectedDate, selectedService) => {
  const allSlots = generateTimeSlots();
  const requiredDuration = selectedService?.duration || 30;
  
  return allSlots.map((slot, index) => {
    // Check appointments at this exact slot
    const appointmentsAtSlot = existingAppointments.filter(
      a => a.time === slot.timeValue && 
      a.status !== "cancelled" && a.status !== "completed"
    );
    const isAvailable = appointmentsAtSlot.length < MAX_PATIENTS_PER_SLOT;
    
    // Check if enough time for the procedure
    let hasEnoughTime = true;
    const slotDateTime = new Date(selectedDate.year, selectedDate.month, selectedDate.day, slot.hour, slot.minute);
    const endDateTime = new Date(slotDateTime.getTime() + requiredDuration * 60000);
    const endHour = endDateTime.getHours();
    const endMinute = endDateTime.getMinutes();
    
    // Check lunch break
    if (slot.hour < LUNCH_END && endHour >= LUNCH_START) {
      hasEnoughTime = false;
    }
    // Check closing time
    if (endHour > CLINIC_CLOSE || (endHour === CLINIC_CLOSE && endMinute > 0)) {
      hasEnoughTime = false;
    }
    
    // Check if service requires back-to-back slots
    let hasConsecutiveSlots = true;
    if (requiredDuration > 30) {
      const slotsNeeded = Math.ceil(requiredDuration / 30);
      for (let i = 1; i < slotsNeeded; i++) {
        const nextSlot = allSlots[index + i];
        if (!nextSlot) {
          hasConsecutiveSlots = false;
          break;
        }
        const nextSlotAppointments = existingAppointments.filter(
          a => a.time === nextSlot.timeValue && 
          a.status !== "cancelled" && a.status !== "completed"
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
      isFullyBooked: appointmentsAtSlot.length >= MAX_PATIENTS_PER_SLOT,
    };
  });
};

export default function AppointmentScheduler({ role = "client" }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState({ 
    selectedConcern: "",
    customConcern: "",
    showCustomInput: false,
    urgencyLevel: 1
  });
  const [loading, setLoading] = useState(false);
  const [myAppointments, setMyAppointments] = useState([]);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  
  const [pencilBooking, setPencilBooking] = useState(null);
  const [waitlistEntries, setWaitlistEntries] = useState([]);
  const [waitlistPosition, setWaitlistPosition] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [tabValue, setTabValue] = useState(0);
  const [waitlistDialogOpen, setWaitlistDialogOpen] = useState(false);
  const [availableSlotsCache, setAvailableSlotsCache] = useState({});

  useEffect(() => {
    fetchAppointments();
    fetchMyAppointments();
    fetchAISuggestions();
    fetchWaitlistStatus();
    
    // Poll for pencil booking status every minute
    const interval = setInterval(() => {
      if (pencilBooking) {
        checkPencilStatus();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pencilBooking && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setPencilBooking(null);
            showToast("Pencil booking expired. Please book again.", "warning");
            return 0;
          }
          return prev - 1;
        });
      }, 60000);
      
      return () => clearInterval(timer);
    }
  }, [pencilBooking, countdown]);

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
      const { data } = await AxiosInstance.get("appointments/", {
        params: { user_id: JSON.parse(localStorage.getItem('user'))?.id }
      });
      setMyAppointments(data);
    } catch (err) {
      console.error("Error fetching my appointments:", err);
    }
  };

  const fetchAISuggestions = async () => {
    try {
      const { data } = await AxiosInstance.get("appointments/ai_suggestions/");
      setAiSuggestions(data.suggestions || []);
    } catch (err) {
      console.error("Error fetching AI suggestions:", err);
    }
  };

  const fetchWaitlistStatus = async () => {
    try {
      const { data } = await AxiosInstance.get("appointments/waitlist_status/");
      setWaitlistEntries(data.waitlist_entries || []);
      if (data.waitlist_entries && data.waitlist_entries.length > 0) {
        setWaitlistPosition(data.waitlist_entries[0]);
      }
    } catch (err) {
      console.error("Error fetching waitlist:", err);
    }
  };

  const fetchAvailableSlots = async (date, service) => {
    const cacheKey = `${date}-${service}`;
    if (availableSlotsCache[cacheKey]) {
      return availableSlotsCache[cacheKey];
    }
    
    try {
      const { data } = await AxiosInstance.get("appointments/get_available_slots/", {
        params: { date, service }
      });
      setAvailableSlotsCache(prev => ({ ...prev, [cacheKey]: data.available_slots }));
      return data.available_slots;
    } catch (err) {
      console.error("Error fetching slots:", err);
      return [];
    }
  };

  const createPencilBooking = async () => {
    if (!selectedDate || !selectedTimeSlot) return;
    
    setLoading(true);
    try {
      const payload = {
        date: `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`,
        time: selectedTimeSlot.timeValue,
        service: selectedService?.id || null,
      };
      
      const { data } = await AxiosInstance.post("appointments/pencil_booking/", payload);
      setPencilBooking(data);
      setCountdown(data.minutes_left || 15);
      showToast(`Appointment reserved for ${data.minutes_left} minutes! Please confirm soon.`, "success");
      await fetchAppointments();
      await fetchMyAppointments();
    } catch (error) {
      const errorMsg = error.response?.data?.error || "This time slot is no longer available";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmPencilBooking = async () => {
    if (!pencilBooking) return;
    
    setLoading(true);
    try {
      await AxiosInstance.post("appointments/confirm_pencil_booking/", {
        appointment_id: pencilBooking.appointment_id
      });
      showToast("Appointment confirmed successfully!", "success");
      setPencilBooking(null);
      setCountdown(0);
      resetForm();
      await fetchAppointments();
      await fetchMyAppointments();
    } catch (error) {
      showToast(error.response?.data?.error || "Error confirming appointment", "error");
    } finally {
      setLoading(false);
    }
  };

  const checkPencilStatus = async () => {
    try {
      const { data } = await AxiosInstance.get("appointments/check_pencil_booking/");
      if (!data.has_pencil) {
        setPencilBooking(null);
        setCountdown(0);
      } else {
        setPencilBooking(data);
        setCountdown(data.minutes_left || 0);
      }
    } catch (err) {
      console.error("Error checking pencil status:", err);
    }
  };

  const joinWaitlist = async () => {
    if (!selectedDate) {
      showToast("Please select a date first", "warning");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        preferred_date: `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`,
        time_start: "09:00",
        time_end: "17:00",
        service: selectedService?.id || form.selectedConcern || "General",
        urgency_level: form.urgencyLevel
      };
      
      const { data } = await AxiosInstance.post("appointments/join_waitlist/", payload);
      setWaitlistPosition(data);
      showToast(`Added to waitlist! Position: ${data.position}`, "success");
      setWaitlistDialogOpen(false);
      await fetchWaitlistStatus();
    } catch (error) {
      showToast(error.response?.data?.error || "Error joining waitlist", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, severity = "success") => {
    setToast({ open: true, message, severity });
    setTimeout(() => setToast(prev => ({ ...prev, open: false })), 4000);
  };

  const isPastDate = (year, month, day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return new Date(year, month, day) < today;
  };

  const isSunday = (year, month, day) => new Date(year, month, day).getDay() === 0;

  const getDayBookings = (day) => {
    return appointments.filter(a => {
      const d = new Date(a.date);
      return d.getDate() === day && 
             d.getMonth() === month && 
             d.getFullYear() === year && 
             a.status !== "cancelled" && 
             a.status !== "completed";
    });
  };

  const handleDateSelect = async (day, month, year) => {
    if (isPastDate(year, month, day)) {
      showToast("Cannot book appointments for past dates", "warning");
      return;
    }
    if (isSunday(year, month, day)) {
      showToast("Clinic is closed on Sundays", "warning");
      return;
    }
    
    setSelectedDate({ day, month, year });
    setActiveStep(1);
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setForm(prev => ({ ...prev, selectedConcern: "", customConcern: "", showCustomInput: false }));
    setActiveStep(2);
  };

  const handleTimeSlotSelect = async (slot) => {
    if (!slot.available) {
      const errorMsg = slot.isFullyBooked 
        ? "This time slot is fully booked. Please select another time or join the waitlist." 
        : "This time slot is not available for your selected service duration.";
      showToast(errorMsg, "warning");
      return;
    }
    setSelectedTimeSlot(slot);
    setActiveStep(3);
  };

  const handleBack = () => {
    if (activeStep === 1) {
      setSelectedDate(null);
      setActiveStep(0);
    } else if (activeStep === 2) {
      setSelectedService(null);
      setActiveStep(1);
    } else if (activeStep === 3) {
      setSelectedTimeSlot(null);
      setActiveStep(2);
    }
  };

  const confirmBooking = async () => {
    if (pencilBooking) {
      await confirmPencilBooking();
    } else {
      await createPencilBooking();
    }
  };

  const resetForm = () => {
    setSelectedDate(null);
    setSelectedService(null);
    setSelectedTimeSlot(null);
    setActiveStep(0);
    setForm({ selectedConcern: "", customConcern: "", showCustomInput: false, urgencyLevel: 1 });
  };

  const cancelAppointment = async (appointmentId) => {
    setLoading(true);
    try {
      await AxiosInstance.delete(`appointments/${appointmentId}/`);
      showToast("Appointment cancelled successfully", "success");
      await fetchAppointments();
      await fetchMyAppointments();
    } catch (error) {
      showToast("Error cancelling appointment", "error");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return '#4caf50';
      case 'pending': return '#ff9800';
      case 'pencil': return '#2196f3';
      case 'cancelled': return '#f44336';
      case 'completed': return '#9e9e9e';
      default: return '#757575';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed': return <CheckCircleIcon fontSize="small" />;
      case 'pending': return <PendingIcon fontSize="small" />;
      case 'pencil': return <ScheduleIcon fontSize="small" />;
      default: return <ScheduleIcon fontSize="small" />;
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

    const getDayBookingStatus = (day) => {
      const dayAppointments = appointments.filter(a => {
        const d = new Date(a.date);
        return d.getDate() === day && 
               d.getMonth() === month && 
               d.getFullYear() === year && 
               a.status !== "cancelled" && 
               a.status !== "completed";
      });
      
      const totalSlots = 16;
      const bookedCount = dayAppointments.length;
      const percentageFull = (bookedCount / totalSlots) * 100;
      
      return {
        bookedCount,
        totalSlots,
        percentageFull,
        isFullyBooked: bookedCount >= totalSlots,
        isPartiallyBooked: bookedCount > 0 && bookedCount < totalSlots,
      };
    };

    return (
      <Fade in={activeStep === 0} timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.95)', width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <IconButton onClick={() => setCurrentDate(new Date(year, month - 1, 1))} sx={{ bgcolor: 'action.hover' }}>
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" sx={{ color: '#00695c' }}>
              {currentDate.toLocaleString("default", { month: "long" })} {year}
            </Typography>
            <IconButton onClick={() => setCurrentDate(new Date(year, month + 1, 1))} sx={{ bgcolor: 'action.hover' }}>
              <ChevronRightIcon />
            </IconButton>
          </Box>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, sm: 1, md: 1.5 }, mb: 2 }}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <Typography key={day} textAlign="center" fontWeight="bold" color="text.secondary" sx={{ fontSize: { xs: '12px', sm: '14px', md: '16px' } }}>
                {isMobile ? day.charAt(0) : day}
              </Typography>
            ))}
          </Box>
          
          {weeks.map((week, idx) => (
            <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: { xs: 0.5, sm: 1, md: 1.5 }, mb: 1 }}>
              {week.map((day, i) => {
                if (!day) return <Box key={i} sx={{ p: { xs: 1, sm: 1.5, md: 2 } }} />;
                
                const isPast = isPastDate(year, month, day);
                const isSun = isSunday(year, month, day);
                const { bookedCount, totalSlots, isFullyBooked, isPartiallyBooked } = getDayBookingStatus(day);
                
                let statusColor = '#00695c';
                let statusText = `${bookedCount}/${totalSlots}`;
                if (isFullyBooked) {
                  statusColor = '#f44336';
                  statusText = 'FULL';
                } else if (isPartiallyBooked) {
                  statusColor = '#ff9800';
                  statusText = `${bookedCount}/${totalSlots}`;
                }
                
                return (
                  <Zoom in key={i}>
                    <Paper
                      elevation={0}
                      onClick={() => !isPast && !isSun && !isFullyBooked && handleDateSelect(day, month, year)}
                      sx={{
                        p: { xs: 1, sm: 1.5, md: 2 },
                        textAlign: 'center',
                        cursor: (isPast || isSun || isFullyBooked) ? 'not-allowed' : 'pointer',
                        opacity: (isPast || isSun) ? 0.5 : 1,
                        bgcolor: isSun ? '#ffebee' : isFullyBooked ? '#ffebee' : isPartiallyBooked ? '#fff3e0' : 'background.paper',
                        borderRadius: 2,
                        transition: 'all 0.3s',
                        minHeight: { xs: '70px', sm: '90px', md: '110px' },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: isFullyBooked ? '2px solid #f44336' : '1px solid #e0e0e0',
                        '&:hover': !isPast && !isSun && !isFullyBooked ? { transform: 'translateY(-4px)', boxShadow: 3, bgcolor: '#e0f2f1' } : {},
                      }}
                    >
                      <Typography fontWeight="bold" variant={isMobile ? "body1" : "h6"}>{day}</Typography>
                      {!isPast && !isSun && (
                        <>
                          <Chip 
                            label={statusText}
                            size="small" 
                            sx={{ 
                              fontSize: { xs: '10px', sm: '11px' }, 
                              bgcolor: statusColor, 
                              color: 'white',
                              height: { xs: '20px', sm: '24px' },
                              width: '100%'
                            }} 
                          />
                          {isFullyBooked && (
                            <Typography variant="caption" color="error" sx={{ fontSize: { xs: '8px', sm: '10px' }, mt: 0.5 }}>
                              JOIN WAITLIST
                            </Typography>
                          )}
                        </>
                      )}
                      {isSun && (
                        <Typography variant="caption" color="error" sx={{ fontSize: { xs: '8px', sm: '10px' }, mt: 0.5 }}>
                          CLOSED
                        </Typography>
                      )}
                    </Paper>
                  </Zoom>
                );
              })}
            </Box>
          ))}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Chip icon={<CheckCircleIcon />} label="Available" size="small" sx={{ bgcolor: '#e0f2f1' }} />
            <Chip icon={<ScheduleIcon />} label="Partial" size="small" sx={{ bgcolor: '#fff3e0' }} />
            <Chip icon={<CancelIcon />} label="Full" size="small" sx={{ bgcolor: '#ffebee' }} />
          </Box>
        </Paper>
      </Fade>
    );
  };

  const renderServiceSelection = () => {
    const dateStr = selectedDate ? new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) : "";
    
    return (
      <Slide direction="left" in={activeStep === 1} mountOnEnter unmountOnExit timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.95)', width: '100%' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3 }}>Back to Calendar</Button>
          
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: '#e0f2f1', color: '#00695c' }}>
            <strong>Selected Date:</strong> {dateStr}
          </Alert>
          
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
            Select Dental Service
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose from our premium dental services
          </Typography>
          
          <Grid container spacing={2}>
            {SERVICES.map(service => (
              <Grid item xs={12} sm={6} key={service.id}>
                <Card
                  elevation={0}
                  onClick={() => handleServiceSelect(service)}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    border: `2px solid ${selectedService?.id === service.id ? '#00695c' : '#e0e0e0'}`,
                    '&:hover': { transform: 'translateX(8px)', borderColor: '#00695c' }
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Typography variant="h6" fontWeight="bold">{service.name}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {service.description}
                        </Typography>
                        <Chip 
                          label={`${service.duration} mins`} 
                          size="small" 
                          sx={{ mt: 1, bgcolor: '#e0f2f1' }} 
                        />
                      </Box>
                      <Typography variant="h5" sx={{ color: '#00695c', fontWeight: 'bold' }}>
                        {service.price}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
          
          <Divider sx={{ my: 4 }}>
            <Typography variant="body2" color="text.secondary">OR</Typography>
          </Divider>
          
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
            Other Dental Concerns
          </Typography>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select a concern</InputLabel>
            <Select
              value={form.selectedConcern}
              label="Select a concern"
              onChange={(e) => {
                const value = e.target.value;
                if (value === "other") {
                  setForm({ ...form, selectedConcern: value, showCustomInput: true });
                  setSelectedService(null);
                } else {
                  setForm({ ...form, selectedConcern: value, showCustomInput: false, customConcern: "" });
                  setSelectedService(null);
                }
              }}
              sx={{ borderRadius: 2 }}
            >
              {OTHER_CONCERNS.map((concern, index) => (
                <MenuItem key={index} value={concern}>{concern}</MenuItem>
              ))}
              <MenuItem value="other">Other (Please specify)</MenuItem>
            </Select>
          </FormControl>
          
          {form.showCustomInput && (
            <Fade in={form.showCustomInput} timeout={300}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Please describe your concern"
                placeholder="Tell us more about what you need..."
                value={form.customConcern}
                onChange={(e) => setForm({ ...form, customConcern: e.target.value })}
                sx={{ mt: 2 }}
              />
            </Fade>
          )}
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Button 
              variant="outlined" 
              onClick={() => setWaitlistDialogOpen(true)}
              sx={{ borderColor: '#ff9800', color: '#ff9800' }}
            >
              <QueueIcon sx={{ mr: 1 }} /> Join Waitlist
            </Button>
            <Button 
              variant="contained" 
              onClick={() => setActiveStep(2)}
              disabled={!selectedService && !form.selectedConcern && !form.customConcern}
              sx={{ 
                bgcolor: '#00695c', 
                '&:hover': { bgcolor: '#004d40' },
                px: { xs: 3, sm: 4 }
              }}
            >
              Next Step →
            </Button>
          </Box>
        </Paper>
      </Slide>
    );
  };

  const renderTimeSlots = () => {
    if (!selectedDate) return null;
    
    const dateStr = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`;
    const serviceId = selectedService?.id || "consultation";
    const [slots, setSlots] = useState([]);
    
    useEffect(() => {
      fetchAvailableSlots(dateStr, serviceId).then(setSlots);
    }, [selectedDate, selectedService]);
    
    return (
      <Slide direction="left" in={activeStep === 2} mountOnEnter unmountOnExit timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.95)', width: '100%' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3 }}>Back to Services</Button>
          
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
            Select Time Slot
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedService && selectedService.duration > 60 && "⚠️ Long procedure - needs multiple consecutive slots"}
          </Typography>
          
          <Grid container spacing={2}>
            {slots.length > 0 ? (
              slots.map((slot, idx) => (
                <Grid item xs={6} sm={4} md={3} key={idx}>
                  <Button
                    fullWidth
                    variant="outlined"
                    onClick={() => handleTimeSlotSelect(slot)}
                    sx={{
                      py: { xs: 1.5, sm: 2 },
                      borderRadius: 2,
                      borderColor: '#00695c',
                      color: '#00695c',
                      transition: 'all 0.3s',
                      '&:hover': { transform: 'translateY(-4px)', boxShadow: 2, bgcolor: '#e0f2f1' }
                    }}
                  >
                    <Stack alignItems="center">
                      <AccessTimeIcon />
                      <Typography fontWeight="bold">{slot.time}</Typography>
                    </Stack>
                  </Button>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No available time slots for this service on the selected date. 
                  <Button size="small" onClick={() => setWaitlistDialogOpen(true)} sx={{ ml: 2 }}>
                    Join Waitlist
                  </Button>
                </Alert>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Slide>
    );
  };

  const renderConfirmation = () => {
    if (!selectedDate || !selectedTimeSlot) return null;
    
    const dateStr = new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return (
      <Slide direction="up" in={activeStep === 3} mountOnEnter unmountOnExit timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.95)', width: '100%' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3 }}>Back to Time Slots</Button>
          
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
            Confirm Your Appointment
          </Typography>
          
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="info" icon={<ConfirmationNumberIcon />} sx={{ bgcolor: '#e0f2f1', color: '#00695c' }}>
              Please review your appointment details before confirming.
            </Alert>
            
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#00695c', fontWeight: 'bold' }} gutterBottom>
                📅 Appointment Details
              </Typography>
              <Typography variant="h6">
                {dateStr}
              </Typography>
              <Typography variant="h6" sx={{ color: '#00695c', mt: 1 }}>
                at {selectedTimeSlot.time}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1">
                <strong>Service:</strong> {selectedService?.name || form.selectedConcern || form.customConcern}
              </Typography>
              {selectedService && (
                <Typography variant="body2" sx={{ mt: 1, color: '#00695c', fontWeight: 'bold' }}>
                  Price: {selectedService.price}
                </Typography>
              )}
            </Paper>
            
            <Alert severity="success" sx={{ bgcolor: '#e8f5e9' }}>
              <Typography variant="body2">
                <strong>Note:</strong> Your slot will be held for 15 minutes. Please confirm within this time.
              </Typography>
            </Alert>
          </Stack>
          
          <Box display="flex" gap={2} sx={{ mt: 4, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button variant="outlined" onClick={handleBack} fullWidth size="large">
              Back
            </Button>
            <Button 
              variant="contained" 
              onClick={confirmBooking} 
              disabled={loading} 
              fullWidth 
              size="large"
              sx={{ bgcolor: '#00695c', '&:hover': { bgcolor: '#004d40' } }}
            >
              {loading ? "Processing..." : "Confirm Appointment"}
            </Button>
          </Box>
        </Paper>
      </Slide>
    );
  };

  const renderMyAppointments = () => (
    <Paper elevation={3} sx={{ 
      p: 2, 
      borderRadius: 4, 
      height: 'fit-content', 
      position: { xs: 'relative', lg: 'sticky' }, 
      top: 20, 
      bgcolor: 'rgba(255,255,255,0.95)',
      maxHeight: { xs: 'auto', lg: 'calc(100vh - 40px)' },
      overflow: 'auto'
    }}>
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2 }}>
        <Tab label="Upcoming" />
        <Tab label="History" />
      </Tabs>
      
      {tabValue === 0 ? (
        <>
          {myAppointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').length === 0 ? (
            <Box textAlign="center" py={3}>
              <CalendarIcon sx={{ fontSize: 48, color: '#00695c', mb: 1 }} />
              <Typography variant="body2" color="text.secondary">No upcoming appointments</Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {myAppointments.filter(a => a.status !== 'completed' && a.status !== 'cancelled').map(app => (
                <Paper key={app.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="start">
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="bold">
                        {new Date(app.date).toLocaleDateString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {app.formatted_time || app.time}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {app.service || app.other_concern}
                      </Typography>
                      <Chip 
                        icon={getStatusIcon(app.status)}
                        label={app.status} 
                        size="small" 
                        sx={{ 
                          mt: 0.5, 
                          fontSize: '10px', 
                          bgcolor: getStatusColor(app.status), 
                          color: 'white' 
                        }} 
                      />
                    </Box>
                    {(app.status === 'pending' || app.status === 'pencil') && (
                      <IconButton size="small" onClick={() => cancelAppointment(app.id)} sx={{ color: '#f44336' }}>
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </Paper>
              ))}
            </Stack>
          )}
        </>
      ) : (
        <>
          {myAppointments.filter(a => a.status === 'completed' || a.status === 'cancelled').length === 0 ? (
            <Box textAlign="center" py={3}>
              <Typography variant="body2" color="text.secondary">No past appointments</Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {myAppointments.filter(a => a.status === 'completed' || a.status === 'cancelled').map(app => (
                <Paper key={app.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2, opacity: 0.7 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {new Date(app.date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {app.formatted_time || app.time}
                  </Typography>
                  <Chip 
                    label={app.status} 
                    size="small" 
                    sx={{ mt: 0.5, fontSize: '10px', bgcolor: '#9e9e9e', color: 'white' }} 
                  />
                </Paper>
              ))}
            </Stack>
          )}
        </>
      )}
    </Paper>
  );

  const renderWaitlistDialog = () => (
    <Dialog open={waitlistDialogOpen} onClose={() => setWaitlistDialogOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ bgcolor: '#00695c', color: 'white' }}>
        <Box display="flex" alignItems="center" gap={1}>
          <QueueIcon /> Join Waitlist
        </Box>
      </DialogTitle>
      <DialogContent sx={{ mt: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          No available slots? Join our waitlist and we'll notify you when a slot opens up!
        </Typography>
        
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Urgency Level</InputLabel>
          <Select
            value={form.urgencyLevel}
            label="Urgency Level"
            onChange={(e) => setForm({ ...form, urgencyLevel: e.target.value })}
          >
            <MenuItem value={1}>Low - Can wait 2+ weeks</MenuItem>
            <MenuItem value={2}>Medium - Need within 2 weeks</MenuItem>
            <MenuItem value={3}>High - Emergency/Urgent</MenuItem>
          </Select>
        </FormControl>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            High urgency requests will be prioritized when slots become available.
          </Typography>
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setWaitlistDialogOpen(false)}>Cancel</Button>
        <Button onClick={joinWaitlist} variant="contained" sx={{ bgcolor: '#ff9800' }}>
          Join Waitlist
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box className="scheduler-container">
      <Container maxWidth="xl">
        <Typography variant={isMobile ? "h4" : "h3"} className="scheduler-title">
          🦷 Book Your Dental Appointment
        </Typography>
        
        <Stepper activeStep={activeStep} className="scheduler-stepper">
          <Step><StepLabel>Select Date</StepLabel></Step>
          <Step><StepLabel>Choose Service</StepLabel></Step>
          <Step><StepLabel>Pick Time</StepLabel></Step>
          <Step><StepLabel>Confirm</StepLabel></Step>
        </Stepper>
        
        <Grid container spacing={3}>
          <Grid item xs={12} lg={activeStep === 0 ? 12 : 8}>
            <Box className="scheduler-main">
              {activeStep === 0 && renderCalendar()}
              {activeStep === 1 && renderServiceSelection()}
              {activeStep === 2 && renderTimeSlots()}
              {activeStep === 3 && renderConfirmation()}
            </Box>
          </Grid>
          
          {activeStep === 0 && (
            <Grid item xs={12} lg={4}>
              {renderMyAppointments()}
            </Grid>
          )}
        </Grid>
        
        {/* AI Assistant Panel */}
        {showAIPanel && (
          <Paper className="ai-panel">
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" sx={{ color: '#00695c', fontWeight: 'bold' }}>
                🤖 AI Assistant
              </Typography>
              <IconButton size="small" onClick={() => setShowAIPanel(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Divider />
            <Box sx={{ mt: 2, maxHeight: 400, overflow: 'auto' }}>
              {aiSuggestions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  No suggestions at this time
                </Typography>
              ) : (
                aiSuggestions.map((suggestion, idx) => (
                  <Paper key={idx} sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                    <Typography variant="subtitle2" fontWeight="bold" color="#00695c">
                      {suggestion.title}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {suggestion.description}
                    </Typography>
                  </Paper>
                ))
              )}
            </Box>
            <Button 
              fullWidth 
              variant="outlined" 
              sx={{ mt: 2, borderColor: '#00695c', color: '#00695c' }}
              onClick={fetchAISuggestions}
            >
              Refresh Suggestions
            </Button>
          </Paper>
        )}
        
        {/* Pencil Booking Timer */}
        {pencilBooking && (
          <div className="pencil-timer">
            <div className="pencil-timer-content">
              <AccessTimeIcon />
              <span>Pending confirmation - {countdown} minutes left!</span>
              <button onClick={confirmPencilBooking} className="confirm-btn">Confirm Now</button>
            </div>
          </div>
        )}
        
        {/* AI Button */}
        <button onClick={() => setShowAIPanel(!showAIPanel)} className="ai-button">
          <MedicalServicesIcon />
        </button>
        
        {/* Waitlist Status Badge */}
        {waitlistEntries.length > 0 && (
          <div className="waitlist-badge" onClick={() => setWaitlistDialogOpen(true)}>
            <Badge badgeContent={waitlistEntries.length} color="warning">
              <QueueIcon />
            </Badge>
          </div>
        )}
      </Container>
      
      <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert severity={toast.severity} sx={{ fontSize: '1rem' }}>{toast.message}</Alert>
      </Snackbar>
      
      {loading && <LinearProgress className="loading-progress" />}
      
      {renderWaitlistDialog()}
    </Box>
  );
}