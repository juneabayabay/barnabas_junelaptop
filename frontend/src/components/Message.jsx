import {Box} from '@mui/material'

const Message = ({text, color}) => {
    return (
        <Box sx={{
            backgroundColor: color,//'#69c9ab', 
            color: '#000000', 
            width: '90%', 
            height: '40px', 
            position: 'absolute', 
            top: '20px',
            borderRadius: '10px',
            padding: '5px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            }}>
            {text}
        </Box>
    )
}
export default Message