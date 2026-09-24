import React from 'react';
import { useMqtt } from '../MqttContext';
import { Route } from 'lucide-react';

const TeachPanel = () => {
  const { teach } = useMqtt();

  if (!teach) return null;

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <Route className="icon" size={16} />
        <span>Teach & Replay</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {teach.recording ? (
              <>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-success)', boxShadow: '0 0 8px var(--accent-success)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-success)' }}>Recording...</span>
              </>
            ) : teach.replaying ? (
              <>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', boxShadow: '0 0 8px var(--accent-primary)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)' }}>Replaying...</span>
              </>
            ) : (
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)' }}>Idle</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Waypoints</span>
          <span style={{ fontFamily: 'Outfit', fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {teach.waypoints}
          </span>
        </div>

        {teach.replaying && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Replay Progress</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent-primary)' }}>{teach.replay_pct}%</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg-color)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${teach.replay_pct}%`, height: '100%', background: 'var(--accent-primary)', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {teach.done && (
          <div style={{ marginTop: '4px', padding: '6px', background: 'rgba(0,255,0,0.1)', color: 'var(--accent-success)', borderRadius: '4px', fontSize: '10px', fontWeight: 700, textAlign: 'center' }}>
            Path Complete!
          </div>
        )}
      </div>
    </div>
  );
};

export default TeachPanel;
