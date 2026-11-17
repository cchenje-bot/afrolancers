import React, { useEffect, useState } from 'react';
import { ArrowRight, BellRing, CheckCircle2, Lock, X } from 'lucide-react';
import { api, setAuthToken } from '../lib/api';
import { CATEGORY_NAMES, COUNTRIES, EXPERIENCE_LEVELS, PRESET_PORTRAITS } from '../lib/constants';
import type { PublicUser } from '../types';

interface AuthModalProps {
  initialMode: 'login' | 'register' | 'recover';
  initialRole?: 'freelancer' | 'client';
  onClose: () => void;
  onSuccess: (user: PublicUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  initialMode,
  initialRole = 'freelancer',
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'recover'>(initialMode);
  const [role, setRole] = useState<'freelancer' | 'client'>(initialRole);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Recovery fields
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [generatedPreviewCode, setGeneratedPreviewCode] = useState<string | null>(null);

  // Common registration fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [password, setPassword] = useState('');

  // Freelancer registration fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [skills, setSkills] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Senior');
  const [yearsExperience, setYearsExperience] = useState('5');
  const [hourlyRate, setHourlyRate] = useState('45');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [portfolioTitle, setPortfolioTitle] = useState('');
  const [photoUrl, setPhotoUrl] = useState(PRESET_PORTRAITS[0].url);
  const [enableProjectAlerts, setEnableProjectAlerts] = useState(true);

  // Client registration fields
  const [companyName, setCompanyName] = useState('');
  const [businessCategory, setBusinessCategory] = useState(CATEGORY_NAMES[0]);
  const [companyWebsite, setCompanyWebsite] = useState('');

  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      const validOrigin =
        origin === window.location.origin ||
        origin.endsWith('.run.app') ||
        origin.includes('localhost');
      if (!validOrigin) return;

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.user) {
        if (event.data.token) {
          setAuthToken(event.data.token);
        }
        setOauthLoading(null);
        onSuccess(event.data.user as PublicUser);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [onSuccess]);

  const handleSocialOAuth = async (provider: 'google' | 'facebook') => {
    setError(null);
    setInfoMessage(null);
    setOauthLoading(provider);
    try {
      const res = await api.getOAuthUrl(provider, role);
      if (!res.configured || !res.url) {
        setError(
          res.error ||
            `${provider === 'google' ? 'Google' : 'Facebook'} sign-in credentials are not configured yet.`
        );
        setOauthLoading(null);
        return;
      }
      const popup = window.open(
        res.url,
        `afro_${provider}_oauth`,
        'width=600,height=700,menubar=no,toolbar=no'
      );
      if (!popup) {
        setError('Popup was blocked by your browser. Please allow popups for Afro-lancers.com.');
        setOauthLoading(null);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Unable to start ${provider === 'google' ? 'Google' : 'Facebook'} authentication.`
      );
      setOauthLoading(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.login(loginEmail, loginPassword);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  const quickFillDemo = (demoEmail: string, demoPass: string) => {
    setLoginEmail(demoEmail);
    setLoginPassword(demoPass);
    setError(null);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload =
        role === 'freelancer'
          ? {
              role,
              fullName,
              email,
              phone,
              country,
              password,
              title,
              category,
              skills,
              experienceLevel,
              yearsExperience: Number(yearsExperience) || 3,
              hourlyRate: Number(hourlyRate) || 35,
              bio,
              portfolioUrl,
              portfolioTitle,
              photoUrl,
              enableProjectAlerts,
            }
          : {
              role,
              fullName,
              companyName,
              email,
              phone,
              country,
              password,
              businessCategory,
              companyWebsite,
            };

      const res = await api.register(payload);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const res = await api.requestRecovery(recoverEmail);
      setGeneratedPreviewCode(res.recoveryCodePreview);
      setInfoMessage(
        `${res.message} Enter verification code ${res.recoveryCodePreview} below to set a new password.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recovery request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.resetPassword(recoverEmail, recoverCode, recoverNewPassword);
      setInfoMessage(res.message);
      setGeneratedPreviewCode(null);
      setMode('login');
      setLoginEmail(recoverEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-white dark:bg-[#1E2621] text-[#141715] dark:text-[#EDF2EE] placeholder:text-[#141715]/45 dark:placeholder:text-[#B4C0B8]/60 focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]';
  const selectClass =
    'w-full px-3.5 py-2.5 text-sm border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-white dark:bg-[#1E2621] text-[#141715] dark:text-[#EDF2EE] focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]';

  const SocialButtons = ({ contextLabel }: { contextLabel: string }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => handleSocialOAuth('google')}
          disabled={oauthLoading !== null}
          className="w-full py-2.5 px-3.5 rounded-lg border border-[#E2E6E3] dark:border-[#2A352E] bg-white dark:bg-[#1E2621] hover:bg-[#F4F6F4] dark:hover:bg-[#253029] text-sm font-semibold text-[#141715] dark:text-[#EDF2EE] inline-flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60"
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
            />
          </svg>
          <span>
            {oauthLoading === 'google' ? 'Connecting Google...' : `${contextLabel} Google`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleSocialOAuth('facebook')}
          disabled={oauthLoading !== null}
          className="w-full py-2.5 px-3.5 rounded-lg border border-[#1877F2]/30 bg-[#1877F2] hover:bg-[#166FE5] text-sm font-semibold text-white inline-flex items-center justify-center gap-2.5 transition-colors disabled:opacity-60"
        >
          <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span>
            {oauthLoading === 'facebook' ? 'Connecting Facebook...' : `${contextLabel} Facebook`}
          </span>
        </button>
      </div>

      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-[#E2E6E3] dark:border-[#2A352E]" />
        <span className="shrink mx-3 text-[11px] uppercase tracking-wider font-semibold text-[#141715]/50 dark:text-[#B4C0B8]">
          or with email
        </span>
        <div className="flex-grow border-t border-[#E2E6E3] dark:border-[#2A352E]" />
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-[2px] flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-[#171D19] w-full max-w-2xl rounded-2xl border border-[#E2E6E3] dark:border-[#2A352E] shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-[#101010] text-white flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold">
              {mode === 'login'
                ? 'Sign In to Afro-lancers.com'
                : mode === 'recover'
                  ? 'Password Recovery'
                  : 'Create Your Account'}
            </h2>
            <p className="text-xs text-white/75 mt-0.5">
              {mode === 'register'
                ? 'Join using Google, Facebook, or your email as a Freelancer or Hiring Client.'
                : 'Access your projects, alerts, proposals, messages, and marketplace tools.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication modal"
            className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-white/75 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="px-6 pt-4 border-b border-[#E2E6E3] dark:border-[#2A352E] flex items-center gap-6 bg-[#F4F6F4]/70 dark:bg-[#121814]">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              mode === 'login'
                ? 'border-[#075B35] dark:border-[#34D399] text-[#075B35] dark:text-[#34D399]'
                : 'border-transparent text-[#141715]/65 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              mode === 'register'
                ? 'border-[#075B35] dark:border-[#34D399] text-[#075B35] dark:text-[#34D399]'
                : 'border-transparent text-[#141715]/65 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white'
            }`}
          >
            Register New Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('recover');
              setError(null);
            }}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
              mode === 'recover'
                ? 'border-[#075B35] dark:border-[#34D399] text-[#075B35] dark:text-[#34D399]'
                : 'border-transparent text-[#141715]/65 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white'
            }`}
          >
            Recover Password
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto text-[#141715] dark:text-[#EDF2EE]">
          {error && (
            <div className="mb-4 p-3.5 rounded-lg bg-[#E52525]/10 border border-[#E52525]/35 text-sm text-[#B91C1C] dark:text-[#FCA5A5]">
              {error}
            </div>
          )}
          {infoMessage && (
            <div className="mb-4 p-3.5 rounded-lg bg-[#008C45]/10 border border-[#008C45]/35 text-sm text-[#075B35] dark:text-[#34D399] flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <SocialButtons contextLabel="Continue with" />

              <div>
                <label className="block text-xs font-semibold mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={inputClass}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold">Password</label>
                  <button
                    type="button"
                    onClick={() => setMode('recover')}
                    className="text-xs font-medium text-[#075B35] dark:text-[#34D399] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#075B35] hover:bg-[#008C45] text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Lock className="w-4 h-4" />
                {loading ? 'Signing In...' : 'Sign In'}
              </button>

              {/* Quick Preview Account Fill */}
              <div className="pt-4 mt-4 border-t border-[#E2E6E3] dark:border-[#2A352E]">
                <p className="text-xs font-semibold text-[#141715]/70 dark:text-[#B4C0B8] mb-2.5">
                  Quick Preview Credentials (for evaluating dashboards):
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => quickFillDemo('kwame.mensah@afro-lancers.com', 'TalentAfro2026!')}
                    className="px-3 py-2 text-xs font-medium border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg hover:border-[#075B35] dark:hover:border-[#34D399] hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] text-left"
                  >
                    <span className="block font-semibold">Freelancer Portal</span>
                    <span className="text-[#141715]/60 dark:text-[#B4C0B8]">Kwame Mensah</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillDemo('amara.diallo@afro-lancers.com', 'ClientAfro2026!')}
                    className="px-3 py-2 text-xs font-medium border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg hover:border-[#075B35] dark:hover:border-[#34D399] hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] text-left"
                  >
                    <span className="block font-semibold">Client Portal</span>
                    <span className="text-[#141715]/60 dark:text-[#B4C0B8]">Teranga FinTech</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => quickFillDemo('admin@afro-lancers.com', 'AdminAfro2026!')}
                    className="px-3 py-2 text-xs font-medium border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg hover:border-[#075B35] dark:hover:border-[#34D399] hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] text-left"
                  >
                    <span className="block font-semibold">Admin Console</span>
                    <span className="text-[#141715]/60 dark:text-[#B4C0B8]">Platform Owner</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {mode === 'recover' && (
            <div className="space-y-5">
              <form onSubmit={handleRequestRecovery} className="space-y-3">
                <label className="block text-xs font-semibold">
                  1. Enter Account Email to Generate Recovery Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`flex-1 ${inputClass}`}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2.5 bg-[#101010] dark:bg-[#075B35] text-white text-sm font-semibold rounded-lg hover:bg-[#075B35] dark:hover:bg-[#008C45] whitespace-nowrap"
                  >
                    Send Code
                  </button>
                </div>
              </form>

              {generatedPreviewCode && (
                <form
                  onSubmit={handleResetPassword}
                  className="space-y-3 pt-4 border-t border-[#E2E6E3] dark:border-[#2A352E]"
                >
                  <div>
                    <label className="block text-xs font-semibold mb-1">2. Verification Code</label>
                    <input
                      type="text"
                      required
                      value={recoverCode}
                      onChange={(e) => setRecoverCode(e.target.value)}
                      placeholder="Enter code"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      New Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={recoverNewPassword}
                      onChange={(e) => setRecoverNewPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-[#008C45] hover:bg-[#075B35] text-white text-sm font-semibold rounded-lg"
                  >
                    Confirm New Password
                  </button>
                </form>
              )}
            </div>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Two Distinct Pathways */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('freelancer')}
                  className={`p-3.5 rounded-xl border text-left transition-colors ${
                    role === 'freelancer'
                      ? 'border-[#008C45] dark:border-[#34D399] bg-[#008C45]/5 dark:bg-[#34D399]/10'
                      : 'border-[#E2E6E3] dark:border-[#2A352E] hover:border-[#141715]/30 dark:hover:border-[#EDF2EE]/30'
                  }`}
                >
                  <p className="font-display text-sm font-bold">I’m Looking for Work</p>
                  <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8] mt-0.5">
                    Register as a Freelancer & showcase your portfolio
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`p-3.5 rounded-xl border text-left transition-colors ${
                    role === 'client'
                      ? 'border-[#E52525] bg-[#E52525]/5 dark:bg-[#E52525]/10'
                      : 'border-[#E2E6E3] dark:border-[#2A352E] hover:border-[#141715]/30 dark:hover:border-[#EDF2EE]/30'
                  }`}
                >
                  <p className="font-display text-sm font-bold">I’m Looking to Hire</p>
                  <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8] mt-0.5">
                    Register as a Client / Employer & post jobs
                  </p>
                </button>
              </div>

              <SocialButtons contextLabel="Sign up with" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Tendai Moyo"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254 700 000 000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Country *</label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={selectClass}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {role === 'freelancer' ? (
                <div className="space-y-4 pt-2 border-t border-[#E2E6E3] dark:border-[#2A352E]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Professional Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Senior Full-Stack Developer"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Professional Category *
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className={selectClass}
                      >
                        {CATEGORY_NAMES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Core Skills (comma-separated) *
                      </label>
                      <input
                        type="text"
                        required
                        value={skills}
                        onChange={(e) => setSkills(e.target.value)}
                        placeholder="TypeScript, React, UI Design"
                        className={inputClass}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Experience</label>
                        <select
                          value={experienceLevel}
                          onChange={(e) => setExperienceLevel(e.target.value)}
                          className={selectClass}
                        >
                          {EXPERIENCE_LEVELS.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Hourly Rate (USD)
                        </label>
                        <input
                          type="number"
                          min={5}
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(e.target.value)}
                          className={`${inputClass} font-mono-num`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Featured Portfolio Project Title
                      </label>
                      <input
                        type="text"
                        value={portfolioTitle}
                        onChange={(e) => setPortfolioTitle(e.target.value)}
                        placeholder="e.g. Mobile Banking Redesign"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Portfolio URL</label>
                      <input
                        type="url"
                        value={portfolioUrl}
                        onChange={(e) => setPortfolioUrl(e.target.value)}
                        placeholder="https://portfolio.example.com"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Profile Photograph</label>
                    <select
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Use initials monogram avatar</option>
                      {PRESET_PORTRAITS.map((p) => (
                        <option key={p.url} value={p.url}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Professional Biography *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Summarize your background, key client outcomes, and technical strengths..."
                      className={inputClass}
                    />
                  </div>

                  <label className="flex items-start gap-2.5 p-3 rounded-lg border border-[#075B35]/25 dark:border-[#34D399]/30 bg-[#075B35]/[0.04] dark:bg-[#34D399]/[0.06] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableProjectAlerts}
                      onChange={(e) => setEnableProjectAlerts(e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-[#075B35]"
                    />
                    <span className="text-xs leading-relaxed">
                      <span className="font-semibold text-[#075B35] dark:text-[#34D399] inline-flex items-center gap-1">
                        <BellRing className="w-3.5 h-3.5" />
                        Enable instant Project Alerts for matching jobs
                      </span>
                      <span className="block text-[#141715]/70 dark:text-[#B4C0B8] mt-0.5">
                        Receive real-time notifications whenever new client briefs match your
                        category or skills.
                      </span>
                    </span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4 pt-2 border-t border-[#E2E6E3] dark:border-[#2A352E]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Company / Organization Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Savannah Ventures Ltd"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Business Category *
                      </label>
                      <select
                        value={businessCategory}
                        onChange={(e) => setBusinessCategory(e.target.value)}
                        className={selectClass}
                      >
                        {CATEGORY_NAMES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Company Website (Optional)
                    </label>
                    <input
                      type="url"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      placeholder="https://company.com"
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60 ${
                  role === 'client'
                    ? 'bg-[#E52525] hover:bg-[#c81e1e]'
                    : 'bg-[#008C45] hover:bg-[#075B35]'
                }`}
              >
                {loading
                  ? 'Creating Account...'
                  : role === 'freelancer'
                    ? 'Create Freelancer Profile'
                    : 'Create Client Account'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
