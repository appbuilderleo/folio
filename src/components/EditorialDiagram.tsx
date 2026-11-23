import { useEffect, useState } from 'react';
import { Expand, Layers, X } from 'lucide-react';
import type { ReaderTheme, TopicVisual, VectorDiagramSpec } from '../types/folio';

interface Palette {
  bg: string;
  surface: string;
  border: string;
  primary: string;
  primarySoft: string;
  ink: string;
  muted: string;
  accent: string;
  accentSoft: string;
}

const DIAGRAM_PALETTES: Record<ReaderTheme, Palette> = {
  paper: {
    bg: '#f7f1e1',
    surface: '#fcf8ee',
    border: '#dfd2b3',
    primary: '#083b27',
    primarySoft: '#e5efe9',
    ink: '#041a11',
    muted: '#5d594c',
    accent: '#ea9222',
    accentSoft: '#faebd2',
  },
  sepia: {
    bg: '#efe4ca',
    surface: '#f5ecd7',
    border: '#d3c19b',
    primary: '#0a432d',
    primarySoft: '#e3e8d8',
    ink: '#241d14',
    muted: '#615540',
    accent: '#d98216',
    accentSoft: '#f2dfb8',
  },
  night: {
    bg: '#062015',
    surface: '#0b2c1e',
    border: '#1c4c38',
    primary: '#49b683',
    primarySoft: '#113a28',
    ink: '#f1e9d4',
    muted: '#a2b7ab',
    accent: '#ea9222',
    accentSoft: '#3a2a12',
  },
};

function wrapSvgText(text: string, maxChars: number, maxLines = 3): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let curr = '';
  for (const w of words) {
    const candidate = curr ? `${curr} ${w}` : w;
    if (candidate.length <= maxChars) {
      curr = candidate;
    } else {
      if (curr) lines.push(curr);
      curr = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (curr && lines.length < maxLines) lines.push(curr);
  return lines;
}

function FlowVectorSvg({
  spec,
  p,
}: {
  spec: Extract<VectorDiagramSpec, { type: 'flow' }>;
  p: Palette;
}) {
  const steps = spec.steps.slice(0, 5);
  const stepH = 74;
  const gap = 28;
  const topPad = spec.formula ? 56 : 20;
  const width = 520;
  const height = topPad + steps.length * stepH + Math.max(0, steps.length - 1) * gap + 20;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto block"
      role="img"
      aria-label="Esquema vetorial sequencial"
    >
      <defs>
        <marker
          id="folio-arrow-flow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill={p.accent} />
        </marker>
      </defs>

      {spec.formula && (
        <g>
          <rect
            x="24"
            y="12"
            width={width - 48}
            height="32"
            rx="10"
            fill={p.primarySoft}
            stroke={p.primary}
            strokeOpacity="0.35"
          />
          <text
            x={width / 2}
            y="33"
            textAnchor="middle"
            fill={p.primary}
            fontSize="13.5"
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            {spec.formula}
          </text>
        </g>
      )}

      {steps.map((st, idx) => {
        const y = topPad + idx * (stepH + gap);
        const detailLines = st.detail ? wrapSvgText(st.detail, 54, 2) : [];
        return (
          <g key={idx}>
            <rect
              x="24"
              y={y}
              width={width - 48}
              height={stepH}
              rx="14"
              fill={p.surface}
              stroke={idx === 0 || idx === steps.length - 1 ? p.primary : p.border}
              strokeWidth={idx === 0 || idx === steps.length - 1 ? 1.8 : 1.2}
            />
            {/* Step number pill */}
            <circle cx="54" cy={y + stepH / 2} r="15" fill={p.primary} />
            <text
              x="54"
              y={y + stepH / 2 + 5}
              textAnchor="middle"
              fill={p.surface}
              fontSize="13"
              fontWeight="800"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              {idx + 1}
            </text>

            {/* Badge */}
            {st.badge && (
              <g>
                <rect
                  x={width - 142}
                  y={y + 11}
                  width="106"
                  height="21"
                  rx="10.5"
                  fill={p.accentSoft}
                />
                <text
                  x={width - 89}
                  y={y + 25}
                  textAnchor="middle"
                  fill={p.ink}
                  fontSize="10.5"
                  fontWeight="700"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  {st.badge.slice(0, 16)}
                </text>
              </g>
            )}

            <text
              x="82"
              y={y + (detailLines.length ? 28 : 42)}
              fill={p.ink}
              fontSize="14.5"
              fontWeight="800"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              {st.label.slice(0, st.badge ? 34 : 46)}
            </text>

            {detailLines.map((line, lIdx) => (
              <text
                key={lIdx}
                x="82"
                y={y + 47 + lIdx * 15}
                fill={p.muted}
                fontSize="12"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                {line}
              </text>
            ))}

            {idx < steps.length - 1 && (
              <line
                x1={width / 2}
                y1={y + stepH + 2}
                x2={width / 2}
                y2={y + stepH + gap - 4}
                stroke={p.accent}
                strokeWidth="2.4"
                markerEnd="url(#folio-arrow-flow)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function CycleVectorSvg({
  spec,
  p,
}: {
  spec: Extract<VectorDiagramSpec, { type: 'cycle' }>;
  p: Palette;
}) {
  const nodes = spec.nodes.slice(0, 6);
  const cx = 260;
  const cy = 195;
  const rx = 166;
  const ry = 122;
  const count = Math.max(3, nodes.length);

  const coords = nodes.map((_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count;
    return {
      x: cx + Math.cos(angle) * rx,
      y: cy + Math.sin(angle) * ry,
      angle,
    };
  });

  return (
    <svg
      viewBox="0 0 520 390"
      className="w-full h-auto block"
      role="img"
      aria-label={`Esquema cíclico: ${spec.centerLabel}`}
    >
      <defs>
        <marker
          id="folio-arrow-cycle"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto"
        >
          <path d="M 0 1 L 10 5 L 0 9 z" fill={p.accent} />
        </marker>
      </defs>

      {/* Dashed orbital guide */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={rx}
        ry={ry}
        fill="none"
        stroke={p.border}
        strokeWidth="2"
        strokeDasharray="6 6"
      />

      {/* Directional curved arrows between consecutive nodes */}
      {coords.map((pt, i) => {
        const next = coords[(i + 1) % coords.length];
        const midAngle = pt.angle + Math.PI / count;
        const mx = cx + Math.cos(midAngle) * (rx + 18);
        const my = cy + Math.sin(midAngle) * (ry + 18);
        const sx = pt.x + (mx - pt.x) * 0.42;
        const sy = pt.y + (my - pt.y) * 0.42;
        const ex = next.x + (mx - next.x) * 0.42;
        const ey = next.y + (my - next.y) * 0.42;
        return (
          <path
            key={i}
            d={`M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`}
            fill="none"
            stroke={p.accent}
            strokeWidth="2.4"
            markerEnd="url(#folio-arrow-cycle)"
          />
        );
      })}

      {/* Center medallion */}
      <circle cx={cx} cy={cy} r="54" fill={p.primarySoft} stroke={p.primary} strokeWidth="2" />
      {wrapSvgText(spec.centerLabel, 14, 3).map((line, idx, arr) => (
        <text
          key={idx}
          x={cx}
          y={cy + (idx - (arr.length - 1) / 2) * 16 + 4}
          textAnchor="middle"
          fill={p.primary}
          fontSize="13"
          fontWeight="800"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          {line}
        </text>
      ))}

      {/* Cycle Nodes */}
      {nodes.map((node, i) => {
        const pt = coords[i];
        const boxW = 148;
        const boxH = 56;
        const x = Math.max(12, Math.min(520 - boxW - 12, pt.x - boxW / 2));
        const y = Math.max(12, Math.min(390 - boxH - 12, pt.y - boxH / 2));
        const detailLines = node.detail ? wrapSvgText(node.detail, 23, 2) : [];
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={boxW}
              height={boxH}
              rx="12"
              fill={p.surface}
              stroke={p.primary}
              strokeWidth="1.5"
            />
            <text
              x={x + boxW / 2}
              y={y + (detailLines.length ? 21 : 33)}
              textAnchor="middle"
              fill={p.ink}
              fontSize="12.5"
              fontWeight="800"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              {`${i + 1}. ${node.label}`.slice(0, 21)}
            </text>
            {detailLines.map((line, lIdx) => (
              <text
                key={lIdx}
                x={x + boxW / 2}
                y={y + 36 + lIdx * 13}
                textAnchor="middle"
                fill={p.muted}
                fontSize="10.5"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function CompareVectorCard({
  spec,
  p,
}: {
  spec: Extract<VectorDiagramSpec, { type: 'compare' }>;
  p: Palette;
}) {
  const cols = spec.columns.slice(0, 3);
  return (
    <div
      className={`grid gap-3 ${
        cols.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
      }`}
    >
      {cols.map((col, idx) => (
        <div
          key={idx}
          className="rounded-xl p-3.5 border"
          style={{ backgroundColor: p.surface, borderColor: p.border }}
        >
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b" style={{ borderColor: p.border }}>
            <h4 className="text-[13.5px] font-extrabold leading-tight" style={{ color: p.primary }}>
              {col.title}
            </h4>
            {col.badge && (
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                style={{ backgroundColor: p.accentSoft, color: p.ink }}
              >
                {col.badge}
              </span>
            )}
          </div>
          <ul className="space-y-1.5">
            {col.points.slice(0, 4).map((pt, pIdx) => (
              <li key={pIdx} className="text-[12.5px] leading-snug flex items-start gap-2" style={{ color: p.ink }}>
                <span
                  className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: p.accent }}
                />
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TimelineVectorSvg({
  spec,
  p,
}: {
  spec: Extract<VectorDiagramSpec, { type: 'timeline' }>;
  p: Palette;
}) {
  const events = spec.events.slice(0, 6);
  const rowH = 66;
  const height = 24 + events.length * rowH;

  return (
    <svg
      viewBox={`0 0 520 ${height}`}
      className="w-full h-auto block"
      role="img"
      aria-label="Linha cronológica histórica"
    >
      {/* Vertical spine */}
      <line
        x1="118"
        y1="26"
        x2="118"
        y2={height - 26}
        stroke={p.primary}
        strokeWidth="2.5"
        strokeOpacity="0.45"
      />

      {events.map((ev, idx) => {
        const y = 18 + idx * rowH;
        const detailLines = ev.detail ? wrapSvgText(ev.detail, 46, 2) : [];
        return (
          <g key={idx}>
            {/* Date badge */}
            <rect x="14" y={y + 8} width="86" height="28" rx="9" fill={p.primarySoft} />
            <text
              x="57"
              y={y + 26}
              textAnchor="middle"
              fill={p.primary}
              fontSize="11.5"
              fontWeight="800"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              {ev.date.slice(0, 12)}
            </text>

            {/* Spine node */}
            <circle cx="118" cy={y + 22} r="7" fill={p.accent} stroke={p.surface} strokeWidth="2.5" />

            {/* Event card */}
            <rect
              x="140"
              y={y}
              width="364"
              height="54"
              rx="12"
              fill={p.surface}
              stroke={p.border}
              strokeWidth="1.2"
            />
            <text
              x="154"
              y={y + (detailLines.length ? 21 : 31)}
              fill={p.ink}
              fontSize="13.5"
              fontWeight="800"
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              {ev.label.slice(0, 44)}
            </text>
            {detailLines.map((line, lIdx) => (
              <text
                key={lIdx}
                x="154"
                y={y + 37 + lIdx * 13}
                fill={p.muted}
                fontSize="11"
                fontFamily="Plus Jakarta Sans, sans-serif"
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function GeometryTriangleSvg({
  spec,
  p,
}: {
  spec: Extract<VectorDiagramSpec, { type: 'geometry_triangle' }>;
  p: Palette;
}) {
  return (
    <svg
      viewBox="0 0 520 260"
      className="w-full h-auto block"
      role="img"
      aria-label="Esquema geométrico de triângulo retângulo"
    >
      {/* Right triangle */}
      <polygon
        points="90,210 300,210 90,56"
        fill={p.primarySoft}
        stroke={p.primary}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* 90-degree square marker */}
      <polyline
        points="90,186 114,186 114,210"
        fill="none"
        stroke={p.accent}
        strokeWidth="2.4"
      />
      <text
        x="120"
        y="198"
        fill={p.accent}
        fontSize="12"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        90°
      </text>

      {/* Hypotenuse highlight */}
      <line x1="90" y1="56" x2="300" y2="210" stroke={p.accent} strokeWidth="3.2" />

      {/* Labels */}
      <text
        x="68"
        y="138"
        textAnchor="end"
        fill={p.ink}
        fontSize="13.5"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {spec.sideA}
      </text>
      <text
        x="195"
        y="235"
        textAnchor="middle"
        fill={p.ink}
        fontSize="13.5"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {spec.sideB}
      </text>
      <text
        x="212"
        y="118"
        fill={p.accent}
        fontSize="14"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {spec.hypotenuse}
      </text>

      {/* Formula panel */}
      <rect x="332" y="56" width="166" height="126" rx="14" fill={p.surface} stroke={p.border} />
      <text
        x="415"
        y="86"
        textAnchor="middle"
        fill={p.muted}
        fontSize="11"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        RELAÇÃO MÉTRICA
      </text>
      <text
        x="415"
        y="118"
        textAnchor="middle"
        fill={p.primary}
        fontSize="18"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {spec.formula}
      </text>
      {spec.note &&
        wrapSvgText(spec.note, 22, 2).map((line, i) => (
          <text
            key={i}
            x="415"
            y={146 + i * 15}
            textAnchor="middle"
            fill={p.muted}
            fontSize="11"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            {line}
          </text>
        ))}
    </svg>
  );
}

function ParabolaDeltaSvg({
  spec,
  p,
}: {
  spec: Extract<VectorDiagramSpec, { type: 'parabola_delta' }>;
  p: Palette;
}) {
  const panels = [
    { x: 18, cond: spec.cases[0]?.condition || 'Δ > 0', lbl: spec.cases[0]?.label || '2 raízes reais', path: 'M 22 26 Q 74 124 126 26', roots: [47, 101] },
    { x: 184, cond: spec.cases[1]?.condition || 'Δ = 0', lbl: spec.cases[1]?.label || '1 raiz dupla', path: 'M 22 20 Q 74 108 126 20', roots: [74] },
    { x: 350, cond: spec.cases[2]?.condition || 'Δ < 0', lbl: spec.cases[2]?.label || 'Sem raízes reais', path: 'M 22 14 Q 74 74 126 14', roots: [] },
  ];

  return (
    <svg
      viewBox="0 0 520 255"
      className="w-full h-auto block"
      role="img"
      aria-label="Esquema gráfico do discriminante Delta nas equações do 2.º grau"
    >
      <rect x="18" y="10" width="484" height="42" rx="12" fill={p.primarySoft} />
      <text
        x="260"
        y="28"
        textAnchor="middle"
        fill={p.primary}
        fontSize="13.5"
        fontWeight="800"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {spec.equation}
      </text>
      <text
        x="260"
        y="45"
        textAnchor="middle"
        fill={p.ink}
        fontSize="12"
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif"
      >
        {spec.formula}
      </text>

      {panels.map((pan, idx) => (
        <g key={idx} transform={`translate(${pan.x}, 66)`}>
          <rect x="0" y="0" width="152" height="174" rx="14" fill={p.surface} stroke={p.border} />
          {/* X axis */}
          <line x1="14" y1="64" x2="138" y2="64" stroke={p.muted} strokeWidth="1.3" strokeDasharray="3 3" />
          <text x="136" y="59" textAnchor="end" fill={p.muted} fontSize="10" fontWeight="700">
            x
          </text>
          {/* Parabola curve */}
          <path d={pan.path} fill="none" stroke={p.primary} strokeWidth="2.8" strokeLinecap="round" />
          {pan.roots.map((rx, rIdx) => (
            <circle key={rIdx} cx={rx} cy={64} r="5" fill={p.accent} stroke={p.surface} strokeWidth="1.8" />
          ))}
          <rect x="34" y="104" width="84" height="24" rx="8" fill={p.accentSoft} />
          <text
            x="76"
            y="120"
            textAnchor="middle"
            fill={p.ink}
            fontSize="12.5"
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            {pan.cond}
          </text>
          <text
            x="76"
            y="150"
            textAnchor="middle"
            fill={p.muted}
            fontSize="11.5"
            fontWeight="700"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            {pan.lbl}
          </text>
        </g>
      ))}
    </svg>
  );
}

function KinematicsGraphSvg({
  spec,
  p,
}: {
  spec: Extract<VectorDiagramSpec, { type: 'kinematics_graph' }>;
  p: Palette;
}) {
  return (
    <svg
      viewBox="0 0 520 250"
      className="w-full h-auto block"
      role="img"
      aria-label="Gráfico vetorial velocidade-tempo do MRUV"
    >
      <defs>
        <marker id="folio-axis" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 1 L 10 5 L 0 9 z" fill={p.ink} />
        </marker>
      </defs>

      {/* Shaded area Δx under v(t) line */}
      <polygon points="72,202 72,148 268,58 268,202" fill={p.accentSoft} fillOpacity="0.85" />

      {/* Axes */}
      <line x1="72" y1="202" x2="296" y2="202" stroke={p.ink} strokeWidth="2" markerEnd="url(#folio-axis)" />
      <line x1="72" y1="202" x2="72" y2="28" stroke={p.ink} strokeWidth="2" markerEnd="url(#folio-axis)" />

      {/* Velocity line v(t) = v0 + at */}
      <line x1="72" y1="148" x2="268" y2="58" stroke={p.primary} strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="72" cy="148" r="4.5" fill={p.accent} />
      <circle cx="268" cy="58" r="4.5" fill={p.accent} />

      {/* Dashed guides */}
      <line x1="268" y1="58" x2="268" y2="202" stroke={p.muted} strokeDasharray="4 4" />
      <line x1="72" y1="58" x2="268" y2="58" stroke={p.muted} strokeDasharray="4 4" />

      {/* Labels */}
      <text x="58" y="34" textAnchor="end" fill={p.ink} fontSize="12" fontWeight="800">
        {spec.yLabel}
      </text>
      <text x="64" y="152" textAnchor="end" fill={p.muted} fontSize="11.5" fontWeight="700">
        v₀
      </text>
      <text x="64" y="62" textAnchor="end" fill={p.muted} fontSize="11.5" fontWeight="700">
        v
      </text>
      <text x="268" y="220" textAnchor="middle" fill={p.muted} fontSize="11.5" fontWeight="700">
        t
      </text>
      <text x="296" y="220" textAnchor="end" fill={p.ink} fontSize="12" fontWeight="800">
        {spec.xLabel}
      </text>
      <text x="172" y="158" textAnchor="middle" fill={p.ink} fontSize="12.5" fontWeight="800">
        {spec.areaLabel}
      </text>

      {/* Equations Panel */}
      <rect x="316" y="32" width="186" height="176" rx="14" fill={p.surface} stroke={p.border} />
      <text x="409" y="58" textAnchor="middle" fill={p.muted} fontSize="10.5" fontWeight="800">
        EQUAÇÕES DO MRUV
      </text>
      {spec.equations.slice(0, 4).map((eq, idx) => (
        <g key={idx}>
          <rect x="328" y={70 + idx * 32} width="162" height="24" rx="8" fill={p.primarySoft} />
          <text
            x="409"
            y={86 + idx * 32}
            textAnchor="middle"
            fill={p.primary}
            fontSize="12"
            fontWeight="800"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            {eq}
          </text>
        </g>
      ))}
    </svg>
  );
}

function AtomModelSvg({
  spec,
  p,
}: {
  spec: Extract<VectorDiagramSpec, { type: 'atom_model' }>;
  p: Palette;
}) {
  const cx = 155;
  const cy = 128;
  const radii = [56, 92];
  return (
    <svg
      viewBox="0 0 520 256"
      className="w-full h-auto block"
      role="img"
      aria-label="Esquema vetorial da estrutura atómica"
    >
      {radii.map((r, idx) => (
        <circle
          key={idx}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={p.primary}
          strokeWidth="1.6"
          strokeDasharray="5 4"
        />
      ))}

      {/* Nucleus */}
      <circle cx={cx} cy={cy} r="28" fill={p.primary} />
      <text x={cx} y={cy + 4} textAnchor="middle" fill={p.surface} fontSize="11.5" fontWeight="800">
        {spec.nucleusLabel.slice(0, 10)}
      </text>

      {/* Electrons */}
      {[
        { x: cx + 56, y: cy },
        { x: cx - 56, y: cy },
        { x: cx, y: cy - 92 },
        { x: cx + 65, y: cy + 65 },
        { x: cx - 65, y: cy + 65 },
      ].map((e, idx) => (
        <g key={idx}>
          <circle cx={e.x} cy={e.y} r="7" fill={p.accent} />
          <text x={e.x} y={e.y + 3.5} textAnchor="middle" fill={p.ink} fontSize="10" fontWeight="900">
            -
          </text>
        </g>
      ))}

      {/* Legend */}
      <rect x="286" y="34" width="214" height="186" rx="14" fill={p.surface} stroke={p.border} />
      <text x="304" y="60" fill={p.primary} fontSize="12" fontWeight="800">
        ESTRUTURA ATÓMICA
      </text>
      {spec.shells.slice(0, 4).map((sh, idx) => (
        <text key={idx} x="304" y={88 + idx * 28} fill={p.ink} fontSize="12.5" fontWeight="700">
          • {sh.slice(0, 26)}
        </text>
      ))}
      {spec.note &&
        wrapSvgText(spec.note, 28, 2).map((line, i) => (
          <text key={i} x="304" y={182 + i * 15} fill={p.muted} fontSize="11">
            {line}
          </text>
        ))}
    </svg>
  );
}

interface TopicVisualCardProps {
  visual: TopicVisual;
  theme: ReaderTheme;
}

export function TopicVisualCard({ visual, theme }: TopicVisualCardProps) {
  const [zoomOpen, setZoomOpen] = useState(false);
  const p = DIAGRAM_PALETTES[theme];

  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomOpen]);

  if (visual.kind === 'extracted_figure') {
    return (
      <>
        <figure
          className="my-6 rounded-2xl border overflow-hidden"
          style={{ backgroundColor: p.surface, borderColor: p.border }}
        >
          <div
            className="px-4 py-2.5 border-b flex items-center justify-between gap-2"
            style={{ borderColor: p.border, backgroundColor: p.bg }}
          >
            <span className="text-[11px] font-bold uppercase tracking-[0.09em]" style={{ color: p.primary }}>
              {visual.title || `Ilustração · Pág. ${visual.pageNumber}`}
            </span>
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label="Ampliar ilustração"
              className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg cursor-pointer hover:opacity-80"
              style={{ color: p.primary, backgroundColor: p.primarySoft }}
            >
              <Expand className="w-3 h-3" aria-hidden="true" />
              <span>Ampliar</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="w-full block p-3 sm:p-4 cursor-zoom-in text-center"
            style={{ backgroundColor: theme === 'night' ? '#f5efe0' : p.surface }}
          >
            <img
              src={visual.imageDataUrl}
              alt={visual.caption || visual.title}
              loading="lazy"
              className="max-h-[340px] w-auto mx-auto rounded-lg object-contain"
            />
          </button>

          {visual.caption && (
            <figcaption
              className="px-4 py-2.5 border-t font-sans text-[12.5px] leading-snug italic"
              style={{ borderColor: p.border, color: p.muted }}
            >
              {visual.caption}
            </figcaption>
          )}
        </figure>

        {/* Fullscreen Lightbox Modal for Mobile Pinch/Zoom Inspection */}
        {zoomOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={visual.title}
            onClick={() => setZoomOpen(false)}
            className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          >
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              aria-label="Fechar ampliação"
              className="fixed top-4 right-4 w-11 h-11 rounded-full bg-ivory text-ink flex items-center justify-center shadow-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-3xl w-full max-h-[85dvh] overflow-auto rounded-2xl bg-[#fcf8ee] p-3 sm:p-4 shadow-2xl"
            >
              <img
                src={visual.imageDataUrl}
                alt={visual.caption || visual.title}
                className="w-full h-auto rounded-lg"
              />
              {visual.caption && (
                <p className="mt-3 text-[13px] text-[#3c4f44] text-center font-sans">
                  {visual.caption}
                </p>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  const d = visual.diagram;

  return (
    <figure
      className="my-6 rounded-2xl border overflow-hidden font-sans"
      style={{ backgroundColor: p.bg, borderColor: p.border }}
    >
      <div
        className="px-4 py-3 border-b flex items-center justify-between gap-2"
        style={{ borderColor: p.border, backgroundColor: p.surface }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 shrink-0" style={{ color: p.accent }} aria-hidden="true" />
          <span className="text-[12px] font-extrabold tracking-[0.02em] truncate" style={{ color: p.ink }}>
            {visual.title}
          </span>
        </div>
        <span
          className="text-[10.5px] font-bold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full shrink-0"
          style={{ backgroundColor: p.primarySoft, color: p.primary }}
        >
          Esquema
        </span>
      </div>

      <div className="p-3 sm:p-4">
        {d.type === 'flow' && <FlowVectorSvg spec={d} p={p} />}
        {d.type === 'cycle' && <CycleVectorSvg spec={d} p={p} />}
        {d.type === 'compare' && <CompareVectorCard spec={d} p={p} />}
        {d.type === 'timeline' && <TimelineVectorSvg spec={d} p={p} />}
        {d.type === 'geometry_triangle' && <GeometryTriangleSvg spec={d} p={p} />}
        {d.type === 'parabola_delta' && <ParabolaDeltaSvg spec={d} p={p} />}
        {d.type === 'kinematics_graph' && <KinematicsGraphSvg spec={d} p={p} />}
        {d.type === 'atom_model' && <AtomModelSvg spec={d} p={p} />}
      </div>

      {visual.caption && (
        <figcaption
          className="px-4 py-2.5 border-t text-[12px] leading-snug"
          style={{ borderColor: p.border, color: p.muted, backgroundColor: p.surface }}
        >
          {visual.caption}
        </figcaption>
      )}
    </figure>
  );
}
