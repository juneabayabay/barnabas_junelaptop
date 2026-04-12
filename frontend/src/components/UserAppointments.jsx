import React from "react"
import { Box, Button } from "@mui/material"

export default function UserAppointments({ slots, onCancel }) {
  const userAppointments = []
  Object.entries(slots).forEach(([date, arr]) => {
    arr.forEach((slot) => {
      if (slot.status === "pending" || slot.status === "taken") {
        userAppointments.push({ date, ...slot })
      }
    })
  })

  return (
    <Box sx={{ mt: 4 }}>
      <h3>My Appointments</h3>
      {userAppointments.length === 0 ? (
        <p>No appointments yet.</p>
      ) : (
        userAppointments.map((appt, i) => (
          <Box key={i} sx={{ p: 2, boxShadow: 2, mb: 2 }}>
            <div>{appt.date} at {appt.time} — {appt.service}</div>
            {appt.status === "pending" && (
              <Button onClick={() => onCancel(appt.date, appt.time)} color="error">
                Cancel
              </Button>
            )}
          </Box>
        ))
      )}
    </Box>
  )
}
