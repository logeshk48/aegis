import { useState, useRef, useEffect } from 'react';

// the browser's speech API (Chrome uses the webkit-prefixed version)
const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const useSpeechRecognition = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;      // stop after one phrase
    recognition.interimResults = false;  // only give us the final result
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed'
        ? 'Microphone access denied.'
        : 'Could not hear that. Try again.');
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    // cleanup when the component unmounts
    return () => {
      recognition.abort();
    };
  }, [isSupported]);

  const startListening = () => {
    if (!isSupported || listening) return;
    setError('');
    setTranscript('');
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      console.error('Speech recognition error:', err);
    }
  };

  const stopListening = () => {
    if (!isSupported) return;
    recognitionRef.current?.stop();
    setListening(false);
  };

  return { isSupported, listening, transcript, error, startListening, stopListening };
};