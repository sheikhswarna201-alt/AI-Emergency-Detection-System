export type ScenarioType =
  | 'fall_detection'
  | 'unusual_health'
  | 'prolonged_inactivity';

export type SystemStatus =
  | 'normal'
  | 'alert_triggered'
  | 'notifying'
  | 'escalating'
  | 'accepted'
  | 'unanswered';

export interface SensorDataPoint {
  id: string;
  timestamp: number;
  timeLabel: string;
  heartRate: number; // BPM
  motionDetected: boolean;
  motionIntensity: number; // 0-100
  roomTemp: number; // Celsius
  movementActivity: number; // 0-100%
  isAnomaly?: boolean;
}

export interface EmergencyScenarioConfig {
  id: ScenarioType;
  title: string;
  shortLabel: string;
  description: string;
  location: string;
  severity: 'Critical' | 'High';
  triggerSummary: string;
}

export interface AlertIncident {
  id: string;
  scenario: ScenarioType;
  title: string;
  severity: 'Critical' | 'High';
  triggeredAt: number;
  timeFormatted: string;
  location: string;
  summary: string;
  status: SystemStatus;
  acceptedBy?: string;
  acceptedEta?: number;
}

export type ContactResponseStatus =
  | 'standby'
  | 'notified'
  | 'accepted'
  | 'unavailable'
  | 'timed_out';

export interface EmergencyContact {
  id: string;
  roleLabel: string; // e.g., "Neighbor A", "Neighbor B", "Family Member"
  name: string;
  relationship: string;
  distanceLabel: string;
  distanceMeters: number;
  etaMinutes: number;
  available: boolean;
  responseStatus: ContactResponseStatus;
  channel: string;
  coords: [number, number];
}

export interface ActiveNotification {
  contactId: string;
  contactRole: string;
  contactName: string;
  etaMinutes: number;
  sentAt: number;
  secondsRemaining: number;
  totalSeconds: number;
  attemptNumber: number;
  escalationReason?: string;
}

export type ActivityCategory =
  | 'sensor'
  | 'anomaly'
  | 'notification'
  | 'response'
  | 'system';

export interface ActivityEvent {
  id: string;
  timestamp: number;
  timeFormatted: string;
  category: ActivityCategory;
  title: string;
  detail: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface DemoProgress {
  active: boolean;
  scenario: ScenarioType | null;
  stepIndex: number;
  stepLabel: string;
  totalSteps: number;
}
