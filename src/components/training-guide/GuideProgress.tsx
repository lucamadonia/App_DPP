interface GuideProgressProps {
  percentage: number;
}

export function GuideProgress({ percentage }: GuideProgressProps) {
  return (
    <div className="sticky top-14 z-30 h-1 bg-slate-100">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 animate-guide-progress-fill transition-all duration-700"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
