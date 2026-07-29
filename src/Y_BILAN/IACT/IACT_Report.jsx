import React from 'react';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { makeReportT } from '../../D_BILAN_Rapports/report_traduction';
import { translations } from './IACT_traduction';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import { CO2_kg_m3, H2O_kg_m3, O2_kg_m3, N2_kg_m3 } from '../../A_Transverse_fonction/conv_calculation';
import { fmt } from '../../A_Transverse_fonction/formatNumber';

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

const ElecTable = ({ rows, t }) => (
  <table style={styles.table}>
    <thead>
      <tr>
        <th style={styles.th}>{t('Consommateur')}</th>
        <th style={styles.th}>{t('Consommation [kW]')}</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(({ label, value }) => (
        <tr key={label}>
          <td style={styles.tdLabel}>{label}</td>
          <td style={styles.td}>{fmt(value)}</td>
        </tr>
      ))}
      <tr style={{ backgroundColor: '#eaf0fb', fontWeight: 'bold' }}>
        <td style={styles.tdLabel}>{t('Total')}</td>
        <td style={styles.td}>{fmt(rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0))}</td>
      </tr>
    </tbody>
  </table>
);

// ─── OPEX cost calculation ────────────────────────────────────────────────────

const computeOpexCosts = (innerData) => {
  const {
    purchaseElectricityPrice = 0, ratioElec = 0, availability = 8000,
    currency = '€', airConsumptionPrice = 0, powerRatio = 0,
    waterPrices = {}, reagentsTypes = {}, gasTypes = {}, fuelTypes = {},
  } = getOpexData();
  const d = innerData || {};

  const elecRows = [
    { label: d.labelElec1 || 'Poste 1', kW: d.consoElec1 || 0 },
    { label: d.labelElec2 || 'Poste 2', kW: d.consoElec2 || 0 },
    { label: d.labelElec3 || 'Poste 3', kW: d.consoElec3 || 0 },
    { label: d.labelElec4 || 'Poste 4', kW: d.consoElec4 || 0 },
    { label: d.labelElec5 || 'Poste 5', kW: d.consoElec5 || 0 },
    { label: d.labelElec6 || 'Poste 6', kW: d.consoElec6 || 0 },
  ].filter(r => r.kW > 0);
  const totalElec_kW = elecRows.reduce((s, r) => s + r.kW, 0);
  const coutElec = (totalElec_kW / 1000) * purchaseElectricityPrice;
  const co2Elec = (ratioElec * totalElec_kW) / 1000;

  const conso_air = d.conso_air_co_N_m3 || 0;
  const coutAir = (conso_air / 1000) * airConsumptionPrice;
  const co2Air = (conso_air * powerRatio * ratioElec) / 1000;

  const totalCout_h = coutElec + coutAir;
  const totalCout_an = totalCout_h * availability;
  const totalCO2_kgh = co2Elec + co2Air;

  return {
    elecRows, totalElec_kW, coutElec, co2Elec,
    conso_air, coutAir, co2Air,
    totalCout_h, totalCout_an, totalCO2_kgh,
    currency, availability,
  };
};

// ─── OPEX display section ─────────────────────────────────────────────────────

const OpexCostSection = ({ opex, t, tr = k => k }) => {
  const {
    elecRows, totalElec_kW, coutElec, co2Elec,
    conso_air, coutAir, co2Air,
    totalCout_h, totalCout_an, totalCO2_kgh,
    currency, availability,
  } = opex;

  if (totalElec_kW === 0 && coutAir === 0) {
    return <p style={{ color: '#999', fontSize: 12, padding: '10px 14px' }}>{t('OPEX non disponibles')}</p>;
  }

  return (
    <div>
      <div style={{ ...styles.subSection, paddingBottom: 4 }}>
        <div style={styles.tagRow}>
          {[
            { label: `${t('Électricité')} [${currency}/h]`, val: coutElec, color: '#4a90e2' },
            { label: `${t('Air comprimé')} [${currency}/h]`, val: coutAir, color: '#17a2b8' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...styles.tag, borderLeft: `4px solid ${color}`, minWidth: 140 }}>
              <span style={styles.tagLabel}>{label}</span>
              <span style={{ ...styles.tagValue, color }}>{fmt(val, 2)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={styles.twoCol}>
        <div style={{ ...styles.subSection, background: '#f0f5ff', margin: 8, borderRadius: 6 }}>
          <h3 style={{ ...styles.subTitle, color: '#1a3a6b', fontSize: 14 }}>{t('Total coût')}</h3>
          <KV label={`${t('Coût horaire')} [${currency}/h]`} value={fmt(totalCout_h, 2)} />
          <KV label={`${t('Coût annuel')} (${availability}h) [${currency}${tr('perYear')}]`} value={fmt(totalCout_an, 0)} />
        </div>
        <div style={{ ...styles.subSection, background: '#f5f0ff', margin: 8, borderRadius: 6 }}>
          <h3 style={{ ...styles.subTitle, color: '#6a1a6b', fontSize: 14 }}>{t('Total CO₂')}</h3>
          <KV label={`${t('CO₂ électricité')} [kg/h]`} value={fmt(co2Elec, 3)} />
          <KV label={`${t('CO₂ air comprimé')} [kg/h]`} value={fmt(co2Air, 3)} />
          <KV label={`${t('Total CO₂')} [kg/h]`} value={fmt(totalCO2_kgh, 2)} />
        </div>
      </div>
      {elecRows.length > 0 && (
        <div style={styles.subSection}>
          <h3 style={styles.subTitle}>{t('Électricité — détail')}</h3>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>{t('Poste')}</th><th style={styles.th}>kW</th><th style={styles.th}>{`${currency}/h`}</th></tr></thead>
            <tbody>
              {elecRows.map(r => {
                const { purchaseElectricityPrice = 0 } = getOpexData();
                return <tr key={r.label}><td style={styles.tdLabel}>{r.label}</td><td style={styles.td}>{fmt(r.kW)}</td><td style={styles.td}>{fmt((r.kW / 1000) * purchaseElectricityPrice, 2)}</td></tr>;
              })}
              <tr style={{ fontWeight: 'bold', background: '#eaf0fb' }}><td style={styles.tdLabel}>{t('Total')}</td><td style={styles.td}>{fmt(totalElec_kW)}</td><td style={styles.td}>{fmt(coutElec, 2)}</td></tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const IACT_Report = ({ innerData = {}, currentLanguage = 'fr' }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const tr = makeReportT(currentLanguage);
  const t = (key) => translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  // Températures
  const T_IN        = innerData.T_OUT     || 0;    // température entrée (venant du nœud amont)
  const T_sortie    = innerData.T_sortie  || 0;    // température sortie fumées
  const T_air_in    = innerData.T_air_in  || 0;
  const T_air_out   = innerData.T_air_out || 0;
  const Pth         = innerData.Pth_echange || 0;
  const PDC_mmCE    = innerData.PDC_mmCE  || 0;
  const P_IN        = innerData.Pin_mmCE  || 0;
  const P_out       = innerData.P_out_mmCE || 0;

  // Bilan énergétique
  const Delta_H_to_air    = innerData.Delta_H_to_air    || 0;
  const V_air_chauffe     = innerData.V_air_chauffe_Nm3_h || 0;
  const H_FG_in           = innerData.H_FG_in  || 0;
  const H_FG_out          = innerData.H_FG_out || 0;
  const H_air_in          = innerData.H_air_in  || 0;
  const H_air_out         = innerData.H_air_out || 0;

  // Composition fumées
  const FG_IN_kg_h  = innerData.FG_OUT_kg_h || {};  // composition entrée = sortie (pas de mélange)
  const FG_OUT_kg_h = innerData.FG_OUT_kg_h || {};

  // Volumes [Nm³/h] calculés depuis les masses
  const FG_in_Nm3 = {
    CO2: CO2_kg_m3(FG_IN_kg_h.CO2 || 0),
    H2O: H2O_kg_m3(FG_IN_kg_h.H2O || 0),
    O2:  O2_kg_m3(FG_IN_kg_h.O2  || 0),
    N2:  N2_kg_m3(FG_IN_kg_h.N2  || 0),
  };
  const FG_wet_in  = Object.values(FG_in_Nm3).reduce((s, v) => s + v, 0);
  const FG_dry_in  = FG_in_Nm3.CO2 + FG_in_Nm3.O2 + FG_in_Nm3.N2;

  const elecRows = [
    { label: innerData.labelElec1 || `${t('Poste')} 1`, value: innerData.consoElec1 },
    { label: innerData.labelElec2 || `${t('Poste')} 2`, value: innerData.consoElec2 },
    { label: innerData.labelElec3 || `${t('Poste')} 3`, value: innerData.consoElec3 },
    { label: innerData.labelElec4 || `${t('Poste')} 4`, value: innerData.consoElec4 },
    { label: innerData.labelElec5 || `${t('Poste')} 5`, value: innerData.consoElec5 },
    { label: innerData.labelElec6 || `${t('Poste')} 6`, value: innerData.consoElec6 },
  ].filter(r => r.value !== undefined && parseFloat(r.value) > 0);

  const opex = computeOpexCosts(innerData);

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>IACT — {t('Rapport de synthèse')}</h1>

      <Section title={`1. ${t('Bilan thermique')}`}>
        <div style={styles.twoCol}>
          <SubSection title={t('Côté fumées')}>
            <KV label={`${t('Température entrée')} [°C]`}      value={fmt(T_IN, 1)} />
            <KV label={`${t('Température sortie')} [°C]`}      value={fmt(T_sortie, 2)} />
            <KV label={`${t('H fumées entrée')} [kJ/h]`}       value={fmt(H_FG_in, 0)} />
            <KV label={`${t('H fumées sortie')} [kJ/h]`}       value={fmt(H_FG_out, 0)} />
            <KV label={`${t('Chaleur cédée à l\'air')} [kJ/h]`} value={fmt(Delta_H_to_air, 0)} />
            <KV label={`${t('Rendement d\'échange')} [%]`}      value={fmt(Pth, 1)} />
            <KV label={`${t('Perte de charge')} [mmCE]`}       value={fmt(PDC_mmCE, 1)} />
            <KV label={`${t('Pression entrée')} [mmCE]`}       value={fmt(P_IN, 1)} />
            <KV label={`${t('Pression sortie')} [mmCE]`}       value={fmt(P_out, 1)} />
          </SubSection>
          <SubSection title={t('Côté air')}>
            <KV label={`${t('Température air entrant')} [°C]`}   value={fmt(T_air_in, 1)} />
            <KV label={`${t('Température air réchauffé')} [°C]`} value={fmt(T_air_out, 1)} />
            <KV label={`${t('H air entrée')} [kJ/h]`}            value={fmt(H_air_in, 0)} />
            <KV label={`${t('H air sortie')} [kJ/h]`}            value={fmt(H_air_out, 0)} />
            <KV label={`${t('Débit air chauffé')} [Nm³/h]`}      value={fmt(V_air_chauffe, 0)} />
          </SubSection>
        </div>
      </Section>

      <Section title={`2. ${t('Composition des fumées')}`}>
        <div style={styles.twoCol}>
          <SubSection title={t('Entrée IACT')}>
            <KV label={`${t('Débit sec')} [Nm³/h]`}    value={fmt(FG_dry_in, 0)} />
            <KV label={`${t('Débit humide')} [Nm³/h]`} value={fmt(FG_wet_in, 0)} />
            <GasTable data={{
              'kg/h':   FG_IN_kg_h,
              'Nm³/h':  FG_in_Nm3,
            }} t={tr} />
          </SubSection>
          <SubSection title={t('Sortie IACT')}>
            <KV label={`${t('Débit sec')} [Nm³/h]`}    value={fmt(FG_dry_in, 0)} />
            <KV label={`${t('Débit humide')} [Nm³/h]`} value={fmt(FG_wet_in, 0)} />
            <GasTable data={{
              'kg/h':  FG_OUT_kg_h,
              'Nm³/h': FG_in_Nm3,
            }} />
          </SubSection>
        </div>
      </Section>

      <Section title={`3. ${t('Consommations électriques')}`}>
        <SubSection>
          {elecRows.length > 0
            ? <ElecTable rows={elecRows} t={t} />
            : <span style={{ color: '#999', fontSize: 12 }}>{t('Données non disponibles')}</span>
          }
        </SubSection>
      </Section>

      <Section title={`4. ${t('OPEX — Coûts')}`}>
        <OpexCostSection opex={opex} t={t} tr={tr} />
      </Section>

      <div style={styles.footer}>{t('Rapport généré automatiquement')} — {new Date().toLocaleDateString()}</div>
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
  tagRow:       { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' },
  tag:          { background: '#f0f5ff', border: '1px solid #c5d5ea', borderRadius: 4, padding: '4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 110 },
  tagLabel:     { fontSize: 10, color: '#555' },
  tagValue:     { fontSize: 13, fontWeight: 'bold', color: '#1a3a6b' },
  footer:       { marginTop: 24, textAlign: 'right', fontSize: 11, color: '#999', borderTop: '1px solid #eee', paddingTop: 8 },
};

export default IACT_Report;
