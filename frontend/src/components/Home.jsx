import AxiosInstance from './AxiosInstance'
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { Box, Typography, Button, Grid, Accordion, AccordionSummary, AccordionDetails, Fab, Container } from '@mui/material'
import { BubbleChat } from 'flowise-embed-react'
import { useNavigate } from 'react-router-dom'
import './style/Home.css'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import LocalHospitalIcon from '@mui/icons-material/LocalHospital'
import PeopleIcon from '@mui/icons-material/People'
import StarIcon from '@mui/icons-material/Star'
import PhoneIcon from '@mui/icons-material/Phone'
import EmailIcon from '@mui/icons-material/Email'
import LocationOnIcon from '@mui/icons-material/LocationOn'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import CalendarTodayIcon from '@mui/icons-material/CalendarToday'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import SpeedIcon from '@mui/icons-material/Speed'

const Home = () => {
  const [myData, setMyData] = useState([])
  const [loading, setLoading] = useState(true)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const navigate = useNavigate()
  
  // Refs for animated sections
  const featuresRef = useRef(null)
  const servicesRef = useRef(null)
  const aboutRef = useRef(null)
  const testimonialsRef = useRef(null)

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

  // Scroll animation observer
  useEffect(() => {
    const handleScroll = () => {
      // Show/hide scroll top button
      if (window.scrollY > 300) {
        setShowScrollTop(true)
      } else {
        setShowScrollTop(false)
      }

      // Animate sections on scroll
      const sections = document.querySelectorAll('.fade-up, .fade-left, .fade-right, .scale-in')
      sections.forEach(section => {
        const sectionTop = section.getBoundingClientRect().top
        const windowHeight = window.innerHeight
        if (sectionTop < windowHeight - 100) {
          section.classList.add('visible')
        }
      })
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Initial check
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const faqs = [
    {
      question: 'How often should I visit the dentist?',
      answer: 'We recommend visiting the dentist every 6 months for regular check-ups and cleanings. However, some patients may need more frequent visits based on their oral health needs.'
    },
    {
      question: 'Do you accept insurance?',
      answer: 'Yes, we accept most major dental insurance plans. Contact our office to verify your specific coverage and benefits.'
    },
    {
      question: 'What if I have dental anxiety?',
      answer: 'We understand dental anxiety is common. We offer sedation options and create a comfortable, relaxing environment to ensure your visit is stress-free.'
    },
    {
      question: 'Do you offer emergency dental services?',
      answer: 'Yes, we provide emergency dental services during business hours. For after-hours emergencies, please call our emergency hotline.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept cash, credit cards, debit cards, and most major insurance plans. We also offer flexible payment plans for qualified patients.'
    },
    {
      question: 'How do I schedule an appointment?',
      answer: 'You can schedule an appointment by calling our office, using our online booking system, or visiting us in person. We offer flexible scheduling options.'
    }
  ]

  const renderedData = useMemo(() => {
    return myData.slice(0, 3).map((item, index) => (
      <Box key={index} className="testimonial-card fade-up">
        <StarIcon className="star-icon" />
        <Typography variant="body1" sx={{ mb: 1 }}>"{item.email.split('@')[0]} says: Great experience!"</Typography>
        <Typography variant="caption" color="textSecondary">- Patient Review</Typography>
      </Box>
    ))
  }, [myData])

  return (
    <>
      {/* Chatbot widget */}
      <BubbleChat
        chatflowid="858c65f1-8b77-4dc6-9db3-ef7e94906a2"
        apiHost="http://localhost:3001"
        style={{
          backgroundColor: "#003333",   // dark teal background
          color: "#E0F2F1",             // light teal text
          borderRadius: "8px",
          padding: "12px",
          fontFamily: "Arial, sans-serif"
        }}
      />


      {/* Scroll to Top Button */}
      <Fab 
        className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`}
        onClick={scrollToTop}
        color="primary"
        aria-label="scroll to top"
      >
        <ArrowUpwardIcon />
      </Fab>

      {/* Hero Section - Centered with Dark Teal Background */}
      <Box className="hero-section">
        <Container maxWidth="lg">
          <Box className="hero-content">
            <div className="hero-badge animate-badge">
              <EmojiEventsIcon className="badge-icon" />
              <Typography variant="body2">Trusted Since 2005</Typography>
            </div>
            
            <Typography variant="h1" className="hero-title animate-title">
              Welcome to Barnabas Dental Clinic
            </Typography>
            
            <Typography variant="h5" className="hero-subtitle animate-subtitle">
              Where healthy smiles begin and confidence shines. 
              Experience exceptional dental care with a personal touch.
            </Typography>
            
            <div className="hero-buttons animate-buttons">
              <Button 
                variant="contained" 
                className="hero-btn-primary"
                onClick={() => navigate('/calendar')}
                startIcon={<CalendarTodayIcon />}
              >
                Book Appointment
              </Button>
              <Button 
                variant="outlined" 
                className="hero-btn-secondary"
                onClick={() => navigate('/services')}
              >
                Our Services
              </Button>
            </div>
            
            <div className="hero-stats animate-stats">
              <div className="hero-stat">
                <Typography variant="h3" className="stat-number">15+</Typography>
                <Typography variant="body2">Years Experience</Typography>
              </div>
              <div className="hero-stat">
                <Typography variant="h3" className="stat-number">10k+</Typography>
                <Typography variant="body2">Happy Patients</Typography>
              </div>
              <div className="hero-stat">
                <Typography variant="h3" className="stat-number">100%</Typography>
                <Typography variant="body2">Satisfaction</Typography>
              </div>
            </div>
          </Box>
        </Container>
        
        {/* Animated Background Elements */}
        <div className="hero-bg-animation">
          <div className="hero-circle hero-circle-1"></div>
          <div className="hero-circle hero-circle-2"></div>
          <div className="hero-circle hero-circle-3"></div>
          <div className="hero-circle hero-circle-4"></div>
        </div>
      </Box>

      {/* Features Section */}
      <Box className="section features-section" ref={featuresRef}>
        <Container maxWidth="lg">
          <Typography variant="h3" className="section-title fade-up">
            Why Choose Us
          </Typography>
          <Grid container spacing={4} className="features-grid">
            <Grid item xs={12} md={4}>
              <Box className="feature-card fade-up" style={{ animationDelay: '0.1s' }}>
                <LocalHospitalIcon className="feature-icon" />
                <Typography variant="h5" className="feature-title">Modern Technology</Typography>
                <Typography className="feature-description">
                  State-of-the-art equipment and digital dentistry for precise, comfortable treatments
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="feature-card fade-up" style={{ animationDelay: '0.2s' }}>
                <PeopleIcon className="feature-icon" />
                <Typography variant="h5" className="feature-title">Expert Team</Typography>
                <Typography className="feature-description">
                  Experienced dentists and friendly staff dedicated to your comfort and care
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="feature-card fade-up" style={{ animationDelay: '0.3s' }}>
                <CheckCircleIcon className="feature-icon" />
                <Typography variant="h5" className="feature-title">Quality Guaranteed</Typography>
                <Typography className="feature-description">
                  High-quality materials and proven techniques for lasting results
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Services Section */}
      <Box className="section services-section" ref={servicesRef}>
        <Container maxWidth="lg">
          <Typography variant="h3" className="section-title fade-up">
            Our Services
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box className="service-card scale-in">
                <div className="service-image">
                  <img src="https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400" alt="General Dentistry" />
                  <div className="service-overlay">
                    <SpeedIcon className="overlay-icon" />
                  </div>
                </div>
                <Box className="service-content">
                  <Typography variant="h5">General Dentistry</Typography>
                  <Typography>Routine check-ups, cleanings, and preventive care to keep your smile healthy.</Typography>
                  <Button 
                    className="learn-more" 
                    onClick={() => navigate('/services')}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Learn More
                  </Button>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="service-card scale-in" style={{ animationDelay: '0.15s' }}>
                <div className="service-image">
                  <img src="https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400" alt="Cosmetic Dentistry" />
                  <div className="service-overlay">
                    <StarIcon className="overlay-icon" />
                  </div>
                </div>
                <Box className="service-content">
                  <Typography variant="h5">Cosmetic Dentistry</Typography>
                  <Typography>Whitening, veneers, and smile makeovers to boost your confidence.</Typography>
                  <Button 
                    className="learn-more" 
                    onClick={() => navigate('/services')}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Learn More
                  </Button>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="service-card scale-in" style={{ animationDelay: '0.3s' }}>
                <div className="service-image">
                  <img src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400" alt="Orthodontics" />
                  <div className="service-overlay">
                    <CheckCircleIcon className="overlay-icon" />
                  </div>
                </div>
                <Box className="service-content">
                  <Typography variant="h5">Orthodontics</Typography>
                  <Typography>Braces and aligners designed to give you a straight, beautiful smile.</Typography>
                  <Button 
                    className="learn-more" 
                    onClick={() => navigate('/services')}
                    endIcon={<ArrowForwardIcon />}
                  >
                    Learn More
                  </Button>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* About Section with Stats */}
      <Box className="section about-section" ref={aboutRef}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" className="section-title fade-left">
                About Barnabas Dental
              </Typography>
              <Typography variant="body1" paragraph className="fade-left" style={{ animationDelay: '0.1s' }}>
                Founded in 2005, Barnabas Dental Clinic has been serving the community with excellence in dental care. 
                Our philosophy is simple: every patient deserves personalized treatment, a comfortable environment, 
                and a smile they can be proud of.
              </Typography>
              <Typography variant="body1" paragraph className="fade-left" style={{ animationDelay: '0.2s' }}>
                With state-of-the-art equipment and a team that truly cares, we are here to make your dental journey 
                stress-free and rewarding. We believe in educating our patients and involving them in their treatment decisions.
              </Typography>
              <Button 
                variant="outlined" 
                className="about-button fade-left"
                style={{ animationDelay: '0.3s' }}
                onClick={() => navigate('/about')}
              >
                Learn More About Us
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <img 
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b1a?w=600" 
                alt="Dental Clinic Interior" 
                className="about-image fade-right"
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box className="section testimonials-section" ref={testimonialsRef}>
        <Container maxWidth="lg">
          <Typography variant="h3" className="section-title fade-up">
            What Our Patients Say
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box className="testimonial-card fade-up" style={{ animationDelay: '0.1s' }}>
                <StarIcon className="star-icon" />
                <Typography variant="body1">
                  "The best dental experience I've ever had! The staff is so friendly and professional."
                </Typography>
                <Typography variant="subtitle2" className="patient-name">- Sarah Johnson</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="testimonial-card fade-up" style={{ animationDelay: '0.2s' }}>
                <StarIcon className="star-icon" />
                <Typography variant="body1">
                  "State-of-the-art facility and pain-free procedures. Highly recommend Barnabas Dental!"
                </Typography>
                <Typography variant="subtitle2" className="patient-name">- Michael Chen</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box className="testimonial-card fade-up" style={{ animationDelay: '0.3s' }}>
                <StarIcon className="star-icon" />
                <Typography variant="body1">
                  "Finally found a dentist I trust. They truly care about their patients."
                </Typography>
                <Typography variant="subtitle2" className="patient-name">- Emily Rodriguez</Typography>
              </Box>
            </Grid>
          </Grid>
          {renderedData}
        </Container>
      </Box>

      {/* FAQ Section - Improved with Teal Colors */}
      <Box className="section faq-section">
        <Container maxWidth="lg">
          <Typography variant="h3" className="section-title fade-up">
            Frequently Asked Questions
          </Typography>
          <Box className="faq-container">
            <Grid container spacing={3}>
              {faqs.map((faq, index) => (
                <Grid item xs={12} md={6} key={index}>
                  <Accordion className={`faq-item fade-up ${index % 2 === 0 ? 'faq-left' : 'faq-right'}`} style={{ animationDelay: `${index * 0.1}s` }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon className="faq-expand-icon" />}>
                      <Typography variant="h6" className="faq-question">
                        {faq.question}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography className="faq-answer">
                        {faq.answer}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Container>
      </Box>

      {/* Contact & Appointment CTA */}
      <Box className="cta-section">
        <Container maxWidth="lg">
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="h4" className="fade-left">Ready for a healthier smile?</Typography>
              <Typography variant="body1" className="fade-left" style={{ animationDelay: '0.1s' }}>
                Book your appointment today and experience exceptional dental care.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              <Button 
                variant="contained" 
                className="cta-button pulse-animation"
                onClick={() => navigate('/calendar/')}
                startIcon={<CalendarTodayIcon />}
              >
                Book Appointment Now
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Footer Contact Info */}
      <Box className="contact-info-section">
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={3}>
              <Box className="contact-item fade-up">
                <LocationOnIcon className="contact-icon" />
                <Typography variant="body2">123 Dental Street, Medical District</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box className="contact-item fade-up" style={{ animationDelay: '0.1s' }}>
                <PhoneIcon className="contact-icon" />
                <Typography variant="body2">(555) 123-4567</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box className="contact-item fade-up" style={{ animationDelay: '0.2s' }}>
                <EmailIcon className="contact-icon" />
                <Typography variant="body2">info@barnabasdental.com</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={3}>
              <Box className="contact-item fade-up" style={{ animationDelay: '0.3s' }}>
                <AccessTimeIcon className="contact-icon" />
                <Typography variant="body2">Mon-Fri: 9AM-6PM | Sat: 9AM-2PM</Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </>
  )
}

export default Home