import '../App.css'
import './style/AdminLogin.css'
import { Box, Container, Typography } from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AxiosInstance from './AxiosInstance';
import Message from './Message';
import { React, useState, useEffect } from 'react'

const AdminLogin = () => {
    const [showMessage, setShowMessage] = useState(false)
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { handleSubmit, control } = useForm()
    const navigate = useNavigate()

    useEffect(() => {
        document.body.classList.add('admin-login-page-active')
        return () => document.body.classList.remove('admin-login-page-active')
    }, [])

    const submission = (data) => {
        setLoading(true)
        setShowMessage(false)
        
        AxiosInstance.post(`admin-login/`, {
            email: data.email,
            password: data.password,
        })
        .then((response) => {
            if(response.data.user && response.data.user.is_superuser) {
                localStorage.setItem('Token', response.data.token)
                navigate('/admin/dashboard')
            } else {
                setShowMessage(true)
                setErrorMessage('Access denied. Admin privileges required.')
                setLoading(false)
                setTimeout(() => setShowMessage(false), 3000)
            }
        })
        .catch((error) => {
            setShowMessage(true)
            setErrorMessage('Invalid email or password. Please try again.')
            setLoading(false)
            setTimeout(() => setShowMessage(false), 3000)
            console.error('Admin login failed:', error)
        })
    }
    
    return (  
        <Box className="admin-login-wrapper">
            {/* Animated Background Elements */}
            <div className="admin-bg-animation">
                <div className="admin-bg-circle admin-bg-circle-1"></div>
                <div className="admin-bg-circle admin-bg-circle-2"></div>
                <div className="admin-bg-circle admin-bg-circle-3"></div>
                <div className="admin-bg-circle admin-bg-circle-4"></div>
                <div className="admin-bg-circle admin-bg-circle-5"></div>
                <div className="admin-bg-circle admin-bg-circle-6"></div>
            </div>

            {/* Floating particles */}
            <div className="admin-particles">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="admin-particle" style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 10}s`,
                        animationDuration: `${5 + Math.random() * 10}s`
                    }}></div>
                ))}
            </div>

            <Container maxWidth="lg" className="admin-login-container">
                <Box className="admin-login-card landscape-card">
                    {/* Left Side - Branding with Dark Teal Background */}
                    <div className="admin-branding-side">
                        <div className="admin-branding-content">
                            <div className="admin-shield-wrapper">
                                <div className="admin-shield-icon">
                                    <svg viewBox="0 0 24 24" width="60" height="60" fill="white">
                                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                                        <path d="M12 11.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                                    </svg>
                                </div>
                            </div>
                            
                            <Typography className="admin-brand-title">
                                Admin Portal
                            </Typography>
                            
                            <Typography className="admin-brand-tagline">
                                Secure administrative access with enhanced security protocols.
                            </Typography>
                            
                            <div className="admin-brand-features">
                                <div className="admin-feature-item">
                                    <div className="admin-feature-dot"></div>
                                    <span>Full Access Control</span>
                                </div>
                                <div className="admin-feature-item">
                                    <div className="admin-feature-dot"></div>
                                    <span>Analytics Dashboard</span>
                                </div>
                                <div className="admin-feature-item">
                                    <div className="admin-feature-dot"></div>
                                    <span>Patient Management</span>
                                </div>
                                <div className="admin-feature-item">
                                    <div className="admin-feature-dot"></div>
                                    <span>Appointment Oversight</span>
                                </div>
                                <div className="admin-feature-item">
                                    <div className="admin-feature-dot"></div>
                                    <span>System Configuration</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="admin-form-side">
                        <div className="admin-form-container">
                            <Typography className="admin-form-title">
                                Administrator Login
                            </Typography>
                            
                            <Typography className="admin-form-subtitle">
                                Enter your credentials to access the dashboard
                            </Typography>

                            {/* Error Message - Centered at top */}
                            {showMessage && (
                                <div className="admin-error-message-wrapper">
                                    <Message text={errorMessage || 'Admin login failed'} color={'#f8f9fa'} />
                                    <div className="admin-error-progress"></div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit(submission)} className="admin-login-form">
                                <div className="admin-form-field">
                                    <MyTextField 
                                        label={'Email Address'} 
                                        name={'email'} 
                                        control={control}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            }
                                        }}
                                    />
                                </div>

                                <div className="admin-form-field">
                                    <MyPassField 
                                        label={'Password'} 
                                        name={'password'} 
                                        control={control}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            }
                                        }}
                                    />
                                </div>

                                <MyButton 
                                    label={loading ? 'Authenticating...' : 'Admin Login'}
                                    type={'submit'}
                                    disabled={loading}
                                    className={`admin-login-button ${loading ? 'loading' : ''}`}
                                />

                                <div className="admin-back-link">
                                    <a href="/" className="admin-back-link-text">
                                        ← Back to Main Site
                                    </a>
                                </div>
                            </form>
                        </div>
                    </div>
                </Box>
            </Container>

            {/* Footer */}
            <Box className="admin-login-footer">
                <Typography variant="body2">
                    © {new Date().getFullYear()} Barnabas Dental Clinic. All rights reserved.
                </Typography>
            </Box>
        </Box>
    )
}

export default AdminLogin