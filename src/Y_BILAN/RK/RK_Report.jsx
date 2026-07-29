import React from 'react';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './RK_traduction';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import { fmt } from '../../A_Transverse_fonction/formatNumber';
import { makeReportT } from '../../D_BILAN_Rapports/report_traduction';

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

const GasTable = ({ title, data = {}, tr }) => {
  const gases = ['CO2', 'H2O', 'O2', 'N2'];
  return (
    <div style={{ marginBottom: 8 }}>
      {title && <div style={styles.tableTitle}>{title}</div>}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}></th>
            {gases.map(g => <th key={g} style={styles.th}>{g}</th>)}
            <th style={styles.th}>{tr ? tr('total') : 'Total'}</th>
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

const PollutantTable = ({ title, masses = {} }) => {
  const keys = Object.keys(masses).filter(k => masses[k] !== undefined);
  return (
    <div style={{ marginBottom: 8 }}>
      {title && <div style={styles.tableTitle}>{title}</div>}
      <table style={styles.table}>
        <thead>
          <tr>
            {keys.map(k => <th key={k} style={styles.th}>{k}</th>)}
          </tr>
        </thead>
        <tbody>
          <tr>
            {keys.map(k => (
              <td key={k} style={styles.td}>{fmt(masses[k], 4)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};

const ElecTable = ({ rows, tr }) => (
  <table style={styles.table}>
    <thead>
      <tr>
        <th style={styles.th}>{tr('consumer')}</th>
        <th style={styles.th}>{tr('consumptionKW')}</th>
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
        <td style={styles.tdLabel}>{tr('total')}</td>
        <td style={styles.td}>{fmt(rows.reduce((s, r) => s + (parseFloat(r.value) || 0), 0))}</td>
      </tr>
    </tbody>
  </table>
);

// ─── OPEX cost calculation (mirrors OpexDashboard logic) ──────────────────────

const computeOpexCosts = (innerData, tr) => {
  const {
    purchaseElectricityPrice = 0,
    ratioElec = 0,
    availability = 8000,
    currency = '€',
    airConsumptionPrice = 0,
    powerRatio = 0,
    waterPrices = {},
    reagentsTypes = {},
    gasTypes = {},
    fuelTypes = {},
  } = getOpexData();

  const d = innerData || {};

  // ── Électricité ────────────────────────────────────────────────────────────
  const elecRows = [
    { label: d.labelElec1 || tr('elecRotationRK'), kW: d.consoElec1 || 0 },
    { label: d.labelElec2 || tr('elecPompeLances'), kW: d.consoElec2 || 0 },
    { label: d.labelElec3 || tr('compressedAir'), kW: d.consoElec3 || 0 },
    { label: d.labelElec4 || tr('elecVentAirComb'), kW: d.consoElec4 || 0 },
    { label: d.labelElec5 || tr('elecVentVirole'), kW: d.consoElec5 || 0 },
    { label: d.labelElec6 || tr('elecExtracteur'), kW: d.consoElec6 || 0 },
    { label: d.labelElec7 || tr('elecPompeBoue'), kW: d.consoElec7 || 0 },
    { label: d.labelElec8 || tr('elecTapis'), kW: d.consoElec8 || 0 },
  ].filter(r => r.kW > 0);

  const totalElec_kW = elecRows.reduce((s, r) => s + r.kW, 0);
  const coutElec = (totalElec_kW / 1000) * purchaseElectricityPrice;
  const co2Elec = (ratioElec * totalElec_kW) / 1000;

  // ── Air comprimé ───────────────────────────────────────────────────────────
  const conso_air = d.conso_air_co_N_m3 || 0;
  const coutAir = (conso_air / 1000) * airConsumptionPrice;
  const co2Air = (conso_air * powerRatio * ratioElec) / 1000;

  // ── Eau ───────────────────────────────────────────────────────────────────
  const eauRows = [
    { label: tr('waterPotable'), m3h: d.Conso_EauPotable_m3 || 0, prix: waterPrices?.potable || 0 },
    { label: tr('waterCooling'), m3h: d.Conso_EauRefroidissement_m3 || 0, prix: waterPrices?.cooling || 0 },
    { label: tr('waterDemin'), m3h: d.Conso_EauDemin_m3 || 0, prix: waterPrices?.demineralized || 0 },
    { label: tr('waterRiver'), m3h: d.Conso_EauRiviere_m3 || 0, prix: waterPrices?.river || 0 },
    { label: tr('waterSoft'), m3h: d.Conso_EauAdoucie_m3 || 0, prix: waterPrices?.soft || 0 },
  ].filter(r => r.m3h > 0);
  const coutEau = eauRows.reduce((s, r) => s + r.m3h * r.prix, 0);

  // ── Réactifs ──────────────────────────────────────────────────────────────
  const reactifRows = [
    { label: 'CaCO₃', kgh: d.Conso_CaCO3_kg || 0, prix: reagentsTypes?.CaCO3?.cost || 0, co2T: reagentsTypes?.CaCO3?.co2PerTrip || 0 },
    { label: 'CaO', kgh: d.Conso_CaO_kg || 0, prix: reagentsTypes?.CaO?.cost || 0, co2T: reagentsTypes?.CaO?.co2PerTrip || 0 },
    { label: tr('caoh2Dry'), kgh: d.Conso_CaOH2_dry_kg || 0, prix: reagentsTypes?.CaOH2?.cost || 0, co2T: reagentsTypes?.CaOH2?.co2PerTrip || 0 },
    { label: tr('caoh2Wet'), kgh: d.Conso_CaOH2_wet_kg || 0, prix: reagentsTypes?.CaOH2?.cost || 0, co2T: reagentsTypes?.CaOH2?.co2PerTrip || 0 },
    { label: 'NaOH', kgh: d.Conso_NaOH_kg || 0, prix: reagentsTypes?.NaOH?.cost || 0, co2T: reagentsTypes?.NaOH?.co2PerTrip || 0 },
    { label: 'NaHCO₃', kgh: d.Conso_NaOHCO3_kg || 0, prix: reagentsTypes?.NaOHCO3?.cost || 0, co2T: reagentsTypes?.NaOHCO3?.co2PerTrip || 0 },
    { label: 'NH₃', kgh: d.Conso_Ammonia_kg || 0, prix: reagentsTypes?.NH3?.cost || 0, co2T: reagentsTypes?.NH3?.co2PerTrip || 0 },
    { label: 'NaBr/CaBr₂', kgh: d.Conso_NaBrCaBr2_kg || 0, prix: reagentsTypes?.NaBr_CaBr2?.cost || 0, co2T: reagentsTypes?.NaBr_CaBr2?.co2PerTrip || 0 },
    { label: 'CAP', kgh: d.Conso_CAP_kg || 0, prix: reagentsTypes?.CAP?.cost || 0, co2T: reagentsTypes?.CAP?.co2PerTrip || 0 },
  ].filter(r => r.kgh > 0);
  const coutReactifs = reactifRows.reduce((s, r) => s + (r.kgh / 1000) * r.prix, 0);
  const co2TransportReactifs = reactifRows.reduce((s, r) => s + (r.kgh / 1000) * r.co2T, 0);

  // ── Énergie fossile ────────────────────────────────────────────────────────
  const energieRows = [
    { label: tr('gasHighValue'), MW: d.conso_gaz_H_MW || 0, prix: gasTypes?.naturalGasH?.molecule || 0, co2e: gasTypes?.naturalGasH?.co2Emission || 0 },
    { label: tr('gasLowValue'), MW: d.conso_gaz_L_MW || 0, prix: gasTypes?.naturalGasL?.molecule || 0, co2e: gasTypes?.naturalGasL?.co2Emission || 0 },
    { label: tr('gasProcess'), MW: d.conso_gaz_Process_MW || 0, prix: gasTypes?.processGas?.molecule || 0, co2e: gasTypes?.processGas?.co2Emission || 0 },
    { label: tr('fuel'), MW: d.conso_fuel_MW || 0, prix: fuelTypes?.FOD?.liquid || 0, co2e: fuelTypes?.FOD?.co2Emission || 0 },
  ].filter(r => r.MW > 0);
  const coutEnergie = energieRows.reduce((s, r) => s + r.MW * r.prix, 0);
  const co2Energie = energieRows.reduce((s, r) => s + r.MW * r.co2e, 0);

  // ── Transport résidus ──────────────────────────────────────────────────────
  const coutTransportResidus = (d.cout_transport_incineratino_ash || 0) + (d.cout_transport_boiler_ash || 0) + (d.cout_transport_fly_ash || 0);
  const co2TransportResidus = (d.CO2_transport_incineratino_ash || 0) + (d.CO2_transport_boiler_ash || 0) + (d.CO2_transport_fly_ash || 0);
  const coutTransportReactifs = d.cout_transport_reactifs || 0;

  // ── Totaux ─────────────────────────────────────────────────────────────────
  const totalCout_h = coutElec + coutAir + coutEau + coutReactifs + coutEnergie + coutTransportResidus + coutTransportReactifs;
  const totalCout_an = totalCout_h * availability;
  const totalCO2_kgh = co2Elec + co2Air + co2Energie + co2TransportReactifs + co2TransportResidus;

  return {
    elecRows, totalElec_kW, coutElec, co2Elec,
    conso_air, coutAir, co2Air,
    eauRows, coutEau,
    reactifRows, coutReactifs, co2TransportReactifs,
    energieRows, coutEnergie, co2Energie,
    coutTransportResidus, co2TransportResidus,
    coutTransportReactifs,
    totalCout_h, totalCout_an, totalCO2_kgh,
    currency, availability,
  };
};

// ─── Main Component ───────────────────────────────────────────────────────────

const RK_Report = ({ innerData = {}, currentLanguage = 'fr' }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const t = (key) => translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  const tr = makeReportT(currentLanguage);

  // ── Tab 1 : Combustion Parameters ────────────────────────────────────────────
  const masse = innerData.masse || 0;
  const cv_kJ_kg = innerData.cv_kJ_kg || 0;
  const cvw_kJ_kg = innerData.cvw_kJ_kg || 0;
  const cvw_kcal_kg = innerData.cvw_kcal_kg || 0;

  const elementsKgH = {
    'C [kg/h]': innerData.Cmass,
    'H [kg/h]': innerData.Hmass,
    'O [kg/h]': innerData.Omass,
    'N [kg/h]': innerData.Nmass,
    'S [kg/h]': innerData.Smass,
    'Cl [kg/h]': innerData.Clmass,
  };
  const fractionsMasses = {
    'Comb [kg/h]': innerData.Combmass,
    'Eau [kg/h]': innerData.Watermass,
    'Inerte [kg/h]': innerData.Inertmass,
  };

  // ── Tab 2 : Flue Gas ─────────────────────────────────────────────────────────
  const T_OUT = innerData.T_OUT || 0;
  const O2_calcule = innerData.O2_calcule || 0;
  const FG_OUT_kg_h = innerData.FG_OUT_kg_h || {};
  const FG_RK_OUT_Nm3_h = innerData.FG_RK_OUT_Nm3_h || {};
  const FG_wet_total = (FG_OUT_kg_h.CO2 || 0) + (FG_OUT_kg_h.H2O || 0) + (FG_OUT_kg_h.O2 || 0) + (FG_OUT_kg_h.N2 || 0);

  // ── Tab 3 : Pollutant Emissions ───────────────────────────────────────────────
  const PInput = innerData.PInput || {};
  const Poutput = innerData.Poutput || {};
  const Residus = innerData.Residus || {};
  const Conso_reactifs = innerData.Conso_reactifs || {};

  // ── Tab 4 : Design ────────────────────────────────────────────────────────────
  const elecRows = [
    { label: innerData.labelElec1 || tr('elecRotationRK'), value: innerData.consoElec1 },
    { label: innerData.labelElec2 || tr('elecPompeLances'), value: innerData.consoElec2 },
    { label: innerData.labelElec3 || tr('compressedAir'), value: innerData.consoElec3 },
    { label: innerData.labelElec4 || tr('elecVentAirComb'), value: innerData.consoElec4 },
    { label: innerData.labelElec5 || tr('elecVentVirole'), value: innerData.consoElec5 },
    { label: innerData.labelElec6 || tr('elecExtracteur'), value: innerData.consoElec6 },
    { label: innerData.labelElec7 || tr('elecPompeBoue'), value: innerData.consoElec7 },
    { label: innerData.labelElec8 || tr('elecTapis'), value: innerData.consoElec8 },
  ].filter(r => r.value !== undefined && r.value !== null);

  const waterConsumption = [
    { label: `${tr('waterPotable')} [m³/h]`, value: innerData.Conso_EauPotable_m3 },
    { label: `${tr('waterCooling')} [m³/h]`, value: innerData.Conso_EauRefroidissement_m3 },
    { label: `${tr('waterDemin')} [m³/h]`, value: innerData.Conso_EauDemin_m3 },
    { label: `${tr('waterRiver')} [m³/h]`, value: innerData.Conso_EauRiviere_m3 },
    { label: `${tr('waterSoft')} [m³/h]`, value: innerData.Conso_EauAdoucie_m3 },
  ].filter(r => parseFloat(r.value) > 0);

  const reactifConsumption = [
    { label: 'CaCO₃ [kg/h]', value: innerData.Conso_CaCO3_kg },
    { label: 'CaO [kg/h]', value: innerData.Conso_CaO_kg },
    { label: `${tr('caoh2Dry')} [kg/h]`, value: innerData.Conso_CaOH2_dry_kg },
    { label: `${tr('caoh2Wet')} [kg/h]`, value: innerData.Conso_CaOH2_wet_kg },
    { label: 'NaOH [kg/h]', value: innerData.Conso_NaOH_kg },
    { label: 'NaHCO₃ [kg/h]', value: innerData.Conso_NaOHCO3_kg },
    { label: 'NH₃ [kg/h]', value: innerData.Conso_Ammonia_kg },
    { label: 'NaBr/CaBr₂ [kg/h]', value: innerData.Conso_NaBrCaBr2_kg },
    { label: 'CAP [kg/h]', value: innerData.Conso_CAP_kg },
  ].filter(r => parseFloat(r.value) > 0);

  // ── Tab 5 : OPEX costs ────────────────────────────────────────────────────────
  const opex = computeOpexCosts(innerData, tr);

  const fractionLabels = { 'Comb [kg/h]': tr('fracComb'), 'Eau [kg/h]': tr('fracWater'), 'Inerte [kg/h]': tr('fracInert') };

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>{t('title')} — {tr('summaryReport')}</h1>

      {/* ── SECTION 1 : Combustion ──────────────────────────────────────────────── */}
      <Section title={`1. ${t('combustionParameters')}`}>
        <div style={styles.twoCol}>
          <SubSection title={tr('wasteMassCV')}>
            <KV label={t('wasteFlow')} value={fmt(masse)} unit="kg/h" />
            <KV label={tr('pciFuel')} value={fmt(cv_kJ_kg)} unit="kJ/kg" />
            <KV label={tr('pciWaste')} value={fmt(cvw_kJ_kg)} unit="kJ/kg" />
            <KV label={tr('pciWaste')} value={fmt(cvw_kcal_kg)} unit="kcal/kg" />
          </SubSection>
          <SubSection title={tr('massFractions')}>
            {Object.entries(fractionsMasses).map(([k, v]) => (
              <KV key={k} label={fractionLabels[k] || k} value={fmt(v)} />
            ))}
          </SubSection>
        </div>
        <SubSection title={tr('combustibleElements')}>
          <div style={styles.tagRow}>
            {Object.entries(elementsKgH).map(([k, v]) => (
              <div key={k} style={styles.tag}>
                <span style={styles.tagLabel}>{k}</span>
                <span style={styles.tagValue}>{fmt(v)}</span>
              </div>
            ))}
          </div>
        </SubSection>
      </Section>

      {/* ── SECTION 2 : Gaz de combustion ──────────────────────────────────────── */}
      <Section title={`2. ${t('flueGases')}`}>
        <div style={styles.twoCol}>
          <SubSection>
            <KV label={tr('outTemp')} value={fmt(T_OUT, 0)} unit="°C" />
            <KV label={tr('o2Measured')} value={fmt(O2_calcule)} unit="%" />
            <KV label={tr('flowDry')} value={fmt(FG_RK_OUT_Nm3_h.dry, 0)} unit="Nm³/h" />
            <KV label={tr('flowWet')} value={fmt(FG_RK_OUT_Nm3_h.wet, 0)} unit="Nm³/h" />
          </SubSection>
          <SubSection title={tr('compKilnExtractor')}>
            <GasTable
              tr={tr}
              data={{
                'kg/h': FG_OUT_kg_h,
                'Nm³/h': {
                  CO2: FG_RK_OUT_Nm3_h.CO2,
                  H2O: FG_RK_OUT_Nm3_h.H2O,
                  O2: FG_RK_OUT_Nm3_h.O2,
                  N2: FG_RK_OUT_Nm3_h.N2,
                },
              }}
            />
            <KV label={tr('totalWetFlowKgh')} value={fmt(FG_wet_total)} />
          </SubSection>
        </div>
      </Section>

      {/* ── SECTION 3 : Émissions polluantes ───────────────────────────────────── */}
      <Section title={`3. ${t('pollutantEmissions')}`}>
        <SubSection title={t('inputFlueGas') + ' [kg/h]'}>
          <PollutantTable masses={PInput} />
        </SubSection>
        <SubSection title={t('outputFlueGas') + ' [kg/h]'}>
          <PollutantTable masses={Poutput} />
        </SubSection>
        <div style={styles.twoCol}>
          <SubSection title={t('bottomAshesCalculated')}>
            <KV label={t('bottomAsh')} value={fmt(Residus.DryBottomAsh_kg_h)} unit="kg/h" />
            <KV label={t('bottomAshWet')} value={fmt(Residus.WetBottomAsh_kg_h)} unit="kg/h" />
            <KV label={t('flyAsh')} value={fmt(Residus.FlyAsh_kg_h)} unit="kg/h" />
          </SubSection>
          {reactifConsumption.length > 0 && (
            <SubSection title={tr('reagentConsumption')}>
              {reactifConsumption.map(({ label, value }) => (
                <KV key={label} label={label} value={fmt(value, 3)} />
              ))}
            </SubSection>
          )}
        </div>
      </Section>

      {/* ── SECTION 4 : Design ─────────────────────────────────────────────────── */}
      <Section title={`4. ${t('design')}`}>
        <div style={styles.twoCol}>
          <SubSection title={tr('elecConsumption')}>
            {elecRows.length > 0
              ? <ElecTable rows={elecRows} tr={tr} />
              : <span style={{ color: '#999', fontSize: 12 }}>{tr('dataNotAvailableDesign')}</span>
            }
          </SubSection>
          <div>
            {waterConsumption.length > 0 && (
              <SubSection title={tr('waterConsumption')}>
                {waterConsumption.map(({ label, value }) => (
                  <KV key={label} label={label} value={fmt(value, 3)} />
                ))}
              </SubSection>
            )}
            <SubSection title={tr('auxEnergy')}>
              <KV label={tr('gasHighMW')} value={fmt(innerData.conso_gaz_H_MW)} />
              <KV label={tr('fuelMW')} value={fmt(innerData.conso_fuel_MW)} />
              <KV label={tr('compAirNm3h')} value={fmt(innerData.conso_air_co_N_m3)} />
            </SubSection>
            <SubSection title={tr('solidsProduced')}>
              <KV label={tr('bottomAshInc')} value={fmt(innerData.conso_incineration_ash_kg_h)} />
              <KV label={tr('boilerAsh')} value={fmt(innerData.conso_boiler_ash_kg_h)} />
              <KV label={tr('flyAshLabel')} value={fmt(innerData.conso_fly_ash_kg_h)} />
            </SubSection>
          </div>
        </div>
      </Section>

      {/* ── SECTION 5 : OPEX — coûts calculés ─────────────────────────────────── */}
      <Section title={`5. ${t('opex')} — ${tr('hourlyCostsSuffix')}`}>
        <OpexCostSection opex={opex} tr={tr} />
      </Section>

      <div style={styles.footer}>
        {tr('autoGenerated')} {new Date().toLocaleDateString(languageCode)}
      </div>
    </div>
  );
};

// ─── OPEX cost section ────────────────────────────────────────────────────────

const OpexCostSection = ({ opex, tr }) => {
  const {
    elecRows, totalElec_kW, coutElec, co2Elec,
    conso_air, coutAir, co2Air,
    eauRows, coutEau,
    reactifRows, coutReactifs, co2TransportReactifs,
    energieRows, coutEnergie, co2Energie,
    coutTransportResidus, co2TransportResidus,
    coutTransportReactifs,
    totalCout_h, totalCout_an, totalCO2_kgh,
    currency, availability,
  } = opex;

  const noData = totalElec_kW === 0 && coutEnergie === 0 && coutEau === 0;
  if (noData) {
    return (
      <p style={{ color: '#999', fontSize: 12, padding: '10px 14px' }}>
        {tr('opexNotAvailable')}
      </p>
    );
  }

  return (
    <div>
      {/* Résumé en tuiles ───────────────────────────────────────────────── */}
      <div style={{ ...styles.subSection, paddingBottom: 4 }}>
        <div style={styles.tagRow}>
          {[
            { label: `${tr('electricity')} [${currency}/h]`, val: coutElec, color: '#4a90e2' },
            { label: `${tr('compressedAir')} [${currency}/h]`, val: coutAir, color: '#17a2b8' },
            { label: `${tr('water')} [${currency}/h]`, val: coutEau, color: '#2ecc71' },
            { label: `${tr('reagents')} [${currency}/h]`, val: coutReactifs, color: '#e74c3c' },
            { label: `${tr('fossilEnergy')} [${currency}/h]`, val: coutEnergie, color: '#f39c12' },
            { label: `${tr('transportResiduesShort')} [${currency}/h]`, val: coutTransportResidus, color: '#8e44ad' },
            { label: `${tr('transportReagentsShort')} [${currency}/h]`, val: coutTransportReactifs, color: '#9b59b6' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ ...styles.tag, borderLeft: `4px solid ${color}`, minWidth: 140 }}>
              <span style={styles.tagLabel}>{label}</span>
              <span style={{ ...styles.tagValue, color }}>{fmt(val, 2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Totaux ─────────────────────────────────────────────────────────── */}
      <div style={styles.twoCol}>
        <div style={{ ...styles.subSection, background: '#f0f5ff', margin: 8, borderRadius: 6 }}>
          <h3 style={{ ...styles.subTitle, color: '#1a3a6b', fontSize: 14 }}>{tr('totalCost')}</h3>
          <KV label={`${tr('hourlyCost')} [${currency}/h]`} value={fmt(totalCout_h, 2)} />
          <KV label={`${tr('annualCost')} (${availability}h) [${currency}${tr('perYear')}]`} value={fmt(totalCout_an, 0)} />
        </div>
        <div style={{ ...styles.subSection, background: '#f5f0ff', margin: 8, borderRadius: 6 }}>
          <h3 style={{ ...styles.subTitle, color: '#6a1a6b', fontSize: 14 }}>{tr('totalCO2')}</h3>
          <KV label={`${tr('co2Prefix')} ${tr('electricity')} [kg/h]`} value={fmt(co2Elec, 3)} />
          <KV label={`${tr('co2Prefix')} ${tr('compressedAir')} [kg/h]`} value={fmt(co2Air, 3)} />
          <KV label={`${tr('co2Prefix')} ${tr('fossilEnergy')} [kg/h]`} value={fmt(co2Energie, 3)} />
          <KV label={`${tr('co2Prefix')} ${tr('transportReagentsShort')} [kg/h]`} value={fmt(co2TransportReactifs, 3)} />
          <KV label={`${tr('co2Prefix')} ${tr('transportResiduesShort')} [kg/h]`} value={fmt(co2TransportResidus, 3)} />
          <KV label={`${tr('totalCO2')} [kg/h]`} value={fmt(totalCO2_kgh, 2)} />
        </div>
      </div>

      {/* Détail par catégorie ────────────────────────────────────────────── */}
      <div style={styles.twoCol}>

        {/* Électricité */}
        {elecRows.length > 0 && (
          <div style={styles.subSection}>
            <h3 style={styles.subTitle}>{tr('electricity')} — {tr('detailSuffix')}</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{tr('item')}</th>
                  <th style={styles.th}>kW</th>
                  <th style={styles.th}>{`${currency}/h`}</th>
                </tr>
              </thead>
              <tbody>
                {elecRows.map(r => {
                  const { purchaseElectricityPrice = 0 } = getOpexData();
                  const cout = (r.kW / 1000) * purchaseElectricityPrice;
                  return (
                    <tr key={r.label}>
                      <td style={styles.tdLabel}>{r.label}</td>
                      <td style={styles.td}>{fmt(r.kW)}</td>
                      <td style={styles.td}>{fmt(cout, 2)}</td>
                    </tr>
                  );
                })}
                <tr style={{ fontWeight: 'bold', background: '#eaf0fb' }}>
                  <td style={styles.tdLabel}>{tr('total')}</td>
                  <td style={styles.td}>{fmt(totalElec_kW)}</td>
                  <td style={styles.td}>{fmt(coutElec, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Eau */}
        {eauRows.length > 0 && (
          <div style={styles.subSection}>
            <h3 style={styles.subTitle}>{tr('water')} — {tr('detailSuffix')}</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{tr('type')}</th>
                  <th style={styles.th}>m³/h</th>
                  <th style={styles.th}>{`${currency}/m³`}</th>
                  <th style={styles.th}>{`${currency}/h`}</th>
                </tr>
              </thead>
              <tbody>
                {eauRows.map(r => (
                  <tr key={r.label}>
                    <td style={styles.tdLabel}>{r.label}</td>
                    <td style={styles.td}>{fmt(r.m3h, 3)}</td>
                    <td style={styles.td}>{fmt(r.prix, 3)}</td>
                    <td style={styles.td}>{fmt(r.m3h * r.prix, 2)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 'bold', background: '#eafaf1' }}>
                  <td style={styles.tdLabel}>{tr('total')}</td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                  <td style={styles.td}>{fmt(coutEau, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Réactifs */}
        {reactifRows.length > 0 && (
          <div style={styles.subSection}>
            <h3 style={styles.subTitle}>{tr('reagents')} — {tr('detailSuffix')}</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{tr('reagent')}</th>
                  <th style={styles.th}>kg/h</th>
                  <th style={styles.th}>{`${currency}/T`}</th>
                  <th style={styles.th}>{`${currency}/h`}</th>
                </tr>
              </thead>
              <tbody>
                {reactifRows.map(r => (
                  <tr key={r.label}>
                    <td style={styles.tdLabel}>{r.label}</td>
                    <td style={styles.td}>{fmt(r.kgh, 3)}</td>
                    <td style={styles.td}>{fmt(r.prix, 2)}</td>
                    <td style={styles.td}>{fmt((r.kgh / 1000) * r.prix, 2)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 'bold', background: '#fdecea' }}>
                  <td style={styles.tdLabel}>{tr('total')}</td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                  <td style={styles.td}>{fmt(coutReactifs, 2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Énergie fossile */}
        {energieRows.length > 0 && (
          <div style={styles.subSection}>
            <h3 style={styles.subTitle}>{tr('fossilEnergy')} — {tr('detailSuffix')}</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{tr('type')}</th>
                  <th style={styles.th}>MW</th>
                  <th style={styles.th}>{`${currency}/MWh`}</th>
                  <th style={styles.th}>{`${currency}/h`}</th>
                  <th style={styles.th}>CO₂ [kg/h]</th>
                </tr>
              </thead>
              <tbody>
                {energieRows.map(r => (
                  <tr key={r.label}>
                    <td style={styles.tdLabel}>{r.label}</td>
                    <td style={styles.td}>{fmt(r.MW, 3)}</td>
                    <td style={styles.td}>{fmt(r.prix, 2)}</td>
                    <td style={styles.td}>{fmt(r.MW * r.prix, 2)}</td>
                    <td style={styles.td}>{fmt(r.MW * r.co2e, 3)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 'bold', background: '#fff8e1' }}>
                  <td style={styles.tdLabel}>{tr('total')}</td>
                  <td style={styles.td}></td>
                  <td style={styles.td}></td>
                  <td style={styles.td}>{fmt(coutEnergie, 2)}</td>
                  <td style={styles.td}>{fmt(co2Energie, 3)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  container: {
    fontFamily: 'Arial, sans-serif',
    fontSize: 13,
    color: '#222',
    maxWidth: 1100,
    margin: '0 auto',
    padding: '20px 24px',
    backgroundColor: '#fff',
  },
  mainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a3a6b',
    borderBottom: '3px solid #4a90e2',
    paddingBottom: 8,
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
    border: '1px solid #d0daea',
    borderRadius: 6,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
    background: '#4a90e2',
    margin: 0,
    padding: '8px 14px',
  },
  subSection: {
    padding: '10px 14px',
  },
  subTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a3a6b',
    margin: '0 0 6px 0',
    borderBottom: '1px solid #e0e8f4',
    paddingBottom: 3,
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 0,
  },
  kvRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    borderBottom: '1px dotted #e8e8e8',
  },
  kvLabel: {
    color: '#444',
    flex: 1,
  },
  kvValue: {
    fontWeight: 'bold',
    color: '#1a3a6b',
    minWidth: 80,
    textAlign: 'right',
  },
  kvUnit: {
    fontWeight: 'normal',
    color: '#666',
    fontSize: 11,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 11,
    marginBottom: 8,
  },
  th: {
    background: '#eaf0fb',
    border: '1px solid #c5d5ea',
    padding: '4px 6px',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#1a3a6b',
  },
  td: {
    border: '1px solid #dde6f0',
    padding: '3px 6px',
    textAlign: 'center',
    color: '#222',
  },
  tdLabel: {
    border: '1px solid #dde6f0',
    padding: '3px 8px',
    textAlign: 'left',
    color: '#333',
    fontStyle: 'italic',
  },
  tableTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 4,
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    padding: '4px 0',
  },
  tag: {
    background: '#f0f5ff',
    border: '1px solid #c5d5ea',
    borderRadius: 4,
    padding: '4px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: 110,
  },
  tagLabel: {
    fontSize: 10,
    color: '#555',
  },
  tagValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a3a6b',
  },
  footer: {
    marginTop: 24,
    textAlign: 'right',
    fontSize: 11,
    color: '#999',
    borderTop: '1px solid #eee',
    paddingTop: 8,
  },
};

export default RK_Report;
