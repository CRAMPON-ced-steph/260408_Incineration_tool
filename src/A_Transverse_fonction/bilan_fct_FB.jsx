// ============================================
// DONNÉES DE COMPOSITION ÉLÉMENTAIRE
// bilan_fct_FB.js - VERSION NETTOYÉE
// ============================================

import { fh_CO2, fh_O2, fh_CO, fh_HCl, fh_H2O, fh_H2, fh_SO2, fh_N2 } from "./enthalpy_gas";
import {molarMasses} from "./constantes"

// ============================================
// DONNÉES CONSTANTES
// ============================================

const CHONSCL_DATA = {
  'PRIMAIRE': { C: 49.7, H: 6.8, O: 34.3, N: 7, S: 1.5, Cl: 0.7 },
  'MIXTE': { C: 54.4, H: 6.8, O: 28.6, N: 8.6, S: 1.7, Cl: 0 },
  'BIOLOGIQUE': { C: 54.2, H: 8, O: 29.3, N: 7.2, S: 1.3, Cl: 0 },
  'DIGEREE': { C: 52.7, H: 7.6, O: 30.7, N: 5.8, S: 2.2, Cl: 1 },
  'GRAISSE': { C: 75, H: 10.4, O: 12.5, N: 0.5, S: 1.5, Cl: 0 },
  'REFUS_DEGRILLAGE': { C: 56, H: 8, O: 32, N: 3.5, S: 0.5, Cl: 0 },
  'GAZ NATUREL': { C: 89.8, H: 7.5, O: 0.6, N: 0.9, S: 1.2, Cl: 0 },
  'FIOUL': { C: 85.8, H: 13.4, O: 0.15, N: 0.15, S: 0.5, Cl: 0 }
};

const CHONSCL_PRECISION = {
  'PRIMAIRE': { C: 3, H: 0.5, O: 4.5, N: 1.6, S: 1, Cl: 0.7 },
  'MIXTE': { C: 3.7, H: 0.6, O: 4, N: 1.6, S: 0.5, Cl: 0 },
  'BIOLOGIQUE': { C: 3.7, H: 0.6, O: 4, N: 1.6, S: 0.5, Cl: 0 },
  'DIGEREE': { C: 2.3, H: 1.4, O: 3.7, N: 1.1, S: 1.6, Cl: 0.5 },
  'GRAISSE': { C: 0, H: 0, O: 0, N: 0, S: 0, Cl: 0 },
  'REFUS_DEGRILLAGE': { C: 0, H: 0, O: 0, N: 0, S: 0, Cl: 0 }
};

const PCI_kJ_kgMV_VALUES = {
  'PRIMAIRE': 20017.34,
  'MIXTE': 23570.68,
  'BIOLOGIQUE': 23570.68,
  'DIGEREE': 22662.56,
  'GRAISSE': 36399.02,
  'REFUS_DEGRILLAGE': 24237.38
};

const PCI_kcal_kgMV_VALUES = {
  'PRIMAIRE': 4781.06,
  'MIXTE': 5300,
  'BIOLOGIQUE': 5629.76,
  'DIGEREE': 5412.86,
  'GRAISSE': 8717.64,
  'REFUS_DEGRILLAGE': 5789
};

// ============================================
// FONCTIONS - PAR ORDRE ALPHABÉTIQUE
// ============================================

export const Calcul_DH_Voute = (Pvoute, TempAir, VitesseTuyere) => {
  const PoidsAir = 0.001293 * (10.33 + (Pvoute / 1000)) / 10.33 * 273.159 / (TempAir + 273.159);
  return (1.8 * PoidsAir * Math.pow(VitesseTuyere, 2)) / (2 * 9.81);
};

export const calculDebitPT = (debitTheoVol, pressionMmce, temperature) => {
  return debitTheoVol * (10.33 / (10.33 + 0.001 * pressionMmce)) * 
         ((273.159 + temperature) / 273.159);
};

export const calculDebitPT_Nm3 = (debitTheoVol, pressionMmce, temperature) => {
  return debitTheoVol * (273.159 / (273.159 + temperature)) * 
         ((10.33 + pressionMmce * 0.001) / 10.33);
};

export const CHONSCl_boue = (element, typeBoue) => {
  return CHONSCL_DATA[typeBoue]?.[element] || 0;
};

export const CHONSCl_boue_precision = (element, typeBoue) => {
  return CHONSCL_PRECISION[typeBoue]?.[element] || 0;
};

export const choix_R = (Masse_eau) => {
  const D = Masse_eau / 530;
  
  if (D <= 6.157521601) return 'R28';
  if (D <= 10.1787602) return 'R36';
  if (D <= 14.52201204) return 'R43';
  if (D <= 19.63495408) return 'R50';
  if (D <= 24.6300864) return 'R56';
  if (D <= 31.17245311) return 'R63';
  if (D <= 40.71504079) return 'R72';
  return null;
};

export const Coef_Hext = (Vitesse_Fumees) => {
  return 54 * Math.log(0.15 * Vitesse_Fumees + 1);
};

export const Coef_Hint = (Vitesse_Air) => {
  return 100 * Math.log(0.077 * Vitesse_Air + 1);
};

// Capacités thermiques massiques [kcal/kg/°C]
export const cp_air = (T) => {
  const cp = 0.241 * T + 0.000044 * T ** 2 / 2;
  return cp * 4.1868 / 3600;
};

export const cp_dt_co = (T) => {
  const cp = 0.2473 * T + 42.84 / 2000000 * T ** 2;
  return cp * 4.1868 / 3600;
};

export const cp_dt_co2 = (T) => {
  const cp = 0.226 * T + 93e-6 / 2 * T ** 2;
  return cp * 4.1868 / 3600;
};

export const cp_dt_h2 = (T) => {
  const cp = 3.393 * T + 401.8 / 2000000 * T ** 2;
  return cp * 4.1868 / 3600;
};

export const cp_dt_h2o = (T) => {
  const cp = 0.427 * T + 0.000161 / 2 * T ** 2;
  return cp * 4.1868 / 3600;
};

export const cp_dt_hcl = (T) => {
  const cp = 0.19 * T + 23 * T ** 2 / 2000000;
  return cp * 4.1868 / 3600;
};

export const cp_dt_n2 = (T) => {
  const cp = 0.239 * T + 0.000054 / 2 * T ** 2;
  return cp * 4.1868 / 3600;
};

export const cp_dt_o2 = (T) => {
  const cp = 0.225 * T + 0.000049 / 2 * T ** 2;
  return cp * 4.1868 / 3600;
};

export const cp_dt_so2 = (T) => {
  const cp = 0.164 * T + 0.000051 / 2 * T ** 2;
  return cp * 4.1868 / 3600;
};

export const CpL_T = (T) => {
  return 4.186 + 0.0005 * T;
};

export const D_TLM = (T_fumee_sortie, T_fumee_entree, T_air_sortie, T_air_entree) => {
  return ((T_fumee_sortie - T_air_entree) - (T_fumee_entree - T_air_sortie)) / 
         Math.log((T_fumee_sortie - T_air_entree) / (T_fumee_entree - T_air_sortie));
};

/*
function D_TLM(T_fg_out, T_fg_in, T_air_out, T_air_in) {
  const dT1 = T_fg_in - T_air_out;
  const dT2 = T_fg_out - T_air_in;
  if (dT1 === dT2) return dT1;
  return (dT1 - dT2) / Math.log(dT1 / dT2);
}*/





export const Fact_A = (FactUA, FactUEncrasse) => {
  return FactUA / FactUEncrasse;
};

export const Fact_U = (coefHext, CoefHint) => {
  return 1 / ((1 / coefHext) + (1 / CoefHint));
};

export const Fact_U_Encrasse = (FactU, EncrasseEchg) => {
  return FactU / (1 + EncrasseEchg);
};

export const Fact_UA = (QFumees, D_TLM) => {
  const F = 1;
  return D_TLM !== 0 ? QFumees / (F * D_TLM) : 0;
};

// ============================================
// ENTHALPIES MASSIQUES [kW] - Gaz de combustion
// Utilise les fonctions enthalpy_gas + conversion en kW
// ============================================

export const fh_CO2_kW = (T, masse_kg_h) => {
  return fh_CO2(T) * masse_kg_h / 3600;
};

export const fh_CO_kW = (T, masse_kg_h) => {
  return fh_CO(T) * masse_kg_h / 3600;
};

export const fh_H2_kW = (T, masse_kg_h) => {
  return fh_H2(T) * masse_kg_h / 3600;
};

export const fh_H2O_kW = (T, masse_kg_h) => {
  // Ajoute la chaleur latente de vaporisation (540 kcal/kg * 4.1868 J/kcal)
  return (fh_H2O(T) ) * masse_kg_h / 3600;
};

export const fh_HCl_kW = (T, masse_kg_h) => {
  return fh_HCl(T) * masse_kg_h / 3600;
};

export const fh_N2_kW = (T, masse_kg_h) => {
  return fh_N2(T) * masse_kg_h / 3600;
};

export const fh_O2_kW = (T, masse_kg_h) => {
  return fh_O2(T) * masse_kg_h / 3600;
};

export const fh_SO2_kW = (T, masse_kg_h) => {
  return fh_SO2(T) * masse_kg_h / 3600;
};

// ============================================
// ENTHALPIES MASSIQUES [kW] - Matières solides
// ============================================

export const fh_MM_kW = (T, masse_kg_h) => {
  const cp_MM = 0.285 * 4.1868; // [kJ/kg/K]
  return cp_MM * masse_kg_h * T / 3600;
};

export const fh_MS_kW = (T, masse_kg_h) => {
  const cp_MS = 0.285 * 4.1868; // [kJ/kg/K]
  return cp_MS * masse_kg_h * T / 3600;
};

// ============================================
// ENTHALPIE TOTALE DES FUMÉES
// ============================================

export const Masse_Air_Comb_gaz_Func = (DebitComb, ExcesAirComb, TauxCComb, TauxHComb, TauxSComb, TauxOComb) => {
  return DebitComb * (2.6644 * TauxCComb / 100 + 7.9365 * TauxHComb / 100 + 0.9979 * TauxSComb / 100 - TauxOComb / 100) * 4.310055 * (1 + ExcesAirComb / 100);
};


export const H_Fumees = (MFCOTot, MFCO2Tot, MFH2OTot, MFH2Tot, MFN2Tot, MFO2Tot, MFSO2Reel, MFHClTot, T) => {
  const qCO = MFCOTot * cp_dt_co(T);
  const qCO2 = MFCO2Tot * cp_dt_co2(T);
  const qH2O = MFH2OTot * cp_dt_h2o(T);
  const qH2 = MFH2Tot * cp_dt_h2(T);
  const qN2 = MFN2Tot * cp_dt_n2(T);
  const qO2 = MFO2Tot * cp_dt_o2(T);
  const qSO2 = MFSO2Reel * cp_dt_so2(T);
  const qHCl = MFHClTot * cp_dt_hcl(T);
  
  return qCO + qCO2 + qH2O + qH2 + qN2 + qO2 + qSO2 + qHCl;
};

// ✅ CORRIGÉ: Utilise fh_*_kW au lieu de fh_*
export const Hfvoute_kW = (T, m_hcl, m_co2, m_co, m_h2o, m_h2, m_O2exces, m_n2, m_so2reel) => {
  const H_hcl = fh_HCl_kW(T, m_hcl);
  const H_co2 = fh_CO2_kW(T, m_co2);
  const H_co = fh_CO_kW(T, m_co);
  const H_H2O = fh_H2O_kW(T, m_h2o);  // ✅ CORRIGÉ
  const H_H2 = fh_H2_kW(T, m_h2);
  const H_O2exces = fh_O2_kW(T, m_O2exces);
  const H_N2 = fh_N2_kW(T, m_n2);
  const H_so2reel = fh_SO2_kW(T, m_so2reel);
  
  return H_hcl + H_co2 + H_co + H_H2O + H_H2 + H_O2exces + H_N2 + H_so2reel;
};

// ============================================
// CALCULS D'AIR ET DE COMBUSTION
// ============================================

export const Masse_Air_Comb_gaz = (DebitComb, ExcesAirComb, TauxCComb, TauxHComb, TauxSComb, TauxOComb) => {
  return DebitComb * (2.6644 * TauxCComb / 100 + 7.9365 * TauxHComb / 100 + 
         0.9979 * TauxSComb / 100 - TauxOComb / 100) * 4.310055 * (1 + ExcesAirComb / 100);
};

export const Masse_Air_Instrumentation = (DebitCarbone, DebitHydrogene, DebitSoufre, DebitOxygene) => {
  return ((2.6644 * DebitCarbone + 7.9365 * DebitHydrogene + 0.9979 * DebitSoufre - DebitOxygene) * 
         4.32 * (1 + 40 / 100)) * 4 / 100;
};

export const MasseAir = (DebitCarbone, DebitHydrogene, DebitSoufre, DebitOxygene) => {
  return ((2.6644 * DebitCarbone + 7.9365 * DebitHydrogene + 0.9979 * DebitSoufre - DebitOxygene) * 
         4.310055 * (1 + 40 / 100));
};

export const Mole_Excess_O2 = (Exces, MasseAir) => {
  return ((MasseAir * (1 - 1 / (1 + Exces / 100)) * 1 / 4.310055) ) * 1000 / 32;
};

export const Mole_Excess_O2_air_varia = (MasseAir) => {
  return ((MasseAir * 1 / 4.310055) ) * 1000 / 32;
};



export const MoleNOx = (tpMS, tpMV, tpPCI, Qboue, TempFreeBoard, MoleO2, MoleAzote) => {
  tpMS = tpMS / 100;
  tpMV = tpMV / 100;
  const PCIboueBrute = ((tpMS * tpMV * tpPCI - (1 - tpMS) * 598) * Qboue);
  
  if (PCIboueBrute >= 100) {
    const kgNOx = Math.pow(PCIboueBrute / (1.87 * Math.pow(10, 6)), 1.18);
    return (kgNOx / 30.008) * 1000;
  } else {
    return Math.sqrt(21.9 * Math.exp(-43400 / (2 * (TempFreeBoard + 273))) * MoleO2 * MoleAzote);
  }
};

// ============================================
// POUVOIRS CALORIFIQUES
// ============================================

export const PCI_Dulong = (C, H, O, S) => {
  return 80.9 * C + 342.5 * (H - O / 8) + 22.5 * S;
};

export const PCI_incomplete = (MFCOTot, MFH2Tot) => {
  return (2415 * MFCOTot + 28240 * MFH2Tot) * 0.001163;
};

export const PCI_kcal_kg = (MS, MV, PCI) => {
  return (MS / 100) * (MV / 100) * PCI - ((1 - MS / 100) * 598);
};

export const PCI_kcal_kgMV = (type_boue) => {
  return PCI_kcal_kgMV_VALUES[type_boue] || 0;
};

export const PCI_kJ_kgMV = (sludgeType) => {
  return PCI_kJ_kgMV_VALUES[sludgeType] || 0;
};

export const PCS_kcal_kg = (PCI_kcal_kg, MS, MV, H) => {
  return PCI_kcal_kg + 598 * (9 * MS / 100 * MV / 100 * H / 100 + (100 - MS) / 100);
};

export const PCS_kcal_kgMV = (PCI_kcal_kgMV, H) => {
  return PCI_kcal_kgMV + 598 * 9 * H / 100;
};

export const PFreeBoard = (Pvoute, DH) => {
  return (Pvoute - DH * 1000 - 1500 - 50);
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

export const surface = (diametre) => {
  return Math.PI * (diametre ** 2) / 4;
};

/*
export const Tair_fluide_FB = (Hf_avant, Hf_apres, T_air_initial, Rdt_HX, masse_air_sec, masse_eau_air) => {
  const Q_recupere = (Hf_avant - Hf_apres) * Rdt_HX;
  const cp_moyen_air = cp_air((T_air_initial + 200) / 2);
  const cp_moyen_h2o = cp_dt_h2o((T_air_initial + 200) / 2);
  const deltaT = Q_recupere * 3600 / (masse_air_sec * cp_moyen_air + masse_eau_air * cp_moyen_h2o);
  return T_air_initial + deltaT;
};

*/

export const vitesse = (Q, S) => {
  return Q / (3600 * S);
};

export const Vol_Air = (DebitCarbone, DebitHydrogene, DebitSoufre, DebitOxygene) => {
  const Masse_Air = MasseAir(DebitCarbone, DebitHydrogene, DebitSoufre, DebitOxygene);
  return Masse_Air / 1.293;
};


export const Tair_fluide_FB = (H1, H2, H3, rdt, masse_sec, masse_humide) =>{
  const Htarget1 = (H1 - H2) * rdt + H3;
  
  let Tair_fluide_FB = 1;
  let Htarget2 = cp_air(Tair_fluide_FB) * masse_sec + cp_dt_h2o(Tair_fluide_FB) * masse_humide;
  
  while (Htarget2 < Htarget1) {
      Tair_fluide_FB = Tair_fluide_FB + 0.1;
      Htarget2 = cp_air(Tair_fluide_FB) * masse_sec + cp_dt_h2o(Tair_fluide_FB) * masse_humide;
  }
  
  return Tair_fluide_FB;
}

export const DP_RecupAir = (Pvoute, Volairtot, TempAirMoy, VitesseAir, Npasse, Fact_A) => {
  let dpRecupAir = 400;
  let dpRecupAir1;

  // Sécurité anti-boucle infinie (recommandé en JS)
  let iterations = 0;

  do {
      dpRecupAir1 = dpRecupAir;

      // Calculs intermédiaires
      const pressionMoyAir = Pvoute + 50 + (dpRecupAir1 / 2);
      
      // Note: calculDebitPT doit être définie ou importée
      const debitAirTMoy = calculDebitPT(Volairtot, pressionMoyAir, TempAirMoy);
      
      const sectionTube = (debitAirTMoy / 3600) / VitesseAir;
      
      // Ntube : Utilisation de Math.PI et Math.pow pour l'exposant
      const nTube = sectionTube / (Math.PI * Math.pow(0.0385, 2) / 4);
      
      // Longueur équivalente
      const longTubeEquiv = (Fact_A / (Math.PI * 0.0445 * nTube)) + (1.6 * Npasse);
      
      // Calcul de la nouvelle perte de charge
      dpRecupAir = ((0.001293 * longTubeEquiv * Math.pow(VitesseAir, 2)) / (2 * 9.81)) * 1000;

      iterations++;
      if(iterations > 1000) break; // Sortie de secours

  } while (Math.abs(dpRecupAir1 - dpRecupAir) >= 0.1); 

  return dpRecupAir;
};


/**
 * Recherche la température de sortie des fumées par dichotomie
 */
 export const tempSortieFumees = (MFCOTot, MFCO2Tot, MFH2OTot, MFH2Tot, MFN2Tot, MFO2Tot, MFSO2Reel, MFHClTot, hTarget) => {
  let nb = 0;
  let x = 100;
  let xAmont = 0;
  let xAval = 0;
  
  // Note: hFumees doit être définie dans votre projet
  let valeur = H_Fumees(MFCOTot, MFCO2Tot, MFH2OTot, MFH2Tot, MFN2Tot, MFO2Tot, MFSO2Reel, MFHClTot, x);

  // Phase 1 : Trouver les bornes
  while (valeur < hTarget) {
      xAmont = x;
      x = x * 2;
      valeur = H_Fumees(MFCOTot, MFCO2Tot, MFH2OTot, MFH2Tot, MFN2Tot, MFO2Tot, MFSO2Reel, MFHClTot, x);
  }
  xAval = x;

  // Phase 2 : Dichotomie pour affiner
  x = (xAmont + xAval) / 2;
  valeur = H_Fumees(MFCOTot, MFCO2Tot, MFH2OTot, MFH2Tot, MFN2Tot, MFO2Tot, MFSO2Reel, MFHClTot, x);

  // Boucle de précision (0.1)
  while (Math.abs(valeur - hTarget) > 0.1) {
      nb++;
      
      if (nb >= 10000) return x; // Sécurité

      if (valeur > hTarget) {
          xAval = x;
      } else {
          xAmont = x;
      }
      
      x = (xAmont + xAval) / 2;
      valeur =H_Fumees(MFCOTot, MFCO2Tot, MFH2OTot, MFH2Tot, MFN2Tot, MFO2Tot, MFSO2Reel, MFHClTot, x);
  }

  return x;
};


export const MasseAir_e = (DebitCarbone, DebitHydrogene, DebitSoufre, DebitOxygene, e , O2_target ) => {
  const pourcent_O2 = O2_target;
  const pourcent_N2 = 100 - 0.93 - pourcent_O2;

  const QteO2 = (pourcent_O2 / 100) * 32 * 1000 / 22.4;
  const QteN2 = (pourcent_N2 / 100) * 28.016 * 1000 / 22.4;
  const QteAr = 0.0093 * 39.944 * 1000 / 22.4;

  const masse_vol = (QteO2 + QteN2 + QteAr) / 1000;
  const rapport_O2 = (QteO2 + QteN2 + QteAr) / QteO2;

  const MasseAir = (2.6644 * DebitCarbone + 7.9365 * DebitHydrogene + 0.9979 * DebitSoufre - DebitOxygene) * rapport_O2 * (1 + e / 100);
  const VolAirInstrum = MasseAir / masse_vol;

  return { MasseAir_e: MasseAir, VolAirInstrum };
};





export const Vol_Air_e = (DebitCarbone, DebitHydrogene, DebitSoufre, DebitOxygene, e , O2_target) => {
  const Masse_Air = MasseAir_e(DebitCarbone, DebitHydrogene, DebitSoufre, DebitOxygene, e, O2_target).MasseAir_e;
  const pourcent_O2 = O2_target;
  const pourcent_N2 = 100 - 0.93 - pourcent_O2;
  const QteO2 = (pourcent_O2 / 100) * 32 * 1000 / 22.4;
  const QteN2 = (pourcent_N2 / 100) * 28.016 * 1000 / 22.4;
  const QteAr = 0.0093 * 39.944 * 1000 / 22.4;
  const masse_vol = (QteO2 + QteN2 + QteAr) / 1000;
  const rapport_O2 = (QteO2 + QteN2 + QteAr) / QteO2;
  const Vol_Air = Masse_Air / masse_vol;
  return Vol_Air;
};



// Les constantes atomiques et molaires sont importées de ailleurs
// (molarMasses.C, molarMasses.H, molarMasses.O, molarMasses.N, molarMasses.S, molarMasses.Cl)
// (molarMasses.CO2, molarMasses.O2, molarMasses.N2, molarMasses.H2O, molarMasses.SO2, molarMasses.HCl)

// ============================================================
// Fonction helper : masse totale
// ============================================================
const MasseTotale = (mCO2, mO2, mN2, mH2O, mSO2, mHCl) => {
  return mCO2 + mO2 + mN2 + mH2O + mSO2 + mHCl;
};

// ============================================================
// CARBONE – wC (%)
// Source : CO2
// ============================================================
export const FractionMassiqueC = (mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses) => {
  const mTot = MasseTotale(mCO2, mO2, mN2, mH2O, mSO2, mHCl);
  if (mTot === 0) return 0;

  const elemC = mCO2 * (molarMasses.C / molarMasses.CO2);
  return (elemC / mTot) * 100;
};

// ============================================================
// HYDROGÈNE – wH (%)
// Sources : H2O (2H), HCl (1H)
// ============================================================
export const FractionMassiqueH = (mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses) => {
  const mTot = MasseTotale(mCO2, mO2, mN2, mH2O, mSO2, mHCl);
  if (mTot === 0) return 0;

  const elemH =
    mH2O * ((2 * molarMasses.H) / molarMasses.H2O) +
    mHCl * (molarMasses.H / molarMasses.HCl);

  return (elemH / mTot) * 100;
};

// ============================================================
// OXYGÈNE – wO (%)
// Sources : CO2 (2O), O2 (2O), H2O (1O), SO2 (2O)
// ============================================================
export const FractionMassiqueO = (mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses) => {
  const mTot = MasseTotale(mCO2, mO2, mN2, mH2O, mSO2, mHCl);
  if (mTot === 0) return 0;

  const elemO =
    mCO2 * ((2 * molarMasses.O) / molarMasses.CO2) +
    mO2 * ((2 * molarMasses.O) / molarMasses.O2) +
    mH2O * (molarMasses.O / molarMasses.H2O) +
    mSO2 * ((2 * molarMasses.O) / molarMasses.SO2);

  return (elemO / mTot) * 100;
};

// ============================================================
// AZOTE – wN (%)
// Source : N2 (2N)
// ============================================================
export const FractionMassiqueN = (mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses) => {
  const mTot = MasseTotale(mCO2, mO2, mN2, mH2O, mSO2, mHCl);
  if (mTot === 0) return 0;

  const elemN = mN2 * ((2 * molarMasses.N) / molarMasses.N2);

  return (elemN / mTot) * 100;
};

// ============================================================
// SOUFRE – wS (%)
// Source : SO2 (1S)
// ============================================================
export const FractionMassiqueS = (mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses) => {
  const mTot = MasseTotale(mCO2, mO2, mN2, mH2O, mSO2, mHCl);
  if (mTot === 0) return 0;

  const elemS = mSO2 * (molarMasses.S / molarMasses.SO2);

  return (elemS / mTot) * 100;
};

// ============================================================
// CHLORE – wCl (%)
// Source : HCl (1Cl)
// ============================================================
export const FractionMassiqueCl = (mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses) => {
  const mTot = MasseTotale(mCO2, mO2, mN2, mH2O, mSO2, mHCl);
  if (mTot === 0) return 0;

  const elemCl = mHCl * (molarMasses.Cl / molarMasses.HCl);

  return (elemCl / mTot) * 100;
};

// ============================================================
// Fonction utilitaire : toutes les fractions d'un coup
// ============================================================
export const AllElementalComposition = (mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses) => {
  return {
    C: FractionMassiqueC(mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses),
    H: FractionMassiqueH(mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses),
    O: FractionMassiqueO(mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses),
    N: FractionMassiqueN(mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses),
    S: FractionMassiqueS(mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses),
    Cl: FractionMassiqueCl(mCO2, mO2, mN2, mH2O, mSO2, mHCl, molarMasses),
  };
};


/**
 * Constante d'équilibre K3 : [CO].[H2O] = K3.[CO2].[H2]
 */
 function calculateK3(tempFreeboard) {
  const logT = Math.log10(tempFreeboard + 273.159);
  return Math.pow(10,
    -235.638681 +
    203.92436 * logT -
    58.93241 * Math.pow(logT, 2) +
    5.707847 * Math.pow(logT, 3)
  );
}
 
/**
 * Calcul du H2 molaire via équilibre thermodynamique
 */
export function Mole_H2(tempFreeboard, moleCTot, moleOTot, moleOxygene, 
                 moleClTot, moleO2ExcesTot, moleSTot, moleHTot) {
  
  const K3equil = calculateK3(tempFreeboard);
  
  if (moleO2ExcesTot > 0) {
    return 0;
  } else {
    const parmB1 = moleOTot - 2 * moleCTot - 2 * moleSTot - moleClTot;
    const parmA = 1 - K3equil;
    const parmB2 = K3equil * (moleHTot / 2 - moleOTot + 2 * moleSTot + 3 * moleCTot + moleClTot);
    const parmB = parmB1 + parmB2;
    const parmC = K3equil * moleCTot * (parmB1 - moleHTot / 2);
    
    const delta = Math.pow(parmB, 2) - 4 * parmA * parmC;
    
    if (delta < 0) {
      throw new Error('Discriminant négatif : pas de solution réelle');
    }
    
    const x1 = (-parmB + Math.sqrt(delta)) / (2 * parmA);
    const x2 = (-parmB - Math.sqrt(delta)) / (2 * parmA);
    
    let moleCO;
    if (x1 >= 0 && x1 <= moleCTot) {
      moleCO = x1;
    } else if (x2 >= 0 && x2 <= moleCTot) {
      moleCO = x2;
    } else {
      throw new Error('Aucune solution valide pour MoleCO');
    }
    
    return moleHTot / 2 - parmB1 - moleCO;
  }
}
 
/**
 * Calcul du CO molaire via équilibre thermodynamique
 */
export function Mole_CO(tempFreeboard, moleCTot, moleOTot, moleOxygene, 
                 moleClTot, moleO2ExcesTot, moleSTot, moleHTot) {
  
  const K3equil = calculateK3(tempFreeboard);
  
  if (moleO2ExcesTot > 0) {
    const moleCO2 = (moleCTot * Math.sqrt(moleOxygene)) / (0.05 + Math.sqrt(moleOxygene));
    return moleCTot - moleCO2;
  } else {
    const parmB1 = moleOTot - 2 * moleCTot - 2 * moleSTot - moleClTot;
    const parmA = 1 - K3equil;
    const parmB2 = K3equil * (moleHTot / 2 - moleOTot + 2 * moleSTot + 3 * moleCTot + moleClTot);
    const parmB = parmB1 + parmB2;
    const parmC = K3equil * moleCTot * (parmB1 - moleHTot / 2);
    
    const delta = Math.pow(parmB, 2) - 4 * parmA * parmC;
    
    if (delta < 0) {
      throw new Error('Discriminant négatif : pas de solution réelle');
    }
    
    const x1 = (-parmB + Math.sqrt(delta)) / (2 * parmA);
    const x2 = (-parmB - Math.sqrt(delta)) / (2 * parmA);
    
    if (x1 >= 0 && x1 <= moleCTot) {
      return x1;
    } else if (x2 >= 0 && x2 <= moleCTot) {
      return x2;
    } else {
      throw new Error('Aucune solution valide pour MoleCO');
    }
  }
}


/**
 * Recherche la température de sortie des fumées par dichotomie binaire
 * @param {number} mfCOTot - Débit massique CO (kg/h)
 * @param {number} mfCO2Tot - Débit massique CO2 (kg/h)
 * @param {number} mfH2OTot - Débit massique H2O (kg/h)
 * @param {number} mfH2Tot - Débit massique H2 (kg/h)
 * @param {number} mfN2Tot - Débit massique N2 (kg/h)
 * @param {number} mfO2Tot - Débit massique O2 (kg/h)
 * @param {number} mfSO2Reel - Débit massique SO2 (kg/h)
 * @param {number} mfHClTot - Débit massique HCl (kg/h)
 * @param {number} hTarget - Enthalpie cible (J/kg ou unité appropriée)
 * @returns {number} Température de sortie (°C)
 */
 export function TempSortieFumees(mfCOTot, mfCO2Tot, mfH2OTot, mfH2Tot, mfN2Tot, mfO2Tot, mfSO2Reel, mfHClTot, hTarget) {
  
  let x = 100;
  let valeur = H_Fumees(mfCOTot, mfCO2Tot, mfH2OTot, mfH2Tot, mfN2Tot, mfO2Tot, mfSO2Reel, mfHClTot, x);
  const target = hTarget;
  
  // Phase 1 : Élargissement du bracketing
  let xamont = x;
  while (valeur < target) {
    xamont = x;
    x = x * 2;
    valeur = H_Fumees(mfCOTot, mfCO2Tot, mfH2OTot, mfH2Tot, mfN2Tot, mfO2Tot, mfSO2Reel, mfHClTot, x);
  }
  
  let xaval = x;
  
  // Phase 2 : Dichotomie binaire
  x = (xamont + xaval) / 2;
  valeur = H_Fumees(mfCOTot, mfCO2Tot, mfH2OTot, mfH2Tot, mfN2Tot, mfO2Tot, mfSO2Reel, mfHClTot, x);
  
  let nb = 0;
  const maxIterations = 10000;
  const tolerance = 0.1;
  
  while (Math.abs(valeur - target) > tolerance && nb < maxIterations) {
    nb++;
    
    if (valeur > target) {
      xaval = x;
    } else if (valeur < target) {
      xamont = x;
    }
    
    x = (xamont + xaval) / 2;
    valeur = H_Fumees(mfCOTot, mfCO2Tot, mfH2OTot, mfH2Tot, mfN2Tot, mfO2Tot, mfSO2Reel, mfHClTot, x);
  }
  
  return x;
}
 