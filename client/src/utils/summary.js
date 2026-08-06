// Builds one intelligent sentence about the user's current state.
// Picks the MOST notable thing rather than listing everything.

export const buildSummary = ({
  pendingCount,
  overdueCount,
  completedToday,
  bestStreak,
  habitsDoneToday,
  habitsTotal,
  hour,
}) => {
  // 1. Overdue is always the most important thing to surface
  if (overdueCount > 0) {
    if (completedToday > 0) {
      return `You've cleared ${completedToday} today, but ${overdueCount} ${
        overdueCount === 1 ? 'item has' : 'items have'
      } slipped past their date.`;
    }
    return `${overdueCount} ${
      overdueCount === 1 ? 'item is' : 'items are'
    } past due. Worth starting there.`;
  }

  // 2. Everything done — celebrate properly
  if (pendingCount === 0 && completedToday > 0) {
    return `All ${completedToday} finished. The day is yours.`;
  }

  if (pendingCount === 0) {
    return 'Nothing on the list. A rare and pleasant thing.';
  }

  // 3. Strong momentum today
  if (completedToday >= 3) {
    return `${completedToday} done already — ${pendingCount} remaining. Good rhythm.`;
  }

  // 4. Streak worth protecting
  if (bestStreak >= 5 && habitsDoneToday < habitsTotal) {
    return `Your best streak is at ${bestStreak} days. Don't let today break it.`;
  }

  // 5. Habits all done but tasks remain
  if (habitsTotal > 0 && habitsDoneToday === habitsTotal && pendingCount > 0) {
    return `Rituals complete. ${pendingCount} ${
      pendingCount === 1 ? 'task' : 'tasks'
    } left to go.`;
  }

  // 6. Time-aware defaults
  if (hour < 12) {
    return `${pendingCount} ${pendingCount === 1 ? 'thing' : 'things'} ahead of you this morning.`;
  }
  if (hour < 18) {
    return `${pendingCount} ${pendingCount === 1 ? 'thing' : 'things'} still open this afternoon.`;
  }
  return `${pendingCount} ${
    pendingCount === 1 ? 'item' : 'items'
  } left. Still time, if you want it.`;
};