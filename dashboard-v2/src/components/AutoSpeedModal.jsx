import React, { useState, useEffect } from 'react';
import { useMqtt } from '../MqttContext';
import { Settings, Play, X } from 'lucide-react';

const AutoSpeedModal = ({ isOpen, onClose }) => {
  const { driveSpeed, sendDriveSpeed, sendMode } = useMqtt();
  const [localSpeed, setLocalSpeed] = useState(driveSpeed || 150);

  useEffect(() => {
    if (isOpen) {
      setLocalSpeed(driveSpeed || 150);
    }
  }, [isOpen, driveSpeed]);

  if (!isOpen) return null;

  const handleStart = () => {
    // Send the speed first
    sendDriveSpeed(localSpeed);
    // Give it a tiny delay to ensure speed sets before mode switches
    setTimeout(() => {
      sendMode('AUTO');
      onClose();
    }, 100);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      fontFamily: 'Outfit, sans-serif'
    }}>
      <div style={{
        background: 'var(--bg-color)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        width: '400px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.2)', color: '#10b981',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Play size={18} />
            </div>
            <span style={{ fontSize: '18px', fontWeight: 800 }}>Auto Cleaning Speed</span>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex'
          }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
            Please select the driving speed for Auto Mode. Higher speeds cover more area but may reduce obstacle avoidance reaction time.
          </p>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>PWM SPEED</label>
              <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>{localSpeed}</span>
            </div>
            <input 
              type="range" 
              min="100" 
              max="255" 
              value={localSpeed}
              onChange={(e) => setLocalSpeed(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#10b981',
                height: '6px',
                borderRadius: '3px',
                background: 'var(--bg-secondary)',
                appearance: 'none',
                outline: 'none'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Slow</span>
              <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Max Power</span>
            </div>
          </div>
        </div>

        <div style={{
          padding: '15px 20px',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px'
        }}>
          <button onClick={onClose} style={{
            background: 'transparent',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600
          }}>Cancel</button>
          <button onClick={handleStart} style={{
            background: '#10b981',
            border: 'none',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
          }}>
            <Play size={16} /> Start Auto
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoSpeedModal;
