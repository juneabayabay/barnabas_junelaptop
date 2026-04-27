import '../App.css'
import { Box, Container, Typography } from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import AxiosInstance from './AxiosInstance';
import Message from './Message';
import { React, useState, useEffect } from 'react'
import './style/Login.css';

const Login = () => {
    const [showMessage, setShowMessage] = useState(false)
    const [loading, setLoading] = useState(false)
    const { handleSubmit, control } = useForm()
    const navigate = useNavigate()

    useEffect(() => {
        document.body.classList.add('login-page-active')
        return () => document.body.classList.remove('login-page-active')
    }, [])

    const submission = (data) => {
        setLoading(true)
        AxiosInstance.post(`login/`, {
            email: data.email,
            password: data.password,
        })
        .then((response) => {
            localStorage.setItem('Token', response.data.token)
            navigate('/home')
        })
        .catch((error) => {
            setShowMessage(true)
            setLoading(false)
            setTimeout(() => setShowMessage(false), 3000)
            console.error('error during login', error)
        })
    }

    return (
        <Box className="login-wrapper">
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

            <Container maxWidth="lg" className="login-container">
                <Box className="login-card landscape-card">
                    {/* Left Side - Branding with Dark Teal Background */}
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
                                Barnabas Dental
                            </Typography>
                            
                            <Typography className="brand-tagline">
                                Where healthy smiles begin and confidence shines.
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
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Login Form */}
                    <div className="form-side">
                        <div className="form-container">
                            <Typography className="form-title">
                                Welcome Back
                            </Typography>
                            
                            <Typography className="form-subtitle">
                                Sign in to access your account
                            </Typography>

                            {showMessage && (
                                <div className="error-message-wrapper">
                                    <Message text={'Invalid email or password'} color={'#f8f9fa'} />
                                    <div className="error-progress"></div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit(submission)} className="login-form">
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

                                <div className="forgot-password">
                                    <Link to='/request/password_reset'>
                                        Forgot password?
                                    </Link>
                                </div>

                                <MyButton 
                                    label={loading ? 'Signing in...' : 'Sign In'}
                                    type={'submit'}
                                    disabled={loading}
                                    className={`signin-button ${loading ? 'loading' : ''}`}
                                />

                                <div className="signup-prompt">
                                    <span>Don't have an account?</span>
                                    <Link to='/register'>
                                        Create Account
                                    </Link>
                                </div>
                            </form>
                        </div>
                    </div>
                </Box>
            </Container>

            {/* Footer */}
            <Box className="login-footer">
                <Typography variant="body2">
                    © {new Date().getFullYear()} Barnabas Dental Clinic. All rights reserved.
                </Typography>
            </Box>
        </Box>
    )
}

export default Login