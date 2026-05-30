import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import mqtt from 'mqtt';

export const MqttContext = createContext(null);

export const useMqtt = () => useContext(MqttContext);

const CONFIG = {
  host: import.meta.env.VITE_MQTT_HOST || '0808028e417c4ff2957842f563dafe7b.s1.eu.hivemq.cloud',
  port: import.meta.env.VITE_MQTT_PORT || 8884,
  username: import.meta.env.VITE_MQTT_USERNAME || 'VaccumRobot',
  password: import.meta.env.VITE_MQTT_PASSWORD || 'Vaccum@12345',
  topicPrefix: import.meta.env.VITE_MQTT_TOPIC_PREFIX || 'vacbot'
};

export const MqttProvider = ({ children }) => {
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);  // Dashboard ↔ MQTT broker
  const [robotOnline, setRobotOnline] = useState(false);     // Robot ↔ MQTT broker
  
  // App State matching firmware payloads
  const [robotMode, setRobotMode] = useState('MANUAL');
  const [suction, setSuction] = useState(0);
  
  const [battery, setBattery] = useState({
    voltage: '0.0',
    percent: 0,
    health: 'UNKNOWN',
    alert: false
  });
  
  const [distance, setDistance] = useState({
    cm: 999,
    obstacle: false
  });
  
  const [autoState, setAutoState] = useState({
    state: 'IDLE',
    row: 0,
    yaw: 0,
    left_dist_cm: 0,
    right_dist_cm: 0,
    coverage_pct: 0
  });

  // New: Sonar and Navigation data
  const [sonars, setSonars] = useState({
    front: 999,
    left: 999,
    right: 999
  });

  const [navigation, setNavigation] = useState({
    safe_directions: 'FORWARD,LEFT,RIGHT',
    approaching: false,
    front_trend: 'stable'
  });

  // Log queue for LiveLogs component
  const [logMessages, setLogMessages] = useState([]);
  const addLog = useCallback((tag, message) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setLogMessages(prev => {
      const next = [...prev, { time, tag, message }];
      if (next.length > 50) next.shift();
      return next;
    });
  }, []);

  const connect = () => {
    if (client) return;

    const clientId = `vacbot-app-${Math.random().toString(16).substring(2, 8)}`;
    const mqttUrl = `wss://${CONFIG.host}:${CONFIG.port}/mqtt`;
    
    console.log("[MQTT-Dashboard] Connecting to:", mqttUrl);
    
    const mqttClient = mqtt.connect(mqttUrl, {
      username: CONFIG.username,
      password: CONFIG.password,
      clientId: clientId,
      reconnectPeriod: 5000,
      connectTimeout: 10000,
      rejectUnauthorized: false  // Allow self-signed certificates
    });

    mqttClient.on('connect', () => {
      console.log("[MQTT-Dashboard] ✅ Connected to MQTT broker");
      setMqttConnected(true);
      
      const prefix = CONFIG.topicPrefix;
      mqttClient.subscribe(`${prefix}/status/battery`);
      mqttClient.subscribe(`${prefix}/status/distance`);
      mqttClient.subscribe(`${prefix}/status/mode`);
      mqttClient.subscribe(`${prefix}/status/auto`);
      mqttClient.subscribe(`${prefix}/status/online`);
      mqttClient.subscribe(`${prefix}/status/sonars`);      // NEW
      mqttClient.subscribe(`${prefix}/status/navigation`);  // NEW
      console.log("[MQTT-Dashboard] Subscribed to all robot status topics");
    });

    mqttClient.on('message', (topic, payload) => {
      const msg = payload.toString();
      const prefix = CONFIG.topicPrefix;

      try {
        if (topic === `${prefix}/status/battery`) {
          console.log("[MQTT-RX] Battery:", msg);
          const data = JSON.parse(msg);
          setBattery(data);
          if (data.alert) addLog('WARN', `Battery critical: ${data.percent}%`);
        } else if (topic === `${prefix}/status/distance`) {
          console.log("[MQTT-RX] Distance:", msg);
          const data = JSON.parse(msg);
          setDistance(data);
          if (data.obstacle) addLog('WARN', `Obstacle at ${data.cm}cm`);
        } else if (topic === `${prefix}/status/mode`) {
          console.log("[MQTT-RX] Mode:", msg);
          setRobotMode(msg);
          addLog('INFO', `Mode changed: ${msg}`);
        } else if (topic === `${prefix}/status/auto`) {
          console.log("[MQTT-RX] Auto:", msg);
          const data = JSON.parse(msg);
          setAutoState(data);
          if (data.state && data.state !== 'MANUAL_ACTIVE') addLog('INFO', `Auto: ${data.state} Row ${data.row}`);
        } else if (topic === `${prefix}/status/online`) {
          console.log("[MQTT-RX] Robot online status:", msg);
          // Robot is online if it sends any message on the online topic
          if (msg === 'online') {
            setRobotOnline(true);
            console.log("[MQTT-Dashboard] ✅ Robot is ONLINE");
          } else if (msg === 'offline') {
            setRobotOnline(false);
            console.log("[MQTT-Dashboard] ❌ Robot went OFFLINE");
          }
        } else if (topic === `${prefix}/status/sonars`) {
          console.log("[MQTT-RX] Sonars:", msg);
          setSonars(JSON.parse(msg));
        } else if (topic === `${prefix}/status/navigation`) {
          console.log("[MQTT-RX] Navigation:", msg);
          setNavigation(JSON.parse(msg));
        }
      } catch (e) {
        console.error("[MQTT-ERROR] Failed parsing message on topic", topic, ":", msg, e);
      }
    });

    mqttClient.on('error', (err) => {
      console.error("[MQTT-ERROR] Connection error:", err);
      console.error("[MQTT-ERROR] Message:", err.message);
      console.error("[MQTT-ERROR] Code:", err.code);
      console.error("[MQTT-ERROR] Type:", err.constructor.name);
      
      // Detailed diagnosis
      if (err.message.includes('getaddrinfo') || err.message.includes('ENOTFOUND')) {
        console.error("[MQTT-ERROR] 🌐 DNS resolution failed - broker host unreachable");
      } else if (err.message.includes('ECONNREFUSED')) {
        console.error("[MQTT-ERROR] 🚫 Connection refused - broker not accepting connections on that port");
      } else if (err.message.includes('timeout')) {
        console.error("[MQTT-ERROR] ⏱️ Connection timeout - broker not responding (firewall?)");
      } else if (err.message.includes('certificate') || err.message.includes('SSL')) {
        console.error("[MQTT-ERROR] 🔒 TLS/Certificate error - try refreshing or check broker cert");
      }
      
      addLog('ERROR', `MQTT Connection Error: ${err.message}`);
      setMqttConnected(false);
      setRobotOnline(false);
    });

    mqttClient.on('close', () => {
      console.log("[MQTT-Dashboard] Disconnected from broker");
      setMqttConnected(false);
      setRobotOnline(false);
    });

    mqttClient.on('offline', () => {
      console.log("[MQTT-Dashboard] Client went offline");
      setMqttConnected(false);
    });

    mqttClient.on('reconnect', () => {
      console.log("[MQTT-Dashboard] Attempting to reconnect...");
      addLog('INFO', 'MQTT reconnecting...');
    });

    setClient(mqttClient);
  };

  const publishCommand = (topicSuffix, payload) => {
    if (!client || !mqttConnected) {
      console.warn("[MQTT-WARN] Cannot publish - MQTT not connected");
      return false;
    }
    if (!robotOnline) {
      console.warn("[MQTT-WARN] Cannot publish - Robot is offline");
      return false;
    }
    console.log("[MQTT-TX] Publishing to", topicSuffix, ":", payload);
    client.publish(`${CONFIG.topicPrefix}/${topicSuffix}`, String(payload));
    return true;
  };

  const setMovement = (cmd) => {
    console.log("[CMD] Movement command:", cmd);
    publishCommand('cmd/movement', cmd);
  };
  
  const sendSuction = (val) => {
    console.log("[CMD] Suction command:", val);
    setSuction(val);
    publishCommand('cmd/suction', val);
  };
  
  const sendMode = (mode) => {
    console.log("[CMD] Mode command:", mode);
    // Optimistic update
    setRobotMode(mode);
    publishCommand('cmd/mode', mode);
  };

  // Start connection immediately
  useEffect(() => {
    connect();
    return () => {
      if (client) client.end();
    };
  }, []);

  return (
    <MqttContext.Provider value={{
      isConnected: robotOnline,      // True only if robot is online
      mqttConnected,                 // True if Dashboard↔Broker connected
      robotOnline,                   // True if Robot↔Broker connected
      battery,
      distance,
      autoState,
      sonars,                        // NEW
      navigation,                    // NEW
      robotMode,
      mode: robotMode,               // Alias for convenience
      suction,
      setMovement,
      sendSuction,
      sendMode,
      logMessages,                   // Log queue for LiveLogs
      publishCommand                 // Exposed for BottomCommandDock
    }}>
      {children}
    </MqttContext.Provider>
  );
};
