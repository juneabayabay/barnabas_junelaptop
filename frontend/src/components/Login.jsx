import '../App.css'
import {Box, Container, Typography, Divider, LinearProgress} from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import {Link, useNavigate} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import AxiosInstance from './AxiosInstance';
import Message from './Message';
import {React, useState} from 'react'

const Login = () => {
    const [showMessage, setShowMessage] = useState(false)
    const {handleSubmit, control} = useForm()
    const navigate = useNavigate()

    const submission = (data) => {
        AxiosInstance.post(
            `login/`,
            {
                email: data.email, 
                password: data.password,
            }
        )
        .then((response) => {
            console.log(response)
            localStorage.setItem('Token', response.data.token)
            navigate('/home')
        })
        .catch((error) => {
            setShowMessage(true)
            console.error('error during login', error)
        })
    }
    
    return (  
        <Box 
            sx={{ 
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: '#f8f9fa', // off-white background
                py: 4
            }}
        >
            {/* Main content */}
            <Container maxWidth="md" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'center',
                    gap: 4,
                    width: '100%'
                }}>
                    
                    {/* Branding */}
                    <Box sx={{ flex: 1, mb: { xs: 3, md: 0 } }}>
                        <Typography 
                            variant="h1" 
                            sx={{ 
                                fontSize: { xs: '3rem', md: '4rem' },
                                fontWeight: 'bold',
                                color: '#2ca6a4',
                                fontFamily: 'SFProDisplay, Helvetica, Arial, sans-serif',
                                mb: 2
                            }}
                        >
                            Barnabas
                        </Typography>
                        <Typography 
                            variant="h5" 
                            sx={{ 
                                fontSize: { xs: '1.25rem', md: '1.5rem' },
                                fontWeight: 'normal',
                                color: '#1c1e21',
                                fontFamily: 'SFProText, Helvetica, Arial, sans-serif',
                                maxWidth: '500px'
                            }}
                        >
                            Barnabas Dental — Where healthy smiles begin and confidence shines.
                        </Typography>
                    </Box>

                    {/* Login Form */}
                    <Box sx={{ flex: 1 }}>
                        {showMessage && (
                            <Box 
                                sx={{ 
                                    mb: 2, 
                                    textAlign: 'center', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                <Message text={'Login failed'} color={'#f8f9fa'}/>
                                <LinearProgress 
                                    sx={{ 
                                        width: '100%', 
                                        maxWidth: 400, 
                                        borderRadius: '4px' 
                                    }} 
                                    color="error"
                                />
                            </Box>
                        )}
                        
                        <form onSubmit={handleSubmit(submission)}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <MyTextField label={'Email'} name={'email'} control={control} />
                                <MyPassField label={'Password'} name={'password'} control={control} />
                                
                                <MyButton 
                                    label='Log In'
                                    type={'submit'}
                                    sx={{
                                        backgroundColor: '#2ca6a4',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.25rem',
                                        py: 1.5,
                                        borderRadius: '6px',
                                        textTransform: 'none',
                                        '&:hover': { backgroundColor: '#166fe5' }
                                    }}
                                />
                                
                                <Link 
                                    to='/request/password_reset'
                                    style={{ 
                                        textAlign: 'center',
                                        textDecoration: 'none',
                                        color: '#2ca6a4',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        marginTop: '8px'
                                    }}
                                >
                                    Forgot password?
                                </Link>
                                
                                <Divider sx={{ my: 2 }}>
                                    <Typography variant="body2" sx={{ color: '#606770' }}>
                                        or
                                    </Typography>
                                </Divider>
                                
                                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Link to='/register'>
                                        <MyButton 
                                            label='Create New Account'
                                            sx={{
                                                backgroundColor: '#42b72a',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '1rem',
                                                px: 3,
                                                py: 1,
                                                borderRadius: '6px',
                                                textTransform: 'none',
                                                '&:hover': { backgroundColor: '#36a420' }
                                            }}
                                        />
                                    </Link>
                                </Box>
                            </Box>
                        </form>
                    </Box>
                </Box>
            </Container>

            {/* Footer */}
            <Box sx={{ textAlign: 'center', py: 2, backgroundColor: '#e9ecef' }}>
                <Typography variant="body2" sx={{ color: '#606770' }}>
                    © {new Date().getFullYear()} Barnabas Dental Clinic. All rights reserved.
                </Typography>
            </Box>
        </Box>
    )
}

export default Login



{/*
import '../App.css'
import {Box, Container, Paper, Typography, Divider} from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import {Link, useNavigate} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import AxiosInstance from './AxiosInstance';
import Message from './Message';
import {React, useState} from 'react'

const Login = () => {
    const [showMessage, setShowMessage] = useState(false)
    const {handleSubmit, control} = useForm()
    const navigate = useNavigate()
    const submission = (data) => {
        AxiosInstance.post(
            `login/`,
            {
                email: data.email, 
                password: data.password,
            }
        )
        .then((response) => {
            console.log(response)
            localStorage.setItem('Token', response.data.token)
            navigate('/home')
        })
        .catch((error) => {
            setShowMessage(true)
            console.error('error during login', error)
        })
    }
    
    return (  
        <Box 
            sx={{ 
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f0f2f5',
                py: 4
            }}
        >
            <Container maxWidth="md">
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    alignItems: 'center',
                    gap: 4
                }}>
                    
                    <Box sx={{ flex: 1, mb: { xs: 3, md: 0 } }}>
                        <Typography 
                            variant="h1" 
                            sx={{ 
                                fontSize: { xs: '3rem', md: '4rem' },
                                fontWeight: 'bold',
                                color: '#2ca6a4',
                                fontFamily: 'SFProDisplay, Helvetica, Arial, sans-serif',
                                mb: 2
                            }}
                        >
                            Barnabas
                        </Typography>
                        <Typography 
                            variant="h5" 
                            sx={{ 
                                fontSize: { xs: '1.25rem', md: '1.5rem' },
                                fontWeight: 'normal',
                                color: '#1c1e21',
                                fontFamily: 'SFProText, Helvetica, Arial, sans-serif',
                                maxWidth: '500px'
                            }}
                        >
                            Barnabas Dental — Where healthy smiles begin and confidence shines.
                        </Typography>
                    </Box>

                    
                    <Box sx={{ flex: 1 }}>
                        {showMessage && (
                            <Box sx={{ mb: 2 }}>
                                <Message text={'Login failed'} color={'#ff0000'}/>
                            </Box>
                        )}
                        
                        <Paper 
                            elevation={3}
                            sx={{ 
                                p: 4,
                                borderRadius: '8px',
                                backgroundColor: 'white'
                            }}
                        >
                            <form onSubmit={handleSubmit(submission)}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    <MyTextField 
                                        label={'Email'}
                                        name={'email'}
                                        control={control}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '6px',
                                                backgroundColor: '#fff'
                                            }
                                        }}
                                    />
                                    
                                    <MyPassField 
                                        label={'Password'}
                                        name={'password'}
                                        control={control}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: '6px',
                                                backgroundColor: '#fff'
                                            }
                                        }}
                                    />
                                    
                                    <MyButton 
                                        label='Log In'
                                        type={'submit'}
                                        sx={{
                                            backgroundColor: '#2ca6a4',
                                            color: 'white',
                                            fontWeight: 'bold',
                                            fontSize: '1.25rem',
                                            py: 1.5,
                                            borderRadius: '6px',
                                            textTransform: 'none',
                                            '&:hover': {
                                                backgroundColor: '#166fe5'
                                            }
                                        }}
                                    />
                                    
                                    <Link 
                                        to='/request/password_reset'
                                        style={{ 
                                            textAlign: 'center',
                                            textDecoration: 'none',
                                            color: '#2ca6a4',
                                            fontSize: '0.875rem',
                                            fontWeight: '500',
                                            marginTop: '8px'
                                        }}
                                    >
                                        Forgot password?
                                    </Link>
                                    
                                    <Divider sx={{ my: 2 }}>
                                        <Typography variant="body2" sx={{ color: '#606770' }}>
                                            or
                                        </Typography>
                                    </Divider>
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                        <Link to='/register'>
                                            <MyButton 
                                                label='Create New Account'
                                                sx={{
                                                    backgroundColor: '#42b72a',
                                                    color: 'white',
                                                    fontWeight: 'bold',
                                                    fontSize: '1rem',
                                                    px: 3,
                                                    py: 1,
                                                    borderRadius: '6px',
                                                    textTransform: 'none',
                                                    '&:hover': {
                                                        backgroundColor: '#36a420'
                                                    }
                                                }}
                                            />
                                        </Link>
                                    </Box>
                                </Box>
                            </form>
                        </Paper>
                        
                        <Typography 
                            variant="body2" 
                            sx={{ 
                                textAlign: 'center', 
                                mt: 3,
                                color: '#606770',
                                fontSize: '0.75rem'
                            }}
                        >
                            
                        </Typography>
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}

export default Login
*/}