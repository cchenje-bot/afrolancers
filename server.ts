import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { AFRICAN_COUNTRIES, TALENT_MAP_HUBS } from './src/lib/constants.ts';
import {
  UPLOADS_DIR,
  computeCategoriesWithCounts,
  computePlatformStats,
  dispatchProjectAlertsForJob,
  getDb,
  hashPassword,
  recalculateFreelancerStats,
  sanitizeUser,
  saveDb,
  verifyPassword,
} from './src/server/store.ts';
import type {
  AiCareerMode,
  AvailabilityStatus,
  EscrowContract,
  EscrowMilestone,
  ExperienceLevel,
  JobType,
  PaymentGatewayId,
  PaymentGatewayInfo,
  PaymentTransaction,
  PortfolioItem,
  ProjectAlertPreferences,
  ServiceListing,
  ServiceOrder,
  StoredUser,
  SubscriptionTier,
} from './src/types.ts';

dotenv.config();

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(process.cwd() + '_afrolancers_2026').digest('hex');

interface SessionPayload {
  userId: string;
  role: StoredUser['role'];
  exp: number;
}

function signToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as SessionPayload;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const result: Record<string, string> = {};
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1).trim());
      result[k] = v;
    }
  }
  return result;
}

interface AuthedRequest extends Request {
  currentUser?: StoredUser;
}

function authenticateOptional(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  let rawToken: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.slice(7).trim();
  } else {
    const cookies = parseCookies(req.headers.cookie);
    rawToken = cookies.afro_session;
  }
  if (rawToken) {
    const verified = verifyToken(rawToken);
    if (verified) {
      const db = getDb();
      const user = db.users.find((u) => u.id === verified.userId && u.status === 'active');
      if (user) {
        req.currentUser = user;
      }
    }
  }
  next();
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (!req.currentUser) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
}

function requireRole(...roles: StoredUser['role'][]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.currentUser) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.currentUser.role)) {
      res.status(403).json({ error: `Access restricted to ${roles.join(' or ')} accounts.` });
      return;
    }
    next();
  };
}

function logActivity(actorName: string, action: string, target: string): void {
  const db = getDb();
  db.activityLog.unshift({
    id: `act-${crypto.randomUUID().slice(0, 8)}`,
    actorName,
    action,
    target,
    timestamp: new Date().toISOString(),
  });
  if (db.activityLog.length > 100) {
    db.activityLog = db.activityLog.slice(0, 100);
  }
}

function createNotification(
  userId: string,
  title: string,
  body: string,
  type:
    | 'alert'
    | 'proposal'
    | 'invitation'
    | 'message'
    | 'moderation'
    | 'review'
    | 'payment'
    | 'interview'
    | 'system',
  targetView = 'dashboard',
  jobId?: string
): void {
  const db = getDb();
  db.notifications.unshift({
    id: `notif-${crypto.randomUUID().slice(0, 8)}`,
    userId,
    title,
    body,
    type,
    read: false,
    targetView,
    jobId,
    createdAt: new Date().toISOString(),
  });
}

function getPaymentGatewaysInfo(): PaymentGatewayInfo[] {
  const paynowConfigured = Boolean(
    (process.env.PAYNOW_INTEGRATION_ID || '').trim() &&
      (process.env.PAYNOW_INTEGRATION_KEY || '').trim()
  );
  const paystackConfigured = Boolean((process.env.PAYSTACK_SECRET_KEY || '').trim());
  const flutterwaveConfigured = Boolean((process.env.FLUTTERWAVE_SECRET_KEY || '').trim());
  const stripeConfigured = Boolean((process.env.STRIPE_SECRET_KEY || '').trim());

  return [
    {
      id: 'paynow',
      name: 'Paynow',
      region: 'Zimbabwe & Southern Africa',
      description:
        'Instant EcoCash, OneMoney, InnBucks, Zimswitch, and Visa/Mastercard settlements.',
      methods: ['EcoCash', 'OneMoney', 'InnBucks', 'Visa / Mastercard'],
      currencies: ['USD', 'ZiG'],
      configured: paynowConfigured,
      recommendedFor: 'Zimbabwe & SADC settlements',
    },
    {
      id: 'paystack',
      name: 'Paystack',
      region: 'West & East Africa',
      description: 'Cards, mobile money, EFT, and bank transfers across Nigeria, Ghana, Kenya & SA.',
      methods: ['Card', 'Bank Transfer', 'Mobile Money'],
      currencies: ['USD', 'NGN', 'GHS', 'KES', 'ZAR'],
      configured: paystackConfigured,
      recommendedFor: 'Pan-African cards & bank payouts',
    },
    {
      id: 'flutterwave',
      name: 'Flutterwave',
      region: '30+ African Countries',
      description: 'Cross-border African wallets including M-Pesa, Airtel Money, MTN MoMo, and cards.',
      methods: ['M-Pesa', 'MTN MoMo', 'Visa / Mastercard'],
      currencies: ['USD', 'KES', 'NGN', 'UGX', 'RWF', 'ZAR'],
      configured: flutterwaveConfigured,
      recommendedFor: 'East & Pan-African mobile money',
    },
    {
      id: 'stripe',
      name: 'Stripe',
      region: 'Global International Clients',
      description: 'International corporate Visa, Mastercard, Amex, and global enterprise cards.',
      methods: ['International Card', 'Apple Pay / Link'],
      currencies: ['USD', 'EUR', 'GBP'],
      configured: stripeConfigured,
      recommendedFor: 'Global enterprise clients',
    },
  ];
}

function computePaynowHash(values: string[], integrationKey: string): string {
  const payload = `${values.join('')}${integrationKey}`;
  return crypto.createHash('sha512').update(payload).digest('hex').toUpperCase();
}

function getOAuthBaseUrl(req: Request): string {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return envUrl;
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.get('host') || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

function signOAuthState(payload: { provider: 'google' | 'facebook'; role: 'freelancer' | 'client'; exp: number }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyOAuthState(
  state: string
): { provider: 'google' | 'facebook'; role: 'freelancer' | 'client'; exp: number } | null {
  const parts = state.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const sBuf = Buffer.from(sig);
  const eBuf = Buffer.from(expected);
  if (sBuf.length !== eBuf.length || !crypto.timingSafeEqual(sBuf, eBuf)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8')) as {
      provider: 'google' | 'facebook';
      role: 'freelancer' | 'client';
      exp: number;
    };
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true }));
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use('/uploads', express.static(UPLOADS_DIR));
  app.use(authenticateOptional);

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Upload helper for short video intros & message file attachments
  app.post('/api/uploads', requireAuth, (req: AuthedRequest, res) => {
    const b = req.body || {};
    const filenameRaw = String(b.filename || 'attachment.bin');
    const dataUrl = String(b.dataUrl || '');
    if (!dataUrl || !dataUrl.includes(';base64,')) {
      res.status(400).json({ error: 'Valid base64 file payload is required.' });
      return;
    }
    const [header, base64Body] = dataUrl.split(';base64,');
    const mimeType = header.replace('data:', '').trim() || 'application/octet-stream';
    const extMatch = filenameRaw.match(/\.[a-zA-Z0-9]{1,8}$/);
    const fallbackExt = mimeType.includes('mp4')
      ? '.mp4'
      : mimeType.includes('webm')
        ? '.webm'
        : mimeType.includes('pdf')
          ? '.pdf'
          : mimeType.includes('png')
            ? '.png'
            : mimeType.includes('jpeg') || mimeType.includes('jpg')
              ? '.jpg'
              : '.bin';
    const ext = extMatch ? extMatch[0].toLowerCase() : fallbackExt;
    const buffer = Buffer.from(base64Body, 'base64');
    if (buffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'File exceeds 10MB upload limit.' });
      return;
    }
    const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, safeName), buffer);
    res.status(201).json({
      url: `/uploads/${safeName}`,
      name: filenameRaw,
      mimeType,
      sizeBytes: buffer.length,
    });
  });

  // Marketplace Overview (Stats, Categories, Featured Freelancers, Featured Jobs, Testimonials)
  app.get('/api/marketplace/overview', (_req, res) => {
    const db = getDb();
    const categories = computeCategoriesWithCounts(db);
    const stats = computePlatformStats(db);
    const featuredFreelancers = db.users
      .filter((u) => u.role === 'freelancer' && u.status === 'active')
      .sort((a, b) => {
        const scoreA =
          (a.freelancerOfTheMonth ? 10 : 0) +
          (a.isFeaturedProfile ? 5 : 0) +
          (a.subscriptionTier === 'pro' ? 3 : 0) +
          (a.ratingAverage || 4);
        const scoreB =
          (b.freelancerOfTheMonth ? 10 : 0) +
          (b.isFeaturedProfile ? 5 : 0) +
          (b.subscriptionTier === 'pro' ? 3 : 0) +
          (b.ratingAverage || 4);
        return scoreB - scoreA;
      })
      .slice(0, 8)
      .map((u) => sanitizeUser(u, false));

    const featuredJobs = db.jobs
      .filter((j) => j.status === 'open')
      .sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)))
      .slice(0, 6)
      .map((j) => ({
        ...j,
        applicationCount: db.proposals.filter((p) => p.jobId === j.id).length,
      }));

    const featuredServices = db.services
      .filter((s) => s.status === 'active')
      .sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0))
      .slice(0, 6);

    res.json({
      stats,
      categories,
      featuredFreelancers,
      featuredJobs,
      featuredServices,
      serviceCommissionPercent: db.subscriptionSettings.serviceCommissionPercent ?? 10,
      testimonials: db.testimonials,
    });
  });

  // Services Marketplace (Freelancer Fixed-Price Service Packages: max 5 per freelancer, 10% platform commission)
  app.get('/api/services', (req, res) => {
    const db = getDb();
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const maxPrice = Number(req.query.maxPrice || 0);
    const maxDays = Number(req.query.maxDays || 0);
    const sellerId = String(req.query.sellerId || '').trim();
    const sort = String(req.query.sort || 'popular');

    const list = db.services
      .filter((s) => s.status === 'active')
      .filter((s) => {
        if (q) {
          const hay = [
            s.title,
            s.description,
            s.category,
            s.sellerName,
            s.sellerCountry,
            ...(s.deliverables || []),
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (category && s.category !== category) return false;
        if (sellerId && s.sellerId !== sellerId) return false;
        if (maxPrice > 0 && s.priceUsd > maxPrice) return false;
        if (maxDays > 0 && s.deliveryDays > maxDays) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === 'price_asc') return a.priceUsd - b.priceUsd;
        if (sort === 'price_desc') return b.priceUsd - a.priceUsd;
        if (sort === 'fastest') return a.deliveryDays - b.deliveryDays;
        return (b.salesCount || 0) - (a.salesCount || 0);
      });

    res.json({
      services: list,
      commissionPercent: db.subscriptionSettings.serviceCommissionPercent ?? 10,
    });
  });

  app.get('/api/services/mine', requireRole('freelancer', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const myServices = db.services.filter((s) => s.sellerId === req.currentUser!.id);
    res.json({
      services: myServices,
      maxListings: 5,
      remainingSlots: Math.max(0, 5 - myServices.length),
      commissionPercent: db.subscriptionSettings.serviceCommissionPercent ?? 10,
    });
  });

  app.post('/api/services', requireRole('freelancer', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const myCount = db.services.filter((s) => s.sellerId === req.currentUser!.id).length;
    if (myCount >= 5 && req.currentUser!.role !== 'admin') {
      res.status(400).json({
        error:
          'Maximum of 5 service listings per freelancer reached. Delete or edit an existing listing to publish a new one.',
      });
      return;
    }

    const b = req.body || {};
    const title = String(b.title || '').trim();
    const category = String(b.category || req.currentUser!.category || 'IT & Software Development').trim();
    const description = String(b.description || '').trim();
    const priceUsd = Number(b.priceUsd || 0);
    const deliveryDays = Math.max(1, Math.min(180, Math.round(Number(b.deliveryDays || 5))));
    const deliveryTime =
      String(b.deliveryTime || '').trim() ||
      `${deliveryDays} ${deliveryDays === 1 ? 'day' : 'days'}`;
    const coverImageUrl = String(b.coverImageUrl || '').trim();
    const deliverables = Array.isArray(b.deliverables)
      ? b.deliverables.map((d: unknown) => String(d).trim()).filter(Boolean)
      : String(b.deliverables || '')
          .split('\n')
          .map((d) => d.trim())
          .filter(Boolean);

    if (!title || title.length < 4) {
      res.status(400).json({ error: 'Service title must be at least 4 characters.' });
      return;
    }
    if (!description || description.length < 15) {
      res.status(400).json({ error: 'Service description must be at least 15 characters.' });
      return;
    }
    if (!Number.isFinite(priceUsd) || priceUsd < 5) {
      res.status(400).json({ error: 'Service price must be at least $5 USD.' });
      return;
    }

    const service: ServiceListing = {
      id: `svc-${crypto.randomUUID().slice(0, 8)}`,
      sellerId: req.currentUser!.id,
      sellerName: req.currentUser!.fullName,
      sellerTitle: req.currentUser!.title || 'African Specialist',
      sellerPhoto:
        req.currentUser!.photoUrl || '/src/assets/images/portrait_male_engineer_1794858345961.jpg',
      sellerCountry: req.currentUser!.country,
      sellerVerified: Boolean(req.currentUser!.identityVerified || req.currentUser!.verifiedProfile),
      title,
      category,
      description,
      priceUsd: Number(priceUsd.toFixed(2)),
      deliveryDays,
      deliveryTime,
      coverImageUrl:
        coverImageUrl || '/src/assets/images/service_software_architecture_1794870728095.jpg',
      deliverables,
      salesCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    db.services.unshift(service);
    logActivity(req.currentUser!.fullName, 'Published marketplace service', `${title} ($${service.priceUsd})`);
    saveDb(db);
    res.status(201).json({
      service,
      remainingSlots: Math.max(0, 5 - (myCount + 1)),
    });
  });

  app.patch('/api/services/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const service = db.services.find((s) => s.id === req.params.id);
    if (!service) {
      res.status(404).json({ error: 'Service listing not found.' });
      return;
    }
    if (req.currentUser!.role !== 'admin' && service.sellerId !== req.currentUser!.id) {
      res.status(403).json({ error: 'You may only edit your own service listings.' });
      return;
    }
    const b = req.body || {};
    if (b.title !== undefined) service.title = String(b.title).trim();
    if (b.category !== undefined) service.category = String(b.category).trim();
    if (b.description !== undefined) service.description = String(b.description).trim();
    if (b.priceUsd !== undefined && Number(b.priceUsd) >= 5) {
      service.priceUsd = Number(Number(b.priceUsd).toFixed(2));
    }
    if (b.deliveryDays !== undefined) {
      service.deliveryDays = Math.max(1, Math.min(180, Math.round(Number(b.deliveryDays))));
      service.deliveryTime =
        String(b.deliveryTime || '').trim() ||
        `${service.deliveryDays} ${service.deliveryDays === 1 ? 'day' : 'days'}`;
    } else if (b.deliveryTime !== undefined) {
      service.deliveryTime = String(b.deliveryTime).trim();
    }
    if (b.coverImageUrl !== undefined) service.coverImageUrl = String(b.coverImageUrl).trim();
    if (b.status === 'active' || b.status === 'paused') service.status = b.status;
    if (Array.isArray(b.deliverables)) {
      service.deliverables = b.deliverables.map((d: unknown) => String(d).trim()).filter(Boolean);
    }

    saveDb(db);
    res.json({ service });
  });

  app.delete('/api/services/:id', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const service = db.services.find((s) => s.id === req.params.id);
    if (!service) {
      res.status(404).json({ error: 'Service listing not found.' });
      return;
    }
    if (req.currentUser!.role !== 'admin' && service.sellerId !== req.currentUser!.id) {
      res.status(403).json({ error: 'You may only delete your own service listings.' });
      return;
    }
    db.services = db.services.filter((s) => s.id !== service.id);
    logActivity(req.currentUser!.fullName, 'Deleted service listing', service.title);
    saveDb(db);
    res.json({ ok: true });
  });

  app.get('/api/service-orders', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const uid = req.currentUser!.id;
    const isAdmin = req.currentUser!.role === 'admin';
    const purchases = db.serviceOrders.filter((o) => isAdmin || o.buyerId === uid);
    const sales = db.serviceOrders.filter((o) => isAdmin || o.sellerId === uid);
    res.json({
      purchases,
      sales,
      commissionPercent: db.subscriptionSettings.serviceCommissionPercent ?? 10,
    });
  });

  app.post('/api/service-orders/:id/status', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const order = db.serviceOrders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Service order not found.' });
      return;
    }
    const nextStatus = req.body?.status === 'delivered' ? 'delivered' : 'completed';
    if (nextStatus === 'delivered') {
      if (order.sellerId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
        res.status(403).json({ error: 'Only the freelancer seller can mark delivery.' });
        return;
      }
      order.status = 'delivered';
      createNotification(
        order.buyerId,
        'Service Delivery Ready for Review',
        `${order.sellerName} marked "${order.serviceTitle}" as delivered. Review and release payout.`,
        'payment',
        'dashboard'
      );
    } else {
      if (order.buyerId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
        res.status(403).json({ error: 'Only the buyer can approve and release service payout.' });
        return;
      }
      order.status = 'completed';
      order.completedAt = new Date().toISOString();
      createNotification(
        order.sellerId,
        'Service Payout Released',
        `${order.buyerName} approved "${order.serviceTitle}". Net $${order.sellerNetUsd.toLocaleString()} credited (after ${order.commissionPercent}% marketplace commission).`,
        'payment',
        'dashboard'
      );
    }
    logActivity(req.currentUser!.fullName, `Service order marked ${order.status}`, order.serviceTitle);
    saveDb(db);
    res.json({ order });
  });

  // Talent Highlights: Freelancer of the Month, Top 10, African + Global Talent Map, Active Ads
  app.get('/api/talent/highlights', (_req, res) => {
    const db = getDb();
    const activeFreelancers = db.users.filter((u) => u.role === 'freelancer' && u.status === 'active');
    const ranked = [...activeFreelancers].sort((a, b) => {
      const rankScore = (u: StoredUser) =>
        (u.freelancerOfTheMonth ? 100 : 0) +
        (u.completedProjectsCount || 0) * 15 +
        (u.ratingAverage || 4.2) * 10 +
        (u.activityStreakWeeks || 0) * 2 +
        (u.identityVerified ? 8 : 0) +
        (u.skillsVerified ? 8 : 0) +
        (u.subscriptionTier === 'pro' ? 5 : 0);
      return rankScore(b) - rankScore(a);
    });

    const freelancerOfTheMonth =
      ranked.find((u) => u.freelancerOfTheMonth) || ranked[0] || null;
    const top10Freelancers = ranked.slice(0, 10).map((u) => sanitizeUser(u, false));

    const openJobs = db.jobs.filter((j) => j.status === 'open');
    const mapHubs = TALENT_MAP_HUBS.map((hub) => {
      const countryTalent = activeFreelancers.filter(
        (u) => u.country.toLowerCase() === hub.country.toLowerCase()
      );
      const countryJobs = openJobs.filter(
        (j) => j.country.toLowerCase() === hub.country.toLowerCase()
      );
      const cats = Array.from(
        new Set([
          ...countryTalent.map((u) => u.category).filter(Boolean),
          ...countryJobs.map((j) => j.category).filter(Boolean),
        ])
      ).slice(0, 3) as string[];

      return {
        ...hub,
        freelancersCount: countryTalent.length,
        openJobsCount: countryJobs.length,
        topCategories: cats,
      };
    });

    const ads = db.ads.filter((ad) => ad.status === 'active');

    res.json({
      freelancerOfTheMonth: freelancerOfTheMonth ? sanitizeUser(freelancerOfTheMonth, false) : null,
      top10Freelancers,
      mapHubs,
      ads,
    });
  });

  // Categories
  app.get('/api/categories', (_req, res) => {
    const db = getDb();
    res.json({ categories: computeCategoriesWithCounts(db) });
  });

  // Freelancer Search & Work From Anywhere Filter
  app.get('/api/freelancers', (req, res) => {
    const db = getDb();
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const country = String(req.query.country || '').trim();
    const city = String(req.query.city || '').trim().toLowerCase();
    const language = String(req.query.language || '').trim().toLowerCase();
    const timezone = String(req.query.timezone || '').trim().toLowerCase();
    const regionScope = String(req.query.regionScope || 'all').trim().toLowerCase();
    const verifiedOnly = req.query.verifiedOnly === 'true';
    const experience = String(req.query.experience || '').trim();
    const availability = String(req.query.availability || '').trim();
    const minRate = Number(req.query.minRate || 0);
    const maxRate = Number(req.query.maxRate || 0);
    const minRating = Number(req.query.minRating || 0);
    const skill = String(req.query.skill || '').trim().toLowerCase();

    const africanSet = new Set(AFRICAN_COUNTRIES.map((c) => c.toLowerCase()));

    const list = db.users
      .filter((u) => u.role === 'freelancer' && u.status === 'active')
      .filter((u) => {
        if (q) {
          const hay = [
            u.fullName,
            u.title || '',
            u.category || '',
            u.bio || '',
            u.country,
            u.city || '',
            ...(u.languages || []),
            ...(u.skills || []),
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (category && u.category !== category) return false;
        if (country && u.country.toLowerCase() !== country.toLowerCase()) return false;
        if (city && !(u.city || '').toLowerCase().includes(city)) return false;
        if (language) {
          const hasLang = (u.languages || []).some((l) => l.toLowerCase().includes(language));
          if (!hasLang) return false;
        }
        if (timezone && !(u.timezone || '').toLowerCase().includes(timezone)) return false;
        if (regionScope === 'africa' && !africanSet.has(u.country.toLowerCase())) return false;
        if (regionScope === 'global' && africanSet.has(u.country.toLowerCase())) return false;
        if (verifiedOnly && !(u.identityVerified || u.verifiedProfile || u.skillsVerified)) {
          return false;
        }
        if (experience && u.experienceLevel !== experience) return false;
        if (availability && u.availability !== availability) return false;
        if (minRate > 0 && (u.hourlyRate || 0) < minRate) return false;
        if (maxRate > 0 && (u.hourlyRate || 0) > maxRate) return false;
        if (minRating > 0 && (u.ratingAverage || 0) < minRating) return false;
        if (skill) {
          const hasSkill = (u.skills || []).some((s) => s.toLowerCase().includes(skill));
          if (!hasSkill) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const boostA =
          (a.isFeaturedProfile ? 40 : 0) +
          (a.freelancerOfTheMonth ? 25 : 0) +
          (a.subscriptionTier === 'pro' ? 15 : 0) +
          (a.identityVerified ? 5 : 0);
        const boostB =
          (b.isFeaturedProfile ? 40 : 0) +
          (b.freelancerOfTheMonth ? 25 : 0) +
          (b.subscriptionTier === 'pro' ? 15 : 0) +
          (b.identityVerified ? 5 : 0);
        return boostB - boostA;
      })
      .map((u) => sanitizeUser(u, false));

    res.json({ freelancers: list });
  });

  app.get('/api/freelancers/:id', (req, res) => {
    const db = getDb();
    const user = db.users.find(
      (u) => u.id === req.params.id && u.role === 'freelancer' && u.status === 'active'
    );
    if (!user) {
      res.status(404).json({ error: 'Freelancer profile not found.' });
      return;
    }
    const reviews = db.reviews.filter((r) => r.freelancerId === user.id);
    res.json({
      freelancer: sanitizeUser(user, false),
      reviews,
    });
  });

  // Smart Job Matching (skills, experience, location, portfolio)
  app.get('/api/jobs/recommended', requireRole('freelancer'), (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const userSkills = (user.skills || []).map((s) => s.toLowerCase());
    const portfolioText = (user.portfolioItems || [])
      .map((p) => `${p.title} ${p.summary} ${p.category}`)
      .join(' ')
      .toLowerCase();
    const expOrder: Record<string, number> = { Entry: 1, Intermediate: 2, Senior: 3, Executive: 4 };
    const userExp = expOrder[user.experienceLevel || 'Intermediate'] || 2;

    const recommendedJobs = db.jobs
      .filter((j) => j.status === 'open')
      .map((job) => {
        let score = 20;
        const reasons: string[] = [];

        if (user.category && job.category === user.category) {
          score += 28;
          reasons.push(`Category match: ${job.category}`);
        }

        const matchedSkills = job.skillsRequired.filter((reqSkill) =>
          userSkills.some(
            (us) =>
              us.includes(reqSkill.toLowerCase()) || reqSkill.toLowerCase().includes(us)
          )
        );
        if (matchedSkills.length > 0) {
          score += Math.min(30, matchedSkills.length * 12);
          reasons.push(`Skills: ${matchedSkills.slice(0, 3).join(', ')}`);
        }

        const jobExp = expOrder[job.experienceLevel] || 2;
        if (userExp >= jobExp) {
          score += 10;
          reasons.push(`${job.experienceLevel} level fit`);
        }

        if (
          job.remoteStatus === 'Remote' ||
          job.country.toLowerCase() === user.country.toLowerCase()
        ) {
          score += 6;
          reasons.push(
            job.country.toLowerCase() === user.country.toLowerCase()
              ? `Location: ${job.country}`
              : 'Remote eligible'
          );
        }

        const portfolioTokens = job.skillsRequired.filter((s) =>
          portfolioText.includes(s.toLowerCase())
        );
        if (portfolioTokens.length > 0 || (user.portfolioItems || []).some((p) => p.category === job.category)) {
          score += 6;
          reasons.push('Aligned with your portfolio');
        }

        return {
          ...job,
          applicationCount: db.proposals.filter((p) => p.jobId === job.id).length,
          matchScore: Math.min(99, score),
          matchReasons: reasons.length > 0 ? reasons : ['Open marketplace opportunity'],
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    res.json({ recommendedJobs });
  });

  // Jobs Search & Filter
  app.get('/api/jobs', (req, res) => {
    const db = getDb();
    const q = String(req.query.q || '').trim().toLowerCase();
    const category = String(req.query.category || '').trim();
    const country = String(req.query.country || '').trim();
    const jobType = String(req.query.jobType || '').trim();
    const remoteOnly = req.query.remoteOnly === 'true';
    const minBudget = Number(req.query.minBudget || 0);
    const maxBudget = Number(req.query.maxBudget || 0);
    const skill = String(req.query.skill || '').trim().toLowerCase();

    const list = db.jobs
      .filter((j) => j.status === 'open')
      .filter((j) => {
        if (q) {
          const hay = [
            j.title,
            j.description,
            j.category,
            j.companyName,
            j.country,
            ...j.skillsRequired,
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        if (category && j.category !== category) return false;
        if (country && j.country.toLowerCase() !== country.toLowerCase()) return false;
        if (jobType && j.jobType !== jobType) return false;
        if (remoteOnly && j.remoteStatus !== 'Remote') return false;
        if (minBudget > 0 && j.budgetMax < minBudget) return false;
        if (maxBudget > 0 && j.budgetMin > maxBudget) return false;
        if (skill) {
          const hasSkill = j.skillsRequired.some((s) => s.toLowerCase().includes(skill));
          if (!hasSkill) return false;
        }
        return true;
      })
      .sort((a, b) => Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)))
      .map((j) => ({
        ...j,
        applicationCount: db.proposals.filter((p) => p.jobId === j.id).length,
      }));

    res.json({ jobs: list });
  });

  // Auth: Register (Freelancer or Client)
  app.post('/api/auth/register', (req, res) => {
    const db = getDb();
    const body = req.body || {};
    const role = body.role === 'client' ? 'client' : 'freelancer';
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const country = String(body.country || '').trim();
    const password = String(body.password || '');

    if (!fullName || !email || !phone || !country || password.length < 6) {
      res.status(400).json({
        error: 'Full name, valid email, phone number, country, and password (min 6 chars) are required.',
      });
      return;
    }

    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with this email address already exists.' });
      return;
    }

    const id = `usr-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    let newUser: StoredUser;
    if (role === 'freelancer') {
      const category = String(body.category || 'IT & Software Development').trim();
      const skillsRaw = Array.isArray(body.skills)
        ? body.skills
        : String(body.skills || '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      const experienceLevel = (body.experienceLevel || 'Intermediate') as ExperienceLevel;
      const hourlyRate = Math.max(5, Number(body.hourlyRate || 35));
      const bio = String(body.bio || '').trim();
      const title = String(body.title || category).trim();
      const portfolioUrl = String(body.portfolioUrl || '').trim();
      const photoUrl = String(body.photoUrl || '').trim();
      const portfolioTitle = String(body.portfolioTitle || '').trim();
      const portfolioItems: PortfolioItem[] = portfolioTitle
        ? [
            {
              id: `pf-${crypto.randomUUID().slice(0, 6)}`,
              title: portfolioTitle,
              summary: String(body.portfolioSummary || 'Featured portfolio deliverable.'),
              category,
              link: portfolioUrl || undefined,
            },
          ]
        : [];

      newUser = {
        id,
        fullName,
        email,
        phone,
        country,
        role: 'freelancer',
        status: 'active',
        subscriptionTier: 'standard',
        createdAt: now,
        verifiedProfile: false,
        title,
        category,
        skills: skillsRaw.length > 0 ? skillsRaw.slice(0, 12) : [category],
        experienceLevel,
        yearsExperience: Number(body.yearsExperience || 3),
        photoUrl: photoUrl || undefined,
        portfolioUrl: portfolioUrl || undefined,
        portfolioItems,
        bio: bio || `${title} based in ${country}.`,
        hourlyRate,
        pricingModel: (body.pricingModel || 'both') as 'hourly' | 'fixed' | 'both',
        availability: 'Available Now',
        completedProjectsCount: 0,
        ratingAverage: null,
        reviewCount: 0,
        authProvider: 'email',
        projectAlerts: {
          enabled: body.enableProjectAlerts !== false,
          categories: [category],
          keywords: skillsRaw.length > 0 ? skillsRaw.slice(0, 6) : [],
          minBudget: 0,
          remoteOnly: false,
        },
        passwordHash: hashPassword(password),
      };
    } else {
      const companyName = String(body.companyName || '').trim();
      const businessCategory = String(body.businessCategory || 'IT & Software Development').trim();
      if (!companyName) {
        res.status(400).json({ error: 'Company or organization name is required for client accounts.' });
        return;
      }
      newUser = {
        id,
        fullName,
        email,
        phone,
        country,
        role: 'client',
        status: 'active',
        subscriptionTier: 'standard',
        createdAt: now,
        verifiedProfile: false,
        authProvider: 'email',
        companyName,
        businessCategory,
        companyWebsite: String(body.companyWebsite || '').trim() || undefined,
        bio: String(body.bio || '').trim() || `${companyName} — ${businessCategory}`,
        passwordHash: hashPassword(password),
      };
    }

    db.users.push(newUser);
    createNotification(
      newUser.id,
      'Welcome to Afro-lancers.com',
      role === 'freelancer'
        ? 'Your freelancer profile is live. Project alerts are active for your selected category and skills.'
        : 'Your client workspace is ready. Post a project or shortlist African professionals.',
      'system',
      'dashboard'
    );
    logActivity(fullName, `Registered new ${role} account`, `${country}`);
    saveDb(db);

    const token = signToken({
      userId: newUser.id,
      role: newUser.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    res.cookie('afro_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(201).json({
      token,
      user: sanitizeUser(newUser, true),
    });
  });

  // OAuth 2.0 Popup Flow: Google & Facebook
  app.get('/api/auth/oauth/:provider/url', (req, res) => {
    const provider = req.params.provider === 'facebook' ? 'facebook' : 'google';
    const role = req.query.role === 'client' ? 'client' : 'freelancer';
    const baseUrl = getOAuthBaseUrl(req);
    const state = signOAuthState({ provider, role, exp: Date.now() + 1000 * 60 * 10 });

    if (provider === 'google') {
      const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
      const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
      if (!clientId || !clientSecret) {
        res.status(503).json({
          configured: false,
          provider: 'google',
          error:
            'Google Sign-In requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment secrets.',
        });
        return;
      }
      const redirectUri = `${baseUrl}/api/auth/oauth/google/callback`;
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account',
        state,
      });
      res.json({ configured: true, url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
      return;
    }

    const fbAppId = (process.env.FACEBOOK_APP_ID || '').trim();
    const fbAppSecret = (process.env.FACEBOOK_APP_SECRET || '').trim();
    if (!fbAppId || !fbAppSecret) {
      res.status(503).json({
        configured: false,
        provider: 'facebook',
        error:
          'Facebook Sign-In requires FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in environment secrets.',
      });
      return;
    }
    const redirectUri = `${baseUrl}/api/auth/oauth/facebook/callback`;
    const params = new URLSearchParams({
      client_id: fbAppId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email,public_profile',
      state,
    });
    res.json({ configured: true, url: `https://www.facebook.com/v19.0/dialog/oauth?${params}` });
  });

  const handleOAuthSuccessPopup = (
    req: Request,
    res: Response,
    profile: { email: string; fullName: string; photoUrl?: string },
    provider: 'google' | 'facebook',
    role: 'freelancer' | 'client'
  ) => {
    const db = getDb();
    const normalizedEmail = profile.email.trim().toLowerCase();
    let user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    const now = new Date().toISOString();

    if (!user) {
      const id = `usr-${crypto.randomUUID().slice(0, 8)}`;
      const defaultCategory = 'IT & Software Development';
      user =
        role === 'freelancer'
          ? {
              id,
              fullName: profile.fullName || 'Afro-lancers Member',
              email: normalizedEmail,
              phone: 'Not provided',
              country: 'Kenya',
              role: 'freelancer',
              status: 'active',
              subscriptionTier: 'standard',
              createdAt: now,
              verifiedProfile: false,
              authProvider: provider,
              title: 'Independent Professional',
              category: defaultCategory,
              skills: ['Remote Collaboration'],
              experienceLevel: 'Intermediate',
              yearsExperience: 3,
              photoUrl: profile.photoUrl,
              bio: `Registered via ${provider === 'google' ? 'Google' : 'Facebook'}. Update your portfolio and skills in your dashboard.`,
              hourlyRate: 35,
              pricingModel: 'both',
              availability: 'Available Now',
              completedProjectsCount: 0,
              ratingAverage: null,
              reviewCount: 0,
              projectAlerts: {
                enabled: true,
                categories: [defaultCategory],
                keywords: [],
                minBudget: 0,
                remoteOnly: false,
              },
              passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
            }
          : {
              id,
              fullName: profile.fullName || 'Afro-lancers Client',
              email: normalizedEmail,
              phone: 'Not provided',
              country: 'Kenya',
              role: 'client',
              status: 'active',
              subscriptionTier: 'standard',
              createdAt: now,
              verifiedProfile: false,
              authProvider: provider,
              companyName: `${profile.fullName}'s Organization`,
              businessCategory: defaultCategory,
              bio: `Registered via ${provider === 'google' ? 'Google' : 'Facebook'}.`,
              passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
            };

      db.users.push(user);
      createNotification(
        user.id,
        'Welcome to Afro-lancers.com',
        `Signed up with ${provider === 'google' ? 'Google' : 'Facebook'}. Complete your profile details in the Dashboard.`,
        'system',
        'dashboard'
      );
      logActivity(user.fullName, `Registered via ${provider} OAuth`, user.role);
      saveDb(db);
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    res.cookie('afro_session', token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    const safePayload = JSON.stringify({
      type: 'OAUTH_AUTH_SUCCESS',
      token,
      user: sanitizeUser(user, true),
    }).replace(/</g, '\\u003c');

    res.send(`<!doctype html><html><body style="font-family:sans-serif;padding:24px;text-align:center;">
      <p>Authentication complete. Returning to Afro-lancers.com...</p>
      <script>
        if (window.opener) {
          window.opener.postMessage(${safePayload}, '*');
          window.close();
        } else {
          window.location.href = '/';
        }
      </script>
    </body></html>`);
  };

  app.get(['/api/auth/oauth/google/callback', '/api/auth/oauth/google/callback/'], async (req, res) => {
    try {
      const code = String(req.query.code || '');
      const stateRaw = String(req.query.state || '');
      const state = verifyOAuthState(stateRaw);
      if (!code || !state || state.provider !== 'google') {
        res.status(400).send('Invalid Google OAuth callback parameters.');
        return;
      }
      const baseUrl = getOAuthBaseUrl(req);
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: `${baseUrl}/api/auth/oauth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData = (await tokenRes.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        res.status(401).send('Google token exchange failed.');
        return;
      }
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = (await userRes.json()) as { email?: string; name?: string; picture?: string };
      if (!profile.email) {
        res.status(400).send('Google account did not provide an email address.');
        return;
      }
      handleOAuthSuccessPopup(
        req,
        res,
        { email: profile.email, fullName: profile.name || 'Google User', photoUrl: profile.picture },
        'google',
        state.role
      );
    } catch {
      res.status(500).send('Google authentication error.');
    }
  });

  app.get(['/api/auth/oauth/facebook/callback', '/api/auth/oauth/facebook/callback/'], async (req, res) => {
    try {
      const code = String(req.query.code || '');
      const stateRaw = String(req.query.state || '');
      const state = verifyOAuthState(stateRaw);
      if (!code || !state || state.provider !== 'facebook') {
        res.status(400).send('Invalid Facebook OAuth callback parameters.');
        return;
      }
      const baseUrl = getOAuthBaseUrl(req);
      const tokenParams = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID || '',
        client_secret: process.env.FACEBOOK_APP_SECRET || '',
        redirect_uri: `${baseUrl}/api/auth/oauth/facebook/callback`,
        code,
      });
      const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams}`);
      const tokenData = (await tokenRes.json()) as { access_token?: string };
      if (!tokenData.access_token) {
        res.status(401).send('Facebook token exchange failed.');
        return;
      }
      const userRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(
          tokenData.access_token
        )}`
      );
      const profile = (await userRes.json()) as {
        id?: string;
        name?: string;
        email?: string;
        picture?: { data?: { url?: string } };
      };
      const email = profile.email || `${profile.id || 'fb'}@facebook-oauth.afro-lancers.com`;
      handleOAuthSuccessPopup(
        req,
        res,
        {
          email,
          fullName: profile.name || 'Facebook User',
          photoUrl: profile.picture?.data?.url,
        },
        'facebook',
        state.role
      );
    } catch {
      res.status(500).send('Facebook authentication error.');
    }
  });

  // Auth: Login
  app.post('/api/auth/login', (req, res) => {
    const db = getDb();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email address or password.' });
      return;
    }
    if (user.status === 'suspended') {
      res.status(403).json({ error: 'This account has been suspended by marketplace administration.' });
      return;
    }
    const token = signToken({
      userId: user.id,
      role: user.role,
      exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
    });
    res.cookie('afro_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.json({ token, user: sanitizeUser(user, true) });
  });

  app.post('/api/auth/logout', (_req, res) => {
    res.clearCookie('afro_session');
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req: AuthedRequest, res) => {
    if (!req.currentUser) {
      res.json({ user: null });
      return;
    }
    res.json({ user: sanitizeUser(req.currentUser, true) });
  });

  // Password Recovery
  app.post('/api/auth/recover', (req, res) => {
    const db = getDb();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      // Return generic confirmation without leaking account existence, unless user creates a real flow
      res.status(404).json({ error: 'No registered account matches that email address.' });
      return;
    }
    const token = crypto.randomBytes(4).toString('hex').toUpperCase();
    db.resetTokens = db.resetTokens.filter((t) => t.email !== email);
    db.resetTokens.push({ email, token, expiresAt: Date.now() + 1000 * 60 * 15 });
    saveDb(db);
    res.json({
      message: 'Recovery verification code generated.',
      recoveryCodePreview: token,
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const db = getDb();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const code = String(req.body?.code || '').trim().toUpperCase();
    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }
    const match = db.resetTokens.find(
      (t) => t.email === email && t.token === code && t.expiresAt > Date.now()
    );
    if (!match) {
      res.status(400).json({ error: 'Invalid or expired recovery code.' });
      return;
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    user.passwordHash = hashPassword(newPassword);
    db.resetTokens = db.resetTokens.filter((t) => t.email !== email);
    logActivity(user.fullName, 'Completed password recovery', email);
    saveDb(db);
    res.json({ ok: true, message: 'Password updated. You may now sign in.' });
  });

  // Update Account / Freelancer Profile
  app.put('/api/profile', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const b = req.body || {};
    if (b.fullName) user.fullName = String(b.fullName).trim();
    if (b.phone) user.phone = String(b.phone).trim();
    if (b.country) user.country = String(b.country).trim();
    if (b.city !== undefined) user.city = String(b.city).trim();
    if (b.timezone !== undefined) user.timezone = String(b.timezone).trim();
    if (Array.isArray(b.languages)) {
      user.languages = b.languages.map(String).filter(Boolean).slice(0, 8);
    }
    if (b.bio !== undefined) user.bio = String(b.bio).trim();

    if (user.role === 'freelancer') {
      if (b.title !== undefined) user.title = String(b.title).trim();
      if (b.category !== undefined) user.category = String(b.category).trim();
      if (Array.isArray(b.skills)) user.skills = b.skills.map(String).filter(Boolean).slice(0, 15);
      if (b.experienceLevel) user.experienceLevel = b.experienceLevel as ExperienceLevel;
      if (b.yearsExperience !== undefined) user.yearsExperience = Number(b.yearsExperience);
      if (b.hourlyRate !== undefined) user.hourlyRate = Math.max(5, Number(b.hourlyRate));
      if (b.availability) user.availability = b.availability as AvailabilityStatus;
      if (b.portfolioUrl !== undefined) user.portfolioUrl = String(b.portfolioUrl).trim();
      if (b.photoUrl !== undefined) user.photoUrl = String(b.photoUrl).trim() || undefined;
      if (b.videoIntroUrl !== undefined) user.videoIntroUrl = String(b.videoIntroUrl).trim() || undefined;
      if (Array.isArray(b.portfolioItems)) user.portfolioItems = b.portfolioItems;
      user.lastActiveAt = new Date().toISOString();
    } else if (user.role === 'client') {
      if (b.companyName) user.companyName = String(b.companyName).trim();
      if (b.businessCategory) user.businessCategory = String(b.businessCategory).trim();
      if (b.companyWebsite !== undefined) user.companyWebsite = String(b.companyWebsite).trim();
    }
    saveDb(db);
    res.json({ user: sanitizeUser(user, true) });
  });

  // Saved Jobs (Freelancer)
  app.get('/api/saved-jobs', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const ids = db.savedJobs.filter((s) => s.userId === req.currentUser!.id).map((s) => s.jobId);
    const jobs = db.jobs.filter((j) => ids.includes(j.id));
    res.json({ savedJobIds: ids, jobs });
  });

  app.post('/api/saved-jobs/:jobId', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const { jobId } = req.params;
    const exists = db.savedJobs.some((s) => s.userId === req.currentUser!.id && s.jobId === jobId);
    if (!exists) {
      db.savedJobs.push({ userId: req.currentUser!.id, jobId, createdAt: new Date().toISOString() });
      saveDb(db);
    }
    res.json({ ok: true });
  });

  app.delete('/api/saved-jobs/:jobId', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    db.savedJobs = db.savedJobs.filter(
      (s) => !(s.userId === req.currentUser!.id && s.jobId === req.params.jobId)
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // Shortlist Freelancers (Client)
  app.get('/api/shortlist', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const ids = db.shortlists
      .filter((s) => s.clientId === req.currentUser!.id)
      .map((s) => s.freelancerId);
    const freelancers = db.users
      .filter((u) => ids.includes(u.id))
      .map((u) => sanitizeUser(u, false));
    res.json({ shortlistedIds: ids, freelancers });
  });

  app.post('/api/shortlist/:freelancerId', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const { freelancerId } = req.params;
    const exists = db.shortlists.some(
      (s) => s.clientId === req.currentUser!.id && s.freelancerId === freelancerId
    );
    if (!exists) {
      db.shortlists.push({
        clientId: req.currentUser!.id,
        freelancerId,
        createdAt: new Date().toISOString(),
      });
      saveDb(db);
    }
    res.json({ ok: true });
  });

  app.delete('/api/shortlist/:freelancerId', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    db.shortlists = db.shortlists.filter(
      (s) => !(s.clientId === req.currentUser!.id && s.freelancerId === req.params.freelancerId)
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // Client: Post Job & Manage Jobs
  app.post('/api/jobs', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    const title = String(b.title || '').trim();
    const category = String(b.category || '').trim();
    const description = String(b.description || '').trim();
    if (!title || !category || !description) {
      res.status(400).json({ error: 'Job title, category, and project description are required.' });
      return;
    }

    const skillsRequired = Array.isArray(b.skillsRequired)
      ? b.skillsRequired.map(String).filter(Boolean)
      : String(b.skillsRequired || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    const newJob = {
      id: `job-${crypto.randomUUID().slice(0, 8)}`,
      clientId: req.currentUser!.id,
      clientName: req.currentUser!.fullName,
      companyName: req.currentUser!.companyName || req.currentUser!.fullName,
      title,
      category,
      description,
      budgetMin: Math.max(10, Number(b.budgetMin || 500)),
      budgetMax: Math.max(10, Number(b.budgetMax || b.budgetMin || 1500)),
      budgetType: (b.budgetType === 'hourly' ? 'hourly' : 'fixed') as 'fixed' | 'hourly',
      experienceLevel: (b.experienceLevel || 'Intermediate') as ExperienceLevel,
      jobType: (b.jobType || 'Remote') as JobType,
      location: String(b.location || 'Remote').trim(),
      remoteStatus: (b.remoteStatus || 'Remote') as 'Remote' | 'Hybrid' | 'On-site',
      country: String(b.country || req.currentUser!.country || 'Remote').trim(),
      skillsRequired: skillsRequired.length > 0 ? skillsRequired : [category],
      deadline: String(b.deadline || '2026-12-31').trim(),
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };

    db.jobs.unshift(newJob);
    const alertMatches = dispatchProjectAlertsForJob(db, newJob);
    logActivity(
      req.currentUser!.fullName,
      'Posted new job',
      `${title}${alertMatches > 0 ? ` (${alertMatches} freelancer alerts dispatched)` : ''}`
    );
    saveDb(db);
    res.status(201).json({ job: newJob, alertsDispatched: alertMatches });
  });

  // Project Alerts (Freelancer matching & preferences)
  app.get('/api/alerts/matches', requireRole('freelancer'), (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    const prefs: ProjectAlertPreferences = user?.projectAlerts || {
      enabled: true,
      categories: user?.category ? [user.category] : [],
      keywords: (user?.skills || []).slice(0, 5),
      minBudget: 0,
      remoteOnly: false,
    };

    const matches = db.jobs
      .filter((job) => job.status === 'open')
      .filter((job) => {
        if (prefs.remoteOnly && job.remoteStatus !== 'Remote') return false;
        if (prefs.minBudget > 0 && job.budgetMax < prefs.minBudget) return false;
        const hay = [job.title, job.description, job.category, ...job.skillsRequired]
          .join(' ')
          .toLowerCase();
        const catMatch =
          prefs.categories.length === 0 ||
          prefs.categories.includes(job.category) ||
          user?.category === job.category;
        const kwMatch =
          prefs.keywords.length === 0 ||
          prefs.keywords.some((kw) => kw.trim() && hay.includes(kw.trim().toLowerCase()));
        return catMatch || kwMatch;
      });

    res.json({ preferences: prefs, matchingJobs: matches });
  });

  app.put('/api/alerts/preferences', requireRole('freelancer'), (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const b = req.body || {};
    const categories = Array.isArray(b.categories)
      ? b.categories.map(String).filter(Boolean)
      : user.projectAlerts?.categories || [];
    const keywords = Array.isArray(b.keywords)
      ? b.keywords.map(String).filter(Boolean)
      : String(b.keywords || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

    user.projectAlerts = {
      enabled: Boolean(b.enabled),
      categories: categories.slice(0, 12),
      keywords: keywords.slice(0, 15),
      minBudget: Math.max(0, Number(b.minBudget || 0)),
      remoteOnly: Boolean(b.remoteOnly),
    };
    saveDb(db);
    res.json({ preferences: user.projectAlerts, user: sanitizeUser(user, true) });
  });

  app.get('/api/client/jobs', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const jobs = db.jobs.filter((j) =>
      req.currentUser!.role === 'admin' ? true : j.clientId === req.currentUser!.id
    );
    const proposals = db.proposals.filter((p) =>
      req.currentUser!.role === 'admin' ? true : p.clientId === req.currentUser!.id
    );
    res.json({ jobs, proposals });
  });

  app.patch('/api/jobs/:id', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const job = db.jobs.find((j) => j.id === req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job listing not found.' });
      return;
    }
    if (req.currentUser!.role !== 'admin' && job.clientId !== req.currentUser!.id) {
      res.status(403).json({ error: 'You may only manage your own job listings.' });
      return;
    }
    const b = req.body || {};
    if (b.status) job.status = b.status;
    if (b.title) job.title = String(b.title).trim();
    if (b.description) job.description = String(b.description).trim();
    saveDb(db);
    res.json({ job });
  });

  // Proposals (Freelancer submits, Client evaluates)
  app.post('/api/proposals', requireRole('freelancer'), (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    const jobId = String(b.jobId || '');
    const coverLetter = String(b.coverLetter || '').trim();
    const proposedRate = Number(b.proposedRate || 0);
    const timeline = String(b.timeline || '4 weeks').trim();

    const job = db.jobs.find((j) => j.id === jobId && j.status === 'open');
    if (!job) {
      res.status(404).json({ error: 'Open job listing not found.' });
      return;
    }
    if (!coverLetter || proposedRate <= 0) {
      res.status(400).json({ error: 'Cover letter and proposed rate are required.' });
      return;
    }
    const already = db.proposals.some(
      (p) => p.jobId === jobId && p.freelancerId === req.currentUser!.id
    );
    if (already) {
      res.status(409).json({ error: 'You have already submitted a proposal for this project.' });
      return;
    }

    const proposal = {
      id: `prop-${crypto.randomUUID().slice(0, 8)}`,
      jobId: job.id,
      jobTitle: job.title,
      freelancerId: req.currentUser!.id,
      freelancerName: req.currentUser!.fullName,
      freelancerTitle: req.currentUser!.title || req.currentUser!.category || 'Freelancer',
      freelancerPhoto: req.currentUser!.photoUrl || '',
      freelancerCountry: req.currentUser!.country,
      clientId: job.clientId,
      coverLetter,
      proposedRate,
      timeline,
      status: 'submitted' as const,
      createdAt: new Date().toISOString(),
    };
    db.proposals.unshift(proposal);
    createNotification(
      job.clientId,
      'New proposal received',
      `${req.currentUser!.fullName} submitted a proposal for "${job.title}".`,
      'proposal',
      'dashboard'
    );
    logActivity(req.currentUser!.fullName, 'Submitted proposal', job.title);
    saveDb(db);
    res.status(201).json({ proposal });
  });

  app.get('/api/proposals/mine', requireRole('freelancer'), (req: AuthedRequest, res) => {
    const db = getDb();
    const proposals = db.proposals.filter((p) => p.freelancerId === req.currentUser!.id);
    const invitations = db.invitations.filter((inv) => inv.freelancerId === req.currentUser!.id);
    res.json({ proposals, invitations });
  });

  app.post('/api/proposals/:id/status', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const proposal = db.proposals.find((p) => p.id === req.params.id);
    if (!proposal) {
      res.status(404).json({ error: 'Proposal not found.' });
      return;
    }
    if (req.currentUser!.role !== 'admin' && proposal.clientId !== req.currentUser!.id) {
      res.status(403).json({ error: 'Unauthorized to update this proposal.' });
      return;
    }
    const status = String(req.body?.status || '') as
      | 'submitted'
      | 'shortlisted'
      | 'hired'
      | 'declined'
      | 'completed';
    if (!['submitted', 'shortlisted', 'hired', 'declined', 'completed'].includes(status)) {
      res.status(400).json({ error: 'Invalid proposal status.' });
      return;
    }
    proposal.status = status;

    const job = db.jobs.find((j) => j.id === proposal.jobId);
    if (job && status === 'hired') {
      job.status = 'in_progress';
    } else if (job && status === 'completed') {
      job.status = 'completed';
    }
    recalculateFreelancerStats(db, proposal.freelancerId);

    createNotification(
      proposal.freelancerId,
      `Proposal ${status}`,
      `Your proposal for "${proposal.jobTitle}" was marked as ${status}.`,
      'proposal',
      'dashboard'
    );
    logActivity(req.currentUser!.fullName, `Updated proposal to ${status}`, proposal.jobTitle);
    saveDb(db);
    res.json({ proposal });
  });

  // Invitations (Client invites Freelancer)
  app.post('/api/invitations', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    const freelancerId = String(b.freelancerId || '');
    const jobId = String(b.jobId || '');
    const message = String(b.message || '').trim();

    const freelancer = db.users.find((u) => u.id === freelancerId && u.role === 'freelancer');
    const job = db.jobs.find((j) => j.id === jobId);
    if (!freelancer || !job) {
      res.status(404).json({ error: 'Freelancer or job listing not found.' });
      return;
    }
    const invitation = {
      id: `inv-${crypto.randomUUID().slice(0, 8)}`,
      jobId: job.id,
      jobTitle: job.title,
      clientId: req.currentUser!.id,
      clientName: req.currentUser!.fullName,
      companyName: req.currentUser!.companyName || req.currentUser!.fullName,
      freelancerId: freelancer.id,
      message: message || `We would like to invite you to submit a proposal for "${job.title}".`,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    db.invitations.unshift(invitation);
    createNotification(
      freelancer.id,
      'New Job Invitation',
      `${invitation.companyName} invited you to apply for "${job.title}".`,
      'invitation',
      'dashboard'
    );
    logActivity(req.currentUser!.fullName, 'Invited freelancer', `${freelancer.fullName} -> ${job.title}`);
    saveDb(db);
    res.status(201).json({ invitation });
  });

  app.post('/api/invitations/:id/respond', requireRole('freelancer'), (req: AuthedRequest, res) => {
    const db = getDb();
    const inv = db.invitations.find(
      (i) => i.id === req.params.id && i.freelancerId === req.currentUser!.id
    );
    if (!inv) {
      res.status(404).json({ error: 'Invitation not found.' });
      return;
    }
    const status = req.body?.status === 'accepted' ? 'accepted' : 'declined';
    inv.status = status;
    createNotification(
      inv.clientId,
      `Invitation ${status}`,
      `${req.currentUser!.fullName} ${status} your invitation for "${inv.jobTitle}".`,
      'invitation',
      'dashboard'
    );
    saveDb(db);
    res.json({ invitation: inv });
  });

  // Reviews (Client submits verified review for completed project)
  app.post('/api/reviews', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    const freelancerId = String(b.freelancerId || '');
    const jobId = String(b.jobId || '');
    const rating = Math.min(5, Math.max(1, Number(b.rating || 5)));
    const comment = String(b.comment || '').trim();
    if (!comment || !freelancerId) {
      res.status(400).json({ error: 'Freelancer and review comment are required.' });
      return;
    }
    const job = db.jobs.find((j) => j.id === jobId);
    const review = {
      id: `rev-${crypto.randomUUID().slice(0, 8)}`,
      jobId: jobId || 'direct',
      jobTitle: job?.title || 'Completed Engagement',
      freelancerId,
      clientId: req.currentUser!.id,
      clientName: req.currentUser!.fullName,
      companyName: req.currentUser!.companyName || req.currentUser!.fullName,
      rating,
      comment,
      verified: true,
      createdAt: new Date().toISOString(),
    };
    db.reviews.unshift(review);
    recalculateFreelancerStats(db, freelancerId);
    createNotification(
      freelancerId,
      'New verified client review',
      `${review.companyName} left a ${rating}/5 review on "${review.jobTitle}".`,
      'review',
      'dashboard'
    );
    saveDb(db);
    res.status(201).json({ review });
  });

  // Messaging with File Attachments & Price Negotiation Quotes
  app.get('/api/messages', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const uid = req.currentUser!.id;
    const messages = db.messages.filter((m) => m.senderId === uid || m.recipientId === uid);
    const contacts = db.users
      .filter((u) => u.id !== uid && u.status === 'active' && u.role !== 'admin')
      .map((u) => sanitizeUser(u, false));
    res.json({ messages, contacts });
  });

  app.post('/api/messages', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    const recipientId = String(b.recipientId || '');
    const bodyText = String(b.body || '').trim();
    if (!recipientId || (!bodyText && !b.attachment && !b.quote)) {
      res.status(400).json({ error: 'Recipient and message content, file, or quote are required.' });
      return;
    }
    const recipient = db.users.find((u) => u.id === recipientId);
    if (!recipient) {
      res.status(404).json({ error: 'Recipient account not found.' });
      return;
    }
    const attachment =
      b.attachment && b.attachment.url
        ? {
            name: String(b.attachment.name || 'file'),
            url: String(b.attachment.url),
            mimeType: String(b.attachment.mimeType || 'application/octet-stream'),
            sizeBytes: Number(b.attachment.sizeBytes || 0),
          }
        : undefined;
    const quote =
      b.quote && Number(b.quote.amountUsd) > 0
        ? {
            amountUsd: Number(b.quote.amountUsd),
            timeline: String(b.quote.timeline || '4 weeks'),
            proposalId: b.quote.proposalId ? String(b.quote.proposalId) : undefined,
            status: 'proposed' as const,
          }
        : undefined;

    const msg = {
      id: `msg-${crypto.randomUUID().slice(0, 8)}`,
      senderId: req.currentUser!.id,
      senderName: req.currentUser!.fullName,
      senderRole: req.currentUser!.role,
      recipientId: recipient.id,
      recipientName: recipient.fullName,
      jobId: b.jobId ? String(b.jobId) : undefined,
      jobTitle: b.jobTitle ? String(b.jobTitle) : undefined,
      body:
        bodyText ||
        (quote ? `Proposed price quote: $${quote.amountUsd.toLocaleString()} (${quote.timeline})` : `Shared attachment: ${attachment?.name}`),
      attachment,
      quote,
      read: false,
      createdAt: new Date().toISOString(),
    };
    db.messages.push(msg);
    createNotification(
      recipient.id,
      quote ? `New Price Quote from ${req.currentUser!.fullName}` : `Message from ${req.currentUser!.fullName}`,
      msg.body.slice(0, 120),
      'message',
      'dashboard'
    );
    saveDb(db);
    res.status(201).json({ message: msg });
  });

  app.post('/api/messages/:id/quote', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const msg = db.messages.find((m) => m.id === req.params.id);
    if (!msg || !msg.quote) {
      res.status(404).json({ error: 'Negotiation quote message not found.' });
      return;
    }
    if (msg.recipientId !== req.currentUser!.id && req.currentUser!.role !== 'admin') {
      res.status(403).json({ error: 'Only the quote recipient may accept or decline.' });
      return;
    }
    const decision = req.body?.status === 'accepted' ? 'accepted' : 'declined';
    msg.quote.status = decision;

    if (decision === 'accepted' && msg.quote.proposalId) {
      const prop = db.proposals.find((p) => p.id === msg.quote!.proposalId);
      if (prop) {
        prop.proposedRate = msg.quote.amountUsd;
        prop.timeline = msg.quote.timeline;
      }
    }

    createNotification(
      msg.senderId,
      `Price quote ${decision}`,
      `${req.currentUser!.fullName} ${decision} your $${msg.quote.amountUsd.toLocaleString()} quote.`,
      'message',
      'dashboard'
    );
    saveDb(db);
    res.json({ message: msg });
  });

  // Notifications
  app.get('/api/notifications', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const items = db.notifications.filter((n) => n.userId === req.currentUser!.id);
    res.json({ notifications: items });
  });

  app.post('/api/notifications/read', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    for (const n of db.notifications) {
      if (n.userId === req.currentUser!.id) {
        n.read = true;
      }
    }
    saveDb(db);
    res.json({ ok: true });
  });

  app.post('/api/notifications/:id/read', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const notif = db.notifications.find(
      (n) => n.id === req.params.id && n.userId === req.currentUser!.id
    );
    if (notif) {
      notif.read = true;
      saveDb(db);
    }
    res.json({ ok: true });
  });

  // Reports (Account / Job flagging)
  app.post('/api/reports', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    const targetType = b.targetType === 'job' ? 'job' : 'user';
    const targetId = String(b.targetId || '');
    const targetLabel = String(b.targetLabel || targetId);
    const reason = String(b.reason || 'Policy review').trim();
    const details = String(b.details || '').trim();
    if (!targetId || !reason) {
      res.status(400).json({ error: 'Target and reason are required.' });
      return;
    }
    const report = {
      id: `rep-${crypto.randomUUID().slice(0, 8)}`,
      reporterId: req.currentUser!.id,
      reporterName: req.currentUser!.fullName,
      targetType: targetType as 'user' | 'job',
      targetId,
      targetLabel,
      reason,
      details,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    db.reports.unshift(report);
    logActivity(req.currentUser!.fullName, 'Submitted moderation report', targetLabel);
    saveDb(db);
    res.status(201).json({ report });
  });

  // Payment Gateways & Escrow APIs (Paynow, Paystack, Flutterwave, Stripe)
  app.get('/api/payments/gateways', (_req, res) => {
    const db = getDb();
    res.json({
      gateways: getPaymentGatewaysInfo(),
      subscriptionSettings: db.subscriptionSettings,
    });
  });

  app.get('/api/payments/history', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const uid = req.currentUser!.id;
    const isAdmin = req.currentUser!.role === 'admin';

    const transactions = db.transactions.filter((t) => isAdmin || t.userId === uid);
    const escrows = db.escrows.filter(
      (e) => isAdmin || e.clientId === uid || e.freelancerId === uid
    );

    res.json({
      transactions,
      escrows,
      gateways: getPaymentGatewaysInfo(),
      subscriptionSettings: db.subscriptionSettings,
    });
  });

  app.post('/api/payments/initiate', requireAuth, async (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    const gateway = String(b.gateway || 'paynow') as PaymentGatewayId;
    if (!['paynow', 'paystack', 'flutterwave', 'stripe'].includes(gateway)) {
      res.status(400).json({ error: 'Unsupported payment gateway.' });
      return;
    }

    const purposeRaw = String(b.purpose || 'escrow');
    const purpose = (
      ['subscription', 'featured_job', 'featured_profile', 'service_purchase'].includes(purposeRaw)
        ? purposeRaw
        : 'escrow'
    ) as 'escrow' | 'subscription' | 'featured_job' | 'featured_profile' | 'service_purchase';
    const paymentMethod = String(b.paymentMethod || 'web').trim().toLowerCase();
    const currency = String(b.currency || 'USD').trim().toUpperCase();
    const phone = String(b.phone || req.currentUser!.phone || '').trim();
    const baseUrl = getOAuthBaseUrl(req);
    const reference = `AFRO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    let amountUsd = 0;
    let platformFeeUsd = 0;
    let netPayoutUsd = 0;
    let jobId: string | undefined = b.jobId ? String(b.jobId) : undefined;
    let jobTitle: string | undefined;
    let proposalId: string | undefined;
    let escrowId: string | undefined;
    let serviceId: string | undefined = b.serviceId ? String(b.serviceId) : undefined;
    let serviceOrderId: string | undefined;
    let serviceTitle: string | undefined;
    let targetTier: SubscriptionTier | undefined;
    let additionalInfo = 'Afro-lancers Marketplace Payment';

    if (purpose === 'service_purchase') {
      const service = db.services.find((s) => s.id === serviceId && s.status === 'active');
      if (!service) {
        res.status(404).json({ error: 'Service listing not found or currently paused.' });
        return;
      }
      if (service.sellerId === req.currentUser!.id) {
        res.status(400).json({ error: 'You cannot purchase your own service listing.' });
        return;
      }
      const svcCommPercent = db.subscriptionSettings.serviceCommissionPercent ?? 10;
      const rate = svcCommPercent / 100;
      amountUsd = service.priceUsd;
      platformFeeUsd = Number((amountUsd * rate).toFixed(2));
      netPayoutUsd = Number((amountUsd - platformFeeUsd).toFixed(2));
      serviceTitle = service.title;
      additionalInfo = `Service Order: ${service.title}`.slice(0, 80);

      serviceOrderId = `sord-${crypto.randomUUID().slice(0, 8)}`;
      const newOrder: ServiceOrder = {
        id: serviceOrderId,
        serviceId: service.id,
        serviceTitle: service.title,
        sellerId: service.sellerId,
        sellerName: service.sellerName,
        buyerId: req.currentUser!.id,
        buyerName: req.currentUser!.companyName || req.currentUser!.fullName,
        buyerRole: req.currentUser!.role,
        grossAmountUsd: amountUsd,
        platformFeeUsd,
        sellerNetUsd: netPayoutUsd,
        commissionPercent: svcCommPercent,
        gateway,
        currency,
        reference,
        requirementsNote: b.requirementsNote ? String(b.requirementsNote).trim() : undefined,
        status: 'pending',
        deliveryTime: service.deliveryTime,
        createdAt: new Date().toISOString(),
      };
      db.serviceOrders.unshift(newOrder);
    } else if (purpose === 'escrow') {
      if (req.currentUser!.role !== 'client' && req.currentUser!.role !== 'admin') {
        res.status(403).json({ error: 'Only client accounts can fund project escrow contracts.' });
        return;
      }
      proposalId = String(b.proposalId || '');
      const proposal = db.proposals.find((p) => p.id === proposalId);
      if (!proposal) {
        res.status(404).json({ error: 'Proposal not found for escrow funding.' });
        return;
      }
      if (req.currentUser!.role !== 'admin' && proposal.clientId !== req.currentUser!.id) {
        res.status(403).json({ error: 'You may only fund escrow for your own project proposals.' });
        return;
      }
      const existingFunded = db.escrows.find(
        (e) => e.proposalId === proposal.id && (e.status === 'funded' || e.status === 'released')
      );
      if (existingFunded) {
        res.status(409).json({ error: 'Escrow is already funded for this proposal.' });
        return;
      }
      amountUsd = Math.max(10, Number(b.amountUsd || proposal.proposedRate));
      const rate = db.subscriptionSettings.commissionPercent / 100;
      platformFeeUsd = Number((amountUsd * rate).toFixed(2));
      netPayoutUsd = Number((amountUsd - platformFeeUsd).toFixed(2));
      jobId = proposal.jobId;
      jobTitle = proposal.jobTitle;
      additionalInfo = `Escrow: ${proposal.jobTitle}`.slice(0, 80);

      const rawMilestones = Array.isArray(b.milestones) ? b.milestones : [];
      const milestones: EscrowMilestone[] =
        rawMilestones.length > 0
          ? rawMilestones.map((m: { title?: string; amountUsd?: number; dueDate?: string }, idx: number) => {
              const mAmt = Math.max(5, Number(m.amountUsd || amountUsd / rawMilestones.length));
              return {
                id: `ms-${crypto.randomUUID().slice(0, 6)}`,
                title: String(m.title || `Milestone ${idx + 1}`).trim(),
                amountUsd: Number(mAmt.toFixed(2)),
                netPayoutUsd: Number((mAmt * (1 - rate)).toFixed(2)),
                status: 'funded' as const,
                dueDate: m.dueDate ? String(m.dueDate) : undefined,
              };
            })
          : [
              {
                id: `ms-${crypto.randomUUID().slice(0, 6)}`,
                title: 'Milestone 1 · Project Kickoff & Architecture (50%)',
                amountUsd: Number((amountUsd * 0.5).toFixed(2)),
                netPayoutUsd: Number((netPayoutUsd * 0.5).toFixed(2)),
                status: 'funded',
              },
              {
                id: `ms-${crypto.randomUUID().slice(0, 6)}`,
                title: 'Milestone 2 · Final Delivery & Sign-Off (50%)',
                amountUsd: Number((amountUsd - Number((amountUsd * 0.5).toFixed(2))).toFixed(2)),
                netPayoutUsd: Number((netPayoutUsd - Number((netPayoutUsd * 0.5).toFixed(2))).toFixed(2)),
                status: 'funded',
              },
            ];

      escrowId = `esc-${crypto.randomUUID().slice(0, 8)}`;
      const newEscrow: EscrowContract = {
        id: escrowId,
        jobId: proposal.jobId,
        jobTitle: proposal.jobTitle,
        proposalId: proposal.id,
        clientId: proposal.clientId,
        clientName: req.currentUser!.companyName || req.currentUser!.fullName,
        freelancerId: proposal.freelancerId,
        freelancerName: proposal.freelancerName,
        grossAmountUsd: amountUsd,
        platformFeeUsd,
        netPayoutUsd,
        gateway,
        currency,
        status: 'pending',
        milestones,
        dispute: { status: 'none' },
        reference,
        isSandbox: false,
        createdAt: new Date().toISOString(),
      };
      db.escrows.unshift(newEscrow);
    } else if (purpose === 'featured_job') {
      const job = db.jobs.find((j) => j.id === jobId);
      if (!job) {
        res.status(404).json({ error: 'Job listing not found for Featured upgrade.' });
        return;
      }
      amountUsd = db.subscriptionSettings.featuredJobUsd || 29;
      platformFeeUsd = amountUsd;
      netPayoutUsd = 0;
      jobTitle = job.title;
      additionalInfo = `Featured Job Boost: ${job.title}`.slice(0, 80);
    } else if (purpose === 'featured_profile') {
      amountUsd = db.subscriptionSettings.featuredProfileUsd || 25;
      platformFeeUsd = amountUsd;
      netPayoutUsd = 0;
      additionalInfo = `Featured Profile Promotion: ${req.currentUser!.fullName}`.slice(0, 80);
    } else {
      targetTier = b.targetTier === 'enterprise' ? 'enterprise' : 'pro';
      amountUsd =
        targetTier === 'enterprise'
          ? db.subscriptionSettings.clientEnterpriseMonthlyUsd
          : db.subscriptionSettings.freelancerProMonthlyUsd;
      platformFeeUsd = amountUsd;
      netPayoutUsd = 0;
      additionalInfo = `Afro-lancers ${targetTier.toUpperCase()} Membership`;
    }

    let checkoutUrl: string | undefined;
    let pollUrl: string | undefined;
    let paynowInstructions: string | undefined;
    let isSandbox = false;

    try {
      if (gateway === 'paynow') {
        const id = (process.env.PAYNOW_INTEGRATION_ID || '').trim();
        const key = (process.env.PAYNOW_INTEGRATION_KEY || '').trim();
        if (id && key) {
          const returnUrl = `${baseUrl}/?payment_ref=${encodeURIComponent(reference)}`;
          const resultUrl = `${baseUrl}/api/payments/paynow/result`;
          const amountStr = amountUsd.toFixed(2);
          const authemail = req.currentUser!.email;
          const isMobileExpress = ['ecocash', 'onemoney', 'innbucks'].includes(paymentMethod);

          if (isMobileExpress && !phone) {
            res.status(400).json({ error: 'A mobile number is required for Paynow Express (EcoCash/OneMoney).' });
            return;
          }

          const fields: Array<[string, string]> = [
            ['id', id],
            ['reference', reference],
            ['amount', amountStr],
            ['additionalinfo', additionalInfo],
            ['returnurl', returnUrl],
            ['resulturl', resultUrl],
            ['authemail', authemail],
            ['status', 'Message'],
          ];
          if (isMobileExpress) {
            fields.push(['phone', phone]);
            fields.push(['method', paymentMethod]);
          }
          const hash = computePaynowHash(
            fields.map(([, v]) => v),
            key
          );
          const bodyParams = new URLSearchParams();
          for (const [k, v] of fields) bodyParams.set(k, v);
          bodyParams.set('hash', hash);

          const endpoint = isMobileExpress
            ? 'https://www.paynow.co.zw/interface/remotetransaction'
            : 'https://www.paynow.co.zw/interface/initiatetransaction';

          const pnRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: bodyParams.toString(),
          });
          const text = await pnRes.text();
          const parsed = new URLSearchParams(text);
          if ((parsed.get('status') || '').toLowerCase() !== 'ok') {
            res.status(400).json({
              error: parsed.get('error') || 'Paynow transaction initiation was declined.',
            });
            return;
          }
          checkoutUrl = parsed.get('browserurl') || undefined;
          pollUrl = parsed.get('pollurl') || undefined;
          paynowInstructions = parsed.get('instructions') || undefined;
        } else {
          isSandbox = true;
        }
      } else if (gateway === 'paystack') {
        const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
        if (secret) {
          const psRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: req.currentUser!.email,
              amount: Math.round(amountUsd * 100),
              reference,
              callback_url: `${baseUrl}/?payment_ref=${encodeURIComponent(reference)}`,
              metadata: { purpose, jobTitle, proposalId, targetTier },
            }),
          });
          const psData = (await psRes.json()) as {
            status?: boolean;
            message?: string;
            data?: { authorization_url?: string };
          };
          if (!psRes.ok || !psData.status || !psData.data?.authorization_url) {
            res.status(400).json({ error: psData.message || 'Paystack initialization failed.' });
            return;
          }
          checkoutUrl = psData.data.authorization_url;
        } else {
          isSandbox = true;
        }
      } else if (gateway === 'flutterwave') {
        const secret = (process.env.FLUTTERWAVE_SECRET_KEY || '').trim();
        if (secret) {
          const flwRes = await fetch('https://api.flutterwave.com/v3/payments', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tx_ref: reference,
              amount: amountUsd,
              currency: currency === 'ZIG' ? 'USD' : currency,
              redirect_url: `${baseUrl}/?payment_ref=${encodeURIComponent(reference)}`,
              customer: {
                email: req.currentUser!.email,
                name: req.currentUser!.fullName,
                phonenumber: phone || undefined,
              },
              customizations: {
                title: 'Afro-lancers.com',
                description: additionalInfo,
              },
            }),
          });
          const flwData = (await flwRes.json()) as {
            status?: string;
            message?: string;
            data?: { link?: string };
          };
          if (!flwRes.ok || flwData.status !== 'success' || !flwData.data?.link) {
            res.status(400).json({ error: flwData.message || 'Flutterwave initialization failed.' });
            return;
          }
          checkoutUrl = flwData.data.link;
        } else {
          isSandbox = true;
        }
      } else if (gateway === 'stripe') {
        const secret = (process.env.STRIPE_SECRET_KEY || '').trim();
        if (secret) {
          const stripeParams = new URLSearchParams({
            mode: 'payment',
            success_url: `${baseUrl}/?payment_ref=${encodeURIComponent(reference)}`,
            cancel_url: `${baseUrl}/?payment_cancelled=${encodeURIComponent(reference)}`,
            client_reference_id: reference,
            customer_email: req.currentUser!.email,
            'line_items[0][price_data][currency]': 'usd',
            'line_items[0][price_data][product_data][name]': additionalInfo,
            'line_items[0][price_data][unit_amount]': String(Math.round(amountUsd * 100)),
            'line_items[0][quantity]': '1',
          });
          const stRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${secret}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: stripeParams.toString(),
          });
          const stData = (await stRes.json()) as {
            id?: string;
            url?: string;
            error?: { message?: string };
          };
          if (!stRes.ok || !stData.url) {
            res.status(400).json({ error: stData.error?.message || 'Stripe checkout initialization failed.' });
            return;
          }
          checkoutUrl = stData.url;
          pollUrl = stData.id;
        } else {
          isSandbox = true;
        }
      }
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to reach payment gateway.',
      });
      return;
    }

    if (escrowId) {
      const esc = db.escrows.find((e) => e.id === escrowId);
      if (esc) esc.isSandbox = isSandbox;
    }

    const tx: PaymentTransaction = {
      id: `tx-${crypto.randomUUID().slice(0, 8)}`,
      userId: req.currentUser!.id,
      userName: req.currentUser!.fullName,
      purpose,
      gateway,
      paymentMethod,
      currency,
      amountUsd,
      platformFeeUsd,
      netPayoutUsd,
      reference,
      status: 'pending',
      jobId,
      jobTitle,
      proposalId,
      escrowId,
      serviceId,
      serviceOrderId,
      serviceTitle,
      targetTier,
      checkoutUrl,
      pollUrl,
      paynowInstructions,
      isSandbox,
      createdAt: new Date().toISOString(),
    };

    db.transactions.unshift(tx);
    logActivity(
      req.currentUser!.fullName,
      `Initiated ${gateway.toUpperCase()} ${purpose}`,
      `${reference} · $${amountUsd.toFixed(2)} ${isSandbox ? '(Sandbox)' : '(Live)'}`
    );
    saveDb(db);

    res.status(201).json({ transaction: tx });
  });

  const finalizeFundedTransaction = (tx: PaymentTransaction): StoredUser | undefined => {
    const db = getDb();
    const now = new Date().toISOString();
    tx.status = 'funded';
    tx.completedAt = now;

    if (tx.purpose === 'service_purchase' && tx.serviceOrderId) {
      const order = db.serviceOrders.find((o) => o.id === tx.serviceOrderId);
      if (order && order.status === 'pending') {
        order.status = 'in_progress';
        order.paidAt = now;
        const service = db.services.find((s) => s.id === order.serviceId);
        if (service) {
          service.salesCount = (service.salesCount || 0) + 1;
        }
        createNotification(
          order.sellerId,
          'New Service Marketplace Order!',
          `${order.buyerName} purchased "${order.serviceTitle}" ($${order.grossAmountUsd}). Net $${order.sellerNetUsd} (after ${order.commissionPercent}% fee).`,
          'payment',
          'dashboard'
        );
        createNotification(
          order.buyerId,
          'Service Order Confirmed',
          `Payment settled for "${order.serviceTitle}" with ${order.sellerName}. Delivery target: ${order.deliveryTime}.`,
          'payment',
          'dashboard'
        );
      }
      return undefined;
    }

    if (tx.purpose === 'escrow' && tx.escrowId) {
      const escrow = db.escrows.find((e) => e.id === tx.escrowId);
      if (escrow && escrow.status === 'pending') {
        escrow.status = 'funded';
        escrow.fundedAt = now;
        const prop = db.proposals.find((p) => p.id === escrow.proposalId);
        if (prop && (prop.status === 'submitted' || prop.status === 'shortlisted')) {
          prop.status = 'hired';
        }
        const job = db.jobs.find((j) => j.id === escrow.jobId);
        if (job && job.status === 'open') {
          job.status = 'in_progress';
        }
        createNotification(
          escrow.freelancerId,
          'Escrow Funded via ' + tx.gateway.toUpperCase(),
          `${escrow.clientName} funded $${escrow.grossAmountUsd.toLocaleString()} escrow for "${escrow.jobTitle}".`,
          'payment',
          'dashboard'
        );
      }
      return undefined;
    }

    if (tx.purpose === 'subscription' && tx.targetTier) {
      const usr = db.users.find((u) => u.id === tx.userId);
      if (usr) {
        usr.subscriptionTier = tx.targetTier;
        createNotification(
          usr.id,
          `${tx.targetTier.toUpperCase()} Plan Activated`,
          `Your ${tx.gateway.toUpperCase()} payment (${tx.reference}) settled successfully.`,
          'payment',
          'dashboard'
        );
        return usr;
      }
    }

    if (tx.purpose === 'featured_job' && tx.jobId) {
      const job = db.jobs.find((j) => j.id === tx.jobId);
      if (job) {
        job.isFeatured = true;
        job.featuredUntil = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10);
        createNotification(
          tx.userId,
          'Featured Job Boost Active',
          `"${job.title}" is now pinned as a Featured project across search & homepage.`,
          'payment',
          'dashboard'
        );
      }
    }

    if (tx.purpose === 'featured_profile') {
      const usr = db.users.find((u) => u.id === tx.userId);
      if (usr) {
        usr.isFeaturedProfile = true;
        createNotification(
          usr.id,
          'Featured Profile Activated',
          `Your profile now receives priority directory placement for 30 days.`,
          'payment',
          'dashboard'
        );
        return usr;
      }
    }
    return undefined;
  };

  // Paynow Server-to-Server Result URL Webhook
  app.post('/api/payments/paynow/result', (req, res) => {
    const db = getDb();
    const body = (req.body || {}) as Record<string, string>;
    const reference = String(body.reference || '').trim();
    const statusRaw = String(body.status || '').trim().toLowerCase();
    const receivedHash = String(body.hash || '').trim().toUpperCase();
    const key = (process.env.PAYNOW_INTEGRATION_KEY || '').trim();

    if (key && receivedHash) {
      const values = Object.entries(body)
        .filter(([k]) => k.toLowerCase() !== 'hash')
        .map(([, v]) => String(v));
      const expected = computePaynowHash(values, key);
      if (expected !== receivedHash) {
        res.status(400).send('Invalid Paynow signature hash');
        return;
      }
    }

    const tx = db.transactions.find((t) => t.reference === reference);
    if (tx && ['paid', 'awaiting delivery', 'delivered'].includes(statusRaw)) {
      if (tx.status === 'pending') {
        finalizeFundedTransaction(tx);
        logActivity('Paynow Webhook', 'Confirmed Paynow settlement', reference);
        saveDb(db);
      }
    } else if (tx && ['cancelled', 'failed', 'disputed'].includes(statusRaw)) {
      tx.status = 'failed';
      saveDb(db);
    }

    res.status(200).send('OK');
  });

  // Poll / Verify Transaction Status (supports Paynow pollUrl, Paystack/Flutterwave/Stripe verify, or Sandbox confirm)
  app.post('/api/payments/:id/verify', requireAuth, async (req: AuthedRequest, res) => {
    const db = getDb();
    const tx = db.transactions.find((t) => t.id === req.params.id || t.reference === req.params.id);
    if (!tx) {
      res.status(404).json({ error: 'Transaction not found.' });
      return;
    }
    if (req.currentUser!.role !== 'admin' && tx.userId !== req.currentUser!.id) {
      res.status(403).json({ error: 'Unauthorized to verify this transaction.' });
      return;
    }

    if (tx.status === 'funded' || tx.status === 'released') {
      const updatedUser = db.users.find((u) => u.id === tx.userId);
      res.json({
        transaction: tx,
        user: updatedUser ? sanitizeUser(updatedUser, true) : undefined,
      });
      return;
    }

    if (!tx.isSandbox) {
      try {
        if (tx.gateway === 'paynow' && tx.pollUrl) {
          const pnPoll = await fetch(tx.pollUrl);
          const pollText = await pnPoll.text();
          const parsed = new URLSearchParams(pollText);
          const status = (parsed.get('status') || '').toLowerCase();
          if (!['paid', 'awaiting delivery', 'delivered'].includes(status)) {
            res.status(202).json({
              pending: true,
              gatewayStatus: parsed.get('status') || 'Pending',
              transaction: tx,
              message: `Paynow reports status: ${parsed.get('status') || 'Awaiting payment'}.`,
            });
            return;
          }
        } else if (tx.gateway === 'paystack' && process.env.PAYSTACK_SECRET_KEY) {
          const psVerify = await fetch(
            `https://api.paystack.co/transaction/verify/${encodeURIComponent(tx.reference)}`,
            { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY.trim()}` } }
          );
          const psData = (await psVerify.json()) as { data?: { status?: string } };
          if (psData.data?.status !== 'success') {
            res.status(202).json({
              pending: true,
              gatewayStatus: psData.data?.status || 'pending',
              transaction: tx,
              message: 'Paystack payment is still pending.',
            });
            return;
          }
        } else if (tx.gateway === 'flutterwave' && process.env.FLUTTERWAVE_SECRET_KEY) {
          const flwVerify = await fetch(
            `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(tx.reference)}`,
            { headers: { Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY.trim()}` } }
          );
          const flwData = (await flwVerify.json()) as { data?: { status?: string } };
          if (flwData.data?.status !== 'successful') {
            res.status(202).json({
              pending: true,
              gatewayStatus: flwData.data?.status || 'pending',
              transaction: tx,
              message: 'Flutterwave payment is still awaiting confirmation.',
            });
            return;
          }
        } else if (tx.gateway === 'stripe' && process.env.STRIPE_SECRET_KEY && tx.pollUrl) {
          const stVerify = await fetch(
            `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(tx.pollUrl)}`,
            { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY.trim()}` } }
          );
          const stSession = (await stVerify.json()) as { payment_status?: string };
          if (stSession.payment_status !== 'paid') {
            res.status(202).json({
              pending: true,
              gatewayStatus: stSession.payment_status || 'unpaid',
              transaction: tx,
              message: 'Stripe Checkout payment is still awaiting confirmation.',
            });
            return;
          }
        }
      } catch (err) {
        res.status(502).json({
          error: err instanceof Error ? err.message : 'Unable to verify payment status.',
        });
        return;
      }
    }

    const updatedUser = finalizeFundedTransaction(tx);
    logActivity(
      req.currentUser!.fullName,
      `Verified ${tx.gateway.toUpperCase()} payment`,
      `${tx.reference} · $${tx.amountUsd.toFixed(2)}`
    );
    saveDb(db);

    res.json({
      transaction: tx,
      user: updatedUser ? sanitizeUser(updatedUser, true) : undefined,
    });
  });

  // Release Escrow Payout to Freelancer
  app.post('/api/escrow/:id/release', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const escrow = db.escrows.find((e) => e.id === req.params.id);
    if (!escrow) {
      res.status(404).json({ error: 'Escrow contract not found.' });
      return;
    }
    if (req.currentUser!.role !== 'admin' && escrow.clientId !== req.currentUser!.id) {
      res.status(403).json({ error: 'Only the funding client or administrator can release escrow.' });
      return;
    }
    if (escrow.status !== 'funded') {
      res.status(400).json({ error: `Cannot release escrow in "${escrow.status}" state.` });
      return;
    }

    escrow.status = 'released';
    escrow.releasedAt = new Date().toISOString();
    if (Array.isArray(escrow.milestones)) {
      escrow.milestones.forEach((m) => {
        if (m.status === 'funded') {
          m.status = 'released';
          m.releasedAt = escrow.releasedAt;
        }
      });
    }

    const tx = db.transactions.find((t) => t.escrowId === escrow.id);
    if (tx) tx.status = 'released';

    const proposal = db.proposals.find((p) => p.id === escrow.proposalId);
    if (proposal) proposal.status = 'completed';

    const job = db.jobs.find((j) => j.id === escrow.jobId);
    if (job) job.status = 'completed';

    recalculateFreelancerStats(db, escrow.freelancerId);
    createNotification(
      escrow.freelancerId,
      'Escrow Payout Released',
      `${escrow.clientName} released $${escrow.netPayoutUsd.toLocaleString()} net payout for "${escrow.jobTitle}" (${escrow.gateway.toUpperCase()}).`,
      'payment',
      'dashboard'
    );
    logActivity(
      req.currentUser!.fullName,
      'Released escrow payout',
      `${escrow.freelancerName} · $${escrow.netPayoutUsd.toFixed(2)}`
    );
    saveDb(db);

    res.json({ escrow });
  });

  // Release Single Milestone Payout
  app.post('/api/escrow/:id/milestones/:milestoneId/release', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const escrow = db.escrows.find((e) => e.id === req.params.id);
    if (!escrow) {
      res.status(404).json({ error: 'Escrow contract not found.' });
      return;
    }
    if (req.currentUser!.role !== 'admin' && escrow.clientId !== req.currentUser!.id) {
      res.status(403).json({ error: 'Unauthorized to release milestone.' });
      return;
    }
    if (escrow.status !== 'funded') {
      res.status(400).json({ error: `Cannot release milestone when escrow is "${escrow.status}".` });
      return;
    }
    const milestone = (escrow.milestones || []).find((m) => m.id === req.params.milestoneId);
    if (!milestone) {
      res.status(404).json({ error: 'Milestone not found.' });
      return;
    }
    if (milestone.status === 'released') {
      res.json({ escrow });
      return;
    }
    const now = new Date().toISOString();
    milestone.status = 'released';
    milestone.releasedAt = now;

    const allReleased = (escrow.milestones || []).every((m) => m.status === 'released');
    if (allReleased) {
      escrow.status = 'released';
      escrow.releasedAt = now;
      const tx = db.transactions.find((t) => t.escrowId === escrow.id);
      if (tx) tx.status = 'released';
      const prop = db.proposals.find((p) => p.id === escrow.proposalId);
      if (prop) prop.status = 'completed';
      const job = db.jobs.find((j) => j.id === escrow.jobId);
      if (job) job.status = 'completed';
      recalculateFreelancerStats(db, escrow.freelancerId);
    }

    createNotification(
      escrow.freelancerId,
      'Milestone Payout Released',
      `${escrow.clientName} released $${milestone.netPayoutUsd.toLocaleString()} for "${milestone.title}".`,
      'payment',
      'dashboard'
    );
    logActivity(
      req.currentUser!.fullName,
      'Released milestone payout',
      `${milestone.title} · $${milestone.netPayoutUsd.toFixed(2)}`
    );
    saveDb(db);
    res.json({ escrow });
  });

  // Open Escrow Dispute
  app.post('/api/escrow/:id/dispute', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const escrow = db.escrows.find((e) => e.id === req.params.id);
    if (!escrow) {
      res.status(404).json({ error: 'Escrow contract not found.' });
      return;
    }
    const uid = req.currentUser!.id;
    if (req.currentUser!.role !== 'admin' && escrow.clientId !== uid && escrow.freelancerId !== uid) {
      res.status(403).json({ error: 'Only contract participants may open a dispute.' });
      return;
    }
    if (escrow.status !== 'funded') {
      res.status(400).json({ error: `Disputes can only be opened on active funded escrows.` });
      return;
    }
    const reason = String(req.body?.reason || '').trim();
    const details = String(req.body?.details || '').trim();
    if (!reason) {
      res.status(400).json({ error: 'Dispute reason is required.' });
      return;
    }
    escrow.status = 'disputed';
    escrow.dispute = {
      status: 'open',
      reason,
      details,
      raisedById: uid,
      raisedByName: req.currentUser!.fullName,
      createdAt: new Date().toISOString(),
    };
    const otherPartyId = uid === escrow.clientId ? escrow.freelancerId : escrow.clientId;
    createNotification(
      otherPartyId,
      'Escrow Dispute Opened',
      `${req.currentUser!.fullName} opened a dispute on "${escrow.jobTitle}": ${reason}`,
      'moderation',
      'dashboard'
    );
    logActivity(req.currentUser!.fullName, 'Opened escrow dispute', `${escrow.jobTitle} (${reason})`);
    saveDb(db);
    res.json({ escrow });
  });

  // Admin Resolve Escrow Dispute
  app.post('/api/admin/escrows/:id/resolve', requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const escrow = db.escrows.find((e) => e.id === req.params.id);
    if (!escrow) {
      res.status(404).json({ error: 'Escrow contract not found.' });
      return;
    }
    const outcome = req.body?.outcome === 'refund' ? 'refund' : 'release';
    const note = String(req.body?.resolutionNote || '').trim();
    const now = new Date().toISOString();

    escrow.status = outcome === 'refund' ? 'refunded' : 'released';
    escrow.releasedAt = now;
    if (Array.isArray(escrow.milestones)) {
      escrow.milestones.forEach((m) => {
        if (m.status === 'funded') {
          m.status = outcome === 'refund' ? 'refunded' : 'released';
          m.releasedAt = now;
        }
      });
    }
    escrow.dispute = {
      ...(escrow.dispute || { status: 'resolved' }),
      status: 'resolved',
      resolutionOutcome: outcome,
      resolutionNote: note || `Admin resolved dispute via ${outcome}.`,
      resolvedAt: now,
    };

    const tx = db.transactions.find((t) => t.escrowId === escrow.id);
    if (tx) tx.status = outcome === 'refund' ? 'failed' : 'released';

    if (outcome === 'release') {
      const prop = db.proposals.find((p) => p.id === escrow.proposalId);
      if (prop) prop.status = 'completed';
      recalculateFreelancerStats(db, escrow.freelancerId);
    }

    createNotification(
      escrow.clientId,
      `Escrow Dispute Resolved (${outcome.toUpperCase()})`,
      `Administration resolved the dispute for "${escrow.jobTitle}": ${escrow.dispute.resolutionNote}`,
      'payment',
      'dashboard'
    );
    createNotification(
      escrow.freelancerId,
      `Escrow Dispute Resolved (${outcome.toUpperCase()})`,
      `Administration resolved the dispute for "${escrow.jobTitle}": ${escrow.dispute.resolutionNote}`,
      'payment',
      'dashboard'
    );
    logActivity(
      req.currentUser!.fullName,
      `Resolved escrow dispute (${outcome})`,
      escrow.jobTitle
    );
    saveDb(db);
    res.json({ escrow });
  });

  // Interview Booking APIs
  app.get('/api/interviews', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const uid = req.currentUser!.id;
    const isAdmin = req.currentUser!.role === 'admin';
    const interviews = db.interviews.filter(
      (i) => isAdmin || i.clientId === uid || i.freelancerId === uid
    );
    res.json({ interviews });
  });

  app.post('/api/interviews', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    const freelancerId = String(b.freelancerId || '');
    const jobId = String(b.jobId || '');
    const scheduledAt = String(b.scheduledAt || '').trim();
    const durationMinutes = Math.max(15, Number(b.durationMinutes || 30));
    const meetingNotes = String(b.meetingNotes || '').trim();

    const freelancer = db.users.find((u) => u.id === freelancerId && u.role === 'freelancer');
    const job = db.jobs.find((j) => j.id === jobId);
    if (!freelancer || !scheduledAt) {
      res.status(400).json({ error: 'Freelancer and scheduled date/time are required.' });
      return;
    }

    const interview = {
      id: `int-${crypto.randomUUID().slice(0, 8)}`,
      jobId: job?.id || 'direct-brief',
      jobTitle: job?.title || String(b.jobTitle || 'Technical & Scope Interview'),
      clientId: req.currentUser!.id,
      clientName: req.currentUser!.fullName,
      companyName: req.currentUser!.companyName || req.currentUser!.fullName,
      freelancerId: freelancer.id,
      freelancerName: freelancer.fullName,
      scheduledAt,
      durationMinutes,
      meetingNotes: meetingNotes || 'Introductory project scope and availability discussion.',
      meetingLink: `https://meet.afro-lancers.com/${crypto.randomUUID().slice(0, 8)}`,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    };
    db.interviews.unshift(interview);
    createNotification(
      freelancer.id,
      'Interview Request Received',
      `${interview.companyName} scheduled a ${durationMinutes}-min interview for "${interview.jobTitle}".`,
      'interview',
      'dashboard'
    );
    logActivity(
      req.currentUser!.fullName,
      'Booked candidate interview',
      `${freelancer.fullName} · ${scheduledAt}`
    );
    saveDb(db);
    res.status(201).json({ interview });
  });

  app.post('/api/interviews/:id/respond', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const interview = db.interviews.find((i) => i.id === req.params.id);
    if (!interview) {
      res.status(404).json({ error: 'Interview booking not found.' });
      return;
    }
    const uid = req.currentUser!.id;
    if (req.currentUser!.role !== 'admin' && interview.freelancerId !== uid && interview.clientId !== uid) {
      res.status(403).json({ error: 'Unauthorized to update this interview.' });
      return;
    }
    const status = String(req.body?.status || 'confirmed') as
      | 'confirmed'
      | 'declined'
      | 'completed';
    if (!['confirmed', 'declined', 'completed'].includes(status)) {
      res.status(400).json({ error: 'Invalid interview status.' });
      return;
    }
    interview.status = status;
    const notifyUserId = uid === interview.freelancerId ? interview.clientId : interview.freelancerId;
    createNotification(
      notifyUserId,
      `Interview ${status}`,
      `${req.currentUser!.fullName} marked the interview for "${interview.jobTitle}" as ${status}.`,
      'interview',
      'dashboard'
    );
    saveDb(db);
    res.json({ interview });
  });

  // Project Management Tasks
  app.get('/api/projects/:proposalId/tasks', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const tasks = db.projectTasks.filter((t) => t.proposalId === req.params.proposalId);
    res.json({ tasks });
  });

  app.post('/api/projects/:proposalId/tasks', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const proposal = db.proposals.find((p) => p.id === req.params.proposalId);
    if (!proposal) {
      res.status(404).json({ error: 'Project contract/proposal not found.' });
      return;
    }
    const title = String(req.body?.title || '').trim();
    if (!title) {
      res.status(400).json({ error: 'Task title is required.' });
      return;
    }
    const task = {
      id: `task-${crypto.randomUUID().slice(0, 8)}`,
      jobId: proposal.jobId,
      proposalId: proposal.id,
      title,
      status: 'todo' as const,
      assigneeName: String(req.body?.assigneeName || proposal.freelancerName),
      dueDate: String(req.body?.dueDate || '2026-12-30'),
      updatedAt: new Date().toISOString(),
    };
    db.projectTasks.push(task);
    saveDb(db);
    res.status(201).json({ task });
  });

  app.patch('/api/projects/tasks/:taskId', requireAuth, (req: AuthedRequest, res) => {
    const db = getDb();
    const task = db.projectTasks.find((t) => t.id === req.params.taskId);
    if (!task) {
      res.status(404).json({ error: 'Project task not found.' });
      return;
    }
    if (req.body?.status && ['todo', 'in_progress', 'done'].includes(req.body.status)) {
      task.status = req.body.status;
      task.updatedAt = new Date().toISOString();
      saveDb(db);
    }
    res.json({ task });
  });

  // Hire Again (Client Past Freelancers)
  app.get('/api/client/past-freelancers', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const pastProposals = db.proposals.filter(
      (p) =>
        (req.currentUser!.role === 'admin' || p.clientId === req.currentUser!.id) &&
        (p.status === 'hired' || p.status === 'completed')
    );
    const seen = new Set<string>();
    const pastFreelancers: Array<{ freelancer: ReturnType<typeof sanitizeUser>; lastJobTitle: string; lastRate: number; completedDate: string }> = [];
    for (const p of pastProposals) {
      if (seen.has(p.freelancerId)) continue;
      const fl = db.users.find((u) => u.id === p.freelancerId);
      if (fl) {
        seen.add(p.freelancerId);
        pastFreelancers.push({
          freelancer: sanitizeUser(fl, false),
          lastJobTitle: p.jobTitle,
          lastRate: p.proposedRate,
          completedDate: p.createdAt,
        });
      }
    }
    res.json({ pastFreelancers });
  });

  // Client Team Accounts Management
  app.get('/api/client/team', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    const teamMembers =
      user?.teamMembers || [
        {
          id: `tm-${req.currentUser!.id}`,
          name: req.currentUser!.fullName,
          email: req.currentUser!.email,
          role: 'Owner' as const,
          status: 'active' as const,
          addedAt: req.currentUser!.createdAt,
        },
      ];
    res.json({ teamMembers });
  });

  app.post('/api/client/team', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const role = (req.body?.role || 'Hiring Manager') as
      | 'Owner'
      | 'Hiring Manager'
      | 'Finance Approver'
      | 'Reviewer';
    if (!name || !email) {
      res.status(400).json({ error: 'Team member name and email are required.' });
      return;
    }
    if (!Array.isArray(user.teamMembers)) {
      user.teamMembers = [
        {
          id: `tm-owner-${user.id}`,
          name: user.fullName,
          email: user.email,
          role: 'Owner',
          status: 'active',
          addedAt: user.createdAt,
        },
      ];
    }
    const member = {
      id: `tm-${crypto.randomUUID().slice(0, 8)}`,
      name,
      email,
      role,
      status: 'invited' as const,
      addedAt: new Date().toISOString(),
    };
    user.teamMembers.push(member);
    logActivity(user.fullName, 'Added team collaborator', `${name} (${role})`);
    saveDb(db);
    res.status(201).json({ member, teamMembers: user.teamMembers });
  });

  app.delete('/api/client/team/:memberId', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user || !Array.isArray(user.teamMembers)) {
      res.json({ teamMembers: [] });
      return;
    }
    user.teamMembers = user.teamMembers.filter((m) => m.id !== req.params.memberId);
    saveDb(db);
    res.json({ teamMembers: user.teamMembers });
  });

  // Business Advertising APIs
  app.get('/api/ads', (_req, res) => {
    const db = getDb();
    res.json({ ads: db.ads.filter((a) => a.status === 'active') });
  });

  app.post('/api/ads', requireRole('client', 'admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    const title = String(b.title || '').trim();
    const summary = String(b.summary || '').trim();
    if (!title || !summary) {
      res.status(400).json({ error: 'Ad headline and summary are required.' });
      return;
    }
    const ad = {
      id: `ad-${crypto.randomUUID().slice(0, 8)}`,
      advertiserId: req.currentUser!.id,
      advertiserName: req.currentUser!.companyName || req.currentUser!.fullName,
      title,
      summary,
      ctaLabel: String(b.ctaLabel || 'Learn More').trim(),
      targetUrl: String(b.targetUrl || '#how-it-works-section').trim(),
      category: String(b.category || req.currentUser!.businessCategory || 'Business Services').trim(),
      placement: (b.placement === 'directory' ? 'directory' : 'home') as 'home' | 'directory',
      status: 'active' as const,
      budgetUsd: Math.max(50, Number(b.budgetUsd || 150)),
      createdAt: new Date().toISOString(),
    };
    db.ads.unshift(ad);
    logActivity(req.currentUser!.fullName, 'Published business spotlight ad', title);
    saveDb(db);
    res.status(201).json({ ad });
  });

  app.patch('/api/admin/ads/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const ad = db.ads.find((a) => a.id === req.params.id);
    if (!ad) {
      res.status(404).json({ error: 'Ad campaign not found.' });
      return;
    }
    ad.status = req.body?.status === 'paused' ? 'paused' : 'active';
    saveDb(db);
    res.json({ ad });
  });

  // Freelancer Earnings Dashboard Analytics
  app.get('/api/freelancer/earnings', requireRole('freelancer'), (req: AuthedRequest, res) => {
    const db = getDb();
    const uid = req.currentUser!.id;
    const myEscrows = db.escrows.filter((e) => e.freelancerId === uid);
    const myProposals = db.proposals.filter((p) => p.freelancerId === uid);
    const completedProposals = myProposals.filter((p) => p.status === 'completed');

    const releasedEscrows = myEscrows.filter((e) => e.status === 'released');
    const fundedEscrows = myEscrows.filter((e) => e.status === 'funded' || e.status === 'disputed');

    const completedServiceOrders = db.serviceOrders.filter(
      (o) => o.sellerId === uid && o.status === 'completed'
    );
    const pendingServiceOrders = db.serviceOrders.filter(
      (o) => o.sellerId === uid && (o.status === 'in_progress' || o.status === 'delivered')
    );
    const serviceEarnedTotal = completedServiceOrders.reduce((sum, o) => sum + o.sellerNetUsd, 0);
    const servicePendingTotal = pendingServiceOrders.reduce((sum, o) => sum + o.sellerNetUsd, 0);

    const commissionRate = db.subscriptionSettings.commissionPercent / 100;
    const escrowReleasedTotal = releasedEscrows.reduce((sum, e) => sum + e.netPayoutUsd, 0);
    // Include seeded completed projects where no escrow record existed before gateway integration
    const unescrowedCompleted = completedProposals
      .filter((p) => !myEscrows.some((e) => e.proposalId === p.id))
      .reduce((sum, p) => sum + p.proposedRate * (1 - commissionRate), 0);

    const totalEarnedUsd = Number(
      (escrowReleasedTotal + unescrowedCompleted + serviceEarnedTotal).toFixed(2)
    );
    const pendingEscrowUsd = Number(
      (
        fundedEscrows.reduce((sum, e) => sum + e.netPayoutUsd, 0) +
        servicePendingTotal
      ).toFixed(2)
    );

    const acceptedCount = myProposals.filter((p) =>
      ['shortlisted', 'hired', 'completed'].includes(p.status)
    ).length;
    const acceptanceRatePercent =
      myProposals.length > 0 ? Math.round((acceptedCount / myProposals.length) * 100) : 0;

    const myReviews = db.reviews.filter((r) => r.freelancerId === uid);
    const averageReviewRating =
      myReviews.length > 0
        ? Number((myReviews.reduce((a, r) => a + r.rating, 0) / myReviews.length).toFixed(1))
        : null;

    const now = new Date();
    const monthlySeries = Array.from({ length: 6 }, (_, idx) => {
      const offset = 5 - idx;
      const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      const monthEarned =
        releasedEscrows
          .filter((e) => (e.releasedAt || e.createdAt).startsWith(monthKey))
          .reduce((sum, e) => sum + e.netPayoutUsd, 0) +
        completedProposals
          .filter(
            (p) =>
              p.createdAt.startsWith(monthKey) &&
              !myEscrows.some((e) => e.proposalId === p.id)
          )
          .reduce((sum, p) => sum + p.proposedRate * (1 - commissionRate), 0) +
        completedServiceOrders
          .filter((o) => (o.completedAt || o.createdAt).startsWith(monthKey))
          .reduce((sum, o) => sum + o.sellerNetUsd, 0);

      const monthPending =
        fundedEscrows
          .filter((e) => (e.fundedAt || e.createdAt).startsWith(monthKey))
          .reduce((sum, e) => sum + e.netPayoutUsd, 0) +
        pendingServiceOrders
          .filter((o) => (o.paidAt || o.createdAt).startsWith(monthKey))
          .reduce((sum, o) => sum + o.sellerNetUsd, 0);

      return {
        month: label,
        earnedUsd: Number(monthEarned.toFixed(2)),
        escrowPendingUsd: Number(monthPending.toFixed(2)),
      };
    });

    res.json({
      totalEarnedUsd,
      pendingEscrowUsd,
      completedProjectsCount: completedProposals.length + completedServiceOrders.length,
      proposalsSubmittedCount: myProposals.length,
      acceptanceRatePercent,
      averageReviewRating,
      reviewsCount: myReviews.length,
      commissionPercent: db.subscriptionSettings.commissionPercent,
      monthlySeries,
      recentReviews: myReviews,
    });
  });

  // AI Career Assistant (@google/genai with gemini-4-hydrogen)
  app.post('/api/ai/career-assistant', requireAuth, async (req: AuthedRequest, res) => {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured in environment secrets. Add your Gemini API key in Secrets to activate the AI Career Assistant.',
      });
      return;
    }

    const b = req.body || {};
    const mode = String(b.mode || 'profile_review') as AiCareerMode;
    const validModes: AiCareerMode[] = ['cv', 'profile_review', 'proposal', 'pricing', 'interview_prep'];
    if (!validModes.includes(mode)) {
      res.status(400).json({ error: 'Invalid AI Career Assistant mode.' });
      return;
    }

    const db = getDb();
    const user = db.users.find((u) => u.id === req.currentUser!.id);
    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    const job = b.jobId ? db.jobs.find((j) => j.id === String(b.jobId)) : undefined;
    const targetRole = String(b.targetRole || user.title || user.category || 'Freelance Specialist').trim();
    const projectScope = String(b.projectScope || '').trim();
    const notes = String(b.notes || '').trim();

    const profileContext = [
      `Name: ${user.fullName}`,
      `Country & City: ${user.city ? `${user.city}, ` : ''}${user.country}`,
      `Timezone: ${user.timezone || 'UTC+2'}`,
      `Languages: ${(user.languages || ['English']).join(', ')}`,
      `Headline: ${user.title || 'Independent Specialist'}`,
      `Category: ${user.category || 'General'}`,
      `Experience Level: ${user.experienceLevel || 'Senior'} (${user.yearsExperience || 5} years)`,
      `Current Hourly Rate: $${user.hourlyRate || 45}/hr`,
      `Skills: ${(user.skills || []).join(', ')}`,
      `Bio: ${user.bio || ''}`,
      `Portfolio Entries: ${(user.portfolioItems || []).map((p) => `${p.title} - ${p.summary}`).join('; ')}`,
    ].join('\n');

    const jobContext = job
      ? `\nTarget Job Brief:\nTitle: ${job.title}\nClient: ${job.companyName}\nCategory: ${job.category}\nBudget: $${job.budgetMin}-$${job.budgetMax} (${job.budgetType})\nRequired Skills: ${job.skillsRequired.join(', ')}\nDescription: ${job.description}`
      : '';

    const taskPrompts: Record<AiCareerMode, string> = {
      cv: `Create an authoritative, ATS-ready international freelance CV / Executive Resume formatted cleanly with clear sections (Executive Summary, Core Competencies, Selected Deliverables & Impact, Certifications & Languages) tailored for "${targetRole}". Incorporate real facts from the freelancer's profile.`,
      profile_review: `Audit the freelancer's marketplace profile and provide: (1) Three high-impact improvements to increase international enterprise client conversion, (2) A sharper rewritten professional headline & 3-sentence bio, and (3) Missing high-value skills or portfolio proof points.`,
      proposal: `Draft a crisp, persuasive client-ready freelance proposal covering: Problem Understanding, Proposed Architecture / Delivery Plan, Milestone Breakdown, and Why This Freelancer Fits. Keep tone executive, confident, and free of fluff.`,
      pricing: `Calculate and justify a structured project pricing recommendation (Fixed-Price Option + Hourly Retainer Option + 2-3 Milestone Payment Split) considering Afro-lancers.com's 5% platform fee, the freelancer's $${user.hourlyRate || 45}/hr baseline, experience level, and the project scope provided.`,
      interview_prep: `Generate a focused interview preparation guide: 5 realistic technical/client discovery questions likely asked by international hiring managers for this brief/role, concise winning answer frameworks grounded in the freelancer's experience, and 3 smart questions the freelancer should ask the client.`,
    };

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${taskPrompts[mode]}\n\nFreelancer Profile Context:\n${profileContext}${jobContext}${
          projectScope ? `\nProject Scope / Pricing Context:\n${projectScope}` : ''
        }${notes ? `\nAdditional Notes:\n${notes}` : ''}`,
        config: {
          systemInstruction:
            'You are a senior career strategist and international client acquisition coach on Afro-lancers.com. Write crisp, practical, high-trust business advice tailored for African and global remote professionals. Use clean headings and bullet points.',
        },
      });

      const text = (response.text || '').trim();
      if (!text) {
        res.status(502).json({ error: 'Gemini returned an empty response. Please try again.' });
        return;
      }

      if (user.role === 'freelancer') {
        user.activityStreakWeeks = Math.max(1, user.activityStreakWeeks || 1);
        user.lastActiveAt = new Date().toISOString();
        saveDb(db);
      }

      res.json({
        mode,
        content: text,
      });
    } catch (err) {
      res.status(502).json({
        error:
          err instanceof Error
            ? `AI Career Assistant request failed: ${err.message}`
            : 'Unable to reach Gemini AI service.',
      });
    }
  });

  // Admin Portal APIs
  app.get('/api/admin/overview', requireRole('admin'), (_req, res) => {
    const db = getDb();
    res.json({
      stats: computePlatformStats(db),
      users: db.users.map((u) => sanitizeUser(u, true)),
      jobs: db.jobs.map((j) => ({
        ...j,
        applicationCount: db.proposals.filter((p) => p.jobId === j.id).length,
      })),
      proposals: db.proposals,
      categories: computeCategoriesWithCounts(db),
      reports: db.reports,
      activityLog: db.activityLog,
      subscriptionSettings: db.subscriptionSettings,
      gateways: getPaymentGatewaysInfo(),
      transactions: db.transactions,
      escrows: db.escrows,
      services: db.services,
      serviceOrders: db.serviceOrders,
      ads: db.ads,
      interviews: db.interviews,
    });
  });

  app.patch('/api/admin/users/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const b = req.body || {};
    if (b.status === 'active' || b.status === 'suspended') user.status = b.status;
    if (typeof b.verifiedProfile === 'boolean') user.verifiedProfile = b.verifiedProfile;
    if (typeof b.identityVerified === 'boolean') user.identityVerified = b.identityVerified;
    if (typeof b.skillsVerified === 'boolean') user.skillsVerified = b.skillsVerified;
    if (typeof b.isFeaturedProfile === 'boolean') user.isFeaturedProfile = b.isFeaturedProfile;
    if (typeof b.risingTalent === 'boolean') user.risingTalent = b.risingTalent;
    if (typeof b.freelancerOfTheMonth === 'boolean') {
      if (b.freelancerOfTheMonth) {
        db.users.forEach((other) => {
          other.freelancerOfTheMonth = false;
        });
      }
      user.freelancerOfTheMonth = b.freelancerOfTheMonth;
    }
    if (Array.isArray(b.certifiedSkills)) {
      user.certifiedSkills = b.certifiedSkills.map(String).filter(Boolean);
    }
    if (Array.isArray(b.achievementBadges)) {
      user.achievementBadges = b.achievementBadges.map(String).filter(Boolean);
    }
    if (b.subscriptionTier) user.subscriptionTier = b.subscriptionTier;
    logActivity(req.currentUser!.fullName, 'Updated user account', `${user.fullName} (${user.status})`);
    saveDb(db);
    res.json({ user: sanitizeUser(user, true) });
  });

  app.patch('/api/admin/jobs/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const job = db.jobs.find((j) => j.id === req.params.id);
    if (!job) {
      res.status(404).json({ error: 'Job listing not found.' });
      return;
    }
    const b = req.body || {};
    if (b.status) job.status = b.status;
    if (typeof b.isFeatured === 'boolean') job.isFeatured = b.isFeatured;
    logActivity(req.currentUser!.fullName, `Set job status to ${job.status}`, job.title);
    saveDb(db);
    res.json({ job });
  });

  app.post('/api/admin/categories', requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const name = String(req.body?.name || '').trim();
    const description = String(req.body?.description || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const cat = {
      id: `cat-${crypto.randomUUID().slice(0, 6)}`,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: description || `Specialist services in ${name}.`,
      iconKey: String(req.body?.iconKey || 'Briefcase'),
      freelancerCount: 0,
    };
    db.categories.push(cat);
    logActivity(req.currentUser!.fullName, 'Added marketplace category', name);
    saveDb(db);
    res.status(201).json({ category: cat });
  });

  app.delete('/api/admin/categories/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const target = db.categories.find((c) => c.id === req.params.id);
    db.categories = db.categories.filter((c) => c.id !== req.params.id);
    if (target) {
      logActivity(req.currentUser!.fullName, 'Removed category', target.name);
    }
    saveDb(db);
    res.json({ ok: true });
  });

  app.patch('/api/admin/reports/:id', requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const report = db.reports.find((r) => r.id === req.params.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    report.status = req.body?.status === 'dismissed' ? 'dismissed' : 'resolved';
    logActivity(req.currentUser!.fullName, `Marked report ${report.status}`, report.targetLabel);
    saveDb(db);
    res.json({ report });
  });

  app.post('/api/admin/subscriptions', requireRole('admin'), (req: AuthedRequest, res) => {
    const db = getDb();
    const b = req.body || {};
    db.subscriptionSettings = {
      commissionPercent: Math.min(30, Math.max(0, Number(b.commissionPercent ?? db.subscriptionSettings.commissionPercent))),
      serviceCommissionPercent: Math.min(30, Math.max(0, Number(b.serviceCommissionPercent ?? db.subscriptionSettings.serviceCommissionPercent ?? 10))),
      freelancerProMonthlyUsd: Math.max(0, Number(b.freelancerProMonthlyUsd ?? db.subscriptionSettings.freelancerProMonthlyUsd)),
      clientEnterpriseMonthlyUsd: Math.max(0, Number(b.clientEnterpriseMonthlyUsd ?? db.subscriptionSettings.clientEnterpriseMonthlyUsd)),
      featuredJobUsd: Math.max(0, Number(b.featuredJobUsd ?? db.subscriptionSettings.featuredJobUsd ?? 29)),
      featuredProfileUsd: Math.max(0, Number(b.featuredProfileUsd ?? db.subscriptionSettings.featuredProfileUsd ?? 25)),
    };
    logActivity(
      req.currentUser!.fullName,
      'Updated commission & plan settings',
      `${db.subscriptionSettings.commissionPercent}% escrow · ${db.subscriptionSettings.serviceCommissionPercent}% services`
    );
    saveDb(db);
    res.json({ subscriptionSettings: db.subscriptionSettings });
  });

  app.get('/api/admin/export', requireRole('admin'), (_req, res) => {
    const db = getDb();
    const report = {
      generatedAt: new Date().toISOString(),
      platform: 'Afro-lancers.com',
      stats: computePlatformStats(db),
      subscriptionSettings: db.subscriptionSettings,
      totals: {
        freelancers: db.users.filter((u) => u.role === 'freelancer').length,
        clients: db.users.filter((u) => u.role === 'client').length,
        jobs: db.jobs.length,
        proposals: db.proposals.length,
        reviews: db.reviews.length,
        openReports: db.reports.filter((r) => r.status === 'open').length,
      },
      categories: computeCategoriesWithCounts(db),
    };
    res.setHeader('Content-Disposition', 'attachment; filename="afro-lancers-report.json"');
    res.json(report);
  });

  // Frontend serving (Vite dev middleware in dev, static dist in production)
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Afro-lancers.com server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
