// Derives a task's real urgency from its due date — not a self-reported label.

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const GROUPS = [
  { key: 'overdue', label: 'Overdue', note: 'Past their date' },
  { key: 'today', label: 'Today', note: 'Due now' },
  { key: 'week', label: 'This week', note: 'Coming up' },
  { key: 'later', label: 'Later', note: 'Beyond this week' },
  { key: 'someday', label: 'No date', note: 'Whenever' },
];

export const groupOf = (task) => {
  if (!task.dueDate) return 'someday';

  const today = startOfDay(new Date());
  const due = startOfDay(task.dueDate);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 7) return 'week';
  return 'later';
};

// human-readable date, relative where it helps
export const dueLabel = (task) => {
  if (!task.dueDate) return null;

  const today = startOfDay(new Date());
  const due = startOfDay(task.dueDate);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays <= 7)
    return new Date(task.dueDate).toLocaleDateString('en-US', { weekday: 'short' });

  return new Date(task.dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

// starred first, then by due date, then newest
export const sortTasks = (a, b) => {
  if (a.important !== b.important) return a.important ? -1 : 1;
  if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return new Date(b.createdAt) - new Date(a.createdAt);
};