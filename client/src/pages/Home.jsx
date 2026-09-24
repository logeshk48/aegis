import { useState, useEffect } from 'react';
import api from '../api/axios';
import AskAegis from '../components/AskAegis';
import Suggestions from '../components/Suggestions';
import ProgressRing from '../components/ProgressRing';
import DriftPanel from '../components/DriftPanel';
import LifeTimeline from '../components/LifeTimeline';
import MoreCards from '../components/MoreCards';
import MissionCard from '../components/MissionCard';
import FocusMode from '../components/FocusMode';
import EveningCheckIn from '../components/EveningCheckIn';
import SleepCard from '../components/SleepCard';
import { buildSummary } from '../utils/summary';
import { isEvening } from '../utils/eveningPrompt';
import '../styles/home.css';

const todayStr = () => new Date().toISOString().split('T')[0];
const dayOf = (d) => new Date(d).toISOString().split('T')[0];

const isOverdue = (t) => t.dueDate && !t.completed && dayOf(t.dueDate) < todayStr();

const isDueToday = (t) => t.dueDate && !t.completed && dayOf(t.dueDate) === todayStr();

// Added today with no date on it — usually something the agent just made.
// Without this it exists in the database and nowhere on screen.
const isAddedToday = (t) =>
  !t.completed && !t.dueDate && t.createdAt && dayOf(t.createdAt) === todayStr();

// Timed things first, in clock order; everything else after, newest first.
const byTime = (a, b) => {
  const at = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Infinity;
  const bt = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Infinity;
  if (at !== bt) return at - bt;
  return new Date(b.createdAt) - new Date(a.createdAt);
};

function Home() {
  const userName = localStorage.getItem('userName') || 'there';
  const [tasks, setTasks] = useState([]);
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);

  // focus missions
  const [focusSession, setFocusSession] = useState(null);
  const [missionKey, setMissionKey] = useState(0);

  // evening check-in — only looked up after dark
  const [wroteToday, setWroteToday] = useState(null); // null = not checked yet
  const [eveningDismissed, setEveningDismissed] = useState(
    () => localStorage.getItem('aegis:eveningDismissed') === todayStr()
  );

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, habitsRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/habits'),
        ]);
        setTasks(tasksRes.data);
        setHabits(habitsRes.data);
      } catch (err) {
        console.error('Could not load home data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Only fetch the diary once it's actually evening — no point costing a
  // request at 9am for a card that cannot render until 8pm.
  useEffect(() => {
    if (!isEvening() || eveningDismissed) return;
    let cancelled = false;

    api
      .get('/diary')
      .then((res) => {
        if (cancelled) return;
        setWroteToday(res.data.some((e) => e.entryDate === todayStr()));
      })
      .catch(() => !cancelled && setWroteToday(true)); // fail quiet, never nag

    return () => {
      cancelled = true;
    };
  }, [eveningDismissed]);

  const dismissEvening = () => {
    localStorage.setItem('aegis:eveningDismissed', todayStr());
    setEveningDismissed(true);
  };

  // re-read tasks after the mission card changes something
  const reloadTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  // the agent can touch tasks AND habits, so after it acts we re-read both
  // and rebuild the mission — its top task may have just been completed
  const reloadAll = async () => {
    try {
      const [t, h] = await Promise.all([api.get('/tasks'), api.get('/habits')]);
      setTasks(t.data);
      setHabits(h.data);
      setMissionKey((k) => k + 1);
    } catch (err) {
      console.error(err);
    }
  };

  const isHabitDoneToday = (h) => h.completedDates?.includes(todayStr());

  const handleToggle = async (id) => {
    const task = tasks.find((t) => t._id === id);
    const isCompleting = task && !task.completed;

    if (isCompleting) {
      setCompletingId(id);
      setTimeout(async () => {
        try {
          const res = await api.patch(`/tasks/${id}/toggle`);
          setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
        } catch (err) {
          console.error(err);
        } finally {
          setCompletingId(null);
        }
      }, 850);
    } else {
      try {
        const res = await api.patch(`/tasks/${id}/toggle`);
        setTasks((prev) => prev.map((t) => (t._id === id ? res.data : t)));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCheckIn = async (id) => {
    const habit = habits.find((h) => h._id === id);
    if (!habit || isHabitDoneToday(habit)) return;

    const optimistic = {
      ...habit,
      streak: (habit.streak || 0) + 1,
      completedDates: [...(habit.completedDates || []), todayStr()],
    };
    setHabits((prev) => prev.map((h) => (h._id === id ? optimistic : h)));

    try {
      const res = await api.patch(`/habits/${id}/checkin`);
      setHabits((prev) => prev.map((h) => (h._id === id ? res.data : h)));
    } catch (err) {
      console.error('Check-in failed, reverting:', err);
      setHabits((prev) => prev.map((h) => (h._id === id ? habit : h)));
    }
  };

  const handleAcceptSuggestion = async (s) => {
    if (s.type === 'habit') {
      const res = await api.post('/habits', { name: s.title });
      setHabits((prev) => [res.data, ...prev]);
    } else {
      const res = await api.post('/tasks', { title: s.title, priority: 'medium' });
      setTasks((prev) => [res.data, ...prev]);
    }
  };

  const handleStartRecovery = async (plan) => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const created = [];
    for (const p of plan) {
      const res = await api.post('/tasks', {
        title: p.step,
        dueDate: today.toISOString(),
        important: true,
      });
      created.push(res.data);
    }
    setTasks((prev) => [...created, ...prev]);
  };

  // focus mode closed — refresh the mission, and the tasks if one was finished
  const handleFocusClose = async ({ taskCompleted } = {}) => {
    setFocusSession(null);
    setMissionKey((k) => k + 1);
    if (taskCompleted) await reloadTasks();
  };

  // the check-in writes a diary entry, which may have drawn tasks out of it
  const handleEveningSaved = async () => {
    setWroteToday(true);
    await reloadAll();
  };

  const overdueTasks = tasks.filter(isOverdue).sort(byTime);
  const dueTodayTasks = tasks.filter(isDueToday).sort(byTime);
  const addedTodayTasks = tasks.filter(isAddedToday).sort(byTime);
  const pendingTasks = tasks.filter((t) => !t.completed);

  const nothingToday =
    overdueTasks.length === 0 &&
    dueTodayTasks.length === 0 &&
    addedTodayTasks.length === 0;

  const completedToday = tasks.filter(
    (t) => t.completed && dayOf(t.updatedAt) === todayStr()
  ).length;

  const habitsDoneToday = habits.filter(isHabitDoneToday).length;

  const bestStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  const overallRate =
    tasks.length > 0
      ? Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100)
      : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // one row, three flavours — keeps the three lists from duplicating markup
  const TaskRow = ({ task, tone }) => (
    <div
      className={`lux-row ${tone === 'alert' ? 'lux-row-alert' : ''} ${
        completingId === task._id ? 'row-completing row-leaving' : ''
      }`}
    >
      {completingId === task._id ? (
        <span className="check-burst">✓</span>
      ) : (
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => handleToggle(task._id)}
          className="lux-check"
        />
      )}
      <span className="flex-1 text-sm" style={{ color: 'var(--text-display)' }}>
        {task.title}
      </span>

      {completingId !== task._id && tone === 'alert' && (
        <span className="eyebrow" style={{ color: 'var(--rose)' }}>Overdue</span>
      )}

      {completingId !== task._id && tone !== 'alert' && task.scheduledAt && (
        <span className="eyebrow" style={{ color: 'var(--gold)' }}>
          {new Date(task.scheduledAt).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </span>
      )}

      {completingId !== task._id && tone === 'new' && !task.scheduledAt && (
        <span className="eyebrow" style={{ color: 'var(--text-faint)' }}>New</span>
      )}
    </div>
  );

  if (loading) {
    return <p className="body-sm max-w-4xl mx-auto">Loading your day…</p>;
  }

  return (
    <div className="max-w-4xl mx-auto relative z-10">
      {/* Header */}
      <div className="animate-rise mb-6">
        <p className="eyebrow mb-2">{dateLine}</p>
        <h1 className="display-lg">
          {greeting}, <span className="text-shimmer">{userName}</span>
        </h1>
        <p className="body-text mt-2">
          {buildSummary({
            pendingCount: pendingTasks.length,
            overdueCount: overdueTasks.length,
            completedToday,
            bestStreak,
            habitsDoneToday,
            habitsTotal: habits.length,
            hour: new Date().getHours(),
          })}
        </p>
      </div>

      {/* Sleep — the upstream signal. Asks at night, confirms in the morning. */}
      <SleepCard onChanged={reloadAll} />

      {/* Evening check-in — the one thing that feeds tasks, memory and drift at once */}
      {isEvening() && !eveningDismissed && wroteToday === false && (
        <EveningCheckIn
          stats={{
            completedToday,
            openCount: pendingTasks.length,
            overdueCount: overdueTasks.length,
            habitsDone: habitsDoneToday,
            habitsTotal: habits.length,
          }}
          onSaved={handleEveningSaved}
          onDismiss={dismissEvening}
        />
      )}

      {/* Today's mission */}
      <MissionCard
        key={missionKey}
        onStart={(s) => setFocusSession(s)}
        onResume={(s) => setFocusSession(s)}
        onTasksChanged={reloadTasks}
      />

      {/* Drift diagnosis */}
      <DriftPanel onStartRecovery={handleStartRecovery} />

      {/* Suggestions */}
      <div className="animate-rise delay-1">
        <Suggestions onAccept={handleAcceptSuggestion} />
      </div>

      {/* Progress ring + supporting stats */}
      <div className="bento bento-main animate-rise delay-2">
        <div className="surface-tile surface-tile-accent span-2 flex flex-col items-center justify-center">
          <ProgressRing completed={completedToday} total={completedToday + pendingTasks.length} />
          <p className="eyebrow mt-3" style={{ color: 'var(--text-muted)' }}>
            Today's progress
          </p>
        </div>

        <div className="span-3 grid grid-cols-2 gap-4">
          <div className="surface-tile text-center flex flex-col justify-center">
            <div className="numeral">{pendingTasks.length}</div>
            <div className="eyebrow mt-2" style={{ color: 'var(--text-muted)' }}>Remaining</div>
          </div>
          <div className="surface-tile text-center flex flex-col justify-center">
            <div className="numeral">{bestStreak}</div>
            <div className="eyebrow mt-2" style={{ color: 'var(--text-muted)' }}>Best streak</div>
          </div>
        </div>
      </div>

      {/* Main bento */}
      <div className="bento bento-main animate-rise delay-3">
        {/* Today */}
        <div className="surface-tile span-3">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="display-md">Today</h2>
            {overdueTasks.length > 0 && (
              <span className="eyebrow" style={{ color: 'var(--rose)' }}>
                {overdueTasks.length} overdue
              </span>
            )}
          </div>

          {nothingToday ? (
            <div className="lux-empty">Nothing scheduled for today.</div>
          ) : (
            <div className="space-y-2">
              {overdueTasks.map((task) => (
                <TaskRow key={task._id} task={task} tone="alert" />
              ))}

              {dueTodayTasks.map((task) => (
                <TaskRow key={task._id} task={task} tone="today" />
              ))}

              {addedTodayTasks.map((task) => (
                <TaskRow key={task._id} task={task} tone="new" />
              ))}
            </div>
          )}
        </div>

        {/* Habits */}
        <div className="surface-tile span-2">
          <h2 className="display-md mb-4">Rituals</h2>

          {habits.length === 0 ? (
            <div className="lux-empty">No rituals yet.</div>
          ) : (
            <div className="space-y-2">
              {habits.map((habit) => {
                const done = isHabitDoneToday(habit);
                return (
                  <div key={habit._id} className={`lux-row ${done ? 'lux-row-done' : ''}`}>
                    <span
                      className="flex-1 text-sm truncate"
                      style={{ color: 'var(--text-display)' }}
                    >
                      {habit.name}
                    </span>
                    <span className={`chip-streak ${done ? 'chip-pop' : ''}`}>
                      {habit.streak}d
                    </span>
                    <button
                      onClick={() => handleCheckIn(habit._id)}
                      disabled={done}
                      className="btn-mini"
                    >
                      {done ? '✓' : 'Mark'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Life timeline */}
      <div className="animate-rise delay-4">
        <LifeTimeline />
      </div>

      {/* Read · Memory · Stats */}
      <MoreCards completionRate={overallRate} />

      {/* Ask Aegis — tells Home to re-read after the agent changes anything */}
      <div className="mb-8">
        <AskAegis onChanged={reloadAll} />
      </div>

      {/* Full-screen focus — above everything, including the nav */}
      {focusSession && <FocusMode session={focusSession} onClose={handleFocusClose} />}
    </div>
  );
}

export default Home;