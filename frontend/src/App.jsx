import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InterviewSetup from './pages/InterviewSetup';
import InterviewSession from './pages/InterviewSession';
import Landing from './pages/Landing';
import EmployerRegister from './pages/EmployerRegister';
import EmployerDashboard from './pages/EmployerDashboard';
import Preferences from './pages/Preferences';

// Simple wrapper to protect routes
const PrivateRoute = ({ children }) => {
  return localStorage.getItem('token') ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/interview-setup" element={<PrivateRoute><InterviewSetup /></PrivateRoute>} />
        <Route path="/interview-session" element={<PrivateRoute><InterviewSession /></PrivateRoute>} />
        <Route path="/employer/register" element={<EmployerRegister />} />
        <Route path="/employer/dashboard" element={<EmployerDashboard />} />
        <Route path="/preferences" element={<PrivateRoute><Preferences /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;