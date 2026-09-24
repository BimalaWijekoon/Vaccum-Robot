import { useState, useEffect, useRef, useCallback } from 'react';
import { useMqtt } from '../MqttContext';

export const useVoiceCommands = () => {
  const { setMovement, sendMode, sendSuction } = useMqtt();
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const recognitionRef = useRef(null);

  const isListeningRef = useRef(isListening);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const processCommandRef = useRef(null);

  // Initialize Speech Recognition ONCE
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript.trim().toLowerCase();
      console.log("[VOICE] Heard:", transcript);
      setLastCommand(transcript);
      if (processCommandRef.current) {
        processCommandRef.current(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Auto-restart if we are supposed to be listening
      if (isListeningRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // Already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Run only once!

  // Toggle listening state
  const toggleListening = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) recognitionRef.current.stop();
    } else {
      setIsListening(true);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          speak("Voice control activated");
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [isListening]);

  // Speak a response
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech to feel responsive
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Parse transcript and send MQTT command
  const processCommand = (transcript) => {
    // Only process commands if they include the wake word "vacbot"
    if (!transcript.includes('vacbot')) {
      return; // Ignore background chatter
    }

    // Mode Commands
    if (transcript.includes('start cleaning') || transcript.includes('auto mode')) {
      speak('Switching to Auto Mode');
      sendMode('AUTO');
      return;
    }
    if (transcript.includes('manual mode')) {
      speak('Manual Mode engaged');
      sendMode('MANUAL');
      return;
    }
    if (transcript.includes('sleep') || transcript.includes('shut down')) {
      speak('Going to sleep');
      sendMode('SLEEP');
      return;
    }

    // Suction Commands
    if (transcript.includes('suction max') || transcript.includes('maximum power')) {
      speak('Maximum suction power');
      sendSuction(100);
      return;
    }
    if (transcript.includes('suction off') || transcript.includes('vacuum off')) {
      speak('Suction off');
      sendSuction(0);
      return;
    }

    // Movement Commands
    if (transcript.includes('stop') || transcript.includes('halt') || transcript.includes('brake')) {
      speak('Stopping');
      setMovement('STOP');
      return;
    }
    if (transcript.includes('go forward') || transcript.includes('move forward')) {
      setMovement('FORWARD');
      return;
    }
    if (transcript.includes('go back') || transcript.includes('reverse')) {
      setMovement('BACKWARD');
      return;
    }
    if (transcript.includes('turn left')) {
      setMovement('LEFT');
      return;
    }
    if (transcript.includes('turn right')) {
      setMovement('RIGHT');
      return;
    }
  };

  // Update ref so the stale closure in useEffect can access the latest function
  processCommandRef.current = processCommand;

  return {
    isListening,
    toggleListening,
    lastCommand
  };
};
