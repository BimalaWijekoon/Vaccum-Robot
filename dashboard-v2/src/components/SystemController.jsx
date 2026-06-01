import { useEffect } from 'react';
import { useMqtt } from '../MqttContext';

const SystemController = () => {
  const { publishCommand, setMovement, robotMode } = useMqtt();

  // Heartbeat ping
  useEffect(() => {
    const interval = setInterval(() => {
      publishCommand('cmd/heartbeat', 'ping');
    }, 1000);
    return () => clearInterval(interval);
  }, [publishCommand]);

  return null;
};

export default SystemController;
