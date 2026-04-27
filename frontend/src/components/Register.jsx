import '../App.css'
import { Box, Container, Typography } from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form'
import AxiosInstance from './AxiosInstance'
import { useNavigate } from 'react-router-dom'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useState, useEffect } from 'react'
import './style/Register.css';

const Register = () => {
    const [loading, setLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    
    const schema = yup.object({
        username: yup.string()
            .required('Username is a required field')
            .min(3, 'Username must be at least 3 characters'),
        email: yup.string()
            .email('Field expects an email address')
            .required('Email is a required field'),
        password: yup.string()
            .required('Password is a required field')
            .min(8, 'Password must be at least 8 characters'),
        password2: yup.string()
            .required('Please confirm your password')
            .oneOf([yup.ref('password'), null], 'Passwords must match')
    })
    
    const navigate = useNavigate()
    const { handleSubmit, control, setError, formState: { errors } } = useForm({
        resolver: yupResolver(schema)
    })
    
    useEffect(() => {
        document.body.classList.add('register-page-active')
        return () => document.body.classList.remove('register-page-active')
    }, [])
    
    const submission = (data) => {
        setLoading(true)
        setErrorMessage('')
        
        AxiosInstance.post(`register/`, {
            username: data.username,
            email: data.email,
            password: data.password,
            password2: data.password2,
        })
        .then(() => {
            navigate('/')
        })
        .catch((error) => {
            setLoading(false)
            const errorData = error.response?.data
            if (errorData) {
                if (errorData.email) {
                    setError('email', { message: errorData.email[0] })
                    setErrorMessage(errorData.email[0])
                } else if (errorData.username) {
                    setError('username', { message: errorData.username[0] })
                    setErrorMessage(errorData.username[0])
                } else if (errorData.password) {
                    setError('password', { message: errorData.password[0] })
                    setErrorMessage(errorData.password[0])
                } else {
                    setErrorMessage('Registration failed. Please try again.')
                }
            } else {
                setErrorMessage('Registration failed. Please check your connection.')
            }
            console.error('registration failed:', errorData || error.message)
            
            // Clear error message after 3 seconds
            setTimeout(() => setErrorMessage(''), 3000)
        })
    }
    
    return (
        <Box className="register-wrapper">
            {/* Animated Background Elements */}
            <div className="bg-animation">
                <div className="bg-circle bg-circle-1"></div>
                <div className="bg-circle bg-circle-2"></div>
                <div className="bg-circle bg-circle-3"></div>
                <div className="bg-circle bg-circle-4"></div>
                <div className="bg-circle bg-circle-5"></div>
                <div className="bg-circle bg-circle-6"></div>
            </div>

            {/* Floating particles */}
            <div className="particles">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="particle" style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 10}s`,
                        animationDuration: `${5 + Math.random() * 10}s`
                    }}></div>
                ))}
            </div>

            <Container maxWidth="lg" className="register-container">
                <Box className="register-card landscape-card">
                    {/* Left Side - Registration Form */}
                    <div className="form-side">
                        <div className="form-container">
                            <Typography className="form-title">
                                Create Account
                            </Typography>
                            
                            <Typography className="form-subtitle">
                                Join Barnabas Dental Clinic today
                            </Typography>

                            {errorMessage && (
                                <div className="error-message-wrapper">
                                    <div className="error-message">
                                        {errorMessage}
                                    </div>
                                    <div className="error-progress"></div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit(submission)} className="register-form">
                                <div className="form-field">
                                    <MyTextField 
                                        label={'Username'} 
                                        name={'username'} 
                                        control={control}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '12px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            }
                                        }}
                                    />
                                </div>

                                <div className="form-field">
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

                                <div className="form-field">
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

                                <div className="form-field">
                                    <MyPassField 
                                        label={'Confirm Password'} 
                                        name={'password2'} 
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
                                    label={loading ? 'Creating Account...' : 'Sign Up'}
                                    type={'submit'}
                                    disabled={loading}
                                    className={`signup-button ${loading ? 'loading' : ''}`}
                                />

                                <div className="login-prompt">
                                    <span>Already have an account?</span>
                                    <Link to='/'>
                                        Sign In
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right Side - Branding with Dark Teal Background */}
                    <div className="branding-side">
                        <div className="branding-content">
                            <div className="logo-wrapper">
                                <img 
                                    src="/barnabaslogo.png" 
                                    alt="Barnabas Dental" 
                                    className="brand-logo"
                                />
                            </div>
                            
                            <Typography className="brand-title">
                                Join Our Family
                            </Typography>
                            
                            <Typography className="brand-tagline">
                                Start your journey to a healthier, more confident smile today.
                            </Typography>
                            
                            <div className="brand-features">
                                <div className="feature-item">
                                    <div className="feature-dot"></div>
                                    <span>Expert Dental Care</span>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-dot"></div>
                                    <span>Modern Technology</span>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-dot"></div>
                                    <span>Patient-Centered Approach</span>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-dot"></div>
                                    <span>Flexible Appointments</span>
                                </div>
                                <div className="feature-item">
                                    <div className="feature-dot"></div>
                                    <span>Insurance Accepted</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Box>
            </Container>

            {/* Footer */}
            <Box className="register-footer">
                <Typography variant="body2">
                    © {new Date().getFullYear()} Barnabas Dental Clinic. All rights reserved.
                </Typography>
            </Box>
        </Box>
    )
}

export default Register