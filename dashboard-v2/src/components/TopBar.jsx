import React, { useEffect } from 'react';
import { useMqtt } from '../MqttContext';
import { useTheme } from '../ThemeContext';
import { useVoiceCommands } from '../hooks/useVoiceCommands';
import { Wifi, WifiOff, Moon, Sun, Bot, Power, RefreshCw, Mic, MicOff, Settings } from 'lucide-react';
import SettingsModal from './SettingsModal';

const TopBar = () => {
  const { isConnected, mqttConnected, robotMode, sendMode, sendSystemCmd, sendSuction, battery } = useMqtt();
  const { isDark, toggleTheme } = useTheme();
  const { isListening, toggleListening, lastCommand } = useVoiceCommands();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.repeat) return; // Prevent spam

      const key = e.key.toLowerCase();

      switch (key) {
        case 'tab':
          e.preventDefault(); // Prevent focus switching
          if (robotMode === 'MANUAL') sendMode('AUTO');
          else if (robotMode === 'AUTO') sendMode('TEACH');
          else if (robotMode === 'TEACH') sendMode('REPLAY');
          else sendMode('MANUAL');
          break;
        case 'm':
          e.preventDefault();
          toggleListening();
          break;
        case 'c':
          e.preventDefault();
          if (window.confirm("Ensure the robot is perfectly stationary on a flat floor before calibrating. Proceed?")) {
            sendSystemCmd('CALIBRATE');
          }
          break;
        case 'z':
          e.preventDefault();
          if (robotMode === 'SLEEP') sendMode('MANUAL');
          else sendMode('SLEEP');
          break;
        case 'o':
        case '0':
          e.preventDefault();
          sendSuction(0);
          break;
        case '1':
          e.preventDefault();
          sendSuction(30);
          break;
        case '2':
          e.preventDefault();
          sendSuction(60);
          break;
        case '3':
          e.preventDefault();
          sendSuction(100);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [robotMode, sendMode, sendSuction, sendSystemCmd, toggleListening]);

  const getModeColor = (mode) => {
    switch (mode) {
      case 'MANUAL': return '#3b82f6';
      case 'AUTO': return '#10b981';
      case 'TEACH': return '#8b5cf6';
      case 'REPLAY': return '#06b6d4';
      case 'SLEEP': return '#6b7280';
      default: return 'var(--accent-primary)';
    }
  };
  const modeColor = getModeColor(robotMode);

  const getBatteryColor = (pct) => {
    if (pct > 70) return 'var(--accent-success)';
    if (pct > 40) return '#facc15';
    if (pct > 15) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };
  const batColor = battery?.percent !== undefined ? getBatteryColor(battery.percent) : 'var(--text-tertiary)';

  const modes = [
    { id: 'MANUAL', label: 'Manual Control' },
    { id: 'AUTO', label: 'Auto Cleaning' },
    { id: 'TEACH', label: 'Teach Mode' },
    { id: 'REPLAY', label: 'Replay' }
  ];

  return (
    <div className="top-bar" style={{ 
      borderBottom: `2px solid ${modeColor}`, 
      boxShadow: `0 4px 20px ${modeColor}25`,
      transition: 'all 0.4s ease'
    }}>
      {/* Left side: Brand and Connection Info */}
      <div className="brand-section" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            background: modeColor, 
            transition: 'background 0.4s ease',
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
                background: !isConnected ? 'var(--accent-danger)' : (robotMode === 'SLEEP' ? '#f59e0b' : 'var(--accent-success)'),
                boxShadow: `0 0 8px ${!isConnected ? 'var(--accent-danger)' : (robotMode === 'SLEEP' ? '#f59e0b' : 'var(--accent-success)')}`,
                animation: isConnected ? 'pulse 2s infinite' : 'none'
              }} />
              <span className="text-secondary" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
                {!isConnected ? 'ROBOT OFFLINE' : (robotMode === 'SLEEP' ? 'STANDBY (SLEEP)' : 'ROBOT ONLINE')}
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
            style={robotMode === m.id ? { color: modeColor, borderBottomColor: modeColor } : {}}
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

      {/* Right side: Cloud, System Controls & Theme */}
      <div className="top-bar-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        
        {/* Voice Control Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
          {lastCommand && <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic', maxWidth: '100px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{lastCommand}"</span>}
          <button 
            onClick={toggleListening}
            title={isListening ? "Stop Listening" : "Start Voice Control"}
            style={{ 
              background: isListening ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-color)', 
              border: `1px solid ${isListening ? '#ef4444' : 'var(--border-color)'}`, 
              color: isListening ? '#ef4444' : 'var(--text-primary)', 
              cursor: 'pointer', 
              padding: '8px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: isListening ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none',
              animation: isListening ? 'pulse 2s infinite' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {isListening ? <Mic size={16} /> : <MicOff size={16} />}
          </button>
        </div>

        {/* Recalibrate Button */}
        <button 
          onClick={() => {
            if (window.confirm("Ensure the robot is perfectly stationary on a flat floor before calibrating. Proceed?")) {
              sendSystemCmd('CALIBRATE');
            }
          }}
          title="Recalibrate Sensors"
          style={{ 
            background: 'var(--bg-color)', border: '1px solid var(--border-color)', 
            color: 'var(--text-primary)', cursor: 'pointer', 
            padding: '8px 12px', borderRadius: 'var(--inner-radius)',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--border-color)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-color)'}
        >
          <RefreshCw size={14} className="text-primary" />
          <span>Calibrate</span>
        </button>

        {/* Sleep/Wake Button */}
        <button 
          onClick={() => {
            if (robotMode === 'SLEEP') sendMode('MANUAL');
            else sendMode('SLEEP');
          }}
          title={robotMode === 'SLEEP' ? "Wake Robot" : "Put to Sleep"}
          style={{ 
            background: robotMode === 'SLEEP' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg-color)', 
            border: `1px solid ${robotMode === 'SLEEP' ? '#f59e0b' : 'var(--border-color)'}`, 
            color: robotMode === 'SLEEP' ? '#f59e0b' : 'var(--text-primary)', 
            cursor: 'pointer', 
            padding: '8px 12px', borderRadius: 'var(--inner-radius)',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '12px', fontWeight: 600,
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (robotMode !== 'SLEEP') e.currentTarget.style.background = 'var(--border-color)';
          }}
          onMouseLeave={(e) => {
            if (robotMode !== 'SLEEP') e.currentTarget.style.background = 'var(--bg-color)';
          }}
        >
          <Power size={14} />
          <span>{robotMode === 'SLEEP' ? 'Wake' : 'Sleep'}</span>
        </button>

        {/* Battery Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-color)', borderRadius: 'var(--inner-radius)', marginLeft: '4px' }}>
          <div style={{ 
            width: '8px', height: '8px', borderRadius: '50%',
            background: batColor,
            boxShadow: `0 0 8px ${batColor}`
          }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-secondary)' }}>BATTERY</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: batColor }}>
              {battery?.percent !== undefined ? `${battery.percent}%` : '--%'}
            </span>
          </div>
        </div>

        {/* Cloud Connection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--bg-color)', borderRadius: 'var(--inner-radius)', marginLeft: '4px' }}>
          <div style={{ 
            width: '8px', height: '8px', borderRadius: '50%',
            background: mqttConnected ? 'var(--accent-success)' : 'var(--accent-danger)',
            boxShadow: `0 0 8px ${mqttConnected ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
            animation: mqttConnected ? 'pulse 2s infinite' : 'none'
          }} />
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

        <button 
          onClick={() => setSettingsOpen(true)}
          title="Robot Settings"
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
          <Settings size={18} />
        </button>
      </div>
      
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      
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
