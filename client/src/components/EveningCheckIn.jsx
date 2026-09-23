import { useState, useEffect } from 'react';
import { createDiaryEntry } from '../services/aiApi';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { buildEveningPrompt } from '../utils/eveningPrompt';
import '../styles/evening.css';

function EveningCheckIn({ stats, onSaved, onDismiss }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const { isSupported, listening, transcript, startListening, stopListening } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript) setText((prev) => (prev ? prev + ' ' + transcript : transcript));
  }, [transcript]);

  const prompt = buildEveningPrompt(stats);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!text.trim() || saving) return;

    setSaving(true);
    setError('');
    try {
      const data = await createDiaryEntry(text.trim());
      setSaved(data.message || 'Kept.');
      onSaved?.(data);
    } catch (err) {
      setError('Could not save that. Your words are still here — try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // after saving, the card stays a moment so you see what it learned
  if (saved) {
    return (
      <div className="evening-card evening-done animate-rise">
        <p className="eyebrow mb-1" style={{ color: 'var(--gold)' }}>Day closed</p>
        <p className="body-text" style={{ color: 'var(--text-display)' }}>{saved}</p>
        <button onClick={onDismiss} className="btn-outline mt-4">Done</button>
      </div>
    );
  }

  return (
    <div className="evening-card animate-rise">
      <div className="flex items-start justify-between">
        <div>
          <p className="eyebrow mb-2">Evening</p>
          <h2 className="display-md">{prompt.headline}</h2>
        </div>
        <button onClick={onDismiss} className="btn-delete" title="Not tonight">✕</button>
      </div>

      <p className="body-text mt-2" style={{ color: 'var(--text-display)' }}>
        {prompt.question}
      </p>
      <p className="body-sm mt-1">{prompt.hint}</p>

      <form onSubmit={handleSave} className="mt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell it about your day…"
          rows={4}
          className="ai-textarea"
        />

        {listening && (
          <div className="flex items-center gap-2 mt-3 body-sm" style={{ color: 'var(--rose)' }}>
            <span className="relative flex h-2 w-2">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ background: 'var(--rose)' }}
              ></span>
              <span
                className="relative inline-flex rounded-full h-2 w-2"
                style={{ background: 'var(--rose)' }}
              ></span>
            </span>
            Listening…
          </div>
        )}

        <div className="flex items-center gap-2 mt-4">
          <button type="submit" disabled={saving || !text.trim()} className="btn-gold">
            {saving ? 'Keeping…' : 'Close the day'}
          </button>
          {isSupported && (
            <button
              type="button"
              onClick={listening ? stopListening : startListening}
              className="btn-outline"
              style={listening ? { borderColor: 'var(--rose)', color: 'var(--rose)' } : undefined}
            >
              {listening ? '⏹ Stop' : '🎤 Speak'}
            </button>
          )}
        </div>

        {error && (
          <p className="body-sm mt-3" style={{ color: 'var(--rose)' }}>{error}</p>
        )}
      </form>
    </div>
  );
}

export default EveningCheckIn;