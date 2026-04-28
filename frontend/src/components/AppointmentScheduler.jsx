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
} from "@mui/icons-material";

// Constants
const CLINIC_OPEN = 9;
const CLINIC_CLOSE = 18;
const LUNCH_START = 12;
const LUNCH_END = 13;
const MAX_PATIENTS_PER_SLOT = 2;
const PENCIL_BOOKING_HOURS = 8;

const SERVICES = [
  { id: "cleaning", name: "Teeth Cleaning", duration: 60, price: "₱1,000", minHours: 1 },
  { id: "extraction", name: "Tooth Extraction", duration: 60, price: "₱1,500", minHours: 1 },
  { id: "filling", name: "Dental Filling", duration: 60, price: "₱2,000", minHours: 1 },
  { id: "orthodontic", name: "Orthodontic Procedure", duration: 180, price: "₱50,000", minHours: 3 },
];

const OTHER_CONCERNS = [
  "Consultation",
  "Root Canal Treatment",
  "Dental Crown",
  "Teeth Whitening",
  "Gum Treatment",
  "Wisdom Tooth Removal"
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
    // Check appointments at this exact slot (pending, confirmed, pencil bookings)
    const appointmentsAtSlot = existingAppointments.filter(
      a => a.time === `${slot.hour}:${slot.minute.toString().padStart(2, '0')}` && 
      a.status !== "cancelled" && a.status !== "completed"
    );
    const isAvailable = appointmentsAtSlot.length < MAX_PATIENTS_PER_SLOT;
    
    let hasEnoughTime = true;
    const slotEndHour = slot.hour + (slot.minute + requiredDuration) / 60;
    const slotEndMinute = (slot.minute + requiredDuration) % 60;
    
    if (slotEndHour > LUNCH_START && slot.hour < LUNCH_END) {
      hasEnoughTime = false;
    }
    if (slotEndHour > CLINIC_CLOSE || (slotEndHour === CLINIC_CLOSE && slotEndMinute > 0)) {
      hasEnoughTime = false;
    }
    
    let hasConsecutiveSlots = true;
    if (requiredHours > 1) {
      for (let i = 1; i < requiredHours * 2; i++) {
        const nextSlot = allSlots[index + i];
        if (!nextSlot) {
          hasConsecutiveSlots = false;
          break;
        }
        const nextSlotAppointments = existingAppointments.filter(
          a => a.time === `${nextSlot.hour}:${nextSlot.minute.toString().padStart(2, '0')}` && 
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
  
  const [appointments, setAppointments] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ 
    selectedConcern: "",
    customConcern: "",
    showCustomInput: false
  });
  const [loading, setLoading] = useState(false);
  const [myAppointments, setMyAppointments] = useState([]);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });
  
  const [pencilBooking, setPencilBooking] = useState(null);
  const [waitlistPosition, setWaitlistPosition] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    fetchAppointments();
    fetchMyAppointments();
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
      }, 3600000);
      
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
      const { data } = await AxiosInstance.get("appointments/my_appointments/");
      setMyAppointments(data);
    } catch (err) {
      console.error("Error fetching my appointments:", err);
    }
  };

  const fetchAISuggestions = async () => {
    try {
      const { data } = await AxiosInstance.get("appointments/ai_suggestions/");
      setAiSuggestions(data.suggestions);
    } catch (err) {
      console.error("Error fetching AI suggestions:", err);
    }
  };

  const createPencilBooking = async () => {
    if (!selectedDate || !selectedTimeSlot) return;
    
    setLoading(true);
    try {
      const payload = {
        date: `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`,
        time: selectedTimeSlot.timeValue,
        service: selectedService?.name || form.selectedConcern || form.customConcern,
      };
      
      const { data } = await AxiosInstance.post("appointments/pencil_booking/", payload);
      setPencilBooking(data);
      setCountdown(PENCIL_BOOKING_HOURS);
      showToast(`Appointment reserved! Please wait for confirmation.`, "success");
      
      const timer = setInterval(() => {
        checkPencilStatus();
      }, 1800000);
      
      await fetchAppointments();
      await fetchMyAppointments();
      
      // Reset to calendar view
      setTimeout(() => {
        resetForm();
      }, 2000);
      
      return () => clearInterval(timer);
    } catch (error) {
      const errorMsg = error.response?.data?.error || "This time slot is no longer available";
      showToast(errorMsg, "error");
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
        setCountdown(data.hours_left || data.minutes_left / 60);
      }
    } catch (err) {
      console.error("Error checking pencil status:", err);
    }
  };

  const joinWaitlist = async () => {
    setLoading(true);
    try {
      const payload = {
        preferred_date: selectedDate ? `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}` : null,
        time_start: "09:00",
        time_end: "17:00",
        service_needed: selectedService?.name || form.selectedConcern || form.customConcern,
        urgency_level: 1
      };
      
      const { data } = await AxiosInstance.post("appointments/join_waitlist/", payload);
      setWaitlistPosition(data);
      showToast(`Added to waitlist! Position: ${data.position}`, "success");
    } catch (error) {
      showToast(error.response?.data?.error || "Error joining waitlist", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchWaitlistStatus = async () => {
    try {
      const { data } = await AxiosInstance.get("appointments/waitlist_status/");
      if (data.waitlist_entries && data.waitlist_entries.length > 0) {
        setWaitlistPosition(data.waitlist_entries[0]);
      }
    } catch (err) {
      console.error("Error fetching waitlist:", err);
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

  const handleDateSelect = (day, month, year) => {
    if (isPastDate(year, month, day)) {
      showToast("Cannot book appointments for past dates", "warning");
      return;
    }
    if (isSunday(year, month, day)) {
      showToast("Clinic is closed on Sundays", "warning");
      return;
    }
    
    // Check if date is fully booked
    const dayAppointments = getDayBookings(day);
    const totalSlots = 16; // 8am-6pm minus lunch = 16 slots
    if (dayAppointments.length >= totalSlots) {
      showToast("This date is fully booked. Please select another date or join the waitlist.", "warning");
      return;
    }
    
    setSelectedDate({ day, month, year });
    setStep(1);
  };

  const handleServiceSelect = (service) => {
    setSelectedService(service);
    setForm(prev => ({ ...prev, selectedConcern: "", customConcern: "", showCustomInput: false }));
    setStep(2);
  };

  const handleNextToTime = () => {
    if (!selectedService && !form.selectedConcern && !form.customConcern) {
      showToast("Please select a service or specify your concerns", "warning");
      return;
    }
    setStep(2);
  };

  const handleTimeSlotSelect = (slot) => {
    if (!slot.available) {
      const errorMsg = slot.isFullyBooked 
        ? "This time slot is fully booked. Please select another time." 
        : "This time slot is not available for your selected service duration.";
      showToast(errorMsg, "warning");
      return;
    }
    setSelectedTimeSlot(slot);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 1) {
      setSelectedDate(null);
      setStep(0);
    } else if (step === 2) {
      setSelectedService(null);
      setStep(1);
    } else if (step === 3) {
      setSelectedTimeSlot(null);
      setStep(2);
    }
  };

  const confirmBooking = async () => {
    if (pencilBooking) {
      setLoading(true);
      try {
        await AxiosInstance.post("appointments/confirm_pencil_booking/", {
          appointment_id: pencilBooking.appointment_id
        });
        showToast("Appointment confirmed successfully!", "success");
        resetForm();
        await fetchAppointments();
        await fetchMyAppointments();
      } catch (error) {
        showToast(error.response?.data?.error || "Error confirming appointment", "error");
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        let concernText = "";
        if (selectedService) {
          concernText = selectedService.name;
        } else if (form.selectedConcern && form.selectedConcern !== "other") {
          concernText = form.selectedConcern;
        } else if (form.showCustomInput && form.customConcern) {
          concernText = form.customConcern;
        }
        
        const payload = {
          date: `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`,
          time: selectedTimeSlot.timeValue,
          service: selectedService?.name || null,
          other_concern: concernText,
        };
        
        await AxiosInstance.post("appointments/", payload);
        showToast("Appointment booked successfully!", "success");
        resetForm();
        await fetchAppointments();
        await fetchMyAppointments();
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.response?.data?.error || "This time slot is no longer available";
        showToast(errorMsg, "error");
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setSelectedDate(null);
    setSelectedService(null);
    setSelectedTimeSlot(null);
    setStep(0);
    setForm({ selectedConcern: "", customConcern: "", showCustomInput: false });
    setPencilBooking(null);
    setCountdown(0);
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

  const renderWaitlistButton = () => (
    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
      <Button
        variant="outlined"
        size="medium"
        onClick={joinWaitlist}
        disabled={loading}
        sx={{ 
          borderColor: '#ff9800', 
          color: '#ff9800',
          '&:hover': { 
            borderColor: '#f57c00', 
            bgcolor: '#fff3e0',
            color: '#f57c00'
          }
        }}
      >
        Join Waitlist
      </Button>
      <Typography variant="caption" color="text.secondary">
        Get notified if a slot becomes available
      </Typography>
    </Box>
  );

  const renderAISuggestions = () => (
    <Slide direction="right" in={showAIPanel} mountOnEnter unmountOnExit timeout={300}>
      <Paper elevation={3} sx={{ 
        p: 3, 
        borderRadius: 4, 
        bgcolor: 'rgba(255,255,255,0.95)',
        position: 'fixed',
        right: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 320,
        maxHeight: '80vh',
        overflow: 'auto',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ color: '#00695c', fontWeight: 'bold' }}>
            🤖 AI Assistant
          </Typography>
          <IconButton size="small" onClick={() => setShowAIPanel(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {aiSuggestions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            No AI suggestions at this time. Check back later!
          </Typography>
        ) : (
          aiSuggestions.map((suggestion, idx) => (
            <Box key={idx} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#00695c', fontWeight: 'bold' }}>
                {suggestion.title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                {suggestion.description}
              </Typography>
            </Box>
          ))
        )}
        
        {waitlistPosition && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#e0f2f1', borderRadius: 2 }}>
            <Typography variant="subtitle2" sx={{ color: '#00695c', fontWeight: 'bold' }}>
              📋 Waitlist Status
            </Typography>
            <Typography variant="body2">
              Position: #{waitlistPosition.position} for {waitlistPosition.service_needed || waitlistPosition.service}
            </Typography>
          </Box>
        )}
        
        <Button
          fullWidth
          variant="outlined"
          sx={{ mt: 2, borderColor: '#00695c', color: '#00695c' }}
          onClick={() => {
            fetchAISuggestions();
            fetchWaitlistStatus();
            showToast("AI suggestions refreshed!", "success");
          }}
        >
          Refresh Suggestions
        </Button>
      </Paper>
    </Slide>
  );

  const renderPencilTimer = () => (
    pencilBooking && (
      <Alert severity="warning" sx={{ 
        position: 'fixed', 
        bottom: 20, 
        right: 20, 
        zIndex: 1000,
        minWidth: 280,
        animation: 'pulse 2s infinite'
      }}>
        <Box display="flex" alignItems="center" gap={1}>
          <AccessTimeIcon />
          <Typography variant="body2">
            Pencil booking expires in: <strong>{countdown} {countdown === 1 ? 'hour' : 'hours'}</strong>
          </Typography>
          <Button size="small" color="primary" onClick={confirmBooking}>
            Confirm Now
          </Button>
        </Box>
      </Alert>
    )
  );

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
      <Fade in={step === 0} timeout={500}>
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
                const { bookedCount, totalSlots, isFullyBooked, isPartiallyBooked, percentageFull } = getDayBookingStatus(day);
                
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
                        border: isFullyBooked ? '1px solid #f44336' : 'none',
                        '&:hover': !isPast && !isSun && !isFullyBooked ? { transform: 'translateY(-4px)', boxShadow: 3, bgcolor: '#e0f2f1' } : {},
                      }}
                    >
                      <Typography fontWeight="bold" variant={isMobile ? "body1" : "h6"}>{day}</Typography>
                      {!isPast && !isSun && (
                        <>
                          <Box sx={{ mt: 1, width: '100%' }}>
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
                          </Box>
                          {isFullyBooked && (
                            <Typography variant="caption" color="error" sx={{ fontSize: { xs: '8px', sm: '10px' }, mt: 0.5 }}>
                              FULLY BOOKED
                            </Typography>
                          )}
                          {isPartiallyBooked && !isFullyBooked && (
                            <Typography variant="caption" color="warning.main" sx={{ fontSize: { xs: '8px', sm: '10px' }, mt: 0.5 }}>
                              {totalSlots - bookedCount} slots left
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
    
    const dayAppointments = appointments.filter(a => {
      if (!selectedDate) return false;
      const d = new Date(a.date);
      return d.getDate() === selectedDate.day && 
             d.getMonth() === selectedDate.month && 
             d.getFullYear() === selectedDate.year &&
             a.status !== "cancelled" &&
             a.status !== "completed";
    });
    
    const bookedSlotsCount = dayAppointments.length;
    const totalSlots = 16;
    const availableSlots = totalSlots - bookedSlotsCount;
    
    return (
      <Slide direction="left" in={step === 1} mountOnEnter unmountOnExit timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.95)', width: '100%' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3 }}>Back</Button>
          
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: '#e0f2f1', color: '#00695c' }}>
            <strong>Selected Date:</strong> {dateStr}
            <br />
            <strong>Available Slots:</strong> {availableSlots} of {totalSlots} remaining
          </Alert>
          
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
            Select Dental Service
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose from our premium dental services
          </Typography>
          
          <Grid container spacing={2}>
            {SERVICES.map(service => (
              <Grid item xs={12} key={service.id}>
                <Paper
                  elevation={0}
                  onClick={() => handleServiceSelect(service)}
                  sx={{
                    p: { xs: 2, sm: 2.5 },
                    border: `2px solid ${selectedService?.id === service.id ? '#00695c' : '#e0e0e0'}`,
                    borderRadius: 2,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    bgcolor: selectedService?.id === service.id ? '#e0f2f1' : 'background.paper',
                    '&:hover': { transform: 'translateX(8px)', borderColor: '#00695c', bgcolor: '#f5f5f5' }
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                      <Typography variant="h6" fontWeight="bold">{service.name}</Typography>
                      <Typography variant="body2" color="text.secondary">Duration: {service.duration} minutes</Typography>
                    </Box>
                    <Typography variant="h5" sx={{ color: '#00695c', fontWeight: 'bold' }}>{service.price}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
          
          <Divider sx={{ my: 4 }}>
            <Typography variant="body2" color="text.secondary">OR</Typography>
          </Divider>
          
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
            Other Concerns
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
          
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              onClick={handleNextToTime}
              disabled={!selectedService && !form.selectedConcern && !form.customConcern}
              sx={{ 
                bgcolor: '#00695c', 
                '&:hover': { bgcolor: '#004d40' },
                px: { xs: 3, sm: 4 },
                py: { xs: 1, sm: 1.5 },
                fontSize: { xs: '0.9rem', sm: '1rem' }
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
    if (!selectedDate || !selectedService) return null;
    
    const dayAppts = appointments.filter(a => {
      const d = new Date(a.date);
      return d.getDate() === selectedDate.day && 
             d.getMonth() === selectedDate.month && 
             d.getFullYear() === selectedDate.year &&
             a.status !== "cancelled" &&
             a.status !== "completed";
    });
    
    const slots = getAvailableTimeSlots(dayAppts, selectedDate, selectedService);
    const dateStr = new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    return (
      <Slide direction="left" in={step === 2} mountOnEnter unmountOnExit timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.95)', width: '100%' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3 }}>Back to Services</Button>
          
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2, bgcolor: '#e0f2f1', color: '#00695c' }}>
            <strong>{dateStr}</strong> | Service: <strong>{selectedService.name}</strong> ({selectedService.duration} minutes)
          </Alert>
          
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
            Select Time Slot
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedService.duration > 60 && "⚠️ Long procedure - needs 3 consecutive hours (6 half-hour slots)"}
          </Typography>
          
          <Grid container spacing={2}>
            {slots.length > 0 ? (
              slots.map((slot, idx) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={idx}>
                  <Zoom in timeout={idx * 50}>
                    <Button
                      fullWidth
                      variant={slot.available ? "outlined" : "contained"}
                      disabled={!slot.available}
                      onClick={() => handleTimeSlotSelect(slot)}
                      sx={{
                        py: { xs: 1.5, sm: 2 },
                        borderRadius: 2,
                        borderWidth: 2,
                        borderColor: '#00695c',
                        transition: 'all 0.3s',
                        color: slot.available ? '#00695c' : 'white',
                        bgcolor: slot.available ? 'transparent' : '#bdbdbd',
                        '&:hover': slot.available && { transform: 'translateY(-4px)', boxShadow: 2, bgcolor: '#e0f2f1' }
                      }}
                    >
                      <Stack alignItems="center" spacing={0.5}>
                        <AccessTimeIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
                        <Typography fontWeight="bold" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                          {slot.time}
                        </Typography>
                        {!slot.available && (
                          <Chip 
                            label={slot.isFullyBooked ? "FULL" : "UNAVAILABLE"} 
                            size="small" 
                            color="error" 
                            sx={{ mt: 0.5, fontSize: '10px' }} 
                          />
                        )}
                        {slot.available && slot.bookedCount > 0 && (
                          <Chip 
                            label={`${slot.bookedCount}/${slot.maxPerSlot} booked`} 
                            size="small" 
                            color="warning" 
                            sx={{ mt: 0.5, fontSize: '8px' }} 
                          />
                        )}
                      </Stack>
                    </Button>
                  </Zoom>
                </Grid>
              ))
            ) : (
              <Grid item xs={12}>
                <Alert severity="warning" sx={{ mt: 2 }}>
                  No available time slots for this service on the selected date. Please try another date or join the waitlist.
                </Alert>
              </Grid>
            )}
          </Grid>
          
          {renderWaitlistButton()}
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
    const concernText = selectedService ? selectedService.name : (form.selectedConcern === "other" ? form.customConcern : form.selectedConcern);
    
    return (
      <Slide direction="up" in={step === 3} mountOnEnter unmountOnExit timeout={500}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, borderRadius: 4, bgcolor: 'rgba(255,255,255,0.95)', width: '100%' }}>
          <Button startIcon={<ArrowBackIcon />} onClick={handleBack} sx={{ mb: 3 }}>Back to Time Slots</Button>
          
          <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
            Confirm Your Appointment
          </Typography>
          
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Alert severity="info" icon={<ConfirmationNumberIcon />} sx={{ bgcolor: '#e0f2f1', color: '#00695c' }}>
              Please review your appointment details before confirming. Once confirmed, our admin will process your booking.
            </Alert>
            
            <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f5f5f5', borderRadius: 2 }}>
              <Typography variant="subtitle2" sx={{ color: '#00695c', fontWeight: 'bold' }} gutterBottom>
                📅 Appointment Details
              </Typography>
              <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                {dateStr}
              </Typography>
              <Typography variant="h6" sx={{ color: '#00695c', mt: 1, fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                at {selectedTimeSlot.time}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" sx={{ mt: 1 }}>
                <strong>Service/Concern:</strong> {concernText}
              </Typography>
              {selectedService && (
                <Typography variant="body2" sx={{ mt: 1, color: '#00695c', fontWeight: 'bold' }}>
                  Price: {selectedService.price}
                </Typography>
              )}
            </Paper>
            
            <Alert severity="success" sx={{ bgcolor: '#e8f5e9' }}>
              <Typography variant="body2">
                <strong>Note:</strong> Your appointment will be reviewed by our admin. You will receive a confirmation once approved.
                The slot will be held for {PENCIL_BOOKING_HOURS} hours while we process your booking.
              </Typography>
            </Alert>
          </Stack>
          
          <Box display="flex" gap={2} sx={{ mt: 4, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Button variant="outlined" onClick={handleBack} fullWidth size="large" sx={{ borderColor: '#00695c', color: '#00695c' }}>
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
      <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: '#00695c' }}>
        My Appointments
      </Typography>
      <Divider sx={{ mb: 2 }} />
      {myAppointments.length === 0 ? (
        <Box textAlign="center" py={3}>
          <CalendarIcon sx={{ fontSize: 48, color: '#00695c', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">No appointments yet</Typography>
          <Typography variant="caption" color="text.secondary">Book your first appointment above</Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          {myAppointments.map(app => (
            <Paper key={app.id} variant="outlined" sx={{ p: 1.5 }}>
              <Box display="flex" justifyContent="space-between" alignItems="start">
                <Box flex={1}>
                  <Typography variant="body2" fontWeight="bold">
                    {new Date(app.date).toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {app.time}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    {app.service || app.other_concern}
                  </Typography>
                  <Chip 
                    label={app.status} 
                    size="small" 
                    sx={{ 
                      mt: 0.5, 
                      fontSize: '10px', 
                      bgcolor: app.status === 'confirmed' ? '#4caf50' : app.status === 'pending' ? '#ff9800' : '#f44336', 
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
    </Paper>
  );

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #004d40 0%, #00695c 25%, #00897b 50%, #00695c 75%, #004d40 100%)',
      py: { xs: 2, sm: 3, md: 4 },
      position: 'relative',
      overflowX: 'hidden',
    }}>
      <Container maxWidth="xl" sx={{ maxWidth: '1600px !important' }}>
        <Typography variant={isMobile ? "h4" : "h3"} align="center" gutterBottom fontWeight="bold" sx={{ color: 'white', mb: { xs: 2, sm: 3, md: 4 }, textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>
          🦷 Dental Clinic Scheduler
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} lg={step === 0 ? 12 : 9}>
            <Box sx={{ 
              width: '100%',
              maxWidth: step === 0 ? '1200px' : '1400px', 
              mx: 'auto',
              px: { xs: 1, sm: 2, md: 3 }
            }}>
              {step === 0 && renderCalendar()}
              {step === 1 && renderServiceSelection()}
              {step === 2 && renderTimeSlots()}
              {step === 3 && renderConfirmation()}
            </Box>
          </Grid>
          
          {step === 0 && (
            <Grid item xs={12} lg={3}>
              {renderMyAppointments()}
            </Grid>
          )}
        </Grid>
        
        <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast(prev => ({ ...prev, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
          <Alert severity={toast.severity} sx={{ fontSize: '1rem' }}>{toast.message}</Alert>
        </Snackbar>
        
        {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, bgcolor: '#00695c' }} />}
      </Container>
      
      <IconButton
        onClick={() => {
          setShowAIPanel(!showAIPanel);
          fetchAISuggestions();
          fetchWaitlistStatus();
        }}
        sx={{ 
          position: 'fixed', 
          bottom: 20, 
          left: 20, 
          bgcolor: '#00695c', 
          color: 'white',
          zIndex: 1000,
          '&:hover': { bgcolor: '#004d40' }
        }}
      >
        <MedicalServicesIcon />
      </IconButton>
      
      {renderAISuggestions()}
      {renderPencilTimer()}
    </Box>
  );
}