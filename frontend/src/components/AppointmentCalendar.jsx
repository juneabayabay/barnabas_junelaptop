import React, { useState } from "react"
import Calendar from "react-calendar"
import "react-calendar/dist/Calendar.css"
import "./style/Calendar.css"

const AppointmentCalendar = ({ slots = {} }) => {
  const [date, setDate] = useState(new Date())

  const formatDateKey = (d) => d.toISOString().split("T")[0]
  const selectedDateKey = formatDateKey(date)
  const selectedSlots = slots[selectedDateKey] || []

  // generate allowed times: 6am–9pm, skip 12–1pm, Mon–Sat only
  const generateTimes = () => {
    const day = date.getDay()
    if (day === 0) return [] // Sunday
    const times = []
    for (let h = 6; h <= 21; h++) {
      if (h === 12) continue
      const hourStr = h.toString().padStart(2, "0")
      times.push(`${hourStr}:00`)
    }
    return times
  }

  const getStatusClass = (status) => {
    switch (status) {
      case "available": return "slot available"
      case "taken": return "slot taken"
      case "pending": return "slot pending"
      default: return "slot"
    }
  }

  return (
    <div className="calendar-page">
      <h2 className="calendar-title">Appointment Calendar</h2>
      <Calendar onChange={setDate} value={date} className="react-calendar" />

      <div className="slots-container">
        <h3>Slots for {date.toDateString()}</h3>
        <div className="slots-grid">
          {generateTimes().map((time, i) => {
            const slot = selectedSlots.find((s) => s.time.startsWith(time))
            const status = slot ? slot.status : "available"
            return (
              <div key={i} className={getStatusClass(status)}>
                {time}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AppointmentCalendar
