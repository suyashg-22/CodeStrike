import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Import your pages (Make sure the file paths match your folder structure!)
import Dashboard from './pages/Dashboard';
import Arena from './pages/Arena';

export default function App() {
  return (
    // BrowserRouter wraps the whole app and enables the URL changing magic
    <BrowserRouter>
      <Routes>
        
        {/* If someone goes to localhost:5173/, instantly redirect them to the Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* The Global Dashboard Route */}
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* The Live Arena Route */}
        <Route path="/arena" element={<Arena />} />

        {/* Catch-All for 404 (If they type a weird URL, send them back to dashboard) */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        
      </Routes>
    </BrowserRouter>
  );
}