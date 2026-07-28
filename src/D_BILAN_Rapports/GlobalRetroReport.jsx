import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ScatterController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ScatterController, Title, Tooltip, Legend);

// Map node label → truthy = has a retro report available
const RETRO_REPORT_MAP = {
  'RK+SCC':       true,
  STACK:          true,
  BHF:            true,
  COOLINGTOWER:   true,
  CYCLONE:        true,
  DENOX:          true,
  ELECTROFILTER:  true,
  FB:             true,
  GF:             true,
  IDFAN:          true,
  QUENCH:         true,
  SCRUBBER:       true,
  REACTOR:        true,
  WHB:            true,
  AIRINJECTION:   true,
  IACT:           true,
  HX_TubeAndShell:true,
  WATER_INJECTION:true,
};


const EQUIPMENT_ORDER = [
  'RK+SCC', 'GF', 'FB', 'WHB', 'IACT', 'HX_TubeAndShell',
  'QUENCH', 'WATER_INJECTION', 'DENOX', 'BHF', 'AIRINJECTION',
  'REACTOR', 'SCRUBBER', 'ELECTROFILTER', 'CYCLONE',
  'COOLINGTOWER', 'IDFAN', 'STACK',
];

// ─── Line color palette (cover page + line separators) ───────────────────────
const LINE_COLORS = [
  { bg: 'rgba(74,144,226,0.15)', border: '#4a90e2', title: '#a0cfff', sep: 'linear-gradient(90deg, #1a3a6b 0%, #2c5aa0 100%)' },
  { bg: 'rgba(231,76,60,0.15)',  border: '#e74c3c', title: '#ffb3aa', sep: 'linear-gradient(90deg, #6b1a1a 0%, #a02c2c 100%)' },
  { bg: 'rgba(46,204,113,0.15)', border: '#2ecc71', title: '#a0ffc8', sep: 'linear-gradient(90deg, #1a6b3a 0%, #2ca05a 100%)' },
  { bg: 'rgba(243,156,18,0.15)', border: '#f39c12', title: '#ffe0a0', sep: 'linear-gradient(90deg, #6b4e1a 0%, #a07a2c 100%)' },
  { bg: 'rgba(155,89,182,0.15)', border: '#9b59b6', title: '#d5a0ff', sep: 'linear-gradient(90deg, #3d1a6b 0%, #6b2ca0 100%)' },
];

// ─── Combustion Diagram Section ───────────────────────────────────────────────

const loadPt = (key, def) => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : def;
  } catch { return def; }
};

// Collecte tous les points E écrits par les fours (clés pointE_<nodeId>, cf. FB/RK/GF_Parameter_Tab),
// avec fallback sur l'ancienne clé unique 'pointE' (anciens projets). Même logique que LinearGraph.
const loadPointsE = () => {
  const points = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('pointE_')) {
      try {
        const pt = JSON.parse(localStorage.getItem(key));
        if (pt && pt.x != null && pt.y != null) points.push(pt);
      } catch { /* ignore */ }
    }
  }
  if (points.length === 0) {
    const legacy = loadPt('pointE', null);
    if (legacy && legacy.x != null && legacy.y != null) points.push(legacy);
  }
  return points;
};

const CombustionDiagramSection = ({ tr }) => {
  const pA = loadPt('pointA', { x: 100, y: 2 });
  const pB = loadPt('pointB', { x: 150, y: 10 });
  const pC = loadPt('pointC', { x: 800, y: 10 });
  const pD = loadPt('pointD', { x: 300, y: 2 });
  const pointsE = loadPointsE();

  const isBelow = pA.y < pB.y * 0.4 || pD.y < pC.y * 0.4;

  const chartData = {
    datasets: [
      {
        type: 'line',
        label: tr("domaineOperatoire"),
        data: [pA, pB, pC, pD, pA],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.15)',
        borderWidth: 2,
        fill: true,
        tension: 0,
        pointBackgroundColor: ['red', 'blue', 'green', 'purple', 'red'],
        pointRadius: 6,
      },
      {
        type: 'scatter',
        label: tr("pointERetro"),
        data: pointsE,
        backgroundColor: 'orange',
        pointRadius: 9,
        pointHoverRadius: 11,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: tr("diagCombDomaine"),
        font: { size: 15 },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const lbl = ctx.dataset.label;
            const x = ctx.parsed.x;
            const y = ctx.parsed.y;
            if (lbl?.includes('Point E')) return `E : ${x} kg/h — ${y} MW`;
            const names = ['A', 'B', 'C', 'D', 'A'];
            return `${names[ctx.dataIndex]} : ${x} kg/h — ${y} MW`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        position: 'bottom',
        min: 0,
        title: {
          display: true,
          text: tr("debitDechetsKgh"),
          font: { size: 13, weight: 'bold' },
        },
        grid: { color: 'rgba(0,0,0,0.07)' },
      },
      y: {
        min: 0,
        title: {
          display: true,
          text: tr("puissanceIncinerateurMW"),
          font: { size: 13, weight: 'bold' },
        },
        grid: { color: 'rgba(0,0,0,0.07)' },
      },
    },
  };

  const pointRows = [
    { pt: 'A', role: 'Débit min — Puissance min', color: 'red',    d: pA },
    { pt: 'B', role: 'Débit min — Puissance max', color: 'blue',   d: pB },
    { pt: 'C', role: 'Débit max — Puissance max', color: 'green',  d: pC },
    { pt: 'D', role: 'Débit max — Puissance min', color: 'purple', d: pD },
    ...pointsE.map((pt, i) => ({
      pt: pointsE.length > 1 ? `E${i + 1}` : 'E',
      role: `Point de calcul rétro — ${pt.lineName || (pt.label ? `${pt.label}${pt.nodeId ? ` (${pt.nodeId})` : ''}` : '')}`,
      color: 'orange',
      d: pt,
    })),
  ];

  return (
    <div style={diagStyles.wrapper}>
      <div style={diagStyles.header}>
        <span style={diagStyles.headerIcon}>🔥</span>
        <span style={diagStyles.headerTitle}>{tr("diagCombPosition")}</span>
      </div>
      <div style={diagStyles.body}>
        {isBelow && (
          <div style={diagStyles.warning}>
            ⚠ Puissance minimale inférieure à 40 % de la puissance maximale — vérifier le domaine opératoire.
          </div>
        )}

        <table style={diagStyles.table}>
          <thead>
            <tr>
              <th style={{ ...diagStyles.th, width: 50 }}>{tr("pointWord")}</th>
              <th style={{ ...diagStyles.th, textAlign: 'left' }}>{tr("roleWord")}</th>
              <th style={diagStyles.th}>{tr("debitKgh")}</th>
              <th style={diagStyles.th}>{tr("puissanceMW")}</th>
            </tr>
          </thead>
          <tbody>
            {pointRows.map(({ pt, role, color, d }) => (
              <tr key={pt} style={{ background: pt.startsWith('E') ? '#fff8e8' : '#fff' }}>
                <td style={{ ...diagStyles.td, color, fontWeight: 'bold', textAlign: 'center' }}>{pt}</td>
                <td style={{ ...diagStyles.td, textAlign: 'left' }}>{role}</td>
                <td style={diagStyles.td}>{d.x}</td>
                <td style={diagStyles.td}>{d.y}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ height: 420, marginTop: 20 }}>
          <Line options={chartOptions} data={chartData} />
        </div>
      </div>
    </div>
  );
};

const diagStyles = {
  wrapper: { background: '#fff' },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'linear-gradient(90deg, #7b2d2d 0%, #c0392b 100%)',
    color: '#fff', padding: '14px 20px',
  },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },
  body: { border: '1px solid #f0d5d5', borderTop: 'none', padding: '20px' },
  warning: {
    background: '#ffdddd', color: '#a94442', border: '1px solid #ebccd1',
    borderRadius: 4, padding: '10px 14px', marginBottom: 16,
    fontWeight: 'bold', fontSize: 13,
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 4 },
  th: {
    background: '#fdf0f0', padding: '8px 12px',
    border: '1px solid #e8cece', textAlign: 'right',
    fontWeight: 'bold', fontSize: 12,
  },
  td: { padding: '7px 12px', border: '1px solid #f0e0e0', textAlign: 'right' },
};

// ─────────────────────────────────────────────────────────────────────────────

// ── Utility: group nodes into process lines (connected components) ────────────
// Returns an array of lines, each line being an array of nodes in topological
// order following edges (source → target = Bilan direction, furnace → STACK).
const buildProcessLines = (allNodes, edges) => {
  const edgeList = edges || [];
  const allIds = new Set(allNodes.map(n => n.id));

  // 1. Union-Find to discover connected components (uses ALL nodes, not just reportable)
  const parent = {};
  const find = (x) => { if (parent[x] !== x) parent[x] = find(parent[x]); return parent[x]; };
  const union = (a, b) => { parent[find(a)] = find(b); };

  for (const n of allNodes) parent[n.id] = n.id;
  for (const e of edgeList) {
    if (allIds.has(e.source) && allIds.has(e.target)) union(e.source, e.target);
  }

  // 2. Topological sort (Kahn) per component — gives Bilan direction (furnace → STACK)
  const adj = {};      // adjacency list
  const inDeg = {};    // in-degree
  for (const n of allNodes) { adj[n.id] = []; inDeg[n.id] = 0; }
  for (const e of edgeList) {
    if (allIds.has(e.source) && allIds.has(e.target)) {
      adj[e.source].push(e.target);
      inDeg[e.target] = (inDeg[e.target] || 0) + 1;
    }
  }

  const topoOrder = [];
  const queue = allNodes.filter(n => inDeg[n.id] === 0).map(n => n.id);
  while (queue.length) {
    const id = queue.shift();
    topoOrder.push(id);
    for (const next of adj[id]) {
      inDeg[next]--;
      if (inDeg[next] === 0) queue.push(next);
    }
  }
  // Nodes not reached (cycles) — append at end
  for (const n of allNodes) {
    if (!topoOrder.includes(n.id)) topoOrder.push(n.id);
  }

  const topoRank = {};
  topoOrder.forEach((id, i) => { topoRank[id] = i; });

  // 3. Group reportable-active nodes by component, sorted by topo rank
  const reportable = allNodes.filter(n => n.data?.isActive && RETRO_REPORT_MAP[n.data?.label]);
  const groups = {};
  for (const n of reportable) {
    const root = find(n.id);
    if (!groups[root]) groups[root] = [];
    groups[root].push(n);
  }

  for (const root in groups) {
    groups[root].sort((a, b) => (topoRank[a.id] || 0) - (topoRank[b.id] || 0));
  }

  // 4. Sort lines themselves: first equipment's topo rank
  const lines = Object.values(groups).sort((a, b) =>
    (topoRank[a[0]?.id] || 0) - (topoRank[b[0]?.id] || 0)
  );

  return lines;
};

// ─── Bilan air parasite par ligne ─────────────────────────────────────────────
const AIR_COLUMNS = [
  { labelKey: 'airNet', keys: ['Qv_air_injecté_net_Nm3_h'] },
  { labelKey: 'airParasite', keys: ['Qv_air_parasite_Nm3_h'] },
  { labelKey: 'airIn', keys: ['Qv_air_entrant_Nm3_h', 'Qv_air_entrant_tot_Nm3_h'] },
  { labelKey: 'airDecolm', keys: ['Qv_air_decolmatage_Nm3_h'] },
];

const extractAirValue = (node, keys) => {
  const result = node.data?.result;
  if (!result || typeof result !== 'object') return null;
  for (const k of keys) {
    for (const sub of Object.values(result)) {
      if (sub && typeof sub === 'object' && typeof sub[k] === 'number' && !Number.isNaN(sub[k])) return sub[k];
    }
    if (typeof result[k] === 'number' && !Number.isNaN(result[k])) return result[k];
  }
  return null;
};

const airCell = { padding: '6px 10px', border: '1px solid #c5d5ea', fontSize: 12 };
const airNumCell = { ...airCell, textAlign: 'right' };
const airThCell = { ...airCell, background: '#eaf0fb', color: '#1a3a6b', fontWeight: 'bold' };

const AirParasiteLineTable = ({ line, t }) => {
  const rows = line
    .map(n => ({ id: n.id, name: n.data?.label, values: AIR_COLUMNS.map(col => extractAirValue(n, col.keys)) }))
    .filter(r => r.values.some(v => v !== null && v !== undefined));
  if (rows.length === 0) {
    return <div style={{ padding: '8px 0', color: '#888', fontStyle: 'italic', fontSize: 12 }}>{t.noData}</div>;
  }
  const totals = AIR_COLUMNS.map((_, c) => rows.reduce((s, r) => s + (r.values[c] || 0), 0));
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
      <thead>
        <tr>
          <th style={{ ...airThCell, textAlign: 'left' }}>{t.equipment}</th>
          {AIR_COLUMNS.map(col => (
            <th key={col.labelKey} style={{ ...airThCell, textAlign: 'right' }}>{t[col.labelKey]} [Nm³/h]</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td style={airCell}>{r.name} ({r.id})</td>
            {r.values.map((v, c) => (
              <td key={c} style={airNumCell}>{v !== null && v !== undefined ? fmt(v, 0) : '-'}</td>
            ))}
          </tr>
        ))}
        <tr style={{ fontWeight: 'bold', background: '#eaf0fb' }}>
          <td style={airCell}>{t.total}</td>
          {totals.map((tot, c) => (
            <td key={c} style={airNumCell}>{fmt(tot, 0)}</td>
          ))}
        </tr>
      </tbody>
    </table>
  );
};

const AirParasiteSection = ({ lines, currentLanguage }) => {
  const t = getAirParasiteT(getLanguageCode(currentLanguage));
  const hasAny = lines.some(line => line.some(n => AIR_COLUMNS.some(c => extractAirValue(n, c.keys) !== null)));
  if (!hasAny) return null;
  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 'bold', color: '#1a3a6b', borderBottom: '2px solid #4a90e2', paddingBottom: 6, marginBottom: 14 }}>
        {t.titleReport}
      </h2>
      {lines.map((line, i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          {lines.length > 1 && (
            <h3 style={{ fontSize: 13, fontWeight: 'bold', color: LINE_COLORS[i % LINE_COLORS.length].title, margin: '0 0 6px 0' }}>
              {line[0]?.data?.lineName || `${t.line} ${i + 1}`}
            </h3>
          )}
          <AirParasiteLineTable line={line} t={t} />
        </div>
      ))}
    </div>
  );
};

const GlobalRetroReport = ({ nodes, edges, onClose, currentLanguage }) => {
  const reportRef = useRef();
  const [generating, setGenerating] = useState(false);
  const tr = makeReportT(currentLanguage);
  const locale = getLanguageCode(currentLanguage);

  const lines = buildProcessLines(nodes, edges);
  const activeNodes = lines.flat();

  const generatePDF = async () => {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = pdf.internal.pageSize.getWidth();   // 210 mm
      const PH = pdf.internal.pageSize.getHeight();  // 297 mm

      const sections = Array.from(
        reportRef.current.querySelectorAll('[data-pdf-section]')
      );

      for (let i = 0; i < sections.length; i++) {
        if (i > 0) pdf.addPage();

        // ── Cover page: force exact A4 height so it fills the page ───────────
        if (i === 0) {
          const sectionW   = sections[0].offsetWidth;
          const a4PxHeight = Math.round(sectionW * PH / PW);
          const savedH     = sections[0].style.height;
          sections[0].style.height = `${a4PxHeight}px`;

          const canvas = await html2canvas(sections[0], {
            scale: 2, useCORS: true, logging: false,
            backgroundColor: '#1a3a6b',
          });
          sections[0].style.height = savedH;

          pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, PW, PH);
          continue;
        }

        // ── Other sections: sliding window ────────────────────────────────────
        const canvas = await html2canvas(sections[i], {
          scale: 2, useCORS: true, logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData   = canvas.toDataURL('image/jpeg', 0.85);
        const imgHeight = (canvas.height * PW) / canvas.width;

        let position   = 0;
        let heightLeft = imgHeight;

        pdf.addImage(imgData, 'JPEG', 0, position, PW, imgHeight);
        heightLeft -= PH;

        while (heightLeft > 0) {
          position -= PH;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, PW, imgHeight);
          heightLeft -= PH;
        }
      }

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`rapport_retro_global_${date}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* ── En-tête ─────────────────────────────────────────────────────── */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>
            {tr('headerRetroGlobal')}
          </h2>
          <div style={styles.headerActions}>
            <span style={styles.nodeCount}>
              {activeNodes.length} {activeNodes.length !== 1 ? tr('activeEquipMany') : tr('activeEquipOne')}
            </span>
            <button
              onClick={generatePDF}
              disabled={generating || activeNodes.length === 0}
              style={{
                ...styles.btn, ...styles.btnPdf,
                ...(generating || activeNodes.length === 0 ? styles.btnDisabled : {}),
              }}
            >
              {generating ? tr('generating') : tr('downloadPdf')}
            </button>
            <button onClick={onClose} style={{ ...styles.btn, ...styles.btnClose }}>
              {tr('close')}
            </button>
          </div>
        </div>

        {/* ── Zone scrollable ──────────────────────────────────────────────── */}
        <div style={styles.scrollArea}>
          {activeNodes.length === 0 ? (
            <div style={styles.empty}>
              <p>{tr('emptyRetro')}</p>
            </div>
          ) : (
            <div ref={reportRef} style={styles.reportContent}>

              {/* Page de couverture */}
              <div data-pdf-section style={styles.coverPage}>
                <div style={styles.coverLogo}>⚙</div>
                <h1 style={styles.coverTitle}>{tr('coverTitleRetro')}</h1>
                <p style={styles.coverDate}>
                  {tr('generatedOn')} {new Date().toLocaleDateString(locale, {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
                <div style={styles.coverEquipList}>
                  {lines.map((line, li) => (
                    <div key={li} style={{
                      marginBottom: li < lines.length - 1 ? 16 : 0,
                      background: lines.length > 1 ? LINE_COLORS[li % LINE_COLORS.length].bg : 'rgba(255,255,255,0.1)',
                      borderLeft: lines.length > 1 ? `4px solid ${LINE_COLORS[li % LINE_COLORS.length].border}` : 'none',
                      borderRadius: 6,
                      padding: '12px 16px',
                    }}>
                      <h3 style={{
                        ...styles.coverEquipTitle,
                        color: lines.length > 1 ? LINE_COLORS[li % LINE_COLORS.length].title : '#e0ecff',
                      }}>
                        {lines.length > 1 ? (line[0]?.data?.lineName || `${tr('line')} ${li + 1}`) : tr('equipmentsIncluded')}
                      </h3>
                      {line.map(n => (
                        <div key={n.id} style={styles.coverEquipItem}>
                          ▸ {n.data.label}{n.data.title ? ` — ${n.data.title}` : ''}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Une section par ligne de process */}
              {lines.map((line, lineIdx) => (
                <div key={lineIdx}>
                  {/* Séparateur de ligne (affiché seulement si > 1 ligne) */}
                  {lines.length > 1 && (() => {
                    const lc = LINE_COLORS[lineIdx % LINE_COLORS.length];
                    return (
                      <div data-pdf-section style={{ ...styles.lineSeparator, background: lc.sep, borderLeft: `5px solid ${lc.border}` }}>
                        <span style={{ ...styles.lineLabel, color: lc.title }}>{line[0]?.data?.lineName || `${tr('line')} ${lineIdx + 1}`}</span>
                        <span style={styles.lineDesc}>
                          {line.map(n => n.data.label).join(' → ')}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Équipements de la ligne */}
                  {line.map((node, idx) => {
                    const globalIdx = lines.slice(0, lineIdx).reduce((s, l) => s + l.length, 0) + idx;
                    const hasResult = !!node.data.result;
                    const lineColor = lines.length > 1 ? LINE_COLORS[lineIdx % LINE_COLORS.length].border : undefined;

                    return (
                      <div key={node.id} data-pdf-section style={{
                        ...styles.equipSection,
                        ...(lineColor ? { borderLeft: `4px solid ${lineColor}` } : {}),
                      }}>
                        <div style={styles.equipSeparator}>
                          <span style={{
                            ...styles.equipIndex,
                            ...(lineColor ? { background: lineColor } : {}),
                          }}>{globalIdx + 1}</span>
                          <span style={styles.equipLabel}>{node.data.label}</span>
                          {node.data.title && (
                            <span style={styles.equipTitle}> — {node.data.title}</span>
                          )}
                        </div>

                        {hasResult ? (
                          <ReportBody node={node} tr={tr} currentLanguage={currentLanguage} />
                        ) : (
                          <div style={styles.noData}>
                            {tr('noResult')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Diagramme de combustion — toujours en dernier */}
              <div data-pdf-section style={styles.diagSection}>
                <CombustionDiagramSection tr={tr} />
              </div>

              {/* Bilan air parasite par ligne — après le diagramme de combustion */}
              <div data-pdf-section style={styles.diagSection}>
                <AirParasiteSection lines={lines} currentLanguage={currentLanguage} />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Renders only the inner report content (no modal overlay) ──────────────────
const ReportBody = ({ node, tr }) => {
  const label = node.data.label;
  const result    = node.data.result    || {};
  const inputData = node.data.inputData || {};

  if (label === 'RK+SCC') {
    return (
      <RKReportBody
        calculationResult={result}
        inputParams={inputData}
        tr={tr}
      />
    );
  }
  if (label === 'STACK')        return <STACKReportBody        calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'BHF')          return <BHFReportBody          calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'COOLINGTOWER') return <COOLINGTOWERReportBody calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'CYCLONE')      return <CYCLONEReportBody      calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'DENOX')        return <DENOXReportBody        calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'ELECTROFILTER')return <ELECTROFILTERReportBody calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'FB')           return <FBReportBody           calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'GF')           return <GFReportBody           calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'IDFAN')        return <IDFANReportBody        calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'QUENCH')       return <QUENCHReportBody       calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'SCRUBBER')     return <SCRUBBERReportBody     calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'REACTOR')        return <REACTORReportBody        calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'WHB')            return <WHBReportBody            calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'AIRINJECTION')   return <AIRINJECTIONReportBody   calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'IACT')           return <IACTReportBody           calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'HX_TubeAndShell')return <TUBEANDSHELLReportBody  calculationResult={result} inputParams={inputData} tr={tr} />;
  if (label === 'WATER_INJECTION')return <WATER_INJECTIONReportBody calculationResult={result} inputParams={inputData} tr={tr} />;
  return null;
};

// ── Inline body for RK (copy of RK_Retro_Rapport content without modal) ───────
import { fmt } from '../A_Transverse_fonction/formatNumber';
import { getLanguageCode } from '../F_Gestion_Langues/Fonction_Traduction';
import { getAirParasiteT } from '../C_Components/airParasite_traduction';
import { makeReportT } from './report_traduction';

const Section = ({ title, children }) => (
  <div style={bodyStyles.section}>
    <h2 style={bodyStyles.sectionTitle}>{title}</h2>
    {children}
  </div>
);
const Sub = ({ title, children }) => (
  <div style={bodyStyles.subSection}>
    {title && <h3 style={bodyStyles.subTitle}>{title}</h3>}
    {children}
  </div>
);
const KV = ({ label, value, unit = '' }) => (
  <div style={bodyStyles.kvRow}>
    <span style={bodyStyles.kvLabel}>{label}</span>
    <span style={bodyStyles.kvValue}>
      {value}{unit ? <span style={bodyStyles.kvUnit}> {unit}</span> : null}
    </span>
  </div>
);

const GasTableRK = ({ df, tr }) => {
  const rows = [
    { name: 'CO₂', nm3h: df.Qv_CO2_Nm3_h, kgh: df.Qm_CO2_kg_h, pW: df.CO2_humide_pourcent, pD: df.CO2_dry_pourcent },
    { name: 'H₂O', nm3h: df.Qv_H2O_Nm3_h, kgh: df.Qm_H2O_kg_h, pW: df.H2O_pourcent,        pD: undefined },
    { name: 'O₂',  nm3h: df.Qv_O2_Nm3_h,  kgh: df.Qm_O2_kg_h,  pW: df.O2_humide_pourcent,  pD: df.O2_dry_pourcent },
    { name: 'N₂',  nm3h: df.Qv_N2_Nm3_h,  kgh: df.Qm_N2_kg_h,  pW: df.N2_humide_pourcent,  pD: undefined },
  ];
  const t = tr || ((k) => k);
  return (
    <table style={bodyStyles.table}>
      <thead>
        <tr>
          {[t('component'),'Nm³/h','kg/h',t('pctWet'),t('pctDry')].map(h =>
            <th key={h} style={bodyStyles.th}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.name}>
            <td style={bodyStyles.tdLabel}>{r.name}</td>
            <td style={bodyStyles.td}>{fmt(r.nm3h, 0)}</td>
            <td style={bodyStyles.td}>{fmt(r.kgh, 0)}</td>
            <td style={bodyStyles.td}>{r.pW !== undefined ? fmt(r.pW, 2) : '—'}</td>
            <td style={bodyStyles.td}>{r.pD !== undefined ? fmt(r.pD, 2) : '—'}</td>
          </tr>
        ))}
        <tr style={{ fontWeight: 'bold', background: '#eaf0fb' }}>
          <td style={bodyStyles.tdLabel}>{t('total')}</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.nm3h)||0),0),0)}</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.kgh)||0),0),0)}</td>
          <td style={bodyStyles.td}>—</td><td style={bodyStyles.td}>—</td>
        </tr>
      </tbody>
    </table>
  );
};

const RKReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const p  = inputParams || {};
  const isWithWHB = p.bilanType_whb === 'WITH_WHB';
  const isNCV     = p.bilanType_NCV_Masse === 'NET_CALORIFIC_VALUE';
  const NCV_kJ_kg = (parseFloat(r.NCV) || 0) * 4.1868;

  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr('rkRetroTitle')}</h1>
      <Section title={`1. ${tr('secInputParams')}`}>
        <div style={bodyStyles.twoCol}>
          <Sub title={tr('conditions')}>
            <KV label={tr('mode')}          value={isWithWHB ? tr('withWHB') : tr('withoutWHB')} />
            <KV label={tr('balanceType')}    value={isNCV ? tr('ncvToFlow') : tr('flowToNcv')} />
            <KV label={tr('airTemp')} value={fmt(p.Tair_RK_C, 1)} unit="°C" />
            <KV label={tr('thermalLosses')} value={fmt(p.Thermal_losses_MW, 2)} unit="MW" />
          </Sub>
          <Sub title={tr('combustionData')}>
            {isNCV
              ? <KV label={tr('pciGiven')}     value={fmt(p.NCV_kcal_kg, 0)} unit="kcal/kg" />
              : <KV label={tr('flowGiven')}   value={fmt(p.Masse_dechet_kg_h, 0)} unit="kg/h" />}
          </Sub>
        </div>
      </Section>
      <Section title={`2. ${tr('secFlueGas')}`}>
        <div style={bodyStyles.twoCol}>
          <Sub title={tr('flows')}>
            <KV label={tr('wet')}  value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label={tr('dry')}     value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label={tr('real')}    value={fmt(r.Qv_wet_m3_h, 0)}   unit="m³/h"  />
          </Sub>
          <Sub title={tr('enthalpy')}>
            <KV label={tr('hOut')} value={fmt(df.H_tot_kW, 0)} unit="kW" />
            {!isWithWHB && <KV label={tr('hAirIn')} value={fmt(r.H_air_kW, 0)} unit="kW" />}
          </Sub>
        </div>
        <Sub title={tr('composition')}>
          <GasTableRK df={df} tr={tr} />
        </Sub>
      </Section>
      <Section title={`3. ${tr('secRetroResults')}`}>
        <div style={bodyStyles.twoCol}>
          <Sub title={tr('energy')}>
            <KV label={tr('incineratorPower')} value={fmt(r.P_incinerateur_MWH, 3)} unit="MW" />
          </Sub>
          <Sub title={tr('waste')}>
            <KV label={tr('wasteFlow')} value={fmt(r.MasseDechet, 0)}  unit="kg/h"    />
            <KV label={tr('pci')}           value={fmt(r.NCV, 0)}           unit="kcal/kg" />
            <KV label={tr('pci')}           value={fmt(NCV_kJ_kg, 0)}       unit="kJ/kg"   />
          </Sub>
        </div>
      </Section>
    </div>
  );
};

const GasTableSTACK = ({ df, tr }) => {
  const t = tr || ((k) => k);
  const rows = [
    { name:'CO₂', nm3h:df.Qv_CO2_Nm3_h, kgh:df.Qm_CO2_kg_h, hkj:df.H_CO2_kj, pW:df.CO2_humide_pourcent, pD:df.CO2_dry_pourcent },
    { name:'H₂O', nm3h:df.Qv_H2O_Nm3_h, kgh:df.Qm_H2O_kg_h, hkj:df.H_H2O_kj, pW:df.H2O_pourcent,        pD:undefined },
    { name:'O₂',  nm3h:df.Qv_O2_Nm3_h,  kgh:df.Qm_O2_kg_h,  hkj:df.H_O2_kj,  pW:df.O2_humide_pourcent,  pD:df.O2_dry_pourcent },
    { name:'N₂',  nm3h:df.Qv_N2_Nm3_h,  kgh:df.Qm_N2_kg_h,  hkj:df.H_N2_kj,  pW:df.N2_humide_pourcent,  pD:undefined },
  ];
  return (
    <table style={bodyStyles.table}>
      <thead>
        <tr>
          {['Composant','Nm³/h','kg/h','Enthalpie [kJ/h]','% humide','% sec'].map(h =>
            <th key={h} style={bodyStyles.th}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.name}>
            <td style={bodyStyles.tdLabel}>{r.name}</td>
            <td style={bodyStyles.td}>{fmt(r.nm3h, 0)}</td>
            <td style={bodyStyles.td}>{fmt(r.kgh, 0)}</td>
            <td style={bodyStyles.td}>{fmt(r.hkj, 0)}</td>
            <td style={bodyStyles.td}>{r.pW !== undefined ? fmt(r.pW, 2) : '—'}</td>
            <td style={bodyStyles.td}>{r.pD !== undefined ? fmt(r.pD, 2) : '—'}</td>
          </tr>
        ))}
        <tr style={{ fontWeight:'bold', background:'#eaf0fb' }}>
          <td style={bodyStyles.tdLabel}>{t("total")}</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.nm3h)||0),0),0)}</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.kgh)||0),0),0)}</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.hkj)||0),0),0)}</td>
          <td style={bodyStyles.td}>—</td><td style={bodyStyles.td}>—</td>
        </tr>
      </tbody>
    </table>
  );
};

const STACKReportBody = ({ calculationResult, inputParams, tr }) => {
  const df = calculationResult?.dataFlow || {};
  const p  = inputParams || {};

  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleSTACK")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="T fumées"     value={fmt(p.Tstack, 1)}          unit="°C"   />
            <KV label="Débit humide" value={fmt(p.Qv_wet_Nm3_h, 0)}    unit="Nm³/h"/>
            <KV label="Pression"     value={fmt(p.P_out_mmCE, 0)}       unit="mmCE" />
          </Sub>
          <Sub title="Composition saisie">
            <KV label="O₂ sec"  value={fmt(p.O2_dry_pourcent, 2)}  unit="%" />
            <KV label="H₂O"     value={fmt(p.H2O_pourcent, 2)}     unit="%" />
            <KV label="CO₂ sec" value={fmt(p.CO2_dry_pourcent, 2)} unit="%" />
          </Sub>
        </div>
      </Section>
      <Section title="2. Composition calculée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Humide"       value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Sec"          value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Réel"         value={fmt(df.Qv_wet_m3_h, 0)}  unit="m³/h"  />
            <KV label="Massique tot" value={fmt(df.Qm_tot_kg_h, 0)}  unit="kg/h"  />
          </Sub>
          <Sub title="% humide calculé">
            <KV label="CO₂" value={fmt(df.CO2_humide_pourcent, 2)} unit="%" />
            <KV label="H₂O" value={fmt(df.H2O_pourcent, 2)}        unit="%" />
            <KV label="O₂"  value={fmt(df.O2_humide_pourcent, 2)}  unit="%" />
            <KV label="N₂"  value={fmt(df.N2_humide_pourcent, 2)}  unit="%" />
          </Sub>
        </div>
        <Sub title="Détail composants">
          <GasTableSTACK df={df} tr={tr} />
        </Sub>
      </Section>
      <Section title="3. Bilan enthalpique">
        <div style={bodyStyles.twoCol}>
          <Sub>
            <KV label="H totale" value={fmt(df.H_tot_kW, 1)} unit="kW" />
            <KV label="H totale" value={fmt((parseFloat(df.H_tot_kW)||0)/1000, 3)} unit="MW" />
          </Sub>
        </div>
      </Section>
    </div>
  );
};

// ── BHF ───────────────────────────────────────────────────────────────────────
const BHFReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataBHF || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleBHF")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions amont">
            <KV label="T fumées amont"     value={fmt(p.T_amont_BHF, 1)}         unit="°C"   />
            <KV label="T air décolmatage"  value={fmt(p.T_air_decolmatation, 1)}  unit="°C"   />
            <KV label="Q air décolmatage"  value={fmt(p.Qair_decolmatation, 0)}   unit="m³/h" />
            <KV label="PDC aérodynamique"  value={fmt(p.PDC_aero, 0)}             unit="mmCE" />
          </Sub>
          <Sub title="Gaz entrant">
            <KV label="Débit humide amont" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec amont"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Température amont"  value={fmt(df.T, 1)}            unit="°C"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Air de décolmatage">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Q air entrant"  value={fmt(d.Qv_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Q air entrant"  value={fmt(d.Qm_air_entrant_kg_h, 0)}  unit="kg/h"  />
            <KV label="Q air parasite" value={fmt(d.Qv_air_injecté_net_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Composition air">
            <KV label="Q O₂ air entrant" value={fmt(d.Qm_O2_air_entrant_kg_h, 0)}  unit="kg/h"   />
            <KV label="Q N₂ air entrant" value={fmt(d.Qm_N2_air_entrant_kg_h, 0)}  unit="kg/h"   />
            <KV label="Q O₂ (vol)"       value={fmt(d.Qv_O2_air_entrant_Nm3_h, 0)} unit="Nm³/h"  />
            <KV label="Q N₂ (vol)"       value={fmt(d.Qv_N2_air_entrant_Nm3_h, 0)} unit="Nm³/h"  />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits sortie">
            <KV label="Débit humide sortie" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec sortie"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Pression sortie"     value={fmt(d.PDC_aero, 0)}       unit="mmCE"  />
          </Sub>
          <Sub title="Température">
            <KV label="Température sortie" value={fmt(df.T, 1)} unit="°C" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("qAirDecolmatageNm3"), val:fmt(d.Qv_air_entrant_Nm3_h,0), color:'#4a90e2' },
            { label: tr("qAirParasiteNm3"),    val:fmt(d.Qv_air_injecté_net_Nm3_h,0), color:'#e74c3c' },
            { label: tr("pdcAeroMmCE"),            val:fmt(d.PDC_aero,0),               color:'#2ecc71' },
            { label: tr("tAmontC"),               val:fmt(df.T,1),                     color:'#f39c12' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── COOLINGTOWER ──────────────────────────────────────────────────────────────
const COOLINGTOWERReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataCOOLINGTOWER || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleCOOLINGTOWER")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Températures">
            <KV label="T eau injectée"  value={fmt(p.Teau, 1)}     unit="°C"   />
            <KV label="T vapeur inj."   value={fmt(p.T_steam_C, 1)} unit="°C"   />
            <KV label="T amont"         value={fmt(df.T, 1)}        unit="°C"   />
          </Sub>
          <Sub title="Débits injectés">
            <KV label="Q eau"    value={fmt(p.Qeau_kg_h, 0)}   unit="kg/h"  />
            <KV label="Q vapeur" value={fmt(p.Qsteam_kg_h, 0)} unit="kg/h"  />
            <KV label="PDC"      value={fmt(p.PDC_aero, 0)}    unit="mmCE"  />
          </Sub>
        </div>
      </Section>
      <Section title="2. Bilan enthalpique">
        <div style={bodyStyles.twoCol}>
          <Sub title="Enthalpie intermédiaire">
            <KV label="H total intermédiaire" value={fmt(d.H_tot_intermediaire_kj, 0)} unit="kJ/h" />
            <KV label="H total intermédiaire" value={fmt(d.H_tot_intermediaire_kW, 1)} unit="kW"   />
            <KV label="T intermédiaire calc." value={fmt(d.T_intermediaire, 1)}         unit="°C"   />
          </Sub>
          <Sub title="Enthalpie vapeur">
            <KV label="H vapeur"       value={fmt(d.H_vapeur_kJ, 0)} unit="kJ/h" />
            <KV label="H vapeur"       value={fmt(d.H_vapeur_kW, 1)} unit="kW"   />
            <KV label="T finale sortie" value={fmt(d.T_final, 1)}     unit="°C"   />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Conditions sortie">
            <KV label="Température sortie" value={fmt(d.T_final, 1)}    unit="°C"   />
            <KV label="Pression sortie"    value={fmt(df.P_mmCE, 0)}    unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("tFinaleC"),            val:fmt(d.T_final,1),                  color:'#e74c3c' },
            { label: tr("hVapeurKW"),            val:fmt(d.H_vapeur_kW,1),              color:'#4a90e2' },
            { label: tr("hIntermediaireKW"),     val:fmt(d.H_tot_intermediaire_kW,1),   color:'#2ecc71' },
            { label: tr("tIntermediaireC"),     val:fmt(d.T_intermediaire,1),           color:'#f39c12' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── CYCLONE ───────────────────────────────────────────────────────────────────
const CYCLONEReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataCYCLONE || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleCYCLONE")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="T fumées amont"    value={fmt(p.T_amont_CYCLONE, 1)} unit="°C"   />
            <KV label="T air parasite"    value={fmt(p.T_air_parasite, 1)}  unit="°C"   />
            <KV label="Q air parasite"    value={fmt(p.Qair_parasite, 0)}   unit="m³/h" />
            <KV label="PDC aérodynamique" value={fmt(p.PDC_aero, 0)}        unit="mmCE" />
          </Sub>
          <Sub title="Gaz entrant">
            <KV label="Débit humide amont" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec amont"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="T amont"            value={fmt(df.T, 1)}            unit="°C"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Air parasite">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits volumiques">
            <KV label="Q air entrant"  value={fmt(d.Qv_air_entrant_Nm3_h, 0)}  unit="Nm³/h" />
            <KV label="Q air parasite" value={fmt(d.Qv_air_injecté_net_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Q O₂ air (vol)" value={fmt(d.Qv_O2_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Q N₂ air (vol)" value={fmt(d.Qv_N2_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Débits massiques">
            <KV label="Q air entrant" value={fmt(d.Qm_air_entrant_kg_h, 0)}   unit="kg/h" />
            <KV label="Q O₂ air"      value={fmt(d.Qm_O2_air_entrant_kg_h, 0)} unit="kg/h" />
            <KV label="Q N₂ air"      value={fmt(d.Qm_N2_air_entrant_kg_h, 0)} unit="kg/h" />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits sortie">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Conditions sortie">
            <KV label="Température sortie" value={fmt(df.T, 1)}     unit="°C"   />
            <KV label="Pression sortie"    value={fmt(df.P_mmCE, 0)} unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("qAirEntrantNm3"), val:fmt(d.Qv_air_entrant_Nm3_h,0), color:'#4a90e2' },
            { label: tr("qAirParasiteNm3"), val:fmt(d.Qv_air_injecté_net_Nm3_h,0), color:'#e74c3c' },
            { label: tr("pdcAeroMmCE"),         val:fmt(p.PDC_aero,0),            color:'#2ecc71' },
            { label: tr("tAmontC"),            val:fmt(df.T,1),                  color:'#f39c12' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── DENOX ─────────────────────────────────────────────────────────────────────
const DENOXReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataDENOX || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleDENOX")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Objectif NOx">
            <KV label="Cible NOx"               value={fmt(p.targetNOx, 0)}       unit="mg/Nm³" />
            <KV label="T eau spray"              value={fmt(p.sprayWaterTemp, 1)}   unit="°C"     />
            <KV label="Coef. stœchiométrique"   value={fmt(p.coeffStoech, 2)}      unit="—"      />
            <KV label="PDC"                      value={fmt(p.pdc, 0)}             unit="mmCE"   />
          </Sub>
          <Sub title="Solution réductrice">
            <KV label="Concentration solution" value={fmt(p.solutionConc, 1)}    unit="%"     />
            <KV label="Densité solution"        value={fmt(p.solutionDensity, 0)} unit="kg/m³" />
            <KV label="Débit spray"             value={fmt(p.sprayFlowrate, 1)}   unit="l/h"   />
          </Sub>
        </div>
      </Section>
      <Section title="2. Gaz entrant">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Débit humide"    value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"       value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="T amont"         value={fmt(df.T, 1)}            unit="°C"    />
          </Sub>
          <Sub title="NOx entrant">
            <KV label="Concentration NOx"  value={fmt(d.NOx_concentration_mg_Nm3, 0)} unit="mg/Nm³" />
            <KV label="Débit sec (real)"   value={fmt(d.Qv_sec_m3_h, 0)}              unit="m³/h"   />
            <KV label="Débit sec 11% O₂"  value={fmt(d.Qv_sec_11pourcent_Nm3_h, 0)}  unit="Nm³/h"  />
          </Sub>
        </div>
      </Section>
      <Section title="3. Résultats réduction NOx">
        <div style={bodyStyles.twoCol}>
          <Sub title="Quantités molaires">
            <KV label="NH₃ injecté"      value={fmt(d.Quantite_NH3_mol_h, 0)}           unit="mol/h" />
            <KV label="NO à éliminer"    value={fmt(d.Quantite_NO_a_eliminer_mol_h, 0)} unit="mol/h" />
            <KV label="NOx éliminable"   value={fmt(d.Quantite_NOx_eliminable_kg_h, 2)} unit="kg/h"  />
          </Sub>
          <Sub title="Consommation réactif">
            <KV label="Conso. stœchio." value={fmt(d.Conso_stoechio_reactif_kg_h, 2)} unit="kg/h" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("noxCible"),      val:fmt(p.targetNOx,0),                         color:'#e74c3c' },
            { label: tr("noxMesure"),     val:fmt(d.NOx_concentration_mg_Nm3,0),           color:'#f39c12' },
            { label: tr("nh3Injecte"),     val:fmt(d.Quantite_NH3_mol_h,0),                color:'#4a90e2' },
            { label: tr("consoReactifKgh"),    val:fmt(d.Conso_stoechio_reactif_kg_h,2),       color:'#2ecc71' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── ELECTROFILTER ─────────────────────────────────────────────────────────────
const ELECTROFILTERReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataELECTROFILTER || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleELECTROFILTER")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="T fumées amont"     value={fmt(p.T_amont_ELECTROFILTER, 1)} unit="°C"   />
            <KV label="T air décolmatage"  value={fmt(p.T_air_decolmatation, 1)}   unit="°C"   />
            <KV label="Q air décolmatage"  value={fmt(p.Qair_decolmatation, 0)}    unit="m³/h" />
            <KV label="PDC aérodynamique"  value={fmt(p.PDC_aero, 0)}              unit="mmCE" />
          </Sub>
          <Sub title="Gaz entrant">
            <KV label="Débit humide amont" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec amont"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="T amont"            value={fmt(df.T, 1)}            unit="°C"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Air de décolmatage">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits volumiques">
            <KV label="Q air entrant"  value={fmt(d.Qv_air_entrant_Nm3_h, 0)}  unit="Nm³/h" />
            <KV label="Q air parasite" value={fmt(d.Qv_air_injecté_net_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Q O₂ air (vol)" value={fmt(d.Qv_O2_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Q N₂ air (vol)" value={fmt(d.Qv_N2_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Débits massiques">
            <KV label="Q air entrant" value={fmt(d.Qm_air_entrant_kg_h, 0)}    unit="kg/h" />
            <KV label="Q O₂ air"      value={fmt(d.Qm_O2_air_entrant_kg_h, 0)} unit="kg/h" />
            <KV label="Q N₂ air"      value={fmt(d.Qm_N2_air_entrant_kg_h, 0)} unit="kg/h" />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits sortie">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Conditions sortie">
            <KV label="Température sortie" value={fmt(df.T, 1)}     unit="°C"   />
            <KV label="Pression sortie"    value={fmt(df.P_mmCE, 0)} unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("qAirEntrantNm3"),  val:fmt(d.Qv_air_entrant_Nm3_h,0), color:'#4a90e2' },
            { label: tr("qAirParasiteNm3"), val:fmt(d.Qv_air_injecté_net_Nm3_h,0), color:'#e74c3c' },
            { label: tr("pdcAeroMmCE"),         val:fmt(p.PDC_aero,0),              color:'#2ecc71' },
            { label: tr("tAmontC"),            val:fmt(df.T,1),                    color:'#f39c12' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── FB ────────────────────────────────────────────────────────────────────────
const FBReportBody = ({ calculationResult, inputParams, tr }) => {
  const r = calculationResult || {};
  const p = inputParams || {};
  const NCV_kJ_kg = (parseFloat(r.calculatePCIkcalkg) || 0) * 4.1868;
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleFB")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions de calcul">
            <KV label="Type de bilan"    value={p.bilanType || '—'} />
            <KV label="Type de déchet"   value={p.wasteType || '—'} />
            <KV label="T air"            value={fmt(p.Tair_FB_C, 1)}           unit="°C" />
            <KV label="Pertes thermiques" value={fmt(p.Thermal_losses_MW, 2)}  unit="MW" />
          </Sub>
          <Sub title="Données boue">
            <KV label="Q boue" value={fmt(p.Q_boue_kg_h, 0)} unit="m³/h" />
            <KV label="MS"     value={fmt(p.MS_percent, 1)}   unit="%"    />
            <KV label="MV"     value={fmt(p.MV_percent, 1)}   unit="%"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Résultats de combustion">
        <div style={bodyStyles.twoCol}>
          <Sub title="Bilan énergétique">
            <KV label="Puissance incinérateur" value={fmt(r.P_incinerateur_MWH, 3)} unit="MW" />
            <KV label="Enthalpie sortie"        value={fmt(r.H_out_kW, 0)}           unit="kW" />
            <KV label="Enthalpie air entrée"    value={fmt(r.H_air_kW, 0)}           unit="kW" />
          </Sub>
          <Sub title="Déchets traités">
            <KV label="Q boue calculé" value={fmt(r.Qboue_kg_h, 0)}        unit="kg/h"   />
            <KV label="MS calculé"     value={fmt(r.MS, 1)}                 unit="%"      />
            <KV label="PCI déchet"     value={fmt(r.calculatePCIkcalkg, 0)} unit="kcal/kg"/>
            <KV label="PCI déchet"     value={fmt(NCV_kJ_kg, 0)}            unit="kJ/kg"  />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <Sub>
          <KV label="Débit fumées (conditions réelles)" value={fmt(r.Qv_wet_m3_h, 0)} unit="m³/h" />
        </Sub>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("puissanceMW"),  val:fmt(r.P_incinerateur_MWH,3),   color:'#e74c3c' },
            { label: tr("qBoueKgh"),   val:fmt(r.Qboue_kg_h,0),           color:'#2ecc71' },
            { label: tr("pciKcalKg"),   val:fmt(r.calculatePCIkcalkg,0),   color:'#f39c12' },
            { label: tr("pciKjKg"),     val:fmt(NCV_kJ_kg,0),              color:'#f39c12' },
            { label:'MS [%]',          val:fmt(r.MS,1),                   color:'#4a90e2' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── GF ────────────────────────────────────────────────────────────────────────
const GFReportBody = ({ calculationResult, inputParams, tr }) => {
  const r       = calculationResult || {};
  const p       = inputParams || {};
  const INCI    = r.INCI || {};
  const airComb = r.data_air_comb || {};
  const PCI_kJ_kg = (parseFloat(r.PCI_kCal_kg) || 0) * 4.1868;
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleGF")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Déchets et air">
            <KV label="Débit déchets"         value={fmt(p.Waste_flow_rate_kg_h, 0)}          unit="kg/h"   />
            <KV label="Débit air combustion"  value={fmt(p.Combustion_air_flowrate_Nm3_h, 0)} unit="Nm³/h"  />
            <KV label="T air mesurée"         value={fmt(p.Measured_air_temperature_C, 1)}    unit="°C"     />
            <KV label="PDC"                   value={fmt(p.Pressure_losse_mmCE, 0)}           unit="mmCE"   />
          </Sub>
          <Sub title="Eau d'alimentation">
            <KV label="Q eau alimentation" value={fmt(p.Q_feed_water_kg_h, 0)} unit="kg/h" />
            <KV label="T eau alimentation" value={fmt(p.T_feed_water_C, 1)}    unit="°C"   />
            <KV label="Purge"              value={fmt(p.Blowdown_pourcent, 1)} unit="%"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Bilan énergétique">
        <div style={bodyStyles.twoCol}>
          <Sub title="Puissances">
            <KV label="Puissance incinérateur" value={fmt((parseFloat(r.P_incinerateur_kWH)||0)/1000, 3)} unit="MW"      />
            <KV label="Puissance incinérateur" value={fmt(r.P_incinerateur_kWH, 0)}                       unit="kW"      />
            <KV label="PCI déchet"             value={fmt(r.PCI_kCal_kg, 0)}                              unit="kcal/kg" />
            <KV label="PCI déchet"             value={fmt(PCI_kJ_kg, 0)}                                  unit="kJ/kg"   />
          </Sub>
          <Sub title="Récupération chaleur">
            <KV label="Énergie récupérée chaudière" value={fmt(INCI.Energie_recuperee_chaudiere_kW, 0)} unit="kW" />
            <KV label="Énergie du déchet"           value={fmt(INCI.Energie_du_dechet_kW, 0)}           unit="kW" />
            <KV label="Rendement WHB"               value={fmt(INCI.WHB_yield_pourcent, 1)}             unit="%"  />
          </Sub>
        </div>
      </Section>
      <Section title="3. Vapeur produite">
        <div style={bodyStyles.twoCol}>
          <Sub title="Vapeur saturée">
            <KV label="H vapeur saturée" value={fmt(INCI.H_saturated_steam_kW, 0)} unit="kW" />
          </Sub>
          <Sub title="Vapeur surchauffée">
            <KV label="H vapeur surchauffée" value={fmt(INCI.H_superheated_steam_kW, 0)} unit="kW" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Air de combustion">
        <Sub>
          <KV label="T air"         value={fmt(airComb.Measured_air_temperature_C, 1)} unit="°C" />
          <KV label="Enthalpie air" value={fmt(airComb.H_air_comb_kW, 0)}              unit="kW" />
        </Sub>
      </Section>
      <Section title="5. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("puissanceMW"),             val:fmt((parseFloat(r.P_incinerateur_kWH)||0)/1000,3), color:'#e74c3c' },
            { label: tr("pciKcalKg"),              val:fmt(r.PCI_kCal_kg,0),                             color:'#f39c12' },
            { label: tr("energieRecupereeKW"),     val:fmt(INCI.Energie_recuperee_chaudiere_kW,0),       color:'#4a90e2' },
            { label: tr("rendementWHBPct"),          val:fmt(INCI.WHB_yield_pourcent,1),                   color:'#2ecc71' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── IDFAN ─────────────────────────────────────────────────────────────────────
const IDFANReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.Id_fan || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleIDFAN")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="Pression amont"      value={fmt(p.P_amont, 0)}   unit="mmCE" />
            <KV label="Rendement électrique" value={fmt(p.Rdt_elec, 1)} unit="%"    />
            <KV label="Type dissipation"    value={p.Type || '—'}                   />
          </Sub>
          <Sub title="Gaz entrant">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="T amont"      value={fmt(df.T, 1)}             unit="°C"    />
            <KV label="P amont"      value={fmt(df.P_mmCE, 0)}        unit="mmCE"  />
          </Sub>
        </div>
      </Section>
      <Section title="2. Résultats ventilateur">
        <div style={bodyStyles.twoCol}>
          <Sub title="Puissances">
            <KV label="Puissance électrique" value={fmt(d.P_elec, 2)}              unit="kW" />
            <KV label="Chaleur dissipée"     value={fmt(d.Pth_chaleur_dissipee, 2)} unit="kW" />
          </Sub>
          <Sub title="Pression">
            <KV label="P sortie (P_out)" value={fmt(d.P_out_mmCE, 0)} unit="mmCE" />
            <KV label="Coefficient K"    value={fmt(d.K, 4)}                       />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Conditions sortie">
            <KV label="Température sortie" value={fmt(df.T, 1)}        unit="°C"   />
            <KV label="Pression sortie"    value={fmt(d.P_out_mmCE, 0)} unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("puissanceElecKW"),    val:fmt(d.P_elec,2),              color:'#e74c3c' },
            { label: tr("chaleurDissipeeKW"),   val:fmt(d.Pth_chaleur_dissipee,2), color:'#f39c12' },
            { label: tr("pSortieMmCE"),         val:fmt(d.P_out_mmCE,0),           color:'#4a90e2' },
            { label: tr("rdtElecPct"),           val:fmt(p.Rdt_elec,1),             color:'#2ecc71' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── QUENCH ────────────────────────────────────────────────────────────────────
const QUENCHReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataQUENCH || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleQUENCH")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="Type de bilan"       value={p.bilanType || '—'}         />
            <KV label="T eau injectée"      value={fmt(p.Teau, 1)}            unit="°C"   />
            <KV label="T fumées amont"      value={fmt(p.T_amont_QUENCH, 1)}  unit="°C"   />
            <KV label="Q eau (si bilan Qeau)" value={fmt(p.Qeau, 1)}          unit="kg/h" />
            <KV label="PDC aérodynamique"   value={fmt(p.PDC_aero, 0)}        unit="mmCE" />
          </Sub>
          <Sub title="Gaz entrant">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="T amont"      value={fmt(df.T, 1)}             unit="°C"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Résultats refroidissement">
        <div style={bodyStyles.twoCol}>
          <Sub title="Eau injectée">
            <KV label="Q eau calculé" value={fmt(d.Qeau, 1)}    unit="kg/h" />
            <KV label="PDC aéro"      value={fmt(d.PDC_aero, 0)} unit="mmCE" />
          </Sub>
          <Sub title="Pression sortie">
            <KV label="P sortie" value={fmt(d.P_out_mmCE, 0)} unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Conditions sortie">
            <KV label="Température sortie" value={fmt(df.T, 1)}        unit="°C"   />
            <KV label="Pression sortie"    value={fmt(d.P_out_mmCE, 0)} unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("qEauKgh"),      val:fmt(d.Qeau,1),        color:'#4a90e2' },
            { label: tr("tSortieC"),     val:fmt(df.T,1),           color:'#e74c3c' },
            { label: tr("pdcAeroMmCE"),   val:fmt(d.PDC_aero,0),    color:'#2ecc71' },
            { label: tr("pSortieMmCE"),   val:fmt(d.P_out_mmCE,0),  color:'#f39c12' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── SCRUBBER ──────────────────────────────────────────────────────────────────
const SCRUBBERReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleSCRUBBER")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="Mode de calcul"      value={p.bilanType || '—'}          />
            <KV label="T eau injectée"      value={fmt(p.Teau, 1)}             unit="°C"   />
            <KV label="T fumées amont"      value={fmt(p.T_amont_SCRUBBER, 1)} unit="°C"   />
            <KV label="PDC aérodynamique"   value={fmt(p.PDC_aero, 0)}         unit="mmCE" />
          </Sub>
          <Sub title="Gaz entrant">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="T amont"      value={fmt(df.T, 1)}             unit="°C"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Débit humide sortie" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec sortie"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit massique"      value={fmt(df.Qm_tot_kg_h, 0)}  unit="kg/h"  />
          </Sub>
          <Sub title="Composition">
            <KV label="O₂ sec"  value={fmt(df.O2_dry_pourcent, 2)}  unit="%" />
            <KV label="CO₂ sec" value={fmt(df.CO2_dry_pourcent, 2)} unit="%" />
            <KV label="H₂O"     value={fmt(df.H2O_pourcent, 2)}     unit="%" />
          </Sub>
        </div>
      </Section>
      <Section title="3. Conditions de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Thermique">
            <KV label="Température sortie" value={fmt(df.T, 1)}        unit="°C" />
            <KV label="Enthalpie totale"   value={fmt(df.H_tot_kW, 0)} unit="kW" />
          </Sub>
          <Sub title="Pression">
            <KV label="Pression sortie" value={fmt(df.P_mmCE, 0)} unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("debitHumideNm3h"), val:fmt(df.Qv_wet_Nm3_h,0), color:'#4a90e2' },
            { label: tr("tSortieC"),        val:fmt(df.T,1),              color:'#e74c3c' },
            { label: tr("enthalpieKW"),       val:fmt(df.H_tot_kW,0),      color:'#2ecc71' },
            { label: tr("pdcMmCEShort"),           val:fmt(p.PDC_aero,0),       color:'#f39c12' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── REACTOR ───────────────────────────────────────────────────────────────────
const REACTORReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataREACTOR || {};
  const p  = inputParams || {};
  const isCAP = (p.reagentType || 'CAP') === 'CAP';
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleREACTOR")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="Type réactif"       value={p.reagentType || '—'}          />
            <KV label="T fumées amont"     value={fmt(p.T_amont_REACTOR, 1)} unit="°C"   />
            <KV label="T air"              value={fmt(p.T_air, 1)}            unit="°C"   />
            <KV label="PDC aérodynamique"  value={fmt(p.PDC_aero, 0)}         unit="mmCE" />
            <KV label="Débit air parasite" value={fmt(p.Qv_air_parasite_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Paramètres réactif">
            {isCAP ? (
              <>
                <KV label="Besoin air CAP"     value={fmt(p.Besoin_air_pulverisation_cap_Nm3_kg, 2)} unit="Nm³/kg"    />
                <KV label="Concentration CAP"  value={fmt(p.Concentration_cap_mg_cap_Nm3_FG, 2)}    unit="mg/Nm³FG"  />
              </>
            ) : (
              <>
                <KV label="Besoin air chaux"   value={fmt(p.Besoin_air_pulverisation_lime_Nm3_kg, 2)} unit="Nm³/kg"      />
                <KV label="Concentration chaux" value={fmt(p.Concentration_Lime_kg_lime_Nm3_FG, 3)}  unit="kg/Nm³FG"    />
              </>
            )}
          </Sub>
        </div>
      </Section>
      <Section title="2. Air d'injection">
        <Sub>
          <KV label="Q air entrant total" value={fmt(d.Qv_air_entrant_tot_Nm3_h, 0)} unit="Nm³/h" />
          <KV label="Q air parasite"      value={fmt(d.Qv_air_parasite_Nm3_h, 0)}    unit="Nm³/h" />
          <KV label="Q air injecté net"   value={fmt(d.Qv_air_injecté_net_Nm3_h, 0)} unit="Nm³/h" />
        </Sub>
      </Section>
      <Section title="3. Consommation réactifs">
        <div style={bodyStyles.twoCol}>
          <Sub title="CAP (charbon actif)">
            <KV label="Conso. CAP calculée"  value={fmt(d.conso_CAP_calcul_kg_h, 2)}  unit="kg/h" />
          </Sub>
          <Sub title="Chaux">
            <KV label="Conso. chaux calculée" value={fmt(d.conso_LIME_calcul_kg_h, 2)} unit="kg/h" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Conditions sortie">
            <KV label="Température sortie" value={fmt(df.T, 1)}     unit="°C"   />
            <KV label="Pression sortie"    value={fmt(df.P_mmCE, 0)} unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="5. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("qAirEntrantNm3"), val:fmt(d.Qv_air_entrant_tot_Nm3_h,0), color:'#4a90e2' },
            { label: tr("consoCAPKgh"),      val:fmt(d.conso_CAP_calcul_kg_h,2),     color:'#e74c3c' },
            { label: tr("consoChauxKgh"),    val:fmt(d.conso_LIME_calcul_kg_h,2),    color:'#f39c12' },
            { label: tr("pdcMmCEShort"),            val:fmt(p.PDC_aero,0),                  color:'#2ecc71' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── WHB ───────────────────────────────────────────────────────────────────────
const WHBReportBody = ({ calculationResult, inputParams, tr }) => {
  const r   = calculationResult || {};
  const df  = r.dataFlow || {};
  const air = r.data_Air_WHB || {};
  const vap = r.data_vapeur_WHB || {};
  const eau = r.data_eau_alim_WHB || {};
  const p   = inputParams || {};
  const isSuperheated = (p.bilanTypeVapeur || air.bilanTypeVapeur) === 'SUPERHEATED_STEAM';
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleWHB")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Vapeur et eau">
            <KV label="Type vapeur"        value={isSuperheated ? 'Vapeur surchauffée' : 'Vapeur saturée'} />
            <KV label="Pression vapeur"    value={fmt(p.P_vapeur_bar, 1)}           unit="bar" />
            {isSuperheated && <KV label="T vapeur surchauffée" value={fmt(p.T_vapeur_surchauffee_C, 1)} unit="°C" />}
            <KV label="T eau alimentation" value={fmt(p.T_eau_alimentation_C, 1)}  unit="°C"  />
            <KV label="Purge"              value={fmt(p.Q_eau_purge_pourcent, 1)}  unit="%"   />
          </Sub>
          <Sub title="Conditions calcul">
            <KV label="Type bilan"       value={p.bilanType || '—'}          />
            <KV label="Type bilan air"   value={p.bilanTypeAir || '—'}       />
            <KV label="T amont WHB"      value={fmt(p.T_amont_WHB_C, 1)}     unit="°C" />
            <KV label="T air extérieur"  value={fmt(p.T_air_exterieur_C, 1)} unit="°C" />
            <KV label="Pertes thermiques" value={fmt(p.P_th_pourcent, 1)}    unit="%"  />
          </Sub>
        </div>
      </Section>
      <Section title="2. Résultats vapeur">
        <div style={bodyStyles.twoCol}>
          <Sub title="Production vapeur">
            <KV label="T vapeur saturée"   value={fmt(vap.Tvap_saturee, 1)}         unit="°C"    />
            {isSuperheated && <KV label="T vapeur surchauffée" value={fmt(vap.Tvap_surchauffee, 1)} unit="°C" />}
            <KV label="Q vapeur produite"  value={fmt(vap.Q_vapeur_calculee_kg_h, 0)} unit="kg/h"  />
            <KV label="Enthalpie vapeur"   value={fmt(vap.H_vapeur, 0)}              unit="kJ/kg" />
          </Sub>
          <Sub title="Énergie récupérée">
            <KV label="Énergie récupérée WHB" value={fmt(air.Energie_recuperee_WHB_kW, 0)} unit="kW" />
            <KV label="T aval WHB"            value={fmt(air.Taval_WHB, 1)}                unit="°C" />
          </Sub>
        </div>
      </Section>
      <Section title="3. Eau d'alimentation">
        <div style={bodyStyles.twoCol}>
          <Sub title="Alimentation">
            <KV label="T eau alimentation" value={fmt(eau.Teau_alim, 1)}               unit="°C"   />
            <KV label="Q eau alimentation" value={fmt(eau.Q_eau_alimentation_kg_h, 0)} unit="kg/h" />
          </Sub>
          <Sub title="Enthalpie">
            <KV label="H eau alimentation" value={fmt(eau.H_eau_alimentation_kj, 0)} unit="kJ/kg" />
            <KV label="H eau alimentation" value={fmt(eau.H_eau_alimentation_kW, 0)} unit="kW"    />
          </Sub>
        </div>
      </Section>
      <Section title="4. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Conditions sortie">
            <KV label="T aval WHB"       value={fmt(air.Taval_WHB, 1)} unit="°C"   />
            <KV label="Pression sortie"  value={fmt(df.P_mmCE, 0)}     unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="5. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("energieRecupereeKW"), val:fmt(air.Energie_recuperee_WHB_kW,0), color:'#e74c3c' },
            { label: tr("qVapeurKgh"),        val:fmt(vap.Q_vapeur_calculee_kg_h,0),   color:'#4a90e2' },
            { label: tr("tAvalC"),            val:fmt(air.Taval_WHB,1),                color:'#f39c12' },
            { label: tr("pVapeurBar"),         val:fmt(p.P_vapeur_bar,1),               color:'#2ecc71' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── AIRINJECTION ──────────────────────────────────────────────────────────────
const AIRINJECTIONReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataAIRINJECTION || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleAIRINJECTION")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="T fumées amont"    value={fmt(p.T_amont_AIRINJECTION, 1)} unit="°C"   />
            <KV label="T air parasite"    value={fmt(p.T_air_parasite, 1)}        unit="°C"   />
            <KV label="Q air parasite"    value={fmt(p.Qair_parasite, 0)}         unit="m³/h" />
            <KV label="PDC aérodynamique" value={fmt(p.PDC_aero, 0)}              unit="mmCE" />
          </Sub>
          <Sub title="Gaz entrant">
            <KV label="Débit humide amont" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec amont"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="T amont"            value={fmt(df.T, 1)}             unit="°C"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Air parasite">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits volumiques">
            <KV label="Q air entrant"  value={fmt(d.Qv_air_entrant_Nm3_h, 0)}   unit="Nm³/h" />
            <KV label="Q air parasite" value={fmt(d.Qv_air_injecté_net_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Q O₂ air (vol)" value={fmt(d.Qv_O2_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Q N₂ air (vol)" value={fmt(d.Qv_N2_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Débits massiques">
            <KV label="Q air entrant" value={fmt(d.Qm_air_entrant_kg_h, 0)}    unit="kg/h" />
            <KV label="Q O₂ air"      value={fmt(d.Qm_O2_air_entrant_kg_h, 0)} unit="kg/h" />
            <KV label="Q N₂ air"      value={fmt(d.Qm_N2_air_entrant_kg_h, 0)} unit="kg/h" />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits sortie">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Conditions sortie">
            <KV label="Température sortie" value={fmt(df.T, 1)}        unit="°C"   />
            <KV label="Pression sortie"    value={fmt(df.P_mmCE, 0)}   unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("qAirEntrantNm3"), val:fmt(d.Qv_air_entrant_Nm3_h,0), color:'#4a90e2' },
            { label: tr("qAirParasiteNm3"), val:fmt(d.Qv_air_injecté_net_Nm3_h,0), color:'#e74c3c' },
            { label: tr("pdcAeroMmCE"),         val:fmt(p.PDC_aero,0),            color:'#2ecc71' },
            { label: tr("tAmontC"),            val:fmt(df.T,1),                  color:'#f39c12' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── IACT ──────────────────────────────────────────────────────────────────────
const IACTReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataIACT || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleIACT")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions amont">
            <KV label="T fumées amont"      value={fmt(p.T_amont_IACT, 1)}         unit="°C"   />
            <KV label="T air décolmatage"   value={fmt(p.T_air_decolmatation, 1)}   unit="°C"   />
            <KV label="Q air décolmatage"   value={fmt(p.Qair_decolmatation, 0)}    unit="m³/h" />
            <KV label="PDC aérodynamique"   value={fmt(p.PDC_aero, 0)}              unit="mmCE" />
          </Sub>
          <Sub title="Gaz entrant">
            <KV label="Débit humide amont" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec amont"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="T amont"            value={fmt(df.T, 1)}             unit="°C"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Air de décolmatage">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Q air entrant"  value={fmt(d.Qv_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Q air entrant"  value={fmt(d.Qm_air_entrant_kg_h, 0)}  unit="kg/h"  />
            <KV label="Q air parasite" value={fmt(d.Qair_parasite, 0)}         unit="Nm³/h" />
          </Sub>
          <Sub title="Composition air">
            <KV label="Q O₂ air entrant" value={fmt(d.Qm_O2_air_entrant_kg_h, 0)}  unit="kg/h"  />
            <KV label="Q N₂ air entrant" value={fmt(d.Qm_N2_air_entrant_kg_h, 0)}  unit="kg/h"  />
            <KV label="Q O₂ (vol)"       value={fmt(d.Qv_O2_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Q N₂ (vol)"       value={fmt(d.Qv_N2_air_entrant_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits sortie">
            <KV label="Débit humide sortie" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec sortie"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Pression sortie"     value={fmt(d.PDC_aero, 0)}       unit="mmCE"  />
          </Sub>
          <Sub title="Température">
            <KV label="Température sortie" value={fmt(df.T, 1)} unit="°C" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("qAirDecolmatageNm3"), val:fmt(d.Qv_air_entrant_Nm3_h,0), color:'#4a90e2' },
            { label: tr("qAirParasiteNm3"),    val:fmt(d.Qair_parasite,0),          color:'#e74c3c' },
            { label: tr("pdcAeroMmCE"),            val:fmt(d.PDC_aero,0),               color:'#2ecc71' },
            { label: tr("tAmontC"),               val:fmt(df.T,1),                     color:'#f39c12' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── TUBEANDSHELL ──────────────────────────────────────────────────────────────
const TUBEANDSHELLReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataTUBEANDSHELL || {};
  const p  = inputParams || {};
  const fluide = p.fluide || 'eau';
  const isEau  = fluide === 'eau';
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleTUBEANDSHELL")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Côté fumées">
            <KV label="T fumées sortie (aval)"  value={fmt(df.T_FG_out ?? p.T_fumee_out_node, 1)} unit="°C"    />
            <KV label="T fumées entrée"          value={fmt(p.T_fumee_in, 1)}                       unit="°C"    />
            <KV label="PDC échangeur"            value={fmt(p.PDC_econo, 0)}                        unit="mmCE"  />
          </Sub>
          <Sub title={`Côté ${fluide}`}>
            <KV label={`T entrée ${fluide}`}     value={fmt(p.T_fluide_in, 1)}                      unit="°C"    />
            <KV label={`T sortie ${fluide}`}     value={fmt(d.T_fluide_out, 1)}                     unit="°C"    />
            {isEau
              ? <KV label="Débit eau"            value={fmt(p.m_eau, 0)}                            unit="kg/h"  />
              : <KV label="Débit air"            value={fmt(p.V_air, 0)}                            unit="Nm³/h" />
            }
            <KV label="Rendement échangeur"      value={fmt(p.Rendement, 1)}                        unit="%"     />
          </Sub>
        </div>
      </Section>
      <Section title="2. Bilan thermique">
        <div style={bodyStyles.twoCol}>
          <Sub title="Côté fumées">
            <KV label="Enthalpie fumées entrée" value={fmt(df.H_tot_kW, 1)}  unit="kW"   />
            <KV label="Chaleur cédée fumées"    value={fmt(d.Q_FG_kWh, 1)}   unit="kWh"  />
          </Sub>
          <Sub title={`Côté ${fluide}`}>
            <KV label="Chaleur utile fluide"    value={fmt(d.Q_utile_eau_kWh, 1)} unit="kWh"  />
            <KV label={`T sortie ${fluide}`}    value={fmt(d.T_fluide_out, 1)}    unit="°C"   />
            <KV label="T moyenne fluide"        value={fmt(d.T_moyen_eau, 1)}     unit="°C"   />
            <KV label={isEau ? 'Débit eau' : 'Débit air'}
                            value={fmt(d.m_eau_kg_h, 0)} unit={isEau ? 'kg/h' : 'Nm³/h'} />
          </Sub>
        </div>
      </Section>
      <Section title="3. Dimensionnement échangeur">
        <div style={bodyStyles.twoCol}>
          <Sub title="Facteurs thermiques">
            <KV label="ΔT log. moyen"       value={fmt(d.D_TLM, 1)}       unit="°C"        />
            <KV label="Facteur UA"           value={fmt(d.Fact_UA, 3)}     unit="kW/K"      />
            <KV label="Coefficient U liste"  value={fmt(d.Fact_U_list, 0)} unit="W/(m²·K)"  />
          </Sub>
          <Sub title="Surface">
            <KV label="Surface d'échange"   value={fmt(d.Surface_m2, 2)}  unit="m²"   />
            <KV label="PDC échangeur"        value={fmt(p.PDC_econo, 0)}   unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("qCedeFumeesKWh"),                          val:fmt(d.Q_FG_kWh,1),        color:'#e74c3c' },
            { label:`Q utile ${fluide} [kWh]`,                      val:fmt(d.Q_utile_eau_kWh,1), color:'#2ecc71' },
            { label:`T sortie ${fluide} [°C]`,                      val:fmt(d.T_fluide_out,1),    color:'#4a90e2' },
            { label:isEau?'Débit eau [kg/h]':'Débit air [Nm³/h]',   val:fmt(d.m_eau_kg_h,0),      color:'#9b59b6' },
            { label: tr("dtLogMoyenC"),                           val:fmt(d.D_TLM,1),           color:'#f39c12' },
            { label: tr("surfaceEchangeM2"),                         val:fmt(d.Surface_m2,2),      color:'#1abc9c' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── WATER_INJECTION ───────────────────────────────────────────────────────────
const WATER_INJECTIONReportBody = ({ calculationResult, inputParams, tr }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataWATER_INJECTION || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>{tr("retroTitleWATERINJECTION")}</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="Type de bilan"          value={p.bilanType || '—'}                      />
            <KV label="T eau injectée"          value={fmt(p.Teau, 1)}                         unit="°C"   />
            <KV label="T fumées amont"          value={fmt(p.T_amont_WATER_INJECTION, 1)}      unit="°C"   />
            <KV label="Q eau (si bilan Qeau)"  value={fmt(p.Qeau, 1)}                         unit="kg/h" />
            <KV label="PDC aérodynamique"       value={fmt(p.PDC_aero, 0)}                     unit="mmCE" />
          </Sub>
          <Sub title="Gaz entrant">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="T amont"      value={fmt(df.T, 1)}             unit="°C"    />
          </Sub>
        </div>
      </Section>
      <Section title="2. Résultats refroidissement">
        <div style={bodyStyles.twoCol}>
          <Sub title="Eau injectée">
            <KV label="Q eau calculé" value={fmt(d.Qeau, 1)}    unit="kg/h" />
            <KV label="PDC aéro"      value={fmt(d.PDC_aero, 0)} unit="mmCE" />
          </Sub>
          <Sub title="Pression sortie">
            <KV label="P sortie" value={fmt(d.P_out_mmCE, 0)} unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="3. Gaz de sortie">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Débit humide" value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Débit sec"    value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
          </Sub>
          <Sub title="Conditions sortie">
            <KV label="Température sortie" value={fmt(df.T, 1)}        unit="°C"   />
            <KV label="Pression sortie"    value={fmt(d.P_out_mmCE, 0)} unit="mmCE" />
          </Sub>
        </div>
      </Section>
      <Section title="4. Synthèse">
        <div style={bodyStyles.tagRow}>
          {[
            { label: tr("qEauKgh"),    val:fmt(d.Qeau,1),       color:'#4a90e2' },
            { label: tr("tSortieC"),   val:fmt(df.T,1),          color:'#e74c3c' },
            { label: tr("pdcAeroMmCE"), val:fmt(d.PDC_aero,0),   color:'#2ecc71' },
            { label: tr("pSortieMmCE"), val:fmt(d.P_out_mmCE,0), color:'#f39c12' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...bodyStyles.tag, borderLeft:`4px solid ${color}` }}>
              <span style={bodyStyles.tagLabel}>{label}</span>
              <span style={{ ...bodyStyles.tagValue, color }}>{val}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.6)',
    zIndex:9999, display:'flex', alignItems:'stretch', justifyContent:'center', padding:'20px',
  },
  modal: {
    background:'#fff', borderRadius:8, display:'flex', flexDirection:'column',
    width:'100%', maxWidth:1200, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', overflow:'hidden',
  },
  header: {
    display:'flex', alignItems:'center', justifyContent:'space-between',
    padding:'14px 20px', background:'#1a3a6b', flexShrink:0,
  },
  headerTitle: { margin:0, fontSize:18, fontWeight:'bold', color:'#fff' },
  headerActions: { display:'flex', gap:10, alignItems:'center' },
  nodeCount: { color:'#adc8f0', fontSize:13 },
  btn: { padding:'8px 16px', border:'none', borderRadius:4, cursor:'pointer', fontWeight:'bold', fontSize:13 },
  btnPdf: { background:'#27ae60', color:'#fff' },
  btnClose: { background:'#c0392b', color:'#fff' },
  btnDisabled: { opacity:0.5, cursor:'not-allowed' },
  scrollArea: { flex:1, overflowY:'auto', background:'#f0f2f5', padding:'20px' },
  empty: {
    display:'flex', alignItems:'center', justifyContent:'center',
    height:'100%', color:'#888', fontSize:15, textAlign:'center', padding:40,
  },
  reportContent: { background:'#fff', maxWidth:1050, margin:'0 auto' },
  coverPage: {
    padding:'60px 48px', textAlign:'center', borderBottom:'4px solid #4a90e2',
    background:'linear-gradient(135deg, #1a3a6b 0%, #2c5aa0 100%)', color:'#fff',
    display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
  },
  coverLogo: { fontSize:64, marginBottom:16 },
  coverTitle: { fontSize:28, fontWeight:'bold', margin:'0 0 12px 0', color:'#fff' },
  coverDate: { fontSize:14, color:'#adc8f0', margin:'0 0 32px 0' },
  coverEquipList: {
    display:'inline-block', textAlign:'left', background:'rgba(255,255,255,0.1)',
    borderRadius:8, padding:'16px 24px', minWidth:300,
  },
  coverEquipTitle: { margin:'0 0 10px 0', fontSize:15, color:'#e0ecff' },
  coverEquipItem: { padding:'4px 0', fontSize:14, color:'#fff' },
  lineSeparator: {
    display:'flex', alignItems:'center', gap:12,
    background:'linear-gradient(90deg, #1a3a6b 0%, #2c5aa0 100%)',
    padding:'14px 20px', color:'#fff',
  },
  lineIcon: { fontSize:22, fontWeight:'bold', color:'#4a90e2' },
  lineLabel: { fontSize:17, fontWeight:'bold', color:'#fff' },
  lineDesc: { fontSize:13, color:'#adc8f0', marginLeft:8 },
  equipSection: { borderBottom:'3px solid #e0e8f4' },
  equipSeparator: {
    display:'flex', alignItems:'center', gap:12,
    background:'#eaf0fb', padding:'10px 20px', borderBottom:'1px solid #c5d5ea',
  },
  equipIndex: {
    background:'#4a90e2', color:'#fff', borderRadius:'50%',
    width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center',
    fontWeight:'bold', fontSize:13, flexShrink:0,
  },
  equipLabel: { fontSize:16, fontWeight:'bold', color:'#1a3a6b' },
  equipTitle: { fontSize:14, color:'#555' },
  noData: { padding:'20px 24px', color:'#999', fontSize:13, fontStyle:'italic' },
  diagSection: { borderTop:'3px solid #c0392b', marginTop:0 },
};

const bodyStyles = {
  body: {
    fontFamily:'Arial, sans-serif', fontSize:13, color:'#222',
    padding:'20px 24px', backgroundColor:'#fff',
  },
  mainTitle: {
    fontSize:18, fontWeight:'bold', color:'#1a3a6b',
    borderBottom:'3px solid #4a90e2', paddingBottom:8, marginBottom:20,
  },
  section: { marginBottom:24, border:'1px solid #d0daea', borderRadius:6, overflow:'hidden' },
  sectionTitle: {
    fontSize:14, fontWeight:'bold', color:'#fff',
    background:'#4a90e2', margin:0, padding:'7px 14px',
  },
  subSection: { padding:'8px 14px' },
  subTitle: {
    fontSize:12, fontWeight:'bold', color:'#1a3a6b',
    margin:'0 0 5px 0', borderBottom:'1px solid #e0e8f4', paddingBottom:2,
  },
  twoCol: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 },
  kvRow: { display:'flex', justifyContent:'space-between', padding:'2px 0', borderBottom:'1px dotted #e8e8e8' },
  kvLabel: { color:'#444', flex:1 },
  kvValue: { fontWeight:'bold', color:'#1a3a6b', minWidth:80, textAlign:'right' },
  kvUnit: { fontWeight:'normal', color:'#666', fontSize:11 },
  table: { width:'100%', borderCollapse:'collapse', fontSize:11, marginBottom:8 },
  th: {
    background:'#eaf0fb', border:'1px solid #c5d5ea',
    padding:'4px 6px', textAlign:'center', fontWeight:'bold', color:'#1a3a6b',
  },
  td: { border:'1px solid #dde6f0', padding:'3px 6px', textAlign:'center', color:'#222' },
  tdLabel: { border:'1px solid #dde6f0', padding:'3px 8px', textAlign:'left', color:'#333', fontStyle:'italic' },
  tagRow: { display:'flex', flexWrap:'wrap', gap:10, padding:'10px 14px' },
  tag: { background:'#f0f5ff', border:'1px solid #c5d5ea', borderRadius:4, padding:'6px 12px', display:'flex', flexDirection:'column', alignItems:'center', minWidth:140 },
  tagLabel: { fontSize:10, color:'#555' },
  tagValue: { fontSize:15, fontWeight:'bold', color:'#1a3a6b' },
};

export default GlobalRetroReport;
