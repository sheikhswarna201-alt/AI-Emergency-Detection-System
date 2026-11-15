import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  BellRing,
  Check,
  Clock,
  MapPin,
  PhoneCall,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  X,
} from 'lucide-react';
import {
  ActiveNotification,
  AlertIncident,
  EmergencyContact,
  SystemStatus,
} from '../types/monitoring';

interface ContactsAndNotificationProps {
  contacts: EmergencyContact[];
  activeNotification: ActiveNotification | null;
  activeIncident: AlertIncident | null;
  systemStatus: SystemStatus;
  onToggleAvailability: (contactId: string) => void;
  onAcceptNotification: () => void;
  onDeclineNotification: () => void;
  onRetryEscalation: () => void;
  isDemoRunning: boolean;
}

const RESPONSE_STATUS_META: Record<
  EmergencyContact['responseStatus'],
  { label: string; tone: string }
> = {
  standby: { label: 'Standby', tone: 'text-[#AAB6CC]' },
  notified: { label: 'Notified', tone: 'text-[#F59E0B] font-semibold' },
  accepted: { label: 'Responding', tone: 'text-[#10B981] font-semibold' },
  unavailable: { label: 'Unavailable', tone: 'text-[#7C8BA5]' },
  timed_out: { label: 'No Response', tone: 'text-[#EF4444] font-semibold' },
};

export const ContactsAndNotification: React.FC<ContactsAndNotificationProps> = ({
  contacts,
  activeNotification,
  activeIncident,
  systemStatus,
  onToggleAvailability,
  onAcceptNotification,
  onDeclineNotification,
  onRetryEscalation,
  isDemoRunning,
}) => {
  const prioritizedContacts = [...contacts].sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    return a.etaMinutes - b.etaMinutes;
  });

  const topAvailableId =
    prioritizedContacts.find(
      (c) =>
        c.available &&
        c.responseStatus !== 'unavailable' &&
        c.responseStatus !== 'timed_out'
    )?.id || null;

  let availableRank = 0;

  return (
    <section
      id="responder-coordination"
      aria-labelledby="contact-prioritization-heading"
      className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch"
    >
      {/* Left: Contact Prioritization */}
      <div className="xl:col-span-6 rounded-xl bg-[#111A30] border border-[#263657] shadow-lg shadow-black/20 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2
              id="contact-prioritization-heading"
              className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight"
            >
              Contact Prioritization
            </h2>
            <p className="text-[12px] sm:text-[13px] text-[#AAB6CC] mt-1">
              Simulated responders ordered by availability and shortest estimated response time.
            </p>
          </div>

          <div className="space-y-3">
            {prioritizedContacts.map((contact) => {
              const rank = contact.available ? ++availableRank : null;
              const statusMeta = RESPONSE_STATUS_META[contact.responseStatus];
              const isNotified = activeNotification?.contactId === contact.id;
              const isResponding = contact.responseStatus === 'accepted';
              const isSelectedNext =
                !isNotified && !isResponding && topAvailableId === contact.id;

              return (
                <div
                  key={contact.id}
                  className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isResponding
                      ? 'bg-[#10B981]/10 border-[#10B981]/50'
                      : isNotified
                        ? 'bg-[#F59E0B]/10 border-[#F59E0B]/50'
                        : isSelectedNext
                          ? 'bg-[#172554] border-[#3B82F6]/60'
                          : !contact.available
                            ? 'bg-[#10182B]/70 border-[#263657] opacity-75'
                            : 'bg-[#172554]/60 border-[#263657]'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-display tabular-nums text-[14px] font-bold shrink-0 ${
                        isResponding
                          ? 'bg-[#10B981] text-white'
                          : isNotified
                            ? 'bg-[#F59E0B] text-[#0B1020]'
                            : rank === 1
                              ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white'
                              : rank !== null
                                ? 'bg-[#10182B] border border-[#263657] text-white'
                                : 'bg-[#0B1020] border border-[#263657] text-[#7C8BA5]'
                      }`}
                    >
                      {rank !== null ? `#${rank}` : '—'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-semibold text-[16px] text-white">
                          {contact.name}
                        </span>
                        <span className="text-[13px] text-[#AAB6CC]">
                          · {contact.roleLabel}
                        </span>
                        {isSelectedNext && (
                          <span className="text-[12px] font-semibold text-[#3B82F6]">
                            · Next Priority
                          </span>
                        )}
                      </div>

                      <div className="text-[13px] text-[#AAB6CC] mt-0.5">
                        {contact.relationship}
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] tabular-nums">
                        <span className="inline-flex items-center gap-1.5 text-[#AAB6CC]">
                          <MapPin className="w-3.5 h-3.5 text-[#7C8BA5]" aria-hidden="true" />
                          {contact.distanceLabel}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-white">
                          <Clock className="w-3.5 h-3.5 text-[#3B82F6]" aria-hidden="true" />
                          ETA {contact.etaMinutes} min
                        </span>
                        <span className="text-[#AAB6CC]">
                          {contact.available ? 'Available' : 'Unavailable'}
                        </span>
                        <span className={statusMeta.tone}>{statusMeta.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center shrink-0">
                    <button
                      type="button"
                      disabled={isDemoRunning}
                      onClick={() => onToggleAvailability(contact.id)}
                      className={`px-3.5 py-2 rounded-lg text-[14px] font-semibold border transition-colors whitespace-nowrap min-h-[42px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6] ${
                        isDemoRunning
                          ? 'opacity-50 cursor-not-allowed bg-[#10182B] border-[#263657] text-[#7C8BA5]'
                          : contact.available
                            ? 'bg-[#10182B] border-[#263657] text-white hover:bg-[#172554]'
                            : 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] border-transparent text-white hover:opacity-95'
                      }`}
                    >
                      {contact.available ? 'Set Unavailable' : 'Set Available'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#263657] text-[12px] text-[#7C8BA5] flex flex-wrap items-center justify-between gap-2">
          <span>Sorted by availability and shortest arrival time</span>
          <span>All contacts &amp; distances are simulated</span>
        </div>
      </div>

      {/* Right: Responder Coordination */}
      <div className="xl:col-span-6 rounded-xl bg-[#172554] border border-[#263657] shadow-lg shadow-black/20 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2 className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight">
              Responder Coordination
            </h2>
            <p className="text-[12px] sm:text-[13px] text-[#AAB6CC] mt-1">
              Simulated responder notification prompt with automatic escalation on unavailability or timeout.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {activeNotification && activeIncident ? (
              <motion.div
                key={`${activeNotification.contactId}-${activeNotification.attemptNumber}`}
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -8 }}
                transition={{ duration: 0.22 }}
                className="rounded-xl bg-[#10182B] border border-[#F59E0B]/50 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B]">
                      <BellRing className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="text-[12px] text-[#F59E0B] font-semibold">
                        Outbound Alert · Attempt #{activeNotification.attemptNumber}
                      </div>
                      <h3 className="font-display text-[17px] font-semibold text-white mt-0.5">
                        Notifying {activeNotification.contactRole}: {activeNotification.contactName}
                      </h3>
                    </div>
                  </div>

                  <span className="font-display tabular-nums text-[14px] text-[#3B82F6] font-bold">
                    ETA {activeNotification.etaMinutes} min
                  </span>
                </div>

                {activeNotification.escalationReason && (
                  <div className="rounded-lg bg-[#F59E0B]/15 border border-[#F59E0B]/35 px-3.5 py-2.5 text-[13px] text-[#F59E0B]">
                    Escalation Notice: {activeNotification.escalationReason}
                  </div>
                )}

                <div className="rounded-xl bg-[#111A30] border border-[#263657] p-4 text-[14px] text-[#AAB6CC] space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[#7C8BA5]">
                    <span>Alert Message (Simulated)</span>
                    <span className="tabular-nums">{activeIncident.timeFormatted}</span>
                  </div>
                  <p className="text-[14px] text-white font-medium leading-relaxed">
                    &ldquo;{activeIncident.title} detected at {activeIncident.location}. Can you check on Eleanor Vance immediately?&rdquo;
                  </p>
                </div>

                {/* Auto-escalation countdown bar */}
                <div>
                  <div className="flex items-center justify-between text-[13px] text-[#AAB6CC] mb-2">
                    <span>Auto-escalation timer</span>
                    <span className="font-display tabular-nums font-bold text-[#F59E0B]">
                      {activeNotification.secondsRemaining}s remaining
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#172554] overflow-hidden">
                    <div
                      className="h-full bg-[#F59E0B] transition-all duration-300"
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(
                            100,
                            (activeNotification.secondsRemaining /
                              activeNotification.totalSeconds) *
                              100
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* ACCEPT & UNAVAILABLE Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isDemoRunning}
                    onClick={onAcceptNotification}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold transition-colors min-h-[46px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      isDemoRunning
                        ? 'bg-[#10B981]/50 text-white/70 cursor-not-allowed'
                        : 'bg-[#10B981] hover:bg-[#059669] text-white'
                    }`}
                  >
                    <Check className="w-4 h-4" aria-hidden="true" />
                    ACCEPT
                  </button>

                  <button
                    type="button"
                    disabled={isDemoRunning}
                    onClick={onDeclineNotification}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-semibold border transition-colors min-h-[46px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      isDemoRunning
                        ? 'bg-[#111A30] border-[#263657] text-[#7C8BA5] cursor-not-allowed'
                        : 'bg-[#111A30] hover:bg-[#EF4444] border-[#263657] hover:border-[#EF4444] text-white'
                    }`}
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                    UNAVAILABLE
                  </button>
                </div>
              </motion.div>
            ) : systemStatus === 'accepted' && activeIncident ? (
              <motion.div
                key="accepted-state"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl bg-[#10182B] border border-[#10B981]/50 p-5 space-y-3"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[#10B981]/20 text-[#10B981]">
                    <UserCheck className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#10B981]">
                      Responder Confirmed (Simulated)
                    </div>
                    <h3 className="font-display text-[17px] font-semibold text-white">
                      {activeIncident.acceptedBy} accepted the alert
                    </h3>
                  </div>
                </div>
                <p className="text-[14px] text-[#AAB6CC] leading-relaxed">
                  Estimated arrival time is{' '}
                  <span className="font-display font-bold text-white">
                    {activeIncident.acceptedEta} minutes
                  </span>
                  . Live location tracking and sensor monitoring remain active until resolution.
                </p>
              </motion.div>
            ) : systemStatus === 'unanswered' && activeIncident ? (
              <motion.div
                key="unanswered-state"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl bg-[#10182B] border border-[#EF4444]/60 p-5 space-y-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[#EF4444]/20 text-[#EF4444]">
                    <ShieldAlert className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-[#EF4444]">
                      Escalation Exhausted
                    </div>
                    <h3 className="font-display text-[17px] font-semibold text-white">
                      No local contacts responded
                    </h3>
                  </div>
                </div>
                <p className="text-[14px] text-[#AAB6CC] leading-relaxed">
                  Fallback standby is active. Mark at least one contact as available to retry local responder outreach.
                </p>
                {!isDemoRunning && (
                  <button
                    type="button"
                    onClick={onRetryEscalation}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white text-[14px] font-semibold hover:opacity-95 transition-opacity min-h-[44px]"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    Retry Escalation
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="idle-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl bg-[#111A30] border border-[#263657] p-6 flex flex-col items-start justify-center min-h-[240px]"
              >
                <div className="p-3 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] mb-3.5">
                  <PhoneCall className="w-5 h-5" aria-hidden="true" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-white">
                  Coordination Standby
                </h3>
                <p className="text-[14px] text-[#AAB6CC] mt-1.5 max-w-md leading-relaxed">
                  When an emergency scenario starts, the highest-priority available contact receives a simulated notification here with interactive <strong className="text-white">ACCEPT</strong> and <strong className="text-white">UNAVAILABLE</strong> responses.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-5 pt-4 border-t border-[#263657] text-[12px] text-[#7C8BA5] flex flex-wrap items-center justify-between gap-2">
          <span>Auto-escalation window: 10 seconds</span>
          <span>Simulated Responder Channel</span>
        </div>
      </div>
    </section>
  );
};
