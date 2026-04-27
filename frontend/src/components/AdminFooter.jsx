import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./style/AdminFooter.css";

const AdminFooter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemMetrics, setSystemMetrics] = useState({
    serverLoad: 32,
    activeUsers: 142,
    todayAppointments: 28
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <footer className="admin-footer">
      <div className="admin-footer-container">
        <div className="admin-footer-grid">
          {/* Admin Portal Info Section */}
          <div className="admin-footer-section">
            <div className="admin-footer-logo">
              <div className="admin-logo-icon">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
                  <path d="M12 11.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                </svg>
              </div>
              <div>
                <h3 className="admin-footer-title">Admin Portal</h3>
                <p className="admin-footer-badge">Secure Access Only</p>
              </div>
            </div>
            <p className="admin-footer-description">
              Secure administrative dashboard for Barnabas Dental Clinic management.
              Monitor operations, manage patients, and oversee appointments.
            </p>
            <div className="admin-footer-stats">
              <div className="admin-stat">
                <span className="admin-stat-value">{systemMetrics.activeUsers}</span>
                <span className="admin-stat-label">Active Users</span>
              </div>
              <div className="admin-stat">
                <span className="admin-stat-value">{systemMetrics.todayAppointments}</span>
                <span className="admin-stat-label">Today's Appointments</span>
              </div>
            </div>
          </div>

          {/* Admin Quick Links */}
          <div className="admin-footer-section">
            <h4 className="admin-footer-section-title">Quick Navigation</h4>
            <ul className="admin-footer-links">
              <li><Link to="/admin/dashboard" className={location.pathname === '/admin/dashboard' ? 'active' : ''}>Dashboard</Link></li>
              <li><Link to="/admin/appointments">Appointments</Link></li>
              <li><Link to="/admin/patients">Patient Management</Link></li>
              <li><Link to="/admin/staff">Staff Management</Link></li>
              <li><Link to="/admin/reports">Analytics & Reports</Link></li>
              <li><Link to="/admin/settings">System Settings</Link></li>
            </ul>
          </div>

          {/* System Status Section */}
          <div className="admin-footer-section">
            <h4 className="admin-footer-section-title">System Health</h4>
            <div className="admin-system-status">
              <div className="admin-status-item">
                <div className="admin-status-left">
                  <span className="admin-status-dot online"></span>
                  <span>Server Status</span>
                </div>
                <span className="admin-status-text">Operational</span>
              </div>
              <div className="admin-status-item">
                <div className="admin-status-left">
                  <span className="admin-status-dot online"></span>
                  <span>Database</span>
                </div>
                <span className="admin-status-text">Connected</span>
              </div>
              <div className="admin-status-item">
                <div className="admin-status-left">
                  <span className="admin-status-dot active"></span>
                  <span>API Gateway</span>
                </div>
                <span className="admin-status-text">Running</span>
              </div>
              <div className="admin-status-item">
                <div className="admin-status-left">
                  <span className="admin-status-dot warning"></span>
                  <span>Server Load</span>
                </div>
                <span className="admin-status-text">{systemMetrics.serverLoad}%</span>
              </div>
            </div>
            <div className="admin-system-metrics">
              <div className="admin-metric-bar">
                <div 
                  className="admin-metric-fill" 
                  style={{ width: `${systemMetrics.serverLoad}%` }}
                ></div>
              </div>
              <div className="admin-last-update">
                <span>🕐 System Time: {formatTime()}</span>
              </div>
            </div>
          </div>

          {/* Support & Resources */}
          <div className="admin-footer-section">
            <h4 className="admin-footer-section-title">Support & Resources</h4>
            <ul className="admin-footer-links">
              <li><a href="/admin/help">📖 Help Center</a></li>
              <li><a href="/admin/documentation">📚 Documentation</a></li>
              <li><a href="/admin/support">🛠️ IT Support</a></li>
              <li><a href="/admin/audit-logs">📋 Audit Logs</a></li>
              <li><a href="/admin/backup">💾 Backup Manager</a></li>
            </ul>
            <div className="admin-contact-support">
              <button 
                className="admin-support-btn"
                onClick={() => window.location.href = "mailto:it-support@barnabasdental.com"}
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>

        {/* Copyright and Legal Bar */}
        <div className="admin-footer-bottom">
          <div className="admin-footer-copyright">
            <p>© {currentYear} Barnabas Dental Clinic. Admin Portal v2.0.1</p>
            <p className="admin-footer-license">Protected by enterprise-grade security protocols</p>
          </div>
          <div className="admin-footer-legal">
            <a href="/admin/security">🔒 Security Policy</a>
            <a href="/admin/terms">📜 Admin Terms</a>
            <a href="/admin/compliance">⚖️ Compliance</a>
            <a href="/admin/privacy">🔐 Privacy</a>
          </div>
        </div>
      </div>
      
      {/* Animated gradient border at top */}
      <div className="admin-footer-border"></div>
    </footer>
  );
};

export default AdminFooter;