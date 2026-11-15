import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Search,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { ActivityCategory, ActivityEvent } from '../types/monitoring';

interface ActivityHistoryProps {
  events: ActivityEvent[];
  onClearHistory: () => void;
}

const CATEGORY_TABS: { id: 'all' | ActivityCategory; label: string }[] = [
  { id: 'all', label: 'All Events' },
  { id: 'anomaly', label: 'Anomalies' },
  { id: 'notification', label: 'Notifications' },
  { id: 'response', label: 'Responses' },
  { id: 'sensor', label: 'Sensors' },
];

const SEVERITY_BADGE: Record<
  ActivityEvent['severity'],
  { label: string; classes: string }
> = {
  info: {
    label: 'Info',
    classes: 'text-[#3B82F6] bg-[#3B82F6]/15 border-[#3B82F6]/30',
  },
  warning: {
    label: 'Escalation',
    classes: 'text-[#F59E0B] bg-[#F59E0B]/15 border-[#F59E0B]/35',
  },
  critical: {
    label: 'Emergency',
    classes: 'text-[#EF4444] bg-[#EF4444]/15 border-[#EF4444]/40',
  },
  success: {
    label: 'Confirmed',
    classes: 'text-[#10B981] bg-[#10B981]/15 border-[#10B981]/35',
  },
};

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({
  events,
  onClearHistory,
}) => {
  const [filter, setFilter] = useState<'all' | ActivityCategory>('all');
  const [query, setQuery] = useState('');

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((ev) => {
      if (filter !== 'all' && ev.category !== filter) return false;
      if (!q) return true;
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.detail.toLowerCase().includes(q) ||
        ev.category.toLowerCase().includes(q)
      );
    });
  }, [events, filter, query]);

  const getEventIcon = (ev: ActivityEvent) => {
    switch (ev.category) {
      case 'anomaly':
        return <AlertTriangle className="w-4 h-4 text-[#EF4444] shrink-0" aria-hidden="true" />;
      case 'notification':
        return <Bell className="w-4 h-4 text-[#F59E0B] shrink-0" aria-hidden="true" />;
      case 'response':
        return ev.severity === 'success' ? (
          <UserCheck className="w-4 h-4 text-[#10B981] shrink-0" aria-hidden="true" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0" aria-hidden="true" />
        );
      case 'sensor':
        return <Activity className="w-4 h-4 text-[#3B82F6] shrink-0" aria-hidden="true" />;
      default:
        return <CheckCircle2 className="w-4 h-4 text-[#8B5CF6] shrink-0" aria-hidden="true" />;
    }
  };

  return (
    <section id="incident-timeline" aria-labelledby="incident-timeline-heading">
      <div className="rounded-xl bg-[#111A30] border border-[#263657] shadow-lg shadow-black/20 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2
              id="incident-timeline-heading"
              className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight"
            >
              Incident Timeline
            </h2>
            <p className="text-[12px] sm:text-[13px] text-[#AAB6CC] mt-1">
              Timestamped log of sensor updates, detected anomalies, outbound notifications, and responder actions.
            </p>
          </div>

          <button
            type="button"
            onClick={onClearHistory}
            disabled={events.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-[14px] font-semibold rounded-xl border border-[#263657] bg-[#10182B] text-[#AAB6CC] hover:text-white hover:bg-[#172554] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap min-h-[42px]"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            Clear Timeline
          </button>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#10182B] border border-[#263657] rounded-xl">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-2 text-[13px] font-semibold rounded-lg transition-all whitespace-nowrap ${
                  filter === tab.id
                    ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white'
                    : 'text-[#AAB6CC] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search
              className="w-4 h-4 text-[#7C8BA5] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search timeline events..."
              aria-label="Search incident timeline"
              className="w-full pl-10 pr-3.5 py-2.5 text-[14px] rounded-xl border border-[#263657] bg-[#10182B] text-white placeholder:text-[#7C8BA5] focus:outline-none focus:border-[#3B82F6]"
            />
          </div>
        </div>

        {/* Timeline List */}
        <div className="border border-[#263657] rounded-xl overflow-hidden bg-[#10182B]">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-[14px] text-[#7C8BA5]">
              No matching events recorded yet. Trigger a scenario or wait for live sensor updates.
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto divide-y divide-[#263657]">
              {filteredEvents.map((ev) => {
                const badge = SEVERITY_BADGE[ev.severity];
                return (
                  <div
                    key={ev.id}
                    className="px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#172554]/55 transition-colors"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="mt-0.5 p-2 rounded-lg bg-[#111A30] border border-[#263657] shrink-0">
                        {getEventIcon(ev)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[14px] sm:text-[15px] font-semibold text-white">
                            {ev.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md border text-[12px] font-medium ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#AAB6CC] mt-1 leading-relaxed">
                          {ev.detail}
                        </p>
                      </div>
                    </div>

                    <div className="tabular-nums text-[12px] sm:text-[13px] text-[#7C8BA5] whitespace-nowrap shrink-0 sm:text-right pl-11 sm:pl-0">
                      {ev.timeFormatted}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
