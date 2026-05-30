import React from 'react';
import { useMqtt } from '../MqttContext';
import { Pause, Play, Home, Settings } from 'lucide-react';

const BottomDock = () => {
  const { setMovement, robotMode, sendMode } = useMqtt();

  const isPaused = robotMode === 'MANUAL'; // Simple heuristic for now

  return (
    <div className="bottom-dock">
      <button 
        onClick={() => setMovement('STOP')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 24px', borderRadius: '30px', border: 'none',
          background: isPaused ? 'var(--accent-warning)' : 'var(--bg-color)',
          color: isPaused ? '#fff' : 'var(--text-primary)',
          fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          boxShadow: isPaused ? 'var(--shadow-md)' : 'none'
        }}
      >
        <Pause size={18} />
        STOP
      </button>

      <button 
        onClick={() => sendMode('AUTO')}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 24px', borderRadius: '30px', border: 'none',
          background: !isPaused ? 'var(--accent-success)' : 'var(--bg-color)',
          color: !isPaused ? '#fff' : 'var(--text-primary)',
          fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          boxShadow: !isPaused ? 'var(--shadow-md)' : 'none'
        }}
      >
        <Play size={18} />
        RESUME
      </button>

      <button 
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 24px', borderRadius: '30px', border: 'none',
          background: 'var(--bg-color)',
          color: 'var(--text-primary)',
          fontWeight: 600, fontSize: '14px', cursor: 'pointer'
        }}
      >
        <Home size={18} />
        DOCK
      </button>

      <button 
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '44px', height: '44px', borderRadius: '22px', border: 'none',
          background: 'var(--bg-color)',
          color: 'var(--text-secondary)',
          cursor: 'pointer'
        }}
      >
        <Settings size={20} />
      </button>
    </div>
  );
};

export default BottomDock;
