import { useRef, useState, useCallback, useEffect } from 'react';

// white noise is harsh, brown is soft — balance their loudness
const LEVEL = { brown: 0.45, pink: 0.16, white: 0.06 };

/**
 * Builds a 10-second noise buffer that loops without a click.
 * We generate a little extra at the end and cross-fade it into the start,
 * so the last sample flows straight into the first.
 */
const makeBuffer = (ctx, kind) => {
  const rate = ctx.sampleRate;
  const L = rate * 10;
  const n = Math.floor(rate * 0.25);
  const raw = new Float32Array(L + n);

  let last = 0;
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

  for (let i = 0; i < raw.length; i++) {
    const w = Math.random() * 2 - 1;

    if (kind === 'white') {
      raw[i] = w;
    } else if (kind === 'brown') {
      last = (last + 0.02 * w) / 1.02;
      raw[i] = last * 3.5;
    } else {
      // pink — Paul Kellet's refined filter
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }

  // seamless loop
  for (let i = 0; i < n; i++) {
    const g = i / n;
    raw[i] = raw[i] * g + raw[L + i] * (1 - g);
  }

  const buffer = ctx.createBuffer(1, L, rate);
  buffer.getChannelData(0).set(raw.subarray(0, L));
  return buffer;
};

export const useNoise = () => {
  const ctxRef = useRef(null);
  const srcRef = useRef(null);
  const gainRef = useRef(null);
  const cache = useRef({});
  const [noise, setNoise] = useState(null);

  const stopNoise = useCallback(() => {
    const ctx = ctxRef.current;
    const src = srcRef.current;
    const gain = gainRef.current;

    if (ctx && src && gain) {
      const t = ctx.currentTime;
      gain.gain.cancelScheduledValues(t);
      gain.gain.setValueAtTime(gain.gain.value, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.6); // fade, never cut
      try {
        src.stop(t + 0.65);
      } catch {
        /* already stopped */
      }
    }

    srcRef.current = null;
    gainRef.current = null;
    setNoise(null);
  }, []);

  const playNoise = useCallback(
    (kind) => {
      if (!ctxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      stopNoise();

      if (!cache.current[kind]) cache.current[kind] = makeBuffer(ctx, kind);

      const src = ctx.createBufferSource();
      src.buffer = cache.current[kind];
      src.loop = true;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(LEVEL[kind], ctx.currentTime + 1.2);

      src.connect(gain).connect(ctx.destination);
      src.start();

      srcRef.current = src;
      gainRef.current = gain;
      setNoise(kind);
    },
    [stopNoise]
  );

  const toggleNoise = useCallback(
    (kind) => (noise === kind ? stopNoise() : playNoise(kind)),
    [noise, playNoise, stopNoise]
  );

  // tidy up when focus mode closes
  useEffect(
    () => () => {
      try {
        srcRef.current?.stop();
      } catch {
        /* ignore */
      }
      ctxRef.current?.close?.();
    },
    []
  );

  return { noise, toggleNoise, stopNoise };
};