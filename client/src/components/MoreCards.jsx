import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Brain, BarChart3 } from 'lucide-react';
import { getRead } from '../services/readApi';
import { getMemories } from '../services/memoryApi';

function MoreCards({ completionRate }) {
  const [closing, setClosing] = useState('');
  const [memCount, setMemCount] = useState(null);

  useEffect(() => {
    const load = async () => {
      // read is cached server-side, so this is usually free
      try {
        const r = await getRead();
        if (r?.closing) setClosing(r.closing);
      } catch (err) {
        console.error('MoreCards: read unavailable', err);
      }

      try {
        const m = await getMemories();
        setMemCount(m.length);
      } catch (err) {
        console.error('MoreCards: memories unavailable', err);
      }
    };
    load();
  }, []);

  return (
    <div className="more-grid animate-rise delay-4">
      {/* Read — the hero */}
      <Link to="/read" className="more-card more-card-wide more-wide">
        <div className="more-head">
          <Eye size={14} strokeWidth={2} />
          <span className="more-name">What Aegis sees</span>
        </div>
        <p className="more-quote">
          {closing || 'Aegis has been watching. See what it has noticed.'}
        </p>
        <span className="more-arrow">→</span>
      </Link>

      {/* Memory */}
      <Link to="/memory" className="more-card">
        <div className="more-head">
          <Brain size={14} strokeWidth={2} />
          <span className="more-name">Memory</span>
        </div>
        <p className="more-stat">{memCount === null ? '—' : memCount}</p>
        <p className="more-sub">
          {memCount === 1 ? 'thing learned about you' : 'things learned about you'}
        </p>
        <span className="more-arrow">→</span>
      </Link>

      {/* Stats */}
      <Link to="/dashboard" className="more-card">
        <div className="more-head">
          <BarChart3 size={14} strokeWidth={2} />
          <span className="more-name">Stats</span>
        </div>
        <p className="more-stat">{completionRate}%</p>
        <p className="more-sub">of everything, finished</p>
        <span className="more-arrow">→</span>
      </Link>
    </div>
  );
}

export default MoreCards;