export function EmptyState({
  title,
  subtitle,
  icon = 'ball',
}: {
  title: string;
  subtitle?: string;
  icon?: 'ball' | 'calendar' | 'photo' | 'users';
}) {
  return (
    <div className="card rounded-lg py-16 px-6 text-center flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-ink-800 border border-slateblue-800 flex items-center justify-center text-croatia mb-5">
        <Icon name={icon} />
      </div>
      <h3 className="font-display font-bold text-2xl text-white uppercase tracking-[.04em]">
        {title}
      </h3>
      {subtitle && (
        <p className="font-sans text-slateblue-300 mt-2 max-w-md">{subtitle}</p>
      )}
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const common = { width: 28, height: 28, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'calendar')
    return (
      <svg viewBox="0 0 24 24" {...common}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>
    );
  if (name === 'photo')
    return (
      <svg viewBox="0 0 24 24" {...common}><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m21 16-5-4-8 7" /></svg>
    );
  if (name === 'users')
    return (
      <svg viewBox="0 0 24 24" {...common}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0M16 6a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" /></svg>
    );
  return (
    <svg viewBox="0 0 24 24" {...common}><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M6 6l12 12M18 6 6 18" /></svg>
  );
}
