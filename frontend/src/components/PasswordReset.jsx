import '../App.css'
import {Box, IconButton} from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import AxiosInstance from './AxiosInstance';
import Message from './Message'
import {React, useState} from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const PasswordReset = () => {
    const {handleSubmit, control} = useForm()
    const navigate = useNavigate()
    const {token} = useParams()
    console.log(token)
    const [showMessage, setShowMessage] = useState(false)

    const submission = (data) => {
        AxiosInstance.post(
            `api/password_reset/confirm/`,
            {
                password: data.password, 
                token: token,
                
            }
        )
        .then((response) => {
            setShowMessage(true)
            setTimeout(() => {
                navigate('/')
            }, 2000)
        })
        
    }
    return (  
        <div className={'myBackground'}>
            {showMessage ? <Message text={'You have successfully reset your password...'}/> : null}
            <form onSubmit={handleSubmit(submission)}>    
            <Box className={'whiteBox'} sx={{
                height: '50vh',
                
            }}>
                <Box className={'itemBox'}>
                    <Box className='title'> Resetting your password </Box>
                </Box>
                <Box className={'itemBox'}>
                    <MyPassField 
                    label={'Password'}
                    name={'password'}
                    control={control}/>
                </Box>
                <Box className={'itemBox'}>
                    <MyPassField 
                    label={'Confirm password'}
                    name={'password2'}
                    control={control}/>
                </Box>
            
                <Box className={'itemBox'}>
                    <MyButton label='Reset Password'
                    type={'submit'}
                    />
                </Box>
                <Box className={'itemBox'}>
                    <Link to='/request/password_reset' style={{textDecoration: 'none'}}>
                        <IconButton sx={{
                            border: '1px solid #ccc',
                            borderRadius: '50%',
                            padding: '10px',
                            color: '#333',
                        }}>
                            <ArrowBackIcon />
                        </IconButton>
                    </Link>
                </Box>
                <Box className={'itemBox'} sx={{flexDirection: 'column'}}>
                    
                </Box>
            </Box>
            </form>
        </div>
    )
}

export default PasswordReset