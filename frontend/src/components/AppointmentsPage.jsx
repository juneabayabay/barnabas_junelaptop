import React, { useState } from "react"
import AppointmentForm from "./AppointmentForm"
import AppointmentCalendar from "./AppointmentCalendar"
import UserAppointments from "./UserAppointments"
import AdminAppointments from "./AdminAppointments"
import { Box, Tabs, Tab } from "@mui/material"

export default function AppointmentsPage() {
  const [slots, setSlots] = useState({})
  const [tab, setTab] = useState(0)

  const addAppointment = (appointment) => {
    const { date, time } = appointment
    const dateKey = date
    const updatedSlots = slots[dateKey] ? [...slots[dateKey]] : []

    // enforce 6-hour policy
    const now = new Date()
    const apptDateTime = new Date(`${date}T${time}`)
    const diffHours = (apptDateTime - now) / (1000 * 60 * 60)
    if (diffHours < 6) {
      alert("Reservations must be made at least 6 hours in advance.")
      return
    }

    // mark as pending
    updatedSlots.push({ time, status: "pending", service: appointment.service })
    setSlots({ ...slots, [dateKey]: updatedSlots })
  }

  const cancelAppointment = (date, time) => {
    const updatedSlots = slots[date].map((slot) =>
      slot.time === time ? { ...slot, status: "available" } : slot
    )
    setSlots({ ...slots, [date]: updatedSlots })
  }

  return (
    <Box sx={{ mt: 10, p: 4 }}>
      <Tabs value={tab} onChange={(e, v) => setTab(v)}>
        <Tab label="Book Appointment" />
        <Tab label="Calendar" />
        <Tab label="My Appointments" />
        <Tab label="Admin View" />
      </Tabs>

      {tab === 0 && <AppointmentForm onBooked={addAppointment} />}
      {tab === 1 && <AppointmentCalendar slots={slots} />}
      {tab === 2 && <UserAppointments slots={slots} onCancel={cancelAppointment} />}
      {tab === 3 && <AdminAppointments slots={slots} />}
    </Box>
  )
}
