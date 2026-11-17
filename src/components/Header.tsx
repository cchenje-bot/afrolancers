import React, { useState } from 'react';
import { Bell, CheckCheck, Menu, Moon, Sun, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { NotificationItem, PublicUser } from '../types';

export type AppView = 'home' | 'find-work' | 'hire' | 'dashboard';

interface HeaderProps {
  currentView: AppView;
  user: PublicUser | null;
  notifications: NotificationItem[];
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onNavigate: (view: AppView, anchorId?: string) => void;
  onOpenAuth: (mode: 'login' | 'register', role?: 'freelancer' | 'client') => void;
  onLogout: () => void;
  onMarkNotificationsRead: () => void;
  onClickNotification: (notification: NotificationItem) => void;
}

const NOTIF_TYPE_LABELS: Record<NotificationItem['type'], string> = {
  alert: 'Project Alert',
  proposal: 'Proposal',
  invitation: 'Invitation',
  message: 'Message',
  review: 'Verified Review',
  payment: 'Escrow & Billing',
  interview: 'Interview',
  moderation: 'Moderation',
  system: 'Platform Update',
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  user,
  notifications,
  theme,
  onToggleTheme,
  onNavigate,
  onOpenAuth,
  onLogout,
  onMarkNotificationsRead,
  onClickNotification,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const navLinkClass = (active: boolean) =>
    `text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 py-1 border-b-2 ${
      active
        ? 'text-[#075B35] dark:text-[#34D399] border-[#075B35] dark:border-[#34D399]'
        : 'text-[#141715]/80 dark:text-[#EDF2EE]/80 border-transparent hover:text-[#141715] dark:hover:text-[#EDF2EE] hover:border-[#075B35]/40 dark:hover:border-[#34D399]/50'
    }`;

  return (
    <header className="sticky top-0 z-40 h-16 bg-white/95 dark:bg-[#171D19]/95 backdrop-blur-sm border-b border-[#E2E6E3] dark:border-[#2A352E] transition-colors">
      <div className="max-w-[1280px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            onNavigate('home');
          }}
          className="text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#075B35] rounded"
          aria-label="Afro-lancers.com Home"
        >
          <BrandLogo variant="light" />
        </button>

        {/* Zone 2: 5 Concise Single-Line Nav Links */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Primary Navigation">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className={navLinkClass(currentView === 'home')}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onNavigate('find-work')}
            className={navLinkClass(currentView === 'find-work')}
          >
            Find Work
          </button>
          <button
            type="button"
            onClick={() => onNavigate('hire')}
            className={navLinkClass(currentView === 'hire')}
          >
            Hire Freelancers
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home', 'categories-section')}
            className={navLinkClass(false)}
          >
            Browse Categories
          </button>
          <button
            type="button"
            onClick={() => onNavigate('home', 'how-it-works-section')}
            className={navLinkClass(false)}
          >
            How It Works
          </button>
        </nav>

        {/* Zone 3: Right Controls (Theme Toggle, Notifications, Sign In, Primary Action) */}
        <div className="hidden lg:flex items-center gap-3 shrink-0 relative">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#141715]/80 dark:text-[#EDF2EE]/85 hover:text-[#141715] dark:hover:text-white hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] transition-colors focus-visible:outline-2 focus-visible:outline-[#075B35]"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FBBF24]" /> : <Moon className="w-4 h-4" />}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen(!notifOpen)}
              aria-label="Notifications"
              className="relative w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#141715]/80 dark:text-[#EDF2EE]/85 hover:text-[#141715] dark:hover:text-white hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621] transition-colors focus-visible:outline-2 focus-visible:outline-[#075B35]"
            >
              <Bell className="w-4 h-4" />
              {user && unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded bg-[#E52525] text-white text-[10px] font-mono-num font-semibold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-[#171D19] border border-[#E2E6E3] dark:border-[#2A352E] rounded-xl shadow-xl p-4 z-50">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E2E6E3] dark:border-[#2A352E]">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-[#141715] dark:text-[#EDF2EE]">
                      Notifications & Alerts
                    </span>
                    {user && unreadCount > 0 && (
                      <span className="text-[11px] font-mono-num font-semibold text-[#E52525]">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {user && unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={onMarkNotificationsRead}
                        className="text-xs font-medium text-[#075B35] dark:text-[#34D399] hover:underline inline-flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-[#141715]/60 dark:text-[#B4C0B8] hover:text-[#141715] dark:hover:text-white"
                    >
                      Close
                    </button>
                  </div>
                </div>
                {!user ? (
                  <div className="py-3 text-xs text-[#141715]/75 dark:text-[#B4C0B8] space-y-2.5 leading-relaxed">
                    <p>
                      Sign in to receive live project alerts, proposal updates, job invitations, and
                      client messages.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        onOpenAuth('login');
                      }}
                      className="text-xs font-semibold text-[#075B35] dark:text-[#34D399] hover:underline"
                    >
                      Sign In to Account
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  <p className="py-4 text-xs text-[#141715]/65 dark:text-[#B4C0B8]">
                    No notifications yet.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {notifications.slice(0, 12).map((n) => (
                      <li
                        key={n.id}
                        className={`rounded-lg border transition-colors ${
                          n.read
                            ? 'border-[#F4F6F4] dark:border-[#2A352E]/60 bg-transparent'
                            : 'border-[#075B35]/25 dark:border-[#34D399]/30 bg-[#075B35]/[0.04] dark:bg-[#34D399]/[0.06]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setNotifOpen(false);
                            onClickNotification(n);
                          }}
                          className="w-full text-left p-2.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span
                              className={`font-semibold uppercase tracking-wide ${
                                n.type === 'alert'
                                  ? 'text-[#008C45] dark:text-[#34D399]'
                                  : 'text-[#141715]/60 dark:text-[#B4C0B8]'
                              }`}
                            >
                              {NOTIF_TYPE_LABELS[n.type] || 'Update'}
                            </span>
                            <span className="font-mono-num text-[#141715]/50 dark:text-[#B4C0B8]/80">
                              {new Date(n.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-[#141715] dark:text-[#EDF2EE] mt-0.5">
                            {n.title}
                          </p>
                          <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] mt-0.5 leading-relaxed">
                            {n.body}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {user ? (
            <>
              <button
                type="button"
                onClick={onLogout}
                className="text-sm font-medium text-[#141715]/80 dark:text-[#EDF2EE]/80 hover:text-[#141715] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                Sign Out
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#075B35] hover:bg-[#008C45] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                {user.role === 'admin' ? 'Admin Console' : 'Dashboard'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="text-sm font-semibold text-[#141715] dark:text-[#EDF2EE] hover:text-[#075B35] dark:hover:text-[#34D399] transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register', 'freelancer')}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#008C45] hover:bg-[#075B35] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                Sign Up
              </button>
            </>
          )}
        </div>

        {/* Mobile Controls (Theme + Bell + Hamburger) */}
        <div className="lg:hidden flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#141715] dark:text-[#EDF2EE] hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-[#FBBF24]" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Notifications"
            className="relative w-10 h-10 inline-flex items-center justify-center rounded-lg text-[#141715] dark:text-[#EDF2EE] hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]"
          >
            <Bell className="w-4 h-4" />
            {user && unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded bg-[#E52525] text-white text-[10px] font-mono-num font-semibold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Menu"
            className="w-11 h-11 inline-flex items-center justify-center rounded-lg text-[#141715] dark:text-[#EDF2EE] hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Notification Panel */}
      {notifOpen && (
        <div className="lg:hidden bg-white dark:bg-[#171D19] border-b border-[#E2E6E3] dark:border-[#2A352E] px-4 py-4 shadow-md">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2E6E3] dark:border-[#2A352E]">
            <span className="font-display text-sm font-semibold text-[#141715] dark:text-[#EDF2EE]">
              Notifications & Alerts
            </span>
            {user && unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkNotificationsRead}
                className="text-xs font-medium text-[#075B35] dark:text-[#34D399]"
              >
                Mark all read
              </button>
            )}
          </div>
          {!user ? (
            <button
              type="button"
              onClick={() => {
                setNotifOpen(false);
                onOpenAuth('login');
              }}
              className="text-xs font-semibold text-[#075B35] dark:text-[#34D399]"
            >
              Sign in to view alerts & notifications
            </button>
          ) : notifications.length === 0 ? (
            <p className="text-xs text-[#141715]/65 dark:text-[#B4C0B8]">No notifications yet.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {notifications.slice(0, 6).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setNotifOpen(false);
                      onClickNotification(n);
                    }}
                    className="w-full text-left p-2 rounded-lg bg-[#F4F6F4]/70 dark:bg-[#1E2621]"
                  >
                    <p className="text-xs font-semibold text-[#141715] dark:text-[#EDF2EE]">
                      {n.title}
                    </p>
                    <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] mt-0.5">{n.body}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-white dark:bg-[#171D19] border-b border-[#E2E6E3] dark:border-[#2A352E] px-4 py-5 space-y-4 shadow-md">
          <div className="flex flex-col space-y-3">
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate('home');
              }}
              className="text-left text-sm font-medium text-[#141715] dark:text-[#EDF2EE] py-1"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate('find-work');
              }}
              className="text-left text-sm font-medium text-[#141715] dark:text-[#EDF2EE] py-1"
            >
              Find Work
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate('hire');
              }}
              className="text-left text-sm font-medium text-[#141715] dark:text-[#EDF2EE] py-1"
            >
              Hire Freelancers
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate('home', 'categories-section');
              }}
              className="text-left text-sm font-medium text-[#141715] dark:text-[#EDF2EE] py-1"
            >
              Browse Categories
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                onNavigate('home', 'how-it-works-section');
              }}
              className="text-left text-sm font-medium text-[#141715] dark:text-[#EDF2EE] py-1"
            >
              How It Works
            </button>
          </div>

          <div className="pt-3 border-t border-[#E2E6E3] dark:border-[#2A352E] flex flex-col gap-2.5">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onNavigate('dashboard');
                  }}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#075B35] rounded-lg"
                >
                  Open {user.role === 'admin' ? 'Admin Console' : 'Dashboard'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onLogout();
                  }}
                  className="w-full py-2.5 text-sm font-medium text-[#141715] dark:text-[#EDF2EE] border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth('register', 'freelancer');
                  }}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#008C45] rounded-lg"
                >
                  I’m Looking for Work
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth('register', 'client');
                  }}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#E52525] rounded-lg"
                >
                  I’m Looking to Hire
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    onOpenAuth('login');
                  }}
                  className="w-full py-2.5 text-sm font-semibold text-[#141715] dark:text-[#EDF2EE] border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg"
                >
                  Sign In
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
