import React, { useCallback, useEffect, useState } from 'react';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/DashboardView';
import { Footer } from './components/Footer';
import { FreelancerProfileModal } from './components/FreelancerProfileModal';
import { Header, type AppView } from './components/Header';
import { MarketplaceHome } from './components/MarketplaceHome';
import { PaymentModal, type PaymentModalContext } from './components/PaymentModal';
import { PostJobModal } from './components/PostJobModal';
import { ProposalModal } from './components/ProposalModal';
import { SearchDirectory } from './components/SearchDirectory';
import { api } from './lib/api';
import type {
  JobListing,
  MarketplaceOverviewResponse,
  NotificationItem,
  PublicUser,
} from './types';

function getInitialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('afro_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // Ignore storage issues
  }
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(getInitialTheme);
  const [view, setView] = useState<AppView>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');
  const [searchCountry, setSearchCountry] = useState('');

  const [overview, setOverview] = useState<MarketplaceOverviewResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [user, setUser] = useState<PublicUser | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [shortlistedIds, setShortlistedIds] = useState<string[]>([]);
  const [clientJobs, setClientJobs] = useState<JobListing[]>([]);

  const [authModal, setAuthModal] = useState<{
    mode: 'login' | 'register' | 'recover';
    role?: 'freelancer' | 'client';
  } | null>(null);
  const [selectedFreelancerId, setSelectedFreelancerId] = useState<string | null>(null);
  const [proposalJob, setProposalJob] = useState<JobListing | null>(null);
  const [postJobOpen, setPostJobOpen] = useState(false);
  const [paymentModal, setPaymentModal] = useState<PaymentModalContext | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('afro_theme', theme);
    } catch {
      // Ignore storage issues
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchOverview = useCallback(async () => {
    try {
      const data = await api.getOverview();
      setOverview(data);
      setOverviewError(null);
    } catch (err) {
      setOverviewError(err instanceof Error ? err.message : 'Unable to load marketplace.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchUserContext = useCallback(async (activeUser: PublicUser | null) => {
    if (!activeUser) {
      setNotifications([]);
      setSavedJobIds([]);
      setShortlistedIds([]);
      setClientJobs([]);
      return;
    }
    try {
      const notifRes = await api.getNotifications();
      setNotifications(notifRes.notifications);

      if (activeUser.role === 'freelancer') {
        const saved = await api.getSavedJobs();
        setSavedJobIds(saved.savedJobIds);
      } else if (activeUser.role === 'client') {
        const [short, jobs] = await Promise.all([api.getShortlist(), api.getClientJobs()]);
        setShortlistedIds(short.shortlistedIds);
        setClientJobs(jobs.jobs.filter((j) => j.status === 'open'));
      }
    } catch {
      // Ignore secondary context failures
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const params = new URLSearchParams(window.location.search);
    const paymentRef = params.get('payment_ref');
    const paymentCancelled = params.get('payment_cancelled');

    api
      .getMe()
      .then(async (res) => {
        setUser(res.user);
        fetchUserContext(res.user);

        if (res.user && paymentRef) {
          window.history.replaceState({}, '', window.location.pathname);
          try {
            const verifyRes = await api.verifyPayment(paymentRef);
            if (!verifyRes.pending) {
              if (verifyRes.user) setUser(verifyRes.user);
              showToast(`${verifyRes.transaction.gateway.toUpperCase()} payment verified (${paymentRef}).`);
              setView('dashboard');
              fetchOverview();
              fetchUserContext(verifyRes.user || res.user);
              setRefreshSignal((s) => s + 1);
            } else {
              showToast(verifyRes.message || 'Payment confirmation pending.');
            }
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Unable to verify returned payment.');
          }
        } else if (paymentCancelled) {
          window.history.replaceState({}, '', window.location.pathname);
          showToast(`Payment checkout cancelled (${paymentCancelled}).`);
        }
      })
      .catch(() => {
        setUser(null);
      });
  }, [fetchOverview, fetchUserContext, showToast]);

  // Live notification & alert polling while signed in
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      api
        .getNotifications()
        .then((res) => setNotifications(res.notifications))
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleNavigate = (nextView: AppView, anchorId?: string) => {
    setView(nextView);
    if (nextView === 'home' && anchorId) {
      setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSearch = (
    target: 'hire' | 'find-work',
    q: string,
    cat = '',
    country = ''
  ) => {
    setSearchQuery(q);
    setSearchCategory(cat);
    setSearchCountry(country);
    setView(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = (loggedInUser: PublicUser) => {
    setUser(loggedInUser);
    setAuthModal(null);
    fetchOverview();
    fetchUserContext(loggedInUser);
    setView('dashboard');
    showToast(`Signed in as ${loggedInUser.fullName}.`);
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    fetchUserContext(null);
    setView('home');
    showToast('Signed out.');
  };

  const handleToggleSaveJob = async (jobId: string) => {
    if (!user) {
      setAuthModal({ mode: 'register', role: 'freelancer' });
      return;
    }
    const isSaved = savedJobIds.includes(jobId);
    try {
      if (isSaved) {
        await api.unsaveJob(jobId);
        setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
        showToast('Removed from saved jobs.');
      } else {
        await api.saveJob(jobId);
        setSavedJobIds((prev) => [...prev, jobId]);
        showToast('Job saved to your dashboard.');
      }
      setRefreshSignal((s) => s + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const handleToggleShortlist = async (freelancerId: string) => {
    if (!user) {
      setAuthModal({ mode: 'register', role: 'client' });
      return;
    }
    const isShortlisted = shortlistedIds.includes(freelancerId);
    try {
      if (isShortlisted) {
        await api.removeShortlist(freelancerId);
        setShortlistedIds((prev) => prev.filter((id) => id !== freelancerId));
        showToast('Removed from shortlisted talent.');
      } else {
        await api.addShortlist(freelancerId);
        setShortlistedIds((prev) => [...prev, freelancerId]);
        showToast('Freelancer added to your shortlist.');
      }
      setRefreshSignal((s) => s + 1);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Action failed.');
    }
  };

  const handleApplyJob = (job: JobListing) => {
    if (!user) {
      setAuthModal({ mode: 'register', role: 'freelancer' });
      return;
    }
    if (user.role !== 'freelancer') {
      showToast('Sign in with a Freelancer account to submit job proposals.');
      return;
    }
    setProposalJob(job);
  };

  const handleOpenPostJob = () => {
    if (!user) {
      setAuthModal({ mode: 'register', role: 'client' });
      return;
    }
    if (user.role === 'freelancer') {
      showToast('Switch to a Client account to post job listings.');
      return;
    }
    setPostJobOpen(true);
  };

  const handleMarkNotificationsRead = async () => {
    if (!user) return;
    await api.markNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkSingleNotificationRead = async (id: string) => {
    if (!user) return;
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      // Ignore transient errors
    }
  };

  const handleClickNotification = async (notification: NotificationItem) => {
    if (!notification.read) {
      await handleMarkSingleNotificationRead(notification.id);
    }
    if (notification.type === 'alert') {
      handleNavigate('find-work');
    } else {
      handleNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0F1411] text-[#141715] dark:text-[#EDF2EE] transition-colors">
      <Header
        currentView={view}
        user={user}
        notifications={notifications}
        theme={theme}
        onToggleTheme={toggleTheme}
        onNavigate={handleNavigate}
        onOpenAuth={(mode, role) => setAuthModal({ mode, role })}
        onLogout={handleLogout}
        onMarkNotificationsRead={handleMarkNotificationsRead}
        onClickNotification={handleClickNotification}
      />

      {/* Non-blocking feedback toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 bg-[#101010] dark:bg-[#171D19] text-white px-4 py-3 rounded-xl border border-[#075B35] dark:border-[#34D399] shadow-lg text-xs font-medium flex items-center gap-3 max-w-sm"
        >
          <span>{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-white/70 hover:text-white font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1">
        {loadingOverview ? (
          <div className="max-w-[1280px] mx-auto px-4 py-20 text-center text-sm text-[#141715]/65 dark:text-[#B4C0B8]">
            Loading Afro-lancers.com marketplace...
          </div>
        ) : overviewError || !overview ? (
          <div className="max-w-[1280px] mx-auto px-4 py-20 text-center space-y-3">
            <p className="font-display text-lg font-bold">
              Unable to connect to marketplace service
            </p>
            <p className="text-sm text-[#141715]/70 dark:text-[#B4C0B8]">{overviewError}</p>
            <button
              type="button"
              onClick={fetchOverview}
              className="px-4 py-2 bg-[#075B35] text-white text-xs font-semibold rounded-lg"
            >
              Retry
            </button>
          </div>
        ) : view === 'home' ? (
          <MarketplaceHome
            stats={overview.stats}
            categories={overview.categories}
            featuredFreelancers={overview.featuredFreelancers}
            featuredJobs={overview.featuredJobs}
            testimonials={overview.testimonials}
            savedJobIds={savedJobIds}
            theme={theme}
            onSearch={handleSearch}
            onNavigate={handleNavigate}
            onSelectFreelancer={(id) => setSelectedFreelancerId(id)}
            onApplyJob={handleApplyJob}
            onToggleSaveJob={handleToggleSaveJob}
            onOpenAuth={(mode, role) => setAuthModal({ mode, role })}
            onOpenPostJob={handleOpenPostJob}
          />
        ) : view === 'hire' || view === 'find-work' ? (
          <SearchDirectory
            mode={view}
            initialQuery={searchQuery}
            initialCategory={searchCategory}
            initialCountry={searchCountry}
            savedJobIds={savedJobIds}
            shortlistedIds={shortlistedIds}
            currentUser={user}
            onModeChange={(nextMode) => setView(nextMode)}
            onSelectFreelancer={(id) => setSelectedFreelancerId(id)}
            onApplyJob={handleApplyJob}
            onToggleSaveJob={handleToggleSaveJob}
            onToggleShortlist={handleToggleShortlist}
            onUserUpdated={(u) => setUser(u)}
            onNotify={showToast}
          />
        ) : user ? (
          <DashboardView
            user={user}
            notifications={notifications}
            onUserUpdated={(u) => {
              setUser(u);
              fetchOverview();
            }}
            onOpenPostJob={handleOpenPostJob}
            onApplyJob={handleApplyJob}
            onSelectFreelancer={(id) => setSelectedFreelancerId(id)}
            onMarkNotificationRead={handleMarkSingleNotificationRead}
            onMarkAllNotificationsRead={handleMarkNotificationsRead}
            onOpenPayment={(ctx) => setPaymentModal(ctx)}
            onNotify={showToast}
            refreshSignal={refreshSignal}
          />
        ) : (
          <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
            <h1 className="font-display text-2xl font-bold">Sign In Required</h1>
            <p className="text-sm text-[#141715]/75 dark:text-[#B4C0B8]">
              Please sign in or register to access your workspace dashboard.
            </p>
            <button
              type="button"
              onClick={() => setAuthModal({ mode: 'login' })}
              className="px-5 py-2.5 bg-[#075B35] text-white text-sm font-semibold rounded-lg"
            >
              Sign In
            </button>
          </div>
        )}
      </div>

      <Footer
        onNavigate={handleNavigate}
        onOpenAuth={(mode, role) => setAuthModal({ mode, role })}
      />

      {/* Modals */}
      {authModal && (
        <AuthModal
          initialMode={authModal.mode}
          initialRole={authModal.role}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {selectedFreelancerId && (
        <FreelancerProfileModal
          freelancerId={selectedFreelancerId}
          currentUser={user}
          clientJobs={clientJobs}
          isShortlisted={shortlistedIds.includes(selectedFreelancerId)}
          onClose={() => setSelectedFreelancerId(null)}
          onToggleShortlist={handleToggleShortlist}
          onRequireAuth={(role) => {
            setSelectedFreelancerId(null);
            setAuthModal({ mode: 'register', role });
          }}
          onNotify={showToast}
        />
      )}

      {proposalJob && (
        <ProposalModal
          job={proposalJob}
          onClose={() => setProposalJob(null)}
          onSuccess={(msg) => {
            setProposalJob(null);
            showToast(msg);
            fetchOverview();
            fetchUserContext(user);
            setRefreshSignal((s) => s + 1);
          }}
        />
      )}

      {postJobOpen && (
        <PostJobModal
          onClose={() => setPostJobOpen(false)}
          onSuccess={(job, alertsDispatched) => {
            setPostJobOpen(false);
            showToast(
              alertsDispatched && alertsDispatched > 0
                ? `Published "${job.title}" and dispatched ${alertsDispatched} freelancer project alert${alertsDispatched === 1 ? '' : 's'}.`
                : `Published "${job.title}".`
            );
            fetchOverview();
            fetchUserContext(user);
            setRefreshSignal((s) => s + 1);
          }}
          onPublishFeatured={(job, priceUsd) => {
            setPostJobOpen(false);
            fetchOverview();
            fetchUserContext(user);
            setRefreshSignal((s) => s + 1);
            setPaymentModal({
              purpose: 'featured_job',
              title: `Promote Featured Job Brief`,
              subtitle: `Pin "${job.title}" to top directory search & alerts`,
              amountUsd: priceUsd,
              jobId: job.id,
            });
          }}
        />
      )}

      {paymentModal && (
        <PaymentModal
          context={paymentModal}
          userPhone={user?.phone}
          onClose={() => setPaymentModal(null)}
          onCompleted={(tx, updatedUser) => {
            setPaymentModal(null);
            if (updatedUser) {
              setUser(updatedUser);
            }
            showToast(
              `${tx.gateway.toUpperCase()} settlement verified (${tx.reference}).`
            );
            fetchOverview();
            fetchUserContext(updatedUser || user);
            setRefreshSignal((s) => s + 1);
          }}
        />
      )}
    </div>
  );
}
