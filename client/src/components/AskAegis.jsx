import { useState, useEffect } from 'react';
import { askAegis } from '../services/aiApi';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

function AskAegis() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // voice input
  const { isSupported, listening, transcript, startListening, stopListening } =
    useSpeechRecognition();

  // when speech is recognized, put it in the question box
  useEffect(() => {
    if (transcript) {
      setQuestion(transcript);
    }
  }, [transcript]);

  const suggestions = [
    'What are my high priority tasks?',
    'Do I have anything overdue?',
    'What is my longest streak?',
  ];

  const handleAsk = async (e, presetQuestion) => {
    if (e) e.preventDefault();
    const q = presetQuestion || question;
    if (!q.trim()) return;

    setLoading(true);
    setError('');
    setAnswer('');
    if (presetQuestion) setQuestion(presetQuestion);

    try {
      const data = await askAegis(q);
      setAnswer(data.answer);
    } catch (err) {
      setError('Could not get an answer. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
      <h2 className="font-semibold text-slate-900 flex items-center gap-2">
        <span>💬</span> Ask Aegis
      </h2>
      <p className="text-sm text-slate-500 mt-0.5 mb-3">
        Ask anything about your tasks and habits — type or speak.
      </p>

      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What's overdue? How many tasks did I finish?"
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />

        {isSupported && (
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${
              listening
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
            title={listening ? 'Stop listening' : 'Speak your question'}
          >
            {listening ? '⏹' : '🎤'}
          </button>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:bg-slate-400 transition"
        >
          {loading ? 'Thinking...' : 'Ask'}
        </button>
      </form>

      {listening && (
        <div className="flex items-center gap-2 mt-2 text-sm text-red-600">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          Listening... ask your question
        </div>
      )}

      {/* suggestion chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => handleAsk(null, s)}
            disabled={loading}
            className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            {s}
          </button>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {answer && (
        <div className="mt-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-lg px-4 py-3">
          <p className="text-sm text-slate-800">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default AskAegis;