import { useState, useEffect } from 'react';
import api from '../api/axios';

const STATE_COLOR = {
  steady: '#8fbf9f',
  recovering: '#d4af7a',
  slipping: '#e8c99b',
  drifting: '#c98b8b',
  // Deliberately cool and quiet — a paused stretch should read as set aside,
  // not as a warning or as an achievement.
  paused: '#6b7a8f',
  unknown: 'rgba(255,255,255,0.07)',
};

const STATE_LABEL = {
  steady: 'Steady',
  recovering: 'Recovering',
  slipping: 'Slipping',
  drifting: 'Drifting',
  paused: 'Paused',
  unknown: 'No data',
};

const RADIUS = 104;
const CENTER = 130;
const GAP = 1.2; // degrees between segments

function LifeTimeline() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/drift/history?days=60');
        setData(res.data);
      } catch (err) {
        console.error('Could not load timeline:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="timeline-panel mb-6">
        <p className="eyebrow mb-2">Your year so far</p>
        <p className="body-sm italic">Drawing your timeline…</p>
      </div>
    );
  }

  if (!data?.timeline?.length) return null;

  const days = data.timeline;
  const step = 360 / days.length;

  // build an arc path for one day segment
  const arc = (index) => {
    const start = index * step - 90 + GAP / 2;
    const end = start + step - GAP;

    const rad = (deg) => (deg * Math.PI) / 180;
    const x1 = CENTER + RADIUS * Math.cos(rad(start));
    const y1 = CENTER + RADIUS * Math.sin(rad(start));
    const x2 = CENTER + RADIUS * Math.cos(rad(end));
    const y2 = CENTER + RADIUS * Math.sin(rad(end));

    return `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2}`;
  };

  const today = days[days.length - 1];
  const shown = hovered !== null ? days[hovered] : today;

  const withData = days.filter((d) => d.hasData).length;
  const steadyDays = days.filter((d) => d.state === 'steady').length;
  const pausedDays = days.filter((d) => d.state === 'paused').length;

  // Steadiness is measured over the days you were actually here. Counting
  // the week you were ill in the denominator is the thing this whole
  // feature exists to stop.
  const presentDays = days.length - pausedDays;

  const prettyDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // only show meaningful periods
  const periods = (data.periods || []).filter((p) => p.state !== 'unknown' && p.days >= 1);

  // Paused only earns a legend slot once it exists — no explaining a
  // colour that isn't on the ring.
  const legendStates = ['steady', 'recovering', 'slipping', 'drifting'];
  if (pausedDays > 0) legendStates.push('paused');

  return (
    <div className="timeline-panel mb-6 animate-rise">
      <div className="flex items-baseline justify-between mb-1">
        <p className="eyebrow">Your life, lately</p>
        <p className="body-sm" style={{ color: 'var(--text-faint)' }}>
          {withData} day{withData === 1 ? '' : 's'} recorded
        </p>
      </div>
      <h2 className="display-md mb-5">Timeline</h2>

      {/* the ring */}
      <div className="ring-stage">
        <svg viewBox="0 0 260 260" style={{ width: '100%', height: '100%' }}>
          {days.map((d, i) => (
            <path
              key={d.date}
              className="ring-seg"
              d={arc(i)}
              stroke={STATE_COLOR[d.state] || STATE_COLOR.unknown}
              strokeWidth={hovered === i ? 16 : 11}
              strokeLinecap="round"
              fill="none"
              opacity={hovered === null ? (d.hasData ? 0.92 : 0.5) : hovered === i ? 1 : 0.28}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
        </svg>

        <div className="ring-core">
          <p className="core-state">{STATE_LABEL[shown.state] || STATE_LABEL.unknown}</p>
          <p className="core-sub">
            {hovered !== null ? prettyDate(shown.date) : 'today'}
          </p>
          {shown.state === 'paused' ? (
            <p className="core-date" style={{ color: STATE_COLOR.paused }}>
              set aside
            </p>
          ) : (
            shown.score !== null && <p className="core-date">drift {shown.score}</p>
          )}
        </div>
      </div>

      {/* legend */}
      <div className="tl-legend">
        {legendStates.map((s) => (
          <span key={s} className="tl-key">
            <span className="tl-swatch" style={{ background: STATE_COLOR[s] }}></span>
            {STATE_LABEL[s]}
          </span>
        ))}
      </div>

      {/* periods */}
      {periods.length > 0 && (
        <>
          <div
            className="mt-6 pt-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <p className="eyebrow mb-3">Periods</p>
            <div className="period-strip" style={{ marginTop: 0 }}>
              {periods.map((p, i) => (
                <div
                  key={i}
                  className="period-chip"
                  style={{ '--pstate': STATE_COLOR[p.state] }}
                >
                  <p className="period-state">{STATE_LABEL[p.state]}</p>
                  <p className="period-days">
                    {p.days} day{p.days === 1 ? '' : 's'} · {prettyDate(p.from)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p className="body-sm mt-3" style={{ color: 'var(--text-faint)' }}>
            {steadyDays > 0
              ? `${steadyDays} steady day${steadyDays === 1 ? '' : 's'} out of the ${presentDays} you were here.`
              : 'Keep going — the pattern will emerge.'}
            {pausedDays > 0 &&
              ` ${pausedDays} day${pausedDays === 1 ? '' : 's'} set aside.`}
          </p>
        </>
      )}
    </div>
  );
}

export default LifeTimeline;