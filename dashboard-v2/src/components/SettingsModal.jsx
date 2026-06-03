import React, { useState } from 'react';
import { useMqtt } from '../MqttContext';
import { Wifi, X, ShieldCheck, Cpu } from 'lucide-react';

const SettingsModal = ({ isOpen, onClose }) => {
  const { sendSystemCmd, mqttConnected, robotOnline } = useMqtt();
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ssid) return;
    
    // Format: WIFI:SSID:PASS
    const cmdStr = `WIFI:${ssid}:${password}`;
    sendSystemCmd(cmdStr);
    
    setStatus('Credentials sent! Robot is rebooting...');
    setSsid('');
    setPassword('');
    
    // Auto-close after 3 seconds
    setTimeout(() => {
      onClose();
      setStatus('');
    }, 3000);
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
        display: 'flex',
        flexDirection: 'column'
      }}>
        
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          background: 'linear-gradient(to right, rgba(0, 255, 136, 0.05), transparent)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Cpu size={20} color="var(--accent-color)" />
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)', fontWeight: 800 }}>Robot Settings</h3>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Connection Status Panel */}
          <div style={{ 
            background: 'var(--bg-panel)', 
            padding: '15px', 
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Dashboard ↔ HiveMQ</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: mqttConnected ? 'var(--accent-color)' : 'var(--warning-color)' }}>
                {mqttConnected ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Robot ↔ HiveMQ</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: robotOnline ? 'var(--accent-color)' : 'var(--warning-color)' }}>
                {robotOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
          </div>

          {/* Wi-Fi Provisioning Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Wifi size={16} color="var(--text-primary)" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Change Robot Wi-Fi</span>
            </div>
            
            <input 
              type="text" 
              placeholder="New Network Name (SSID)" 
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontFamily: 'Outfit',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            
            <input 
              type="password" 
              placeholder="Network Password (leave blank if open)" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontFamily: 'Outfit',
                fontSize: '14px',
                outline: 'none'
              }}
            />

            <button 
              type="submit"
              disabled={!ssid || !robotOnline}
              style={{
                background: (!ssid || !robotOnline) ? 'var(--bg-panel)' : 'var(--accent-color)',
                color: (!ssid || !robotOnline) ? 'var(--text-tertiary)' : '#000',
                border: 'none',
                padding: '14px',
                borderRadius: '8px',
                fontWeight: 800,
                fontSize: '14px',
                cursor: (!ssid || !robotOnline) ? 'not-allowed' : 'pointer',
                marginTop: '10px',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <ShieldCheck size={18} />
              UPDATE CREDENTIALS
            </button>
            
            {status && (
              <div style={{ textAlign: 'center', color: 'var(--accent-color)', fontSize: '12px', fontWeight: 600, marginTop: '5px' }}>
                {status}
              </div>
            )}
            
            {!robotOnline && !status && (
               <div style={{ textAlign: 'center', color: 'var(--warning-color)', fontSize: '11px', marginTop: '5px' }}>
                 Robot must be online to update credentials remotely.
               </div>
            )}
          </form>
          
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
