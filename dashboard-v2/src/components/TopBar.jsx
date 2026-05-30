import React from 'react';
import { useMqtt } from '../MqttContext';
import { useTheme } from '../ThemeContext';
import { Wifi, WifiOff, Moon, Sun, Bot } from 'lucide-react';

const TopBar = () => {
  const { isConnected, mqttConnected, robotMode, sendMode } = useMqtt();
  const { isDark, toggleTheme } = useTheme();

  const modes = [
    { id: 'MANUAL', label: 'Manual Control' },
    { id: 'AUTO', label: 'Auto Cleaning' },
    { id: 'TEACH', label: 'Teach Mode' },
    { id: 'REPLAY', label: 'Replay' }
  ];

  return (
    <div className="top-bar">
      {/* Left side: Brand and Connection Info */}
      <div className="brand-section" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            background: 'var(--accent-primary)', 
            padding: '8px', 
            borderRadius: '12px',
            color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Bot size={24} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="brand-name">VacBot XR-01</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '8px', height: '8px', borderRadius: '50%',
                background: isConnected ? 'var(--accent-success)' : 'var(--accent-danger)',
                boxShadow: `0 0 8px ${isConnected ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
                animation: isConnected ? 'pulse 2s infinite' : 'none'
              }} />
              <span className="text-secondary" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
                {isConnected ? 'ROBOT ONLINE' : 'ROBOT OFFLINE'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Mode Tabs */}
      <div className="mode-selector">
        {modes.map(m => (
          <button
            key={m.id}
            className={`mode-tab ${robotMode === m.id ? 'active' : ''}`}
            onClick={() => sendMode(m.id)}
            disabled={m.disabled}
          >
            {m.label}
          </button>
        ))}
        <button
          className="mode-tab"
          style={{ background: 'rgba(255, 50, 50, 0.1)', color: 'var(--accent-danger)' }}
          onClick={() => sendMode('CLEAR')}
        >
          Clear Path
        </button>
      </div>

      {/* Right side: Cloud & Theme */}
      <div className="top-bar-right">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-color)', borderRadius: 'var(--inner-radius)' }}>
          {mqttConnected ? (
            <Wifi size={16} className="text-success" />
          ) : (
            <WifiOff size={16} className="text-danger" />
          )}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>CLOUD SERVER</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: mqttConnected ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              {mqttConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <button 
          onClick={toggleTheme}
          style={{ 
            background: 'var(--bg-color)', border: '1px solid var(--border-color)', 
            color: 'var(--text-secondary)', cursor: 'pointer', 
            padding: '10px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-color)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
      
      <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default TopBar;
