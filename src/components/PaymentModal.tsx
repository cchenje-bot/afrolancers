import React, { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, ExternalLink, Lock, ShieldCheck, Smartphone, X } from 'lucide-react';
import { api } from '../lib/api';
import type {
  PaymentGatewayId,
  PaymentGatewayInfo,
  PaymentTransaction,
  PublicUser,
  SubscriptionSettings,
  SubscriptionTier,
} from '../types';

export interface PaymentModalContext {
  purpose: 'escrow' | 'subscription' | 'featured_job' | 'featured_profile';
  title: string;
  subtitle: string;
  amountUsd: number;
  proposalId?: string;
  jobId?: string;
  targetTier?: SubscriptionTier;
}

interface PaymentModalProps {
  context: PaymentModalContext;
  userPhone?: string;
  onClose: () => void;
  onCompleted: (tx: PaymentTransaction, updatedUser?: PublicUser) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  context,
  userPhone = '',
  onClose,
  onCompleted,
}) => {
  const [gateways, setGateways] = useState<PaymentGatewayInfo[]>([]);
  const [subSettings, setSubSettings] = useState<SubscriptionSettings>({
    commissionPercent: 5,
    freelancerProMonthlyUsd: 19,
    clientEnterpriseMonthlyUsd: 79,
    featuredJobUsd: 29,
    featuredProfileUsd: 25,
  });
  const [loadingGateways, setLoadingGateways] = useState(true);

  const [selectedGateway, setSelectedGateway] = useState<PaymentGatewayId>('paynow');
  const [paynowMethod, setPaynowMethod] = useState<'ecocash' | 'onemoney' | 'innbucks' | 'web'>(
    'ecocash'
  );
  const [currency, setCurrency] = useState('USD');
  const [phone, setPhone] = useState(userPhone === 'Not provided' ? '' : userPhone);

  const [useSplitMilestones, setUseSplitMilestones] = useState(true);
  const halfOne = Math.round(context.amountUsd * 0.5);
  const halfTwo = Math.max(1, context.amountUsd - halfOne);
  const [milestone1Title, setMilestone1Title] = useState('Phase 1: Kickoff & Architecture');
  const [milestone2Title, setMilestone2Title] = useState('Phase 2: Final Delivery & Handover');

  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTx, setActiveTx] = useState<PaymentTransaction | null>(null);

  useEffect(() => {
    api
      .getPaymentGateways()
      .then((res) => {
        setGateways(res.gateways);
        setSubSettings(res.subscriptionSettings);
      })
      .catch(() => {})
      .finally(() => setLoadingGateways(false));
  }, []);

  const currentGatewayInfo = gateways.find((g) => g.id === selectedGateway);
  const feeAmount =
    context.purpose === 'escrow'
      ? Number(((context.amountUsd * subSettings.commissionPercent) / 100).toFixed(2))
      : context.amountUsd;
  const freelancerNet =
    context.purpose === 'escrow' ? Number((context.amountUsd - feeAmount).toFixed(2)) : 0;

  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (
      selectedGateway === 'paynow' &&
      paynowMethod !== 'web' &&
      (!phone.trim() || phone.trim().length < 7)
    ) {
      setError('Enter your EcoCash / OneMoney / InnBucks mobile number to receive the prompt.');
      return;
    }

    setSubmitting(true);
    try {
      const paymentMethod =
        selectedGateway === 'paynow'
          ? paynowMethod
          : selectedGateway === 'flutterwave'
            ? 'mobile_or_card'
            : 'card';

      const milestonesPayload =
        context.purpose === 'escrow'
          ? useSplitMilestones
            ? [
                { title: milestone1Title.trim() || 'Phase 1 Milestone', amountUsd: halfOne },
                { title: milestone2Title.trim() || 'Phase 2 Final Delivery', amountUsd: halfTwo },
              ]
            : [{ title: 'Full Contract Completion', amountUsd: context.amountUsd }]
          : undefined;

      const res = await api.initiatePayment({
        purpose: context.purpose,
        gateway: selectedGateway,
        paymentMethod,
        currency,
        phone: phone.trim() || undefined,
        proposalId: context.proposalId,
        jobId: context.jobId,
        amountUsd: context.amountUsd,
        targetTier: context.targetTier,
        milestones: milestonesPayload,
      });
      setActiveTx(res.transaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to initiate payment.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOrConfirm = async () => {
    if (!activeTx) return;
    setError(null);
    setVerifying(true);
    try {
      const res = await api.verifyPayment(activeTx.id);
      if (res.pending) {
        setError(res.message || 'Payment confirmation still pending on gateway.');
        return;
      }
      onCompleted(res.transaction, res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg bg-white dark:bg-[#1E2621] text-[#141715] dark:text-[#EDF2EE] focus:outline-none focus:border-[#075B35] dark:focus:border-[#34D399]';

  const summaryLabel =
    context.purpose === 'escrow'
      ? 'Escrow Deposit Total'
      : context.purpose === 'featured_job'
        ? 'Featured Job Boost'
        : context.purpose === 'featured_profile'
          ? 'Featured Profile Promotion'
          : 'Subscription Amount';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Payment Gateway Checkout"
    >
      <div className="bg-white dark:bg-[#171D19] text-[#141715] dark:text-[#EDF2EE] rounded-2xl border border-[#E2E6E3] dark:border-[#2A352E] w-full max-w-xl shadow-2xl overflow-hidden my-8">
        <div className="px-6 py-4 bg-[#101010] text-white flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4ADE80]">
              Protected Marketplace Checkout
            </p>
            <h2 className="font-display text-lg font-bold">{context.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close payment modal"
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Amount & Breakdown Summary */}
          <div className="p-4 rounded-xl bg-[#F4F6F4] dark:bg-[#1E2621] border border-[#E2E6E3] dark:border-[#2A352E] space-y-2">
            <p className="text-xs font-medium text-[#141715]/75 dark:text-[#B4C0B8]">
              {context.subtitle}
            </p>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#141715]/70 dark:text-[#B4C0B8]">
                {summaryLabel}
              </span>
              <span className="font-mono-num text-2xl font-extrabold text-[#075B35] dark:text-[#34D399]">
                ${context.amountUsd.toLocaleString()} {currency}
              </span>
            </div>
            {context.purpose === 'escrow' && (
              <div className="pt-2 border-t border-[#E2E6E3] dark:border-[#2A352E] space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-[#141715]/70 dark:text-[#B4C0B8]">
                    Platform Commission ({subSettings.commissionPercent}%):{' '}
                    <strong className="font-mono-num text-[#141715] dark:text-[#EDF2EE]">
                      ${feeAmount.toLocaleString()}
                    </strong>
                  </span>
                  <span className="text-right text-[#141715]/70 dark:text-[#B4C0B8]">
                    Freelancer Net Release:{' '}
                    <strong className="font-mono-num text-[#075B35] dark:text-[#34D399]">
                      ${freelancerNet.toLocaleString()}
                    </strong>
                  </span>
                </div>

                {!activeTx && (
                  <div className="pt-2 border-t border-[#E2E6E3]/70 dark:border-[#2A352E] space-y-2">
                    <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useSplitMilestones}
                        onChange={(e) => setUseSplitMilestones(e.target.checked)}
                        className="w-3.5 h-3.5 accent-[#075B35]"
                      />
                      Release in 2 Agreed Escrow Milestones (50% / 50%)
                    </label>
                    {useSplitMilestones && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={milestone1Title}
                          onChange={(e) => setMilestone1Title(e.target.value)}
                          placeholder="Milestone 1"
                          className="px-2.5 py-1.5 text-xs border border-[#E2E6E3] dark:border-[#2A352E] rounded bg-white dark:bg-[#171D19]"
                        />
                        <input
                          type="text"
                          value={milestone2Title}
                          onChange={(e) => setMilestone2Title(e.target.value)}
                          placeholder="Milestone 2"
                          className="px-2.5 py-1.5 text-xs border border-[#E2E6E3] dark:border-[#2A352E] rounded bg-white dark:bg-[#171D19]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#E52525]/10 border border-[#E52525]/35 text-xs font-medium text-[#E52525]">
              {error}
            </div>
          )}

          {!activeTx ? (
            <form onSubmit={handleInitiate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2">
                  Select Payment Gateway
                </label>
                {loadingGateways ? (
                  <p className="text-xs text-[#141715]/60 dark:text-[#B4C0B8]">
                    Loading active payment providers...
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {gateways.map((gw) => {
                      const active = selectedGateway === gw.id;
                      return (
                        <button
                          key={gw.id}
                          type="button"
                          onClick={() => {
                            setSelectedGateway(gw.id);
                            setCurrency(gw.currencies[0] || 'USD');
                          }}
                          className={`p-3.5 rounded-xl border text-left transition-colors ${
                            active
                              ? 'border-[#075B35] dark:border-[#34D399] bg-[#075B35]/[0.05] dark:bg-[#34D399]/[0.08]'
                              : 'border-[#E2E6E3] dark:border-[#2A352E] hover:border-[#075B35]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-bold">{gw.name}</span>
                            <span
                              className={`text-[10px] font-semibold uppercase ${
                                gw.configured
                                  ? 'text-[#008C45] dark:text-[#34D399]'
                                  : 'text-[#141715]/55 dark:text-[#B4C0B8]'
                              }`}
                            >
                              {gw.configured ? 'Live API' : 'Sandbox'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#075B35] dark:text-[#34D399] font-medium mt-0.5">
                            {gw.region}
                          </p>
                          <p className="text-[11px] text-[#141715]/70 dark:text-[#B4C0B8] mt-1 leading-snug">
                            {gw.methods.join(' · ')}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Paynow Specific Options */}
              {selectedGateway === 'paynow' && (
                <div className="p-4 rounded-xl border border-[#075B35]/30 dark:border-[#34D399]/30 bg-[#075B35]/[0.03] dark:bg-[#34D399]/[0.04] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-[#075B35] dark:text-[#34D399]">
                      <Smartphone className="w-4 h-4" />
                      Paynow Payment Channel
                    </span>
                    <span className="text-[11px] text-[#141715]/65 dark:text-[#B4C0B8]">
                      EcoCash · OneMoney · InnBucks · Cards
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'ecocash', label: 'EcoCash' },
                      { id: 'onemoney', label: 'OneMoney' },
                      { id: 'innbucks', label: 'InnBucks' },
                      { id: 'web', label: 'Visa / Card Web' },
                    ].map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() =>
                          setPaynowMethod(ch.id as 'ecocash' | 'onemoney' | 'innbucks' | 'web')
                        }
                        className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                          paynowMethod === ch.id
                            ? 'bg-[#075B35] text-white border-[#075B35]'
                            : 'bg-white dark:bg-[#171D19] border-[#E2E6E3] dark:border-[#2A352E]'
                        }`}
                      >
                        {ch.label}
                      </button>
                    ))}
                  </div>

                  {paynowMethod !== 'web' && (
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Mobile Wallet Number (e.g. 0772 123 456)
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+263 77 212 3456"
                        className={`${inputClass} font-mono-num`}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Currency */}
              {currentGatewayInfo && currentGatewayInfo.currencies.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Settlement Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={inputClass}
                  >
                    {currentGatewayInfo.currencies.map((cur) => (
                      <option key={cur} value={cur}>
                        {cur}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {currentGatewayInfo && !currentGatewayInfo.configured && (
                <p className="text-[11px] text-[#141715]/70 dark:text-[#B4C0B8] leading-relaxed">
                  Gateway status: <strong>Sandbox Evaluation Mode</strong> (live{' '}
                  {currentGatewayInfo.name} environment keys are not configured yet). You can test
                  the complete escrow funding and release workflow safely with instant sandbox
                  verification.
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold border border-[#E2E6E3] dark:border-[#2A352E] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-bold rounded-lg inline-flex items-center gap-2 disabled:opacity-60"
                >
                  <CreditCard className="w-4 h-4" />
                  {submitting
                    ? 'Initiating...'
                    : `Proceed with ${currentGatewayInfo?.name || 'Paynow'}`}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-[#075B35]/35 dark:border-[#34D399]/35 bg-[#075B35]/[0.04] dark:bg-[#34D399]/[0.06] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold uppercase text-[#075B35] dark:text-[#34D399]">
                    {activeTx.gateway.toUpperCase()} · {activeTx.paymentMethod.toUpperCase()}
                  </span>
                  <span className="font-mono-num text-[#141715]/70 dark:text-[#B4C0B8]">
                    Ref: {activeTx.reference}
                  </span>
                </div>
                <p className="text-sm font-bold">
                  {activeTx.isSandbox
                    ? 'Sandbox Payment Ready for Confirmation'
                    : 'Gateway Session Initiated — Complete Authorization'}
                </p>
                {activeTx.paynowInstructions && (
                  <p className="text-xs text-[#141715]/80 dark:text-[#B4C0B8] leading-relaxed">
                    {activeTx.paynowInstructions}
                  </p>
                )}
                {activeTx.isSandbox && (
                  <p className="text-xs text-[#141715]/75 dark:text-[#B4C0B8] leading-relaxed">
                    Confirm below to simulate a settled{' '}
                    <span className="uppercase font-semibold">{activeTx.gateway}</span>{' '}
                    transaction and lock funds into project escrow.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {activeTx.checkoutUrl && (
                  <a
                    href={activeTx.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-[#101010] dark:bg-[#1E2621] text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5"
                  >
                    Open {activeTx.gateway.toUpperCase()} Checkout
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  disabled={verifying}
                  onClick={handleVerifyOrConfirm}
                  className="px-5 py-2.5 bg-[#008C45] hover:bg-[#075B35] text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {verifying
                    ? 'Verifying Settlement...'
                    : activeTx.isSandbox
                      ? 'Confirm Sandbox Settlement'
                      : 'Verify Payment Status'}
                </button>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-[#E2E6E3] dark:border-[#2A352E] flex items-center justify-between text-[11px] text-[#141715]/60 dark:text-[#B4C0B8]">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#075B35] dark:text-[#34D399]" />
              Server-signed gateway initiation
            </span>
            <span className="inline-flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Milestone Escrow Protected
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
