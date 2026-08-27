import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import TableGeneric from '../../C_Components/Tableau_generique';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import reactImage from '../../B_Images/quench_img.png';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './QUENCH_traduction';
import { qdTranslations } from './QUENCH_Design_traduction';
import { fmt } from '../../A_Transverse_fonction/formatNumber';

// ═══════════════════════════════════════════════════════════════════
// QUENCH DESIGN — Portage du module VB.NET Pyrofluid
// (Quench.vb + ClassQuench.vb, voie humide)
// Remplace le calcul heuristique buses/loi D² de 4_QUENCH_Design1_ML.
// Saturation adiabatique, absorption HCl au venturi, hauteur de
// saturation, bilans purge / appoint / recirculation.
// Code couleur : cyan = saisie | jaune = calculé | rouge = hors plage
// ═══════════════════════════════════════════════════════════════════

// ===== CONSTANTES =====
const M = { CO2: 44, H2O: 18, O2: 32, N2: 28, SO2: 64, HCl: 36.5 };
const VM = 22.4;

const DIAM_QUENCH = [0.55, 0.65, 0.75, 0.9, 1.05, 1.25, 1.5];
const DIAM_CONE_AUTO = { 0.55: 445, 0.65: 535, 0.75: 615, 0.9: 735, 1.05: 860, 1.25: 1025, 1.5: 1230 }; // mm
const LIQ_AR_MAX = { 0.55: 5000, 0.65: 7500, 0.75: 8000, 0.9: 10000, 1.05: 15000, 1.25: 20000, 1.5: 25000 }; // kg/h

// ===== FONCTIONS THERMODYNAMIQUES (legacy) =====
const psatH2O = (t) => Math.pow(10, 7.9688 - 1668.21 / (228 + t));

function enthalpieFumees(T, m) {
  const s1 = T * (0.226 * m.CO2 + 0.427 * m.H2O + 0.225 * m.O2 + 0.239 * m.N2 + 0.164 * m.SO2 + 0.19 * m.HCl);
  const s2 = T * T * (46.5e-6 * m.CO2 + 80.5e-6 * m.H2O + 24.5e-6 * m.O2 + 27e-6 * m.N2 + 25.5e-6 * m.SO2 + 11.5e-6 * m.HCl);
  return s1 + s2 + m.H2O * 597;
}

// NB : « 11 ^ -6 » du VB (≈ 0) corrigé en 11.5e-6
function chaleurEvac(ts, concHClAr) {
  const c = concHClAr / 100;
  return (
    (0.427 * ts + 80.5e-6 * ts * ts + 597 - ts) * (1 - c) +
    c * (0.19 * ts + 11.5e-6 * ts * ts + 497 - 0.96 * ts)
  );
}

function ppHCl(ts, concHClRec) {
  const AT = Math.exp(-13.83 + 0.108032 * ts);
  const BT = Math.exp(1.03684 - 0.00467532 * ts);
  return concHClRec > 0 ? AT * Math.pow(concHClRec, BT) : 0;
}

const roEau = (t) =>
  0.3471 * Math.pow(0.274, -Math.pow(1 - (t + 273) / (374.2 + 273), 2 / 7)) * 1000;

const condLiq = (tm) =>
  (-916.62 + 1254.73 * (tm + 273) * 1e-2 - 152.12e-4 * Math.pow(tm + 273, 2)) * 3.6e-4;

function cpFumees(fm, tm) {
  const TK = tm + 273;
  return (
    (0.235 * fm.CO2 + 0.232 * fm.N2 + 0.258 * fm.O2 + 0.457 * fm.H2O + 0.184 * fm.HCl + 0.12 * fm.SO2) +
    1e-5 * (6.22 * fm.CO2 + 3.57 * fm.N2 + 0.8 * fm.O2 + 0.833 * fm.H2O + 2.3 * fm.HCl + 8.27 * fm.SO2) * TK +
    1e-8 * (7.44 * fm.H2O - 1.29 * fm.SO2) * TK * TK -
    (4443.2 * fm.CO2 + 5865.6 * fm.O2) / Math.pow(TK, 3)
  );
}

const racineCarre = (a, b, c) => {
  const disc = b * b - 4 * a * c;
  if (disc < 0 || a === 0) return c === 0 ? 0 : -c / b;
  return (-b + Math.sqrt(disc)) / (2 * a);
};

const volDe = (m) => ({
  CO2: (m.CO2 * VM) / M.CO2, H2O: (m.H2O * VM) / M.H2O, N2: (m.N2 * VM) / M.N2,
  O2: (m.O2 * VM) / M.O2, SO2: (m.SO2 * VM) / M.SO2, HCl: (m.HCl * VM) / M.HCl,
});
const somme = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const parseValue = (v) => { const p = parseFloat(v); return isNaN(p) ? 0 : p; };

// ═══════════════════════════════════════════════════════════════════
// MOTEUR DE CALCUL (transcription de ClassQuench.Calcul) — exporté
// ═══════════════════════════════════════════════════════════════════
export function calculQuench(inp) {
  const T = inp.tempFumees;
  const masIn = { CO2: inp.mCO2, H2O: inp.mH2O, N2: inp.mN2, O2: inp.mO2, SO2: inp.mSO2, HCl: inp.mHCl };
  const volIn = volDe(masIn);
  const masTot = somme(masIn);
  const volTot = somme(volIn);
  const volSec = volTot - volIn.H2O;
  if (volTot <= 0 || volSec <= 0 || masIn.HCl <= 0) return null;

  const p = 760 - Math.abs(inp.pTotal / 13.595);
  const corr = (o2) => 10 / (21 - o2);
  const pO2in = (volIn.O2 / volSec) * 100;
  const concHClInSec = ((masIn.HCl * 1e6) / volSec) * corr(pO2in);
  const concSO2InSec = ((masIn.SO2 * 1e6) / volSec) * corr(pO2in);

  const debVolReel = (volTot * (273.5 + T) * 760) / (273.5 * p); // legacy : 273.5
  const Squench = (Math.PI * inp.diamQuench * inp.diamQuench) / 4;
  const vitesse = Squench > 0 ? debVolReel / (3600 * Squench) : 0;

  const entIn = enthalpieFumees(T, masIn);

  // ─── Boucle 1 : Ts par bissection sur Psat(Ts) = PpH2O(Ts) ───
  let concHClAr = 0.05;
  const evapDe = (ts) => (entIn - enthalpieFumees(ts, masIn)) / chaleurEvac(ts, concHClAr);
  const fTs = (ts) => {
    const evap = evapDe(ts);
    const pp = (p * (volIn.H2O + evap / 0.804)) / (volTot + evap / 0.804);
    return psatH2O(ts) - pp;
  };
  let lo = 40, hi = Math.min(T - 1, 99.5);
  if (fTs(lo) > 0 || fTs(hi) < 0) return { erreurTs: true };
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (fTs(mid) < 0) lo = mid; else hi = mid;
  }
  const ts = (lo + hi) / 2;
  const tensVapH2O = psatH2O(ts);
  const debMasEvap = evapDe(ts);

  // ─── Boucle 2 : itération sur ConcHClRec (bilan enthalpique) ───
  let concHClRec = 0.01;
  let deltaBoucle2 = 0.5;
  let res = null;
  let converge = false;

  const fracMas = {
    CO2: masIn.CO2 / masTot, H2O: masIn.H2O / masTot, O2: masIn.O2 / masTot,
    N2: masIn.N2 / masTot, HCl: masIn.HCl / masTot, SO2: masIn.SO2 / masTot,
  };

  outer: while (deltaBoucle2 <= 2) {
    let compt = 0;
    while (compt < 20000) {
      const pHClPart = ppHCl(ts, concHClRec);
      const pIncond = p - tensVapH2O - pHClPart;

      const fracMolHCl = pHClPart / p;
      const fracMolEau = 1 - fracMolHCl;
      const denomEq = fracMolHCl * M.HCl + fracMolEau * M.H2O;
      const debMasH2Oeq = ((fracMolEau * M.H2O) / denomEq) * debMasEvap;
      const debMasHCleq = ((fracMolHCl * M.HCl) / denomEq) * debMasEvap;

      // Fumées saturées
      const masSat = { ...masIn, H2O: masIn.H2O + debMasH2Oeq, HCl: masIn.HCl + debMasHCleq };
      const volSat = volDe(masSat);
      const masTotSat = somme(masSat);
      const volTotSat = somme(volSat);
      const roSaturee = masTotSat / (volTotSat * ((ts + 273) / 273) * (760 / p));
      const debMolIncond = (1000 / VM) * (volTotSat - volSat.H2O - volSat.HCl);

      // Fumées épurées (équilibre + efficacité venturi)
      const debMasHClAbs = masSat.HCl - (pHClPart / pIncond) * debMolIncond * (M.HCl / 1000);
      const masEp = {
        CO2: masIn.CO2,
        H2O: (tensVapH2O / pIncond) * debMolIncond * (M.H2O / 1000),
        O2: masIn.O2,
        N2: masIn.N2,
        SO2: masIn.SO2,
        HCl: masSat.HCl - debMasHClAbs * inp.effVenturi,
      };
      const volEp = volDe(masEp);
      const masTotEp = somme(masEp);
      const volTotEp = somme(volEp);
      const volTotEpSec = volTotEp - volEp.H2O;
      const pO2s = (volEp.O2 / volTotEpSec) * 100;
      const concHClSec = ((masEp.HCl / volTotEpSec) * 1e6 * 10) / (21 - pO2s);
      const concSO2Sec = ((masEp.SO2 / volTotEpSec) * 1e6 * 10) / (21 - pO2s);
      const debVolSortieReel = volTotEp * ((ts + 273) / 273) * (760 / p);
      const roEpuree = masTotEp / debVolSortieReel;

      // Cône & venturi
      const diamCone = inp.chkCone ? inp.diamCone : DIAM_CONE_AUTO[inp.diamQuench] || 0;
      const sVenturi = (Math.PI * Math.pow(diamCone * 1e-3, 2)) / 4;
      const sPassage = Squench - sVenturi;
      const vPassage = sPassage > 0 ? debVolSortieReel / (3600 * sPassage) : 0;
      const pVenturi = (1.5 * roSaturee * vPassage * vPassage) / (2 * 9.81); // mmCE

      // Hauteur de saturation
      const tmFumees = (T + ts) / 2;
      const cpg = cpFumees(fracMas, tmFumees);
      const roLiq1 = roEau(ts);
      const kl = condLiq(tmFumees);
      let debMasLiqAr = 11 * debMasEvap;
      debMasLiqAr = Math.min(debMasLiqAr, LIQ_AR_MAX[inp.diamQuench] || 25000);
      const te = (600 / inp.constNusselt) * ((Math.pow(inp.diamGouttes * 1e-6, 2) * cpg * roLiq1) / kl) * (masTot / debMasLiqAr);
      const zsat = inp.coefHautSat * te * vitesse;

      const pH = concHClAr > 0 ? -Math.log10(concHClAr * (10 / M.HCl)) : null;
      const pHRec = concHClRec > 0 ? -Math.log10(concHClRec * (10 / M.HCl)) : null;

      // Purge, appoint, recirculation
      const debMasHClPurge = masIn.HCl - masEp.HCl;
      const debMasTotalPurge = (100 * debMasHClPurge) / concHClRec;
      const debMasEauAppoint = masTotEp - masTot + debMasTotalPurge;
      const debMasTotalRecirc = debMasLiqAr + masTot - masTotEp - debMasTotalPurge;
      const debMasHClRecirc = debMasTotalRecirc * (concHClRec / 100);
      concHClAr = (100 * debMasHClRecirc) / (debMasTotalRecirc + debMasEauAppoint);

      // Bilan enthalpique → température de sortie
      const chaleurAbsHCl = 0.5556 * 850;
      const entTotalSortie =
        entIn +
        debMasEauAppoint * inp.tempEauAp +
        debMasHClPurge * chaleurAbsHCl +
        debMasEvap * (ts - inp.tempEauAp) -
        debMasTotalPurge * 0.96 * ts;
      const a = 1e-6 * (masEp.CO2 * 46.5 + masEp.H2O * 80.5 + masEp.O2 * 24.5 + masEp.N2 * 27 + masEp.SO2 * 25.5 + masEp.HCl * 11.5);
      const b = masEp.CO2 * 0.226 + masEp.H2O * 0.427 + masEp.N2 * 0.239 + masEp.O2 * 0.225 + masEp.SO2 * 0.164 + masEp.HCl * 0.19;
      const c = -(entTotalSortie - masEp.H2O * 597);
      const tempSortie = racineCarre(a, b, c);

      res = {
        pO2in, concHClInSec, concSO2InSec, masTot, volTot, Squench, vitesse,
        ts, tensVapH2O, debMasEvap,
        concHClRec, concHClAr, pHClPart, pIncond, debMolIncond,
        masTotSat, volTotSat, roSaturee,
        masEp, masTotEp, volTotEp, pO2s, concHClSec, concSO2Sec, roEpuree,
        diamCone, sPassage, vPassage, pVenturi,
        cpg, debMasLiqAr, te, zsat,
        pH, pHRec,
        debMasHClPurge, debMasTotalPurge, debMasEauAppoint, debMasTotalRecirc,
        tempSortie,
        effHCl: masIn.HCl > 0 ? ((masIn.HCl - masEp.HCl) / masIn.HCl) * 100 : 0,
      };

      if (Math.abs(ts - tempSortie) < deltaBoucle2) { converge = true; break outer; }
      concHClRec += 0.0001;
      compt++;
    }
    deltaBoucle2 += 0.5;
  }

  return res ? { ...res, converge } : null;
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSANTS UI — définis au niveau module pour avoir des références
// stables entre renders et éviter la perte de focus sur les inputs.
// ═══════════════════════════════════════════════════════════════════
const QSection = ({ title, results, children, t }) => (
  <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
    <h3 style={{ marginTop: 0, borderBottom: '2px solid #4a90e2', paddingBottom: '10px' }}>{title}</h3>
    <div style={{ display: 'grid', gap: '15px' }}>
      {children}
      {results && results.length > 0 && (
        <>
          <h4 style={{ marginTop: '15px', marginBottom: '10px' }}>{t('Résultats')}</h4>
          <TableGeneric elements={results} />
        </>
      )}
    </div>
  </div>
);

const QInField = ({ label, value, onChange, step = '0.01', disabled = false, t }) => {
  const [display, setDisplay] = useState(() => value !== undefined && value !== null ? String(value) : '');
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDisplay(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: disabled ? 0.4 : 1 }}>
      <label style={{ flex: 1, minWidth: '250px', textAlign: 'right', fontWeight: '500', color: '#333' }}>
        {t(label)} :
      </label>
      <input
        type="number"
        value={display}
        step={step}
        disabled={disabled}
        onFocus={() => { focused.current = true; }}
        onBlur={() => {
          focused.current = false;
          const n = parseFloat(display);
          const norm = isNaN(n) ? 0 : n;
          setDisplay(isNaN(n) ? '0' : String(n));
          onChange(norm);
        }}
        onChange={(e) => {
          setDisplay(e.target.value);
          onChange(parseValue(e.target.value));
        }}
        style={{
          flex: '0 0 150px', padding: '8px', border: '1px solid #7cc7d8', borderRadius: '4px',
          fontSize: '14px', textAlign: 'right', backgroundColor: disabled ? '#eee' : '#e0f7fa', fontFamily: 'monospace',
        }}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// COMPOSANT
// ═══════════════════════════════════════════════════════════════════
const QUENCHDesign = ({ innerData, setInnerData, upstreamT_IN, upstreamFG_IN, currentLanguage = 'fr' }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const t = useCallback((key) =>
    qdTranslations[languageCode]?.[key] ||
    qdTranslations['fr']?.[key] ||
    translations[languageCode]?.[key] ||
    translations['fr']?.[key] ||
    key,
  [languageCode]);

  const getInitialValue = (paramName, defaultValue) => {
    return innerData?.[paramName] !== undefined ? innerData[paramName] : defaultValue;
  };

  // Types d'eau (conservés du Design d'origine — alimente l'OPEX)
  const waterTypeLabels = {
    'eau potable': t('Eau potable'),
    'eau de refroidissement': t('Eau de refroidissement'),
    'eau déminéralisée': t('Eau déminéralisée'),
    'eau adoucie': t('Eau adoucie'),
    'eau de rivière': t('Eau de rivière'),
  };
  const opexData = getOpexData() || {};
  const { waterPrices = {} } = opexData;
  const getWaterPrice = (wt) => ({
    'eau potable': waterPrices.potable || 3,
    'eau de refroidissement': waterPrices.cooling || 1,
    'eau déminéralisée': waterPrices.demineralized || 5,
    'eau adoucie': waterPrices.soft || 2,
    'eau de rivière': waterPrices.river || 0.5,
  }[wt] || 3);

  // ─── Valeurs amont (props stables du MainPage + polluants onglet 3) ───
  const defaultsFromNode = useCallback(() => {
    const FG = upstreamFG_IN || innerData?.FG_OUT_kg_h || {};
    const P = innerData?.PInput || innerData?.Poutput || {};
    return {
      mCO2: FG.CO2 ?? 2839,
      mH2O: FG.H2O ?? 12270,
      mN2: FG.N2 ?? 19417,
      mO2: FG.O2 ?? 1549,
      mSO2: P.SO2 ?? 31.61,
      mHCl: P.HCl ?? 14.25,
      tempFumees: upstreamT_IN ?? 350,
    };
  }, [upstreamFG_IN, upstreamT_IN, innerData]);

  // ─── États (pattern getInitialValue du Design d'origine) ───
  const [PDC_calcul, setPDC_calcul] = useState({
    'Pression aéraulique [mmCE]': getInitialValue('P_OUT', 0),
    'PDC [mmCE]': getInitialValue('PDC_mmCE_QUENCH', 150),
  });
  const [usePventuri, setUsePventuri] = useState(getInitialValue('QD_usePventuri', true));

  const [fumees, setFumees] = useState(() => ({ ...defaultsFromNode(), pTotal: getInitialValue('P_OUT', 0) }));

  const [quenchParams, setQuenchParams] = useState({
    diamQuench: getInitialValue('Quench_diameter_std', 0.55),
    chkCone: getInitialValue('QD_chkCone', false),
    diamCone: getInitialValue('QD_diamCone', 445),
    tempEauAp: getInitialValue('QD_tempEauAp', 25),
    effVenturi: getInitialValue('QD_effVenturi', 0.6),
    diamGouttes: getInitialValue('QD_diamGouttes', 700),
    constNusselt: getInitialValue('QD_constNusselt', 2),
    coefHautSat: getInitialValue('QD_coefHautSat', 1.5),
  });

  const [typeEau, setTypeEau] = useState(getInitialValue('Type_eau', 'eau potable'));

  const [Parametres_conso_Elec, setParametres_conso_Elec] = useState({
    'Puissance pompe [kW]': getInitialValue('Puissance_pompe_quench', 15),
    'Rendement pompe [%]': getInitialValue('Rendement_pompe', 85),
  });

  const rechargerDepuisFlux = () => {
    setFumees((s) => ({ ...s, ...defaultsFromNode() }));
  };

  // ─── Calcul ───
  const r = useMemo(
    () => calculQuench({ ...fumees, ...quenchParams }),
    [fumees, quenchParams]
  );

  // ─── PDC & pompe ───
  const P_in_mmCE = PDC_calcul['Pression aéraulique [mmCE]'];
  const PDC_mmCE = usePventuri && r && !r.erreurTs ? r.pVenturi : PDC_calcul['PDC [mmCE]'];
  const P_out_mmCE = P_in_mmCE - PDC_mmCE;

  const Puissance_pompe_kW = Parametres_conso_Elec['Puissance pompe [kW]'];
  const Rendement_pompe = Parametres_conso_Elec['Rendement pompe [%]'];
  const Conso_elec_pompe_reelle_kW = Puissance_pompe_kW / (Rendement_pompe / 100);

  // Eau consommée = appoint du quench (évaporation + purge), ventilée par type
  const Q_eau_m3_h = r && !r.erreurTs ? Math.max(r.debMasEauAppoint, 0) / 1000 : 0;
  const eauParType = {
    Conso_EauPotable_m3: 0, Conso_EauRefroidissement_m3: 0, Conso_EauDemin_m3: 0,
    Conso_EauRiviere_m3: 0, Conso_EauAdoucie_m3: 0,
  };
  if (typeEau === 'eau potable') eauParType.Conso_EauPotable_m3 = Q_eau_m3_h;
  else if (typeEau === 'eau de refroidissement') eauParType.Conso_EauRefroidissement_m3 = Q_eau_m3_h;
  else if (typeEau === 'eau déminéralisée') eauParType.Conso_EauDemin_m3 = Q_eau_m3_h;
  else if (typeEau === 'eau adoucie') eauParType.Conso_EauAdoucie_m3 = Q_eau_m3_h;
  else if (typeEau === 'eau de rivière') eauParType.Conso_EauRiviere_m3 = Q_eau_m3_h;
  else eauParType.Conso_EauPotable_m3 = Q_eau_m3_h;

  const currentWaterPrice = getWaterPrice(typeEau);
  const waterCostPerHour = Q_eau_m3_h * currentWaterPrice;

  // ─── Synchronisation innerData (compat rapport + OPEX + aval) ───
  const lastSync = useRef('');
  useEffect(() => {
    if (!setInnerData || typeof setInnerData !== 'function') return;
    const sig = (v, f = 2) =>
      v === 0 || v === null || v === undefined || !isFinite(v) ? 0 : parseFloat(v.toPrecision(f));
    const payload = {
      // Clés conservées du Design d'origine
      P_out_mmCE,
      consoElec1: sig(Conso_elec_pompe_reelle_kW),
      labelElec1: t('pompe quench'),
      ...Object.fromEntries(Object.entries(eauParType).map(([k, v]) => [k, sig(v)])),
      Quench_diameter: quenchParams.diamQuench,
      Type_eau: typeEau,
      Puissance_pompe_quench: Puissance_pompe_kW,
      Rendement_pompe,
      PDC_mmCE_QUENCH: PDC_mmCE,
      // Nouvelles clés (calcul Pyrofluid)
      QD_usePventuri: usePventuri,
      Quench_diameter_std: quenchParams.diamQuench,
      QD_chkCone: quenchParams.chkCone,
      QD_diamCone: quenchParams.diamCone,
      QD_tempEauAp: quenchParams.tempEauAp,
      QD_effVenturi: quenchParams.effVenturi,
      QD_diamGouttes: quenchParams.diamGouttes,
      QD_constNusselt: quenchParams.constNusselt,
      QD_coefHautSat: quenchParams.coefHautSat,
      ...(r && !r.erreurTs
        ? {
            QD: r,
            QD_inputs: { ...fumees, ...quenchParams },
            recup_Ts: r.ts,
            RoEpuree: r.roEpuree,
            T_quench_out: r.tempSortie,
            // Fumées épurées vers l'aval (entrée tour de lavage)
            FG_quench_out_kg_h: {
              CO2: r.masEp.CO2, H2O: r.masEp.H2O, O2: r.masEp.O2, N2: r.masEp.N2,
              SO2: r.masEp.SO2, HCl: r.masEp.HCl,
            },
          }
        : {}),
    };
    const json = JSON.stringify(payload);
    if (json === lastSync.current) return;
    lastSync.current = json;
    setInnerData((prev) => ({ ...prev, ...payload }));
  }, [r, fumees, quenchParams, typeEau, P_out_mmCE, PDC_mmCE, usePventuri, Conso_elec_pompe_reelle_kW, Puissance_pompe_kW, Rendement_pompe, setInnerData, t]);

  // ─── Avertissements (plages legacy, MsgBox → bandeaux) ───
  const warnings = [];
  if (quenchParams.effVenturi < 0.5 || quenchParams.effVenturi > 0.7) warnings.push(t('QD_warn_venturi'));
  if (quenchParams.diamGouttes < 700 || quenchParams.diamGouttes > 800) warnings.push(t('QD_warn_gouttes'));
  if (r && !r.erreurTs) {
    if (r.vitesse < 10 || r.vitesse > 15)
      warnings.push(`${t('QD_warn_vitesse_colonne')} ${fmt(r.vitesse, 2)} m/s (10 – 15 m/s)`);
    if (r.vPassage < 30 || r.vPassage > 40)
      warnings.push(`${t('QD_warn_vitesse_cone')} ${fmt(r.vPassage, 2)} m/s (30 – 40 m/s)`);
    if (r.debMasTotalRecirc < 0)
      warnings.push(`${t('QD_warn_recirc')} (${fmt(r.debMasTotalRecirc, 0)} kg/h)`);
    if (!r.converge) warnings.push(t('QD_warn_convergence'));
  }

  const outEl = (label, value, unit = '', d = 2, warn = false) => ({
    text: t(label) + (unit ? ` [${unit}]` : ''),
    value: (warn ? '🔴 ' : '') + fmt(value, d),
  });

  const setF = useCallback((k) => (v) => setFumees((s) => ({ ...s, [k]: v })), []);
  const setQ = useCallback((k) => (v) => setQuenchParams((s) => ({ ...s, [k]: v })), []);

  // ─── Tables de résultats ───
  const elements_PDC = [{ text: t('Pression de sortie [mmCE]'), value: fmt(P_out_mmCE, 2) }];

  const elementsEntree = r && !r.erreurTs ? [
    outEl('QD_debit_massique_total', r.masTot, 'kg/h'),
    outEl('QD_debit_volumique_total', r.volTot, 'Nm³/h'),
    outEl('QD_hcl_sec', r.concHClInSec, 'mg/Nm³', 1),
    outEl('QD_so2_sec', r.concSO2InSec, 'mg/Nm³', 1),
    outEl('QD_vitesse_colonne', r.vitesse, 'm/s', 2, r.vitesse < 10 || r.vitesse > 15),
  ] : [];

  const elementsSaturation = r && !r.erreurTs ? [
    outEl('QD_ts', r.ts, '°C'),
    outEl('QD_eau_evaporee', r.debMasEvap, 'kg/h'),
    outEl('QD_zsat', r.zsat, 'm'),
    outEl('QD_vitesse_cone', r.vPassage, 'm/s', 2, r.vPassage < 30 || r.vPassage > 40),
    outEl('QD_diam_cone_retenu', r.diamCone, 'mm', 0),
    outEl('QD_pventuri', r.pVenturi, 'mmCE'),
    outEl('QD_mol_incond', r.debMolIncond, 'mol/h', 0),
    outEl('QD_temps_evap', r.te, 's', 3),
  ] : [];

  const elementsSortie = r && !r.erreurTs ? [
    outEl('QD_temp_sortie', r.tempSortie, '°C'),
    outEl('QD_debit_massique_total', r.masTotEp, 'kg/h'),
    outEl('QD_debit_volumique_total', r.volTotEp, 'Nm³/h'),
    outEl('QD_hcl_kg', r.masEp.HCl, 'kg/h'),
    outEl('QD_hcl_sec', r.concHClSec, 'mg/Nm³', 1),
    outEl('QD_so2_sec', r.concSO2Sec, 'mg/Nm³', 1),
    outEl('QD_eff_hcl', r.effHCl, '%', 1),
    outEl('QD_ro_epuree', r.roEpuree, 'kg/m³', 3),
  ] : [];

  const elementsBilans = r && !r.erreurTs ? [
    outEl('QD_appoint', r.debMasEauAppoint, 'kg/h'),
    outEl('QD_arrosage', r.debMasLiqAr, 'kg/h'),
    outEl('QD_recirc', r.debMasTotalRecirc, 'kg/h', 2, r.debMasTotalRecirc < 0),
    outEl('QD_purge', r.debMasTotalPurge, 'kg/h'),
    outEl('QD_conc_hcl_rec', r.concHClRec, '%', 4),
    outEl('QD_conc_hcl_ar', r.concHClAr, '%', 4),
    { text: t('QD_ph_arrosage'), value: r.pH !== null && r.concHClAr > 0 ? fmt(r.pH, 2) : '!!!!!' },
    { text: t('QD_ph_recirc'), value: r.pHRec !== null ? fmt(r.pHRec, 2) : '!!!!!' },
    { text: t("Prix de l'eau [€/m³]"), value: fmt(currentWaterPrice, 2) },
    { text: t('Coût eau par heure [€/h]'), value: fmt(waterCostPerHour, 2) },
  ] : [];

  const elements_conso_pompe = [
    { text: t('Puissance pompe nominale [kW]'), value: fmt(Puissance_pompe_kW, 2) },
    { text: t('Rendement pompe [%]'), value: fmt(Rendement_pompe, 1) },
    { text: t('Consommation réelle [kW]'), value: fmt(Conso_elec_pompe_reelle_kW, 2) },
  ];

  return (
    <div className="cadre_pour_onglet">
      {/* Légende + recharger */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#e0f7fa', border: '1px solid #7cc7d8' }}>{t('QD_legend_input')}</span>
          <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#fff9c4', border: '1px solid #e0c96a' }}>{t('QD_legend_calc')}</span>
          <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#ffcdd2', border: '1px solid #e57373' }}>🔴 {t('QD_legend_warn')}</span>
        </div>
        <button
          onClick={rechargerDepuisFlux}
          style={{ padding: '6px 12px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}
        >
          {t('QD_reload_from_flow')}
        </button>
      </div>

      {warnings.length > 0 && (
        <div style={{ padding: 12, marginBottom: 12, borderRadius: 4, backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
          {warnings.map((w, i) => (
            <div key={i}>⚠️ {w}</div>
          ))}
        </div>
      )}

      {r?.erreurTs && (
        <div style={{ padding: 12, marginBottom: 12, borderRadius: 4, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
          ❌ {t('QD_err_ts')}
        </div>
      )}
      {!r && (
        <div style={{ padding: 12, marginBottom: 12, borderRadius: 4, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
          ❌ {t('QD_err_composition')}
        </div>
      )}

      {/* PDC aéraulique (structure conservée + option ΔP venturi calculée) */}
      <QSection title={t('Pertes de charge aéraulique')} results={elements_PDC} t={t}>
        <QInField label="Pression aéraulique [mmCE]" value={PDC_calcul['Pression aéraulique [mmCE]']}
          onChange={(v) => setPDC_calcul((s) => ({ ...s, 'Pression aéraulique [mmCE]': v }))} t={t} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ flex: 1, minWidth: '250px', textAlign: 'right', fontWeight: '500', color: '#333' }}>
            {t('QD_use_pventuri')} :
          </label>
          <input type="checkbox" checked={usePventuri} onChange={(e) => setUsePventuri(e.target.checked)} />
        </div>
        <QInField label="PDC [mmCE]" value={usePventuri && r && !r.erreurTs ? r.pVenturi.toFixed(2) : PDC_calcul['PDC [mmCE]']}
          onChange={(v) => setPDC_calcul((s) => ({ ...s, 'PDC [mmCE]': v }))} disabled={usePventuri} t={t} />
      </QSection>

      {/* Fumées en entrée */}
      <QSection title={t('QD_section_entree')} results={elementsEntree} t={t}>
        <QInField label="QD_flow_CO2" value={fumees.mCO2} onChange={setF('mCO2')} t={t} />
        <QInField label="QD_flow_H2O" value={fumees.mH2O} onChange={setF('mH2O')} t={t} />
        <QInField label="QD_flow_N2" value={fumees.mN2} onChange={setF('mN2')} t={t} />
        <QInField label="QD_flow_O2" value={fumees.mO2} onChange={setF('mO2')} t={t} />
        <QInField label="QD_flow_SO2" value={fumees.mSO2} onChange={setF('mSO2')} t={t} />
        <QInField label="QD_flow_HCl" value={fumees.mHCl} onChange={setF('mHCl')} t={t} />
        <QInField label="QD_temperature" value={fumees.tempFumees} onChange={setF('tempFumees')} t={t} />
        <QInField label="QD_depression" value={fumees.pTotal} onChange={setF('pTotal')} t={t} />
      </QSection>

      {/* Dimensionnement du Quench */}
      <QSection title={t('Dimensionnement du Quench')} results={elementsSaturation} t={t}>
        <div style={{ display: 'flex', gap: '30px', marginBottom: '10px' }}>
          <div style={{ flex: 1 }}>
            <img src={reactImage} alt="Quench" style={{ width: '100%', maxWidth: '300px', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1.4, display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ flex: 1, minWidth: '250px', textAlign: 'right', fontWeight: '500', color: '#333' }}>
                {t('Quench diameter [m]')} :
              </label>
              <select
                value={quenchParams.diamQuench}
                onChange={(e) => setQ('diamQuench')(parseFloat(e.target.value))}
                style={{ flex: '0 0 150px', padding: '8px', border: '1px solid #7cc7d8', borderRadius: '4px', backgroundColor: '#e0f7fa', textAlign: 'right', fontFamily: 'monospace' }}
              >
                {DIAM_QUENCH.map((d) => (
                  <option key={d} value={d}>{d.toFixed(2)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ flex: 1, minWidth: '250px', textAlign: 'right', fontWeight: '500', color: '#333' }}>
                {t('QD_cone_saisi')} :
              </label>
              <input type="checkbox" checked={quenchParams.chkCone} onChange={(e) => setQ('chkCone')(e.target.checked)} />
            </div>
            <QInField label="QD_diam_cone" value={quenchParams.chkCone ? quenchParams.diamCone : (DIAM_CONE_AUTO[quenchParams.diamQuench] || 0)}
              onChange={setQ('diamCone')} disabled={!quenchParams.chkCone} step="5" t={t} />
            <QInField label="QD_temp_eau_appoint" value={quenchParams.tempEauAp} onChange={setQ('tempEauAp')} step="1" t={t} />
            <QInField label="QD_eff_venturi" value={quenchParams.effVenturi} onChange={setQ('effVenturi')} step="0.05" t={t} />
            <QInField label="QD_diam_gouttes" value={quenchParams.diamGouttes} onChange={setQ('diamGouttes')} step="10" t={t} />
            <QInField label="QD_const_nusselt" value={quenchParams.constNusselt} onChange={setQ('constNusselt')} step="1" t={t} />
            <QInField label="QD_coef_haut_sat" value={quenchParams.coefHautSat} onChange={setQ('coefHautSat')} step="0.1" t={t} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ flex: 1, minWidth: '250px', textAlign: 'right', fontWeight: '500', color: '#333' }}>
                {t("Type d'eau")} :
              </label>
              <select
                value={typeEau}
                onChange={(e) => setTypeEau(e.target.value)}
                style={{ flex: '0 0 150px', padding: '8px', border: '1px solid #7cc7d8', borderRadius: '4px', backgroundColor: '#e0f7fa' }}
              >
                {Object.keys(waterTypeLabels).map((k) => (
                  <option key={k} value={k}>{waterTypeLabels[k]}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </QSection>

      {/* Fumées en sortie */}
      <QSection title={t('QD_section_sortie')} results={elementsSortie} t={t} />

      {/* Bilans eau & recirculation */}
      <QSection title={t('QD_section_bilans')} results={elementsBilans} t={t} />

      {/* Consommation électrique de la pompe (inchangé) */}
      <QSection title={t('Consommation électrique de la pompe')} results={elements_conso_pompe} t={t}>
        <QInField label="Puissance pompe [kW]" value={Puissance_pompe_kW}
          onChange={(v) => setParametres_conso_Elec((s) => ({ ...s, 'Puissance pompe [kW]': Math.max(1, Math.min(500, v)) }))} step="1" t={t} />
        <QInField label="Rendement pompe [%]" value={Rendement_pompe}
          onChange={(v) => setParametres_conso_Elec((s) => ({ ...s, 'Rendement pompe [%]': Math.max(30, Math.min(95, v)) }))} step="1" t={t} />
      </QSection>

      {/* Résumé */}
      {r && !r.erreurTs && (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
          <h3>{t('Résumé des paramètres principaux')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <p><strong>{t('Quench diameter [m]')} :</strong> {quenchParams.diamQuench} m</p>
            <p><strong>{t('QD_diam_cone')} :</strong> {fmt(r.diamCone, 0)} mm</p>
            <p><strong>{t('QD_ts')} :</strong> {fmt(r.ts, 2)} °C</p>
            <p><strong>{t('QD_zsat')} :</strong> {fmt(r.zsat, 2)} m</p>
            <p><strong>{t('QD_appoint')} :</strong> {fmt(r.debMasEauAppoint, 0)} kg/h</p>
            <p><strong>{t('QD_eff_hcl')} :</strong> {fmt(r.effHCl, 1)} %</p>
            <p><strong>{t('Puissance pompe [kW]')} :</strong> {Puissance_pompe_kW} kW</p>
            <p><strong>{t('QD_pventuri')} :</strong> {fmt(r.pVenturi, 1)} mmCE</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default QUENCHDesign;
