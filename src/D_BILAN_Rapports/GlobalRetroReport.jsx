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
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Map node label → truthy = has a retro report available
const RETRO_REPORT_MAP = {
  RK:           true,
  STACK:        true,
  BHF:          true,
  COOLINGTOWER: true,
  CYCLONE:      true,
  DENOX:        true,
  ELECTROFILTER:true,
  FB:           true,
  GF:           true,
  IDFAN:        true,
  QUENCH:       true,
  SCRUBBER:     true,
  REACTOR:      true,
  WHB:          true,
};


const EQUIPMENT_ORDER = [
  'RK', 'FB', 'WHB', 'QUENCH', 'DENOX', 'BHF',
  'REACTOR', 'SCRUBBER', 'ELECTROFILTER', 'CYCLONE',
  'COOLINGTOWER', 'IDFAN', 'STACK',
];

// ─── Combustion Diagram Section ───────────────────────────────────────────────

const loadPt = (key, def) => {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : def;
  } catch { return def; }
};

const CombustionDiagramSection = () => {
  const pA = loadPt('pointA', { x: 100, y: 2 });
  const pB = loadPt('pointB', { x: 150, y: 10 });
  const pC = loadPt('pointC', { x: 800, y: 10 });
  const pD = loadPt('pointD', { x: 300, y: 2 });
  const pE = loadPt('pointE', { x: 500, y: 8 });

  const isBelow = pA.y < pB.y * 0.4 || pD.y < pC.y * 0.4;

  const chartData = {
    datasets: [
      {
        type: 'line',
        label: 'Domaine opératoire',
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
        label: 'Point E — résultat rétro-calcul',
        data: [pE],
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
        text: 'Diagramme de combustion — Domaine opératoire',
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
          text: 'Débit déchets [kg/h]',
          font: { size: 13, weight: 'bold' },
        },
        grid: { color: 'rgba(0,0,0,0.07)' },
      },
      y: {
        min: 0,
        title: {
          display: true,
          text: 'Puissance incinérateur [MW]',
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
    { pt: 'E', role: 'Point de calcul rétro',     color: 'orange', d: pE },
  ];

  return (
    <div style={diagStyles.wrapper}>
      <div style={diagStyles.header}>
        <span style={diagStyles.headerIcon}>🔥</span>
        <span style={diagStyles.headerTitle}>Diagramme de combustion — Positionnement du point de calcul</span>
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
              <th style={{ ...diagStyles.th, width: 50 }}>Point</th>
              <th style={{ ...diagStyles.th, textAlign: 'left' }}>Rôle</th>
              <th style={diagStyles.th}>Débit [kg/h]</th>
              <th style={diagStyles.th}>Puissance [MW]</th>
            </tr>
          </thead>
          <tbody>
            {pointRows.map(({ pt, role, color, d }) => (
              <tr key={pt} style={{ background: pt === 'E' ? '#fff8e8' : '#fff' }}>
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

const GlobalRetroReport = ({ nodes, onClose }) => {
  const reportRef = useRef();
  const [generating, setGenerating] = useState(false);

  const activeNodes = [...nodes]
    .filter(n => n.data?.isActive && RETRO_REPORT_MAP[n.data?.label])
    .sort((a, b) => {
      const ia = EQUIPMENT_ORDER.indexOf(a.data.label);
      const ib = EQUIPMENT_ORDER.indexOf(b.data.label);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

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

          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, PW, PH);
          continue;
        }

        // ── Other sections: sliding window ────────────────────────────────────
        const canvas = await html2canvas(sections[i], {
          scale: 2, useCORS: true, logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData   = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * PW) / canvas.width;

        let position   = 0;
        let heightLeft = imgHeight;

        pdf.addImage(imgData, 'PNG', 0, position, PW, imgHeight);
        heightLeft -= PH;

        while (heightLeft > 0) {
          position -= PH;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, PW, imgHeight);
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
            Rapport Global — Rétro-calcul des équipements
          </h2>
          <div style={styles.headerActions}>
            <span style={styles.nodeCount}>
              {activeNodes.length} équipement{activeNodes.length !== 1 ? 's' : ''} actif{activeNodes.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={generatePDF}
              disabled={generating || activeNodes.length === 0}
              style={{
                ...styles.btn, ...styles.btnPdf,
                ...(generating || activeNodes.length === 0 ? styles.btnDisabled : {}),
              }}
            >
              {generating ? '⏳ Génération...' : '⬇ Télécharger PDF'}
            </button>
            <button onClick={onClose} style={{ ...styles.btn, ...styles.btnClose }}>
              ✕ Fermer
            </button>
          </div>
        </div>

        {/* ── Zone scrollable ──────────────────────────────────────────────── */}
        <div style={styles.scrollArea}>
          {activeNodes.length === 0 ? (
            <div style={styles.empty}>
              <p>
                Aucun équipement rétro actif avec rapport disponible.<br />
                Ouvrez un nœud (RK, STACK…), effectuez un calcul, puis revenez au flow.
              </p>
            </div>
          ) : (
            <div ref={reportRef} style={styles.reportContent}>

              {/* Page de couverture */}
              <div data-pdf-section style={styles.coverPage}>
                <div style={styles.coverLogo}>⚙</div>
                <h1 style={styles.coverTitle}>Rapport de Rétro-calcul — Incinération</h1>
                <p style={styles.coverDate}>
                  Généré le {new Date().toLocaleDateString('fr-FR', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
                <div style={styles.coverEquipList}>
                  <h3 style={styles.coverEquipTitle}>Équipements inclus :</h3>
                  {activeNodes.map(n => (
                    <div key={n.id} style={styles.coverEquipItem}>
                      ▸ {n.data.label}{n.data.title ? ` — ${n.data.title}` : ''}
                    </div>
                  ))}
                </div>
              </div>

              {/* Une section par nœud actif */}
              {activeNodes.map((node, idx) => {

                const hasResult = !!node.data.result;

                return (
                  <div key={node.id} data-pdf-section style={styles.equipSection}>
                    <div style={styles.equipSeparator}>
                      <span style={styles.equipIndex}>{idx + 1}</span>
                      <span style={styles.equipLabel}>{node.data.label}</span>
                      {node.data.title && (
                        <span style={styles.equipTitle}> — {node.data.title}</span>
                      )}
                    </div>

                    {hasResult ? (
                      /* Render inline report body (no modal chrome) */
                      <ReportBody node={node} />
                    ) : (
                      <div style={styles.noData}>
                        Aucun résultat disponible — ouvrir le nœud, lancer un calcul
                        et revenir au flow.
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Diagramme de combustion — toujours en dernier */}
              <div data-pdf-section style={styles.diagSection}>
                <CombustionDiagramSection />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Renders only the inner report content (no modal overlay) ──────────────────
const ReportBody = ({ node }) => {
  const label = node.data.label;
  const result    = node.data.result    || {};
  const inputData = node.data.inputData || {};

  if (label === 'RK') {
    return (
      <RKReportBody
        calculationResult={result}
        inputParams={inputData}
      />
    );
  }
  if (label === 'STACK')        return <STACKReportBody        calculationResult={result} inputParams={inputData} />;
  if (label === 'BHF')          return <BHFReportBody          calculationResult={result} inputParams={inputData} />;
  if (label === 'COOLINGTOWER') return <COOLINGTOWERReportBody calculationResult={result} inputParams={inputData} />;
  if (label === 'CYCLONE')      return <CYCLONEReportBody      calculationResult={result} inputParams={inputData} />;
  if (label === 'DENOX')        return <DENOXReportBody        calculationResult={result} inputParams={inputData} />;
  if (label === 'ELECTROFILTER')return <ELECTROFILTERReportBody calculationResult={result} inputParams={inputData} />;
  if (label === 'FB')           return <FBReportBody           calculationResult={result} inputParams={inputData} />;
  if (label === 'GF')           return <GFReportBody           calculationResult={result} inputParams={inputData} />;
  if (label === 'IDFAN')        return <IDFANReportBody        calculationResult={result} inputParams={inputData} />;
  if (label === 'QUENCH')       return <QUENCHReportBody       calculationResult={result} inputParams={inputData} />;
  if (label === 'SCRUBBER')     return <SCRUBBERReportBody     calculationResult={result} inputParams={inputData} />;
  if (label === 'REACTOR')      return <REACTORReportBody      calculationResult={result} inputParams={inputData} />;
  if (label === 'WHB')          return <WHBReportBody          calculationResult={result} inputParams={inputData} />;
  return null;
};

// ── Inline body for RK (copy of RK_Retro_Rapport content without modal) ───────
const fmt = (v, d = 2) => { const n = parseFloat(v); return isNaN(n) ? '—' : n.toFixed(d); };

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

const GasTableRK = ({ df }) => {
  const rows = [
    { name: 'CO₂', nm3h: df.Qv_CO2_Nm3_h, kgh: df.Qm_CO2_kg_h, pW: df.CO2_humide_pourcent, pD: df.CO2_dry_pourcent },
    { name: 'H₂O', nm3h: df.Qv_H2O_Nm3_h, kgh: df.Qm_H2O_kg_h, pW: df.H2O_pourcent,        pD: undefined },
    { name: 'O₂',  nm3h: df.Qv_O2_Nm3_h,  kgh: df.Qm_O2_kg_h,  pW: df.O2_humide_pourcent,  pD: df.O2_dry_pourcent },
    { name: 'N₂',  nm3h: df.Qv_N2_Nm3_h,  kgh: df.Qm_N2_kg_h,  pW: df.N2_humide_pourcent,  pD: undefined },
  ];
  return (
    <table style={bodyStyles.table}>
      <thead>
        <tr>
          {['Composant','Nm³/h','kg/h','% vol (humide)','% vol (sec)'].map(h =>
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
          <td style={bodyStyles.tdLabel}>Total</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.nm3h)||0),0),0)}</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.kgh)||0),0),0)}</td>
          <td style={bodyStyles.td}>—</td><td style={bodyStyles.td}>—</td>
        </tr>
      </tbody>
    </table>
  );
};

const RKReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const p  = inputParams || {};
  const isWithWHB = p.bilanType_whb === 'WITH_WHB';
  const isNCV     = p.bilanType_NCV_Masse === 'NET_CALORIFIC_VALUE';
  const NCV_kJ_kg = (parseFloat(r.NCV) || 0) * 4.1868;

  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Four tournant (RK) — Rétro-calcul</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="Mode"          value={isWithWHB ? 'Avec WHB' : 'Sans WHB'} />
            <KV label="Type bilan"    value={isNCV ? 'NCV connu → débit' : 'Débit connu → NCV'} />
            <KV label="Température air" value={fmt(p.Tair_RK_C, 1)} unit="°C" />
            <KV label="Pertes thermiques" value={fmt(p.Thermal_losses_MW, 2)} unit="MW" />
          </Sub>
          <Sub title="Données combustion">
            {isNCV
              ? <KV label="PCI (donné)"     value={fmt(p.NCV_kcal_kg, 0)} unit="kcal/kg" />
              : <KV label="Débit (donné)"   value={fmt(p.Masse_dechet_kg_h, 0)} unit="kg/h" />}
          </Sub>
        </div>
      </Section>
      <Section title="2. Gaz de fumée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Débits">
            <KV label="Humide"  value={fmt(df.Qv_wet_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Sec"     value={fmt(df.Qv_sec_Nm3_h, 0)} unit="Nm³/h" />
            <KV label="Réel"    value={fmt(r.Qv_wet_m3_h, 0)}   unit="m³/h"  />
          </Sub>
          <Sub title="Enthalpie">
            <KV label="H sortie" value={fmt(df.H_tot_kW, 0)} unit="kW" />
            {!isWithWHB && <KV label="H air entrée" value={fmt(r.H_air_kW, 0)} unit="kW" />}
          </Sub>
        </div>
        <Sub title="Composition">
          <GasTableRK df={df} />
        </Sub>
      </Section>
      <Section title="3. Résultats rétro-calcul">
        <div style={bodyStyles.twoCol}>
          <Sub title="Énergie">
            <KV label="Puissance incinérateur" value={fmt(r.P_incinerateur_MWH, 3)} unit="MW" />
          </Sub>
          <Sub title="Déchets">
            <KV label="Débit déchets" value={fmt(r.MasseDechet, 0)}  unit="kg/h"    />
            <KV label="PCI"           value={fmt(r.NCV, 0)}           unit="kcal/kg" />
            <KV label="PCI"           value={fmt(NCV_kJ_kg, 0)}       unit="kJ/kg"   />
          </Sub>
        </div>
      </Section>
    </div>
  );
};

const GasTableSTACK = ({ df }) => {
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
          <td style={bodyStyles.tdLabel}>Total</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.nm3h)||0),0),0)}</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.kgh)||0),0),0)}</td>
          <td style={bodyStyles.td}>{fmt(rows.reduce((s,r)=>s+(parseFloat(r.hkj)||0),0),0)}</td>
          <td style={bodyStyles.td}>—</td><td style={bodyStyles.td}>—</td>
        </tr>
      </tbody>
    </table>
  );
};

const STACKReportBody = ({ calculationResult, inputParams }) => {
  const df = calculationResult?.dataFlow || {};
  const p  = inputParams || {};

  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Cheminée (STACK) — Rétro-calcul</h1>
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
          <GasTableSTACK df={df} />
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
const BHFReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataBHF || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Filtre à manches (BHF) — Rétro-calcul</h1>
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
            <KV label="Q air parasite" value={fmt(d.Qair_parasite, 0)}         unit="Nm³/h" />
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
            { label:'Q air décolmatage [Nm³/h]', val:fmt(d.Qv_air_entrant_Nm3_h,0), color:'#4a90e2' },
            { label:'Q air parasite [Nm³/h]',    val:fmt(d.Qair_parasite,0),          color:'#e74c3c' },
            { label:'PDC aéro [mmCE]',            val:fmt(d.PDC_aero,0),               color:'#2ecc71' },
            { label:'T amont [°C]',               val:fmt(df.T,1),                     color:'#f39c12' },
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
const COOLINGTOWERReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataCOOLINGTOWER || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Tour de refroidissement (COOLING TOWER) — Rétro-calcul</h1>
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
            { label:'T finale [°C]',            val:fmt(d.T_final,1),                  color:'#e74c3c' },
            { label:'H vapeur [kW]',            val:fmt(d.H_vapeur_kW,1),              color:'#4a90e2' },
            { label:'H intermédiaire [kW]',     val:fmt(d.H_tot_intermediaire_kW,1),   color:'#2ecc71' },
            { label:'T intermédiaire [°C]',     val:fmt(d.T_intermediaire,1),           color:'#f39c12' },
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
const CYCLONEReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataCYCLONE || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Cyclone — Rétro-calcul</h1>
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
            <KV label="Q air parasite" value={fmt(d.Qair_parasite, 0)}           unit="Nm³/h" />
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
            { label:'Q air entrant [Nm³/h]', val:fmt(d.Qv_air_entrant_Nm3_h,0), color:'#4a90e2' },
            { label:'Q air parasite [Nm³/h]', val:fmt(d.Qair_parasite,0),        color:'#e74c3c' },
            { label:'PDC aéro [mmCE]',         val:fmt(p.PDC_aero,0),            color:'#2ecc71' },
            { label:'T amont [°C]',            val:fmt(df.T,1),                  color:'#f39c12' },
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
const DENOXReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataDENOX || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>DeNOx — Rétro-calcul</h1>
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
            { label:'NOx cible [mg/Nm³]',      val:fmt(p.targetNOx,0),                         color:'#e74c3c' },
            { label:'NOx mesuré [mg/Nm³]',     val:fmt(d.NOx_concentration_mg_Nm3,0),           color:'#f39c12' },
            { label:'NH₃ injecté [mol/h]',     val:fmt(d.Quantite_NH3_mol_h,0),                color:'#4a90e2' },
            { label:'Conso réactif [kg/h]',    val:fmt(d.Conso_stoechio_reactif_kg_h,2),       color:'#2ecc71' },
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
const ELECTROFILTERReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataELECTROFILTER || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Électrofiltre — Rétro-calcul</h1>
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
            <KV label="Q air parasite" value={fmt(d.Qair_parasite, 0)}           unit="Nm³/h" />
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
            { label:'Q air entrant [Nm³/h]',  val:fmt(d.Qv_air_entrant_Nm3_h,0), color:'#4a90e2' },
            { label:'Q air parasite [Nm³/h]', val:fmt(d.Qair_parasite,0),          color:'#e74c3c' },
            { label:'PDC aéro [mmCE]',         val:fmt(p.PDC_aero,0),              color:'#2ecc71' },
            { label:'T amont [°C]',            val:fmt(df.T,1),                    color:'#f39c12' },
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
const FBReportBody = ({ calculationResult, inputParams }) => {
  const r = calculationResult || {};
  const p = inputParams || {};
  const NCV_kJ_kg = (parseFloat(r.calculatePCIkcalkg) || 0) * 4.1868;
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Four à lit fluidisé (FB) — Rétro-calcul</h1>
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
            { label:'Puissance [MW]',  val:fmt(r.P_incinerateur_MWH,3),   color:'#e74c3c' },
            { label:'Q boue [kg/h]',   val:fmt(r.Qboue_kg_h,0),           color:'#2ecc71' },
            { label:'PCI [kcal/kg]',   val:fmt(r.calculatePCIkcalkg,0),   color:'#f39c12' },
            { label:'PCI [kJ/kg]',     val:fmt(NCV_kJ_kg,0),              color:'#f39c12' },
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
const GFReportBody = ({ calculationResult, inputParams }) => {
  const r       = calculationResult || {};
  const p       = inputParams || {};
  const INCI    = r.INCI || {};
  const airComb = r.data_air_comb || {};
  const PCI_kJ_kg = (parseFloat(r.PCI_kCal_kg) || 0) * 4.1868;
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Four à grille (GF) — Rétro-calcul</h1>
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
            { label:'Puissance [MW]',             val:fmt((parseFloat(r.P_incinerateur_kWH)||0)/1000,3), color:'#e74c3c' },
            { label:'PCI [kcal/kg]',              val:fmt(r.PCI_kCal_kg,0),                             color:'#f39c12' },
            { label:'Énergie récupérée [kW]',     val:fmt(INCI.Energie_recuperee_chaudiere_kW,0),       color:'#4a90e2' },
            { label:'Rendement WHB [%]',          val:fmt(INCI.WHB_yield_pourcent,1),                   color:'#2ecc71' },
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
const IDFANReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.Id_fan || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Ventilateur tirage induit (ID FAN) — Rétro-calcul</h1>
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
            { label:'Puissance élec. [kW]',    val:fmt(d.P_elec,2),              color:'#e74c3c' },
            { label:'Chaleur dissipée [kW]',   val:fmt(d.Pth_chaleur_dissipee,2), color:'#f39c12' },
            { label:'P sortie [mmCE]',         val:fmt(d.P_out_mmCE,0),           color:'#4a90e2' },
            { label:'Rdt élec. [%]',           val:fmt(p.Rdt_elec,1),             color:'#2ecc71' },
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
const QUENCHReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataQUENCH || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Quench — Rétro-calcul</h1>
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
            { label:'Q eau [kg/h]',      val:fmt(d.Qeau,1),        color:'#4a90e2' },
            { label:'T sortie [°C]',     val:fmt(df.T,1),           color:'#e74c3c' },
            { label:'PDC aéro [mmCE]',   val:fmt(d.PDC_aero,0),    color:'#2ecc71' },
            { label:'P sortie [mmCE]',   val:fmt(d.P_out_mmCE,0),  color:'#f39c12' },
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
const SCRUBBERReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const p  = inputParams || {};
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Laveur de gaz (SCRUBBER) — Rétro-calcul</h1>
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
            { label:'Débit humide [Nm³/h]', val:fmt(df.Qv_wet_Nm3_h,0), color:'#4a90e2' },
            { label:'T sortie [°C]',        val:fmt(df.T,1),              color:'#e74c3c' },
            { label:'Enthalpie [kW]',       val:fmt(df.H_tot_kW,0),      color:'#2ecc71' },
            { label:'PDC [mmCE]',           val:fmt(p.PDC_aero,0),       color:'#f39c12' },
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
const REACTORReportBody = ({ calculationResult, inputParams }) => {
  const r  = calculationResult || {};
  const df = r.dataFlow || {};
  const d  = r.dataREACTOR || {};
  const p  = inputParams || {};
  const isCAP = (p.reagentType || 'CAP') === 'CAP';
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Réacteur (REACTOR) — Rétro-calcul</h1>
      <Section title="1. Paramètres d'entrée">
        <div style={bodyStyles.twoCol}>
          <Sub title="Conditions">
            <KV label="Type réactif"       value={p.reagentType || '—'}          />
            <KV label="T fumées amont"     value={fmt(p.T_amont_REACTOR, 1)} unit="°C"   />
            <KV label="T air"              value={fmt(p.T_air, 1)}            unit="°C"   />
            <KV label="PDC aérodynamique"  value={fmt(p.PDC_aero, 0)}         unit="mmCE" />
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
            { label:'Q air entrant [Nm³/h]', val:fmt(d.Qv_air_entrant_tot_Nm3_h,0), color:'#4a90e2' },
            { label:'Conso CAP [kg/h]',      val:fmt(d.conso_CAP_calcul_kg_h,2),     color:'#e74c3c' },
            { label:'Conso chaux [kg/h]',    val:fmt(d.conso_LIME_calcul_kg_h,2),    color:'#f39c12' },
            { label:'PDC [mmCE]',            val:fmt(p.PDC_aero,0),                  color:'#2ecc71' },
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
const WHBReportBody = ({ calculationResult, inputParams }) => {
  const r   = calculationResult || {};
  const df  = r.dataFlow || {};
  const air = r.data_Air_WHB || {};
  const vap = r.data_vapeur_WHB || {};
  const eau = r.data_eau_alim_WHB || {};
  const p   = inputParams || {};
  const isSuperheated = (p.bilanTypeVapeur || air.bilanTypeVapeur) === 'SUPERHEATED_STEAM';
  return (
    <div style={bodyStyles.body}>
      <h1 style={bodyStyles.mainTitle}>Chaudière de récupération (WHB) — Rétro-calcul</h1>
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
            { label:'Énergie récupérée [kW]', val:fmt(air.Energie_recuperee_WHB_kW,0), color:'#e74c3c' },
            { label:'Q vapeur [kg/h]',        val:fmt(vap.Q_vapeur_calculee_kg_h,0),   color:'#4a90e2' },
            { label:'T aval [°C]',            val:fmt(air.Taval_WHB,1),                color:'#f39c12' },
            { label:'P vapeur [bar]',         val:fmt(p.P_vapeur_bar,1),               color:'#2ecc71' },
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
