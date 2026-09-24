import React, { useEffect, useRef, useState } from 'react';
import { useMqtt } from '../MqttContext';

const EventConsole = () => {
  const { client } = useMqtt();
  const [logs, setLogs] = useState([]);
  const consoleEndRef = useRef(null);

  useEffect(() => {
    if (!client) return;

    const handleMessage = (topic, message) => {
      if (topic === 'vacbot/status/logs') {
        const text = message.toString();
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        setLogs(prev => {
          const newLogs = [...prev, `[${timestamp}] ${text}`];
          // Keep only last 50 logs to prevent memory leak
          if (newLogs.length > 50) newLogs.shift();
          return newLogs;
        });
      }
    };

    client.on('message', handleMessage);
    
    // Subscribe is handled in MqttContext, we just listen here
    // Wait, MqttContext doesn't automatically subscribe to this new topic.
    // Let's subscribe directly here just in case.
    client.subscribe('vacbot/status/logs');

    return () => {
      client.removeListener('message', handleMessage);
    };
  }, [client]);

  // Auto-scroll to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div className="card-header">
        <h3><span className="icon">💻</span> Event Console</h3>
      </div>
      <div 
        style={{ 
          flex: 1, 
          backgroundColor: '#000', 
          color: '#0f0', 
          fontFamily: 'monospace', 
          fontSize: '12px',
          padding: '10px',
          borderRadius: '5px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#050' }}>[System Ready. Waiting for events...]</div>
        ) : (
          logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
};

export default EventConsole;
