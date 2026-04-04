import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Handle typing in the input fields
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      // We send the request to your backend running on port 5000
      const response = await axios.post(`http://localhost:5000${endpoint}`, formData);
      
      // Save the JWT token and user info to LocalStorage
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Redirect the user to the Dashboard
      navigate('/dashboard');
      
    } catch (err) {
      // Display the error message sent from our Node backend
      setError(err.response?.data?.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white font-sans px-4">
      <div className="w-full max-w-md p-8 bg-gray-800 rounded-lg shadow-2xl border border-gray-700">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-blue-500 tracking-wider mb-2">CODE STRIKE</h1>
          <p className="text-gray-400">Prove your algorithmic dominance.</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-3 rounded mb-4 text-center text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {!isLogin && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">Username</label>
              <input 
                type="text" name="username" value={formData.username} onChange={handleChange} required={!isLogin}
                className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          )}
          
          <div>
            <label className="block text-gray-400 text-sm mb-1">Email</label>
            <input 
              type="email" name="email" value={formData.email} onChange={handleChange} required
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Password</label>
            <input 
              type="password" name="password" value={formData.password} onChange={handleChange} required
              className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <button 
            type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded transition flex justify-center items-center disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isLogin ? 'ENTER ARENA' : 'REGISTER')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-gray-400 hover:text-white transition text-sm underline"
          >
            {isLogin ? "Need an account? Sign up." : "Already have an account? Log in."}
          </button>
        </div>
      </div>
    </div>
  );
}