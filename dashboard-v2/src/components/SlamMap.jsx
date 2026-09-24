import React, { useState, useEffect } from 'react';
import { useMqtt } from '../MqttContext';

export const SlamMap = () => {
  const { autoState } = useMqtt();
  
  // Dummy points for visual map
  const [points, setPoints] = useState([]);

  useEffect(() => {
    if (autoState.state === 'CLEANING') {
      const interval = setInterval(() => {
        setPoints(p => {
          if (p.length > 50) p.shift();
          return [...p, {
            x: 50 + Math.random() * 40,
            y: 50 + Math.random() * 40
          }];
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [autoState.state]);

  return (
    <div style={{ flex: 2, background: 'var(--bg-color)', borderRadius: 'var(--inner-radius)', border: '1px solid var(--border-color)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      
      {/* Grid Pattern */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.5 }} />

      {/* Map Points */}
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
        <polyline 
          points={points.map(p => `${p.x},${p.y}`).join(' ')} 
          fill="none" 
          stroke="var(--accent-primary)" 
          strokeWidth="1.5" 
          strokeLinejoin="round" 
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="var(--accent-primary)" opacity={i / points.length} />
        ))}
        {/* Current robot position */}
        {points.length > 0 && (
          <circle cx={points[points.length-1].x} cy={points[points.length-1].y} r="2" fill="var(--accent-primary)" />
        )}
      </svg>
      
      {points.length === 0 && <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', zIndex: 1 }}>No Map Data</span>}
    </div>
  );
};
