'use client';

interface StatusIndicatorProps {
  status: 'done' | 'active' | 'idle';
  label: string;
}

const icons = {
  done: { char: '●', color: '#00ffff' },
  active: { char: '◐', color: '#bf5af2' },
  idle: { char: '○', color: '#52525b' },
};

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const { char, color } = icons[status];

  return (
    <div className="flex items-center gap-3 py-2 font-mono text-sm">
      <span
        style={{
          color,
          textShadow: status !== 'idle' ? `0 0 8px ${color}` : 'none',
          animation: status === 'active' ? 'pulse 1.5s ease-in-out infinite' : 'none',
        }}
      >
        {char}
      </span>
      <span
        style={{
          color: status === 'idle' ? '#52525b' : status === 'done' ? '#00ffff' : '#e4e4e7',
        }}
      >
        {label}
      </span>
    </div>
  );
}
