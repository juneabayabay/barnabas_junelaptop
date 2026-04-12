import Box from '@mui/material/Box';
import AppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PaymentIcon from '@mui/icons-material/Payment';
import PeopleIcon from '@mui/icons-material/People';
import BarChartIcon from '@mui/icons-material/BarChart';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AxiosInstance from './AxiosInstance';

export default function AdminNavbar({ content }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();

  const logoutUser = () => {
    AxiosInstance.post(`logout/`, {})
      .then(() => {
        localStorage.removeItem('Token');
        navigate('/');
      });
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <DashboardIcon /> },
    { name: 'Billing', path: '/admin/billing', icon: <AssignmentIcon /> },
    { name: 'Payments', path: '/admin/payments', icon: <PaymentIcon /> },
    { name: 'Patients', path: '/admin/patients', icon: <PeopleIcon /> },
    { name: 'Reports', path: '/admin/reports', icon: <BarChartIcon /> },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      <CssBaseline />
      <AppBar position="sticky" sx={{ bgcolor: '#80cbc4' }}> {/* light teal */}
        <Toolbar>
          <Typography
            variant="h6"
            component="div"
            sx={{ flexGrow: 1, fontWeight: 'bold' }}
          >
            Barnabas
          </Typography>

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
                  borderRadius: 0
                }}
                startIcon={item.icon}
              >
                {item.name}
              </Button>
            ))}

            <IconButton
              onClick={logoutUser}
              color="inherit"
              sx={{ ml: 1 }}
            >
              <LogoutIcon />
              <Typography variant="body2" sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
                Logout
              </Typography>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {content}
      </Box>
    </Box>
  );
}
