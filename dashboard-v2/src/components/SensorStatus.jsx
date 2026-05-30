import React from 'react';
import { useMqtt } from '../MqttContext';
import { Target } from 'lucide-react';

const SensorStatus = () => {
  const { sonars, distance } = useMqtt();

  const front = sonars?.front || distance?.cm || 999;
  const left = sonars?.left || 999;
  const right = sonars?.right || 999;

  const getStatus = (dist) => {
    if (dist < 30) return { text: 'BLOCKED', color: 'var(--accent-danger)' };
    if (dist < 70) return { text: 'WARNING', color: 'var(--accent-warning)' };
    return { text: 'CLEAR', color: 'var(--accent-success)' };
  };

  const renderSensorRow = (label, dist) => {
    const status = getStatus(dist);
    return (
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--bg-color)', padding: '8px 12px', borderRadius: 'var(--inner-radius)',
        marginBottom: '6px'
      }}>
        <span style={{ fontWeight: 700, fontSize: '11px', color: 'var(--text-secondary)' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>—</span>
          <div style={{ 
            width: '6px', height: '6px', borderRadius: '50%', 
            background: status.color,
            boxShadow: `0 0 4px ${status.color}`
          }} />
          <span style={{ color: status.color, fontWeight: 700, fontSize: '10px', width: '45px' }}>
            {status.text}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="card">
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <Target className="icon" size={16} />
        <span>Sensor Status</span>
      </div>
      
      <div>
        {renderSensorRow('FRONT', front)}
        {renderSensorRow('LEFT', left)}
        {renderSensorRow('RIGHT', right)}
      </div>
    </div>
  );
};

export default SensorStatus;
