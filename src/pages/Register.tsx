import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Layout, Mail, Lock, User, CheckCircle2, Eye, EyeOff, Shield, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import Logo from '../components/Logo';
import { UserRole } from '../types';
import { mockDataService } from '../service/mockDataService';

export default function Register() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.MARKETING);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [inviteId, setInviteId] = useState('');
  const [isInviteLocked, setIsInviteLocked] = useState(false);
  const { register, googleLogin, logout } = useAuth();
  const navigate = useNavigate();

  const [showSettings, setShowSettings] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(localStorage.getItem('pallywear_api_url') || 'https://pallywear.in');

  const saveSettings = () => {
    let url = tempApiUrl.trim();
    if (url) {
      url = url.replace(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.(\d{4,5})/, '$1:$2');
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
      }
      if (url.includes('118.139.167.81')) {
        url = url.replace('https://', 'http://');
      }
      localStorage.setItem('pallywear_api_url', url);
    } else {
      localStorage.setItem('pallywear_api_url', 'https://pallywear.in');
    }
    setShowSettings(false);
    window.location.reload();
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
      setInviteId(invite);
      mockDataService.getInvitationDetails(invite).then(details => {
        if (details && details.status === 'pending') {
          setEmail(details.email);
          setRole(details.role as UserRole);
          setIsInviteLocked(true);
        } else {
          setError('This invitation link has expired or is invalid.');
        }
      }).catch(err => {
        setError('Error loading invitation details.');
      });
    }
  }, []);

  const handleGoogleLogin = async () => {
    setError('');
    const result = await googleLogin();
    if (result.success) {
      const isAdmin = result.user?.role === UserRole.ADMIN || result.user?.email === 'admin' || result.user?.email?.startsWith('admin') || result.user?.email?.startsWith('ceo');
      navigate(isAdmin ? '/admin' : '/dashboard');
    } else {
      setError(result.message || 'Google login failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const result = await register(name, email, password, role, inviteId);
      if (result.success) {
        await logout();
        navigate('/login', { state: { message: `Successfully registered ${email}! Please sign in with the new credentials.` } });
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
        className="glass-card p-8 rounded-2xl w-full max-w-md border-white/50 relative"
      >
        <div className="flex flex-col items-center mb-8">
          <Logo iconOnly className="mb-4 scale-125" />
          <h2 className="text-2xl font-bold text-brand-dark tracking-tight">Register New User</h2>
          <p className="text-gray-500 text-sm mt-1">Add a new staff member to the platform</p>
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm read-only:bg-gray-50 read-only:text-gray-500 read-only:cursor-not-allowed"
              placeholder="name@company.com"
              required
              readOnly={isInviteLocked}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Lock className="w-4 h-4 opacity-70" /> Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm pr-12"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-brand-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Shield className="w-4 h-4 opacity-70" /> Assign Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
              disabled={isInviteLocked}
            >
              <option value={UserRole.MARKETING}>Marketing</option>
              <option value={UserRole.DESIGNER}>Designer (Art Studio)</option>
              <option value={UserRole.ACCOUNTS}>Accounts</option>
              <option value={UserRole.ORDER_MANAGEMENT}>Order Management</option>
              <option value={UserRole.PRODUCTION}>Production (Factory)</option>
              <option value={UserRole.DIGITIZER}>Digitizing & Embroidery</option>
              <option value={UserRole.DELIVERY}>Delivery</option>
              <option value={UserRole.TELECALLER}>Telecaller</option>
              <option value={UserRole.VENDOR}>Vendor</option>
              <option value={UserRole.ADMIN}>Administrator</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 opacity-70" /> Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            Create Staff Account
          </Button>

          <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-amber-700 text-[10px] font-medium leading-relaxed">
            Note: For technical reasons, registering a new user will sign you out as admin. You will need to log back in.
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-center gap-4">
          <Link to="/admin" className="text-sm font-bold text-brand-primary hover:underline">
            ← Return to Admin Panel
          </Link>
        </div>

        {/* Connection Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white p-6 rounded-2xl w-full max-w-sm border border-gray-100 shadow-2xl relative text-left"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-indigo-600 animate-spin-slow" />
                  Connection Settings
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  Configure backend server endpoint.
                </p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">
                      Backend API Base URL
                    </label>
                    <input
                      type="text"
                      value={tempApiUrl}
                      onChange={(e) => setTempApiUrl(e.target.value)}
                      placeholder="e.g. http://118.139.167.81:3000"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs text-gray-500"
                      onClick={() => setShowSettings(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="text-xs text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        localStorage.setItem('pallywear_api_url', 'https://pallywear.in');
                        setTempApiUrl('https://pallywear.in');
                        setShowSettings(false);
                        window.location.reload();
                      }}
                    >
                      Reset
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 text-xs"
                      onClick={saveSettings}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
