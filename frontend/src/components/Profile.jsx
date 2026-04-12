// src/components/Profile.jsx

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
} from "@mui/material";
import AxiosInstance from "./AxiosInstance"; // your axios setup
import "./style/Profile.css";

const Profile = () => {
  const [profile, setProfile] = useState({
    username: "",
    email: "",
    firstname: "",
    lastname: "",
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from backend
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await AxiosInstance.get("users/me/"); 
        setProfile(response.data);
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await AxiosInstance.put("users/me/", profile); 
      alert("Profile updated successfully!");
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile");
    }
  };

  if (loading) {
    return <p>Loading profile...</p>;
  }

  return (
    <Box className="profile-container">
      <Paper elevation={4} className="profile-card">
        <Typography variant="h5" className="profile-title">
          My Profile
        </Typography>

        <Stack spacing={3}>
          <TextField
            name="username"
            label="Username"
            value={profile.username}
            onChange={handleChange}
            disabled={!editing}
            fullWidth
          />
          <TextField
            name="email"
            label="Email"
            value={profile.email}
            onChange={handleChange}
            disabled={!editing}
            fullWidth
          />
          <TextField
            name="firstname"
            label="First Name"
            value={profile.firstname}
            onChange={handleChange}
            disabled={!editing}
            fullWidth
          />
          <TextField
            name="lastname"
            label="Last Name"
            value={profile.lastname}
            onChange={handleChange}
            disabled={!editing}
            fullWidth
          />

          {editing ? (
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                onClick={() => setEditing(false)}
              >
                Cancel
              </Button>
            </Stack>
          ) : (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setEditing(true)}
            >
              Edit Profile
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
};

export default Profile;
