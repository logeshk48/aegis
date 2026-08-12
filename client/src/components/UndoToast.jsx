import { useEffect, useState } from 'react';

function UndoToast({ message, onUndo, onExpire, duration = 5000 }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(onExpire, 350);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onExpire]);

  return (
    <div className="toast-wrap">
      <div className={`toast relative ${leaving ? 'toast-leaving' : ''}`}>
        <span className="toast-msg">{message}</span>
        <button onClick={onUndo} className="toast-undo">
          Undo
        </button>
        <div className="toast-timer"></div>
      </div>
    </div>
  );
}

export default UndoToast;