interface BarGroup {
  label: string;
  a: number;
  b: number;
}

interface GroupedBarChartProps {
  groups: BarGroup[];
  colorA?: string;
  colorB?: string;
  height?: number;
  legendA?: string;
  legendB?: string;
}

/** Gráfico de barras pareadas (ex.: orçado x realizado) desenhado em SVG, sem dependências externas. */
export function GroupedBarChart({
  groups,
  colorA = "#c7d6dc",
  colorB = "#56A4BB",
  height = 160,
  legendA = "Orçado",
  legendB = "Realizado",
}: GroupedBarChartProps) {
  const max = Math.max(1, ...groups.flatMap((g) => [g.a, g.b]));
  const barWidth = 14;
  const groupGap = 28;
  const groupWidth = barWidth * 2 + 6;
  const width = groups.length * (groupWidth + groupGap) + groupGap;
  const chartHeight = height - 24;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="xMinYMid meet">
        {groups.map((g, i) => {
          const x = groupGap + i * (groupWidth + groupGap);
          const hA = Math.max(2, Math.round((chartHeight * g.a) / max));
          const hB = Math.max(2, Math.round((chartHeight * g.b) / max));
          return (
            <g key={g.label}>
              <rect x={x} y={chartHeight - hA} width={barWidth} height={hA} rx={3} fill={colorA} />
              <rect x={x + barWidth + 6} y={chartHeight - hB} width={barWidth} height={hB} rx={3} fill={g.b > g.a ? "#c0584e" : colorB} />
              <text x={x + groupWidth / 2} y={height - 4} fontSize="10" fontFamily="Montserrat" fill="#818286" textAnchor="middle">
                {g.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#51606b", marginTop: 4 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: colorA, display: "inline-block" }} /> {legendA}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: colorB, display: "inline-block" }} /> {legendB}
        </span>
      </div>
    </div>
  );
}
