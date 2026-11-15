import React, { useId, useMemo, useRef, useState } from 'react';
import { SensorDataPoint } from '../types/monitoring';

interface SensorChartProps {
  data: SensorDataPoint[];
  valueKey: 'heartRate' | 'motionIntensity' | 'roomTemp' | 'movementActivity';
  unit: string;
  label: string;
  min: number;
  max: number;
  safeRange?: [number, number];
  strokeColor: string;
  gradientStartColor: string;
  anomalyStrokeColor?: string;
  chartType?: 'area' | 'bar';
  height?: number;
}

export const SensorChart: React.FC<SensorChartProps> = ({
  data,
  valueKey,
  unit,
  label,
  min,
  max,
  safeRange,
  strokeColor,
  gradientStartColor,
  anomalyStrokeColor = '#EF4444',
  chartType = 'area',
  height = 148,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, '');

  const width = 460;
  const padLeft = 36;
  const padRight = 10;
  const padTop = 12;
  const padBottom = 22;
  const innerWidth = width - padLeft - padRight;
  const innerHeight = height - padTop - padBottom;

  const { points, linePath, areaPath, yTicks } = useMemo(() => {
    if (data.length === 0) {
      return { points: [], linePath: '', areaPath: '', yTicks: [] };
    }

    const range = Math.max(1, max - min);
    const pts = data.map((d, idx) => {
      const rawVal = d[valueKey];
      const clamped = Math.max(min, Math.min(max, rawVal));
      const x =
        data.length === 1
          ? padLeft + innerWidth / 2
          : padLeft + (idx / (data.length - 1)) * innerWidth;
      const y = padTop + innerHeight - ((clamped - min) / range) * innerHeight;
      return {
        x,
        y,
        value: rawVal,
        timeLabel: d.timeLabel,
        isAnomaly: Boolean(d.isAnomaly),
      };
    });

    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ');

    const area =
      pts.length > 0
        ? `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(padTop + innerHeight).toFixed(1)} L ${pts[0].x.toFixed(1)} ${(padTop + innerHeight).toFixed(1)} Z`
        : '';

    const mid = Math.round((min + max) / 2);
    const ticks = [max, mid, min].map((val) => ({
      val,
      y: padTop + innerHeight - ((val - min) / range) * innerHeight,
    }));

    return { points: pts, linePath: line, areaPath: area, yTicks: ticks };
  }, [data, valueKey, min, max, innerWidth, innerHeight]);

  const safeBand = useMemo(() => {
    if (!safeRange) return null;
    const range = Math.max(1, max - min);
    const [low, high] = safeRange;
    const yHigh = padTop + innerHeight - ((Math.min(max, high) - min) / range) * innerHeight;
    const yLow = padTop + innerHeight - ((Math.max(min, low) - min) / range) * innerHeight;
    return {
      y: yHigh,
      height: Math.max(0, yLow - yHigh),
    };
  }, [safeRange, min, max, innerHeight]);

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (points.length === 0 || !containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let closest = 0;
    let minDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const dist = Math.abs(points[i].x - relX);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    }
    setHoverIndex(closest);
  };

  const activePoint =
    hoverIndex !== null && points[hoverIndex]
      ? points[hoverIndex]
      : points.length > 0
        ? points[points.length - 1]
        : null;

  const isHovering = hoverIndex !== null && points[hoverIndex] !== undefined;
  const hasRecentAnomaly = points.some((p) => p.isAnomaly);
  const activeStroke = hasRecentAnomaly ? anomalyStrokeColor : strokeColor;

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* Hover / Active Readout Bar */}
      <div className="mb-2 flex items-center justify-between text-[12px] sm:text-[13px]">
        <span className="text-[#AAB6CC]">
          {isHovering ? `Reading at ${activePoint?.timeLabel}` : 'Rolling 48s window'}
        </span>
        {activePoint && (
          <span
            className={`font-display tabular-nums font-semibold ${
              activePoint.isAnomaly ? 'text-[#EF4444]' : 'text-white'
            }`}
          >
            {activePoint.value} {unit}
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible touch-none cursor-crosshair"
        role="img"
        aria-label={`${label} live chart`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={`grad-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={hasRecentAnomaly ? anomalyStrokeColor : gradientStartColor}
              stopOpacity={0.34}
            />
            <stop
              offset="100%"
              stopColor={hasRecentAnomaly ? anomalyStrokeColor : gradientStartColor}
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>

        {/* Safe threshold band */}
        {safeBand && safeBand.height > 0 && (
          <rect
            x={padLeft}
            y={safeBand.y}
            width={innerWidth}
            height={safeBand.height}
            fill="rgba(16, 185, 129, 0.08)"
            rx={3}
          />
        )}

        {/* Horizontal Gridlines & Y Ticks */}
        {yTicks.map((tick) => (
          <g key={tick.val}>
            <line
              x1={padLeft}
              y1={tick.y}
              x2={width - padRight}
              y2={tick.y}
              stroke="#263657"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            <text
              x={padLeft - 8}
              y={tick.y + 3.5}
              textAnchor="end"
              fill="#7C8BA5"
              fontSize={11}
              fontFamily="Inter, sans-serif"
            >
              {tick.val}
            </text>
          </g>
        ))}

        {/* Chart Series */}
        {chartType === 'bar' ? (
          points.map((p, idx) => {
            const barWidth = Math.max(4, innerWidth / Math.max(1, points.length) - 4);
            const barHeight = Math.max(3, padTop + innerHeight - p.y);
            const barFill = p.isAnomaly
              ? anomalyStrokeColor
              : isHovering && hoverIndex === idx
                ? '#8B5CF6'
                : strokeColor;
            return (
              <rect
                key={idx}
                x={p.x - barWidth / 2}
                y={p.y}
                width={barWidth}
                height={barHeight}
                rx={2.5}
                fill={barFill}
                fillOpacity={isHovering && hoverIndex === idx ? 1 : 0.78}
              />
            );
          })
        ) : (
          <>
            {areaPath && <path d={areaPath} fill={`url(#grad-${gradientId})`} />}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={activeStroke}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
          </>
        )}

        {/* Anomaly markers */}
        {points.map((p, idx) =>
          p.isAnomaly ? (
            <circle
              key={`anom-${idx}`}
              cx={p.x}
              cy={p.y}
              r={4}
              fill="#EF4444"
              stroke="#172554"
              strokeWidth={1.75}
            />
          ) : null
        )}

        {/* X Axis start & end labels */}
        {points.length > 1 && (
          <>
            <text
              x={padLeft}
              y={height - 4}
              textAnchor="start"
              fill="#7C8BA5"
              fontSize={11}
              fontFamily="Inter, sans-serif"
            >
              {points[0].timeLabel}
            </text>
            <text
              x={width - padRight}
              y={height - 4}
              textAnchor="end"
              fill="#7C8BA5"
              fontSize={11}
              fontFamily="Inter, sans-serif"
            >
              {points[points.length - 1].timeLabel}
            </text>
          </>
        )}

        {/* Hover crosshair */}
        {isHovering && activePoint && (
          <g>
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={padTop + innerHeight}
              stroke="#AAB6CC"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <circle
              cx={activePoint.x}
              cy={activePoint.y}
              r={4.5}
              fill={activePoint.isAnomaly ? '#EF4444' : strokeColor}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>
    </div>
  );
};
