import React from 'react';
import { useMqtt } from '../MqttContext';
import { Battery, ShieldCheck, Activity, Zap } from 'lucide-react';

const StatusCards = () => {
  const { battery, sonars, distance } = useMqtt();

  const renderCard = (title, icon, value, subtext, colorClass) => (
    <div className="card" style={{ flex: 1, minHeight: '120px', justifyContent: 'center' }}>
      <div className="card-header">
        {React.cloneElement(icon, { className: 'icon' })}
        <span>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className={colorClass} style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'Outfit' }}>
          {value}
        </span>
        <span className="text-tertiary" style={{ fontSize: '12px', fontWeight: 500 }}>
          {subtext}
        </span>
      </div>
    </div>
  );

  return (
    <>
      {renderCard(
        'Battery Health',
        <Battery size={16} />,
        `${battery.percent}%`,
        `Voltage: ${battery.voltage}V • ${battery.health}`,
        battery.percent < 25 ? 'text-danger' : 'text-success'
      )}

      {renderCard(
        'Front Sensor',
        <ShieldCheck size={16} />,
        `${sonars?.front || distance?.cm || 999} cm`,
        'Forward Clearance',
        (sonars?.front || distance?.cm) < 30 ? 'text-warning' : 'text-primary'
      )}

      {renderCard(
        'System Status',
        <Activity size={16} />,
        'Nominal',
        'All systems operational',
        'text-primary'
      )}
    </>
  );
};

export default StatusCards;
