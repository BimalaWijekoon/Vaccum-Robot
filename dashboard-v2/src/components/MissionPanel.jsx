import React from 'react';
import { useMqtt } from '../MqttContext';
import { Activity, Clock, Zap, BarChart3 } from 'lucide-react';

const MissionPanel = () => {
  const { autoState, battery, robotMode, teach } = useMqtt();

  const coverage = autoState?.coverage_pct || 0;
  const row = autoState?.row || 0;
  const maxRows = 12;
  const elapsedSec = Math.floor((Date.now() - (window.sessionStart || Date.now())) / 1000);
  const elapsedMin = Math.floor(elapsedSec / 60);
  const eta = Math.max(0, Math.ceil((maxRows - row) * (elapsedMin / Math.max(1, row))));

  const isTeach = robotMode === 'TEACH';
  const isReplay = robotMode === 'REPLAY';

  let state = autoState?.state || 'IDLE';
  if (isTeach) state = 'TEACHING';
  else if (isReplay) state = 'REPLAYING';
  else if (teach?.done) state = 'PATH COMPLETE';

  const stateColor = 
    state === 'MOVING_FORWARD' || state === 'REPLAYING' ? 'var(--accent-success)' :
    state === 'OBSTACLE_AVOID' ? 'var(--accent-warning)' :
    state === 'COMPLETE' || state === 'PATH COMPLETE' ? 'var(--accent-success)' :
    state === 'TEACHING' ? 'var(--accent-danger)' :
    'var(--accent-primary)';

  const batColor = 
    battery?.percent < 25 ? 'var(--accent-danger)' : 
    battery?.percent < 50 ? 'var(--accent-warning)' : 
    'var(--accent-primary)';

  return (
    <div className="card" style={{ flex: 'none' }}>
      <div className="card-header">
        <Activity className="icon" size={14} />
        <span>Mission Control</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '1px' }}>STATUS</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: stateColor }}>{state}</span>
        </div>
        
        {/* Progress Ring */}
        <div style={{ position: 'relative', width: '64px', height: '64px' }}>
          <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
            <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-color)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke="var(--accent-primary)" strokeWidth="8"
              strokeDasharray={`${coverage * 2.51} 251`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--accent-primary)', lineHeight: 1 }}>
              {Math.round(coverage)}%
            </span>
            <span style={{ fontSize: '7px', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '0.5px', marginTop: '2px' }}>COVERAGE</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <div style={{ background: 'var(--bg-color)', padding: '10px 4px', borderRadius: 'var(--inner-radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <BarChart3 size={12} className="text-secondary" />
          <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', fontWeight: 600 }}>ROWS</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)' }}>{row}/{maxRows}</span>
        </div>
        <div style={{ background: 'var(--bg-color)', padding: '10px 4px', borderRadius: 'var(--inner-radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} className="text-secondary" />
          <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', fontWeight: 600 }}>TIME</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)' }}>{elapsedMin}m</span>
        </div>
        <div style={{ background: 'var(--bg-color)', padding: '10px 4px', borderRadius: 'var(--inner-radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Zap size={12} className="text-secondary" />
          <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', fontWeight: 600 }}>BATTERY</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: batColor }}>{battery?.percent}%</span>
        </div>
        <div style={{ background: 'var(--bg-color)', padding: '10px 4px', borderRadius: 'var(--inner-radius)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} className="text-secondary" />
          <span style={{ fontSize: '8px', color: 'var(--text-tertiary)', fontWeight: 600 }}>ETA</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent-primary)' }}>{eta}m</span>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        {isTeach ? (
          <>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>TEACH PROGRESS</span>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-color)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ width: `${Math.min(100, (teach?.waypoints || 0) / 200 * 100)}%`, height: '100%', background: 'var(--accent-danger)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>Waypoints recorded: {teach?.waypoints || 0}</div>
          </>
        ) : isReplay ? (
          <>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>REPLAY PROGRESS</span>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-color)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ width: `${teach?.replay_pct || 0}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{teach?.replay_pct || 0}%</div>
          </>
        ) : (
          <>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '1px', display: 'block', marginBottom: '8px' }}>ROW PROGRESS</span>
            <div style={{ width: '100%', height: '6px', background: 'var(--bg-color)', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
              <div style={{ width: `${(row / maxRows) * 100}%`, height: '100%', background: 'var(--accent-primary)', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>{row} / {maxRows}</div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-color)', padding: '10px 12px', borderRadius: 'var(--inner-radius)' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.5px' }}>EFFICIENCY</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-success)' }}>
          {coverage > 0 && elapsedMin > 0 ? `${(coverage / elapsedMin).toFixed(1)}%/min` : '—'}
        </span>
      </div>
    </div>
  );
};

export default MissionPanel;
