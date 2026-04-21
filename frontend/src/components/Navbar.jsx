// src/components/Navbar.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  CssBaseline,
  Drawer,
  Toolbar,
  Typography,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Divider,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import PersonIcon from "@mui/icons-material/Person";
import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import MedicalServicesIcon from "@mui/icons-material/MedicalServices";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import EventIcon from "@mui/icons-material/Event";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AxiosInstance from "./AxiosInstance";

const drawerWidthExpanded = 240;
const drawerWidthCollapsed = 72;

export default function Navbar({ content }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();

  const [anchorEl, setAnchorEl] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
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
    //{ name: "Appointment", path: "/appointment/", icon: <EventIcon /> },
  ];

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      {/* Sidebar Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: collapsed ? drawerWidthCollapsed : drawerWidthExpanded,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: collapsed ? drawerWidthCollapsed : drawerWidthExpanded,
            boxSizing: "border-box",
            bgcolor: "#ffffff",
            transition: "width 0.3s",
          },
        }}
      >
        <Toolbar
          sx={{
            display: "flex",
            justifyContent: collapsed ? "center" : "space-between",
            alignItems: "center",
            px: 2,
          }}
        >
          {!collapsed && (
            <img
              src="/barnabaslogo.png"
              alt="Barnabas Logo"
              style={{ height: "40px", cursor: "pointer" }}
              onClick={() => navigate("/home")}
            />
          )}
          <IconButton onClick={() => setCollapsed(!collapsed)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        <Box sx={{ flexGrow: 1 }}>
          {navItems.map((item) => (
            <Button
              key={item.name}
              component={Link}
              to={item.path}
              startIcon={item.icon}
              sx={{
                justifyContent: collapsed ? "center" : "flex-start",
                px: collapsed ? 0 : 2,
                py: 1.5,
                width: "100%",
                color: path === item.path ? "#2ca6a4" : "#555",
                fontWeight: path === item.path ? "bold" : "normal",
                borderRadius: 0,
              }}
            >
              {!collapsed && item.name}
            </Button>
          ))}
        </Box>
        <Divider />
        {/* Profile + Logout at bottom */}
        <Box sx={{ p: 2, textAlign: "center" }}>
          <IconButton onClick={handleMenuOpen}>
            <Avatar sx={{ bgcolor: "white", color: "#2ca6a4" }}>
              <PersonIcon />
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            transformOrigin={{ vertical: "bottom", horizontal: "right" }}
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
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: collapsed ? `${drawerWidthCollapsed}px` : `${drawerWidthExpanded}px`,
          transition: "margin-left 0.3s",
        }}
      >
        <Toolbar />
        {content}
      </Box>
    </Box>
  );
}
