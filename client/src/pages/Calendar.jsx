import { useState, useEffect } from 'react';
import api from '../api/axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import '../styles/calendar.css';

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const key = (d) => new Date(d).toISOString().split('T')[0];
const todayKey = () => key(new Date());

function Calendar() {
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(todayKey());

  useEffect(() => {
    const load = async () => {
      try {
        const [t, d] = await Promise.all([api.get('/tasks'), api.get('/diary')]);
        setTasks(t.data);
        setEntries(d.data);
      } catch (err) {
        console.error('Could not load calendar data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // index everything by date
  const tasksByDate = {};
  tasks.forEach((t) => {
    if (!t.dueDate) return;
    const k = key(t.dueDate);
    (tasksByDate[k] = tasksByDate[k] || []).push(t);
  });

  const diaryByDate = {};
  entries.forEach((e) => {
    diaryByDate[e.entryDate] = e;
  });

  // build the visible grid
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }

  const shift = (n) => {
    const next = new Date(cursor);
    next.setMonth(next.getMonth() + n);
    setCursor(next);
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.patch(`/tasks/${id}/toggle`);
      setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
    } catch (err) {
      console.error(err);
    }
  };

  const selectedTasks = (tasksByDate[selected] || []).sort(
    (a, b) => Number(a.completed) - Number(b.completed)
  );
  const selectedEntry = diaryByDate[selected];

  const prettySelected = new Date(selected).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const monthTaskCount = Object.entries(tasksByDate).filter(([k]) => {
    const d = new Date(k);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  if (loading) {
    return <p className="body-sm max-w-2xl mx-auto">Loading your month…</p>;
  }

  return (
    <div className="max-w-2xl mx-auto relative z-10">
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">Your month</p>
        <h1 className="display-lg">Calendar</h1>
        <p className="body-text mt-1">
          {monthTaskCount === 0
            ? 'Nothing scheduled this month.'
            : `${monthTaskCount} day${monthTaskCount === 1 ? '' : 's'} with something on them.`}
        </p>
      </div>

      <div className="cal-panel animate-rise delay-1">
        {/* header */}
        <div className="cal-head">
          <button onClick={() => shift(-1)} className="cal-nav" title="Previous month">
            <ChevronLeft size={16} />
          </button>
          <p className="cal-month">
            {MONTHS[month]} {year}
          </p>
          <button onClick={() => shift(1)} className="cal-nav" title="Next month">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* grid */}
        <div className="cal-grid">
          {DOW.map((d, i) => (
            <div key={i} className="cal-dow">
              {d}
            </div>
          ))}

          {cells.map((date, i) => {
            if (!date) return <div key={i} className="cal-cell cal-empty"></div>;

            const k = key(date);
            const dayTasks = tasksByDate[k] || [];
            const openTasks = dayTasks.filter((t) => !t.completed);
            const isOverdue = k < todayKey() && openTasks.length > 0;
            const hasDiary = !!diaryByDate[k];

            const classes = [
              'cal-cell',
              k === todayKey() ? 'cal-today' : '',
              k === selected ? 'cal-selected' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button key={i} onClick={() => setSelected(k)} className={classes}>
                <span>{date.getDate()}</span>
                <div className="cal-marks">
                  {dayTasks.length > 0 && (
                    <span className={isOverdue ? 'mark-overdue' : 'mark-task'}></span>
                  )}
                  {hasDiary && <span className="mark-diary"></span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* legend */}
        <div className="cal-legend">
          <span className="cal-key">
            <span className="mark-task"></span> Tasks
          </span>
          <span className="cal-key">
            <span className="mark-overdue"></span> Overdue
          </span>
          <span className="cal-key">
            <span className="mark-diary"></span> Wrote
          </span>
        </div>

        {/* day detail */}
        <div className="day-detail">
          <div className="flex items-baseline justify-between mb-3">
            <p className="day-title">{prettySelected}</p>
            {selectedTasks.length > 0 && (
              <span className="body-sm" style={{ color: 'var(--text-faint)' }}>
                {selectedTasks.filter((t) => !t.completed).length} open
              </span>
            )}
          </div>

          {selectedTasks.length === 0 && !selectedEntry ? (
            <div className="day-empty">Nothing on this day.</div>
          ) : (
            <>
              {selectedTasks.length > 0 && (
                <div className="space-y-2">
                  {selectedTasks.map((t) => (
                    <div
                      key={t._id}
                      className={`day-row ${t.completed ? 'day-row-done' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={t.completed}
                        onChange={() => handleToggle(t._id)}
                        className="lux-check"
                      />
                      <span className="day-row-title">{t.title}</span>
                      {t.important && (
                        <span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>★</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedEntry && (
                <div className="day-diary">
                  {selectedEntry.content.length > 280
                    ? selectedEntry.content.slice(0, 280) + '…'
                    : selectedEntry.content}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mb-8"></div>
    </div>
  );
}

export default Calendar;