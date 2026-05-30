import React, { useMemo } from 'react';
import { useMqtt } from '../MqttContext';
import { Radar } from 'lucide-react';

export const RadarModule = () => {
  const { sonars, navigation, robotMode } = useMqtt();

  const canvasSize = 240;
  const radius = 100;
  const cx = canvasSize / 2;
  const cy = canvasSize / 2;

  const front = sonars?.front || 999;
  const left = sonars?.left || 999;
  const right = sonars?.right || 999;
  const safeDirections = navigation?.safe_directions?.split(',') || [];
  const isApproaching = navigation?.approaching || false;

  const getCoord = (distCm, angleDeg) => {
    const maxDist = 150;
    const r = (Math.min(distCm, maxDist) / maxDist) * radius;
    const angle = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.sin(angle),
      y: cy - r * Math.cos(angle),
    };
  };

  const getColor = (distCm) => {
    if (distCm < 30) return 'var(--accent-danger)';
    if (distCm < 70) return 'var(--accent-warning)';
    return 'var(--accent-success)';
  };

  const radarSVG = useMemo(() => (
    <svg width="100%" height="100%" viewBox={`0 0 ${canvasSize} ${canvasSize}`} style={{ overflow: 'visible' }}>
      {/* Background */}
      <circle cx={cx} cy={cy} r={radius + 8} fill="rgba(var(--bg-color-rgb), 0.5)" stroke="var(--border-color)" strokeWidth="1" />

      {/* Distance rings */}
      <circle cx={cx} cy={cy} r={(50 / 150) * radius} fill="none" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx={cx} cy={cy} r={(100 / 150) * radius} fill="none" stroke="var(--border-color)" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--border-color)" strokeWidth="1" />

      {/* Labels */}
      <text x={cx + 4} y={cy - (50 / 150) * radius - 3} fill="var(--text-tertiary)" fontSize="10">50</text>
      <text x={cx + 4} y={cy - (100 / 150) * radius - 3} fill="var(--text-tertiary)" fontSize="10">100</text>
      
      {/* Robot center */}
      <circle cx={cx} cy={cy} r="6" fill="var(--accent-primary)" />

      {/* Obstacles */}
      {front < 150 && <circle cx={getCoord(front, 0).x} cy={getCoord(front, 0).y} r="5" fill={getColor(front)} />}
      {left < 150 && <circle cx={getCoord(left, 90).x} cy={getCoord(left, 90).y} r="5" fill={getColor(left)} />}
      {right < 150 && <circle cx={getCoord(right, -90).x} cy={getCoord(right, -90).y} r="5" fill={getColor(right)} />}

      {/* Approaching pulse */}
      {isApproaching && robotMode === 'AUTO' && (
        <circle cx={cx} cy={cy} r="20" fill="none" stroke="var(--accent-warning)" strokeWidth="2" opacity="0.5" />
      )}
    </svg>
  ), [front, left, right, safeDirections, isApproaching, robotMode]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: '240px', aspectRatio: '1', position: 'relative' }}>
        {radarSVG}
      </div>
    </div>
  );
};
