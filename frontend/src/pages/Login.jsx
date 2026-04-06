import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Pre-load DBZ Audio
const audioCache = {
  button: new Audio('/sounds/buttonPress.mp3'),
  bgm: new Audio('/sounds/meteor.mp3') // <-- ADDED BGM!
};

audioCache.bgm.loop = true;
audioCache.bgm.volume = 0.3;

export default function Login() {
  const [isLoginView, setIsLoginView] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Handle Background Music & Auto-Redirect
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    // Only redirect if they actually have a valid user saved
    if (token && user && user !== "undefined") {
      navigate('/dashboard');
    }

    const startAudio = () => {
      audioCache.bgm.play().catch(() => {});
      document.removeEventListener('click', startAudio);
    };
    document.addEventListener('click', startAudio);

    return () => {
      document.removeEventListener('click', startAudio);
      audioCache.bgm.pause(); // Stop music if they leave the page
    };
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const playClick = () => {
    audioCache.button.currentTime = 0;
    audioCache.button.play().catch(() => {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    playClick();
    setIsLoading(true);
    setError('');

    const endpoint = isLoginView ? '/login' : '/register';
    
    try {
      const res = await axios.post(`http://localhost:5000/api/auth${endpoint}`, formData);
      
      // SAFETY CHECK: Did the backend actually send the user object?
      const userData = res.data.user;
      if (!userData || !userData._id) {
        setError("Backend Auth Error: Server did not return the user ID.");
        setIsLoading(false);
        return; // Stop the function, don't go to dashboard!
      }

      // Save the JWT and User data securely
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Stop the login music and Teleport to Dashboard
      audioCache.bgm.pause();
      navigate('/dashboard');
      
    } catch (err) {
      setError(err.response?.data?.message || 'A network anomaly occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

      <div className="relative z-10 w-full max-w-md p-8 bg-gray-900 border border-gray-800 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 uppercase mb-2">
            CODE STRIKE
          </h1>
          <p className="text-gray-500 text-xs tracking-[0.3em] uppercase">
            {isLoginView ? 'Identify Yourself, Fighter' : 'Register for the Tournament'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-500 rounded text-red-400 text-sm text-center font-bold tracking-wider animate-pulse">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLoginView && (
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Fighter Tag (Username)</label>
              <input 
                type="text" 
                name="username"
                value={formData.username}
                onChange={handleChange}
                required={!isLoginView}
                className="w-full bg-[#0d1117] border border-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm"
                placeholder="e.g. SuperSaiyan99"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Comm-Link (Email)</label>
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full bg-[#0d1117] border border-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm"
              placeholder="fighter@earth.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Security Code (Password)</label>
            <input 
              type="password" 
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full bg-[#0d1117] border border-gray-700 text-white rounded px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors font-mono text-sm"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-4 mt-4 font-black text-lg tracking-widest uppercase bg-blue-600 hover:bg-blue-500 text-white rounded shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:transform-none"
          >
            {isLoading ? 'Verifying...' : (isLoginView ? 'Initialize Login' : 'Create Record')}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-800 pt-6">
          <p className="text-gray-500 text-sm">
            {isLoginView ? "Don't have a combat record? " : "Already registered? "}
            <button 
              type="button"
              onClick={() => {
                playClick();
                setIsLoginView(!isLoginView);
                setError('');
              }}
              className="text-blue-400 hover:text-blue-300 font-bold underline tracking-wider"
            >
              {isLoginView ? 'Register Here' : 'Login Here'}
            </button>
          </p>
        </div>

      </div>
    </div>
  );
}