import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import AxiosInstance from "./AxiosInstance";

const AdminDashboard = () => {
  const [billing, setBilling] = useState([]);
  const [payments, setPayments] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [billingRes, paymentsRes, recordsRes] = await Promise.all([
        AxiosInstance.get("billing/"),
        AxiosInstance.get("payments/"),
        AxiosInstance.get("patients/"),
      ]);
      setBilling(billingRes.data);
      setPayments(paymentsRes.data);
      setRecords(recordsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalIncome = payments.reduce(
    (sum, p) => sum + parseFloat(p.amount || 0),
    0
  );
  const unpaidInvoices = billing.filter((b) => b.status === "unpaid").length;

  return (
    <Box sx={{ p: 4, bgcolor: "#f9f9f9", minHeight: "100vh" }}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: "bold" }}>
        Admin Dashboard
      </Typography>

      {loading ? (
        <Typography>Loading data...</Typography>
      ) : (
        <Grid container spacing={3}>
          {/* Overview Cards */}
          <Grid item xs={12} md={4}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6">Total Income</Typography>
                <Typography variant="h5" color="primary">
                  ₱{totalIncome.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6">Unpaid Invoices</Typography>
                <Typography variant="h5" color="error">
                  {unpaidInvoices}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6">Patient Records</Typography>
                <Typography variant="h5" color="secondary">
                  {records.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Billing Monitoring */}
          <Grid item xs={12}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Billing Monitoring
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {billing.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.invoice_number}</TableCell>
                          <TableCell>{b.amount}</TableCell>
                          <TableCell>{b.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Payment Tracking */}
          <Grid item xs={12}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Tracking
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  {payments.map((p) => (
                    <ListItem key={p.id} divider>
                      <ListItemText
                        primary={`${p.method} - ${p.transaction_id}`}
                        secondary={`Date: ${p.payment_date}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Patient Records */}
          <Grid item xs={12}>
            <Card sx={{ boxShadow: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Patient Records
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <List>
                  {records.map((r) => (
                    <ListItem key={r.id} divider>
                      <ListItemText
                        primary={`Patient: ${r.patient}`}
                        secondary={`History: ${r.medical_history}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default AdminDashboard;
