import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock, HeartPulse, PersonStanding, Play, X } from 'lucide-react';
import { EMERGENCY_SCENARIOS } from '../data/simulationData';
import { ScenarioType } from '../types/monitoring';

interface DemoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartDemo: (scenario: ScenarioType) => void;
}

const SCENARIO_ICONS: Record<ScenarioType, React.ReactNode> = {
  fall_detection: <PersonStanding className="w-5 h-5 text-[#EF4444]" aria-hidden="true" />,
  unusual_health: <HeartPulse className="w-5 h-5 text-[#3B82F6]" aria-hidden="true" />,
  prolonged_inactivity: <Clock className="w-5 h-5 text-[#F59E0B]" aria-hidden="true" />,
};

export const DemoModeModal: React.FC<DemoModeModalProps> = ({
  isOpen,
  onClose,
  onStartDemo,
}) => {
  const scenarios = Object.values(EMERGENCY_SCENARIOS);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B1020]/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-2xl rounded-2xl bg-[#10182B] text-white border border-[#263657] shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-[#263657] flex items-start justify-between gap-4">
              <div>
                <h2
                  id="demo-modal-title"
                  className="font-display text-[22px] font-semibold text-white tracking-tight"
                >
                  Live Demo Mode
                </h2>
                <p className="text-[14px] text-[#AAB6CC] mt-1 leading-relaxed">
                  Choose an emergency scenario to watch automated sensor detection, map tracking, contact escalation, and responder dispatch play out step by step.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close Live Demo Mode dialog"
                className="p-2 rounded-lg text-[#AAB6CC] hover:text-white hover:bg-[#172554] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3.5">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="rounded-xl bg-[#172554]/80 border border-[#263657] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-lg bg-[#10182B] border border-[#263657] shrink-0 mt-0.5">
                      {SCENARIO_ICONS[scenario.id]}
                    </div>
                    <div>
                      <div className="font-display text-[16px] font-semibold text-white">
                        {scenario.title}
                      </div>
                      <p className="text-[13px] text-[#AAB6CC] mt-1 leading-relaxed">
                        {scenario.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onStartDemo(scenario.id)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] hover:opacity-95 text-white text-[14px] font-semibold transition-opacity whitespace-nowrap shrink-0 min-h-[44px]"
                  >
                    <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                    Run Demo
                  </button>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 bg-[#0B1020]/60 border-t border-[#263657] flex flex-wrap items-center justify-between gap-3 text-[13px] text-[#7C8BA5]">
              <span>Automated 15-second walkthrough · Stop anytime</span>
              <button
                type="button"
                onClick={onClose}
                className="text-[#AAB6CC] hover:text-white font-semibold px-3 py-1.5"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
