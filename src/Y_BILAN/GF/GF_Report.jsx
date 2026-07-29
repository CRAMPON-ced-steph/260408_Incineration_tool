import React from 'react';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { makeReportT } from '../../D_BILAN_Rapports/report_traduction';
import { translations } from './GF_traduction';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import { CO2_kg_m3, H2O_kg_m3, O2_kg_m3, N2_kg_m3 } from '../../A_Transverse_fonction/conv_calculation';
import { fmt } from '../../A_Transverse_fonction/formatNumber';
import { cp_ref } from '../../A_Transverse_fonction/constantes';

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
    <span style={styles.kvValue}>
      {value}
      {unit ? <span style={styles.kvUnit}> {unit}</span> : null}
    </span>
  </div>
);

const GasTable = ({ data = {}, t = (k) => k }) => {
  const gases = ['CO2', 'H2O', 'O2', 'N2'];
  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}></th>
          {gases.map(g => <th key={g} style={styles.th}>{g}</th>)}
          <th style={styles.th}>{t("total")}</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data).map(([lbl, d]) => {
          const tot = gases.reduce((s, g) => s + (parseFloat(d[g]) || 0), 0);
          return (
            <tr key={lbl}>
              <td style={styles.tdLabel}>{lbl}</td>
              {gases.map(g => <td key={g} style={styles.td}>{fmt(d[g])}</td>)}
              <td style={{ ...styles.td, fontWeight: 'bold' }}>{fmt(tot)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const PollutantTable = ({ masses = {} }) => {
  const keys = Object.keys(masses).filter(k => masses[k] !== undefined);
  if (keys.length === 0) {
    return <p style={{ color: '#999', fontSize: 12, margin: '4px 0' }}>—</p>;
  }
  return (
    <table style={styles.table}>
      <thead>
        <tr>{keys.map(k => <th key={k} style={styles.th}>{k}</th>)}</tr>
      </thead>
      <tbody>
        <tr>{keys.map(k => <td key={k} style={styles.td}>{fmt(masses[k], 4)}</td>)}</tr>
      </tbody>
    </table>
  );
};

// ─── OPEX cost calculation (mirrors OpexDashboard logic) ──────────────────────

const computeOpexCosts = (innerData, tr = (k) => k) => {
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
  const elecRows = [1, 2, 3, 4, 5, 6, 7, 8]
    .map(i => ({ label: d[`labelElec${i}`] || `Poste ${i}`, kW: d[`consoElec${i}`] || 0 }))
    .filter(r => r.kW > 0);
  const totalElec_kW = elecRows.reduce((s, r) => s + r.kW, 0);
  const coutElec = (totalElec_kW / 1000) * purchaseElectricityPrice;
  const co2Elec = (ratioElec * totalElec_kW) / 1000;

  // ── Air comprimé ───────────────────────────────────────────────────────────
  const conso_air = d.conso_air_co_N_m3 || 0;
  const coutAir = (conso_air / 1000) * airConsumptionPrice;
  const co2Air = (conso_air * powerRatio * ratioElec) / 1000;

  // ── Eau ───────────────────────────────────────────────────────────────────
  const eauRows = [
    { label: tr("waterPotable"),           m3h: d.Conso_EauPotable_m3        || 0, prix: waterPrices?.potable       || 0 },
    { label: tr("waterCooling"),m3h: d.Conso_EauRefroidissement_m3 || 0, prix: waterPrices?.cooling       || 0 },
    { label: tr("waterDemin"),     m3h: d.Conso_EauDemin_m3          || 0, prix: waterPrices?.demineralized || 0 },
    { label: tr("waterRiver"),        m3h: d.Conso_EauRiviere_m3        || 0, prix: waterPrices?.river         || 0 },
    { label: tr("waterSoft"),           m3h: d.Conso_EauAdoucie_m3        || 0, prix: waterPrices?.soft          || 0 },
  ].filter(r => r.m3h > 0);
  const coutEau = eauRows.reduce((s, r) => s + r.m3h * r.prix, 0);

  // ── Réactifs ──────────────────────────────────────────────────────────────
  const reactifRows = [
    { label: 'CaCO₃',        kgh: d.Conso_CaCO3_kg      || 0, prix: reagentsTypes?.CaCO3?.cost      || 0, co2T: reagentsTypes?.CaCO3?.co2PerTrip      || 0 },
    { label: 'CaO',          kgh: d.Conso_CaO_kg         || 0, prix: reagentsTypes?.CaO?.cost         || 0, co2T: reagentsTypes?.CaO?.co2PerTrip         || 0 },
    { label: tr("caoh2Dry"),  kgh: d.Conso_CaOH2_dry_kg  || 0, prix: reagentsTypes?.CaOH2?.cost       || 0, co2T: reagentsTypes?.CaOH2?.co2PerTrip       || 0 },
    { label: tr("caoh2Hum"), kgh: d.Conso_CaOH2_wet_kg  || 0, prix: reagentsTypes?.CaOH2?.cost       || 0, co2T: reagentsTypes?.CaOH2?.co2PerTrip       || 0 },
    { label: 'NaOH',         kgh: d.Conso_NaOH_kg        || 0, prix: reagentsTypes?.NaOH?.cost        || 0, co2T: reagentsTypes?.NaOH?.co2PerTrip        || 0 },
    { label: 'NaHCO₃',       kgh: d.Conso_NaOHCO3_kg    || 0, prix: reagentsTypes?.NaOHCO3?.cost     || 0, co2T: reagentsTypes?.NaOHCO3?.co2PerTrip     || 0 },
    { label: 'NH₃',          kgh: d.Conso_Ammonia_kg     || 0, prix: reagentsTypes?.NH3?.cost         || 0, co2T: reagentsTypes?.NH3?.co2PerTrip         || 0 },
    { label: 'NaBr/CaBr₂',   kgh: d.Conso_NaBrCaBr2_kg  || 0, prix: reagentsTypes?.NaBr_CaBr2?.cost  || 0, co2T: reagentsTypes?.NaBr_CaBr2?.co2PerTrip  || 0 },
    { label: 'CAP',          kgh: d.Conso_CAP_kg         || 0, prix: reagentsTypes?.CAP?.cost         || 0, co2T: reagentsTypes?.CAP?.co2PerTrip         || 0 },
  ].filter(r => r.kgh > 0);
  const coutReactifs = reactifRows.reduce((s, r) => s + (r.kgh / 1000) * r.prix, 0);
  const co2TransportReactifs = reactifRows.reduce((s, r) => s + (r.kgh / 1000) * r.co2T, 0);

  // ── Énergie fossile ────────────────────────────────────────────────────────
  const energieRows = [
    { label: tr("gasHighValue"), MW: d.conso_gaz_H_MW      || 0, prix: gasTypes?.naturalGasH?.molecule  || 0, co2e: gasTypes?.naturalGasH?.co2Emission  || 0 },
    { label: tr("gasLowValue"), MW: d.conso_gaz_L_MW      || 0, prix: gasTypes?.naturalGasL?.molecule  || 0, co2e: gasTypes?.naturalGasL?.co2Emission  || 0 },
    { label: tr("gasProcess"),      MW: d.conso_gaz_Process_MW|| 0, prix: gasTypes?.processGas?.molecule   || 0, co2e: gasTypes?.processGas?.co2Emission   || 0 },
    { label: tr("fuel"),             MW: d.conso_fuel_MW       || 0, prix: fuelTypes?.FOD?.liquid            || 0, co2e: fuelTypes?.FOD?.co2Emission          || 0 },
  ].filter(r => r.MW > 0);
  const coutEnergie = energieRows.reduce((s, r) => s + r.MW * r.prix, 0);
  const co2Energie = energieRows.reduce((s, r) => s + r.MW * r.co2e, 0);

  // ── Transport résidus ──────────────────────────────────────────────────────
  const coutTransportResidus =
    (d.cout_transport_incineratino_ash || 0) +
    (d.cout_transport_boiler_ash       || 0) +
    (d.cout_transport_fly_ash          || 0);
  const co2TransportResidus =
    (d.CO2_transport_incineratino_ash  || 0) +
    (d.CO2_transport_boiler_ash        || 0) +
    (d.CO2_transport_fly_ash           || 0);
  const coutTransportReactifs = d.cout_transport_reactifs || 0;

  // ── Totaux ─────────────────────────────────────────────────────────────────
  const totalCout_h =
    coutElec + coutAir + coutEau + coutReactifs + coutEnergie +
    coutTransportResidus + coutTransportReactifs;
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

// ─── OPEX section ─────────────────────────────────────────────────────────────

const OpexCostSection = ({ opex, tr = (k) => k }) => {
  const {
    elecRows, totalElec_kW, coutElec, co2Elec,
    coutAir, co2Air,
    eauRows, coutEau,
    reactifRows, coutReactifs, co2TransportReactifs,
    energieRows, coutEnergie, co2Energie,
    coutTransportResidus, co2TransportResidus,
    coutTransportReactifs,
    totalCout_h, totalCout_an, totalCO2_kgh,
    currency, availability,
  } = opex;

  const noData =
    totalElec_kW === 0 && coutEnergie === 0 && coutEau === 0 && reactifRows.length === 0;

  if (noData) {
    return (
      <p style={{ color: '#999', fontSize: 12, padding: '10px 14px' }}>
        {tr("opexNotAvailable")}
      </p>
    );
  }

  return (
    <div>
      {/* Résumé en tuiles ────────────────────────────────────────────────── */}
      <div style={{ ...styles.subSection, paddingBottom: 4 }}>
        <div style={styles.tagRow}>
          {[
            { label: `${tr("electricity")} [${currency}/h]`,          val: coutElec,              color: '#4a90e2' },
            { label: `${tr("compressedAir")} [${currency}/h]`,        val: coutAir,               color: '#17a2b8' },
            { label: `${tr("water")} [${currency}/h]`,                val: coutEau,               color: '#2ecc71' },
            { label: `${tr("reagents")} [${currency}/h]`,             val: coutReactifs,          color: '#e74c3c' },
            { label: `${tr("fossilEnergy")} [${currency}/h]`,         val: coutEnergie,           color: '#f39c12' },
            { label: `${tr("transportResiduesShort")} [${currency}/h]`, val: coutTransportResidus, color: '#8e44ad' },
            { label: `${tr("transportReagentsShort")} [${currency}/h]`, val: coutTransportReactifs,color: '#9b59b6' },
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
          <h3 style={{ ...styles.subTitle, color: '#1a3a6b', fontSize: 14 }}>{tr("totalCost")}</h3>
          <KV label={`${tr("hourlyCost")} [${currency}/h]`}                       value={fmt(totalCout_h, 2)} />
          <KV label={`${tr("annualCost")} (${availability}h) [${currency}${tr("perYear")}]`} value={fmt(totalCout_an, 0)} />
        </div>
        <div style={{ ...styles.subSection, background: '#f5f0ff', margin: 8, borderRadius: 6 }}>
          <h3 style={{ ...styles.subTitle, color: '#6a1a6b', fontSize: 14 }}>{tr("totalCO2")}</h3>
          <KV label={`${tr("co2Prefix")} ${tr("electricity")} [kg/h]`}           value={fmt(co2Elec, 3)} />
          <KV label={`${tr("co2Prefix")} ${tr("compressedAir")} [kg/h]`}         value={fmt(co2Air, 3)} />
          <KV label={`${tr("co2Prefix")} ${tr("fossilEnergy")} [kg/h]`}          value={fmt(co2Energie, 3)} />
          <KV label={`${tr("co2Prefix")} ${tr("transportReagentsShort")} [kg/h]`} value={fmt(co2TransportReactifs, 3)} />
          <KV label={`${tr("co2Prefix")} ${tr("transportResiduesShort")} [kg/h]`} value={fmt(co2TransportResidus, 3)} />
          <KV label={`${tr("totalCO2")} [kg/h]`}                                value={fmt(totalCO2_kgh, 2)} />
        </div>
      </div>

      {/* Détail par catégorie ────────────────────────────────────────────── */}
      <div style={styles.twoCol}>

        {/* Électricité */}
        {elecRows.length > 0 && (
          <div style={styles.subSection}>
            <h3 style={styles.subTitle}>{tr("elecDetail")}</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{tr("item")}</th>
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
                  <td style={styles.tdLabel}>{tr("total")}</td>
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
            <h3 style={styles.subTitle}>{tr("eauDetail")}</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{tr("type")}</th>
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
                  <td style={styles.tdLabel}>{tr("total")}</td>
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
            <h3 style={styles.subTitle}>{tr("reactifsDetail")}</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{tr("reagent")}</th>
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
                  <td style={styles.tdLabel}>{tr("total")}</td>
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
            <h3 style={styles.subTitle}>{tr("energieFossileDetail")}</h3>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{tr("type")}</th>
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
                  <td style={styles.tdLabel}>{tr("total")}</td>
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

// ─── Main Component ───────────────────────────────────────────────────────────

const GF_Report = ({ innerData = {}, currentLanguage = 'fr' }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const tr = makeReportT(currentLanguage);
  const t = (key) => translations[languageCode]?.[key] || translations['fr']?.[key] || key;

  // ── Section 1 : OM ────────────────────────────────────────────────────────
  const daysPerWeek        = innerData.daysPerWeek        ?? 0;
  const hoursPerDay        = innerData.hoursPerDay        ?? 0;
  const totalHoursPerWeek  = innerData.totalHoursPerWeek  ?? 0;

  const sludgeType         = innerData.sludgeType         || '—';
  const MS_pourcent        = innerData.MS_pourcent        ?? 0;
  const MV_pourcent        = innerData.MV_pourcent        ?? 0;
  const MS_kg_h            = innerData.MS_kg_h            ?? 0;
  const MasseBoueBrute     = innerData.BoueBrute_kg_h     || innerData.MasseBoueBrute || 0;
  const MV_kg_h            = innerData.MV_kg_h            ?? 0;
  const EauExtraite_kg_h   = innerData.EauExtraite_kg_h   ?? 0;
  const MM_kg_h            = innerData.MM_kg_h            ?? 0;

  const C_percent          = innerData.C_percent          ?? 0;
  const H_percent          = innerData.H_percent          ?? 0;
  const O_percent          = innerData.O_percent          ?? 0;
  const N_percent          = innerData.N_percent          ?? 0;
  const S_percent          = innerData.S_percent          ?? 0;
  const Cl_percent         = innerData.Cl_percent         ?? 0;

  const pciKJkgMV          = innerData.pciKJkgMV          ?? 0;
  const PCIKCALKGMV        = innerData.PCIKCALKGMV        ?? 0;
  const pciKcalkg          = innerData.pciKcalkg          ?? 0;
  const pcsKcalkgMV        = innerData.pcsKcalkgMV        ?? 0;
  const pcsKcalkg          = innerData.pcsKcalkg          ?? 0;
  const pciDulong          = innerData.pciDulong          ?? 0;

  const heavyMetalsData    = innerData.heavyMetalsData    || {};
  const metalMasses        = {
    Al:    innerData.Al_kg_h    ?? 0,
    As:    innerData.As_kg_h    ?? 0,
    Cd:    innerData.Cd_kg_h    ?? 0,
    Cr:    innerData.Cr_kg_h    ?? 0,
    Cu:    innerData.Cu_kg_h    ?? 0,
    Fe:    innerData.Fe_kg_h    ?? 0,
    Hg:    innerData.Hg_kg_h    ?? 0,
    Ni:    innerData.Ni_kg_h    ?? 0,
    Pb:    innerData.Pb_kg_h    ?? 0,
    Zn:    innerData.Zn_kg_h    ?? 0,
    PCDDF: innerData.PCDDF_kg_h ?? 0,
    Ti:    innerData.Ti_kg_h    ?? 0,
    Hf:    innerData.HF_kg_h    ?? 0,
  };

  // ── Section 2 : Combustion ───────────────────────────────────────────────────
  // T_OUT = Temp_fumee_voute_C (sortie SCC, pas de HX)
  const T_OUT       = innerData.T_OUT       || innerData.Temp_fumee_voute_C || 0;
  const O2_calcule  = innerData.O2_calcule  || 0;
  const FG_OUT_kg_h = innerData.FG_OUT_kg_h || {};

  // Nm³/h : direct or fallback computed from kg/h
  const _nm3Fallback = {
    CO2: CO2_kg_m3(FG_OUT_kg_h.CO2 || 0),
    H2O: H2O_kg_m3(FG_OUT_kg_h.H2O || 0),
    O2:  O2_kg_m3(FG_OUT_kg_h.O2   || 0),
    N2:  N2_kg_m3(FG_OUT_kg_h.N2   || 0),
  };
  _nm3Fallback.dry = _nm3Fallback.CO2 + _nm3Fallback.O2 + _nm3Fallback.N2;
  _nm3Fallback.wet = _nm3Fallback.dry + _nm3Fallback.H2O;
  const FG_OUT_Nm3_h   = innerData.FG_OUT_Nm3_h || _nm3Fallback;
  const FG_wet_total   = (FG_OUT_kg_h.CO2 || 0) + (FG_OUT_kg_h.H2O || 0)
                       + (FG_OUT_kg_h.O2  || 0) + (FG_OUT_kg_h.N2  || 0);

  // Air de combustion
  const Masse_air_sec_kg_h              = innerData.Masse_air_sec_combustion_tot_kg_h ?? 0;
  const Q_air_comb_tot_Nm3_h            = innerData.Q_air_comb_tot_Nm3_h             ?? 0;
  const Volume_air_balayage             = innerData.Volume_air_balayage              ?? 0;
  const Volume_air_combustible_total    = innerData.Volume_air_combustible_total_Nm3_h ?? 0;
  const Temp_air_fluidisation           = innerData.Temp_air_fluidisation_av_prechauffe_C ?? 0;
  const Meau_air_comburant              = innerData.Meau_air_comburant               ?? 0;

  // Paramètres combustion
  const Exces_air                       = innerData.Exces_air                        ?? 0;
  const Exces_air_lit                   = innerData.Exces_air_lit                    ?? 0;
  const Exces_air_combustible           = innerData.Exces_air_combustible            ?? 0;
  const Q_gaz_kg_h                      = innerData.Q_gaz_kg_h                      ?? 0;
  const Q_gaz_Nm3_h                     = innerData.Q_gaz_Nm3_h                     ?? 0;

  // Fumées voûte
  const FG_wet_Nm3_h                    = innerData.FG_wet_Nm3_h                    ?? 0;
  const FG_dry_Nm3_h                    = innerData.FG_dry_Nm3_h                    ?? 0;
  const Rho_FG_kg_Nm3                   = innerData.Rho_FG_kg_Nm3                   ?? 0;
  const Temp_fumee_voute_C              = innerData.Temp_fumee_voute_C              ?? 0;
  const m_co                            = innerData.m_co                            ?? 0;
  const m_co2                           = innerData.m_co2                           ?? 0;
  const m_h2o                           = innerData.m_h2o                           ?? 0;
  const m_n2                            = innerData.m_n2                            ?? 0;
  const m_o2                            = innerData.m_o2                            ?? 0;
  const m_so2                           = innerData.m_so2                           ?? 0;
  const m_chcl                          = innerData.m_chcl                          ?? 0;

  // Paramètres thermiques
  const Hf_voute_kW                     = innerData.Hf_voute_kW                     ?? 0;

  // Bilan énergétique — clés confirmées dans innerData (écrites par CombustionTab)
  const H_in_kW              = innerData.H_in_kW             ?? 0;
  const H_pertes_kW          = innerData.H_pertes_kW         ?? 0;
  const H_imbrule_kW         = innerData.H_imbrule_kW        ?? 0;
  const H_air_balayage_kW    = innerData.H_air_balayage_kW   ?? 0;
  const H_air_fluidisation_kW = innerData.H_air_fluidisation_av_prechauffe_kW ?? 0;
  const H_air_secondaire_kW  = innerData.H_air_secondaire_kW ?? 0;
  const H_air_tertiaire_kW   = innerData.H_air_tertiaire_kW  ?? 0;

  // Valeurs écrites depuis CombustionTab (via mes ajouts), ou dérivées si absent
  // H_NETTE_BOUE : stockée par CombustionTab, sinon calculée depuis les données OM
  const _eau_kg_h = MasseBoueBrute - MS_kg_h;  // humidité OM
  const _H_MV_kW  = (pciKJkgMV * MV_kg_h) / 3600;
  const _H_Evap_kW = (_eau_kg_h * (cp_ref * 15 - 2501.6)) / 3600; // T_OM ≈ 15°C
  const H_NETTE_BOUE_kW = innerData.H_NETTE_BOUE_kW !== undefined && innerData.H_NETTE_BOUE_kW !== 0
    ? innerData.H_NETTE_BOUE_kW
    : _H_MV_kW + _H_Evap_kW;

  // H_gaz appoint : stockée, sinon 0
  const H_gaz_inter = innerData.H_gaz_inter !== undefined
    ? innerData.H_gaz_inter
    : 0;

  // H_out : stockée, sinon H_in (convergence → H_out ≈ H_in)
  const H_out_kW = (innerData.H_out_kW !== undefined && innerData.H_out_kW !== 0)
    ? innerData.H_out_kW
    : H_in_kW;

  // H_matiere_minerale : stockée, sinon déduite de H_out - autres sorties
  const H_matiere_minerale_kW = (innerData.H_matiere_minerale_kW !== undefined && innerData.H_matiere_minerale_kW !== 0)
    ? innerData.H_matiere_minerale_kW
    : H_out_kW - Hf_voute_kW - H_pertes_kW - H_imbrule_kW;

  // Résidu (doit être ≈ 0 à convergence)
  const H_gaz_residuel = (innerData.H_gaz_residuel !== undefined && innerData.H_gaz_residuel !== 0)
    ? innerData.H_gaz_residuel
    : H_out_kW - H_in_kW;

  // ── Section 3 : Polluants ─────────────────────────────────────────────────────
  // Keys as remapped by sendAllData: PollutantInput / PollutantOutput (not PInput / Poutput)
  const PollutantInput  = innerData.PollutantInput  || {};
  const PollutantOutput = innerData.PollutantOutput || {};
  const Residus         = innerData.Residus         || {};
  const Conso_reactifs  = innerData.Conso_reactifs  || {};

  const reactifDisplay = [
    { label: 'CaCO₃ [kg/h]',        value: Conso_reactifs.CaCO3     },
    { label: 'CaO [kg/h]',          value: Conso_reactifs.CaO       },
    { label: tr("caoh2SecKgh"),  value: Conso_reactifs.CaOH2dry  },
    { label: tr("caoh2HumKgh"), value: Conso_reactifs.CaOH2wet  },
    { label: 'NaOH [kg/h]',         value: Conso_reactifs.NaOH      },
    { label: 'NaHCO₃ [kg/h]',       value: Conso_reactifs.NaOHCO3   },
    { label: 'NH₃ [kg/h]',          value: Conso_reactifs.Ammonia   },
    { label: 'NaBr/CaBr₂ [kg/h]',   value: Conso_reactifs.NaBrCaBr2 },
    { label: 'CAP [kg/h]',          value: Conso_reactifs.CAP       },
  ].filter(r => parseFloat(r.value) > 0);

  // ── Section 4 : OPEX ─────────────────────────────────────────────────────────
  const opex = computeOpexCosts(innerData, tr);

  return (
    <div style={styles.container}>
      <h1 style={styles.mainTitle}>{tr('bilanTitleGF')}</h1>

      {/* ── SECTION 1 : OM ──────────────────────────────────────────────── */}
      <Section title={`1. ${t('Caractéristiques des OM')}`}>

        {/* Fonctionnement + Débit */}
        <div style={styles.twoCol}>
          <SubSection title={t('Fonctionnement')}>
            <KV label={t('Nombre de jours par semaine')} value={fmt(daysPerWeek, 0)} unit="j/sem" />
            <KV label={t('Nombre d\'heures par jour')}   value={fmt(hoursPerDay, 0)} unit="h/j"   />
            <KV label={tr("total")}                          value={fmt(totalHoursPerWeek, 0)} unit="h/sem" />
          </SubSection>
          <SubSection title={t('Caractéristiques des OM')}>
            <KV label={t('Type de déchet')}          value={sludgeType}                />
            <KV label={t('Siccité')}               value={fmt(MS_pourcent, 1)}  unit="%" />
            <KV label="MV"                         value={fmt(MV_pourcent, 1)}  unit="%" />
            <KV label={t('Débit MS')}              value={fmt(MS_kg_h, 0)}      unit="kg MS/h" />
            <KV label={t('rawOMFlow')}             value={fmt(MasseBoueBrute, 0)} unit="kg/h" />
            <KV label={t('mvFlowLabel')}           value={fmt(MV_kg_h, 0)}      unit="kg MV/h" />
            <KV label={t('Eau extraite')}          value={fmt(EauExtraite_kg_h, 0)} unit="kg/h" />
            <KV label={t('mineralAshMM')}          value={fmt(MM_kg_h, 0)}      unit="kg/h" />
          </SubSection>
        </div>

        {/* CHONS + PCI */}
        <div style={styles.twoCol}>
          <SubSection title={`${t('Composition CHONS')} (% MV)`}>
            <div style={styles.tagRow}>
              {[
                { sym: 'C',  val: C_percent  },
                { sym: 'H',  val: H_percent  },
                { sym: 'O',  val: O_percent  },
                { sym: 'N',  val: N_percent  },
                { sym: 'S',  val: S_percent  },
                { sym: 'Cl', val: Cl_percent },
              ].map(({ sym, val }) => (
                <div key={sym} style={{ ...styles.tag, minWidth: 70 }}>
                  <span style={styles.tagLabel}>{sym} [%]</span>
                  <span style={styles.tagValue}>{fmt(val, 2)}</span>
                </div>
              ))}
            </div>
          </SubSection>
          <SubSection title={tr("pciPcsTitle")}>
            <KV label="PCI [kJ/kg MV]"    value={fmt(pciKJkgMV, 0)}   />
            <KV label="PCI [kcal/kg MV]"  value={fmt(PCIKCALKGMV, 0)} />
            <KV label="PCI [kcal/kg OM]"  value={fmt(pciKcalkg, 0)}   />
            <KV label="PCS [kcal/kg MV]"  value={fmt(pcsKcalkgMV, 0)} />
            <KV label="PCS [kcal/kg OM]"  value={fmt(pcsKcalkg, 0)}   />
            <KV label="PCI Dulong [kcal/kg MV]" value={fmt(pciDulong, 0)} />
          </SubSection>
        </div>

        {/* Métaux lourds */}
        <SubSection title={tr("heavyMetalsLabel")}>
          <div style={styles.tableTitle}>{tr("teneursMgKgMS")}</div>
          <table style={styles.table}>
            <thead>
              <tr>
                {Object.keys(heavyMetalsData).map(k => (
                  <th key={k} style={styles.th}>{k.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {Object.keys(heavyMetalsData).map(k => (
                  <td key={k} style={styles.td}>{fmt(heavyMetalsData[k], k === 'pcddf' ? 6 : 0)}</td>
                ))}
              </tr>
            </tbody>
          </table>
          <div style={{ ...styles.tableTitle, marginTop: 10 }}>{tr("massesKgh")}</div>
          <table style={styles.table}>
            <thead>
              <tr>
                {Object.keys(metalMasses).map(k => (
                  <th key={k} style={styles.th}>{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {Object.keys(metalMasses).map(k => (
                  <td key={k} style={styles.td}>{fmt(metalMasses[k], k === 'PCDDF' ? 8 : 5)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </SubSection>

      </Section>

      {/* ── SECTION 2 : Combustion ─────────────────────────────────────────── */}
      <Section title={`2. ${t('Combustion')}`}>

        {/* Air de combustion + Paramètres combustion */}
        <div style={styles.twoCol}>
          <SubSection title={tr("subCombAir")}>
            <KV label={tr("dryAirMassKgh")}          value={fmt(Masse_air_sec_kg_h, 0)}           />
            <KV label={tr("totalAirFlowNm3h")}       value={fmt(Q_air_comb_tot_Nm3_h, 0)}         />
            <KV label={tr("combustionAirNm3h")}      value={fmt(Volume_air_combustible_total, 0)} />
            <KV label={tr("sweepAirNm3h")}           value={fmt(Volume_air_balayage, 0)}          />
            <KV label={tr("primaryAirTempC")}        value={fmt(Temp_air_fluidisation, 0)}        />
            <KV label={tr("waterInCombAirKgh")}      value={fmt(Meau_air_comburant, 2)}           />
          </SubSection>

          <SubSection title={tr("subCombParams")}>
            <KV label={tr("globalExcessAirPct")}     value={fmt(Exces_air, 1)}                    />
            <KV label={tr("bedExcessAirPct")}        value={fmt(Exces_air_lit, 1)}                />
            <KV label={tr("fuelExcessAirPct")}       value={fmt(Exces_air_combustible, 1)}        />
            <KV label={tr("o2CalcDryPct")}           value={fmt((O2_calcule || 0) * 100, 2)}      />
            <KV label={tr("natGasFlowKgh")}          value={fmt(Q_gaz_kg_h, 2)}                  />
            <KV label={tr("natGasFlowNm3h")}         value={fmt(Q_gaz_Nm3_h, 2)}                 />
          </SubSection>
        </div>

        {/* Fumées SCC + Paramètres thermiques */}
        <div style={styles.twoCol}>
          <SubSection title={tr("subFlueGasSCC")}>
            <KV label={tr("sccFGTempC")}             value={fmt(Temp_fumee_voute_C, 0)}           />
            <KV label={tr("wetFGFlowNm3h")}          value={fmt(FG_wet_Nm3_h, 0)}                 />
            <KV label={tr("dryFGFlowNm3h")}          value={fmt(FG_dry_Nm3_h, 0)}                 />
            <KV label={tr("fgDensityKgNm3")}         value={fmt(Rho_FG_kg_Nm3, 4)}               />
          </SubSection>

          <SubSection title={tr("subThermalParams")}>
            <KV label={tr("sccFGEnthKW")}            value={fmt(Hf_voute_kW, 1)}                  />
          </SubSection>
        </div>

        {/* Résultat de convergence + Gaz sortie four */}
        <div style={styles.twoCol}>
          <SubSection title={tr("subConvergence")}>
            <KV label={tr("convergedNatGasKgh")}     value={fmt(Q_gaz_kg_h, 3)}            />
            <KV label={tr("convergedNatGasNm3h")}    value={fmt(Q_gaz_Nm3_h, 3)}           />
            <KV label={tr("o2CalcDryPct")}           value={fmt((O2_calcule || 0) * 100, 2)} />
            <KV label={tr("sccOutTempC")}            value={fmt(T_OUT, 0)}                  />
          </SubSection>

          <SubSection title={tr("subFurnaceOutlet")}>
            <KV label={tr("totalWetFlowKghLabel")}   value={fmt(FG_wet_total, 0)}           />
            <KV label={tr("dryFlowNm3hLabel")}       value={fmt(FG_OUT_Nm3_h.dry, 0)}       />
            <KV label={tr("wetFlowNm3hLabel")}       value={fmt(FG_OUT_Nm3_h.wet, 0)}       />
            <GasTable
              data={{
                'kg/h':   FG_OUT_kg_h,
                'Nm³/h': {
                  CO2: FG_OUT_Nm3_h.CO2,
                  H2O: FG_OUT_Nm3_h.H2O,
                  O2:  FG_OUT_Nm3_h.O2,
                  N2:  FG_OUT_Nm3_h.N2,
                },
              }}
              t={tr}
            />
          </SubSection>
        </div>

        {/* Bilan énergétique simplifié */}
        <SubSection title={tr("subEnergyBalance")}>
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#D4B5A0' }}>
                <th style={{ ...styles.th, width: '40%' }}>{tr("parametre")}</th>
                <th style={{ ...styles.th, backgroundColor: '#FFE6CC' }}>{tr("entreeKW")}</th>
                <th style={{ ...styles.th, backgroundColor: '#E6F3FF' }}>{tr("sortieKW")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'H_NETTE_OM',           vin: H_NETTE_BOUE_kW,         vout: null },
                { label: 'H_air_neuf_réch',      vin: H_air_fluidisation_kW,   vout: null },
                { label: 'H_air_secondaire',     vin: H_air_secondaire_kW,     vout: null },
                { label: 'H_air_tertiaire',      vin: H_air_tertiaire_kW,      vout: null },
                { label: 'H_air_balayage',       vin: H_air_balayage_kW,        vout: null },
                { label: 'H_gaz appoint',        vin: H_gaz_inter,              vout: null },
                { label: 'H_inertes_cendres',    vin: null, vout: H_matiere_minerale_kW },
                { label: 'Hf_SCC',               vin: null, vout: Hf_voute_kW },
                { label: tr("thermalLosses"),    vin: null, vout: H_pertes_kW },
                { label: tr("imbrulesCOH2"),   vin: null, vout: H_imbrule_kW },
              ].map(({ label, vin, vout }) => (
                <tr key={label}>
                  <td style={{ ...styles.tdLabel, fontWeight: 'bold' }}>{label}</td>
                  <td style={{ ...styles.td, backgroundColor: '#FFF8F0' }}>{vin != null ? fmt(vin, 2) : '—'}</td>
                  <td style={{ ...styles.td, backgroundColor: '#F0F6FF' }}>{vout != null ? fmt(vout, 2) : '—'}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ ...styles.tdLabel, backgroundColor: '#B0D0E8' }}>{tr("totalEntreeHin")}</td>
                <td style={{ ...styles.td, backgroundColor: '#ADD8E6' }}>{fmt(H_in_kW, 2)}</td>
                <td style={{ ...styles.td, backgroundColor: '#B0D0E8' }}>—</td>
              </tr>
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ ...styles.tdLabel, backgroundColor: '#B0D0E8' }}>{tr("totalSortieHout")}</td>
                <td style={{ ...styles.td, backgroundColor: '#B0D0E8' }}>—</td>
                <td style={{ ...styles.td, backgroundColor: '#ADD8E6' }}>{fmt(H_out_kW, 2)}</td>
              </tr>
              <tr style={{ opacity: 0.8 }}>
                <td style={{ ...styles.tdLabel, fontStyle: 'italic', backgroundColor: '#f8f8f8' }}>
                  {tr("residualNote")}
                </td>
                <td style={{ ...styles.td, backgroundColor: '#f8f8f8' }}>—</td>
                <td style={{
                  ...styles.td,
                  backgroundColor: '#f8f8f8',
                  fontStyle: 'italic',
                  color: H_gaz_residuel != null && Math.abs(H_gaz_residuel) < 1 ? '#16a34a' : '#dc2626',
                }}>
                  {H_gaz_residuel != null ? fmt(H_gaz_residuel, 4) : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </SubSection>


      </Section>

      {/* ── SECTION 3 : Émissions polluantes ───────────────────────────────── */}
      <Section title={`3. ${t('Polluant')} — ${tr("pollutantEmissions")}`}>
        <SubSection title={tr("subGasIn")}>
          <PollutantTable masses={PollutantInput} />
        </SubSection>
        <SubSection title={tr("subGasOut")}>
          <PollutantTable masses={PollutantOutput} />
        </SubSection>
        <div style={styles.twoCol}>
          <SubSection title={tr("subSolidResidues")}>
            <KV label={tr("bottomAshDry")}  value={fmt(Residus.DryBottomAsh_kg_h)} />
            <KV label={tr("bottomAshWet")}  value={fmt(Residus.WetBottomAsh_kg_h)} />
            <KV label={tr("flyAshKghLabel")} value={fmt(Residus.FlyAsh_kg_h)}       />
          </SubSection>
          <SubSection title={tr("reagentConsumption")}>
            {reactifDisplay.length > 0
              ? reactifDisplay.map(({ label, value }) => (
                  <KV key={label} label={label} value={fmt(value, 3)} />
                ))
              : <p style={{ color: '#999', fontSize: 12, margin: 0 }}>{tr("aucunReactif")}</p>
            }
          </SubSection>
        </div>
      </Section>

      {/* ── SECTION 4 : OPEX ───────────────────────────────────────────────── */}
      <Section title={`4. ${t('OPEX')} — ${tr("hourlyCostsSuffix")}`}>
        <OpexCostSection opex={opex} tr={tr} />
      </Section>

      <div style={styles.footer}>{tr('autoGenerated')} {new Date().toLocaleDateString()}</div>
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

export default GF_Report;
