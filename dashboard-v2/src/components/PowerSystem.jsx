import React from 'react';
import { useMqtt } from '../MqttContext';
import { Battery, Zap, AlertTriangle } from 'lucide-react';

const PowerSystem = () => {
  const { battery } = useMqtt();
  
  const isCritical = battery.percent <= 20;

  return (
    <div className="card" style={{ gap: '12px' }}>
      <div className="card-header" style={{ marginBottom: 0 }}>
        <Battery className="icon" size={15} />
        <span>Power System</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          flex: 1, 
          height: '12px', 
          background: 'var(--bg-color)', 
          borderRadius: '6px', 
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ 
            height: '100%', 
            width: `${battery.percent}%`, 
            background: isCritical ? 'var(--accent-danger)' : 'var(--accent-success)',
            transition: 'width 0.3s ease'
          }} />
        </div>
        <span style={{ 
          fontFamily: 'Outfit', 
          fontSize: '18px', 
          fontWeight: 700, 
          color: isCritical ? 'var(--accent-danger)' : 'var(--text-primary)' 
        }}>
          {battery.percent}%
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <div style={{ background: 'var(--bg-color)', padding: '8px', borderRadius: 'var(--inner-radius)', textAlign: 'center' }}>
          <div className="text-secondary" style={{ fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>VOLTAGE</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '12px', fontWeight: 700 }}>
            <Zap size={12} className="text-accent" />
            <span>{battery.voltage}V</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-color)', padding: '8px', borderRadius: 'var(--inner-radius)', textAlign: 'center' }}>
          <div className="text-secondary" style={{ fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>HEALTH</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: isCritical ? 'var(--accent-danger)' : 'var(--text-primary)' }}>
            {battery.health}
          </div>
        </div>

        <div style={{ background: 'var(--bg-color)', padding: '8px', borderRadius: 'var(--inner-radius)', textAlign: 'center' }}>
          <div className="text-secondary" style={{ fontSize: '10px', fontWeight: 600, marginBottom: '2px' }}>EST.</div>
          <div style={{ fontSize: '12px', fontWeight: 700 }}>
            {Math.max(0, Math.floor(battery.percent * 0.8))}m
          </div>
        </div>
      </div>

      {isCritical && (
        <button style={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
          width: '100%', padding: '10px', marginTop: '6px',
          background: 'rgba(229, 62, 62, 0.1)', 
          border: '1px solid var(--accent-danger)',
          color: 'var(--accent-danger)',
          borderRadius: 'var(--inner-radius)',
          fontWeight: 600, fontSize: '12px',
          cursor: 'pointer'
        }}>
          <AlertTriangle size={15} />
          CRITICAL — RETURN TO DOCK
        </button>
      )}
    </div>
  );
};

export default PowerSystem;
