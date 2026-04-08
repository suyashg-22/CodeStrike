import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import your pages
import Dashboard from './pages/Dashboard';
import Arena from './pages/Arena';
// Make sure you have a Login component! If not, we can make a quick one.
import Login from './pages/Login'; 

import Leaderboard from './pages/Leaderboard';
import Training from './pages/Training';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* ADDED THE LOGIN ROUTE BACK */}
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/arena" element={<Arena />} />

        {/* Catch-All */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />

        <Route path="/leaderboard" element={<Leaderboard />} />

        <Route path="/training" element={<Training />} />
      </Routes>
    </BrowserRouter>
  );
}