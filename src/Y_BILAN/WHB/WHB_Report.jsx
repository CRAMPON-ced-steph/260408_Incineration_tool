import React from 'react';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import { CO2_kg_m3, H2O_kg_m3, O2_kg_m3, N2_kg_m3 } from '../../A_Transverse_fonction/conv_calculation';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { makeReportT } from '../../D_BILAN_Rapports/report_traduction';
import { translations } from './WHB_traduction';
import { fmt } from '../../A_Transverse_fonction/formatNumber';
const Section = ({ title, children }) => <div style={styles.section}><h2 style={styles.sectionTitle}>{title}</h2>{children}</div>;
const SubSection = ({ title, children }) => <div style={styles.subSection}>{title && <h3 style={styles.subTitle}>{title}</h3>}{children}</div>;
const KV = ({ label, value, unit = '' }) => <div style={styles.kvRow}><span style={styles.kvLabel}>{label}</span><span style={styles.kvValue}>{value}{unit ? <span style={styles.kvUnit}> {unit}</span> : null}</span></div>;

const GasTable = ({ data = {}, t = (k) => k }) => {
  const gases = ['CO2', 'H2O', 'O2', 'N2'];
  return (
    <table style={styles.table}>
      <thead><tr><th style={styles.th}></th>{gases.map(g => <th key={g} style={styles.th}>{g}</th>)}<th style={styles.th}>{t("total")}</th></tr></thead>
      <tbody>{Object.entries(data).map(([lbl, d]) => { const tot = gases.reduce((s, g) => s + (parseFloat(d[g]) || 0), 0); return <tr key={lbl}><td style={styles.tdLabel}>{lbl}</td>{gases.map(g => <td key={g} style={styles.td}>{fmt(d[g])}</td>)}<td style={{ ...styles.td, fontWeight: 'bold' }}>{fmt(tot)}</td></tr>; })}</tbody>
    </table>
  );
};

const PollutantTable = ({ masses = {} }) => {
  const keys = Object.keys(masses).filter(k => masses[k] !== undefined);
  return <table style={styles.table}><thead><tr>{keys.map(k => <th key={k} style={styles.th}>{k}</th>)}</tr></thead><tbody><tr>{keys.map(k => <td key={k} style={styles.td}>{fmt(masses[k], 4)}</td>)}</tr></tbody></table>;
};

const ElecTable = ({ rows, tFn }) => (
  <table style={styles.table}>
    <thead><tr><th style={styles.th}>{tFn('consumer')}</th><th style={styles.th}>kW</th></tr></thead>
    <tbody>
      {rows.map(r => <tr key={r.label}><td style={styles.tdLabel}>{r.label}</td><td style={styles.td}>{fmt(r.value)}</td></tr>)}
      <tr style={{ background: '#eaf0fb', fontWeight: 'bold' }}><td style={styles.tdLabel}>{tFn('total')}</td><td style={styles.td}>{fmt(rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0))}</td></tr>
    </tbody>
  </table>
);

const computeOpexCosts = (innerData, tr = (k) => k) => {
  const { purchaseElectricityPrice = 0, ratioElec = 0, availability = 8000, currency = '€', airConsumptionPrice = 0, powerRatio = 0, waterPrices = {} } = getOpexData();
  const d = innerData || {};
  const elecRows = [1,2,3,4,5,6,7,8].map(i => ({ label: d[`labelElec${i}`] || `Poste ${i}`, kW: d[`consoElec${i}`] || 0 })).filter(r => r.kW > 0);
  const totalElec_kW = elecRows.reduce((s, r) => s + r.kW, 0);
  const coutElec = (totalElec_kW / 1000) * purchaseElectricityPrice;
  const co2Elec = (ratioElec * totalElec_kW) / 1000;
  const conso_air = d.conso_air_co_N_m3 || 0;
  const coutAir = (conso_air / 1000) * airConsumptionPrice;
  const co2Air = (conso_air * powerRatio * ratioElec) / 1000;
  const eauRows = [
    { label: tr("waterPotable"), m3h: d.Conso_EauPotable_m3 || 0, prix: waterPrices?.potable || 0 },
    { label: tr("waterDemin"), m3h: d.Conso_EauDemin_m3 || 0, prix: waterPrices?.demineralized || 0 },
    { label: tr("eauAlimChaudiere"), m3h: d.Debit_eau_m3_h || 0, prix: waterPrices?.demineralized || 0 },
  ].filter(r => r.m3h > 0);
  const coutEau = eauRows.reduce((s, r) => s + r.m3h * r.prix, 0);
  const totalCout_h = coutElec + coutAir + coutEau;
  const totalCout_an = totalCout_h * availability;
  const totalCO2_kgh = co2Elec + co2Air;
  return { elecRows, totalElec_kW, coutElec, co2Elec, coutAir, co2Air, eauRows, coutEau, totalCout_h, totalCout_an, totalCO2_kgh, currency, availability };
};

const WHB_Report = ({ innerData = {}, currentLanguage = 'fr' }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const tr = makeReportT(currentLanguage);
  const t = (key) => translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  const T_OUT = innerData.T_OUT || innerData.T_WHB_out || 0;
  const T_IN = innerData.T_inlet_WHB || 0;
  const O2_calcule = innerData.O2_calcule || 0;
  const FG_OUT_kg_h = innerData.FG_OUT_kg_h || {};
  const _nm3Computed = { CO2: CO2_kg_m3(FG_OUT_kg_h.CO2||0), H2O: H2O_kg_m3(FG_OUT_kg_h.H2O||0), O2: O2_kg_m3(FG_OUT_kg_h.O2||0), N2: N2_kg_m3(FG_OUT_kg_h.N2||0) };
  _nm3Computed.dry = _nm3Computed.CO2 + _nm3Computed.O2 + _nm3Computed.N2;
  _nm3Computed.wet = _nm3Computed.dry + _nm3Computed.H2O;
  const FG_OUT_Nm3_h = innerData.FG_OUT_Nm3_h || innerData.FG_WHB_OUT_Nm3_h || _nm3Computed;
  const FG_wet_total = (FG_OUT_kg_h.CO2 || 0) + (FG_OUT_kg_h.H2O || 0) + (FG_OUT_kg_h.O2 || 0) + (FG_OUT_kg_h.N2 || 0);
  const PInput = innerData.PInput || {};
  const Poutput = innerData.Poutput || {};
  const elecRows = [1,2,3,4,5,6,7,8].map(i => ({ label: innerData[`labelElec${i}`] || `Poste ${i}`, value: innerData[`consoElec${i}`] })).filter(r => parseFloat(r.value) > 0);
  const opex = computeOpexCosts(innerData, tr);

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>{t('whbReportTitle')}</h1>

      <Section title={`1. ${t('steamParameters')}`}>
        <div style={styles.twoCol}>
          <SubSection title={t('steamProduction')}>
            <KV label={t('steamFlow')} value={fmt(innerData.Q_steam_kg_h || innerData['Débit_vapeur_kg_h'], 0)} />
            <KV label={t('steamPressure')} value={fmt(innerData.Pression_vapeur_bar, 1)} />
            <KV label={t('steamTemperature')} value={fmt(innerData.Temperature_vapeur_C, 1)} />
            <KV label={t('feedwaterFlow')} value={fmt(innerData.Q_feedwater_kg_h, 0)} />
            <KV label={t('boilerBlowdown')} value={fmt(innerData.Q_purge_kg_h || innerData.Eau_purge_kg_h, 0)} />
            <KV label={t('flashDrumSteam')} value={fmt(innerData.Q_flash_drum_event_kg_h, 0)} />
          </SubSection>
          <SubSection title={t('temperatures')}>
            <KV label={t('flueGasInletTemp')} value={fmt(T_IN, 0)} />
            <KV label={t('flueGasOutletTemp')} value={fmt(T_OUT, 0)} />
            <KV label={t('o2Measured')} value={fmt(O2_calcule)} unit="%" />
          </SubSection>
        </div>
      </Section>

      <Section title={`2. ${t('flueGases')}`}>
        <div style={styles.twoCol}>
          <SubSection>
            <KV label={t('wetFlowTotal')} value={fmt(FG_wet_total)} />
            <KV label={t('dryFlow')} value={fmt(FG_OUT_Nm3_h.dry, 0)} />
            <KV label={t('wetFlow')} value={fmt(FG_OUT_Nm3_h.wet, 0)} />
          </SubSection>
          <SubSection title={t('outletGasComposition')}>
            <GasTable data={{ 'kg/h': FG_OUT_kg_h, 'Nm³/h': { CO2: FG_OUT_Nm3_h.CO2, H2O: FG_OUT_Nm3_h.H2O, O2: FG_OUT_Nm3_h.O2, N2: FG_OUT_Nm3_h.N2 } }} t={tr} />
          </SubSection>
        </div>
      </Section>

      <Section title={`3. ${t('pollutantEmissions')}`}>
        <SubSection title={`${t('inputFlueGas')} [kg/h]`}><PollutantTable masses={PInput} /></SubSection>
        <SubSection title={`${t('outputFlueGas')} [kg/h]`}><PollutantTable masses={Poutput} /></SubSection>
      </Section>

      <Section title={`4. ${t('steamValorization')}`}>
        <div style={styles.twoCol}>
          <SubSection title={t('netProduction')}>
            <KV label={t('netSteamProduced')} value={fmt(innerData.Q_steam_net_kg_h || innerData.Q_steam_kg_h || innerData['Débit_vapeur_kg_h'], 0)} />
            <KV label={t('recoveredPower')} value={fmt(innerData.P_recuperee_kW)} />
          </SubSection>
          <SubSection title={t('turbineValorization')}>
            <KV label={t('turbineType')} value={innerData.turbine_type || '—'} />
            <KV label={t('electricPower')} value={fmt(innerData.puissance_electrique_kW || innerData.P_elec_turbine_kW)} />
            <KV label={t('globalEfficiency')} value={fmt(innerData.rendement_global_pct || innerData.rendement_turbine, 1)} />
          </SubSection>
        </div>
      </Section>

      <Section title={`5. ${t('whbDesign')}`}>
        <SubSection title={t('electricConsumptions')}>
          {elecRows.length > 0 ? <ElecTable rows={elecRows} tFn={t} /> : <span style={{ color: '#999', fontSize: 12 }}>{t('dataNotAvailableDesign')}</span>}
        </SubSection>
      </Section>

      <Section title={`6. ${t('opex')} — ${t('hourlyCosts')}`}>
        {opex.totalElec_kW === 0 && opex.coutEau === 0
          ? <p style={{ color: '#999', fontSize: 12, padding: '10px 14px' }}>{t('opexNotAvailable')}</p>
          : (
            <div>
              <div style={styles.subSection}>
                <div style={styles.tagRow}>
                  {[{ label: `${t('electricity')} [${opex.currency}/h]`, val: opex.coutElec, color: '#4a90e2' }, { label: `${t('water')} [${opex.currency}/h]`, val: opex.coutEau, color: '#2ecc71' }].map(({ label, val, color }) => (
                    <div key={label} style={{ ...styles.tag, borderLeft: `4px solid ${color}`, minWidth: 130 }}><span style={styles.tagLabel}>{label}</span><span style={{ ...styles.tagValue, color }}>{fmt(val, 2)}</span></div>
                  ))}
                </div>
              </div>
              <div style={styles.twoCol}>
                <div style={{ ...styles.subSection, background: '#f0f5ff', margin: 8, borderRadius: 6 }}>
                  <h3 style={{ ...styles.subTitle, color: '#1a3a6b', fontSize: 14 }}>{t('totalCost')}</h3>
                  <KV label={`${t('hourlyCost')} [${opex.currency}/h]`} value={fmt(opex.totalCout_h, 2)} />
                  <KV label={`${t('annualCost')} (${opex.availability}h) [${opex.currency}${tr('perYear')}]`} value={fmt(opex.totalCout_an, 0)} />
                </div>
                <div style={{ ...styles.subSection, background: '#f5f0ff', margin: 8, borderRadius: 6 }}>
                  <h3 style={{ ...styles.subTitle, color: '#6a1a6b', fontSize: 14 }}>{t('totalCO2')}</h3>
                  <KV label={t('co2Electricity')} value={fmt(opex.co2Elec, 3)} />
                  <KV label={t('totalCO2kgh')} value={fmt(opex.totalCO2_kgh, 2)} />
                </div>
              </div>
            </div>
          )
        }
      </Section>

      <div style={styles.footer}>{t('reportGenerated')} — {new Date().toLocaleDateString()}</div>
    </div>
  );
};

const styles = {
  container: { fontFamily: 'Arial, sans-serif', fontSize: 13, color: '#222', maxWidth: 1100, margin: '0 auto', padding: '20px 24px', backgroundColor: '#fff' },
  mainTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a3a6b', borderBottom: '3px solid #4a90e2', paddingBottom: 8, marginBottom: 24 },
  section: { marginBottom: 28, border: '1px solid #d0daea', borderRadius: 6, overflow: 'hidden' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#fff', background: '#4a90e2', margin: 0, padding: '8px 14px' },
  subSection: { padding: '10px 14px' },
  subTitle: { fontSize: 13, fontWeight: 'bold', color: '#1a3a6b', margin: '0 0 6px 0', borderBottom: '1px solid #e0e8f4', paddingBottom: 3 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 },
  kvRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #e8e8e8' },
  kvLabel: { color: '#444', flex: 1 },
  kvValue: { fontWeight: 'bold', color: '#1a3a6b', minWidth: 80, textAlign: 'right' },
  kvUnit: { fontWeight: 'normal', color: '#666', fontSize: 11 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 11, marginBottom: 8 },
  th: { background: '#eaf0fb', border: '1px solid #c5d5ea', padding: '4px 6px', textAlign: 'center', fontWeight: 'bold', color: '#1a3a6b' },
  td: { border: '1px solid #dde6f0', padding: '3px 6px', textAlign: 'center', color: '#222' },
  tdLabel: { border: '1px solid #dde6f0', padding: '3px 8px', textAlign: 'left', color: '#333', fontStyle: 'italic' },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 8, padding: '4px 0' },
  tag: { background: '#f0f5ff', border: '1px solid #c5d5ea', borderRadius: 4, padding: '4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 110 },
  tagLabel: { fontSize: 10, color: '#555' },
  tagValue: { fontSize: 13, fontWeight: 'bold', color: '#1a3a6b' },
  footer: { marginTop: 24, textAlign: 'right', fontSize: 11, color: '#999', borderTop: '1px solid #eee', paddingTop: 8 },
};

export default WHB_Report;
