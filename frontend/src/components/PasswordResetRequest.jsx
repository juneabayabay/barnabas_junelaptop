import '../App.css'
import {Box, IconButton} from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyButton from './forms/MyButton';
import {Link, useNavigate} from 'react-router-dom';
import {useForm} from 'react-hook-form';
import AxiosInstance from './AxiosInstance';
import Message from './Message'
import {React, useState} from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const PasswordResetRequest = () => {
    const {handleSubmit, control} = useForm()
    const navigate = useNavigate()
    const [showMessage, setShowMessage] = useState(false)

    const submission = (data) => {
        AxiosInstance.post(
            `api/password_reset/`,
            {
                email: data.email, 
                
            }
        )
        .then((response) => {
            setShowMessage(true)
        })
        
    }
    return (  
        <div className={'myBackground'}>
            {showMessage ? <Message text={'if your email exists you have received an email with instructions'} color={'#69c9ab'}/> : null}
            <form onSubmit={handleSubmit(submission)}>    
            <Box className={'whiteBox'} sx={{
                height: '50vh',
                
            }}>
                <Box className={'itemBox'}>
                    <Box className='title'> Password Reset </Box>
                </Box>
                <Box className={'itemBox'}>
                    <MyTextField 
                    label={'Email'}
                    name={'email'}
                    control={control}/>
                </Box>
            
                <Box className={'itemBox'}>
                    <MyButton label='Request password reset'
                    type={'submit'}
                    />
                </Box>
                <Box className={'itemBox'}>
                    <Link to='/' style={{textDecoration: 'none'}}>
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

export default PasswordResetRequest