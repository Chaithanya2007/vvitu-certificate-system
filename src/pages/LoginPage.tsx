import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, rollToAuthEmail } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Shield, KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

type TabMode = 'student_login' | 'student_activate' | 'admin_login';

export default function LoginPage() {
  const [mode, setMode] = useState<TabMode>('student_login');
  const [rollNumber, setRollNumber] = useState('');
  const [hallTicketNo, setHallTicketNo] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verifiedStudent, setVerifiedStudent] = useState<{
    student_id: string;
    full_name: string;
    section_code: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const { refreshUserData } = useAuth();

  const resetMessages = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const authEmail = rollToAuthEmail(rollNumber);
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: authEmail, password });
      if (signInErr) throw new Error('Invalid Roll Number or Password. If this is your first time, click "First-Time Setup".');
      await refreshUserData();
      navigate('/student');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStudentIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc('check_student_activation_eligibility', {
        p_roll: rollNumber.trim(),
        p_hall_ticket: hallTicketNo.trim(),
      });
      if (rpcErr) throw rpcErr;
      if (!data || data.length === 0) throw new Error('No matching student record found. Check your Roll Number and Hall Ticket Number.');
      if (data[0].is_already_activated) throw new Error('This account is already activated. Please switch to "Student Login".');

      setVerifiedStudent({
        student_id: data[0].student_id,
        full_name: data[0].full_name,
        section_code: data[0].section_code,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    if (!verifiedStudent) return;
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    try {
      const authEmail = rollToAuthEmail(rollNumber);
      const { error: signUpErr } = await supabase.auth.signUp({ email: authEmail, password });
      if (signUpErr) throw signUpErr;

      const { error: linkErr } = await supabase.rpc('complete_student_activation', {
        p_student_id: verifiedStudent.student_id,
        p_roll_number: rollNumber.trim(),
        p_hall_ticket_no: hallTicketNo.trim(),
      });
      if (linkErr) throw linkErr;

      await refreshUserData();
      setSuccessMsg('Account activated! Redirecting to your dashboard...');
      setTimeout(() => navigate('/student'), 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInErr) throw new Error('Invalid Administrator Email or Password.');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!profile || !['admin', 'registrar', 'department_approver'].includes(profile.role) || !profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('Unauthorized: This account does not have Administrator privileges.');
      }

      await refreshUserData();
      navigate('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Portal Home
        </Link>
        <img src="/vvit-logo.png" alt="VVITU Logo" className="h-20 mx-auto object-contain" />
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900">VVITU Certificate System</h2>
        <p className="mt-1 text-sm text-slate-600">Sign in to manage or request official certificates</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-6 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-8">
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl mb-6 text-xs font-semibold">
            <button type="button" onClick={() => { setMode('student_login'); resetMessages(); }}
              className={`py-2 rounded-lg transition ${mode === 'student_login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
              Student Login
            </button>
            <button type="button" onClick={() => { setMode('student_activate'); setVerifiedStudent(null); resetMessages(); }}
              className={`py-2 rounded-lg transition ${mode === 'student_activate' ? 'bg-white text-[#D9785D] shadow-sm' : 'text-slate-600'}`}>
              First-Time Setup
            </button>
            <button type="button" onClick={() => { setMode('admin_login'); resetMessages(); }}
              className={`py-2 rounded-lg transition ${mode === 'admin_login' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600'}`}>
              Admin Portal
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /><span>{successMsg}</span>
            </div>
          )}

          {mode === 'student_login' && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">University Roll Number</label>
                <div className="mt-1 relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input type="text" required placeholder="e.g. 2025DADBT10001" value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-[#D9785D] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="mt-1 relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input type="password" required placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D9785D] outline-none" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#D9785D] hover:bg-[#c5654a] text-white font-semibold text-sm shadow transition disabled:opacity-50">
                {loading ? 'Signing in...' : 'Sign In as Student'}
              </button>
            </form>
          )}

          {mode === 'student_activate' && !verifiedStudent && (
            <form onSubmit={handleVerifyStudentIdentity} className="space-y-4">
              <p className="text-xs text-slate-500">
                Verify your institutional record using your Roll Number and Hall Ticket Number to set your password.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700">University Roll Number</label>
                <input type="text" required placeholder="e.g. 2025DADBT10001" value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value.toUpperCase())}
                  className="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm uppercase focus:ring-2 focus:ring-[#D9785D] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Hall Ticket Number</label>
                <input type="text" required placeholder="Enter Hall Ticket No" value={hallTicketNo}
                  onChange={(e) => setHallTicketNo(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D9785D] outline-none" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition disabled:opacity-50">
                {loading ? 'Verifying Record...' : 'Verify Student Identity'}
              </button>
            </form>
          )}

          {mode === 'student_activate' && verifiedStudent && (
            <form onSubmit={handleCompleteActivation} className="space-y-4">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
                <p className="font-bold">{verifiedStudent.full_name}</p>
                <p>Roll: {rollNumber} • Section: {verifiedStudent.section_code}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Create New Password</label>
                <input type="password" required minLength={6} placeholder="Minimum 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D9785D] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Confirm Password</label>
                <input type="password" required minLength={6} placeholder="Re-enter password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#D9785D] outline-none" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#D9785D] hover:bg-[#c5654a] text-white font-semibold text-sm transition disabled:opacity-50">
                {loading ? 'Activating Account...' : 'Activate Account & Sign In'}
              </button>
            </form>
          )}

          {mode === 'admin_login' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Administrator Email</label>
                <div className="mt-1 relative">
                  <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input type="email" required placeholder="admin@vvitu.ac.in" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="mt-1 relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input type="password" required placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow transition disabled:opacity-50">
                {loading ? 'Authenticating...' : 'Sign In to Admin Console'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
