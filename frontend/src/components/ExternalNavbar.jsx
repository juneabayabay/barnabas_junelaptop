// src/components/ExternalNavbar.jsx

import React, { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Box,
  CssBaseline,
  Button,
  Container,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./style/ExternalNavbar.css";

export default function ExternalNavbar({ content }) {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Don't render on admin routes
  if (path === '/admin' || path.startsWith('/admin/')) {
    return <>{content}</>;
  }

  const navItems = [
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <CssBaseline />
      
      {/* Transparent Navbar with Glass Effect */}
      <AppBar
        position="fixed"
        className={`external-navbar ${scrolled ? 'scrolled' : ''}`}
        sx={{
          bgcolor: scrolled ? "rgba(255, 255, 255, 0.95)" : "rgba(255, 255, 255, 0.85)",
          boxShadow: scrolled ? "0 4px 30px rgba(0, 0, 0, 0.1)" : "0 4px 30px rgba(0, 0, 0, 0.05)",
          backdropFilter: "blur(12px)",
          borderBottom: scrolled ? "1px solid rgba(44, 166, 164, 0.2)" : "1px solid rgba(44, 166, 164, 0.1)",
          transition: "all 0.3s ease",
        }}
      >
        <Container maxWidth={false} disableGutters>
          <Toolbar sx={{ 
            display: "flex", 
            justifyContent: "space-between",
            px: { xs: 2, sm: 3, md: 4 },
            py: 1
          }}>
            {/* Logo */}
            <Box 
              className="logo-container"
              onClick={() => navigate("/")}
              sx={{ cursor: "pointer" }}
            >
              <img
                src="/barnabaslogo.png"
                alt="Barnabas Dental Clinic"
                className="navbar-logo"
              />
              <span className="logo-text">Barnabas Dental</span>
            </Box>

            {/* Navigation Items */}
            <Box sx={{ display: "flex", gap: { xs: 1, sm: 2 }, alignItems: "center" }}>
              {navItems.map((item) => (
                <Button
                  key={item.name}
                  component={Link}
                  to={item.path}
                  className={`nav-link ${path === item.path ? 'active' : ''}`}
                  sx={{
                    color: "#1a5f5d",
                    fontWeight: path === item.path ? 600 : 500,
                    textTransform: "none",
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                    "&:hover": {
                      backgroundColor: "transparent",
                      color: "#2ca6a4",
                    },
                  }}
                >
                  {item.name}
                </Button>
              ))}

              {/* Login and Signup Buttons */}
              <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 }, ml: { xs: 0, sm: 2 } }}>
                <Button
                  component={Link}
                  to="/login"
                  className="btn-login"
                  sx={{
                    color: "#1a5f5d",
                    borderColor: "rgba(44, 166, 164, 0.5)",
                    backgroundColor: "rgba(255, 255, 255, 0.5)",
                    textTransform: "none",
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 0.5, sm: 0.75 },
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    "&:hover": {
                      backgroundColor: "rgba(44, 166, 164, 0.1)",
                      borderColor: "#2ca6a4",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  Login
                </Button>
                <Button
                  component={Link}
                  to="/register"
                  className="btn-signup"
                  sx={{
                    background: "linear-gradient(135deg, #2ca6a4 0%, #1a5f5d 100%)",
                    color: "white !important",
                    textTransform: "none",
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 0.5, sm: 0.75 },
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    "&:hover": {
                      background: "linear-gradient(135deg, #238a88 0%, #144f4d 100%)",
                      transform: "translateY(-2px)",
                      boxShadow: "0 6px 20px rgba(44, 166, 164, 0.3)",
                    },
                  }}
                >
                  Sign Up
                </Button>
              </Box>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Main Content - No margins/padding */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1,
          margin: 0,
          padding: 0,
          width: "100%",
          mt: "64px", // Height of AppBar
        }}
      >
        {content}
      </Box>
    </Box>
  );
}