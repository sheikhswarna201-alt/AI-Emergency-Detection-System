import {
  EmergencyContact,
  EmergencyScenarioConfig,
  ScenarioType,
  SensorDataPoint,
} from '../types/monitoring';

export const RESIDENT_PROFILE = {
  name: 'Eleanor Vance',
  age: 79,
  residence: 'Oakridge Residence · Unit 4B (Simulated)',
  monitoringNode: 'Room Sensor Hub · Unit 4B',
  coords: [45.5242, -122.6815] as [number, number],
};

export const EMERGENCY_SCENARIOS: Record<ScenarioType, EmergencyScenarioConfig> = {
  fall_detection: {
    id: 'fall_detection',
    title: 'Possible Fall Detection',
    shortLabel: 'Possible Fall',
    description:
      'Sudden downward impact followed by floor-level stillness and an elevated heart rate.',
    location: 'Oakridge Residence · Unit 4B — Living Room (Simulated)',
    severity: 'Critical',
    triggerSummary:
      'Sudden impact detected with zero subsequent movement and heart rate elevated to 118 BPM.',
  },
  unusual_health: {
    id: 'unusual_health',
    title: 'Unusual Health Reading',
    shortLabel: 'Unusual Health',
    description:
      'Sustained elevated heart rate exceeding normal resting thresholds with restless activity.',
    location: 'Oakridge Residence · Unit 4B — Bedroom (Simulated)',
    severity: 'Critical',
    triggerSummary:
      'Sustained heart rate spike at 142 BPM alongside irregular movement bursts.',
  },
  prolonged_inactivity: {
    id: 'prolonged_inactivity',
    title: 'Prolonged Inactivity',
    shortLabel: 'Prolonged Inactivity',
    description:
      'Extended absence of room motion and zero activity during expected waking hours.',
    location: 'Oakridge Residence · Unit 4B — Kitchen & Hallway (Simulated)',
    severity: 'High',
    triggerSummary:
      'No room motion detected and 0% activity level past the expected check-in window.',
  },
};

export const INITIAL_CONTACTS: EmergencyContact[] = [
  {
    id: 'neighbor-a',
    roleLabel: 'Neighbor A',
    name: 'Martha Jenkins',
    relationship: 'Next-door Neighbor · Unit 4A',
    distanceLabel: '18 meters',
    distanceMeters: 18,
    etaMinutes: 2,
    available: true,
    responseStatus: 'standby',
    channel: 'Push Alert & SMS (Simulated)',
    coords: [45.5249, -122.6798],
  },
  {
    id: 'neighbor-b',
    roleLabel: 'Neighbor B',
    name: 'David Chen',
    relationship: 'Floor Volunteer · Unit 4F',
    distanceLabel: '55 meters',
    distanceMeters: 55,
    etaMinutes: 4,
    available: true,
    responseStatus: 'standby',
    channel: 'Push Alert & Voice Call (Simulated)',
    coords: [45.5221, -122.6772],
  },
  {
    id: 'family-member',
    roleLabel: 'Family Member',
    name: 'Claire Vance',
    relationship: 'Daughter · Primary Family Contact',
    distanceLabel: '4.2 km',
    distanceMeters: 4200,
    etaMinutes: 12,
    available: true,
    responseStatus: 'standby',
    channel: 'Mobile App Alert (Simulated)',
    coords: [45.5335, -122.6682],
  },
];

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function generateInitialSensorHistory(count = 24): SensorDataPoint[] {
  const now = Date.now();
  const points: SensorDataPoint[] = [];
  let hr = 71;
  let temp = 21.4;
  let movement = 46;

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * 2000;
    hr = Math.round(Math.max(64, Math.min(82, hr + (Math.random() - 0.5) * 4)));
    temp = Number(
      Math.max(20.8, Math.min(22.2, temp + (Math.random() - 0.5) * 0.12)).toFixed(1)
    );
    movement = Math.round(
      Math.max(22, Math.min(72, movement + (Math.random() - 0.5) * 14))
    );
    const motionDetected = movement > 28 && Math.random() > 0.25;
    const motionIntensity = motionDetected
      ? Math.round(Math.min(100, movement + (Math.random() - 0.3) * 18))
      : Math.round(Math.random() * 8);

    points.push({
      id: `init-${i}`,
      timestamp,
      timeLabel: formatTime(timestamp),
      heartRate: hr,
      motionDetected,
      motionIntensity,
      roomTemp: temp,
      movementActivity: movement,
      isAnomaly: false,
    });
  }

  return points;
}
