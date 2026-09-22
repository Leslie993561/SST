interface DonutChartProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
}

export function DonutChart({
  percent,
  size = 116,
  strokeWidth = 14,
  color = "var(--color-brand)",
  trackColor = "var(--color-border)",
  label = "conforme",
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text x={center} y={center - 2} textAnchor="middle" fontFamily="Montserrat" fontSize={size * 0.2} fontWeight={700} fill="#33485a">
        {Math.round(clamped)}%
      </text>
      <text x={center} y={center + size * 0.13} textAnchor="middle" fontFamily="Montserrat" fontSize={size * 0.078} fill="#818286">
        {label}
      </text>
    </svg>
  );
}
