import React from 'react';
import { getLanguageCode } from '../../../F_Gestion_Langues/Fonction_Traduction';
import { makeReportT } from '../../../D_BILAN_Rapports/report_traduction';
import { translations } from './TubeShell_traduction';
import { CO2_kg_m3, H2O_kg_m3, O2_kg_m3, N2_kg_m3 } from '../../../A_Transverse_fonction/conv_calculation';
import { fmt } from '../../../A_Transverse_fonction/formatNumber';

// ─── Sub-components ───────────────────────────────────────────────────────────

const Section = ({ title, children }) => (
  <div style={styles.section}>
    <h2 style={styles.sectionTitle}>{title}</h2>
    {children}
  </div>
);

const SubSection = ({ title, children }) => (
  <div style={styles.subSection}>
    {title && <h3 style={styles.subTitle}>{title}</h3>}
    {children}
  </div>
);

const KV = ({ label, value, unit = '' }) => (
  <div style={styles.kvRow}>
    <span style={styles.kvLabel}>{label}</span>
    <span style={styles.kvValue}>{value}{unit ? <span style={styles.kvUnit}> {unit}</span> : null}</span>
  </div>
);

const GasTable = ({ title, data = {}, t = (k) => k }) => {
  const gases = ['CO2', 'H2O', 'O2', 'N2'];
  return (
    <div style={{ marginBottom: 8 }}>
      {title && <div style={styles.tableTitle}>{title}</div>}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}></th>
            {gases.map(g => <th key={g} style={styles.th}>{g}</th>)}
            <th style={styles.th}>{t("total")}</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data).map(([rowLabel, rowData]) => {
            const total = gases.reduce((s, g) => s + (parseFloat(rowData[g]) || 0), 0);
            return (
              <tr key={rowLabel}>
                <td style={styles.tdLabel}>{rowLabel}</td>
                {gases.map(g => (
                  <td key={g} style={styles.td}>{fmt(rowData[g])}</td>
                ))}
                <td style={{ ...styles.td, fontWeight: 'bold' }}>{fmt(total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const TUBEANDSHELL_Report = ({ innerData = {}, currentLanguage = 'fr' }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const tr = makeReportT(currentLanguage);
  const t = (key) => translations[languageCode]?.[key] || translations['fr']?.[key] || key;

  const d = innerData;

  // Côté fumées
  const T_FG_in      = d.T_IN         || 0;
  const T_FG_out     = d.T_OUT        || 0;
  const H_FG_in_kWh  = d.H_FG_in_kWh || 0;
  const H_FG_out_kWh = d.H_FG_out_kWh|| 0;
  const Q_FG_kWh     = d.Q_FG_kWh    || 0;
  const PDC_mmCE     = d.PDC_mmCE    || 0;
  const P_IN         = d.P_IN        || 0;
  const P_OUT        = d.P_OUT       || 0;
  const FG_wet_Nm3h  = d.FG_humide_tot || 0;
  const FG_dry_Nm3h  = d.FG_sec_tot    || 0;
  const FG_OUT_kg_h  = d.FG_OUT_kg_h   || {};

  // Côté fluide
  const Q_utile_kWh  = d.Q_utile_eau_kWh || 0;
  const T_moyen      = d.T_moyen_eau      || 0;
  const cp_fluide    = d.cp_fluide        || 0;
  const m_fluide     = d.m_eau_kg_h       || 0;

  // Dimensionnement
  const d_tlm      = d.D_TLM      || 0;
  const fact_ua    = d.Fact_UA    || 0;
  const surface    = d.Surface_m2 || 0;

  // Nm³/h depuis masses
  const FG_out_Nm3 = {
    CO2: CO2_kg_m3(FG_OUT_kg_h.CO2 || 0),
    H2O: H2O_kg_m3(FG_OUT_kg_h.H2O || 0),
    O2:  O2_kg_m3(FG_OUT_kg_h.O2  || 0),
    N2:  N2_kg_m3(FG_OUT_kg_h.N2  || 0),
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>Tube &amp; Shell — {t('Rapport de synthèse')}</h1>

      {/* 1. Bilan thermique côté fumées */}
      <Section title={`1. ${t('Bilan thermique fumées')}`}>
        <div style={styles.twoCol}>
          <SubSection title={t('Températures et pressions')}>
            <KV label={`${t('Température fumées entrée')} [°C]`}  value={fmt(T_FG_in, 1)} />
            <KV label={`${t('Température fumées sortie')} [°C]`}  value={fmt(T_FG_out, 1)} />
            <KV label={`${t('Pression entrée')} [mmCE]`}          value={fmt(P_IN, 1)} />
            <KV label={`${t('Perte de charge')} [mmCE]`}          value={fmt(PDC_mmCE, 1)} />
            <KV label={`${t('Pression sortie')} [mmCE]`}          value={fmt(P_OUT, 1)} />
          </SubSection>
          <SubSection title={t('Enthalpies')}>
            <KV label={`${t('Enthalpie fumées entrée')} [kWh]`}   value={fmt(H_FG_in_kWh, 1)} />
            <KV label={`${t('Enthalpie fumées sortie')} [kWh]`}   value={fmt(H_FG_out_kWh, 1)} />
            <KV label={`${t('Enthalpie cédée fumées')} [kWh]`}    value={fmt(Q_FG_kWh, 1)} />
          </SubSection>
        </div>
      </Section>

      {/* 2. Bilan côté fluide */}
      <Section title={`2. ${t('Bilan côté fluide')}`}>
        <SubSection>
          <KV label={`${t('Enthalpie transmise au fluide')} [kWh]`} value={fmt(Q_utile_kWh, 1)} />
          <KV label={`${t('Température moyenne fluide')} [°C]`}     value={fmt(T_moyen, 1)} />
          <KV label={`${t('cp fluide à T_moy')}`}                   value={fmt(cp_fluide, 4)} />
          <KV label={`${t('Débit fluide calculé')} [kg/h]`}         value={fmt(m_fluide, 1)} />
        </SubSection>
      </Section>

      {/* 3. Dimensionnement thermique */}
      <Section title={`3. ${t('Dimensionnement thermique')}`}>
        <SubSection>
          <KV label={`${t('ΔT logarithmique moyen')} [°C]`}        value={fmt(d_tlm, 1)} />
          <KV label={`${t('Facteur UA')} [kW/K]`}                   value={fmt(fact_ua, 2)} />
          <KV label={`${t('Surface d\'échange')} [m²]`}             value={fmt(surface, 2)} />
        </SubSection>
      </Section>

      {/* 4. Composition des fumées */}
      <Section title={`4. ${t('Composition des fumées')}`}>
        <div style={styles.twoCol}>
          <SubSection title={t('Débits fumées')}>
            <KV label={`${t('Débit humide')} [Nm³/h]`} value={fmt(FG_wet_Nm3h, 0)} />
            <KV label={`${t('Débit sec')} [Nm³/h]`}    value={fmt(FG_dry_Nm3h, 0)} />
          </SubSection>
          <SubSection title={t('Composition sortie')}>
            <GasTable data={{
              'kg/h':   FG_OUT_kg_h,
              'Nm³/h':  FG_out_Nm3,
            }} t={tr} />
          </SubSection>
        </div>
      </Section>

      <div style={styles.footer}>{tr('autoGenerated')} {new Date().toLocaleDateString()}</div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container:    { fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#222', maxWidth: 1100, margin: '0 auto', padding: '20px 24px', backgroundColor: '#fff' },
  mainTitle:    { fontSize: 20, fontWeight: 'bold', color: '#1a3a6b', borderBottom: '3px solid #4a90e2', paddingBottom: 8, marginBottom: 24 },
  section:      { marginBottom: 28, border: '1px solid #d0daea', borderRadius: 6, overflow: 'hidden' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', background: '#4a90e2', margin: 0, padding: '8px 14px' },
  subSection:   { padding: '10px 14px' },
  subTitle:     { fontSize: 13, fontWeight: 'bold', color: '#1a3a6b', margin: '0 0 6px 0', borderBottom: '1px solid #e0e8f4', paddingBottom: 3 },
  twoCol:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 },
  kvRow:        { display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #e8e8e8' },
  kvLabel:      { color: '#444', flex: 1 },
  kvValue:      { fontWeight: 'bold', color: '#1a3a6b', minWidth: 80, textAlign: 'right' },
  kvUnit:       { fontWeight: 'normal', color: '#666', fontSize: 11 },
  table:        { width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 },
  th:           { background: '#eaf0fb', border: '1px solid #c5d5ea', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', color: '#1a3a6b' },
  td:           { border: '1px solid #dde6f0', padding: '3px 6px', textAlign: 'center', color: '#222' },
  tdLabel:      { border: '1px solid #dde6f0', padding: '3px 8px', textAlign: 'left', color: '#333', fontStyle: 'italic' },
  tableTitle:   { fontSize: 12, fontWeight: 'bold', color: '#444', marginBottom: 4 },
  footer:       { marginTop: 24, textAlign: 'right', fontSize: 11, color: '#999', borderTop: '1px solid #eee', paddingTop: 8 },
};

export default TUBEANDSHELL_Report;
