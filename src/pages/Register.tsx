import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Layout, Mail, Lock, User, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import Logo from '../components/Logo';

export default function Register() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { register, googleLogin, logout } = useAuth();
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setError('');
    const result = await googleLogin();
    if (result.success) {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const email = (currentUser.email || '').toLowerCase();
        const isAdmin = email === 'ceo@pallywear.com' || email === 'rajeshkpallywear@gmail.com' || email.startsWith('admin') || email.startsWith('ceo');
        navigate(isAdmin ? '/admin' : '/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else {
      setError(result.message || 'Google login failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await register(name, email, password);
      if (result.success) {
        await logout();
        navigate('/login', { state: { message: 'Registration successful! Please sign in to continue.' } });
      } else {
        let message = result.message || 'Registration failed';
        if (message.includes('auth/email-already-in-use')) {
          message = 'This email is already registered. Please sign in instead.';
        }
        setError(message);
      }
    } catch (err: any) {
      let message = err.message || 'An unexpected error occurred';
      if (message.includes('auth/email-already-in-use')) {
        message = 'This email is already registered. Please sign in instead.';
      }
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center hero-bg px-6">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass-card p-8 rounded-2xl w-full max-w-md border-white/50"
      >
        <div className="flex flex-col items-center mb-8">
          <Logo iconOnly className="mb-4 scale-125" />
          <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Create your account</h2>
          <p className="text-gray-500 text-sm mt-1">Start your 14-day free trial today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-medium">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 opacity-70" /> Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm"
              placeholder="John Doe"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4 opacity-70" /> Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm"
              placeholder="name@company.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Lock className="w-4 h-4 opacity-70" /> Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm"
              placeholder="••••••••"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-[11px] text-gray-500">No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-[11px] text-gray-500">Cancel at any time</span>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-base shadow-lg shadow-brand-primary/20">
            Create account
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant="outline"
              className="bg-white gap-2 text-sm h-10"
              onClick={handleGoogleLogin}
            >
              <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" /> Google
            </Button>
            <Button variant="outline" className="bg-white gap-2 text-sm h-10">
              <Layout className="w-4 h-4 text-gray-600" /> Microsoft
            </Button>
          </div>
        </form>

        <p className="text-center text-sm text-gray-500 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-brand-primary hover:underline ml-1">
            Sign in
          </Link>
        </p>

        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-6">
          {['Intercom', 'Linear', 'Loom'].map(brand => (
            <span key={brand} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{brand}</span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
