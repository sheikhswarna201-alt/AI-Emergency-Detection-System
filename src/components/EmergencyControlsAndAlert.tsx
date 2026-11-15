import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  MapPin,
  PersonStanding,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { EMERGENCY_SCENARIOS, RESIDENT_PROFILE } from '../data/simulationData';
import { AlertIncident, ScenarioType, SystemStatus } from '../types/monitoring';

interface EmergencyControlsAndAlertProps {
  activeIncident: AlertIncident | null;
  systemStatus: SystemStatus;
  onTriggerScenario: (scenario: ScenarioType) => void;
  onResolveIncident: () => void;
  isDemoRunning: boolean;
}

const SCENARIO_ICONS: Record<ScenarioType, React.ReactNode> = {
  fall_detection: <PersonStanding className="w-5 h-5" aria-hidden="true" />,
  unusual_health: <HeartPulse className="w-5 h-5" aria-hidden="true" />,
  prolonged_inactivity: <Clock className="w-5 h-5" aria-hidden="true" />,
};

const STATUS_META: Record<
  SystemStatus,
  { label: string; tone: string; description: string }
> = {
  normal: {
    label: 'Monitoring Normal',
    tone: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/35',
    description:
      'All simulated biometric and environmental readings are currently within safe thresholds.',
  },
  alert_triggered: {
    label: 'Emergency Alert Active',
    tone: 'text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/40',
    description: 'Anomaly confirmed. Initiating prioritized responder outreach.',
  },
  notifying: {
    label: 'Notifying Top Contact',
    tone: 'text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/40',
    description: 'Automated alert sent to the highest-priority available contact.',
  },
  escalating: {
    label: 'Escalating to Next Contact',
    tone: 'text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/40',
    description:
      'Previous contact unavailable or timed out. Escalating to the next available responder.',
  },
  accepted: {
    label: 'Responder En Route',
    tone: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/35',
    description: 'A prioritized contact has accepted the alert and is heading to the residence.',
  },
  unanswered: {
    label: 'Fallback Protocol Active',
    tone: 'text-[#EF4444] bg-[#EF4444]/20 border-[#EF4444]/50',
    description:
      'No local contacts responded. Simulated emergency care center escalation is active.',
  },
};

export const EmergencyControlsAndAlert: React.FC<EmergencyControlsAndAlertProps> = ({
  activeIncident,
  systemStatus,
  onTriggerScenario,
  onResolveIncident,
  isDemoRunning,
}) => {
  const statusInfo = STATUS_META[systemStatus];
  const scenarioList = Object.values(EMERGENCY_SCENARIOS);
  const isEmergencyState =
    systemStatus === 'alert_triggered' ||
    systemStatus === 'notifying' ||
    systemStatus === 'unanswered';

  return (
    <section
      id="emergency-response"
      aria-labelledby="emergency-response-heading"
      className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch"
    >
      {/* Left: Emergency Detection Scenarios */}
      <div className="xl:col-span-6 rounded-xl bg-[#111A30] border border-[#263657] shadow-lg shadow-black/20 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <div className="mb-4">
            <h2
              id="emergency-response-heading"
              className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight"
            >
              Emergency Detection
            </h2>
            <p className="text-[12px] sm:text-[13px] text-[#AAB6CC] mt-1">
              Run any simulated incident below to test automated detection, map tracking, and contact escalation.
            </p>
          </div>

          <div className="space-y-3">
            {scenarioList.map((scenario) => {
              const isActive = activeIncident?.scenario === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  disabled={isDemoRunning}
                  onClick={() => onTriggerScenario(scenario.id)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6] ${
                    isActive
                      ? 'bg-[#EF4444]/15 border-[#EF4444] text-white'
                      : isDemoRunning
                        ? 'bg-[#10182B] border-[#263657] text-[#7C8BA5] cursor-not-allowed'
                        : 'bg-[#172554]/75 border-[#263657] text-white hover:bg-[#172554] hover:border-[#3B82F6]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`mt-0.5 p-2.5 rounded-lg shrink-0 ${
                          isActive
                            ? 'bg-[#EF4444]/25 text-[#EF4444]'
                            : 'bg-[#3B82F6]/15 text-[#3B82F6]'
                        }`}
                      >
                        {SCENARIO_ICONS[scenario.id]}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-display font-semibold text-[16px] text-white">
                            {scenario.title}
                          </span>
                          <span
                            className={`text-[12px] font-medium ${
                              isActive ? 'text-[#EF4444]' : 'text-[#AAB6CC]'
                            }`}
                          >
                            · {scenario.severity} Priority
                          </span>
                        </div>
                        <p className="text-[13px] text-[#AAB6CC] mt-1 leading-relaxed">
                          {scenario.description}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 text-[13px] font-semibold px-3.5 py-1.5 rounded-lg whitespace-nowrap ${
                        isActive
                          ? 'bg-[#EF4444] text-white'
                          : 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white'
                      }`}
                    >
                      {isActive ? 'Active' : 'Trigger'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#263657] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#7C8BA5]">
          <span>Resident: {RESIDENT_PROFILE.name} (Simulated)</span>
          {activeIncident && !isDemoRunning && (
            <button
              type="button"
              onClick={onResolveIncident}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#263657] bg-[#10182B] text-white hover:bg-[#172554] text-[13px] font-semibold transition-colors whitespace-nowrap min-h-[40px]"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              Reset to Normal
            </button>
          )}
        </div>
      </div>

      {/* Right: Emergency Response Panel */}
      <div
        className={`xl:col-span-6 rounded-xl border shadow-lg shadow-black/20 p-5 sm:p-6 flex flex-col justify-between transition-colors ${
          isEmergencyState
            ? 'bg-[#172554] border-[#EF4444]/60'
            : 'bg-[#172554] border-[#263657]'
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight">
                Emergency Response
              </h2>
              <p className="text-[12px] sm:text-[13px] text-[#AAB6CC] mt-1">
                Automated incident assessment and dispatch status
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-semibold whitespace-nowrap ${statusInfo.tone}`}
            >
              {systemStatus === 'normal' || systemStatus === 'accepted' ? (
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
              ) : (
                <AlertTriangle className="w-4 h-4" aria-hidden="true" />
              )}
              {statusInfo.label}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {activeIncident ? (
              <motion.div
                key={activeIncident.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className={`rounded-xl border p-5 space-y-4 ${
                  systemStatus === 'accepted'
                    ? 'bg-[#111A30] border-[#10B981]/45'
                    : systemStatus === 'escalating'
                      ? 'bg-[#111A30] border-[#F59E0B]/45'
                      : 'bg-[#111A30] border-[#EF4444]/50'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 pb-3.5 border-b border-[#263657]">
                  <div>
                    <div
                      className={`text-[12px] font-semibold flex items-center gap-1.5 ${
                        systemStatus === 'accepted'
                          ? 'text-[#10B981]'
                          : systemStatus === 'escalating'
                            ? 'text-[#F59E0B]'
                            : 'text-[#EF4444]'
                      }`}
                    >
                      <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                      Active Incident · {activeIncident.severity} Severity
                    </div>
                    <h3 className="font-display text-[20px] font-bold text-white mt-1">
                      {activeIncident.title}
                    </h3>
                  </div>

                  <div className="text-right tabular-nums text-[12px] text-[#AAB6CC]">
                    <div className="font-semibold text-white">{activeIncident.id}</div>
                    <div className="text-[#7C8BA5] mt-0.5">
                      Detected at {activeIncident.timeFormatted}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
                  <div>
                    <div className="text-[12px] text-[#7C8BA5] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#3B82F6]" aria-hidden="true" />
                      Incident Location
                    </div>
                    <div className="mt-1 font-medium text-white">
                      {activeIncident.location}
                    </div>
                  </div>

                  <div>
                    <div className="text-[12px] text-[#7C8BA5] flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-[#8B5CF6]" aria-hidden="true" />
                      Response Status
                    </div>
                    <div className="mt-1 font-medium text-white">
                      {statusInfo.label}
                    </div>
                  </div>
                </div>

                <div className="pt-3.5 border-t border-[#263657] text-[14px] text-[#AAB6CC] leading-relaxed">
                  <span className="font-semibold text-white">Sensor Summary: </span>
                  {activeIncident.summary}
                </div>

                {activeIncident.acceptedBy && (
                  <div className="rounded-lg bg-[#10B981]/15 border border-[#10B981]/35 p-3.5 text-[13px] text-white flex flex-wrap items-center justify-between gap-3">
                    <span>
                      Confirmed Responder:{' '}
                      <strong className="font-semibold">{activeIncident.acceptedBy}</strong>
                    </span>
                    <span className="font-display tabular-nums font-bold text-[#10B981]">
                      ETA {activeIncident.acceptedEta} min
                    </span>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="standby"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="rounded-xl bg-[#111A30] border border-[#263657] p-6 flex flex-col items-start justify-center min-h-[240px]"
              >
                <div className="p-3 rounded-xl bg-[#10B981]/15 text-[#10B981] mb-3.5">
                  <ShieldCheck className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="font-display text-[18px] font-semibold text-white">
                  All Systems Nominal
                </h3>
                <p className="text-[14px] text-[#AAB6CC] mt-1.5 max-w-md leading-relaxed">
                  {statusInfo.description} Select a scenario on the left or launch{' '}
                  <strong className="text-white font-semibold">Live Demo Mode</strong> to preview automated detection and responder dispatch.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-5 pt-4 border-t border-[#263657] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#7C8BA5]">
          <span>{RESIDENT_PROFILE.monitoringNode}</span>
          <span>Simulated Prototype · No Real Dispatch</span>
        </div>
      </div>
    </section>
  );
};
