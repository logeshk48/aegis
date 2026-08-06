function ProgressRing({ completed, total }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="ring-wrap">
      <svg className="ring-svg" viewBox="0 0 92 92">
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d4af7a" />
            <stop offset="50%" stopColor="#e8c99b" />
            <stop offset="100%" stopColor="#c9a068" />
          </linearGradient>
        </defs>

        <circle className="ring-track" cx="46" cy="46" r={radius} />
        <circle
          className="ring-fill"
          cx="46"
          cy="46"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="ring-center">
        <span className="ring-pct">{pct}%</span>
        <span className="ring-sub">
          {completed}/{total}
        </span>
      </div>
    </div>
  );
}

export default ProgressRing;