import type {
  ActivityLogItem,
  AdCampaign,
  AiCareerRequest,
  AiCareerResponse,
  CategoryItem,
  EscrowContract,
  FreelancerEarningsResponse,
  InterviewBooking,
  JobInvitation,
  JobListing,
  MarketplaceOverviewResponse,
  MessageAttachment,
  MessageItem,
  NegotiationQuote,
  NotificationItem,
  PaymentGatewayId,
  PaymentGatewayInfo,
  PaymentTransaction,
  PlatformStats,
  ProjectAlertPreferences,
  ProjectTask,
  Proposal,
  PublicUser,
  RecommendedJob,
  ReportItem,
  ReviewItem,
  ServiceListing,
  ServiceOrder,
  SubscriptionSettings,
  SubscriptionTier,
  TalentHighlightsResponse,
  TeamMember,
} from '../types';

const TOKEN_KEY = 'afro_lancers_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  getOverview: () => apiFetch<MarketplaceOverviewResponse>('/api/marketplace/overview'),

  getTalentHighlights: () => apiFetch<TalentHighlightsResponse>('/api/talent/highlights'),

  getCategories: () => apiFetch<{ categories: CategoryItem[] }>('/api/categories'),

  searchFreelancers: (params: Record<string, string | number | boolean | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 0 && v !== false) qs.set(k, String(v));
    });
    return apiFetch<{ freelancers: PublicUser[] }>(`/api/freelancers?${qs.toString()}`);
  },

  getFreelancerById: (id: string) =>
    apiFetch<{ freelancer: PublicUser; reviews: ReviewItem[] }>(`/api/freelancers/${id}`),

  searchJobs: (params: Record<string, string | number | boolean | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 0 && v !== false) qs.set(k, String(v));
    });
    return apiFetch<{ jobs: JobListing[] }>(`/api/jobs?${qs.toString()}`);
  },

  getRecommendedJobs: () =>
    apiFetch<{ recommendedJobs: RecommendedJob[] }>('/api/jobs/recommended'),

  getMe: () => apiFetch<{ user: PublicUser | null }>('/api/auth/me'),

  login: async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: PublicUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(res.token);
    return res;
  },

  register: async (payload: Record<string, unknown>) => {
    const res = await apiFetch<{ token: string; user: PublicUser }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(res.token);
    return res;
  },

  logout: async () => {
    await apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    setAuthToken(null);
  },

  requestRecovery: (email: string) =>
    apiFetch<{ message: string; recoveryCodePreview: string }>('/api/auth/recover', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    apiFetch<{ ok: boolean; message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    }),

  updateProfile: (payload: Record<string, unknown>) =>
    apiFetch<{ user: PublicUser }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  uploadFile: (filename: string, dataUrl: string) =>
    apiFetch<MessageAttachment>('/api/uploads', {
      method: 'POST',
      body: JSON.stringify({ filename, dataUrl }),
    }),

  getOAuthUrl: (provider: 'google' | 'facebook', role: 'freelancer' | 'client') =>
    apiFetch<{ configured: boolean; url?: string; error?: string }>(
      `/api/auth/oauth/${provider}/url?role=${encodeURIComponent(role)}`
    ),

  getAlertMatches: () =>
    apiFetch<{ preferences: ProjectAlertPreferences; matchingJobs: JobListing[] }>(
      '/api/alerts/matches'
    ),

  updateAlertPreferences: (payload: ProjectAlertPreferences) =>
    apiFetch<{ preferences: ProjectAlertPreferences; user: PublicUser }>(
      '/api/alerts/preferences',
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    ),

  // Saved Jobs & Shortlists
  getSavedJobs: () => apiFetch<{ savedJobIds: string[]; jobs: JobListing[] }>('/api/saved-jobs'),
  saveJob: (jobId: string) => apiFetch<{ ok: boolean }>(`/api/saved-jobs/${jobId}`, { method: 'POST' }),
  unsaveJob: (jobId: string) =>
    apiFetch<{ ok: boolean }>(`/api/saved-jobs/${jobId}`, { method: 'DELETE' }),

  getShortlist: () =>
    apiFetch<{ shortlistedIds: string[]; freelancers: PublicUser[] }>('/api/shortlist'),
  addShortlist: (freelancerId: string) =>
    apiFetch<{ ok: boolean }>(`/api/shortlist/${freelancerId}`, { method: 'POST' }),
  removeShortlist: (freelancerId: string) =>
    apiFetch<{ ok: boolean }>(`/api/shortlist/${freelancerId}`, { method: 'DELETE' }),

  // Jobs & Proposals
  postJob: (payload: Record<string, unknown>) =>
    apiFetch<{ job: JobListing; alertsDispatched?: number }>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateJob: (id: string, payload: Record<string, unknown>) =>
    apiFetch<{ job: JobListing }>(`/api/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getClientJobs: () =>
    apiFetch<{ jobs: JobListing[]; proposals: Proposal[] }>('/api/client/jobs'),

  submitProposal: (payload: {
    jobId: string;
    coverLetter: string;
    proposedRate: number;
    timeline: string;
  }) =>
    apiFetch<{ proposal: Proposal }>('/api/proposals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMyProposalsAndInvitations: () =>
    apiFetch<{ proposals: Proposal[]; invitations: JobInvitation[] }>('/api/proposals/mine'),

  updateProposalStatus: (id: string, status: Proposal['status']) =>
    apiFetch<{ proposal: Proposal }>(`/api/proposals/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  inviteFreelancer: (payload: { freelancerId: string; jobId: string; message: string }) =>
    apiFetch<{ invitation: JobInvitation }>('/api/invitations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  respondInvitation: (id: string, status: 'accepted' | 'declined') =>
    apiFetch<{ invitation: JobInvitation }>(`/api/invitations/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  submitReview: (payload: {
    freelancerId: string;
    jobId: string;
    rating: number;
    comment: string;
  }) =>
    apiFetch<{ review: ReviewItem }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Messaging (with files & price negotiation quotes) & Notifications
  getMessages: () =>
    apiFetch<{ messages: MessageItem[]; contacts: PublicUser[] }>('/api/messages'),

  sendMessage: (payload: {
    recipientId: string;
    body?: string;
    jobId?: string;
    jobTitle?: string;
    attachment?: MessageAttachment;
    quote?: Omit<NegotiationQuote, 'status'>;
  }) =>
    apiFetch<{ message: MessageItem }>('/api/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  respondMessageQuote: (messageId: string, status: 'accepted' | 'declined') =>
    apiFetch<{ message: MessageItem }>(`/api/messages/${messageId}/quote`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  getNotifications: () => apiFetch<{ notifications: NotificationItem[] }>('/api/notifications'),
  markNotificationsRead: () =>
    apiFetch<{ ok: boolean }>('/api/notifications/read', { method: 'POST' }),
  markNotificationRead: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' }),

  submitReport: (payload: {
    targetType: 'user' | 'job';
    targetId: string;
    targetLabel: string;
    reason: string;
    details: string;
  }) =>
    apiFetch<{ report: ReportItem }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Payment Gateways, Milestones & Escrow Disputes
  getPaymentGateways: () =>
    apiFetch<{ gateways: PaymentGatewayInfo[]; subscriptionSettings: SubscriptionSettings }>(
      '/api/payments/gateways'
    ),

  getPaymentHistory: () =>
    apiFetch<{
      transactions: PaymentTransaction[];
      escrows: EscrowContract[];
      gateways: PaymentGatewayInfo[];
      subscriptionSettings: SubscriptionSettings;
    }>('/api/payments/history'),

  initiatePayment: (payload: {
    purpose: 'escrow' | 'subscription' | 'featured_job' | 'featured_profile' | 'service_purchase';
    gateway: PaymentGatewayId;
    paymentMethod?: string;
    currency?: string;
    phone?: string;
    proposalId?: string;
    jobId?: string;
    serviceId?: string;
    requirementsNote?: string;
    amountUsd?: number;
    targetTier?: SubscriptionTier;
    milestones?: Array<{ title: string; amountUsd: number; dueDate?: string }>;
  }) =>
    apiFetch<{ transaction: PaymentTransaction }>('/api/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  verifyPayment: (id: string) =>
    apiFetch<{
      pending?: boolean;
      gatewayStatus?: string;
      message?: string;
      transaction: PaymentTransaction;
      user?: PublicUser;
    }>(`/api/payments/${id}/verify`, { method: 'POST' }),

  releaseEscrow: (escrowId: string) =>
    apiFetch<{ escrow: EscrowContract }>(`/api/escrow/${escrowId}/release`, {
      method: 'POST',
    }),

  releaseEscrowMilestone: (escrowId: string, milestoneId: string) =>
    apiFetch<{ escrow: EscrowContract }>(
      `/api/escrow/${escrowId}/milestones/${milestoneId}/release`,
      { method: 'POST' }
    ),

  openEscrowDispute: (escrowId: string, reason: string, details: string) =>
    apiFetch<{ escrow: EscrowContract }>(`/api/escrow/${escrowId}/dispute`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    }),

  adminResolveEscrowDispute: (
    escrowId: string,
    outcome: 'release' | 'refund',
    resolutionNote: string
  ) =>
    apiFetch<{ escrow: EscrowContract }>(`/api/admin/escrows/${escrowId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ outcome, resolutionNote }),
    }),

  // Interviews, Project Tasks, Hire Again, Client Teams, Business Ads, Freelancer Earnings & AI Career Assistant
  getInterviews: () => apiFetch<{ interviews: InterviewBooking[] }>('/api/interviews'),

  bookInterview: (payload: {
    freelancerId: string;
    jobId?: string;
    jobTitle?: string;
    scheduledAt: string;
    durationMinutes: number;
    meetingNotes: string;
  }) =>
    apiFetch<{ interview: InterviewBooking }>('/api/interviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  respondInterview: (id: string, status: 'confirmed' | 'declined' | 'completed') =>
    apiFetch<{ interview: InterviewBooking }>(`/api/interviews/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  getProjectTasks: (proposalId: string) =>
    apiFetch<{ tasks: ProjectTask[] }>(`/api/projects/${proposalId}/tasks`),

  createProjectTask: (
    proposalId: string,
    payload: { title: string; assigneeName?: string; dueDate?: string }
  ) =>
    apiFetch<{ task: ProjectTask }>(`/api/projects/${proposalId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProjectTask: (taskId: string, status: ProjectTask['status']) =>
    apiFetch<{ task: ProjectTask }>(`/api/projects/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getPastFreelancers: () =>
    apiFetch<{
      pastFreelancers: Array<{
        freelancer: PublicUser;
        lastJobTitle: string;
        lastRate: number;
        completedDate: string;
      }>;
    }>('/api/client/past-freelancers'),

  getTeamMembers: () => apiFetch<{ teamMembers: TeamMember[] }>('/api/client/team'),

  addTeamMember: (payload: { name: string; email: string; role: TeamMember['role'] }) =>
    apiFetch<{ member: TeamMember; teamMembers: TeamMember[] }>('/api/client/team', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  removeTeamMember: (memberId: string) =>
    apiFetch<{ teamMembers: TeamMember[] }>(`/api/client/team/${memberId}`, {
      method: 'DELETE',
    }),

  getAds: () => apiFetch<{ ads: AdCampaign[] }>('/api/ads'),

  createAdCampaign: (payload: {
    title: string;
    summary: string;
    ctaLabel: string;
    targetUrl: string;
    category: string;
    placement: 'home' | 'directory';
    budgetUsd: number;
  }) =>
    apiFetch<{ ad: AdCampaign }>('/api/ads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  adminToggleAd: (id: string, status: 'active' | 'paused') =>
    apiFetch<{ ad: AdCampaign }>(`/api/admin/ads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getFreelancerEarnings: () => apiFetch<FreelancerEarningsResponse>('/api/freelancer/earnings'),

  runAiCareerAssistant: (payload: AiCareerRequest) =>
    apiFetch<AiCareerResponse>('/api/ai/career-assistant', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Services Marketplace (Max 5 per freelancer, 10% platform commission)
  getServices: (params: Record<string, string | number | undefined> = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== 0) qs.set(k, String(v));
    });
    return apiFetch<{ services: ServiceListing[]; commissionPercent: number }>(
      `/api/services?${qs.toString()}`
    );
  },

  getMyServices: () =>
    apiFetch<{
      services: ServiceListing[];
      maxListings: number;
      remainingSlots: number;
      commissionPercent: number;
    }>('/api/services/mine'),

  createService: (payload: {
    title: string;
    category: string;
    description: string;
    priceUsd: number;
    deliveryDays: number;
    deliveryTime?: string;
    coverImageUrl?: string;
    deliverables?: string[];
  }) =>
    apiFetch<{ service: ServiceListing; remainingSlots: number }>('/api/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateService: (
    id: string,
    payload: Partial<{
      title: string;
      category: string;
      description: string;
      priceUsd: number;
      deliveryDays: number;
      deliveryTime: string;
      coverImageUrl: string;
      deliverables: string[];
      status: 'active' | 'paused';
    }>
  ) =>
    apiFetch<{ service: ServiceListing }>(`/api/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteService: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/services/${id}`, { method: 'DELETE' }),

  getServiceOrders: () =>
    apiFetch<{ purchases: ServiceOrder[]; sales: ServiceOrder[]; commissionPercent: number }>(
      '/api/service-orders'
    ),

  updateServiceOrderStatus: (id: string, status: 'delivered' | 'completed') =>
    apiFetch<{ order: ServiceOrder }>(`/api/service-orders/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  // Admin
  getAdminOverview: () =>
    apiFetch<{
      stats: PlatformStats;
      users: PublicUser[];
      jobs: JobListing[];
      proposals: Proposal[];
      categories: CategoryItem[];
      reports: ReportItem[];
      activityLog: ActivityLogItem[];
      subscriptionSettings: SubscriptionSettings;
      gateways?: PaymentGatewayInfo[];
      transactions?: PaymentTransaction[];
      escrows?: EscrowContract[];
      services?: ServiceListing[];
      serviceOrders?: ServiceOrder[];
      ads?: AdCampaign[];
      interviews?: InterviewBooking[];
    }>('/api/admin/overview'),

  adminUpdateUser: (id: string, payload: Record<string, unknown>) =>
    apiFetch<{ user: PublicUser }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  adminUpdateJob: (id: string, payload: Record<string, unknown>) =>
    apiFetch<{ job: JobListing }>(`/api/admin/jobs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  adminAddCategory: (name: string, description: string) =>
    apiFetch<{ category: CategoryItem }>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),

  adminDeleteCategory: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/categories/${id}`, { method: 'DELETE' }),

  adminUpdateReport: (id: string, status: 'resolved' | 'dismissed') =>
    apiFetch<{ report: ReportItem }>(`/api/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  adminUpdateSubscriptions: (payload: SubscriptionSettings) =>
    apiFetch<{ subscriptionSettings: SubscriptionSettings }>('/api/admin/subscriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
