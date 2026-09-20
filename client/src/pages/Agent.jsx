import { useState, useRef, useEffect } from 'react';
import { sendToAgent } from '../services/agentApi';
import '../styles/agent.css';

const OPENERS = [
  "What's on my plate?",
  'Push my non-urgent tasks to next week',
  'What did I write about last week?',
];

// turn a tool call into a human line
const describeStep = (step) => {
  const { tool, args, result } = step;
  const failed = result?.error;

  const map = {
    get_tasks: () => `read your ${args.filter || 'open'} tasks`,
    get_habits: () => 'read your habits',
    create_task: () => `created "${args.title}"`,
    reschedule_task: () =>
      args.dueDate === 'none'
        ? 'removed a due date'
        : `moved a task to ${args.dueDate}`,
    complete_task: () => 'marked a task done',
    create_habit: () => `started tracking "${args.name}"`,
    check_in_habit: () => 'checked in a habit',
    search_diary: () => `searched your diary for "${args.query}"`,
  };

  const text = map[tool] ? map[tool]() : tool;
  return { text, failed };
};

function Agent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [working, setWorking] = useState(false);
  const logEnd = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, working]);

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || working) return;

    setInput('');
    setWorking(true);
    setMessages((prev) => [...prev, { role: 'user', content: msg }]);

    // send only plain turns as history
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await sendToAgent(msg, history);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.reply, steps: res.steps || [] },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Something went wrong reaching me. Try again.',
          steps: [],
        },
      ]);
    } finally {
      setWorking(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="max-w-2xl mx-auto relative z-10 flex flex-col min-h-[70vh]">
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">Ask and it acts</p>
        <h1 className="display-lg">Aegis</h1>
        <p className="body-text mt-1">
          Tell it what you want done. It will read your data and make the changes.
        </p>
      </div>

      {/* conversation */}
      <div className="agent-log flex-1">
        {messages.length === 0 && !working && (
          <div className="flex flex-wrap gap-2">
            {OPENERS.map((o) => (
              <button key={o} onClick={() => send(o)} className="agent-chip">
                {o}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="msg-user animate-rise">
              {m.content}
            </div>
          ) : (
            <div key={i} className="flex flex-col gap-2">
              {m.steps?.length > 0 && (
                <div className="trace">
                  {m.steps.map((s, j) => {
                    const { text, failed } = describeStep(s);
                    return (
                      <div key={j} className="trace-step">
                        <span className="trace-dot"></span>
                        <span className={failed ? 'trace-fail' : 'trace-name'}>
                          {failed ? 'failed:' : '·'}
                        </span>
                        <span>{text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <p className="msg-agent animate-rise">{m.content}</p>
            </div>
          )
        )}

        {working && (
          <div className="agent-working">
            <span className="think-dot"></span>
            <span className="think-dot"></span>
            <span className="think-dot"></span>
            <span className="ml-1">Working on it.</span>
          </div>
        )}

        <div ref={logEnd}></div>
      </div>

      {/* composer */}
      <div className="agent-composer">
        <div className="composer-row">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Tell Aegis what to do…"
            rows={1}
            className="composer-input"
          />
          <button
            onClick={() => send()}
            disabled={working || !input.trim()}
            className="btn-gold"
          >
            Send
          </button>
        </div>
        <p className="body-sm mt-2" style={{ color: 'var(--text-faint)', fontSize: '0.7rem' }}>
          It can create, reschedule and complete things. Check the trace to see what it did.
        </p>
      </div>
    </div>
  );
}

export default Agent;