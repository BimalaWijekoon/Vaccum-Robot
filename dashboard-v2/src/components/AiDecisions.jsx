import React from 'react';
import { useMqtt } from '../MqttContext';
import { Brain, Circle, Check, X } from 'lucide-react';

const AiDecisions = () => {
  const { sonars, navigation, battery, autoState } = useMqtt();

  const front = sonars?.front || 999;
  const left = sonars?.left || 999;
  const right = sonars?.right || 999;
  const safeDirections = navigation?.safe_directions?.split(',') || [];
  const isApproaching = navigation?.approaching || false;

  const decisions = [];

  // Path optimization
  if (autoState?.state === 'MOVING_FORWARD' || autoState?.state === 'MANUAL_ACTIVE') {
    decisions.push({ Icon: Check, text: 'Path optimized', color: 'var(--accent-success)' });
  } else if (autoState?.state === 'TURNING') {
    decisions.push({ Icon: X, text: 'Recalculating route', color: 'var(--accent-warning)' });
  } else if (autoState?.state === 'OBSTACLE_AVOID') {
    decisions.push({ Icon: X, text: 'Avoidance maneuver', color: 'var(--accent-warning)' });
  } else {
    decisions.push({ Icon: Circle, text: 'Awaiting mission', color: 'var(--accent-primary)' });
  }

  // Obstacle density
  const nearObstacles = [front, left, right].filter(d => d < 50).length;
  if (nearObstacles === 0) {
    decisions.push({ Icon: Check, text: 'Low obstacle density', color: 'var(--accent-success)' });
  } else if (nearObstacles === 1) {
    decisions.push({ Icon: X, text: 'Obstacle detected nearby', color: 'var(--accent-warning)' });
  } else {
    decisions.push({ Icon: X, text: 'High obstacle density', color: 'var(--accent-danger)' });
  }

  // Battery assessment
  if (battery?.percent >= 50) {
    decisions.push({ Icon: Check, text: 'Battery sufficient', color: 'var(--accent-success)' });
  } else if (battery?.percent >= 25) {
    decisions.push({ Icon: X, text: 'Battery moderate', color: 'var(--accent-warning)' });
  } else {
    decisions.push({ Icon: X, text: 'Battery critical — dock soon', color: 'var(--accent-danger)' });
  }

  // Approaching obstacle
  if (isApproaching) {
    decisions.push({ Icon: X, text: 'Obstacle approaching', color: 'var(--accent-warning)' });
  }

  // Path blocked check
  if (safeDirections.length === 0) {
    decisions.push({ Icon: X, text: 'All paths blocked', color: 'var(--accent-danger)' });
  } else if (safeDirections.length < 3) {
    decisions.push({ Icon: Check, text: `${safeDirections.length}/3 paths clear`, color: 'var(--accent-success)' });
  } else {
    decisions.push({ Icon: Check, text: 'All paths clear', color: 'var(--accent-success)' });
  }

  // Coverage
  if (autoState?.coverage_pct >= 80) {
    decisions.push({ Icon: Check, text: 'Near completion', color: 'var(--accent-success)' });
  }

  return (
    <div className="card" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
      <div className="card-header">
        <Brain className="icon" size={14} style={{ color: '#c800ff' }} />
        <span>AI Analysis</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {decisions.map((d, i) => (
          <div key={i} style={{ 
            display: 'flex', alignItems: 'center', gap: '12px', 
            background: 'var(--bg-color)', padding: '12px 14px', 
            borderRadius: 'var(--inner-radius)'
          }}>
            <d.Icon size={14} style={{ color: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: d.color }}>{d.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiDecisions;
