import React, { useState, useEffect } from 'react';
import { useMqtt } from '../MqttContext';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Navigation, Fan } from 'lucide-react';

const ControlPad = () => {
  const { setMovement, sendSuction, robotMode } = useMqtt();
  const [activeKey, setActiveKey] = useState(null);
  const [suction, setSuction] = useState(0);

  const isManual = robotMode === 'MANUAL' || robotMode === 'TEACH';

  const handleCommand = (cmd, dir) => {
    if (!isManual) return;
    setMovement(cmd);
    setActiveKey(dir);
  };

  const handleRelease = () => {
    if (!isManual) return;
    setMovement('STOP');
    setActiveKey(null);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isManual) return;
      if (e.repeat) return; // Prevent continuous command spam when holding key
      const key = e.key.toLowerCase();
      
      if (['w', 'arrowup'].includes(key)) {
        e.preventDefault();
        handleCommand('FORWARD', 'up');
      } else if (['s', 'arrowdown'].includes(key)) {
        e.preventDefault();
        handleCommand('BACKWARD', 'down');
      } else if (['a', 'arrowleft'].includes(key)) {
        e.preventDefault();
        handleCommand('LEFT', 'left');
      } else if (['d', 'arrowright'].includes(key)) {
        e.preventDefault();
        handleCommand('RIGHT', 'right');
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 's', 'a', 'd'].includes(key)) {
        e.preventDefault();
        handleRelease();
      }
    };

    if (isManual) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isManual, activeKey]);

  const handleSuctionChange = (val) => {
    setSuction(val);
    sendSuction(val);
  };

  const renderNavButton = (dir, Icon, action) => {
    const isActive = activeKey === dir;
    return (
      <button
        key={dir}
        className={`nav-btn ${isActive ? 'active' : ''}`}
        onMouseDown={() => handleCommand(action, dir)}
        onMouseUp={handleRelease}
        onMouseLeave={handleRelease}
        disabled={!isManual}
        style={{
          width: dir === 'up' || dir === 'down' ? '80px' : '60px',
          opacity: isManual ? 1 : 0.5,
          cursor: isManual ? 'pointer' : 'not-allowed'
        }}
      >
        <Icon size={16} />
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', gap: '10px' }}>
      {/* Navigation Card */}
      <div className="card" style={{ flex: 1 }}>
        <div className="card-header">
          <Navigation size={12} className="icon" />
          <span>Navigation</span>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {renderNavButton('up', ArrowUp, 'FORWARD')}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {renderNavButton('left', ArrowLeft, 'LEFT')}
            {renderNavButton('down', ArrowDown, 'BACKWARD')}
            {renderNavButton('right', ArrowRight, 'RIGHT')}
          </div>
          {isManual ? (
            <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-tertiary)', marginTop: '8px', letterSpacing: '0.5px' }}>
              USE ↑ ↓ ← → OR W A S D
            </span>
          ) : (
            <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-warning)', marginTop: '8px', letterSpacing: '0.5px', background: 'rgba(255, 170, 0, 0.1)', padding: '4px 8px', borderRadius: '4px' }}>
              {robotMode} MODE ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Suction Card */}
      <div className="card" style={{ flex: 1 }}>
        <div className="card-header">
          <Fan 
            size={12} 
            className="icon" 
            style={{ 
              animation: suction > 0 ? `fan-spin ${Math.max(0.2, 2 - (suction / 50))}s linear infinite` : 'none' 
            }} 
          />
          <span>Suction</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Power</span>
            <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--accent-primary)' }}>
              {suction}%
            </span>
          </div>

          <input 
            type="range" 
            min="0" max="100" 
            value={suction} 
            onChange={(e) => handleSuctionChange(parseInt(e.target.value))}
            disabled={!isManual}
            style={{
              width: '100%',
              accentColor: 'var(--accent-primary)',
              cursor: isManual ? 'pointer' : 'not-allowed',
              opacity: isManual ? 1 : 0.5
            }}
          />

          <div style={{ display: 'flex', gap: '6px' }}>
            {[{label: 'ECO', val: 30}, {label: 'NORM', val: 60}, {label: 'MAX', val: 100}].map(mode => (
              <button
                key={mode.label}
                onClick={() => handleSuctionChange(mode.val)}
                disabled={!isManual}
                style={{
                  flex: 1, padding: '6px 0',
                  background: 'var(--bg-color)',
                  color: suction >= mode.val - 10 && suction <= mode.val + 10 ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${suction >= mode.val - 10 && suction <= mode.val + 10 ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  borderRadius: '6px',
                  fontSize: '10px', fontWeight: 700,
                  cursor: isManual ? 'pointer' : 'not-allowed',
                  opacity: isManual ? 1 : 0.5,
                  transition: 'all 0.2s'
                }}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {!isManual && (
            <div style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent-warning)', textAlign: 'center', padding: '4px', background: 'rgba(255, 170, 0, 0.1)', borderRadius: '4px', letterSpacing: '0.5px' }}>
              AUTO-CONTROLLED
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPad;
