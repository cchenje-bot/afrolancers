import React, { useState } from 'react';
import { X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import type { AppView } from './Header';

interface FooterProps {
  onNavigate: (view: AppView, anchorId?: string) => void;
  onOpenAuth: (mode: 'login' | 'register', role?: 'freelancer' | 'client') => void;
}

const INFO_PAGES: Record<string, { title: string; body: string[] }> = {
  'About Us': {
    title: 'About Afro-lancers.com',
    body: [
      'Afro-lancers.com is an African-focused digital talent marketplace built to connect skilled professionals across the African continent with businesses, institutions, and international clients.',
      'Our platform prioritizes transparent project briefs, structured capability portfolios, and direct client-to-freelancer collaboration.',
    ],
  },
  'Our Mission': {
    title: 'Our Mission',
    body: [
      'Africa is home to one of the fastest-growing pools of engineering, financial, creative, and operational talent in the world.',
      'Our mission is to provide serious African professionals with an international-grade showcase where skill, reliability, and measurable outcomes speak first.',
    ],
  },
  'Contact Us': {
    title: 'Contact Afro-lancers.com',
    body: [
      'General & Enterprise Inquiries: hello@afro-lancers.com',
      'Trust & Marketplace Moderation: moderation@afro-lancers.com',
      'Regional Operations Hubs: Nairobi · Lagos · Accra · Johannesburg · Kigali',
    ],
  },
  Careers: {
    title: 'Careers at Afro-lancers.com',
    body: [
      'We operate as a remote-first pan-African technology organization. Open roles in engineering, marketplace trust, and enterprise partnerships are posted directly on our platform job board.',
    ],
  },
  'Freelancer Resources': {
    title: 'Freelancer Success Resources',
    body: [
      '1. Lead with measurable outcomes in your profile biography and portfolio summaries.',
      '2. Specify realistic fixed-price milestones or hourly rates aligned to your experience tier.',
      '3. Keep your availability status current so international clients can shortlist you immediately.',
    ],
  },
  'Employer Resources': {
    title: 'Employer & Client Hiring Guide',
    body: [
      '1. Write clear project briefs with defined deliverables, required skills, and application deadlines.',
      '2. Compare shortlisted candidates by reviewing past project portfolios and verified client feedback.',
      '3. Use direct platform messaging to align on timelines before confirming a hire.',
    ],
  },
  'Help Centre': {
    title: 'Help Centre',
    body: [
      'Need assistance with registration, password recovery, posting a project, or submitting a proposal? Sign in to access your role dashboard or contact moderation@afro-lancers.com.',
    ],
  },
  FAQs: {
    title: 'Frequently Asked Questions',
    body: [
      'How do I join as a freelancer? Click "Sign Up", choose "I’m Looking for Work", and complete your professional profile and portfolio.',
      'How do businesses hire? Register under "I’m Looking to Hire", post a project brief, review incoming proposals, or invite shortlisted professionals directly.',
      'Are statistics and ratings real? Platform counts reflect live records in the marketplace database, and ratings appear only once verified project reviews are submitted.',
    ],
  },
  'Terms & Conditions': {
    title: 'Terms & Conditions',
    body: [
      'All freelancers and clients agree to provide accurate identity, professional capability, and project budget details. Misrepresentation, spam solicitations, or off-platform abuse may result in account suspension by administration.',
    ],
  },
  'Privacy Policy': {
    title: 'Privacy Policy',
    body: [
      'Contact details such as private email addresses and phone numbers are protected for account authentication and administrative governance and are not exposed on public talent cards.',
    ],
  },
};

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenAuth }) => {
  const [modalKey, setModalKey] = useState<string | null>(null);

  const openInfo = (key: string) => {
    setModalKey(key);
  };

  return (
    <footer className="bg-[#101010] text-white border-t-4 border-[#075B35]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <BrandLogo variant="dark" />
            <p className="text-sm text-white/75 leading-relaxed max-w-sm">
              Connecting Africa’s independent professionals with forward-thinking businesses,
              entrepreneurs, and global organizations.
            </p>
            <p className="text-xs font-semibold text-[#4ADE80] tracking-wide">
              Afro-lancers.com – African Talent. Global Opportunities.
            </p>
          </div>

          {/* About Afro-lancers */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">
              About Afro-lancers
            </h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              {['About Us', 'Our Mission', 'Contact Us', 'Careers'].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => openInfo(item)}
                    className="hover:text-white transition-colors"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* For Freelancers */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">For Freelancers</h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('find-work')}
                  className="hover:text-white transition-colors"
                >
                  Find Work
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register', 'freelancer')}
                  className="hover:text-white transition-colors"
                >
                  Create Profile
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openInfo('Freelancer Resources')}
                  className="hover:text-white transition-colors"
                >
                  Freelancer Resources
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home', 'testimonials-section')}
                  className="hover:text-white transition-colors"
                >
                  Success Stories
                </button>
              </li>
            </ul>
          </div>

          {/* For Clients */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">For Clients</h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('hire')}
                  className="hover:text-white transition-colors"
                >
                  Hire Freelancers
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onOpenAuth('register', 'client')}
                  className="hover:text-white transition-colors"
                >
                  Post a Job
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('hire')}
                  className="hover:text-white transition-colors"
                >
                  Browse Talent
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openInfo('Employer Resources')}
                  className="hover:text-white transition-colors"
                >
                  Employer Resources
                </button>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-display text-sm font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-2.5 text-sm text-white/70">
              {[
                'Help Centre',
                'FAQs',
                'Contact Support',
                'Terms & Conditions',
                'Privacy Policy',
              ].map((item) => (
                <li key={item}>
                  <button
                    type="button"
                    onClick={() => openInfo(item === 'Contact Support' ? 'Contact Us' : item)}
                    className="hover:text-white transition-colors"
                  >
                    {item}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Afro-lancers.com. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-5">
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              LinkedIn
            </a>
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Instagram
            </a>
            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              Facebook
            </a>
            <a
              href="https://www.tiktok.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              TikTok
            </a>
            <a
              href="https://www.youtube.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              YouTube
            </a>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {modalKey && INFO_PAGES[modalKey] && (
        <div
          className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white dark:bg-[#171D19] text-[#141715] dark:text-[#EDF2EE] max-w-lg w-full rounded-xl border border-[#E2E6E3] dark:border-[#2A352E] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2E6E3] dark:border-[#2A352E]">
              <h3 className="font-display text-lg font-bold">{INFO_PAGES[modalKey].title}</h3>
              <button
                type="button"
                onClick={() => setModalKey(null)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-[#F4F6F4] dark:hover:bg-[#1E2621]"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-[#141715]/85 dark:text-[#B4C0B8] leading-relaxed">
              {INFO_PAGES[modalKey].body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setModalKey(null)}
                className="px-4 py-2 text-sm font-semibold bg-[#075B35] text-white rounded-lg hover:bg-[#008C45]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
