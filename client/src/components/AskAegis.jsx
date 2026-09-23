import { useState, useEffect, useRef } from 'react';
import { runAgent, approveAgentProposal, rejectAgentProposal } from '../services/aiApi';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

function AskAegis({ onChanged }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  // voice input
  const { isSupported, listening, transcript, startListening, stopListening } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setQuestion(transcript);
    }
  }, [transcript]);

  // press "/" anywhere to focus the ask box
  useEffect(() => {
    const handleKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // now that it can act, the prompts should show that
  const suggestions = [
    'What needs my attention?',
    'Add gym at 6pm',
    'Move anything overdue to tomorrow',
  ];

  const handleAsk = async (e, presetQuestion) => {
    if (e) e.preventDefault();
    const q = presetQuestion || question;
    if (!q.trim()) return;

    setLoading(true);
    setError('');
    setAnswer('');
    setProposal(null);
    if (presetQuestion) setQuestion(presetQuestion);

    try {
      const data = await runAgent(q);
      setAnswer(data.reply);

      if (data.needsApproval && data.proposal) {
        setProposal(data.proposal);
      } else if (data.steps?.length) {
        // it touched something — let Home re-read
        onChanged?.();
      }

      if (!presetQuestion) setQuestion('');
    } catch (err) {
      setError('Could not get an answer. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!proposal) return;
    setLoading(true);
    try {
      const data = await approveAgentProposal(proposal.id);
      setAnswer(data.error || data.reply);
      setProposal(null);
      onChanged?.();
    } catch (err) {
      setError('Could not apply those changes.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!proposal) return;
    setLoading(true);
    try {
      const data = await rejectAgentProposal(proposal.id);
      setAnswer(data.reply);
      setProposal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="surface-tile">
      <div className="flex items-center mb-1">
        <h2 className="display-md">Ask Aegis</h2>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded border ml-2"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-faint)',
            fontFamily: 'monospace',
          }}
        >
          /
        </span>
      </div>
      <p className="body-sm mb-4">Ask about your day, or tell it what to change.</p>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask anything, or say what to do…"
          className="input-lux flex-1"
        />

        {isSupported && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            className="btn-outline px-3"
            style={
              listening
                ? { borderColor: 'var(--rose)', color: 'var(--rose)' }
                : undefined
            }
            title={listening ? 'Stop listening' : 'Speak your question'}
          >
            {listening ? '⏹' : '🎤'}
          </button>
        )}

        <button type="submit" disabled={loading} className="btn-gold">
          {loading ? 'Thinking…' : 'Ask'}
        </button>
      </form>

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

      {/* suggestion chips */}
      <div className="flex flex-wrap gap-2 mt-4">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => handleAsk(null, s)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full transition"
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 body-sm" style={{ color: 'var(--rose)' }}>
          {error}
        </p>
      )}

      {answer && (
        <div
          className="mt-4 px-4 py-3 rounded-xl animate-rise"
          style={{
            background: 'rgba(212, 175, 122, 0.08)',
            borderLeft: '2px solid var(--gold)',
          }}
        >
          <p className="body-text" style={{ color: 'var(--text-display)', whiteSpace: 'pre-line' }}>
            {answer}
          </p>
        </div>
      )}

      {/* Nothing has been changed at this point — these are still proposals */}
      {proposal && (
        <div
          className="mt-3 px-4 py-3 rounded-xl animate-rise"
          style={{
            background: 'rgba(201, 139, 139, 0.06)',
            border: '1px solid rgba(201, 139, 139, 0.28)',
          }}
        >
          <p className="eyebrow mb-2" style={{ color: 'var(--rose)' }}>
            Waiting for you
          </p>

          <ul className="space-y-1 mb-3">
            {proposal.actions.map((a, i) => (
              <li key={i} className="body-sm" style={{ color: 'var(--text-body)' }}>
                — {a}
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <button onClick={handleApprove} disabled={loading} className="btn-gold">
              {loading ? 'Applying…' : 'Do it'}
            </button>
            <button onClick={handleReject} disabled={loading} className="btn-outline">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AskAegis;