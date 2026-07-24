import { useState, useRef, useEffect } from 'react';

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export const useSpeechRecognition = () => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const finalTextRef = useRef('');

  const isSupported = !!SpeechRecognition;

  useEffect(() => {
    if (!isSupported) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;       // keep listening until we stop it
    recognition.interimResults = true;   // show words as they're spoken
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimText = '';

      // walk through new results since the last event
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTextRef.current += text + ' ';
        } else {
          interimText += text;
        }
      }

      setInterim(interimText);
    };

    recognition.onerror = (event) => {
      // 'no-speech' fires during pauses — ignore it, keep listening
      if (event.error === 'no-speech') return;

      setError(
        event.error === 'not-allowed'
          ? 'Microphone access denied.'
          : 'Could not hear that. Try again.'
      );
      shouldKeepListeningRef.current = false;
      setListening(false);
    };

    recognition.onend = () => {
      // browsers sometimes stop on their own — restart if the user hasn't stopped
      if (shouldKeepListeningRef.current) {
        try {
          recognition.start();
        } catch (err) {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      recognition.abort();
    };
  }, [isSupported]);

  const startListening = () => {
    if (!isSupported || listening) return;
    setError('');
    setTranscript('');
    setInterim('');
    finalTextRef.current = '';
    shouldKeepListeningRef.current = true;

    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (err) {
      console.error('Speech recognition error:', err);
    }
  };

  const stopListening = () => {
    if (!isSupported) return;
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);

    // deliver the full dictated text when the user stops
    const full = (finalTextRef.current + interim).trim();
    if (full) setTranscript(full);
    setInterim('');
  };

  return {
    isSupported,
    listening,
    transcript,
    interim,
    error,
    startListening,
    stopListening,
  };
};