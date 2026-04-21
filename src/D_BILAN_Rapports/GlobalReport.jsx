import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { getOpexData } from '../A_Transverse_fonction/opexDataService';

import RK_Report from '../Y_BILAN/RK/RK_Report';
import BHF_Report from '../Y_BILAN/BHF/BHF_Report';
import COOLINGTOWER_Report from '../Y_BILAN/COOLINGTOWER/COOLINGTOWER_Report';
import CYCLONE_Report from '../Y_BILAN/CYCLONE/CYCLONE_Report';
import DENOX_Report from '../Y_BILAN/DENOX/DENOX_Report';
import ELECTROFILTER_Report from '../Y_BILAN/ELECTROFILTER/ELECTROFILTER_Report';
import IDFAN_Report from '../Y_BILAN/IDFAN/IDFAN_Report';
import QUENCH_Report from '../Y_BILAN/QUENCH/QUENCH_Report';
import REACTOR_Report from '../Y_BILAN/REACTOR/REACTOR_Report';
import SCRUBBER_Report from '../Y_BILAN/SCRUBBER/SCRUBBER_Report';
import STACK_Report from '../Y_BILAN/STACK/STACK_Report';
import WHB_Report from '../Y_BILAN/WHB/WHB_Report';

const REPORT_MAP = {
  RK: RK_Report,
  BHF: BHF_Report,
  COOLINGTOWER: COOLINGTOWER_Report,
  CYCLONE: CYCLONE_Report,
  DENOX: DENOX_Report,
  ELECTROFILTER: ELECTROFILTER_Report,
  IDFAN: IDFAN_Report,
  QUENCH: QUENCH_Report,
  REACTOR: REACTOR_Report,
  SCRUBBER: SCRUBBER_Report,
  STACK: STACK_Report,
  WHB: WHB_Report,
};

const EQUIPMENT_ORDER = ['RK', 'FB', 'WHB', 'QUENCH', 'DENOX', 'BHF', 'REACTOR', 'SCRUBBER', 'ELECTROFILTER', 'CYCLONE', 'COOLINGTOWER', 'IDFAN', 'STACK'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt2 = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? '0.00' : n.toFixed(2);
};

const fmtInt = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return '0';
  return Math.round(n).toLocaleString('fr-FR');
};

// ─── OPEX Summary Section ─────────────────────────────────────────────────────

const OpexSummarySection = ({ nodes }) => {
  const {
    purchaseElectricityPrice,
    availability,
    currency,
    waterPrices,
    reagentsTypes,
    gasTypes,
    fuelTypes,
    airConsumptionPrice,
  } = getOpexData();

  const sum = (field) =>
    nodes.reduce((s, n) => s + (parseFloat(n.data?.result?.[field]) || 0), 0);

  // ── Aggregate consumptions ──
  const consoElec_kW =
    [1, 2, 3, 4, 5, 6, 7, 8].reduce((s, i) => s + sum(`consoElec${i}`), 0);

  const conso_air_Nm3h = sum('conso_air_co_N_m3');

  const cout_eau =
    sum('Conso_EauPotable_m3')       * (waterPrices?.potable       || 0) +
    sum('Conso_EauRefroidissement_m3')* (waterPrices?.cooling       || 0) +
    sum('Conso_EauDemin_m3')          * (waterPrices?.demineralized || 0) +
    sum('Conso_EauRiviere_m3')        * (waterPrices?.river         || 0) +
    sum('Conso_EauAdoucie_m3')        * (waterPrices?.soft          || 0);

  const cout_reactifs =
    (sum('Conso_CaCO3_kg')     / 1000) * (reagentsTypes?.CaCO3?.cost      || 0) +
    (sum('Conso_CaO_kg')       / 1000) * (reagentsTypes?.CaO?.cost        || 0) +
    (sum('Conso_CaOH2_dry_kg') / 1000) * (reagentsTypes?.CaOH2?.cost      || 0) +
    (sum('Conso_CaOH2_wet_kg') / 1000) * (reagentsTypes?.CaOH2?.cost      || 0) +
    (sum('Conso_NaOH_kg')      / 1000) * (reagentsTypes?.NaOH?.cost       || 0) +
    (sum('Conso_NaOHCO3_kg')   / 1000) * (reagentsTypes?.NaOHCO3?.cost    || 0) +
    (sum('Conso_Ammonia_kg')   / 1000) * (reagentsTypes?.NH3?.cost        || 0) +
    (sum('Conso_CAP_kg')       / 1000) * (reagentsTypes?.CAP?.cost        || 0) +
    (sum('Conso_NaBrCaBr2_kg') / 1000) * (reagentsTypes?.NaBr_CaBr2?.cost || 0);

  const cout_gaz =
    sum('conso_gaz_H_MW')      * (gasTypes?.naturalGasH?.molecule || 0) +
    sum('conso_gaz_L_MW')      * (gasTypes?.naturalGasL?.molecule || 0) +
    sum('conso_gaz_Process_MW')* (gasTypes?.processGas?.molecule  || 0);

  const cout_fuel = sum('conso_fuel_MW') * (fuelTypes?.FOD?.liquid || 0);

  const cout_elec  = (consoElec_kW / 1000) * (purchaseElectricityPrice || 0);
  const cout_air   = (conso_air_Nm3h / 1000) * (airConsumptionPrice || 0);
  const cout_transport =
    sum('cout_transport_reactifs') +
    sum('cout_transport_incineratino_ash') +
    sum('cout_transport_boiler_ash') +
    sum('cout_transport_fly_ash');

  const total_h  = cout_elec + cout_air + cout_eau + cout_reactifs + cout_gaz + cout_fuel + cout_transport;
  const total_an = total_h * (availability || 8760);
  const curr     = currency || '€';

  const rows = [
    { label: 'Électricité',         hourly: cout_elec,              bg: '#edf4ff' },
    { label: 'Air comprimé',        hourly: cout_air,               bg: '#fff'    },
    { label: 'Eau',                 hourly: cout_eau,               bg: '#edf4ff' },
    { label: 'Réactifs chimiques',  hourly: cout_reactifs,          bg: '#fff'    },
    { label: 'Gaz / Combustible',   hourly: cout_gaz + cout_fuel,   bg: '#edf4ff' },
    { label: 'Transport / Résidus', hourly: cout_transport,         bg: '#fff'    },
  ];

  return (
    <div style={opexStyles.wrapper}>
      {/* Section header */}
      <div style={opexStyles.header}>
        <span style={opexStyles.headerIcon}>📊</span>
        <span style={opexStyles.headerTitle}>Synthèse des coûts OPEX — Total Process</span>
      </div>

      <div style={opexStyles.body}>
        {/* Main cost table */}
        <table style={opexStyles.table}>
          <thead>
            <tr>
              <th style={{ ...opexStyles.th, textAlign: 'left', width: '35%' }}>Poste de coût</th>
              <th style={opexStyles.th}>Coût horaire<br /><span style={opexStyles.unit}>({curr}/h)</span></th>
              <th style={opexStyles.th}>Coût annuel<br /><span style={opexStyles.unit}>({curr}/an)</span></th>
              <th style={{ ...opexStyles.th, width: '15%' }}>Part du total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const pct = total_h > 0 ? (row.hourly / total_h) * 100 : 0;
              return (
                <tr key={i} style={{ background: row.bg }}>
                  <td style={opexStyles.tdLabel}>{row.label}</td>
                  <td style={opexStyles.tdNum}>{fmt2(row.hourly)}</td>
                  <td style={opexStyles.tdNum}>{fmtInt(row.hourly * (availability || 8760))}</td>
                  <td style={opexStyles.tdPct}>
                    <div style={opexStyles.barWrap}>
                      <div style={{ ...opexStyles.bar, width: `${Math.min(pct, 100)}%` }} />
                      <span style={opexStyles.barLabel}>{fmt2(pct)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {/* Total row */}
            <tr style={opexStyles.totalRow}>
              <td style={{ ...opexStyles.tdLabel, color: '#fff', fontWeight: 'bold' }}>TOTAL</td>
              <td style={{ ...opexStyles.tdNum, color: '#fff', fontWeight: 'bold' }}>{fmt2(total_h)}</td>
              <td style={{ ...opexStyles.tdNum, color: '#fff', fontWeight: 'bold' }}>{fmtInt(total_an)}</td>
              <td style={{ ...opexStyles.tdNum, color: '#fff', fontWeight: 'bold' }}>100%</td>
            </tr>
          </tbody>
        </table>

        {/* Footer note */}
        <div style={opexStyles.note}>
          Disponibilité annuelle : {availability || 8760} h/an &nbsp;·&nbsp; Devise : {curr} &nbsp;·&nbsp;
          Prix électricité : {purchaseElectricityPrice} {curr}/MWh
        </div>
      </div>
    </div>
  );
};

const opexStyles = {
  wrapper: {
    margin: '0',
    background: '#fff',
    pageBreakInside: 'avoid',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: 'linear-gradient(90deg, #1a3a6b 0%, #2c5aa0 100%)',
    color: '#fff', padding: '14px 20px',
  },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },
  body: {
    border: '1px solid #c5d5ea', borderTop: 'none',
    padding: '20px',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 12 },
  th: {
    background: '#eaf0fb', padding: '9px 12px',
    border: '1px solid #c5d5ea', textAlign: 'right',
    fontWeight: 'bold', fontSize: 12,
  },
  tdLabel: {
    padding: '8px 12px', border: '1px solid #e8eef6',
    fontWeight: '500', color: '#1a3a6b',
  },
  tdNum: {
    padding: '8px 12px', border: '1px solid #e8eef6',
    textAlign: 'right', fontVariantNumeric: 'tabular-nums',
  },
  tdPct: { padding: '8px 12px', border: '1px solid #e8eef6' },
  barWrap: { display: 'flex', alignItems: 'center', gap: 6 },
  bar: {
    height: 10, background: '#4a90e2', borderRadius: 3,
    transition: 'width 0.3s', minWidth: 2,
  },
  barLabel: { fontSize: 11, color: '#555', whiteSpace: 'nowrap' },
  totalRow: { background: '#1a3a6b' },
  unit: { fontWeight: 'normal', fontSize: 11 },
  note: {
    fontSize: 11, color: '#888',
    borderTop: '1px solid #e8eef6', paddingTop: 10, marginTop: 4,
  },
};

// ─── GlobalReport ─────────────────────────────────────────────────────────────

const GlobalReport = ({ nodes, onClose }) => {
  const reportRef = useRef();
  const [generating, setGenerating] = useState(false);

  const activeNodes = [...nodes]
    .filter(n => n.data?.isActive && REPORT_MAP[n.data?.label])
    .sort((a, b) => {
      const ia = EQUIPMENT_ORDER.indexOf(a.data.label);
      const ib = EQUIPMENT_ORDER.indexOf(b.data.label);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

  // ── PDF generation — block-level capture to avoid mid-table cuts ─────────
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

      // Current Y on the active PDF page (mm from top)
      let pageY = 0;

      // ── Place one element: adds new page if needed, handles overflow ────────
      const placeEl = async (el, bgColor = '#ffffff') => {
        const canvas = await html2canvas(el, {
          scale: 2, useCORS: true, logging: false,
          backgroundColor: bgColor,
        });
        if (!canvas.width || !canvas.height) return;

        const imgData = canvas.toDataURL('image/png');
        const blockH  = (canvas.height / canvas.width) * PW;

        // If block won't fit on current page (and page isn't empty), go to next page
        if (pageY > 0 && pageY + blockH > PH) {
          pdf.addPage();
          pageY = 0;
        }

        pdf.addImage(imgData, 'PNG', 0, pageY, PW, blockH);

        if (pageY + blockH > PH) {
          // Block overflows the page — sliding window for the rest
          let heightLeft = blockH - (PH - pageY);
          let pos        = pageY - PH;
          while (heightLeft > 0) {
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, pos, PW, blockH);
            pos       -= PH;
            heightLeft -= PH;
          }
          pageY = (pageY + blockH) % PH;
        } else {
          pageY += blockH;
        }
      };

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        // Every section (except the first) starts on a fresh page
        if (i > 0) {
          pdf.addPage();
          pageY = 0;
        }

        // ── Cover page: force exact A4 height so it fills the page ───────────
        if (i === 0) {
          const sectionW   = section.offsetWidth;
          const a4PxHeight = Math.round(sectionW * PH / PW);
          const savedH     = section.style.height;
          section.style.height = `${a4PxHeight}px`;

          const canvas = await html2canvas(section, {
            scale: 2, useCORS: true, logging: false,
            backgroundColor: '#1a3a6b',
          });
          section.style.height = savedH;

          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, PW, PH);
          pageY = PH;
          continue;
        }

        // ── Equipment sections: capture each report block individually ────────
        const blocksParent = section.querySelector('[data-pdf-blocks-parent]');
        if (blocksParent) {
          const separator  = section.querySelector('[data-pdf-separator]');
          const reportRoot = blocksParent.firstElementChild;

          const blockEls = [
            ...(separator  ? [separator]                     : []),
            ...(reportRoot ? Array.from(reportRoot.children) : [section]),
          ];

          for (const el of blockEls) {
            await placeEl(el);
          }
          continue;
        }

        // ── Default (OPEX): whole-section sliding window ──────────────────────
        const canvas = await html2canvas(section, {
          scale: 2, useCORS: true, logging: false,
          backgroundColor: '#ffffff',
        });
        const imgData = canvas.toDataURL('image/png');
        const imgH    = (canvas.height / canvas.width) * PW;

        pdf.addImage(imgData, 'PNG', 0, 0, PW, imgH);
        pageY = imgH;

        let heightLeft = imgH - PH;
        let pos        = -PH;
        while (heightLeft > 0) {
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, pos, PW, imgH);
          pos       -= PH;
          heightLeft -= PH;
        }
        pageY = imgH % PH || imgH;
      }

      const date = new Date().toISOString().slice(0, 10);
      pdf.save(`rapport_global_${date}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Rapport Global — Synthèse des équipements</h2>
          <div style={styles.headerActions}>
            <span style={styles.nodeCount}>
              {activeNodes.length} équipement{activeNodes.length > 1 ? 's' : ''} actif{activeNodes.length > 1 ? 's' : ''}
            </span>
            <button
              onClick={generatePDF}
              disabled={generating || activeNodes.length === 0}
              style={{ ...styles.btn, ...styles.btnPdf, ...(generating ? styles.btnDisabled : {}) }}
            >
              {generating ? '⏳ Génération...' : '⬇ Télécharger PDF'}
            </button>
            <button onClick={onClose} style={{ ...styles.btn, ...styles.btnClose }}>
              ✕ Fermer
            </button>
          </div>
        </div>

        {/* Scrollable preview area */}
        <div style={styles.scrollArea}>
          {activeNodes.length === 0 ? (
            <div style={styles.empty}>
              <p>Aucun équipement actif. Ouvrez un équipement, configurez-le et revenez au flow pour activer son rapport.</p>
            </div>
          ) : (
            <div ref={reportRef} style={styles.reportContent}>

              {/* Cover page */}
              <div data-pdf-section style={styles.coverPage}>
                <div style={styles.coverLogo}>⚙</div>
                <h1 style={styles.coverTitle}>Rapport de Process — Incinération</h1>
                <p style={styles.coverDate}>
                  Généré le {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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

              {/* One section per active node */}
              {activeNodes.map((node, idx) => {
                const Component = REPORT_MAP[node.data.label];
                return (
                  <div key={node.id} data-pdf-section style={styles.equipSection}>
                    <div data-pdf-separator style={styles.equipSeparator}>
                      <span style={styles.equipIndex}>{idx + 1}</span>
                      <span style={styles.equipLabel}>{node.data.label}</span>
                    </div>
                    <div data-pdf-blocks-parent>
                      <Component innerData={node.data.result || {}} />
                    </div>
                  </div>
                );
              })}

              {/* OPEX summary — always last */}
              <div data-pdf-section style={styles.opexSection}>
                <OpexSummarySection nodes={activeNodes} />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 9999, display: 'flex', alignItems: 'stretch', justifyContent: 'center',
    padding: '20px',
  },
  modal: {
    background: '#fff', borderRadius: 8, display: 'flex', flexDirection: 'column',
    width: '100%', maxWidth: 1200, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', background: '#1a3a6b', flexShrink: 0,
  },
  headerTitle: { margin: 0, fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerActions: { display: 'flex', gap: 10, alignItems: 'center' },
  nodeCount: { color: '#adc8f0', fontSize: 13 },
  btn: {
    padding: '8px 16px', border: 'none', borderRadius: 4, cursor: 'pointer',
    fontWeight: 'bold', fontSize: 13,
  },
  btnPdf: { background: '#27ae60', color: '#fff' },
  btnClose: { background: '#c0392b', color: '#fff' },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  scrollArea: { flex: 1, overflowY: 'auto', background: '#f0f2f5', padding: '20px' },
  empty: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: '#888', fontSize: 15, textAlign: 'center', padding: 40,
  },
  reportContent: { background: '#fff', maxWidth: 1050, margin: '0 auto' },
  coverPage: {
    padding: '60px 48px', textAlign: 'center', borderBottom: '4px solid #4a90e2',
    background: 'linear-gradient(135deg, #1a3a6b 0%, #2c5aa0 100%)', color: '#fff',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  coverLogo: { fontSize: 64, marginBottom: 16 },
  coverTitle: { fontSize: 28, fontWeight: 'bold', margin: '0 0 12px 0', color: '#fff' },
  coverDate: { fontSize: 14, color: '#adc8f0', margin: '0 0 32px 0' },
  coverEquipList: {
    display: 'inline-block', textAlign: 'left', background: 'rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '16px 24px', minWidth: 300,
  },
  coverEquipTitle: { margin: '0 0 10px 0', fontSize: 15, color: '#e0ecff' },
  coverEquipItem: { padding: '4px 0', fontSize: 14, color: '#fff' },
  equipSection: { borderBottom: '3px solid #e0e8f4' },
  equipSeparator: {
    display: 'flex', alignItems: 'center', gap: 12,
    background: '#eaf0fb', padding: '10px 20px', borderBottom: '1px solid #c5d5ea',
  },
  equipIndex: {
    background: '#4a90e2', color: '#fff', borderRadius: '50%',
    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 'bold', fontSize: 13, flexShrink: 0,
  },
  equipLabel: { fontSize: 16, fontWeight: 'bold', color: '#1a3a6b' },
  opexSection: { borderTop: '3px solid #1a3a6b', marginTop: 0 },
};

export default GlobalReport;
