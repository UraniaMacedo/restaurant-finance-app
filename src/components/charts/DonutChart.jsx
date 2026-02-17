import React from "react";

function clamp(n) {
  return Math.max(0, Math.min(1, n));
}

export default function DonutChart({
  title,
  data = [],        // [{ label, value }]
  currencyText,     // string formatada opcional
  formatValue,      // (v)=>string
  size = 180,
  stroke = 22,
  colors = [],
  theme = "dark",   // "dark" | "light"
}) {
  const total = (data || []).reduce((s, d) => s + Number(d?.value || 0), 0);
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;

  const isLight = String(theme).toLowerCase() === "light";

  const ui = {
    cardBg: isLight ? "#ffffff" : "rgba(255,255,255,.03)",
    cardBorder: isLight ? "1px solid #e2e8f0" : "1px solid rgba(255,255,255,.10)",
    titleColor: isLight ? "#0f172a" : "rgba(255,255,255,.95)",
    muted: isLight ? "rgba(15,23,42,.65)" : "rgba(255,255,255,.75)",
    ringBase: isLight ? "rgba(15,23,42,.10)" : "rgba(255,255,255,.10)",
    legendText: isLight ? "#0f172a" : "rgba(255,255,255,.92)",
    legendValue: isLight ? "rgba(15,23,42,.85)" : "rgba(255,255,255,.85)",
    defaultStroke: isLight ? "rgba(15,23,42,.55)" : "rgba(255,255,255,.6)",
  };

  // Remove itens zerados pra não criar fatia “fantasma”
  const clean = (data || []).filter((d) => Number(d?.value || 0) > 0);

  // Se não tem dados, não desenha donut (mostra mensagem simples)
  if (!clean.length || total <= 0) {
    return (
      <div
        style={{
          padding: 14,
          borderRadius: 16,
          border: ui.cardBorder,
          background: ui.cardBg,
        }}
      >
        <div style={{ fontWeight: 950, marginBottom: 8, color: ui.titleColor }}>
          {title}
        </div>
        <div style={{ opacity: 0.85, padding: 10, color: ui.muted }}>
          Fill values to see the chart.
        </div>
      </div>
    );
  }

  let acc = 0;

  // Legend ordenada por valor desc
  const legend = [...clean].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));

  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: ui.cardBorder,
        background: ui.cardBg,
      }}
    >
      <div style={{ fontWeight: 950, marginBottom: 10, color: ui.titleColor }}>
        {title}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "220px 1fr",
          gap: 14,
          alignItems: "center",
        }}
      >
        <svg width={size} height={size} style={{ display: "block" }}>
          {/* base ring */}
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={ui.ringBase}
            strokeWidth={stroke}
          />

          {clean.map((d, i) => {
            const v = Number(d.value || 0);
            const frac = clamp(v / total);
            const dash = frac * circ;
            const gap = circ - dash;

            // start at top
            const rot = acc * 360 - 90;
            acc += frac;

            return (
              <circle
                key={d.label}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={colors[i] || ui.defaultStroke}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${gap}`}
                strokeLinecap="round"
                transform={`rotate(${rot} ${c} ${c})`}
              />
            );
          })}

          {/* center text */}
          <text
            x={c}
            y={c - 4}
            textAnchor="middle"
            fontSize="12"
            fill={ui.muted}
            fontWeight="800"
          >
            Total
          </text>

          <text
            x={c}
            y={c + 16}
            textAnchor="middle"
            fontSize="14"
            fill={ui.titleColor}
            fontWeight="950"
          >
            {currencyText || formatValue?.(total) || total}
          </text>
        </svg>

        {/* legend */}
        <div style={{ display: "grid", gap: 8 }}>
          {legend.map((d) => {
            const pct = ((Number(d.value || 0) / total) * 100).toFixed(0);
            const originalIndex = clean.findIndex((x) => x.label === d.label);

            return (
              <div
                key={d.label}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: colors[originalIndex] || ui.defaultStroke,
                  }}
                />
                <div style={{ flex: 1, fontWeight: 900, color: ui.legendText }}>
                  {d.label}
                </div>
                <div style={{ opacity: 0.85, fontWeight: 900, color: ui.legendValue }}>
                  {pct}%
                </div>
                <div
                  style={{
                    minWidth: 90,
                    textAlign: "right",
                    fontWeight: 950,
                    color: ui.legendText,
                  }}
                >
                  {formatValue?.(d.value) || d.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


