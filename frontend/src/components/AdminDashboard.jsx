import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  LinearProgress,
  Chip,
} from "@mui/material";
import {
  TrendingUp,
  AttachMoney,
  People,
  Warning,
  CalendarToday,
  Receipt,
  Payment,
  MedicalServices,
  ArrowUpward,
  ArrowDownward,
  Schedule,
  Check,
  Close,
  EventAvailable,
  MonetizationOn,
  HealthAndSafety,
} from "@mui/icons-material";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import AxiosInstance from "./AxiosInstance";
import "./style/AdminDashboard.css";

const localizer = momentLocalizer(moment);

const AdminDashboard = () => {
  const [billing, setBilling] = useState([]);
  const [payments, setPayments] = useState([]);
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    dailyAppointments: 0,
    weeklyAppointments: 0,
    monthlyAppointments: 0,
    revenueGrowth: 12.5,
  });

  const fetchData = async () => {
    try {
      const [billingRes, paymentsRes, recordsRes, appointmentsRes] = await Promise.all([
        AxiosInstance.get("billing/"),
        AxiosInstance.get("payments/"),
        AxiosInstance.get("patients/"),
        AxiosInstance.get("appointments/"),
      ]);
      setBilling(billingRes.data);
      setPayments(paymentsRes.data);
      setRecords(recordsRes.data);
      setAppointments(appointmentsRes.data);
      
      const today = new Date().toDateString();
      const thisMonth = new Date().getMonth();
      
      const dailyCount = appointmentsRes.data.filter(apt => 
        new Date(apt.date).toDateString() === today
      ).length;
      
      const weeklyCount = appointmentsRes.data.filter(apt => {
        const aptDate = new Date(apt.date);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + (6 - weekEnd.getDay()));
        return aptDate >= weekStart && aptDate <= weekEnd;
      }).length;
      
      const monthlyCount = appointmentsRes.data.filter(apt => 
        new Date(apt.date).getMonth() === thisMonth
      ).length;
      
      setStats({
        dailyAppointments: dailyCount,
        weeklyAppointments: weeklyCount,
        monthlyAppointments: monthlyCount,
        revenueGrowth: 12.5,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalIncome = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  const unpaidInvoices = billing.filter((b) => b.status === "unpaid").length;
  const paidInvoices = billing.filter((b) => b.status === "paid").length;
  const collectionRate = billing.length > 0 ? (paidInvoices / billing.length) * 100 : 0;

  const calendarEvents = appointments.map(apt => ({
    title: `${apt.patient_name || 'Patient'} - ${apt.service || 'Consultation'}`,
    start: new Date(apt.date),
    end: new Date(new Date(apt.date).setHours(new Date(apt.date).getHours() + 1)),
    status: apt.status,
  }));

  return (
    <Box className="admin-dashboard-wrapper">
      {/* Animated Background Elements */}
      <div className="dashboard-bg-animation">
        <div className="dashboard-bg-circle dashboard-bg-circle-1"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-2"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-3"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-4"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-5"></div>
        <div className="dashboard-bg-circle dashboard-bg-circle-6"></div>
      </div>

      {/* Floating particles */}
      <div className="dashboard-particles">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="dashboard-particle" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 15}s`,
            animationDuration: `${8 + Math.random() * 15}s`
          }}></div>
        ))}
      </div>

      <Box className="admin-dashboard-content">
        {/* Header Section */}
        <Box className="dashboard-header-glass fade-down">
          <Box className="dashboard-header-left">
            <div className="dashboard-welcome-badge">
              <MedicalServices sx={{ fontSize: 18 }} />
              <Typography variant="caption">Admin Portal</Typography>
            </div>
            <Typography variant="h4" className="dashboard-title">
              Welcome back, Administrator
            </Typography>
            <Typography variant="body2" className="dashboard-subtitle">
              Here's your clinic performance overview and management hub.
            </Typography>
          </Box>
          <Box className="dashboard-header-right">
            <div className="dashboard-date-card">
              <CalendarToday sx={{ fontSize: 20, color: '#2ca6a4' }} />
              <Typography variant="body2">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </div>
          </Box>
        </Box>

        {loading ? (
          <Box className="loading-container">
            <LinearProgress sx={{ width: '300px', borderRadius: '10px', bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { bgcolor: '#2ca6a4' } }} />
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: '#6c757d' }}>
              Loading dashboard data...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Stats Section - Flex Row */}
            <div className="stats-section fade-up">
              <div className="stat-item">
                <div className="stat-icon revenue-icon">
                  <AttachMoney sx={{ fontSize: 32 }} />
                </div>
                <div className="stat-info">
                  <Typography variant="body2" className="stat-label">Total Revenue</Typography>
                  <Typography variant="h3" className="stat-value">₱{totalIncome.toFixed(2)}</Typography>
                  <div className="stat-trend up">
                    <ArrowUpward sx={{ fontSize: 12 }} />
                    <Typography variant="caption">{stats.revenueGrowth}% from last month</Typography>
                  </div>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon collection-icon">
                  <TrendingUp sx={{ fontSize: 32 }} />
                </div>
                <div className="stat-info">
                  <Typography variant="body2" className="stat-label">Collection Rate</Typography>
                  <Typography variant="h3" className="stat-value">{collectionRate.toFixed(1)}%</Typography>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon patients-icon">
                  <People sx={{ fontSize: 32 }} />
                </div>
                <div className="stat-info">
                  <Typography variant="body2" className="stat-label">Active Patients</Typography>
                  <Typography variant="h3" className="stat-value">{records.length}</Typography>
                  <div className="stat-trend up">
                    <ArrowUpward sx={{ fontSize: 12 }} />
                    <Typography variant="caption">8.2% from last month</Typography>
                  </div>
                </div>
              </div>
              
              <div className="stat-item">
                <div className="stat-icon pending-icon">
                  <Warning sx={{ fontSize: 32 }} />
                </div>
                <div className="stat-info">
                  <Typography variant="body2" className="stat-label">Pending Invoices</Typography>
                  <Typography variant="h3" className="stat-value">{unpaidInvoices}</Typography>
                </div>
              </div>
            </div>

            {/* Appointments Section - Grid */}
            <div className="appointments-section fade-up">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <EventAvailable sx={{ color: '#2ca6a4' }} />
                  <Typography variant="h5" className="section-title">Appointments Management</Typography>
                </div>
                <Chip label={`${stats.dailyAppointments} Today`} size="small" className="today-chip" />
              </div>
              
              <div className="appointments-grid">
                {/* Calendar */}
                <div className="calendar-wrapper">
                  <div className="subsection-header">
                    <CalendarToday sx={{ fontSize: 20, color: '#2ca6a4' }} />
                    <Typography variant="h6">Calendar View</Typography>
                  </div>
                  <div className="calendar-container">
                    <Calendar
                      localizer={localizer}
                      events={calendarEvents}
                      startAccessor="start"
                      endAccessor="end"
                      style={{ height: 450 }}
                      className="custom-calendar"
                      eventPropGetter={(event) => ({
                        className: `calendar-event ${event.status === 'completed' ? 'event-completed' : 'event-scheduled'}`,
                      })}
                    />
                  </div>
                </div>

                {/* Stats Overview */}
                <div className="stats-overview-wrapper">
                  <div className="subsection-header">
                    <Schedule sx={{ fontSize: 20, color: '#2ca6a4' }} />
                    <Typography variant="h6">Overview</Typography>
                  </div>
                  <div className="stats-overview">
                    <div className="overview-item">
                      <div>
                        <Typography variant="body2" className="overview-label">Today's Appointments</Typography>
                        <Typography variant="h2" className="overview-number">{stats.dailyAppointments}</Typography>
                      </div>
                      <div className="overview-icon teal"><MedicalServices /></div>
                    </div>
                    <div className="overview-item">
                      <div>
                        <Typography variant="body2" className="overview-label">This Week</Typography>
                        <Typography variant="h2" className="overview-number">{stats.weeklyAppointments}</Typography>
                      </div>
                      <div className="overview-icon blue"><CalendarToday /></div>
                    </div>
                    <div className="overview-item">
                      <div>
                        <Typography variant="body2" className="overview-label">This Month</Typography>
                        <Typography variant="h2" className="overview-number">{stats.monthlyAppointments}</Typography>
                      </div>
                      <div className="overview-icon green"><TrendingUp /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Section - Grid */}
            <div className="financial-section fade-left">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <MonetizationOn sx={{ color: '#2ca6a4' }} />
                  <Typography variant="h5" className="section-title">Financial Overview</Typography>
                </div>
              </div>
              
              <div className="financial-grid">
                {/* Billing Table */}
                <div className="billing-wrapper">
                  <div className="subsection-header">
                    <Receipt sx={{ fontSize: 20, color: '#2ca6a4' }} />
                    <Typography variant="h6">Recent Billing</Typography>
                    <Chip label={`${unpaidInvoices} Unpaid`} size="small" className="warning-chip" />
                  </div>
                  <TableContainer component={Paper} className="dashboard-table">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Invoice #</TableCell>
                          <TableCell>Amount</TableCell>
                          <TableCell>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {billing.slice(0, 5).map((b) => (
                          <TableRow key={b.id} className="table-row">
                            <TableCell>{b.invoice_number}</TableCell>
                            <TableCell>₱{parseFloat(b.amount).toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip 
                                label={b.status} 
                                size="small"
                                className={b.status === 'paid' ? 'status-paid' : 'status-unpaid'}
                                icon={b.status === 'paid' ? <Check sx={{ fontSize: 16 }} /> : <Close sx={{ fontSize: 16 }} />}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>

                {/* Payments List */}
                <div className="payments-wrapper">
                  <div className="subsection-header">
                    <Payment sx={{ fontSize: 20, color: '#2ca6a4' }} />
                    <Typography variant="h6">Recent Payments</Typography>
                  </div>
                  <List className="payments-list">
                    {payments.slice(0, 5).map((p) => (
                      <ListItem key={p.id} className="payment-item">
                        <ListItemText
                          primary={<Typography fontWeight={500}>{p.method} - {p.transaction_id || 'N/A'}</Typography>}
                          secondary={`Date: ${new Date(p.payment_date).toLocaleDateString()}`}
                        />
                        <Typography variant="body1" className="payment-amount">
                          ₱{parseFloat(p.amount).toFixed(2)}
                        </Typography>
                      </ListItem>
                    ))}
                  </List>
                </div>
              </div>
            </div>

            {/* Patients Section - Full Width */}
            <div className="patients-section fade-up">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <HealthAndSafety sx={{ color: '#2ca6a4' }} />
                  <Typography variant="h5" className="section-title">Patient Records</Typography>
                </div>
                <Chip label={`${records.length} Total Patients`} size="small" className="info-chip" />
              </div>
              
              <TableContainer component={Paper} className="dashboard-table">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Patient Name</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Medical History</TableCell>
                      <TableCell>Last Visit</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id} className="table-row">
                        <TableCell>
                          <Typography fontWeight={600} color="#1a5f5d">{r.patient}</Typography>
                        </TableCell>
                        <TableCell>{r.contact || 'N/A'}</TableCell>
                        <TableCell>
                          <Typography variant="body2" color="textSecondary">
                            {r.medical_history?.substring(0, 50) || 'No history recorded'}
                            {r.medical_history?.length > 50 && '...'}
                          </Typography>
                        </TableCell>
                        <TableCell>{r.last_visit ? new Date(r.last_visit).toLocaleDateString() : 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </>
        )}
      </Box>
    </Box>
  );
};

export default AdminDashboard;