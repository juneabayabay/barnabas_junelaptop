import { useState } from 'react'
import './App.css'
import Home from './components/Home'
import AppointmentCalendar from './components/AppointmentCalendar'
import Login from './components/Login'
import Register from './components/Register'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import AdminNavbar from './components/AdminNavbar'
import About from './components/About'
import Services from './components/Services'
import Profile from './components/Profile'
import {Routes, Route, useLocation} from 'react-router-dom'
import ProtectedRoutes from './components/ProtectedRoutes'
import PasswordResetRequest from './components/PasswordResetRequest'
import PasswordReset from './components/PasswordReset'
import AdminLogin from './components/AdminLogin'
import Appointment from './components/Appointment'
import AppointmentForm from './components/AppointmentForm'
import AdminDashboard from './components/AdminDashboard'

function App() {
  const location = useLocation();

  // Routes where no navbar should be shown
  const noNavbar =
    location.pathname === '/register' ||
    location.pathname === '/' ||
    location.pathname.includes('password') ||
    location.pathname === '/admin';

  // Routes where admin navbar should be shown
  const adminNavbar = location.pathname.startsWith('/admin/dashboard') ||
                      location.pathname.startsWith('/admin/billing') ||
                      location.pathname.startsWith('/admin/payments') ||
                      location.pathname.startsWith('/admin/patients') ||
                      location.pathname.startsWith('/admin/reports');

  return (
    <>
      {noNavbar ? (
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/request/password_reset" element={<PasswordResetRequest />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/password_reset/:token" element={<PasswordReset />} />
        </Routes>
      ) : adminNavbar ? (
        <AdminNavbar
          content={
            <Routes>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Routes>
          }
        />
      ) : (
        <Navbar
          content={
            <>
              <Routes>
                <Route element={<ProtectedRoutes />}>
                  <Route path="home/" element={<Home />} />
                  <Route path="profile/" element={<Profile />} />
                  <Route path="about/" element={<About />} />
                  <Route path="services/" element={<Services />} />
                  <Route path='calendar/' element={<AppointmentCalendar/>} />
                  <Route path="appointment/" element={<AppointmentForm />} />
                </Route>
              </Routes>
              <Footer/>
            </>
          }
        />
      )}
    </>
  );
}

export default App;

