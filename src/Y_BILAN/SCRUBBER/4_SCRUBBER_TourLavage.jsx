import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './SCRUBBER_traduction';
import { tlTranslations } from './TourLavage_traduction';
import { fmt } from '../../A_Transverse_fonction/formatNumber';

// ═══════════════════════════════════════════════════════════════════
// TOUR DE LAVAGE — Portage du module VB.NET Pyrofluid
// (TourLavage.vb + ClassTourLavage.vb, voie humide)
// Remplace Laveur_acid.jsx + Laveur_basique.jsx (onglet unique).
// Branches portées : SousRef 0/1 (condenseur) et TypeVerif VSP/Autres.
// Code couleur : cyan = saisie | jaune = calculé | rouge = hors plage
// ═══════════════════════════════════════════════════════════════════

// ===== CONSTANTES =====
const M = { CO2: 44, H2O: 18, O2: 32, N2: 28, SO2: 64, HCl: 36.5, NaOH: 40 };
const VM = 22.4; // Nm3/kmol (valeur legacy)

// Diamètres standards & débits d'arrosage associés (m3/h) — legacy
const DIAM_STD = [1.2, 1.5, 1.8, 2.0, 2.2, 2.5, 2.8];
const DEBIT_STD = [25, 40, 60, 70, 80, 100, 120];

// ===== FONCTIONS THERMODYNAMIQUES (simplifiées / issues du legacy) =====
const psatH2O = (t) => (t <= -228 ? 0 : Math.pow(10, 7.9688 - 1668.21 / (228 + t)));

const muEau = (t) =>
  1e-3 * Math.pow(10, -10.73 + 1828 / (273 + t) + 1.966e-2 * (273 + t) - 14.66e-6 * Math.pow(273 + t, 2));

const roEau = (t) =>
  0.3471 * Math.pow(0.274, -Math.pow(1 - (t + 273) / (374.2 + 273), 2 / 7)) * 1000;

const sigmaEau = (t) => 71.97e-3 * Math.pow((374.2 - t) / (374.2 - 25), 0.8105);

const cpLiquide = (t) =>
  0.6741 + 2.825e-3 * (t + 273) - 8.371e-6 * Math.pow(t + 273, 2) + 8.601e-9 * Math.pow(t + 273, 3);

const cpgEau = (t) =>
  (8.1 - 0.72e-3 * (t + 273) + 3.63e-6 * Math.pow(t + 273, 2) - 1.16e-9 * Math.pow(t + 273, 3)) / 18;

// Enthalpie des fumées (kcal/h) — même polynôme que H_fumee_chonscl du Laveur_acid
// latent : 597 kcal/kg entrée, 547 sortie condenseur (convention legacy)
function enthalpieFumees(T, m, latent) {
  const s1 = T * (0.226 * m.CO2 + 0.427 * m.H2O + 0.225 * m.O2 + 0.239 * m.N2 + 0.164 * m.SO2 + 0.19 * m.HCl);
  const s2 = T * T * (46.5e-6 * m.CO2 + 80.5e-6 * m.H2O + 24.5e-6 * m.O2 + 27e-6 * m.N2 + 25.5e-6 * m.SO2 + 11.5e-6 * m.HCl);
  return s1 + s2 + m.H2O * latent;
}

function muFumees(y, tC) {
  const s = (k) => Math.sqrt(M[k]);
  const den = y.CO2 * s('CO2') + y.H2O * s('H2O') + y.O2 * s('O2') + y.N2 * s('N2');
  if (den <= 0) return 1.8e-5;
  const a1 = (25.45 * y.CO2 * s('CO2') + 30.43 * y.N2 * s('N2') + 18.11 * y.O2 * s('O2') - 31.89 * y.H2O * s('H2O')) / den;
  const a2 = (0.4549 * y.CO2 * s('CO2') + 0.4989 * y.N2 * s('N2') + 0.6632 * y.O2 * s('O2') + 0.4145 * y.H2O * s('H2O')) / den;
  const a3 = (-8.649e-5 * y.CO2 * s('CO2') - 1.093e-4 * y.N2 * s('N2') - 1.879e-4 * y.O2 * s('O2') - 8.272e-6 * y.H2O * s('H2O')) / den;
  const TK = tC + 273;
  return (a1 + a2 * TK + a3 * TK * TK) * 1e-7;
}

const arrondi05 = (x) => Math.ceil(x * 2) / 2;
const volDe = (m) => ({
  CO2: (m.CO2 * VM) / M.CO2, H2O: (m.H2O * VM) / M.H2O, N2: (m.N2 * VM) / M.N2,
  O2: (m.O2 * VM) / M.O2, SO2: (m.SO2 * VM) / M.SO2, HCl: (m.HCl * VM) / M.HCl,
});
const somme = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const parseValue = (v) => { const p = parseFloat(v); return isNaN(p) ? 0 : p; };

// ═══════════════════════════════════════════════════════════════════
// MOTEUR DE CALCUL (transcription de ClassTourLavage.Calcul)
// Exporté pour test / réutilisation.
// ═══════════════════════════════════════════════════════════════════
export function calculTour(inp) {
  const Tin = inp.tempFumees;
  const p = 760 - Math.abs(inp.pTotal / 13.595); // mmCE → mmHg

  // ─── Fumées en entrée ───
  const masIn = { CO2: inp.mCO2, H2O: inp.mH2O, N2: inp.mN2, O2: inp.mO2, SO2: inp.mSO2, HCl: inp.mHCl };
  const volIn = volDe(masIn);
  const masTotIn = somme(masIn) + (inp.mPoussieres || 0);
  const volTotIn = somme(volIn);
  const volSecIn = volTotIn - volIn.H2O;
  if (volTotIn <= 0 || volSecIn <= 0) return null;

  const pO2in = (volIn.O2 / volSecIn) * 100;
  const corr = (o2) => 10 / (21 - o2); // correction à 11 % O2 sur sec
  const concSO2In = ((masIn.SO2 * 1e6) / volSecIn) * corr(pO2in);
  const concHClIn = ((masIn.HCl * 1e6) / volSecIn) * corr(pO2in);
  const entIn = enthalpieFumees(Tin, masIn, 597);

  // ─── Étage condenseur (SousRef = 1) ───
  let cond = null;
  let masAbs, tAbs;
  if (inp.sousRef) {
    const Tc = inp.tempSortieCond;
    const psatC = psatH2O(Tc);
    const molIncond = ((volTotIn - volIn.H2O - volIn.HCl) * 1000) / VM;
    const mH2Oc = psatC < p ? (psatC / (p - psatC)) * molIncond * (M.H2O / 1000) : masIn.H2O;
    const condensat = Math.max(masIn.H2O - mH2Oc, 0);
    const masC = { ...masIn, H2O: mH2Oc };
    const entOut = enthalpieFumees(Tc, masC, 547);
    const deltaEnt = entIn - entOut;
    const cpL = cpLiquide(inp.tempLiqRef);
    const dT = Tin - inp.tempLiqRef;
    const eauRefroid = dT !== 0 ? (deltaEnt / cpL - Tin * condensat) / dT : 0;
    const eauEntreeCond = eauRefroid + inp.debArrosage;
    const eauSortieCond = eauEntreeCond + condensat;
    const tSortieLiq = eauSortieCond > 0 ? (deltaEnt / cpL + eauEntreeCond * inp.tempLiqRef) / eauSortieCond : 0;
    const d1 = Tin - tSortieLiq;
    const d2 = Math.abs(inp.tempLiqRef - Tc);
    const lmtd = d2 > 0 && d1 > 0 && d1 !== d2 ? (d1 - d2) / Math.log(d1 / d2) : d1;
    const cpg = cpgEau((Tin + Tc) / 2);
    const chalSenIn = entIn - masIn.H2O * 597;
    const chalSenOut = entOut - mH2Oc * 597;
    const deltaChalSen = chalSenIn - chalSenOut;
    cond = { Tc, psatC, mH2Oc, condensat, masC, entOut, deltaEnt, eauRefroid, eauEntreeCond, tSortieLiq, lmtd, cpg, deltaChalSen };
    masAbs = masC;
    tAbs = Tc;
  } else {
    masAbs = masIn;
    tAbs = Tin;
  }

  // ─── Gaz à l'entrée de la partie absorption ───
  const volAbs = volDe(masAbs);
  const masTotAbs = somme(masAbs);
  const volTotAbs = somme(volAbs);
  const y = { CO2: volAbs.CO2 / volTotAbs, H2O: volAbs.H2O / volTotAbs, O2: volAbs.O2 / volTotAbs, N2: volAbs.N2 / volTotAbs };
  const roGaz = masTotAbs / ((volTotAbs * (tAbs + 273)) / 273);
  const muGaz = muFumees(y, tAbs);

  // ─── Liquide de lavage ───
  const muLiq = muEau(tAbs), muLiq20 = muEau(20);
  const roLiq = roEau(tAbs), roLiq20 = roEau(20);
  const nuLiq = muLiq / roLiq, nuLiq20 = muLiq20 / roLiq20;
  const sigmaLiq = sigmaEau(tAbs);

  // ─── Flux d'engorgement (Sherwood-Lobo, forme legacy) ───
  const L = inp.debArrosage;
  const vf1 = (L / masTotAbs) * Math.sqrt(roGaz / roLiq);
  const vf2 = Math.exp(-4 * Math.pow(vf1, 0.25));
  const fluxEngor =
    inp.facteurGarn > 0
      ? 3600 * Math.sqrt((vf2 * 9.81 * roGaz * roLiq) / (inp.facteurGarn * Math.pow(nuLiq / nuLiq20, 0.2)))
      : 0;
  const fluxReel = 0.7 * fluxEngor;
  const sec1 = fluxReel > 0 ? masTotAbs / fluxReel : 0;
  const diamCalc = Math.sqrt((4 * sec1) / Math.PI);

  const D = inp.diamRetenu;
  const sec = (Math.PI * D * D) / 4;

  // ─── Hauteur du condenseur (A20) ───
  let hauteurCond = 0;
  if (cond && sec > 0 && cond.deltaChalSen !== 0) {
    const V = ((cond.lmtd * (9 / 5) + 32) * (cond.condensat * 2.2046) * cond.cpg) / (cond.deltaChalSen * 3.9683);
    if (V > 0 && V < 1) {
      const h1 = Math.pow(
        (-cond.condensat * 2.2046 * cond.cpg) /
          (0.0146 *
            Math.pow((masTotIn / sec) * 0.2048, 0.82) *
            Math.pow((cond.eauEntreeCond / sec) * 0.2048, 0.47) *
            (sec * 10.7643) *
            Math.log(1 - V)),
        1.613
      );
      hauteurCond = h1 * 0.3048 * 1.5;
    }
  }

  // ─── Vérifications ───
  const tauxMouil = sec > 0 && inp.surfaceVolGarn > 0 ? (L / sec) / (inp.surfaceVolGarn * roLiq) : 0;
  const rapport = inp.diamGarn > 0 ? diamCalc / inp.diamGarn : 0;
  const tauxEngor = sec > 0 && fluxEngor > 0 ? ((masTotAbs / sec) / fluxEngor) * 100 : 0;

  // ─── Corrélation d'Onda ───
  const TK = tAbs + 273;
  const Gp = masTotAbs / (sec * 3600);
  const Lp = L / (sec * 3600);
  const Ga = (9.81 * Math.pow(inp.diamGarn, 3) * roLiq * roLiq) / (muLiq * muLiq);
  const We = (inp.diamGarn * Lp * Lp) / (roLiq * sigmaLiq);
  const aw =
    We > 0 && Ga > 0 && inp.surfaceVolGarn > 0 && inp.sigmaTenSup > 0
      ? inp.surfaceVolGarn *
        (1 -
          Math.exp(
            -1.45 * Math.pow(inp.sigmaTenSup / sigmaLiq, 0.75) *
              Math.pow(inp.surfaceVolGarn * inp.diamGarn, -0.35) *
              Math.pow(Ga, 0.05) * Math.pow(We, 0.2)
          ))
      : 0;
  const Re = inp.surfaceVolGarn > 0 ? Gp / (inp.surfaceVolGarn * muGaz) : 0;
  const cOnda = inp.diamGarn > 0.015 ? 5.23 : 2;

  const difSO2 = 0.122e-4 * (TK / 273);
  const scSO2 = muGaz / (roGaz * difSO2);
  const kgSO2 =
    ((cOnda * difSO2 * inp.surfaceVolGarn) / (8.314 * TK)) *
    Math.pow(Re, 0.7) * Math.pow(scSO2, 1 / 3) *
    Math.pow(1 / (inp.surfaceVolGarn * inp.diamGarn), 2);
  const hutSO2 = aw > 0 && kgSO2 > 0 ? Gp / (roGaz * 8.314 * TK * aw * kgSO2) : 0;

  const difHCl =
    Math.pow(TK, 1.75) / (1e8 * (p / 760) * (14.9 * y.CO2 + 11.6 * y.N2 + 11.7 * y.O2 + 9.1 * y.H2O));
  const scHCl = muGaz / (roGaz * difHCl);
  const kgHCl =
    ((cOnda * difHCl * inp.surfaceVolGarn) / (8.314 * TK)) *
    Math.pow(Re, 0.7) * Math.pow(scHCl, 1 / 3) *
    Math.pow(1 / (inp.surfaceVolGarn * inp.diamGarn), 2);
  const hutHCl = aw > 0 && kgHCl > 0 ? Gp / (roGaz * 8.314 * TK * aw * kgHCl) : 0;

  // ─── NUT & hauteurs de garnissage ───
  const cibleSO2 = Math.min(inp.cibleSO2, concSO2In);
  const cibleHCl = Math.min(inp.cibleHCl, concHClIn);
  const nutSO2 = concSO2In > cibleSO2 && cibleSO2 > 0 ? Math.log(concSO2In / cibleSO2) : 0;
  const nutHCl = concHClIn > cibleHCl && cibleHCl > 0 ? Math.log(concHClIn / cibleHCl) : 0;
  const hGarnSO2 = nutSO2 * hutSO2 * 1.5 + 0.49;
  const hGarnHCl = nutHCl * hutHCl * 1.5 + 0.49;
  const hGarnRetenue = (hGarnSO2 + hGarnHCl) * inp.coefHautSat;

  // ─── Fumées en sortie : boucle itérative sur %O2 sec ───
  const psatOut = psatH2O(tAbs);
  const molIncondS = ((volAbs.CO2 + volAbs.N2 + volAbs.O2) * 1000) / VM;
  const masH2Os = psatOut < p ? (psatOut / (p - psatOut)) * molIncondS * (M.H2O / 1000) : masAbs.H2O;

  let pO2s = pO2in;
  let volSecS = volTotAbs - volAbs.H2O;
  let masSO2s = 0, masHCls = 0, volTotS = volTotAbs;
  for (let i = 0; i < 200; i++) {
    masSO2s = cibleSO2 * 1e-6 * ((21 - pO2s) / 10) * volSecS;
    masHCls = cibleHCl * 1e-6 * ((21 - pO2s) / 10) * volSecS;
    const vSO2 = (masSO2s * VM) / M.SO2;
    const vHCl = (masHCls * VM) / M.HCl;
    const vH2O = (masH2Os * VM) / M.H2O;
    volTotS = volAbs.CO2 + volAbs.N2 + volAbs.O2 + vSO2 + vHCl + vH2O;
    volSecS = volTotS - vH2O;
    const pO2test = (volAbs.O2 / volSecS) * 100;
    const diff = Math.abs(pO2s - pO2test);
    pO2s = pO2test;
    if (diff < 1e-5) break;
  }
  const masTotS = masAbs.CO2 + masAbs.N2 + masAbs.O2 + masSO2s + masHCls + masH2Os;
  const roSortie = masTotS / ((volTotS * (tAbs + 273)) / 273);

  // ─── Pertes de charge du garnissage ───
  let dPGarn = 0;
  if (inp.typeGarn === 'VSP' && sec > 0) {
    const x = (volTotAbs / (3600 * sec)) * ((tAbs + 273) / 273) * roGaz * roGaz;
    dPGarn = 0.1 * Math.exp(Math.min(1.97275 + 1.293 * x, 50));
  } else if (inp.typeGarn === 'Autres' && sec > 0) {
    const a1 = 21.79 - 36.19 * Math.pow(vf1, 0.25) + 16.6 * Math.sqrt(vf1);
    const a2 = 7.06 + 10.3 * Math.pow(vf1, 0.25) - 10.36 * Math.sqrt(vf1);
    const a3 =
      (Math.pow(masTotAbs / 3600 / sec, 2) * inp.facteurGarn * Math.pow(nuLiq / nuLiq20, 0.2)) /
      (9.81 * roGaz * roLiq);
    dPGarn = (98 * (a3 / vf2) * (a1 + a2 * (a3 / vf2))) / 9.81;
  }
  const dPGarnH = hGarnRetenue > 0 ? dPGarn / hGarnRetenue : 0;

  // ─── Dévésiculeur ───
  const vitDevesEng = 0.08 * 3600 * Math.sqrt(Math.max(roLiq - roSortie, 0) / roSortie);
  const secDeves = vitDevesEng > 0 ? masTotS / (roSortie * vitDevesEng) : 0;
  const diamDeves = arrondi05(Math.sqrt((4 * secDeves) / Math.PI));
  const secDevesRet = (Math.PI * diamDeves * diamDeves) / 4;
  const vitRetenue = secDevesRet > 0 ? masTotS / secDevesRet : 0; // kg/(m2.h) ≈ m/h (legacy)
  const dPDeves = 0.0169 * roSortie * inp.epaisDeves * Math.pow(vitRetenue / 3600, 1.85);

  // ─── Purge & appoint ───
  const so2Purge = masAbs.SO2 - masSO2s;
  const purgeAbs = inp.concLiqSO2 > 0 ? so2Purge / (inp.concLiqSO2 / 100) : 0;
  const appointAbs = purgeAbs - so2Purge;
  const purgeTotale = purgeAbs + (cond ? cond.condensat : 0);

  // ─── Consommation de soude ───
  const P = inp.pourNaOH;
  const concNaOH = 0.1026 * P * P + 10.167 * P; // g/l
  const roNaOH = (0.0106 * P + 1.003) * 1000; // kg/m3
  const hclNeutralise = masAbs.HCl - masHCls;
  const masNaOH_SO2 = concNaOH > 0 ? roNaOH * (((so2Purge / M.SO2) * M.NaOH * 2) / concNaOH) : 0;
  const masNaOH_HCl = concNaOH > 0 ? roNaOH * (((hclNeutralise / M.HCl) * M.NaOH) / concNaOH) : 0;
  const masNaOHTot = masNaOH_SO2 + masNaOH_HCl; // kg/h de solution
  const volNaOHTot = (masNaOHTot / roNaOH) * 1000; // l/h
  const masNaOHMaxi =
    concNaOH > 0
      ? roNaOH * (((masAbs.SO2 / M.SO2) * M.NaOH * 2) / concNaOH) +
        roNaOH * (((masAbs.HCl / M.HCl) * M.NaOH) / concNaOH)
      : 0;

  // ─── Efficacités (compat rapport) ───
  const effHCl = masIn.HCl > 0 ? ((masIn.HCl - masHCls) / masIn.HCl) * 100 : 0;
  const effSO2 = masIn.SO2 > 0 ? ((masIn.SO2 - masSO2s) / masIn.SO2) * 100 : 0;

  return {
    masTotIn, volTotIn, volSecIn, pO2in, concSO2In, concHClIn, entIn,
    cond, hauteurCond, tAbs,
    masAbs, masTotAbs, volTotAbs, roGaz, muGaz, muLiq, roLiq, sigmaLiq,
    fluxEngor, fluxReel, diamCalc, sec,
    tauxMouil, rapport, tauxEngor,
    aw, Re, hutSO2, hutHCl, nutSO2, nutHCl, hGarnSO2, hGarnHCl, hGarnRetenue,
    cibleSO2, cibleHCl, masSO2s, masHCls, masH2Os, masTotS, volTotS, pO2s, roSortie,
    dPGarn, dPGarnH,
    vitDevesEng, diamDeves, vitRetenue, dPDeves,
    so2Purge, hclNeutralise, purgeAbs, appointAbs, purgeTotale,
    concNaOH, roNaOH, masNaOHTot, volNaOHTot, masNaOHMaxi,
    effHCl, effSO2,
  };
}

// ═══════════════════════════════════════════════════════════════════
// COMPOSANTS UI — définis au niveau module pour avoir des références
// stables entre renders et éviter la perte de focus sur les inputs.
// ═══════════════════════════════════════════════════════════════════
const TLSection = ({ title, children }) => (
  <div style={{ marginBottom: 20, padding: 16, backgroundColor: '#f9f9f9', borderRadius: 8 }}>
    <h3 style={{ marginTop: 0, borderBottom: '2px solid #4a90e2', paddingBottom: 8, fontSize: 15 }}>{title}</h3>
    {children}
  </div>
);

const InField = ({ label, unit, step = '0.01', disabled = false, value, onChange, t }) => {
  const [display, setDisplay] = useState(() => value !== undefined && value !== null ? String(value) : '');
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDisplay(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, opacity: disabled ? 0.4 : 1 }}>
      <label style={{ flex: 1, minWidth: 180, textAlign: 'right', fontWeight: 500, color: '#333', fontSize: 13 }}>
        {t(label)} :
      </label>
      <input
        type="number"
        step={step}
        value={display}
        disabled={disabled}
        onFocus={() => { focused.current = true; }}
        onBlur={() => {
          focused.current = false;
          const n = parseFloat(display);
          const norm = isNaN(n) ? '0' : String(n);
          setDisplay(norm);
          onChange(norm);
        }}
        onChange={(e) => {
          setDisplay(e.target.value);
          onChange(e.target.value);
        }}
        style={{
          flex: '0 0 120px', padding: '5px 8px', textAlign: 'right',
          border: '1px solid #7cc7d8', borderRadius: 4, backgroundColor: disabled ? '#eee' : '#e0f7fa',
          fontFamily: 'monospace',
        }}
      />
      <span style={{ flex: '0 0 70px', fontSize: 11, color: '#888' }}>{unit}</span>
    </div>
  );
};

const OutField = ({ label, value, unit, d = 2, warn = false, hint, disabled = false, t }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, opacity: disabled ? 0.4 : 1 }}>
    <span style={{ flex: 1, minWidth: 180, textAlign: 'right', color: '#333', fontSize: 13 }}>
      {t(label)}{hint ? ` ${hint}` : ''} :
    </span>
    <span
      style={{
        flex: '0 0 120px', padding: '5px 8px', textAlign: 'right', borderRadius: 4,
        border: warn ? '1px solid #e57373' : '1px solid #e0c96a',
        backgroundColor: warn ? '#ffcdd2' : '#fff9c4',
        color: warn ? '#b71c1c' : '#333',
        fontWeight: warn ? 'bold' : 'normal',
        fontFamily: 'monospace',
      }}
    >
      {disabled ? '—' : fmt(value, d)}
    </span>
    <span style={{ flex: '0 0 70px', fontSize: 11, color: '#888' }}>{unit}</span>
  </div>
);

const RadioRowField = ({ label, options, value, onChange, t }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
    <label style={{ flex: 1, minWidth: 180, textAlign: 'right', fontWeight: 500, color: '#333', fontSize: 13 }}>
      {t(label)} :
    </label>
    <span style={{ flex: '0 0 200px', display: 'flex', gap: 14, fontSize: 13 }}>
      {options.map((o) => (
        <label key={String(o.v)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
          <input type="radio" checked={value === o.v} onChange={() => onChange(o.v)} />
          {t(o.l)}
        </label>
      ))}
    </span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════
const TourLavageCalculator = ({ innerData = {}, setInnerData, currentLanguage = 'fr', nodeId }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const t = useCallback((key) =>
    tlTranslations[languageCode]?.[key] ||
    tlTranslations['fr']?.[key] ||
    translations[languageCode]?.[key] ||
    translations['fr']?.[key] ||
    key,
  [languageCode]);

  // Valeurs initiales tirées du flux amont (node quench → onglets 2 & 3)
  const defaultsFromNode = useCallback(() => {
    const FG = innerData?.FG_out_kg_h || innerData?.FG_OUT_kg_h || {};
    const P = innerData?.Poutput || innerData?.PInput || {};
    return {
      mCO2: FG.CO2 ?? 2839,
      mH2O: FG.H2O ?? 17740,
      mN2: FG.N2 ?? 19417,
      mO2: FG.O2 ?? 1549,
      mSO2: P.SO2 ?? 31.61,
      mHCl: P.HCl ?? 5.78,
      mPoussieres: 0,
      tempFumees: innerData?.T_sortie ?? innerData?.T_OUT ?? 84.66,
      pTotal: 0,
      cibleSO2: 50, cibleHCl: 10,
      diamRetenu: 1.2, debArrosage: 25000, concLiqSO2: 4.5, pourNaOH: 30,
      typeGarn: 'VSP', facteurGarn: 82, surfaceVolGarn: 100, diamGarn: 0.051,
      sigmaTenSup: 0.033, coefHautSat: 1.5,
      sousRef: false, tempLiqRef: 20, tempSortieCond: 40,
      epaisDeves: 444,
    };
  }, [innerData]);

  const [inp, setInp] = useState(() => {
    const saved = localStorage.getItem(`tourLavage_${nodeId}`);
    return saved ? { ...defaultsFromNode(), ...JSON.parse(saved) } : defaultsFromNode();
  });

  useEffect(() => {
    localStorage.setItem(`tourLavage_${nodeId}`, JSON.stringify(inp));
  }, [inp, nodeId]);

  const set = useCallback((k) => (v) => setInp((s) => ({ ...s, [k]: v })), []);
  const setNum = useCallback((k) => (v) => setInp((s) => ({ ...s, [k]: parseValue(v) })), []);

  const rechargerDepuisFlux = () => {
    const d = defaultsFromNode();
    setInp((s) => ({
      ...s,
      mCO2: d.mCO2, mH2O: d.mH2O, mN2: d.mN2, mO2: d.mO2,
      mSO2: d.mSO2, mHCl: d.mHCl, tempFumees: d.tempFumees,
    }));
  };

  const clearMemory = () => {
    localStorage.removeItem(`tourLavage_${nodeId}`);
    setInp(defaultsFromNode());
  };

  const selectDiam = (i) =>
    setInp((s) => ({ ...s, diamRetenu: DIAM_STD[i], debArrosage: DEBIT_STD[i] * 1000 }));

  const r = useMemo(() => calculTour(inp), [inp]);

  // ─── Synchronisation innerData (compat rapport + OPEX + aval) ───
  const lastSync = useRef('');
  useEffect(() => {
    if (!setInnerData || !r) return;
    const payload = {
      // Compat SCRUBBER_Report (anciennes clés Laveur_acid / Laveur_basique)
      T_FG_out_acid: r.tAbs,
      FG_HCl_efficiency: r.effHCl,
      SO2_efficiency: r.effSO2,
      SO2_removed_load: r.so2Purge,
      SO2_consumption: r.masNaOHTot,
      column_diameter: inp.diamRetenu,
      packing_volume: r.sec * r.hGarnRetenue,
      wash_solution_flow: inp.debArrosage / 1000, // m3/h (eau ≈ 1)
      // OPEX (eau d'appoint + soude)
      Conso_NaOH_kg: r.masNaOHTot,
      Conso_EauPotable_m3: r.appointAbs / 1000,
      // Fumées épurées vers l'aval
      T_scrubber_out: r.tAbs,
      FG_scrubber_out_kg_h: {
        CO2: r.masAbs.CO2, H2O: r.masH2Os, O2: r.masAbs.O2, N2: r.masAbs.N2,
        SO2: r.masSO2s, HCl: r.masHCls,
      },
      // Résultats complets pour le rapport
      TL: r,
      TL_inputs: inp,
    };
    const json = JSON.stringify(payload);
    if (json === lastSync.current) return;
    lastSync.current = json;
    setInnerData((prev) => ({ ...prev, ...payload }));
  }, [r, inp, setInnerData]);

  const twoCol = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' };

  return (
    <div className="cadre_pour_onglet">
      {/* Bandeau légende + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#e0f7fa', border: '1px solid #7cc7d8' }}>{t('TL_legend_input')}</span>
          <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#fff9c4', border: '1px solid #e0c96a' }}>{t('TL_legend_calc')}</span>
          <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#ffcdd2', border: '1px solid #e57373' }}>{t('TL_legend_warn')}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={rechargerDepuisFlux} style={{ padding: '6px 12px', background: '#4a90e2', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            {t('TL_reload_from_flow')}
          </button>
          <button onClick={clearMemory} style={{ padding: '6px 12px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            {t('Clear memory')}
          </button>
        </div>
      </div>

      {!r && (
        <div style={{ padding: 12, margin: 12, borderRadius: 4, backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
          ❌ {t('TL_err_invalid_composition')}
        </div>
      )}

      <div style={twoCol}>
        {/* ─── Colonne gauche : saisies ─── */}
        <div>
          <TLSection title={t('TL_section_inlet')}>
            <InField label="TL_flow_CO2" unit="kg/h" value={inp.mCO2} onChange={setNum('mCO2')} t={t} />
            <InField label="TL_flow_H2O" unit="kg/h" value={inp.mH2O} onChange={setNum('mH2O')} t={t} />
            <InField label="TL_flow_N2" unit="kg/h" value={inp.mN2} onChange={setNum('mN2')} t={t} />
            <InField label="TL_flow_O2" unit="kg/h" value={inp.mO2} onChange={setNum('mO2')} t={t} />
            <InField label="TL_flow_SO2" unit="kg/h" value={inp.mSO2} onChange={setNum('mSO2')} t={t} />
            <InField label="TL_flow_HCl" unit="kg/h" value={inp.mHCl} onChange={setNum('mHCl')} t={t} />
            <InField label="TL_flow_dust" unit="kg/h" value={inp.mPoussieres} onChange={setNum('mPoussieres')} t={t} />
            <InField label="TL_temperature" unit="°C" value={inp.tempFumees} onChange={setNum('tempFumees')} t={t} />
            <InField label="TL_pressure_drop_upstream" unit="mmCE" value={inp.pTotal} onChange={setNum('pTotal')} t={t} />
            {r && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #ddd' }}>
                <OutField label="TL_total_mass_flow" value={r.masTotIn} unit="kg/h" t={t} />
                <OutField label="TL_total_vol_flow" value={r.volTotIn} unit="Nm³/h" t={t} />
                <OutField label="TL_o2_dry" value={r.pO2in} unit="% vol" t={t} />
                <OutField label="TL_so2_dry_11" value={r.concSO2In} unit="mg/Nm³" d={1} t={t} />
                <OutField label="TL_hcl_dry_11" value={r.concHClIn} unit="mg/Nm³" d={1} t={t} />
              </div>
            )}
          </TLSection>

          <TLSection title={t('TL_section_column')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <label style={{ flex: 1, minWidth: 180, textAlign: 'right', fontWeight: 500, color: '#333', fontSize: 13 }}>
                {t('TL_selected_diameter')} :
              </label>
              <select
                value={DIAM_STD.indexOf(inp.diamRetenu)}
                onChange={(e) => selectDiam(parseInt(e.target.value))}
                style={{ flex: '0 0 120px', padding: '5px 8px', textAlign: 'right', border: '1px solid #7cc7d8', borderRadius: 4, backgroundColor: '#e0f7fa', fontFamily: 'monospace' }}
              >
                {DIAM_STD.map((d, i) => (
                  <option key={d} value={i}>{d.toFixed(2)}</option>
                ))}
              </select>
              <span style={{ flex: '0 0 70px', fontSize: 11, color: '#888' }}>m</span>
            </div>
            <InField label="TL_spray_flow" unit="kg/h" step="100" value={inp.debArrosage} onChange={setNum('debArrosage')} t={t} />
            <InField label="TL_naoh_pct" unit="%" step="0.5" value={inp.pourNaOH} onChange={setNum('pourNaOH')} t={t} />
            <InField label="TL_so2_salts" unit="%" step="0.1" value={inp.concLiqSO2} onChange={setNum('concLiqSO2')} t={t} />
            <InField label="TL_target_so2" unit="mg/Nm³" step="1" value={inp.cibleSO2} onChange={setNum('cibleSO2')} t={t} />
            <InField label="TL_target_hcl" unit="mg/Nm³" step="1" value={inp.cibleHCl} onChange={setNum('cibleHCl')} t={t} />
          </TLSection>

          <TLSection title={t('TL_section_packing')}>
            <RadioRowField
              label="TL_packing_type"
              options={[{ v: 'VSP', l: 'VSP' }, { v: 'Autres', l: 'TL_other' }, { v: 'Aucun', l: 'None' }]}
              value={inp.typeGarn}
              onChange={set('typeGarn')}
              t={t}
            />
            <InField label="TL_sat_height_coef" unit="—" step="0.1" value={inp.coefHautSat} onChange={setNum('coefHautSat')} t={t} />
            <InField label="TL_packing_factor" unit="m²/m³" step="1" value={inp.facteurGarn} onChange={setNum('facteurGarn')} t={t} />
            <InField label="TL_specific_area" unit="m²/m³" step="1" value={inp.surfaceVolGarn} onChange={setNum('surfaceVolGarn')} t={t} />
            <InField label="TL_packing_size" unit="m" step="0.001" value={inp.diamGarn} onChange={setNum('diamGarn')} t={t} />
            <InField label="TL_critical_tension" unit="N/m" step="0.001" value={inp.sigmaTenSup} onChange={setNum('sigmaTenSup')} t={t} />
          </TLSection>

          <TLSection title={t('TL_section_subcooling')}>
            <RadioRowField
              label="TL_use_subcooling"
              options={[{ v: true, l: 'TL_yes' }, { v: false, l: 'TL_no' }]}
              value={inp.sousRef}
              onChange={set('sousRef')}
              t={t}
            />
            <InField label="TL_cooling_liquid_temp" unit="°C" disabled={!inp.sousRef} value={inp.tempLiqRef} onChange={setNum('tempLiqRef')} t={t} />
            <InField label="TL_condenser_outlet_temp" unit="°C" disabled={!inp.sousRef} value={inp.tempSortieCond} onChange={setNum('tempSortieCond')} t={t} />
            {r && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #ddd' }}>
                <OutField label="TL_condenser_height" value={r.hauteurCond} unit="m" disabled={!inp.sousRef} t={t} />
                <OutField label="TL_condensate_flow" value={r.cond?.condensat} unit="kg/h" disabled={!inp.sousRef} t={t} />
                <OutField label="TL_cooling_water_flow" value={r.cond?.eauRefroid} unit="kg/h" disabled={!inp.sousRef} t={t} />
                <OutField label="TL_liquid_outlet_temp" value={r.cond?.tSortieLiq} unit="°C" disabled={!inp.sousRef} t={t} />
                <OutField label="TL_condenser_duty" value={r.cond ? r.cond.deltaEnt * 1.163e-3 : 0} unit="kW" d={0} disabled={!inp.sousRef} t={t} />
              </div>
            )}
          </TLSection>

          <TLSection title={t('TL_section_demister')}>
            <InField label="TL_demister_thickness" unit="mm" step="1" value={inp.epaisDeves} onChange={setNum('epaisDeves')} t={t} />
            {r && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #ddd' }}>
                <OutField label="TL_demister_diameter" value={r.diamDeves} unit="m" d={1} t={t} />
                <OutField label="TL_demister_velocity" value={r.vitRetenue} unit="m/h" d={0} t={t} />
                <OutField label="TL_demister_dp" value={r.dPDeves} unit="mmCE" t={t} />
              </div>
            )}
          </TLSection>
        </div>

        {/* ─── Colonne droite : résultats ─── */}
        <div>
          {r && (
            <>
              <TLSection title={t('TL_section_verifications')}>
                <OutField label="TL_flooding_flux" value={r.fluxEngor} unit="kg/(m²·h)" t={t} />
                <OutField label="TL_real_flux" value={r.fluxReel} unit="kg/(m²·h)" t={t} />
                <OutField label="TL_computed_diameter" value={r.diamCalc} unit="m" t={t} />
                <OutField label="TL_wetting_rate" hint="(0,09–0,72)" value={r.tauxMouil} unit="m³/(m²·h)" warn={r.tauxMouil < 0.09 || r.tauxMouil > 0.72} t={t} />
                <OutField label="TL_ratio_check" hint="(> 12)" value={r.rapport} unit="—" warn={r.rapport < 12} t={t} />
                <OutField label="TL_flooding_rate" hint="(< 70 %)" value={r.tauxEngor} unit="%" warn={r.tauxEngor > 70} t={t} />
              </TLSection>

              <TLSection title={t('TL_section_absorption')}>
                <OutField label="TL_packing_height_so2" value={r.hGarnSO2} unit="m" t={t} />
                <OutField label="TL_packing_height_hcl" value={r.hGarnHCl} unit="m" t={t} />
                <OutField label="TL_packing_height_total" value={r.hGarnRetenue} unit="m" t={t} />
                <OutField label="TL_packing_dp" value={r.dPGarn} unit="mmCE" t={t} />
                <OutField label="TL_packing_dp_per_m" value={r.dPGarnH} unit="mmCE/m" t={t} />
                <OutField label="TL_hut_so2" value={r.hutSO2} unit="m" d={3} t={t} />
                <OutField label="TL_nut_so2" value={r.nutSO2} unit="—" t={t} />
                <OutField label="TL_hut_hcl" value={r.hutHCl} unit="m" d={3} t={t} />
                <OutField label="TL_nut_hcl" value={r.nutHCl} unit="—" t={t} />
                <OutField label="TL_wetted_area" value={r.aw} unit="m²/m³" d={1} t={t} />
              </TLSection>

              <TLSection title={t('TL_section_outlet')}>
                <OutField label="TL_temperature" value={r.tAbs} unit="°C" t={t} />
                <OutField label="TL_total_vol_flow" value={r.volTotS} unit="Nm³/h" t={t} />
                <OutField label="TL_total_mass_flow" value={r.masTotS} unit="kg/h" t={t} />
                <OutField label="TL_so2_dry_11" value={r.cibleSO2} unit="mg/Nm³" t={t} />
                <OutField label="TL_flow_SO2" value={r.masSO2s} unit="kg/h" t={t} />
                <OutField label="TL_hcl_dry_11" value={r.cibleHCl} unit="mg/Nm³" t={t} />
                <OutField label="TL_flow_HCl" value={r.masHCls} unit="kg/h" t={t} />
                <OutField label="TL_flow_H2O" value={r.masH2Os} unit="kg/h" t={t} />
                <OutField label="TL_efficiency_so2" value={r.effSO2} unit="%" d={1} t={t} />
                <OutField label="TL_efficiency_hcl" value={r.effHCl} unit="%" d={1} t={t} />
              </TLSection>

              <TLSection title={t('TL_section_water_reagent')}>
                <OutField label="TL_makeup_water" value={r.appointAbs} unit="kg/h" t={t} />
                <OutField label="TL_so2_purge" value={r.purgeAbs} unit="kg/h" t={t} />
                <OutField label="TL_total_purge" value={r.purgeTotale} unit="kg/h" t={t} />
                <OutField label="TL_naoh_conc" value={r.concNaOH} unit="g/l" d={1} t={t} />
                <OutField label="TL_naoh_nominal" value={r.masNaOHTot} unit="kg/h" t={t} />
                <OutField label="TL_naoh_nominal_vol" value={r.volNaOHTot} unit="l/h" t={t} />
                <OutField label="TL_naoh_maxi" value={r.masNaOHMaxi} unit="kg/h" t={t} />
              </TLSection>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TourLavageCalculator;
