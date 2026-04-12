import '../App.css'
import './style/AdminLogin.css'
import {Box, Container, Paper, Typography} from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import {useNavigate} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import AxiosInstance from './AxiosInstance';
import {React, useState} from 'react'

const AdminLogin = () => {
    const [showMessage, setShowMessage] = useState(false)
    const {handleSubmit, control} = useForm()
    const navigate = useNavigate()

    const submission = (data) => {
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
            }
        })
        .catch(() => setShowMessage(true))
    }
    
    return (  
        <Box className="admin-login-container">
            <Container maxWidth="sm">
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    
                    <Typography variant="h3" className="admin-login-title">
                        Barnabas Admin Portal
                    </Typography>
                    <Typography variant="body1" className="admin-login-subtitle">
                        Secure access for administrators only.
                    </Typography>

                    {showMessage && (
                        <Box sx={{ mb: 2, width: '100%' }}>
                            <div className="admin-login-error">
                                Admin login failed. Please check your credentials.
                            </div>
                        </Box>
                    )}
                    
                    <Paper elevation={3} className="admin-login-card">
                        <form onSubmit={handleSubmit(submission)}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <MyTextField label={'Email'} name={'email'} control={control} />
                                <MyPassField label={'Password'} name={'password'} control={control} />
                                <MyButton 
                                    label='Admin Log In'
                                    type={'submit'}
                                    className="admin-login-button"
                                    sx={{
                                        backgroundColor: '#2ca6a4',   // teal main
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        '&:hover': {
                                        backgroundColor: '#1f7a78', // teal dark
                                        }
                                    }}
                                />
                            </Box>
                        </form>
                    </Paper>
                </Box>
            </Container>
        </Box>
    )
}

export default AdminLogin
