import AxiosInstance from './AxiosInstance'
import React, { useEffect, useMemo, useState } from 'react'
import { Box, Typography } from '@mui/material'
import { BubbleChat } from 'flowise-embed-react'
import './style/Home.css'

const Home = () => {
  const [myData, setMyData] = useState([])
  const [loading, setLoading] = useState(true)

  const GetData = () => {
    AxiosInstance.get('users/')
      .then((res) => {
        setMyData(res.data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    GetData()
  }, [])

  const renderedData = useMemo(() => {
    return myData.map((item, index) => (
      <Box key={index} className="card">
        <div>ID: {item.id}</div>
        <div>Email: {item.email}</div>
      </Box>
    ))
  }, [myData])

  return (
    <>
      {/* Chatbot widget */}
      <BubbleChat 
        chatflowid="858c65f1-8b77-4dc6-9db3-ef7e94906a2"
        apiHost="http://localhost:3001"
      />

      {/* Hero Section */}
      <Box className="hero">
        <Typography variant="h3">Welcome to Barnabas Dental Clinic</Typography>
        <Typography variant="h6" sx={{ mt: 2 }}>
          At Barnabas Dental Clinic, we believe in creating smiles that last a lifetime. 
          Our team of dedicated professionals combines modern technology with compassionate care 
          to provide the best dental experience for you and your family.
        </Typography>
        <img 
          src="https://via.placeholder.com/1200x400" 
          alt="Dental Clinic Hero" 
        />
      </Box>

      {/* Services Section */}
      <Box className="section">
        <Typography variant="h4" className="section-title">Our Services</Typography>
        <Box className="services">
          <Box className="card">
            <img src="https://via.placeholder.com/400x250" alt="Service 1" />
            <Typography variant="h6">General Dentistry</Typography>
            <Typography>Routine check-ups, cleanings, and preventive care to keep your smile healthy.</Typography>
          </Box>
          <Box className="card">
            <img src="https://via.placeholder.com/400x250" alt="Service 2" />
            <Typography variant="h6">Cosmetic Dentistry</Typography>
            <Typography>Whitening, veneers, and smile makeovers to boost your confidence.</Typography>
          </Box>
          <Box className="card">
            <img src="https://via.placeholder.com/400x250" alt="Service 3" />
            <Typography variant="h6">Orthodontics</Typography>
            <Typography>Braces and aligners designed to give you a straight, beautiful smile.</Typography>
          </Box>
        </Box>
      </Box>

      {/* About Section */}
      <Box className="section about">
        <Typography variant="h4" className="section-title">About Us</Typography>
        <Typography>
          Founded in 2005, Barnabas Dental Clinic has been serving the community with excellence in dental care. 
          Our philosophy is simple: every patient deserves personalized treatment, a comfortable environment, 
          and a smile they can be proud of. With state-of-the-art equipment and a team that truly cares, 
          we are here to make your dental journey stress-free and rewarding.
        </Typography>
        <img src="https://via.placeholder.com/1000x400" alt="About Us" />
      </Box>

      {/* Example Data Section */}
      <Box className="section">
        <Typography variant="h4" className="section-title">Patient Records (Demo Data)</Typography>
        {loading ? (
          <p>Loading data...</p>
        ) : (
          <div>{renderedData}</div>
        )}
      </Box>

      {/* Footer */}
      <footer>
        <p>© 2026 Barnabas Dental Clinic. All rights reserved.</p>
        <p>123 Smile Street, Cainta, Rizal, Philippines</p>
        <p>Contact: barnabas@dentalclinic.com | +63 912 345 6789</p>
      </footer>
    </>
  )
}

export default Home
