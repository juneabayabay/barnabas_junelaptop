import '../App.css'
import {Box} from '@mui/material'
import MyTextField from './forms/MyTextField';
import MyPassField from './forms/MyPassField';
import MyButton from './forms/MyButton';
import {Link} from 'react-router-dom';
import {useForm} from 'react-hook-form'
import AxiosInstance from './AxiosInstance'
import {useNavigate} from 'react-router-dom'
import {yupResolver} from '@hookform/resolvers/yup'
import * as yup from 'yup'

const Register = () => {
    const schema = yup.object({
        email: yup.string().email('Field expects an email address').required('Email is a required field'),
        password: yup.string()
            .required('Password is a required field')
            .min(8,'Password must be at least 8 characters'),
            // .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
            // .matches(/[a-z]/, 'Password must contain at least one lower case letter')
            // .matches(/[0-9]/, 'Password must contain at least one number')
            // .matches(/[!@#$%^&*(),.?;:{}<>]/, 'Password must contain at least one special character'),
        password2: yup.string()
            .required('Password is a required field')
            .oneOf([yup.ref('password'),null], 'Password must match')
    })
    const navigate = useNavigate()
    const {handleSubmit, control} = useForm({resolver: yupResolver(schema)})
    const submission = (data) => {
        AxiosInstance.post(
            `register/`,
            {
                username: data.username,
                email: data.email,
                password: data.password,
                password2: data.password2,
            }
        )
        .then(() => {
            navigate('/')
        })
        .catch((error) => {
            console.error('registration failed:', error.response?.data || error.message)
        })
    }
    return (
        <div className={'myBackground'}>
            <form onSubmit={handleSubmit(submission)}>
            <Box className={'whiteBox'}>
                <Box className={'itemBox'}>
                    <Box className='title'> Registration </Box>
                </Box>
                <Box className={'itemBox'}>
                    <MyTextField label={'Username'}
                    name='username'
                    control={control}
                    />
                </Box>
                <Box className={'itemBox'}>
                    <MyTextField label={'Email'}
                    name='email'
                    control={control}
                    />
                </Box>
                <Box className={'itemBox'}>
                    <MyPassField label={'Password'}
                    name='password'
                    control={control}
                     />
                </Box>
                <Box className={'itemBox'}>
                    <MyPassField label={'Confirm Password'}
                    name='password2'
                    control={control}
                     />
                </Box>
                <Box className={'itemBox'}>
                    <MyButton 
                    type={'submit'}
                    label='Register'/>
                </Box>
                <Box className={'itemBox'}>
                    <Link to='/'>Back to login page</Link>
                </Box>
            </Box>
            </form>
        </div>
    )
}

export default Register