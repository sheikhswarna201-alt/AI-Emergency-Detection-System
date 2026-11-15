import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  History,
  Info,
  MapPin,
  Menu,
  PhoneCall,
  Play,
  Shield,
  ShieldAlert,
  Square,
  User,
  X,
} from 'lucide-react';
import {
  EMERGENCY_SCENARIOS,
  INITIAL_CONTACTS,
  RESIDENT_PROFILE,
  formatTime,
  generateInitialSensorHistory,
} from './data/simulationData';
import {
  ActiveNotification,
  ActivityCategory,
  ActivityEvent,
  AlertIncident,
  DemoProgress,
  EmergencyContact,
  ScenarioType,
  SensorDataPoint,
  SystemStatus,
} from './types/monitoring';
import { LiveMonitoringSection } from './components/LiveMonitoringSection';
import { EmergencyControlsAndAlert } from './components/EmergencyControlsAndAlert';
import { EmergencyLocationMap } from './components/EmergencyLocationMap';
import { ContactsAndNotification } from './components/ContactsAndNotification';
import { ActivityHistory } from './components/ActivityHistory';
import { DemoModeModal } from './components/DemoModeModal';

const RESPONSE_TIMEOUT_SECONDS = 10;

const NAV_ITEMS = [
  { id: 'real-time-monitoring', label: 'Real-Time Monitoring', icon: Activity },
  { id: 'emergency-response', label: 'Emergency Response', icon: ShieldAlert },
  { id: 'location-tracking', label: 'Location Tracking', icon: MapPin },
  { id: 'responder-coordination', label: 'Responder Coordination', icon: PhoneCall },
  { id: 'incident-timeline', label: 'Incident Timeline', icon: History },
] as const;

export default function App() {
  const [sensorHistory, setSensorHistory] = useState<SensorDataPoint[]>(() =>
    generateInitialSensorHistory(24)
  );
  const [isStreamPaused, setIsStreamPaused] = useState(false);

  const [activeScenario, setActiveScenario] = useState<ScenarioType | null>(null);
  const [activeIncident, setActiveIncident] = useState<AlertIncident | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>('normal');

  const [contacts, setContacts] = useState<EmergencyContact[]>(() =>
    INITIAL_CONTACTS.map((c) => ({ ...c }))
  );
  const [activeNotification, setActiveNotification] =
    useState<ActiveNotification | null>(null);

  const [activityLog, setActivityLog] = useState<ActivityEvent[]>(() => {
    const now = Date.now();
    return [
      {
        id: 'init-log-1',
        timestamp: now - 4000,
        timeFormatted: formatTime(now - 4000),
        category: 'system',
        title: 'Monitoring Hub Connected',
        detail: `${RESIDENT_PROFILE.monitoringNode} online. All baseline readings within safe range.`,
        severity: 'info',
      },
      {
        id: 'init-log-2',
        timestamp: now - 2000,
        timeFormatted: formatTime(now - 2000),
        category: 'sensor',
        title: 'Sensor Stream Active',
        detail: 'Heart rate, motion detection, room temperature, and activity level active (simulated).',
        severity: 'info',
      },
    ];
  });

  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [demoProgress, setDemoProgress] = useState<DemoProgress>({
    active: false,
    scenario: null,
    stepIndex: 0,
    stepLabel: '',
    totalSteps: 6,
  });

  const [activeNavId, setActiveNavId] = useState<string>('real-time-monitoring');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const demoTimeoutsRef = useRef<number[]>([]);
  const tickCountRef = useRef(0);

  const contactsRef = useRef(contacts);
  contactsRef.current = contacts;
  const activeNotificationRef = useRef(activeNotification);
  activeNotificationRef.current = activeNotification;
  const activeIncidentRef = useRef(activeIncident);
  activeIncidentRef.current = activeIncident;

  const appendLog = useCallback(
    (
      category: ActivityCategory,
      title: string,
      detail: string,
      severity: ActivityEvent['severity'] = 'info'
    ) => {
      const now = Date.now();
      const entry: ActivityEvent = {
        id: `evt-${now}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: now,
        timeFormatted: formatTime(now),
        category,
        title,
        detail,
        severity,
      };
      setActivityLog((prev) => [entry, ...prev].slice(0, 80));
    },
    []
  );

  // Live Sensor Simulation Loop (every 2 seconds)
  useEffect(() => {
    if (isStreamPaused) return;

    const interval = window.setInterval(() => {
      tickCountRef.current += 1;
      const now = Date.now();

      setSensorHistory((prev) => {
        const last = prev[prev.length - 1];
        let nextHr = last ? last.heartRate : 72;
        let nextTemp = last ? last.roomTemp : 21.4;
        let nextMovement = last ? last.movementActivity : 45;
        let nextMotionDetected = true;
        let nextMotionIntensity = 40;
        let isAnomaly = false;

        if (activeScenario === 'fall_detection') {
          nextHr = Math.round(
            Math.max(108, Math.min(128, nextHr + (Math.random() - 0.4) * 6))
          );
          if (nextHr < 110) nextHr = 116;
          nextMovement = Math.round(Math.random() * 3);
          nextMotionDetected = false;
          nextMotionIntensity = Math.round(Math.random() * 4);
          nextTemp = Number((21.4 + (Math.random() - 0.5) * 0.2).toFixed(1));
          isAnomaly = true;
        } else if (activeScenario === 'unusual_health') {
          nextHr = Math.round(
            Math.max(132, Math.min(152, nextHr + (Math.random() - 0.45) * 8))
          );
          if (nextHr < 132) nextHr = 141;
          nextMovement = Math.round(18 + Math.random() * 14);
          nextMotionDetected = true;
          nextMotionIntensity = Math.round(60 + Math.random() * 28);
          nextTemp = Number((22.4 + (Math.random() - 0.5) * 0.3).toFixed(1));
          isAnomaly = true;
        } else if (activeScenario === 'prolonged_inactivity') {
          nextHr = Math.round(
            Math.max(54, Math.min(62, nextHr + (Math.random() - 0.5) * 3))
          );
          if (nextHr > 64) nextHr = 58;
          nextMovement = 0;
          nextMotionDetected = false;
          nextMotionIntensity = 0;
          nextTemp = Number((21.0 + (Math.random() - 0.5) * 0.2).toFixed(1));
          isAnomaly = true;
        } else {
          nextHr = Math.round(
            Math.max(64, Math.min(84, (nextHr > 90 ? 73 : nextHr) + (Math.random() - 0.5) * 4))
          );
          nextTemp = Number(
            Math.max(20.8, Math.min(22.2, nextTemp + (Math.random() - 0.5) * 0.14)).toFixed(1)
          );
          nextMovement = Math.round(
            Math.max(24, Math.min(76, (nextMovement < 15 ? 44 : nextMovement) + (Math.random() - 0.5) * 14))
          );
          nextMotionDetected = nextMovement > 28 && Math.random() > 0.2;
          nextMotionIntensity = nextMotionDetected
            ? Math.round(Math.min(92, nextMovement + (Math.random() - 0.3) * 16))
            : Math.round(Math.random() * 8);
        }

        const nextPoint: SensorDataPoint = {
          id: `pt-${now}`,
          timestamp: now,
          timeLabel: formatTime(now),
          heartRate: nextHr,
          motionDetected: nextMotionDetected,
          motionIntensity: nextMotionIntensity,
          roomTemp: nextTemp,
          movementActivity: nextMovement,
          isAnomaly,
        };

        if (tickCountRef.current % 4 === 0 && !activeScenario) {
          window.setTimeout(() => {
            appendLog(
              'sensor',
              'Routine Telemetry Reading',
              `Heart Rate ${nextHr} BPM · Activity Level ${nextMovement}% · Room Temp ${nextTemp}°C (Simulated)`,
              'info'
            );
          }, 0);
        }

        return [...prev.slice(1), nextPoint];
      });
    }, 2000);

    return () => window.clearInterval(interval);
  }, [isStreamPaused, activeScenario, appendLog]);

  const findNextContact = useCallback((contactList: EmergencyContact[]) => {
    return [...contactList]
      .filter((c) => c.available && c.responseStatus === 'standby')
      .sort((a, b) => a.etaMinutes - b.etaMinutes)[0];
  }, []);

  const escalateToNextContact = useCallback(
    (reason: string, prevOutcome: 'unavailable' | 'timed_out') => {
      const currentNotif = activeNotificationRef.current;
      if (!currentNotif) return;

      const updatedContacts = contactsRef.current.map((c) =>
        c.id === currentNotif.contactId ? { ...c, responseStatus: prevOutcome } : c
      );
      setContacts(updatedContacts);

      const nextContact = findNextContact(updatedContacts);
      if (nextContact) {
        const nextAttempt = currentNotif.attemptNumber + 1;
        const contactsWithNotified = updatedContacts.map((c) =>
          c.id === nextContact.id ? { ...c, responseStatus: 'notified' as const } : c
        );
        setContacts(contactsWithNotified);
        setSystemStatus('escalating');
        setActiveNotification({
          contactId: nextContact.id,
          contactRole: nextContact.roleLabel,
          contactName: nextContact.name,
          etaMinutes: nextContact.etaMinutes,
          sentAt: Date.now(),
          secondsRemaining: RESPONSE_TIMEOUT_SECONDS,
          totalSeconds: RESPONSE_TIMEOUT_SECONDS,
          attemptNumber: nextAttempt,
          escalationReason: `${currentNotif.contactRole} (${currentNotif.contactName}): ${reason}`,
        });

        appendLog(
          'notification',
          `Escalated Alert to ${nextContact.roleLabel}`,
          `Notifying ${nextContact.name} (ETA ${nextContact.etaMinutes} min) via ${nextContact.channel}. Reason: ${reason}.`,
          'warning'
        );
      } else {
        setActiveNotification(null);
        setSystemStatus('unanswered');
        appendLog(
          'system',
          'All Local Contacts Exhausted',
          'No remaining available contacts responded. Simulated fallback protocol activated.',
          'critical'
        );
      }
    },
    [appendLog, findNextContact]
  );

  // Notification Countdown Timer
  useEffect(() => {
    if (!activeNotification) return;

    const timer = window.setInterval(() => {
      setActiveNotification((prev) => {
        if (!prev) return null;
        if (prev.secondsRemaining <= 1) {
          window.setTimeout(() => {
            const latest = activeNotificationRef.current;
            if (
              latest &&
              latest.contactId === prev.contactId &&
              latest.attemptNumber === prev.attemptNumber
            ) {
              appendLog(
                'response',
                `${latest.contactRole} Did Not Respond`,
                `No response from ${latest.contactName} within ${RESPONSE_TIMEOUT_SECONDS}s timeout.`,
                'warning'
              );
              escalateToNextContact('Response timeout reached', 'timed_out');
            }
          }, 0);
          return prev;
        }
        return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    activeNotification?.contactId,
    activeNotification?.attemptNumber,
    appendLog,
    escalateToNextContact,
  ]);

  const triggerScenario = useCallback(
    (scenario: ScenarioType, resetAvailability = false) => {
      const config = EMERGENCY_SCENARIOS[scenario];
      const now = Date.now();
      const incidentId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;

      setIsStreamPaused(false);
      setActiveScenario(scenario);

      setSensorHistory((prev) => {
        const anomalyPoint: SensorDataPoint = {
          id: `anom-${now}`,
          timestamp: now,
          timeLabel: formatTime(now),
          heartRate:
            scenario === 'fall_detection'
              ? 118
              : scenario === 'unusual_health'
                ? 142
                : 58,
          motionDetected: scenario === 'unusual_health',
          motionIntensity:
            scenario === 'fall_detection'
              ? 94
              : scenario === 'unusual_health'
                ? 76
                : 0,
          roomTemp: scenario === 'unusual_health' ? 22.6 : 21.3,
          movementActivity:
            scenario === 'fall_detection'
              ? 2
              : scenario === 'unusual_health'
                ? 24
                : 0,
          isAnomaly: true,
        };
        return [...prev.slice(1), anomalyPoint];
      });

      const newIncident: AlertIncident = {
        id: incidentId,
        scenario,
        title: config.title,
        severity: config.severity,
        triggeredAt: now,
        timeFormatted: formatTime(now),
        location: config.location,
        summary: config.triggerSummary,
        status: 'alert_triggered',
      };
      setActiveIncident(newIncident);

      appendLog(
        'anomaly',
        `Emergency Detected: ${config.title}`,
        `${config.location} — ${config.triggerSummary}`,
        'critical'
      );

      const baseContacts = contactsRef.current.map((c) => ({
        ...c,
        available: resetAvailability ? true : c.available,
        responseStatus: 'standby' as const,
      }));

      const firstContact = findNextContact(baseContacts);
      if (firstContact) {
        const updated = baseContacts.map((c) =>
          c.id === firstContact.id ? { ...c, responseStatus: 'notified' as const } : c
        );
        setContacts(updated);
        setSystemStatus('notifying');
        setActiveNotification({
          contactId: firstContact.id,
          contactRole: firstContact.roleLabel,
          contactName: firstContact.name,
          etaMinutes: firstContact.etaMinutes,
          sentAt: now,
          secondsRemaining: RESPONSE_TIMEOUT_SECONDS,
          totalSeconds: RESPONSE_TIMEOUT_SECONDS,
          attemptNumber: 1,
        });

        appendLog(
          'notification',
          `Alert Sent to ${firstContact.roleLabel}`,
          `Notifying ${firstContact.name} (${firstContact.distanceLabel} · ETA ${firstContact.etaMinutes} min).`,
          'warning'
        );
      } else {
        setContacts(baseContacts);
        setActiveNotification(null);
        setSystemStatus('unanswered');
        appendLog(
          'system',
          'No Contacts Available',
          'All contacts are unavailable. Fallback emergency standby activated.',
          'critical'
        );
      }
    },
    [appendLog, findNextContact]
  );

  const handleAcceptNotification = useCallback(() => {
    const currentNotif = activeNotificationRef.current;
    const currentIncident = activeIncidentRef.current;
    if (!currentNotif || !currentIncident) return;

    setContacts((prev) =>
      prev.map((c) =>
        c.id === currentNotif.contactId ? { ...c, responseStatus: 'accepted' } : c
      )
    );
    setActiveNotification(null);
    setSystemStatus('accepted');
    setActiveIncident((prev) =>
      prev
        ? {
            ...prev,
            status: 'accepted',
            acceptedBy: `${currentNotif.contactRole} (${currentNotif.contactName})`,
            acceptedEta: currentNotif.etaMinutes,
          }
        : null
    );

    appendLog(
      'response',
      `${currentNotif.contactRole} Accepted Alert`,
      `${currentNotif.contactName} confirmed and is en route (ETA ${currentNotif.etaMinutes} min).`,
      'success'
    );
  }, [appendLog]);

  const handleDeclineNotification = useCallback(() => {
    const currentNotif = activeNotificationRef.current;
    if (!currentNotif) return;

    appendLog(
      'response',
      `${currentNotif.contactRole} Marked Unavailable`,
      `${currentNotif.contactName} is unavailable. Escalating to next prioritized contact.`,
      'warning'
    );

    escalateToNextContact('Marked unavailable', 'unavailable');
  }, [appendLog, escalateToNextContact]);

  const handleToggleAvailability = useCallback(
    (contactId: string) => {
      const target = contactsRef.current.find((c) => c.id === contactId);
      if (!target) return;
      const nextAvailable = !target.available;

      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? {
                ...c,
                available: nextAvailable,
                responseStatus: nextAvailable ? 'standby' : 'unavailable',
              }
            : c
        )
      );

      appendLog(
        'system',
        'Contact Availability Updated',
        `${target.roleLabel} (${target.name}) marked ${
          nextAvailable ? 'Available' : 'Unavailable'
        }. Priority list updated.`,
        'info'
      );

      if (!nextAvailable && activeNotificationRef.current?.contactId === contactId) {
        escalateToNextContact('Availability toggled off', 'unavailable');
      }
    },
    [appendLog, escalateToNextContact]
  );

  const handleRetryEscalation = useCallback(() => {
    const resetStandby = contactsRef.current.map((c) => ({
      ...c,
      responseStatus: 'standby' as const,
    }));
    const firstAvailable = findNextContact(resetStandby);

    if (!firstAvailable) {
      appendLog(
        'system',
        'Retry Escalation Failed',
        'Set at least one contact as available before retrying outreach.',
        'warning'
      );
      return;
    }

    setContacts(
      resetStandby.map((c) =>
        c.id === firstAvailable.id ? { ...c, responseStatus: 'notified' } : c
      )
    );
    setSystemStatus('notifying');
    setActiveNotification({
      contactId: firstAvailable.id,
      contactRole: firstAvailable.roleLabel,
      contactName: firstAvailable.name,
      etaMinutes: firstAvailable.etaMinutes,
      sentAt: Date.now(),
      secondsRemaining: RESPONSE_TIMEOUT_SECONDS,
      totalSeconds: RESPONSE_TIMEOUT_SECONDS,
      attemptNumber: 1,
    });

    appendLog(
      'notification',
      `Escalation Restarted: ${firstAvailable.roleLabel}`,
      `Re-notifying ${firstAvailable.name} (ETA ${firstAvailable.etaMinutes} min).`,
      'warning'
    );
  }, [appendLog, findNextContact]);

  const handleResolveIncident = useCallback(() => {
    setActiveScenario(null);
    setActiveIncident(null);
    setActiveNotification(null);
    setSystemStatus('normal');
    setContacts((prev) =>
      prev.map((c) => ({
        ...c,
        responseStatus: 'standby',
      }))
    );

    appendLog(
      'system',
      'Incident Resolved · Monitoring Normal',
      'System returned to routine simulated monitoring.',
      'success'
    );
  }, [appendLog]);

  const stopDemoMode = useCallback(() => {
    demoTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    demoTimeoutsRef.current = [];
    setDemoProgress({
      active: false,
      scenario: null,
      stepIndex: 0,
      stepLabel: '',
      totalSteps: 6,
    });
  }, []);

  useEffect(() => {
    return () => {
      demoTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const handleStartDemo = useCallback(
    (scenario: ScenarioType) => {
      setIsDemoModalOpen(false);
      stopDemoMode();

      setActiveScenario(null);
      setActiveIncident(null);
      setActiveNotification(null);
      setSystemStatus('normal');
      setIsStreamPaused(false);
      setContacts(
        INITIAL_CONTACTS.map((c) => ({
          ...c,
          available: true,
          responseStatus: 'standby',
        }))
      );

      const scenarioTitle = EMERGENCY_SCENARIOS[scenario].title;
      appendLog(
        'system',
        'Live Demo Mode Started',
        `Automated demonstration initiated for "${scenarioTitle}".`,
        'info'
      );

      setDemoProgress({
        active: true,
        scenario,
        stepIndex: 1,
        stepLabel: 'Monitoring normal baseline sensor readings',
        totalSteps: 6,
      });

      const scheduleStep = (delayMs: number, fn: () => void) => {
        const id = window.setTimeout(fn, delayMs);
        demoTimeoutsRef.current.push(id);
      };

      scheduleStep(2000, () => {
        setDemoProgress({
          active: true,
          scenario,
          stepIndex: 2,
          stepLabel: `Detecting ${scenarioTitle} and triggering emergency response`,
          totalSteps: 6,
        });
        triggerScenario(scenario, true);
      });

      scheduleStep(5000, () => {
        setDemoProgress({
          active: true,
          scenario,
          stepIndex: 3,
          stepLabel: 'Prioritizing Neighbor A (2 min ETA) and dispatching notification',
          totalSteps: 6,
        });
      });

      scheduleStep(8200, () => {
        setDemoProgress({
          active: true,
          scenario,
          stepIndex: 4,
          stepLabel: 'Simulating Neighbor A unavailable — escalating to Neighbor B (4 min ETA)',
          totalSteps: 6,
        });
        handleDeclineNotification();
      });

      scheduleStep(11800, () => {
        setDemoProgress({
          active: true,
          scenario,
          stepIndex: 5,
          stepLabel: 'Simulating Neighbor B ACCEPT response and live map tracking',
          totalSteps: 6,
        });
        handleAcceptNotification();
      });

      scheduleStep(14500, () => {
        setDemoProgress({
          active: false,
          scenario: null,
          stepIndex: 6,
          stepLabel: 'Demo complete',
          totalSteps: 6,
        });
        appendLog(
          'system',
          'Live Demo Mode Completed',
          'Automated end-to-end walkthrough finished. Review the timeline or reset to normal.',
          'success'
        );
      });
    },
    [
      appendLog,
      handleAcceptNotification,
      handleDeclineNotification,
      stopDemoMode,
      triggerScenario,
    ]
  );

  const handleNavClick = (sectionId: string) => {
    setActiveNavId(sectionId);
    setIsMobileSidebarOpen(false);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const latestReading = sensorHistory[sensorHistory.length - 1];
  const isEmergencyActive =
    systemStatus === 'alert_triggered' ||
    systemStatus === 'notifying' ||
    systemStatus === 'escalating' ||
    systemStatus === 'unanswered';

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between p-5">
      <div className="space-y-6">
        {/* Sidebar Brand */}
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#263657]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-white" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-[15px] text-white truncate">
                SafePulse Care
              </div>
              <div className="text-[12px] text-[#7C8BA5] truncate">
                Emergency Monitoring
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-2 rounded-lg text-[#AAB6CC] hover:text-white hover:bg-[#172554]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav aria-label="Dashboard navigation" className="space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium transition-all text-left min-h-[44px] ${
                  isActive
                    ? 'bg-gradient-to-r from-[#3B82F6]/20 to-[#8B5CF6]/20 border border-[#3B82F6]/45 text-white'
                    : 'text-[#AAB6CC] border border-transparent hover:text-white hover:bg-[#172554]/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#3B82F6]' : 'text-[#7C8BA5]'
                  }`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Resident Summary Card in Sidebar */}
      <div className="pt-5 border-t border-[#263657] space-y-3">
        <div className="rounded-xl bg-[#111A30] border border-[#263657] p-4 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#172554] border border-[#263657] flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#3B82F6]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-white truncate">
                {RESIDENT_PROFILE.name}
              </div>
              <div className="text-[12px] text-[#7C8BA5]">
                Age {RESIDENT_PROFILE.age} · Unit 4B
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-[#263657] flex items-center justify-between text-[12px]">
            <span className="text-[#AAB6CC]">Mode</span>
            <span className="text-[#3B82F6] font-semibold">Simulated Prototype</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1020] text-white flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 bg-[#10182B] border-r border-[#263657] sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0B1020]/75 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] bg-[#10182B] border-r border-[#263657] h-full">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Right Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 bg-[#10182B]/95 backdrop-blur-md border-b border-[#263657]">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden p-2 rounded-lg border border-[#263657] bg-[#111A30] text-[#AAB6CC] hover:text-white min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="min-w-0 flex items-center gap-2.5">
                <span className="font-display font-semibold text-[15px] sm:text-[16px] text-white truncate">
                  AI Emergency Detection &amp; Alert System
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-semibold whitespace-nowrap ${
                  systemStatus === 'normal' || systemStatus === 'accepted'
                    ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/35'
                    : systemStatus === 'escalating'
                      ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
                      : 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                }`}
              >
                {systemStatus === 'normal' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Normal
                  </>
                ) : systemStatus === 'accepted' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    Responder En Route
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" aria-hidden="true" />
                    Alert Active
                  </>
                )}
              </span>

              <button
                type="button"
                onClick={() => setIsDemoModalOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:opacity-95 text-white font-semibold text-[13px] sm:text-[14px] transition-opacity whitespace-nowrap shrink-0 min-h-[42px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                Live Demo Mode
              </button>
            </div>
          </div>
        </header>

        {/* Main Workspace */}
        <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
          {/* Page Header & Simulated Prototype Notice */}
          <div className="space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-[30px] sm:text-[34px] font-bold text-white leading-tight tracking-tight">
                  Resident Safety Dashboard
                </h1>
                <p className="text-[14px] sm:text-[15px] text-[#AAB6CC] mt-1.5 max-w-2xl leading-relaxed">
                  Intelligent monitoring for elderly individuals living alone, combining live sensor analytics, automated emergency detection, and location-aware responder coordination.
                </p>
              </div>

              {latestReading && (
                <div className="text-[13px] text-[#AAB6CC] tabular-nums shrink-0">
                  Last update: <span className="text-white font-semibold">{latestReading.timeLabel}</span>
                </div>
              )}
            </div>

            {/* Simulated Prototype Notice Banner */}
            <div className="rounded-xl bg-[#111A30] border border-[#263657] px-4 sm:px-5 py-3.5 flex items-start gap-3">
              <Info className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[13px] sm:text-[14px] text-[#AAB6CC] leading-relaxed">
                <strong className="text-white font-semibold">Simulated Prototype:</strong> All sensor readings, resident profiles, locations, and responder contacts are simulated for demonstration purposes. Not a real medical monitoring or emergency dispatch system.
              </p>
            </div>

            {/* Quick Key Metrics Strip */}
            {latestReading && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl bg-[#172554] border border-[#263657] p-4">
                  <div className="text-[12px] sm:text-[13px] text-[#AAB6CC]">Heart Rate</div>
                  <div className="font-display text-[28px] sm:text-[32px] font-bold tabular-nums text-white mt-1 leading-none">
                    {latestReading.heartRate} <span className="text-[14px] font-medium text-[#AAB6CC]">BPM</span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#172554] border border-[#263657] p-4">
                  <div className="text-[12px] sm:text-[13px] text-[#AAB6CC]">Activity Level</div>
                  <div className="font-display text-[28px] sm:text-[32px] font-bold tabular-nums text-white mt-1 leading-none">
                    {latestReading.movementActivity}%
                  </div>
                </div>

                <div className="rounded-xl bg-[#172554] border border-[#263657] p-4">
                  <div className="text-[12px] sm:text-[13px] text-[#AAB6CC]">Room Temp</div>
                  <div className="font-display text-[28px] sm:text-[32px] font-bold tabular-nums text-white mt-1 leading-none">
                    {latestReading.roomTemp.toFixed(1)}°C
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-4 ${
                    isEmergencyActive
                      ? 'bg-[#EF4444]/15 border-[#EF4444]/60'
                      : 'bg-[#172554] border-[#263657]'
                  }`}
                >
                  <div className="text-[12px] sm:text-[13px] text-[#AAB6CC]">System Status</div>
                  <div
                    className={`font-display text-[20px] sm:text-[22px] font-bold mt-1.5 leading-tight ${
                      systemStatus === 'normal' || systemStatus === 'accepted'
                        ? 'text-[#10B981]'
                        : systemStatus === 'escalating'
                          ? 'text-[#F59E0B]'
                          : 'text-[#EF4444]'
                    }`}
                  >
                    {systemStatus === 'normal'
                      ? 'Monitoring'
                      : systemStatus === 'accepted'
                        ? 'Help En Route'
                        : systemStatus === 'escalating'
                          ? 'Escalating'
                          : 'Emergency Alert'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Active Live Demo Mode Progress Banner */}
          {demoProgress.active && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl bg-[#172554] border border-[#3B82F6] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/25"
            >
              <div className="flex items-start gap-3">
                <Activity className="w-5 h-5 text-[#3B82F6] shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <div className="text-[12px] font-semibold text-[#3B82F6] tabular-nums">
                    Live Demo Mode · Step {demoProgress.stepIndex} of {demoProgress.totalSteps}
                  </div>
                  <div className="font-display text-[16px] font-semibold text-white mt-0.5">
                    {demoProgress.stepLabel}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={stopDemoMode}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#10182B] hover:bg-[#111A30] border border-[#263657] text-[14px] font-semibold text-white transition-colors whitespace-nowrap shrink-0 min-h-[42px]"
              >
                <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                Stop Demo
              </button>
            </div>
          )}

          {/* Section 1: Real-Time Monitoring */}
          <LiveMonitoringSection
            sensorHistory={sensorHistory}
            isStreamPaused={isStreamPaused}
            onToggleStream={() => setIsStreamPaused((p) => !p)}
            activeScenario={activeScenario}
          />

          {/* Section 2: Emergency Detection & Emergency Response */}
          <EmergencyControlsAndAlert
            activeIncident={activeIncident}
            systemStatus={systemStatus}
            onTriggerScenario={(scenario) => triggerScenario(scenario, false)}
            onResolveIncident={handleResolveIncident}
            isDemoRunning={demoProgress.active}
          />

          {/* Section 3: Live Emergency Location Tracking */}
          <EmergencyLocationMap
            contacts={contacts}
            activeIncident={activeIncident}
            activeNotification={activeNotification}
            systemStatus={systemStatus}
          />

          {/* Section 4: Contact Prioritization & Responder Coordination */}
          <ContactsAndNotification
            contacts={contacts}
            activeNotification={activeNotification}
            activeIncident={activeIncident}
            systemStatus={systemStatus}
            onToggleAvailability={handleToggleAvailability}
            onAcceptNotification={handleAcceptNotification}
            onDeclineNotification={handleDeclineNotification}
            onRetryEscalation={handleRetryEscalation}
            isDemoRunning={demoProgress.active}
          />

          {/* Section 5: Incident Timeline */}
          <ActivityHistory
            events={activityLog}
            onClearHistory={() => setActivityLog([])}
          />
        </main>

        {/* Footer */}
        <footer className="border-t border-[#263657] bg-[#10182B] mt-8">
          <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[12px] text-[#7C8BA5]">
            <span>AI Emergency Detection &amp; Alert System · Simulated Healthcare Monitoring Platform</span>
            <span>{RESIDENT_PROFILE.residence}</span>
          </div>
        </footer>
      </div>

      {/* Live Demo Scenario Picker Modal */}
      <DemoModeModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onStartDemo={handleStartDemo}
      />
    </div>
  );
}
