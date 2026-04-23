// src/components/Navbar.jsx
import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  CssBaseline,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AxiosInstance from "./AxiosInstance";

export default function Navbar({ content }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const logoutUser = () => {
    AxiosInstance.post(`logout/`, {}).then(() => {
      localStorage.removeItem("Token");
      navigate("/");
    });
  };

  const navItems = [
    { name: "Home", path: "/home/", icon: <HomeIcon /> },
    { name: "About", path: "/about/", icon: <InfoIcon /> },
    { name: "Services", path: "/services/", icon: <MedicalServicesIcon /> },
    { name: "Calendar", path: "/calendar/", icon: <CalendarMonthIcon /> },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      <CssBaseline />
      {/* Transparent Top Navbar */}
      <AppBar
        position="fixed"
        sx={{
          bgcolor: "rgba(255, 255, 255, 0.5)", // white at 50% opacity
          boxShadow: "none",
          color: "#2ca6a4",
          backdropFilter: "blur(6px)", 
        }}
      >
        <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
          {/* Logo */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <img
              src="/barnabaslogo.png"
              alt="Barnabas Logo"
              style={{ height: "40px", cursor: "pointer" }}
              onClick={() => navigate("/home")}
            />
          </Box>

          {/* Navigation Items */}
          <Box sx={{ display: "flex", gap: 2 }}>
            {navItems.map((item) => (
              <Button
                key={item.name}
                component={Link}
                to={item.path}
                startIcon={item.icon}
                sx={{
                  color: path === item.path ? "#2ca6a4" : "#555",
                  fontWeight: path === item.path ? "bold" : "normal",
                  textTransform: "none",
                }}
              >
                {item.name}
              </Button>
            ))}

            {/* Profile Avatar */}
            <IconButton onClick={handleMenuOpen}>
              <Avatar sx={{ bgcolor: "white", color: "#2ca6a4" }}>
                <PersonIcon />
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  navigate("/profile");
                }}
              >
                Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleMenuClose();
                  logoutUser();
                }}
              >
                Logout
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar /> {/* Push content below navbar */}
        {content}
      </Box>
    </Box>
  );
}
