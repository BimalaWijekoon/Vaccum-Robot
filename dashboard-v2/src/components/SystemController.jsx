import { useEffect } from 'react';
import { useMqtt } from '../MqttContext';

const SystemController = () => {
  const { publish, robotMode } = useMqtt();

  // Heartbeat ping
  useEffect(() => {
    const interval = setInterval(() => {
      publish('vacbot/cmd/heartbeat', 'ping');
    }, 1000);
    return () => clearInterval(interval);
  }, [publish]);

  // WASD Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (robotMode !== 'MANUAL') return;

      switch (e.key.toLowerCase()) {
        case 'w': publish('vacbot/cmd/movement', 'FORWARD'); break;
        case 's': publish('vacbot/cmd/movement', 'BACKWARD'); break;
        case 'a': publish('vacbot/cmd/movement', 'LEFT'); break;
        case 'd': publish('vacbot/cmd/movement', 'RIGHT'); break;
        default: break;
      }
    };

    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (robotMode !== 'MANUAL') return;

      const keys = ['w', 'a', 's', 'd'];
      if (keys.includes(e.key.toLowerCase())) {
        publish('vacbot/cmd/movement', 'STOP');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [publish, robotMode]);

  return null;
};

export default SystemController;
