// ============================================================
// CombustionTabHTML.jsx — Partie UI/Rendering
// ============================================================

import React from 'react';
import SchemaProcessus from './SchemaProcessus';

import { fmt } from '../../A_Transverse_fonction/formatNumber';
// ============================================================
// TOGGLE SWITCH COMPONENT
// ============================================================
const ToggleSwitch = ({ label, checked, onChange }) => (
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', color: '#555' }}>
    <div onClick={() => onChange(!checked)} style={{
      width: '44px', height: '24px', borderRadius: '12px',
      backgroundColor: checked ? '#3b82f6' : '#ccc',
      position: 'relative', transition: 'background-color 0.2s', cursor: 'pointer',
    }}>
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#fff',
        position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
    {label}
  </label>
);

// ============================================================
// STYLES CONSTANTS
// ============================================================
const inputStyle = { width: '100%', padding: '8px 12px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' };
const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px', color: '#333' };
const card = { padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '20px' };
const cardTitle = { fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#222' };
const secTitle = { fontSize: '16px', fontWeight: 'bold', marginTop: '20px', marginBottom: '15px', color: '#444', borderBottom: '2px solid #ddd', paddingBottom: '10px' };
const TH = { border: '1px solid #999', padding: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '10px', backgroundColor: '#D4B5A0' };
const TD = { border: '1px solid #CCC', padding: '4px 6px', textAlign: 'center', fontSize: '10px' };
const TDL = { ...TD, textAlign: 'left', fontWeight: 'bold' };
const TDR = { ...TD, textAlign: 'right', fontWeight: 'bold' };
const resultBox = { ...inputStyle, backgroundColor: '#e8f5e9', padding: '12px', textAlign: 'center', fontWeight: 'bold', color: '#2e7d32' };
const smallInput = { width: '65px', padding: '2px 4px', border: '1px solid #ccc', borderRadius: '3px', fontSize: '10px', textAlign: 'center' };

// ============================================================
// CombustionTabHTML COMPONENT
// ============================================================
const CombustionTabHTML = ({
  t, emissions, thermalParams, airComposition, results, composition, sludgeComp, residuConvergence, f, f0,
  handleFuelChange, handleEmission, handleThermal, handleAirComp,
  showExpertAir, setShowExpertAir, showExpertFumees, setShowExpertFumees, showDetailedBilan, setShowDetailedBilan,
  airCompositionCalculations, currentLanguage
}) => {
  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>

      {/* ═══ COMBUSTIBLE ═══ */}
      <div style={card}>
        <div style={cardTitle}>🔥 {t('Paramètres de Combustion')}</div>
        <div style={secTitle}>{t('Type de combustible')}</div>
        <div style={{ marginBottom: '25px' }}>
          <label style={labelStyle}>{t('Sélectionner le combustible')}</label>
          <select value={emissions.type_energy} onChange={(e) => handleFuelChange(e.target.value)} style={inputStyle}>
            <option value="GAZ">Gaz naturel</option>
            <option value="BIOGAZ">Biogaz</option>
            <option value="FIOUL">Fioul</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          <div><label style={labelStyle}>{t('Densité')} (kg/m³)</label>
            <input type="number" step="0.01" value={emissions.densite_combustible} onChange={(e) => handleEmission('densite_combustible', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('PCI')} (kcal/kg)</label>
            <input type="number" step="1" value={emissions.PCI_combustible} onChange={(e) => handleEmission('PCI_combustible', e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* ═══ BOUE ═══ */}
      <div style={card}>
        <div style={secTitle}>📊 {t('Paramètres des Boues')} ({t("synchronisés depuis l'onglet 1")})</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {[
            { label: 'Masse brute', key: 'Masse_brute_kg_h', unit: '(kg/h)' },
            { label: 'Masse sèche', key: 'Masse_seche_kg_h', unit: '(kg/h)' },
            { label: 'Masse volatile', key: 'Masse_volatile_kg_h', unit: '(kg/h)' },
            { label: 'Masse eau', key: 'Masse_eau_kg_h', unit: '(kg/h)' },
            { label: 'PCI boue', key: 'PCI_boue_kcal_kgMV', unit: '(kcal/kg MV)' },
            { label: 'SO₂ récupéré', key: 'SO2_recupere_cendre_pourcent', unit: '(%)' },
          ].map(({ label, key, unit }) => (
            <div key={key}><label style={labelStyle}>{t(label)} {unit}</label>
              <input type="number" step="0.1" value={emissions[key] ?? 0} onChange={(e) => handleEmission(key, e.target.value)} style={inputStyle} /></div>
          ))}
        </div>
      </div>

      {/* ═══ PARAMÈTRES COMBUSTION ═══ */}
      <div style={card}>
        <div style={secTitle}>💨 {t('Paramètres de Combustion')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          <div><label style={labelStyle}>{t("Excès d'air Lit Fluidisé")} (%)</label>
            <input type="number" step="0.1" value={emissions.Exces_air_lit} onChange={(e) => handleEmission('Exces_air_lit', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t("Excès d'air Combustible d'appoint")} (%)</label>
            <input type="number" step="0.1" value={emissions.Exces_air_combustible} onChange={(e) => handleEmission('Exces_air_combustible', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('O₂% volumique sec air combustion lit')}</label>
            <input type="number" step="0.1" value={emissions.O2_pct_air_combustion} onChange={(e) => handleEmission('O2_pct_air_combustion', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('Teneur en eau')} (kg H₂O/kg AS)</label>
            <input type="number" step="0.0001" value={emissions.Teneur_en_eau_kgH2O_kgAS} onChange={(e) => handleEmission('Teneur_en_eau_kgH2O_kgAS', e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* ═══ RÉSULTATS CONVERGENCE ═══ */}
      <div style={card}>
        <div style={cardTitle}>
          📈 {t('Résultats de Convergence')}
          {results.converged === false && <span style={{ marginLeft: '10px', color: '#ef4444', fontSize: '14px' }}>⚠ Non convergé en {results.iteration} itérations</span>}
          {results.converged === true && <span style={{ marginLeft: '10px', color: '#10b981', fontSize: '14px' }}>✓ Convergé en {results.iteration} itérations</span>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          {[{ label: 'Q_gaz (kg/h)', val: results.Q_gaz_kg_h }, { label: 'Q_gaz (Nm³/h)', val: results.Q_gaz_Nm3_h },
            { label: 'H_in (kW)', val: results.H_in }, { label: 'H_out (kW)', val: results.H_out },
          ].map(({ label, val }) => (
            <div key={label}><label style={labelStyle}>{label}</label><div style={resultBox}>{f(val)}</div></div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '15px' }}>
          <div><label style={labelStyle}>Rho_FG (kg/Nm³)</label>
            <div style={{ ...resultBox, backgroundColor: '#e3f2fd', color: '#1565c0' }}>{f(results.Rho_FG_kg_Nm3, 4)}</div></div>
        </div>
      </div>

      {/* ═══ TABLEAU AIR DE COMBUSTION ═══ */}
      <div style={card}>
        <div style={{ ...cardTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🌬️ {t('Air de Combustion')}</span>
          <ToggleSwitch label="Expert" checked={showExpertAir} onChange={setShowExpertAir} />
        </div>

        {showExpertAir ? (
          <ExpertAirTable t={t} results={results} composition={composition} sludgeComp={sludgeComp} airComposition={airComposition} f={f} TH={TH} TD={TD} TDL={TDL} TDR={TDR} emissions={emissions} airCompositionCalculations={airCompositionCalculations} />
        ) : (
          <NormalAirTable results={results} composition={composition} sludgeComp={sludgeComp} f={f} TH={TH} TD={TD} />
        )}
      </div>

      {/* ═══ TABLEAU FUMÉES ═══ */}
      <div style={card}>
        <div style={{ ...cardTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>💨 {t('Fumées')}</span>
          <ToggleSwitch label="Expert" checked={showExpertFumees} onChange={setShowExpertFumees} />
        </div>
        {showExpertFumees ? (
          <ExpertEmissionsTable results={results} f={f} TH={TH} TD={TD} TDL={TDL} />
        ) : (
          <NormalEmissionsTable results={results} f={f} TH={TH} TD={TD} />
        )}
      </div>

      {/* ═══ SCHÉMA ═══ */}
      <SchemaProcessus data={{ ...emissions, ...thermalParams, ...results }} currentLanguage={currentLanguage} />

      {/* ═══ PARAMÈTRES THERMIQUES ═══ */}
      <div style={card}>
        <div style={cardTitle}>🌡️ {t('Paramètres Thermiques')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          {[
            { label: 'Temp. boue entrée', key: 'Temp_boue_entree_C' },
            { label: 'Temp. fumée voûte / Freeboard', key: 'Temp_fumee_voute_C' },
            { label: 'Temp. air fluidisation av. préch.', key: 'Temp_air_fluidisation_av_prechauffe_C' },
            { label: 'Temp. air secondaire', key: 'Temp_air_secondaire_C' },
            { label: 'Masse air secondaire', key: 'Masse_air_secondaire_kg_h' },
            { label: 'Temp. air tertiaire', key: 'Temp_air_tertiaire_C' },
            { label: 'Masse air tertiaire', key: 'Masse_air_tertiaire_kg_h' },
            { label: 'Temp. air balayage', key: 'Temp_air_balayage_instrumentation_C' },
            { label: 'Pertes thermiques', key: 'Pertes_thermiques_pourcent' },
            { label: 'Temp. fumée après HX', key: 'Tf_voute_ap_HX_C' },
            { label: 'Rendement HX', key: 'Rdt_HX', step: '0.01' },
          ].map(({ label, key, step = '0.1' }) => (
            <div key={key}><label style={labelStyle}>{t(label)}</label>
              <input type="number" step={step} value={thermalParams[key] ?? 0} onChange={(e) => handleThermal(key, e.target.value)} style={inputStyle} /></div>
          ))}
        </div>
      </div>

      {/* ═══ BILAN ÉNERGÉTIQUE ═══ */}
      <EnergyBalanceSection t={t} results={results} thermalParams={thermalParams} emissions={emissions} residuConvergence={residuConvergence} f={f} showDetailedBilan={showDetailedBilan} setShowDetailedBilan={setShowDetailedBilan} cardTitle={cardTitle} card={card} secTitle={secTitle} resultBox={resultBox} TH={TH} TD={TD} inputStyle={inputStyle} labelStyle={labelStyle} />

      {/* ═══ AIR PRÉCHAUFFÉ ═══ */}
      <div style={card}>
        <div style={cardTitle}>🌡️ {t('Air Préchauffé — Résultats')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {[
            { label: 'Temp. air après préch.', val: results.Tair_ap_prechauffe_C },
            { label: 'Enthalpie air préch.', val: results.Hair_ap_prechauffage_kW },
            { label: 'Hf fumées voûte', val: results.Hf_voute_kW },
            { label: 'Hf fumées après HX', val: results.Hf_voute_ap_HX_kW },
            { label: 'Temp. air soufflante', val: results.Temp_air_soufflante_C },
            { label: 'Q_gaz', val: results.Q_gaz_kg_h },
          ].map(({ label, val }) => (
            <div key={label}><label style={labelStyle}>{t(label)}</label><div style={resultBox}>{f(val)}</div></div>
          ))}
        </div>
      </div>

    </div>
  );
};

// ============================================================
// SUB-COMPONENTS — AIR TABLES
// ============================================================

const NormalAirTable = ({ results, composition, sludgeComp, f, TH, TD }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
      <thead>
        <tr>
          {['Paramètre', 'C', 'H', 'O', 'N', 'S', 'Cl', 'O₂ Exc (mol)',
            'Air sec (kg/h)', 'Vol air sec (Nm³/h)', 'Humidité (kg/h)', 'Vap eau (Nm³/h)', 'V comb tot (Nm³/h)',
          ].map((h) => <th key={h} style={TH}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        <tr style={{ backgroundColor: '#FFFFCC' }}>
          <td style={TD}><b>Boue</b></td>
          {['C', 'H', 'O', 'N', 'S', 'Cl'].map((el) => <td key={el} style={TD}>{f(sludgeComp[el], 1)}</td>)}
          <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>-</td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
        </tr>
        <tr style={{ backgroundColor: '#FFFFCC' }}>
          <td style={TD}><b>Gaz</b></td>
          {['C_percent', 'H_percent', 'O_percent', 'N_percent', 'S_percent', 'Cl_percent'].map((k) => <td key={k} style={TD}>{f(composition[k], 1)}</td>)}
          <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>-</td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
        </tr>
        <tr style={{ backgroundColor: '#FFE6CC' }}>
          <td style={TD}><b>Masse comp. boue</b></td>
          {['C', 'H', 'O', 'N', 'S', 'Cl'].map((el) => <td key={el} style={TD}>{f(results.Masses_boues_composition_kg_h?.[el])}</td>)}
          <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>-</td>
          <td style={TD}>{f(results.Masse_air_sec_combustion_boue_kg_h)}</td>
          <td style={TD}>{f(results.Volume_air_sec_combustion_boue_Nm3_h)}</td>
          <td style={TD}>{f(results.Masse_humidite_air_combustion_boue_kg_h)}</td>
          <td style={TD}>{f(results.VolumeVapeurEauAirCombustionBoue_Nm3_h)}</td>
          <td style={TD}>-</td>
        </tr>
        <tr style={{ backgroundColor: '#E6F3FF' }}>
          <td style={TD}><b>Masse comp. gaz</b></td>
          {['C', 'H', 'O', 'N', 'S', 'Cl'].map((el) => <td key={el} style={TD}>{f(results.Masses_gaz_composition_kg_h?.[el])}</td>)}
          <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>-</td>
          <td style={TD}>{f(results.Masse_air_sec_combustion_gaz_kg_h)}</td>
          <td style={TD}>{f(results.Volume_air_sec_combustion_gaz_Nm3_h)}</td>
          <td style={TD}>{f(results.Masse_humidite_air_combustion_gaz_kg_h)}</td>
          <td style={TD}>{f(results.VolumeVapeurEauAirCombustionGaz_Nm3_h)}</td>
          <td style={TD}>-</td>
        </tr>
        <tr style={{ backgroundColor: '#E8F4F8', fontWeight: 'bold' }}>
          <td style={TD}><b>Total</b></td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
          <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>{f(results.Moles_Fumees_O2exces)}</td>
          <td style={TD}>{f(results.Masse_air_sec_combustion_tot_kg_h)}</td>
          <td style={TD}>{f(results.Volume_air_sec_combustion_tot_Nm3_h)}</td>
          <td style={TD}>{f(results.Masse_humidite_air_combustion_total_kg_h)}</td>
          <td style={TD}>{f(results.VolumeVapeurEauAirCombustionTot_Nm3_h)}</td>
          <td style={TD}>{f(results.VolumeAirCombustionTot_Nm3_h)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

// ============================================================
// EXPERT AIR TABLE
// ============================================================

const ExpertAirTable = ({ t, results, composition, sludgeComp, airComposition, f, TH, TD, TDL, TDR, emissions, airCompositionCalculations }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
      <thead>
        <tr>
          <th style={{ ...TH, width: '200px' }}>% massique</th>
          <th style={TH}>C (%)</th><th style={TH}>H (%)</th><th style={TH}>O (%)</th>
          <th style={TH}>N (%)</th><th style={TH}>S (%)</th><th style={TH}>Cl (%)</th>
          <th style={TH}>Mole O2 Excès</th>
          <th style={TH}>Masse air sec<br/>de combustion</th>
          <th style={TH}>Volume air sec</th>
          <th style={TH}>Masse<br/>humidité air<br/>total</th>
          <th style={TH}>Volume<br/>vapeur d'eau</th>
          <th style={TH}>Volume air de<br/>combustible<br/>total</th>
        </tr>
      </thead>
      <tbody>
        {/* Boue row */}
        <tr style={{ backgroundColor: '#FFFFF0' }}>
          <td style={{ ...TDR, color: '#dc2626' }}>Boue</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(sludgeComp.C, 1)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(sludgeComp.H, 2)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(sludgeComp.O, 1)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(sludgeComp.N, 1)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(sludgeComp.S, 1)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(sludgeComp.Cl)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td>
          <td style={TD}>{f(emissions.Masse_eau_kg_h + (results.Meau_air_comburant || 0))}</td>
          <td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Gaz row */}
        <tr style={{ backgroundColor: '#FFFFF0' }}>
          <td style={{ ...TDR, color: '#dc2626' }}>Gaz naturel</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(composition.C_percent, 2)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(composition.H_percent, 2)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(composition.O_percent, 2)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(composition.N_percent, 2)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(composition.S_percent, 2)}</td>
          <td style={{ ...TD, color: '#0ea5e9' }}>{f(composition.Cl_percent, 2)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Air compositions (5 rows) */}
        {[
          { key: 'air_combustion_boue', label: 'Air de combustion des boues', color: '#dc2626' },
          { key: 'air_combustion_gaz', label: 'Air de combustion gaz', color: '#dc2626' },
          { key: 'air_instrumentation', label: 'Air instrumentation', color: '#dc2626' },
          { key: 'air_secondaire', label: 'Air secondaire', color: '#dc2626' },
          { key: 'air_tertiaire', label: 'Air tertiaire', color: '#dc2626' },
        ].map(({ key, label, color }) => {
          const row = airComposition[key];
          return (
            <tr key={key} style={{ backgroundColor: '#F0F8FF' }}>
              <td style={{ ...TDR, color }}>{label}</td>
              <td style={TD}>{f(row.CO2_pct, 2)}</td>
              <td style={TD}>{f(row.H2O_pct, 2)}</td>
              <td style={TD}>{f(row.O2_pct, 2)}</td>
              <td style={TD}>{f(row.N2_pct, 2)}</td>
              <td style={TD}>{f(row.SO2_pct, 2)}</td>
              <td style={TD}>{f(row.Cl_pct, 2)}</td>
              <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
            </tr>
          );
        })}
        {/* g O2/g composant row */}
        <tr style={{ backgroundColor: '#FFF9E6' }}>
          <td style={TDR}>g O₂/g composant</td>
          <td style={TD}>2.6644</td><td style={TD}>7.9365</td><td style={TD}>0</td>
          <td style={TD}>0</td><td style={TD}>0.9979</td><td style={TD}>0</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Separator */}
        <tr><td colSpan={13} style={{ height: '4px', backgroundColor: '#FFD700' }} /></tr>
        {/* Moles boues row */}
        <tr style={{ backgroundColor: '#FFFF99' }}>
          <td style={{ ...TDL, color: '#dc2626' }}>Moles boues</td>
          <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.MolesBoues_C, 1)}</td>
          <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.MolesBoues_H, 1)}</td>
          <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.MolesBoues_O, 1)}</td>
          <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.MolesBoues_N, 1)}</td>
          <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.MolesBoues_S, 3)}</td>
          <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.MolesBoues_Cl, 1)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Moles eau issue de la boue */}
        <tr style={{ backgroundColor: '#FFFF99' }}>
          <td style={{ ...TDL, color: '#dc2626' }}>Moles eau issue de la boue</td>
          <td style={TD}></td>
          <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(airCompositionCalculations.molesWater.H, 1)}</td>
          <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(airCompositionCalculations.molesWater.O, 1)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Moles gaz de combustion */}
        <tr>
          <td style={TDR}>Moles du gaz de combustion</td>
          <td style={TD}>{f(results.MolesGaz_C, 3)}</td>
          <td style={TD}>{f(results.MolesGaz_H, 3)}</td>
          <td style={TD}>{f(results.MolesGaz_O, 3)}</td>
          <td style={TD}>{f(results.MolesGaz_N, 3)}</td>
          <td style={TD}>{f(results.MolesGaz_S, 3)}</td>
          <td style={TD}>{f(results.MolesGaz_Cl, 3)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Separator */}
        <tr><td colSpan={13} style={{ height: '4px', backgroundColor: '#FFD700' }} /></tr>
        {/* Moles air de combustion des boues */}
        <tr style={{ backgroundColor: '#E6F3FF' }}>
          <td style={{ ...TDL, color: '#dc2626' }}>Moles air de combustion des boues</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombBoue.C, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombBoue.H, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombBoue.O, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombBoue.N, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombBoue.S, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombBoue.Cl, 3)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Moles air combustion gaz */}
        <tr style={{ backgroundColor: '#E6F3FF' }}>
          <td style={{ ...TDL, color: '#dc2626' }}>Moles air combustion gaz</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombGaz.C, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombGaz.H, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombGaz.O, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombGaz.N, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombGaz.S, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesCombGaz.Cl, 3)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Separator */}
        <tr><td colSpan={13} style={{ height: '2px', backgroundColor: '#ccc' }} /></tr>
        {/* Moles air instrumentation */}
        <tr>
          <td style={TDR}>Moles air instrumentation</td>
          <td style={TD}>{f(airCompositionCalculations.molesInstru.C, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesInstru.H, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesInstru.O, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesInstru.N, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesInstru.S, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesInstru.Cl, 3)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Moles air secondaire */}
        <tr>
          <td style={TDR}>Moles air secondaire</td>
          <td style={TD}>{f(airCompositionCalculations.molesSec.C, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesSec.H, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesSec.O, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesSec.N, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesSec.S, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesSec.Cl, 3)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Moles air tertiaire */}
        <tr>
          <td style={TDR}>Moles air tertiaire</td>
          <td style={TD}>{f(airCompositionCalculations.molesTert.C, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesTert.H, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesTert.O, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesTert.N, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesTert.S, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.molesTert.Cl, 3)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* Separator */}
        <tr><td colSpan={13} style={{ height: '4px', backgroundColor: '#ccc' }} /></tr>
        {/* SUM Moles boue */}
        <tr style={{ backgroundColor: '#FFFF99', fontWeight: 'bold' }}>
          <td style={{ ...TDL, color: '#dc2626' }}>SUM Moles boue</td>
          <td style={{ ...TD, color: '#dc2626' }}>{f(airCompositionCalculations.sumMolesBoue.C)}</td>
          <td style={{ ...TD, color: '#dc2626' }}>{f(airCompositionCalculations.sumMolesBoue.H)}</td>
          <td style={{ ...TD, color: '#dc2626' }}>{f(airCompositionCalculations.sumMolesBoue.O)}</td>
          <td style={{ ...TD, color: '#dc2626' }}>{f(airCompositionCalculations.sumMolesBoue.N)}</td>
          <td style={{ ...TD, color: '#dc2626' }}>{f(airCompositionCalculations.sumMolesBoue.S)}</td>
          <td style={{ ...TD, color: '#dc2626' }}>{f(airCompositionCalculations.sumMolesBoue.Cl)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td>
          <td style={TD}>{f(results.Masse_humidite_air_combustion_total_kg_h)}</td>
          <td style={TD}></td><td style={TD}></td>
        </tr>
        {/* SUM Moles comb appoint */}
        <tr>
          <td style={TDR}>SUM Moles comb appoint</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesCombAppoint.C, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesCombAppoint.H, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesCombAppoint.O, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesCombAppoint.N, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesCombAppoint.S, 3)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesCombAppoint.Cl, 3)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
        {/* SUM moles air (non combustion) */}
        <tr>
          <td style={TDR}>SUM moles air (non combustion)</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesAirNonComb.C)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesAirNonComb.H, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesAirNonComb.O, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesAirNonComb.N, 1)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesAirNonComb.S)}</td>
          <td style={TD}>{f(airCompositionCalculations.sumMolesAirNonComb.Cl)}</td>
          <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
        </tr>
      </tbody>
    </table>
  </div>
);

// ============================================================
// EMISSIONS TABLES
// ============================================================

const NormalEmissionsTable = ({ results, f, TH, TD }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr style={{ backgroundColor: '#D4B5A0' }}>
          {['Fumées', 'SO₂', 'HCl', 'CO₂', 'CO', 'H₂O', 'O₂ exc', 'NOx', 'N₂', 'SO₂ réel',
            'M sèche', 'M humide', 'V sec', 'V humide'].map((h) => <th key={h} style={TH}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        <tr style={{ backgroundColor: '#FFFFCC' }}>
          <td style={{ ...TD, fontWeight: 'bold' }}>kg/h</td>
          {[results.FG_kg_h_SO2, results.FG_kg_h_HCl, results.FG_kg_h_CO2, results.FG_kg_h_CO,
            results.FG_kg_h_H2O, results.FG_kg_h_O2exces, results.FG_kg_h_NOX, results.FG_kg_h_N2,
            results.FG_kg_h_SO2reel, results.FG_dry_kg_h, results.FG_wet_kg_h].map((v, i) => <td key={i} style={TD}>{f(v)}</td>)}
          <td style={TD}>-</td><td style={TD}>-</td>
        </tr>
        <tr style={{ backgroundColor: '#FFFFCC' }}>
          <td style={{ ...TD, fontWeight: 'bold' }}>Nm³/h</td>
          {[results.FG_Nm3_h_SO2, results.FG_Nm3_h_HCl, results.FG_Nm3_h_CO2, results.FG_Nm3_h_CO,
            results.FG_Nm3_h_H2O, results.FG_Nm3_h_O2exces, results.FG_Nm3_h_NOX, results.FG_Nm3_h_N2,
            results.FG_Nm3_h_SO2reel].map((v, i) => <td key={i} style={TD}>{f(v)}</td>)}
          <td style={TD}>-</td><td style={TD}>-</td>
          <td style={TD}>{f(results.FG_dry_Nm3_h)}</td><td style={TD}>{f(results.FG_wet_Nm3_h)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

const ExpertEmissionsTable = ({ results, f, TH, TD, TDL }) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
      <thead>
        <tr style={{ backgroundColor: '#D4B5A0' }}>
          {['Fumées', 'C', 'H', 'O₂', 'N', 'SO₂', 'HCl', 'CO₂', 'CO', 'H₂O', 'H₂', 'O₂ exc', 'NOx', 'N₂', 'SO₂ réel',
            'M fumée hum.', 'M fumée sèche', 'V hum.', 'V sec'].map((h) => <th key={h} style={TH}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        <tr style={{ backgroundColor: '#FFFDE7' }}>
          <td style={TDL}>Moles issues de la boue</td>
          <td style={{...TD}}>{f(results.MolesBoues_C)}</td><td style={TD}>{f(results.MolesBoues_H)}</td>
          <td style={TD}>{f(results.MolesBoues_O)}</td><td style={TD}>{f(results.MolesBoues_N)}</td>
          <td style={TD}>{f(results.MolesBoues_S)}</td><td style={TD}>{f(results.MolesBoues_Cl)}</td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
          <td style={TD}>{f(results.MolesO2excesBoue)}</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
        </tr>
        <tr style={{ backgroundColor: '#FFFDE7' }}>
          <td style={TDL}>Moles combustible</td>
          <td style={TD}>{f(results.MolesGaz_C)}</td><td style={TD}>{f(results.MolesGaz_H)}</td>
          <td style={TD}>{f(results.MolesGaz_O)}</td><td style={TD}>{f(results.MolesGaz_N)}</td>
          <td style={TD}>{f(results.MolesGaz_S)}</td><td style={TD}>{f(results.MolesGaz_Cl)}</td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
          <td style={TD}>{f(results.MolesO2excesGaz)}</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
        </tr>
        <tr style={{ backgroundColor: '#E8F5E9', fontWeight: 'bold' }}>
          <td style={TDL}>Moles totale</td>
          <td style={TD}>{f(results.Moles_Fumees_C)}</td><td style={TD}>{f(results.Moles_Fumees_H)}</td>
          <td style={TD}>{f(results.Moles_Fumees_O2)}</td><td style={TD}>{f(results.Moles_Fumees_N)}</td>
          <td style={TD}>{f(results.Moles_Fumees_SO2)}</td><td style={TD}>{f(results.Moles_Fumees_HCl)}</td>
          <td style={TD}>{f(results.Moles_Fumees_CO2)}</td><td style={TD}>{f(results.Moles_Fumees_CO)}</td>
          <td style={TD}>{f(results.Moles_Fumees_H2O)}</td><td style={TD}>-</td>
          <td style={TD}>{f(results.Moles_Fumees_O2exces)}</td><td style={TD}>{f(results.Moles_Fumees_NOX)}</td>
          <td style={TD}>{f(results.Moles_Fumees_N2)}</td><td style={TD}>-</td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
        </tr>
        <tr style={{ backgroundColor: '#FFFFCC' }}>
          <td style={{ ...TD, fontWeight: 'bold' }}>kg/h</td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
          <td style={TD}>{f(results.FG_kg_h_SO2)}</td><td style={TD}>{f(results.FG_kg_h_HCl)}</td>
          <td style={TD}>{f(results.FG_kg_h_CO2)}</td><td style={TD}>{f(results.FG_kg_h_CO)}</td>
          <td style={TD}>{f(results.FG_kg_h_H2O)}</td><td style={TD}>{f(results.FG_kg_h_H2)}</td>
          <td style={TD}>{f(results.FG_kg_h_O2exces)}</td><td style={TD}>{f(results.FG_kg_h_NOX)}</td>
          <td style={TD}>{f(results.FG_kg_h_N2)}</td><td style={TD}>{f(results.FG_kg_h_SO2reel)}</td>
          <td style={TD}>{f(results.FG_wet_kg_h)}</td><td style={TD}>{f(results.FG_dry_kg_h)}</td>
          <td style={TD}>{f(results.FG_wet_Nm3_h)}</td><td style={TD}>{f(results.FG_dry_Nm3_h)}</td>
        </tr>
        <tr style={{ backgroundColor: '#FFFFCC' }}>
          <td style={{ ...TD, fontWeight: 'bold' }}>Nm³/h</td>
          <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
          <td style={TD}>{f(results.FG_Nm3_h_SO2)}</td><td style={TD}>{f(results.FG_Nm3_h_HCl)}</td>
          <td style={TD}>{f(results.FG_Nm3_h_CO2)}</td><td style={TD}>{f(results.FG_Nm3_h_CO)}</td>
          <td style={TD}>{f(results.FG_Nm3_h_H2O)}</td><td style={TD}>0.00</td>
          <td style={TD}>{f(results.FG_Nm3_h_O2exces)}</td><td style={TD}>{f(results.FG_Nm3_h_NOX)}</td>
          <td style={TD}>{f(results.FG_Nm3_h_N2)}</td><td style={TD}>{f(results.FG_Nm3_h_SO2reel)}</td>
          <td style={TD}>-</td><td style={TD}>-</td>
          <td style={TD}>{f(results.FG_wet_Nm3_h)}</td><td style={TD}>{f(results.FG_dry_Nm3_h)}</td>
        </tr>
      </tbody>
    </table>
  </div>
);

// ============================================================
// ENERGY BALANCE SECTION
// ============================================================

const EnergyBalanceSection = ({
  t, results, thermalParams, emissions, residuConvergence, f, showDetailedBilan, setShowDetailedBilan,
  cardTitle, card, secTitle, resultBox, TH, TD, inputStyle, labelStyle
}) => (
  <div style={card}>
    <div style={{ ...cardTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span>⚡ {t('Bilan Énergétique')} (kW)</span>
      <ToggleSwitch label="Bilan détaillé" checked={showDetailedBilan} onChange={setShowDetailedBilan} />
    </div>

    {showDetailedBilan && (
      <DetailedEnergyBalance results={results} thermalParams={thermalParams} emissions={emissions} f={f} secTitle={secTitle} TH={TH} TD={TD} />
    )}

    {/* Bilan simplifié (toujours) */}
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#D4B5A0' }}>
            <th style={{ ...TH, width: '40%' }}>Paramètre</th>
            <th style={{ ...TH, backgroundColor: '#FFE6CC' }}>Entrée (kW)</th>
            <th style={{ ...TH, backgroundColor: '#E6F3FF' }}>Sortie (kW)</th>
          </tr>
        </thead>
        <tbody>
          {[
            { label: 'H_NETTE_BOUE', in: results.H_NETTE_BOUE_kW, out: null },
            { label: 'Hair_ap_préchauffage', in: results.Hair_ap_prechauffage_kW, out: null },
            { label: 'H_air_balayage', in: results.H_air_balayage_instrumentation_kW, out: null },
            { label: 'H_gaz appoint', in: results.H_gaz_inter ?? null, out: null },
            { label: 'H_matière_minérale', in: null, out: results.H_matiere_minerale_kW },
            { label: 'Hf_voûte', in: null, out: results.Hf_voute_kW },
            { label: 'Pertes thermiques', in: null, out: results.Pertes_thermiques_kW },
          ].map(({ label, in: vin, out: vout }) => (
            <tr key={label}>
              <td style={{ ...TD, fontWeight: 'bold' }}>{label}</td>
              <td style={{ ...TD, backgroundColor: '#FFE6CC' }}>{vin != null ? fmt(vin, 2) : '-'}</td>
              <td style={{ ...TD, backgroundColor: '#E6F3FF' }}>{vout != null ? fmt(vout, 2) : '-'}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold' }}>
            <td style={{ ...TD, backgroundColor: '#B0D0E8' }}>TOTAL ENTRÉE (H_in)</td>
            <td style={{ ...TD, backgroundColor: '#ADD8E6' }}>{f(results.H_in)}</td>
            <td style={{ ...TD, backgroundColor: '#B0D0E8' }}>-</td>
          </tr>
          <tr style={{ fontWeight: 'bold' }}>
            <td style={{ ...TD, backgroundColor: '#B0D0E8' }}>TOTAL SORTIE (H_out)</td>
            <td style={{ ...TD, backgroundColor: '#B0D0E8' }}>-</td>
            <td style={{ ...TD, backgroundColor: '#ADD8E6' }}>{f(results.H_out)}</td>
          </tr>
          <tr style={{ opacity: 0.75 }}>
            <td style={{ ...TD, fontStyle: 'italic', backgroundColor: '#f8f8f8' }}>Résidu (H_out − H_in) — doit être ≈ 0</td>
            <td style={{ ...TD, backgroundColor: '#f8f8f8' }}>-</td>
            <td style={{ ...TD, backgroundColor: '#f8f8f8', fontStyle: 'italic',
              color: residuConvergence != null && Math.abs(residuConvergence) < 1 ? '#16a34a' : '#dc2626' }}>
              {(residuConvergence != null ? fmt(residuConvergence, 4) : '') ?? '-'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

// ============================================================
// DETAILED ENERGY BALANCE TABLE
// ============================================================

const DetailedEnergyBalance = ({ results, thermalParams, emissions, f, secTitle, TH, TD }) => (
  <div style={{ marginBottom: '25px' }}>
    <div style={secTitle}>📋 Bilan Énergétique Détaillé</div>
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
        <thead>
          <tr>
            <th style={{ ...TH, width: '180px', position: 'sticky', left: 0, zIndex: 1, padding: '8px 4px' }}>Paramètre</th>
            {[
              { label: '1', subtitle: 'Boue\nentrée', c: '#FFE4B5' },
              { label: '2', subtitle: 'Matières\nminérales', c: '#D3D3D3' },
              { label: '3', subtitle: 'Énergie nette\nexportée par MM', c: '#D3D3D3' },
              { label: '4', subtitle: 'Air flu\npréchauffé', c: '#87CEEB' },
              { label: '5', subtitle: 'Air\nsecondaire', c: '#87CEEB' },
              { label: '6', subtitle: 'Air\ntertiaire', c: '#87CEEB' },
              { label: '7', subtitle: 'Énergie\nappoint gaz', c: '#FFD700' },
              { label: '8', subtitle: 'Pertes par\nimbrûlés', c: '#FFA07A' },
              { label: '9', subtitle: 'Air flu avant\npréch', c: '#87CEEB' },
              { label: '10', subtitle: 'Air flu après\npréch', c: '#87CEEB' },
              { label: '11', subtitle: 'Fumées\ndu four', c: '#DDA0DD' },
              { label: '12', subtitle: 'Fumées ap\npréch', c: '#DDA0DD' },
              { label: '13', subtitle: 'Eau refr\nentrée', c: '#ADD8E6' },
              { label: '14', subtitle: 'Eau refr\nsortie', c: '#ADD8E6' },
            ].map((col, i) => (
              <th key={i} style={{ ...TH, backgroundColor: col.c, minWidth: '75px', padding: '4px 2px', fontSize: '8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>{col.label}</div>
                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.2' }}>{col.subtitle}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr style={{ backgroundColor: '#FAFAFA' }}>
            <td style={{ ...TD, fontWeight: 'bold', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#FAFAFA', zIndex: 1 }}>
              Température [°C]
            </td>
            <td style={TD}>{f(thermalParams.Temp_boue_entree_C)}</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>{f(thermalParams.Temp_air_fluidisation_av_prechauffe_C + 45)}</td>
            <td style={TD}>{f(thermalParams.Temp_air_secondaire_C)}</td>
            <td style={TD}>{f(thermalParams.Temp_air_tertiaire_C)}</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>{f(thermalParams.Temp_air_fluidisation_av_prechauffe_C)}</td>
            <td style={TD}>{f(results.Tair_ap_prechauffe_C)}</td>
            <td style={TD}>{f(thermalParams.Temp_fumee_voute_C)}</td>
            <td style={TD}>{f(thermalParams.Tf_voute_ap_HX_C)}</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
          </tr>

          <tr style={{ backgroundColor: '#fff' }}>
            <td style={{ ...TD, fontWeight: 'bold', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1 }}>
              Débit MS des boues [kg/h]
            </td>
            <td style={TD}>{f(emissions.Masse_seche_kg_h)}</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
          </tr>

          <tr style={{ backgroundColor: '#FAFAFA' }}>
            <td style={{ ...TD, fontWeight: 'bold', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#FAFAFA', zIndex: 1 }}>
              Débit eau à évaporer [kg/h]
            </td>
            <td style={TD}>{f(emissions.Masse_eau_kg_h)}</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
          </tr>

          <tr style={{ backgroundColor: '#FAFAFA' }}>
            <td style={{ ...TD, fontWeight: 'bold', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#FAFAFA', zIndex: 1 }}>
              Efficacité [%]
            </td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>{f(thermalParams.Rdt_HX * 100)}</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
          </tr>

          <tr style={{ backgroundColor: '#FAFAFA' }}>
            <td style={{ ...TD, fontWeight: 'bold', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#FAFAFA', zIndex: 1 }}>
              Énergie cédée par fumées [kW]
            </td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>{f(results.Hf_voute_kW)}</td>
            <td style={TD}>{f(results.Hf_voute_ap_HX_kW)}</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
          </tr>

          <tr style={{ backgroundColor: '#fff' }}>
            <td style={{ ...TD, fontWeight: 'bold', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1 }}>
              Énergie transmise [kW]
            </td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>{f(results.H_air_fluidisation_av_prechauffe_kW)}</td>
            <td style={TD}>{f(results.H_air_secondaire_kW)}</td>
            <td style={TD}>{f(results.H_air_tertiaire_kW)}</td>
            <td style={TD}>-</td>
            <td style={TD}>{f(results.Pertes_thermiques_kW)}</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
            <td style={TD}>-</td>
          </tr>

          <tr style={{ backgroundColor: '#FAFAFA', fontWeight: 'bold' }}>
            <td style={{ ...TD, fontWeight: 'bold', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: '#FAFAFA', zIndex: 1 }}>
              Enthalpie [kW]
            </td>
            <td style={{ ...TD, backgroundColor: '#FFE4B5' }}>{f(results.H_NETTE_BOUE_kW)}</td>
            <td style={{ ...TD, backgroundColor: '#D3D3D3' }}>{f(results.H_matiere_minerale_kW)}</td>
            <td style={{ ...TD, backgroundColor: '#D3D3D3' }}>{f(-results.H_matiere_minerale_kW)}</td>
            <td style={{ ...TD, backgroundColor: '#87CEEB' }}>{f(results.H_air_fluidisation_av_prechauffe_kW)}</td>
            <td style={{ ...TD, backgroundColor: '#87CEEB' }}>{f(results.H_air_secondaire_kW)}</td>
            <td style={{ ...TD, backgroundColor: '#87CEEB' }}>{f(results.H_air_tertiaire_kW)}</td>
            <td style={{ ...TD, backgroundColor: '#FFD700' }}>{f(results.H_gaz_inter || 0)}</td>
            <td style={{ ...TD, backgroundColor: '#FFA07A' }}>-</td>
            <td style={{ ...TD, backgroundColor: '#87CEEB' }}>-</td>
            <td style={{ ...TD, backgroundColor: '#87CEEB' }}>{f(results.Hair_ap_prechauffage_kW)}</td>
            <td style={{ ...TD, backgroundColor: '#DDA0DD' }}>{f(results.Hf_voute_kW)}</td>
            <td style={{ ...TD, backgroundColor: '#DDA0DD' }}>{f(results.Hf_voute_ap_HX_kW)}</td>
            <td style={{ ...TD, backgroundColor: '#ADD8E6' }}>-</td>
            <td style={{ ...TD, backgroundColor: '#ADD8E6' }}>-</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

export default CombustionTabHTML;
