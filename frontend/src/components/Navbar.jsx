import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import PersonIcon from '@mui/icons-material/Person';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AxiosInstance from './AxiosInstance';

export default function Navbar({ content }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const logoutUser = () => {
    AxiosInstance.post(`logout/`, {})
      .then(() => {
        localStorage.removeItem('Token');
        navigate('/');
      });
  };

  const navItems = [
    { name: 'Home', path: '/home/' },
    { name: 'About', path: '/about/' },
    { name: 'Services', path: '/services/' },
    { name: 'Calendar', path: '/calendar/' },
    { name: 'Appointment', path: '/appointment/' },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ bgcolor: '#ffffff' }}> {/* light teal */}
        <Toolbar>
          <Box sx={{ flexGrow: 1}}>
            <Link to="/home">
              <img 
                src="/barnabaslogo.png" 
                alt="Barnabas Logo" 
                style={{height: '50px', cursor: 'pointer', marginTop: '10px'}}
              />
            </Link>
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            {navItems.map((item) => (
              <Button
                key={item.name}
                component={Link}
                to={item.path}
                color="inherit"
                sx={{
                  fontWeight: path === item.path ? 'bold' : 'normal',
                  borderBottom: path === item.path ? '2px solid white' : 'none',
                  borderRadius: 0,
                  color: '#2ca6a4'
                }}
                startIcon={item.icon}
              >
                {item.name}
              </Button>
            ))}

            {/* Profile Avatar with Dropdown */}
            <IconButton onClick={handleMenuOpen} sx={{ ml: 1 }}>
              <Avatar 
                sx={{ bgcolor: 'white', color: '#2ca6a4' }}
              >
                <PersonIcon />
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem onClick={() => { handleMenuClose(); navigate('/profile'); }}>
                Profile
              </MenuItem>
              <MenuItem onClick={() => { handleMenuClose(); logoutUser(); }}>
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {content}
      </Box>
    </Box>
  );
}
