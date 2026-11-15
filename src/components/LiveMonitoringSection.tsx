import React from 'react';
import { Activity, HeartPulse, Pause, Play, Radio, Thermometer } from 'lucide-react';
import { SensorDataPoint, ScenarioType } from '../types/monitoring';
import { SensorChart } from './SensorChart';

interface LiveMonitoringSectionProps {
  sensorHistory: SensorDataPoint[];
  isStreamPaused: boolean;
  onToggleStream: () => void;
  activeScenario: ScenarioType | null;
}

export const LiveMonitoringSection: React.FC<LiveMonitoringSectionProps> = ({
  sensorHistory,
  isStreamPaused,
  onToggleStream,
  activeScenario,
}) => {
  const latest = sensorHistory[sensorHistory.length - 1];
  if (!latest) return null;

  const tempFahrenheit = ((latest.roomTemp * 9) / 5 + 32).toFixed(1);

  const hrAbnormal = latest.heartRate > 105 || latest.heartRate < 50;
  const movementAbnormal = latest.movementActivity <= 5;
  const motionAbnormal =
    activeScenario === 'fall_detection' || activeScenario === 'prolonged_inactivity';
  const tempWarning = latest.roomTemp < 18 || latest.roomTemp > 26;

  return (
    <section id="real-time-monitoring" aria-labelledby="real-time-monitoring-heading">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2
            id="real-time-monitoring-heading"
            className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight"
          >
            Real-Time Monitoring
          </h2>
          <p className="text-[12px] sm:text-[13px] text-[#AAB6CC] mt-1">
            Simulated residence sensors updating automatically every 2 seconds. Hover over any chart to inspect individual readings.
          </p>
        </div>

        <button
          type="button"
          onClick={onToggleStream}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold rounded-xl border border-[#263657] bg-[#111A30] text-white hover:bg-[#172554] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B82F6] whitespace-nowrap shrink-0 min-h-[42px]"
        >
          {isStreamPaused ? (
            <>
              <Play className="w-4 h-4 text-[#3B82F6]" aria-hidden="true" />
              Resume Feed
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 text-[#AAB6CC]" aria-hidden="true" />
              Pause Feed
            </>
          )}
        </button>
      </div>

      {/* 4 Sensor Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Heart Rate (BPM) */}
        <div className="rounded-xl bg-[#172554] border border-[#263657] shadow-lg shadow-black/20 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-[13px] text-[#AAB6CC]">
                <HeartPulse className="w-4 h-4 text-[#3B82F6]" aria-hidden="true" />
                <span>Heart Rate · Wearable Sensor (Simulated)</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2.5">
                <span className="font-display text-[32px] sm:text-[36px] font-bold tabular-nums leading-none tracking-tight text-white">
                  {latest.heartRate}
                </span>
                <span className="text-[14px] text-[#AAB6CC] font-medium">BPM</span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold border ${
                  hrAbnormal
                    ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                    : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                }`}
              >
                {hrAbnormal ? 'Elevated Alert' : 'Normal Range'}
              </span>
              <div className="text-[12px] text-[#7C8BA5] mt-1.5 tabular-nums">
                Target: 60–100 BPM
              </div>
            </div>
          </div>

          <SensorChart
            data={sensorHistory}
            valueKey="heartRate"
            unit="BPM"
            label="Heart Rate"
            min={45}
            max={160}
            safeRange={[60, 100]}
            strokeColor="#3B82F6"
            gradientStartColor="#3B82F6"
            height={148}
          />
        </div>

        {/* 2. Activity Level */}
        <div className="rounded-xl bg-[#172554] border border-[#263657] shadow-lg shadow-black/20 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-[13px] text-[#AAB6CC]">
                <Activity className="w-4 h-4 text-[#8B5CF6]" aria-hidden="true" />
                <span>Activity Level · Mobility Radar (Simulated)</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2.5">
                <span className="font-display text-[32px] sm:text-[36px] font-bold tabular-nums leading-none tracking-tight text-white">
                  {latest.movementActivity}%
                </span>
                <span className="text-[14px] text-[#AAB6CC] font-medium">Mobility Index</span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold border ${
                  movementAbnormal
                    ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                    : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                }`}
              >
                {movementAbnormal ? 'No Activity' : 'Active Mobility'}
              </span>
              <div className="text-[12px] text-[#7C8BA5] mt-1.5 tabular-nums">
                Baseline: 25–80%
              </div>
            </div>
          </div>

          <SensorChart
            data={sensorHistory}
            valueKey="movementActivity"
            unit="%"
            label="Activity Level"
            min={0}
            max={100}
            safeRange={[20, 85]}
            strokeColor="#8B5CF6"
            gradientStartColor="#8B5CF6"
            height={148}
          />
        </div>

        {/* 3. Motion Detection */}
        <div className="rounded-xl bg-[#111A30] border border-[#263657] shadow-lg shadow-black/20 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-[13px] text-[#AAB6CC]">
                <Radio className="w-4 h-4 text-[#3B82F6]" aria-hidden="true" />
                <span>Motion Detection · Room Sensor (Simulated)</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2.5 flex-wrap">
                <span className="font-display text-[28px] sm:text-[32px] font-bold leading-none tracking-tight text-white">
                  {latest.motionDetected ? 'Motion Active' : 'No Motion'}
                </span>
                <span className="font-display text-[15px] font-semibold tabular-nums text-[#AAB6CC]">
                  {latest.motionIntensity}/100
                </span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold border ${
                  motionAbnormal
                    ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                    : latest.motionDetected
                      ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                      : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                }`}
              >
                {activeScenario === 'fall_detection'
                  ? 'Impact Detected'
                  : activeScenario === 'prolonged_inactivity'
                    ? 'Extended Stillness'
                    : latest.motionDetected
                      ? 'Normal Presence'
                      : 'Idle Interval'}
              </span>
              <div className="text-[12px] text-[#7C8BA5] mt-1.5">
                Living Room &amp; Hall
              </div>
            </div>
          </div>

          <SensorChart
            data={sensorHistory}
            valueKey="motionIntensity"
            unit="idx"
            label="Motion Detection"
            min={0}
            max={100}
            strokeColor="#3B82F6"
            gradientStartColor="#3B82F6"
            chartType="bar"
            height={140}
          />
        </div>

        {/* 4. Room Temperature */}
        <div className="rounded-xl bg-[#111A30] border border-[#263657] shadow-lg shadow-black/20 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 text-[13px] text-[#AAB6CC]">
                <Thermometer className="w-4 h-4 text-[#8B5CF6]" aria-hidden="true" />
                <span>Room Temperature · Ambient Sensor (Simulated)</span>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2.5">
                <span className="font-display text-[32px] sm:text-[36px] font-bold tabular-nums leading-none tracking-tight text-white">
                  {latest.roomTemp.toFixed(1)}°C
                </span>
                <span className="text-[14px] tabular-nums text-[#AAB6CC]">
                  ({tempFahrenheit}°F)
                </span>
              </div>
            </div>

            <div className="text-right">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold border ${
                  tempWarning
                    ? 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30'
                    : 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                }`}
              >
                {tempWarning ? 'Outside Comfort Band' : 'Optimal Climate'}
              </span>
              <div className="text-[12px] text-[#7C8BA5] mt-1.5 tabular-nums">
                Target: 19.5–24.0°C
              </div>
            </div>
          </div>

          <SensorChart
            data={sensorHistory}
            valueKey="roomTemp"
            unit="°C"
            label="Room Temperature"
            min={16}
            max={28}
            safeRange={[19.5, 24]}
            strokeColor="#8B5CF6"
            gradientStartColor="#8B5CF6"
            height={140}
          />
        </div>
      </div>
    </section>
  );
};
