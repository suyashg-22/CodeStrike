import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Arena from './pages/Arena';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 font-sans">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/arena" element={<Arena />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;