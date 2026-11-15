import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Crosshair,
  Eye,
  EyeOff,
  Maximize2,
  Navigation,
  Route,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { RESIDENT_PROFILE } from '../data/simulationData';
import {
  ActiveNotification,
  AlertIncident,
  EmergencyContact,
  SystemStatus,
} from '../types/monitoring';

interface EmergencyLocationMapProps {
  contacts: EmergencyContact[];
  activeIncident: AlertIncident | null;
  activeNotification: ActiveNotification | null;
  systemStatus: SystemStatus;
}

const ROLE_COLORS: Record<string, { hex: string; label: string }> = {
  'neighbor-a': { hex: '#3B82F6', label: 'Neighbor A' },
  'neighbor-b': { hex: '#8B5CF6', label: 'Neighbor B' },
  'family-member': { hex: '#06B6D4', label: 'Family Member' },
};

function interpolatePosition(
  start: [number, number],
  end: [number, number],
  progress: number
): [number, number] {
  const t = Math.max(0, Math.min(1, progress));
  const midLat = (start[0] + end[0]) / 2 + (end[1] - start[1]) * 0.08;
  const midLng = (start[1] + end[1]) / 2 - (end[0] - start[0]) * 0.08;

  const oneMinusT = 1 - t;
  const lat =
    oneMinusT * oneMinusT * start[0] +
    2 * oneMinusT * t * midLat +
    t * t * end[0];
  const lng =
    oneMinusT * oneMinusT * start[1] +
    2 * oneMinusT * t * midLng +
    t * t * end[1];
  return [lat, lng];
}

function createSampledArc(
  start: [number, number],
  end: [number, number],
  startT = 0,
  steps = 20
): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = startT + ((1 - startT) * i) / steps;
    pts.push(interpolatePosition(start, end, t));
  }
  return pts;
}

export const EmergencyLocationMap: React.FC<EmergencyLocationMapProps> = ({
  contacts,
  activeIncident,
  activeNotification,
  systemStatus,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const respondingMarkerRef = useRef<L.Marker | null>(null);
  const respondingHaloRef = useRef<L.CircleMarker | null>(null);
  const activeRouteRef = useRef<L.Polyline | null>(null);
  const completedRouteRef = useRef<L.Polyline | null>(null);
  const travelProgressRef = useRef(0);

  const [showRoutes, setShowRoutes] = useState(true);
  const [visibleContacts, setVisibleContacts] = useState<Record<string, boolean>>({
    'neighbor-a': true,
    'neighbor-b': true,
    'family-member': true,
  });

  const [travelProgress, setTravelProgress] = useState(0);
  travelProgressRef.current = travelProgress;

  const respondingContact = useMemo(
    () => contacts.find((c) => c.responseStatus === 'accepted') || null,
    [contacts]
  );

  const notifiedContact = useMemo(() => {
    if (!activeNotification) return null;
    return contacts.find((c) => c.id === activeNotification.contactId) || null;
  }, [activeNotification, contacts]);

  const nextPriorityContact = useMemo(() => {
    return (
      [...contacts]
        .filter(
          (c) =>
            c.available &&
            c.responseStatus !== 'unavailable' &&
            c.responseStatus !== 'timed_out'
        )
        .sort((a, b) => a.etaMinutes - b.etaMinutes)[0] || null
    );
  }, [contacts]);

  const selectedResponder =
    respondingContact || notifiedContact || nextPriorityContact;

  useEffect(() => {
    if (!respondingContact || !activeIncident) {
      setTravelProgress(0);
      return;
    }

    setTravelProgress(0);
    const interval = window.setInterval(() => {
      setTravelProgress((prev) => {
        if (prev >= 1) {
          window.clearInterval(interval);
          return 1;
        }
        return Math.min(1, prev + 0.015);
      });
    }, 150);

    return () => window.clearInterval(interval);
  }, [respondingContact?.id, activeIncident?.id]);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: RESIDENT_PROFILE.coords,
      zoom: 15,
      zoomControl: false,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    layerGroupRef.current = layerGroup;

    const allCoords: [number, number][] = [
      RESIDENT_PROFILE.coords,
      ...contacts.map((c) => c.coords),
    ];
    if (allCoords.length > 1) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [48, 48], maxZoom: 15 });
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      layerGroupRef.current = null;
    };
  }, []);

  // Build markers & route layers when simulation state or visibility changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();
    respondingMarkerRef.current = null;
    respondingHaloRef.current = null;
    activeRouteRef.current = null;
    completedRouteRef.current = null;

    const isEmergencyActive = Boolean(activeIncident);
    const progress = travelProgressRef.current;

    if (isEmergencyActive) {
      L.circle(RESIDENT_PROFILE.coords, {
        radius: 135,
        color: '#EF4444',
        weight: 2,
        opacity: 0.8,
        fillColor: '#EF4444',
        fillOpacity: 0.16,
      }).addTo(group);
    }

    if (showRoutes) {
      if (respondingContact && visibleContacts[respondingContact.id]) {
        const currentPos = interpolatePosition(
          respondingContact.coords,
          RESIDENT_PROFILE.coords,
          progress
        );

        const completedPts: [number, number][] = [];
        if (progress > 0.02) {
          for (let i = 0; i <= 12; i++) {
            completedPts.push(
              interpolatePosition(
                respondingContact.coords,
                RESIDENT_PROFILE.coords,
                (progress * i) / 12
              )
            );
          }
        }
        completedRouteRef.current = L.polyline(completedPts, {
          color: '#7C8BA5',
          weight: 2.5,
          dashArray: '4 6',
          opacity: 0.7,
        }).addTo(group);

        const remainingPts =
          progress < 1
            ? createSampledArc(
                respondingContact.coords,
                RESIDENT_PROFILE.coords,
                progress,
                20
              )
            : [];
        activeRouteRef.current = L.polyline(remainingPts, {
          color: '#10B981',
          weight: 4,
          opacity: 0.95,
        }).addTo(group);

        respondingHaloRef.current = L.circleMarker(currentPos, {
          radius: 16,
          color: '#10B981',
          weight: 2,
          fillColor: '#10B981',
          fillOpacity: 0.2,
        }).addTo(group);
      } else if (
        selectedResponder &&
        visibleContacts[selectedResponder.id] &&
        selectedResponder.available
      ) {
        const previewPts = createSampledArc(
          selectedResponder.coords,
          RESIDENT_PROFILE.coords,
          0,
          16
        );
        L.polyline(previewPts, {
          color: isEmergencyActive ? '#F59E0B' : '#3B82F6',
          weight: isEmergencyActive ? 3 : 2,
          dashArray: '6 6',
          opacity: isEmergencyActive ? 0.9 : 0.6,
        }).addTo(group);
      }
    }

    // Monitored Resident Marker
    const residentColor = isEmergencyActive ? '#EF4444' : '#3B82F6';
    const residentBadge = isEmergencyActive
      ? `Alert · ${RESIDENT_PROFILE.name}`
      : `Resident · ${RESIDENT_PROFILE.name}`;

    const residentIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
          <div style="width:22px;height:22px;border-radius:9999px;background:${residentColor};border:3px solid #FFFFFF;box-shadow:0 4px 12px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;">
            <span style="width:6px;height:6px;border-radius:9999px;background:#FFFFFF;"></span>
          </div>
          <div style="position:absolute;top:27px;left:50%;transform:translateX(-50%);padding:3px 8px;border-radius:6px;background:${
            isEmergencyActive ? '#EF4444' : '#10182B'
          };border:1px solid ${
            isEmergencyActive ? '#FCA5A5' : '#3B82F6'
          };color:#FFFFFF;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 4px 10px rgba(0,0,0,0.45);">
            ${residentBadge}
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const residentMarker = L.marker(RESIDENT_PROFILE.coords, {
      icon: residentIcon,
      zIndexOffset: 500,
    }).addTo(group);

    residentMarker.bindPopup(
      `<div style="font-family:'Inter',sans-serif;font-size:12px;line-height:1.5;color:#FFFFFF;">
        <strong>${RESIDENT_PROFILE.name} (Simulated Resident)</strong><br/>
        <span style="color:#AAB6CC;">${
          activeIncident ? activeIncident.location : RESIDENT_PROFILE.residence
        }</span><br/>
        <span>Status: <strong>${
          activeIncident ? activeIncident.title : 'Monitoring Normal'
        }</strong></span><br/>
        <span style="color:#7C8BA5;font-size:11px;">Fictional Coords: ${RESIDENT_PROFILE.coords[0].toFixed(
          4
        )}, ${RESIDENT_PROFILE.coords[1].toFixed(4)}</span>
      </div>`
    );

    // Contact Markers
    contacts.forEach((contact) => {
      if (!visibleContacts[contact.id]) return;

      const isResponding = contact.responseStatus === 'accepted';
      const isUnavailable =
        !contact.available ||
        contact.responseStatus === 'unavailable' ||
        contact.responseStatus === 'timed_out';
      const isHighlightedNext =
        !isResponding && selectedResponder?.id === contact.id && !isUnavailable;

      const baseColor = ROLE_COLORS[contact.id]?.hex || '#3B82F6';
      const markerColor = isResponding
        ? '#10B981'
        : isUnavailable
          ? '#7C8BA5'
          : baseColor;

      const ringStyle = isHighlightedNext
        ? 'outline:3px solid #F59E0B;outline-offset:2px;'
        : isResponding
          ? 'outline:3px solid #10B981;outline-offset:2px;'
          : '';

      const pos = isResponding
        ? interpolatePosition(contact.coords, RESIDENT_PROFILE.coords, progress)
        : contact.coords;

      const remainingEta = isResponding
        ? Math.max(0, Number((contact.etaMinutes * (1 - progress)).toFixed(1)))
        : contact.etaMinutes;

      const statusSubLabel = isResponding
        ? progress >= 1
          ? 'Arrived'
          : `ETA ${remainingEta}m`
        : isUnavailable
          ? 'Unavailable'
          : isHighlightedNext
            ? activeNotification?.contactId === contact.id
              ? `Notifying · ${contact.etaMinutes}m`
              : `Next · ${contact.etaMinutes}m`
            : `${contact.etaMinutes}m`;

      const contactIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;opacity:${
            isUnavailable ? '0.68' : '1'
          };">
            <div style="width:18px;height:18px;border-radius:9999px;background:${markerColor};border:2.5px solid #FFFFFF;box-shadow:0 3px 8px rgba(0,0,0,0.45);${ringStyle}"></div>
            <div style="position:absolute;top:24px;left:50%;transform:translateX(-50%);padding:2px 8px;border-radius:6px;background:#10182B;border:1px solid ${
              isHighlightedNext ? '#F59E0B' : isResponding ? '#10B981' : '#263657'
            };color:#FFFFFF;font-family:'Inter',sans-serif;font-size:11.5px;font-weight:600;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,0.4);">
              ${contact.roleLabel} <span class="marker-eta-label" style="color:${
                isResponding
                  ? '#10B981'
                  : isHighlightedNext
                    ? '#F59E0B'
                    : '#AAB6CC'
              };font-weight:500;">· ${statusSubLabel}</span>
            </div>
          </div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });

      const marker = L.marker(pos, {
        icon: contactIcon,
        zIndexOffset: isResponding ? 450 : isHighlightedNext ? 350 : 200,
      }).addTo(group);

      if (isResponding) {
        respondingMarkerRef.current = marker;
      }

      marker.bindPopup(
        `<div style="font-family:'Inter',sans-serif;font-size:12px;line-height:1.5;color:#FFFFFF;">
          <strong>${contact.roleLabel} — ${contact.name}</strong><br/>
          <span style="color:#AAB6CC;">${contact.relationship}</span><br/>
          <span>Status: <strong>${
            isResponding
              ? progress >= 1
                ? 'Arrived on Scene (Simulated)'
                : 'Responding · En Route (Simulated)'
              : isUnavailable
                ? 'Unavailable'
                : isHighlightedNext
                  ? 'Selected Next Responder'
                  : 'Standby'
          }</strong></span><br/>
          <span>Est. Arrival Time: <strong>${
            isResponding && progress >= 1 ? '0 min (Arrived)' : `${remainingEta} min`
          }</strong></span><br/>
          <span style="color:#7C8BA5;font-size:11px;">Fictional Distance: ${
            contact.distanceLabel
          }</span>
        </div>`
      );
    });
  }, [
    contacts,
    activeIncident,
    activeNotification,
    selectedResponder,
    respondingContact,
    showRoutes,
    visibleContacts,
  ]);

  // Smoothly update responding marker position and route polylines on travelProgress ticks
  useEffect(() => {
    if (!respondingContact || !visibleContacts[respondingContact.id]) return;

    const currentPos = interpolatePosition(
      respondingContact.coords,
      RESIDENT_PROFILE.coords,
      travelProgress
    );

    if (respondingMarkerRef.current) {
      respondingMarkerRef.current.setLatLng(currentPos);
      const el = respondingMarkerRef.current.getElement();
      const labelSpan = el?.querySelector('.marker-eta-label');
      if (labelSpan) {
        const remEta = Math.max(
          0,
          Number((respondingContact.etaMinutes * (1 - travelProgress)).toFixed(1))
        );
        labelSpan.textContent =
          travelProgress >= 1 ? '· Arrived' : `· ETA ${remEta}m`;
      }
    }

    if (respondingHaloRef.current) {
      respondingHaloRef.current.setLatLng(currentPos);
    }

    if (showRoutes) {
      if (completedRouteRef.current) {
        if (travelProgress > 0.02) {
          const completedPts: [number, number][] = [];
          for (let i = 0; i <= 12; i++) {
            completedPts.push(
              interpolatePosition(
                respondingContact.coords,
                RESIDENT_PROFILE.coords,
                (travelProgress * i) / 12
              )
            );
          }
          completedRouteRef.current.setLatLngs(completedPts);
        } else {
          completedRouteRef.current.setLatLngs([]);
        }
      }

      if (activeRouteRef.current) {
        if (travelProgress < 1) {
          activeRouteRef.current.setLatLngs(
            createSampledArc(
              respondingContact.coords,
              RESIDENT_PROFILE.coords,
              travelProgress,
              20
            )
          );
        } else {
          activeRouteRef.current.setLatLngs([]);
        }
      }
    }
  }, [travelProgress, respondingContact, showRoutes, visibleContacts]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (activeIncident && selectedResponder && visibleContacts[selectedResponder.id]) {
      const targetBounds = L.latLngBounds([
        RESIDENT_PROFILE.coords,
        selectedResponder.coords,
      ]);
      map.fitBounds(targetBounds, { padding: [72, 72], maxZoom: 16 });
    }
  }, [activeIncident?.id, respondingContact?.id]);

  const handleZoomIn = () => mapInstanceRef.current?.zoomIn();
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut();

  const handleCenterResident = () => {
    mapInstanceRef.current?.setView(RESIDENT_PROFILE.coords, 16, { animate: true });
  };

  const handleShowAllContacts = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const pts: [number, number][] = [RESIDENT_PROFILE.coords];
    contacts.forEach((c) => {
      if (visibleContacts[c.id]) pts.push(c.coords);
    });
    if (pts.length === 1) {
      map.setView(RESIDENT_PROFILE.coords, 16, { animate: true });
    } else {
      map.fitBounds(L.latLngBounds(pts), { padding: [48, 48], maxZoom: 15 });
    }
  };

  const handleToggleContactVisibility = (contactId: string) => {
    setVisibleContacts((prev) => ({
      ...prev,
      [contactId]: !prev[contactId],
    }));
  };

  const responderEtaDisplay = useMemo(() => {
    if (!selectedResponder) return '—';
    if (respondingContact) {
      if (travelProgress >= 1) return 'Arrived (0 min)';
      const rem = Math.max(
        0.1,
        selectedResponder.etaMinutes * (1 - travelProgress)
      ).toFixed(1);
      return `${rem} min`;
    }
    return `${selectedResponder.etaMinutes} min`;
  }, [selectedResponder, respondingContact, travelProgress]);

  const responderStatusDisplay = useMemo(() => {
    if (!selectedResponder) return 'No Available Contacts';
    if (respondingContact) {
      return travelProgress >= 1 ? 'Arrived on Scene' : 'Responding · En Route';
    }
    if (activeNotification?.contactId === selectedResponder.id) {
      return 'Notification Sent · Awaiting Reply';
    }
    if (activeIncident && systemStatus === 'unanswered') {
      return 'Fallback Protocol Active';
    }
    return 'Highlighted Next Priority';
  }, [
    selectedResponder,
    respondingContact,
    travelProgress,
    activeNotification,
    activeIncident,
    systemStatus,
  ]);

  return (
    <section id="location-tracking" aria-labelledby="location-tracking-heading">
      <div className="rounded-xl bg-[#111A30] border border-[#263657] shadow-lg shadow-black/20 p-5 sm:p-6 space-y-4">
        {/* Header + Controls */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2
              id="location-tracking-heading"
              className="text-[20px] sm:text-[22px] font-semibold text-white tracking-tight"
            >
              Live Emergency Location Tracking
            </h2>
            <p className="text-[12px] sm:text-[13px] text-[#AAB6CC] mt-1">
              Interactive OpenStreetMap view using fictional residential coordinates, synchronized responder prioritization, and live dispatch animation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center rounded-xl border border-[#263657] bg-[#10182B] overflow-hidden">
              <button
                type="button"
                onClick={handleZoomIn}
                aria-label="Zoom in map"
                title="Zoom in"
                className="px-3 py-2 text-[#AAB6CC] hover:text-white hover:bg-[#172554] transition-colors border-r border-[#263657] min-h-[42px] flex items-center justify-center"
              >
                <ZoomIn className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                aria-label="Zoom out map"
                title="Zoom out"
                className="px-3 py-2 text-[#AAB6CC] hover:text-white hover:bg-[#172554] transition-colors min-h-[42px] flex items-center justify-center"
              >
                <ZoomOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCenterResident}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#263657] bg-[#10182B] text-white hover:bg-[#172554] text-[14px] font-semibold transition-colors whitespace-nowrap min-h-[42px]"
            >
              <Crosshair className="w-4 h-4 text-[#3B82F6]" aria-hidden="true" />
              Center on Resident
            </button>

            <button
              type="button"
              onClick={handleShowAllContacts}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#263657] bg-[#10182B] text-white hover:bg-[#172554] text-[14px] font-semibold transition-colors whitespace-nowrap min-h-[42px]"
            >
              <Maximize2 className="w-4 h-4 text-[#8B5CF6]" aria-hidden="true" />
              Show All Contacts
            </button>

            <button
              type="button"
              onClick={() => setShowRoutes((r) => !r)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[14px] font-semibold transition-all whitespace-nowrap min-h-[42px] ${
                showRoutes
                  ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] border-transparent text-white'
                  : 'bg-[#10182B] border-[#263657] text-[#AAB6CC] hover:text-white hover:bg-[#172554]'
              }`}
            >
              <Route className="w-4 h-4" aria-hidden="true" />
              {showRoutes ? 'Routes: Visible' : 'Routes: Hidden'}
            </button>
          </div>
        </div>

        {/* Contact Visibility Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-2.5 px-4 rounded-xl bg-[#10182B] border border-[#263657]">
          <span className="text-[13px] font-medium text-[#AAB6CC]">
            Contact Layers:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {contacts.map((contact) => {
              const isVisible = visibleContacts[contact.id];
              const roleColor = ROLE_COLORS[contact.id]?.hex || '#3B82F6';
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleToggleContactVisibility(contact.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold border transition-colors whitespace-nowrap min-h-[38px] ${
                    isVisible
                      ? 'bg-[#172554] border-[#263657] text-white hover:border-[#3B82F6]'
                      : 'bg-[#0B1020] border-[#263657] text-[#7C8BA5] hover:text-[#AAB6CC]'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: isVisible ? roleColor : '#7C8BA5' }}
                    aria-hidden="true"
                  />
                  <span>{contact.roleLabel}</span>
                  {isVisible ? (
                    <Eye className="w-3.5 h-3.5 text-[#AAB6CC]" aria-hidden="true" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 text-[#7C8BA5]" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Container */}
        <div className="relative rounded-xl overflow-hidden border border-[#263657] bg-[#0B1020] dark-map-tiles">
          <div
            ref={mapContainerRef}
            className="w-full h-[380px] sm:h-[440px] lg:h-[480px] z-0"
            aria-label="Interactive emergency location tracking map"
          />

          <AnimatePresence>
            {activeIncident && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="sm:absolute sm:top-3.5 sm:left-3.5 sm:max-w-sm z-[400] bg-[#10182B]/95 text-white border-t sm:border border-[#EF4444]/60 sm:rounded-xl p-4 shadow-2xl space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-[#EF4444]">
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Emergency Map Alert · {activeIncident.title}</span>
                  </div>
                  <span className="text-[12px] text-[#7C8BA5] tabular-nums">
                    {activeIncident.timeFormatted}
                  </span>
                </div>

                <div className="text-[13px] text-[#AAB6CC]">
                  {activeIncident.location}
                </div>

                <div className="pt-2.5 border-t border-[#263657] grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <div className="text-[12px] text-[#7C8BA5]">Selected Responder</div>
                    <div className="font-semibold text-white mt-0.5 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {selectedResponder
                          ? selectedResponder.roleLabel
                          : 'None Available'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-[#7C8BA5]">Est. Arrival Time</div>
                    <div className="font-display tabular-nums font-bold text-[#10B981] mt-0.5">
                      {responderEtaDisplay}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[12px] text-[#7C8BA5]">Responder Status</div>
                    <div className="font-semibold text-white mt-0.5">
                      {responderStatusDisplay}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend & Fictional Coordinates Notice */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 text-[12px] text-[#AAB6CC]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#3B82F6] border border-white" />
              Resident (Normal)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#EF4444] border border-white" />
              Resident (Emergency)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
              Neighbor A
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
              Neighbor B
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#06B6D4]" />
              Family Member
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#10182B] border-2 border-[#F59E0B]" />
              Next / Notified
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              Responding
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#7C8BA5]" />
              Unavailable
            </span>
          </div>

          <div className="text-[12px] text-[#7C8BA5]">
            Fictional Oakridge coordinates (simulated). Route lines show direct tracking vectors, not street-routed road distances.
          </div>
        </div>
      </div>
    </section>
  );
};
