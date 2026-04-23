import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { molarMasses, massVolumique } from '../../A_Transverse_fonction/constantes';

import { getTranslatedParameter, getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './FB_traduction';

// ✅ Hook personnalisé pour traductions dynamiques
const useTranslation = (currentLanguage = 'fr') => {
  return useMemo(() => {
    const languageCode = getLanguageCode(currentLanguage);
    return (key) => translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  }, [currentLanguage]);
};

import {
  cp_dt_h2o,
  fh_MS_kW,
  fh_MM_kW,
  Hfvoute_kW,
  Tair_fluide_FB,
  Masse_Air_Instrumentation,
  MasseAir,
  Vol_Air,
  Mole_Excess_O2,
  MoleNOx,
  cp_air,
  Masse_Air_Comb_gaz_Func,
} from '../../A_Transverse_fonction/bilan_fct_FB';

import {
  H2O_kg_m3,
  CO2_kg_m3,
  O2_kg_m3,
  N2_kg_m3,
  CO2_m3_kg,
  H2O_m3_kg,
  N2_m3_kg,
  O2_m3_kg,
} from '../../A_Transverse_fonction/conv_calculation';

import SchemaProcessus from './SchemaProcessus';

// ============================================================
// CONSTANTES
// ============================================================

const FUEL_PROPERTIES = {
  GAZ: {
    density: 0.75,
    pci: 10187,
    C_percent: 89.8,
    H_percent: 7.5,
    O_percent: 0.6,
    N_percent: 0.9,
    S_percent: 1.2,
    Cl_percent: 0,
  },
  BIOGAZ: {
    density: 1.15,
    pci: 5000,
    C_percent: 75,
    H_percent: 25,
    O_percent: 0,
    N_percent: 0,
    S_percent: 0,
    Cl_percent: 0,
  },
  FIOUL: {
    density: 850,
    pci: 10223,
    C_percent: 75,
    H_percent: 25,
    O_percent: 0,
    N_percent: 0,
    S_percent: 0,
    Cl_percent: 0,
  },
};

const DEFAULT_EMISSIONS = {
  type_energy: 'GAZ',
  densite_combustible: 0.75,
  PCI_combustible: 10187,
  Exces_air: 29.5,
  Teneur_en_eau_kgH2O_kgAS: 0.0728,
  SO2_recupere_cendre_pourcent: 20,
  Masse_volatile_kg_h: 0,
  Masse_brute_kg_h: 0,
  Masse_seche_kg_h: 0,
  Masse_mineral_kg_h: 0,
  PCI_boue_kcal_kgMV: 0,
  Masse_eau_kg_h: 0,
};

const DEFAULT_THERMAL = {
  Temp_boue_entree_C: 39,
  Temp_fumee_voute_C: 870,
  Temp_air_fluidisation_av_prechauffe_C: 15,
  Temp_air_secondaire_C: 10,
  Masse_air_secondaire_kg_h: 10,
  Masse_air_tertiaire_kg_h: 0,
  Temp_air_tertiaire_C: 0,
  Temp_air_balayage_instrumentation_C: 15,
  Tf_voute_ap_HX_C: 550,
  Pertes_thermiques_pourcent: 3,
  Rdt_HX: 0.85,
};

// ============================================================
// HELPERS LOCALSTORAGE
// ============================================================

const lsGet = (key, def) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : def;
  } catch {
    return def;
  }
};

const lsSet = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    console.warn(`Failed to save to localStorage: ${key}`);
  }
};

// ============================================================
// CALCUL ITÉRATIF — FONCTION PURE
// ============================================================

function runIterativeCalc({
  composition,
  sludgeC,
  sludgeH,
  sludgeO,
  sludgeN,
  sludgeS,
  sludgeCl,
  Exces_air,
  Teneur_en_eau_kgH2O_kgAS,
  Masse_volatile_kg_h,
  Masse_seche_kg_h,
  Masse_mineral_kg_h,
  PCI_boue_kcal_kgMV,
  Masse_eau_kg_h,
  SO2_recupere_cendre_pourcent,
  Temp_boue_entree_C,
  Temp_fumee_voute_C,
  Temp_air_fluidisation_av_prechauffe_C,
  Temp_air_secondaire_C,
  Temp_air_tertiaire_C,
  Pertes_thermiques_pourcent,
  Temp_air_balayage_instrumentation_C,
  Tf_voute_ap_HX_C,
  Rdt_HX,
  Masse_air_secondaire_kg_h,
  Masse_air_tertiaire_kg_h,
  MS_pourcent,
  MV_pourcent,
  BoueBrute_kg_h,
}) {
  const MAX_ITER = 20;
  const TOLERANCE = 0.1;

  let Masse_gaz_kg_h = 0;
  let r = {};

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const Mgaz = {
      C: (composition.C_percent / 100) * Masse_gaz_kg_h,
      H: (composition.H_percent / 100) * Masse_gaz_kg_h,
      O: (composition.O_percent / 100) * Masse_gaz_kg_h,
      N: (composition.N_percent / 100) * Masse_gaz_kg_h,
      S: (composition.S_percent / 100) * Masse_gaz_kg_h,
      Cl: (composition.Cl_percent / 100) * Masse_gaz_kg_h,
    };

    const Maire_sec_comb_gaz =
      Masse_Air_Comb_gaz_Func(
        Masse_gaz_kg_h,
        Exces_air,
        composition.C_percent,
        composition.H_percent,
        composition.S_percent,
        composition.O_percent
      ) || 0;

    const Mboue = {
      C: (sludgeC / 100) * Masse_volatile_kg_h,
      H: (sludgeH / 100) * Masse_volatile_kg_h,
      O: (sludgeO / 100) * Masse_volatile_kg_h,
      N: (sludgeN / 100) * Masse_volatile_kg_h,
      S: (sludgeS / 100) * Masse_volatile_kg_h,
      Cl: (sludgeCl / 100) * Masse_volatile_kg_h,
    };

    const Maire_balayage = Masse_Air_Instrumentation(Mboue.C, Mboue.H, Mboue.S, Mboue.O) || 0;
    const Vair_balayage = Maire_balayage / 1.293;
    const Maire_sec_comb_boue = MasseAir(Mboue.C, Mboue.H, Mboue.S, Mboue.O) || 0;
    const Vair_sec_comb_boue = Vol_Air(Mboue.C, Mboue.H, Mboue.S, Mboue.O) || 0;
    const Vair_sec_comb_gaz = Vol_Air(Mgaz.C, Mgaz.H, Mgaz.S, Mgaz.O) || 0;
    const Vair_sec_comb_tot = Vair_sec_comb_boue + Vair_sec_comb_gaz;

    const Mhum_comb_boue = Maire_sec_comb_boue * Teneur_en_eau_kgH2O_kgAS;
    const Mhum_comb_gaz = Maire_sec_comb_gaz * Teneur_en_eau_kgH2O_kgAS;
    const Mhum_comb_tot = Mhum_comb_boue + Mhum_comb_gaz;

    const Vvap_boue = Vair_sec_comb_boue * 1.293 * Teneur_en_eau_kgH2O_kgAS * (0.0224 / 0.018);
    const Vvap_gaz = Vair_sec_comb_gaz * 1.293 * Teneur_en_eau_kgH2O_kgAS * (0.0224 / 0.018);
    const Vvap_tot = Vvap_boue + Vvap_gaz;
    const Vair_comb_tot = Vair_sec_comb_tot + Vvap_tot;

    const Debit_eau =
      Masse_eau_kg_h +
      Maire_balayage * Teneur_en_eau_kgH2O_kgAS +
      Maire_sec_comb_boue * Teneur_en_eau_kgH2O_kgAS;

    const MB_C = (Mboue.C / 12.01) * 1000;
    const MB_H = ((Mboue.H / 1.008 + (2 * Debit_eau) / 18.015) * 1000);
    const MB_O =
      (Mboue.O / 16 +
        Debit_eau / 18.015 +
        ((Maire_sec_comb_boue / 4.310055 + Maire_balayage / 4.32) / 16)) *
      1000;
    const MB_N =
      ((Mboue.N + (Maire_sec_comb_boue * (1 - 1 / 4.310055) + Maire_balayage * (1 - 1 / 4.32)))) *
      1000 /
      14.007;
    const MB_S = (Mboue.S / 32.066) * 1000;
    const MB_Cl = (Mboue.Cl / 35.45) * 1000;

    const MG_C = (Mgaz.C / 12.01) * 1000;
    const MG_H = ((Mgaz.H / 1.008 + (2 * Mhum_comb_gaz) / 18.015) * 1000);
    const MG_O = ((Mgaz.O / 16 + Mhum_comb_gaz / 18.015 + Maire_sec_comb_gaz / 4.310055 / 16) * 1000);
    const MG_N = ((Mgaz.N + Maire_sec_comb_gaz * (1 - 1 / 4.310055)) * 1000) / 14.007;
    const MG_S = (Mgaz.S / 32.066) * 1000;
    const MG_Cl = (Mgaz.Cl / 35.45) * 1000;

    const MolesO2excGaz = ((Maire_sec_comb_gaz * (1 - 1 / (1 + Exces_air / 100))) * (1 / 4.310055) * 1000) / 32;

    const MF_C = MB_C + MG_C;
    const MF_H = MB_H + MG_H;
    const MF_O2 = MB_O + MG_O;
    const MF_N = MB_N + MG_N;
    const MF_SO2 = MB_S + MG_S;
    const MF_HCl = MB_Cl + MG_Cl;

    const MF_CO2 = (MF_C * Math.sqrt(Math.max(MF_O2, 0))) / (0.05 + Math.sqrt(Math.max(MF_O2, 0)));
    const MF_CO = MF_C - MF_CO2;

    const MolesO2excBoue = Mole_Excess_O2(Exces_air, Maire_sec_comb_boue, Maire_balayage) || 0;
    const MF_O2exc = MolesO2excGaz + MolesO2excBoue;

    const ParamB1 = MF_O2 - 2 * MF_C - 2 * MF_O2exc - 2 * MF_SO2;
    const MF_H2O = ParamB1 + MF_CO;

    const MF_NOX = MoleNOx(MS_pourcent, MV_pourcent, PCI_boue_kcal_kgMV, BoueBrute_kg_h) || 0;
    const MF_N2 = (MF_N - MF_NOX) / 2;

    const FG_SO2 = (MF_SO2 * molarMasses.SO2) / 1000;
    const FG_HCl = (MF_HCl * molarMasses.HCl) / 1000;
    const FG_CO2 = (MF_CO2 * molarMasses.CO2) / 1000;
    const FG_CO = (MF_CO * molarMasses.CO) / 1000;
    const FG_H2O = (MF_H2O * molarMasses.H2O) / 1000;
    const FG_O2exc = (MF_O2exc * molarMasses.O2) / 1000;
    const FG_NOX = (MF_NOX * molarMasses.NOx) / 1000;
    const FG_N2 = (MF_N2 * molarMasses.N2) / 1000;
    const FG_SO2reel = FG_SO2 * (1 - SO2_recupere_cendre_pourcent / 100);
    const FG_H2 = 0;

    const FGv_SO2 = FG_SO2 / massVolumique.SO2;
    const FGv_HCl = FG_HCl / massVolumique.HCl;
    const FGv_CO2 = FG_CO2 / massVolumique.CO2;
    const FGv_CO = FG_CO / massVolumique.CO;
    const FGv_H2O = FG_H2O / massVolumique.H2O;
    const FGv_O2exc = FG_O2exc / massVolumique.O2;
    const FGv_NOX = FG_NOX / massVolumique.NOX;
    const FGv_N2 = FG_N2 / massVolumique.N2;
    const FGv_SO2reel = FG_SO2reel / massVolumique.SO2;

    const FG_wet_Nm3 =
      FGv_HCl + FGv_CO2 + FGv_CO + FGv_H2O + FGv_O2exc + FGv_NOX + FGv_N2 + FGv_SO2reel;
    const FG_dry_Nm3 = FG_wet_Nm3 - FGv_H2O;
    const FG_wet_kg = FG_HCl + FG_CO2 + FG_CO + FG_H2O + FG_O2exc + FG_NOX + FG_N2 + FG_SO2reel;
    const FG_dry_kg = FG_wet_kg - FG_H2O;

    const Maire_sec_boue_tot = Maire_sec_comb_boue + Maire_balayage;
    const Maire_sec_comb_tot = Maire_sec_comb_gaz + Maire_sec_comb_boue;
    const Meau_air_comburant = 0.0728 * Maire_sec_comb_tot;

    const H_MV = (PCI_boue_kcal_kgMV * Masse_volatile_kg_h * 4.1868) / 3600;
    const H_MS = fh_MS_kW(Temp_boue_entree_C, Masse_seche_kg_h) || 0;
    const H_Evap = (Masse_eau_kg_h * (4.1868 * Temp_boue_entree_C - 2501.6)) / 3600;
    const H_MM = fh_MM_kW(Temp_fumee_voute_C, Masse_mineral_kg_h) || 0;
    const H_NET_BOUE = H_MV + H_MS + H_Evap;

    const H_air_flu =
      cp_air(Temp_air_fluidisation_av_prechauffe_C) * Maire_sec_comb_tot +
      cp_dt_h2o(Temp_air_fluidisation_av_prechauffe_C) * Meau_air_comburant;

    const Meau_air2 = 0.0728 * Masse_air_secondaire_kg_h;
    const H_air2 =
      cp_air(Temp_air_secondaire_C) * Masse_air_secondaire_kg_h +
      cp_dt_h2o(Temp_air_secondaire_C) * Meau_air2;

    const Meau_air3 = 0.0728 * Masse_air_tertiaire_kg_h;
    const H_air3 =
      cp_air(Temp_air_tertiaire_C) * Masse_air_tertiaire_kg_h +
      cp_dt_h2o(Temp_air_tertiaire_C) * Meau_air3;

    const Pertes =
      ((PCI_boue_kcal_kgMV * Masse_volatile_kg_h * (Pertes_thermiques_pourcent / 100)) / 3600) * 4.1868;

    const T_soufflante = Temp_air_fluidisation_av_prechauffe_C + 45;

    const Meau_balayage = 0.0728 * Maire_balayage;
    const H_balayage =
      cp_air(T_soufflante) * Maire_balayage + cp_dt_h2o(T_soufflante) * Meau_balayage;

    const Hf_voute = Hfvoute_kW(
      Temp_fumee_voute_C,
      FG_HCl,
      FG_CO2,
      FG_CO,
      FG_H2O,
      FG_H2,
      FG_O2exc,
      FG_N2,
      FG_SO2reel
    ) || 0;

    const Hf_voute_HX = Hfvoute_kW(
      Tf_voute_ap_HX_C,
      FG_HCl,
      FG_CO2,
      FG_CO,
      FG_H2O,
      FG_H2,
      FG_O2exc,
      FG_N2,
      FG_SO2reel
    ) || 0;

    const Tair_prech =
      Tair_fluide_FB(Hf_voute, Hf_voute_HX, 0, Rdt_HX, Maire_sec_comb_tot, Meau_air_comburant) || 0;
    const H_air_prech =
      cp_air(Tair_prech) * Maire_sec_comb_tot + cp_dt_h2o(Tair_prech) * (Maire_sec_comb_tot * 0.0728);

    const H_gaz_inter = (Masse_gaz_kg_h / 0.87) * 11.493;

    const H_in = H_NET_BOUE + H_air_prech + H_balayage + H_gaz_inter;
    const H_out = H_MM + Hf_voute + Pertes;
    const H_gaz = H_out - H_in;

    const Q_gaz_Nm3 = H_gaz / 11.493;
    const Q_gaz_kg = Q_gaz_Nm3 * 0.87;

    const Rho_FG_kg_Nm3 = Vvap_boue > 0 ? FG_wet_kg / FG_wet_Nm3 : 0;

    const isConverged = Math.abs(Q_gaz_kg) < TOLERANCE;
    const isLastIter = iter === MAX_ITER - 1;

    if (isConverged || isLastIter) {
      r = buildResult({
        Masse_gaz_kg_h,
        iter: iter + 1,
        converged: isConverged,
        Mgaz,
        Mboue,
        MB_C,
        MB_H,
        MB_O,
        MB_N,
        MB_S,
        MB_Cl,
        MG_C,
        MG_H,
        MG_O,
        MG_N,
        MG_S,
        MG_Cl,
        MolesO2excGaz,
        MolesO2excBoue,
        MF_O2exc,
        Maire_balayage,
        Vair_balayage,
        Maire_sec_comb_boue,
        Vair_sec_comb_boue,
        Mhum_comb_boue,
        Vvap_boue,
        Maire_sec_comb_gaz,
        Vair_sec_comb_gaz,
        Mhum_comb_gaz,
        Vvap_gaz,
        Maire_sec_comb_tot,
        Vair_sec_comb_tot,
        Mhum_comb_tot,
        Vvap_tot,
        Vair_comb_tot,
        Maire_sec_boue_tot,
        FG_SO2,
        FG_HCl,
        FG_CO2,
        FG_CO,
        FG_H2O,
        FG_O2exc,
        FG_NOX,
        FG_N2,
        FG_SO2reel,
        FGv_SO2,
        FGv_HCl,
        FGv_CO2,
        FGv_CO,
        FGv_H2O,
        FGv_O2exc,
        FGv_NOX,
        FGv_N2,
        FGv_SO2reel,
        FG_wet_Nm3,
        FG_dry_Nm3,
        FG_wet_kg,
        FG_dry_kg,
        H_MV,
        H_MS,
        H_Evap,
        H_MM,
        H_NET_BOUE,
        H_air_flu,
        H_air2,
        H_air3,
        Pertes,
        T_soufflante,
        Meau_balayage,
        H_balayage,
        Hf_voute,
        Hf_voute_HX,
        Tair_prech,
        H_air_prech,
        H_gaz_inter,
        H_gaz,
        H_in,
        H_out,
        Temp_fumee_voute_C,
        Tf_voute_ap_HX_C,
        Rho_FG_kg_Nm3,
      });
      break;
    }

    Masse_gaz_kg_h = Math.max(0, Masse_gaz_kg_h + Q_gaz_kg);
  }

  return r;
}

function buildResult({
  Masse_gaz_kg_h,
  iter,
  converged,
  Mgaz,
  Mboue,
  MB_C,
  MB_H,
  MB_O,
  MB_N,
  MB_S,
  MB_Cl,
  MG_C,
  MG_H,
  MG_O,
  MG_N,
  MG_S,
  MG_Cl,
  MolesO2excGaz,
  MolesO2excBoue,
  MF_O2exc,
  Maire_balayage,
  Vair_balayage,
  Maire_sec_comb_boue,
  Vair_sec_comb_boue,
  Mhum_comb_boue,
  Vvap_boue,
  Maire_sec_comb_gaz,
  Vair_sec_comb_gaz,
  Mhum_comb_gaz,
  Vvap_gaz,
  Maire_sec_comb_tot,
  Vair_sec_comb_tot,
  Mhum_comb_tot,
  Vvap_tot,
  Vair_comb_tot,
  Maire_sec_boue_tot,
  FG_SO2,
  FG_HCl,
  FG_CO2,
  FG_CO,
  FG_H2O,
  FG_O2exc,
  FG_NOX,
  FG_N2,
  FG_SO2reel,
  FGv_SO2,
  FGv_HCl,
  FGv_CO2,
  FGv_CO,
  FGv_H2O,
  FGv_O2exc,
  FGv_NOX,
  FGv_N2,
  FGv_SO2reel,
  FG_wet_Nm3,
  FG_dry_Nm3,
  FG_wet_kg,
  FG_dry_kg,
  H_MV,
  H_MS,
  H_Evap,
  H_MM,
  H_NET_BOUE,
  H_air_flu,
  H_air2,
  H_air3,
  Pertes,
  T_soufflante,
  Meau_balayage,
  H_balayage,
  Hf_voute,
  Hf_voute_HX,
  Tair_prech,
  H_air_prech,
  H_gaz_inter,
  H_gaz,
  H_in,
  H_out,
  Temp_fumee_voute_C,
  Tf_voute_ap_HX_C,
  Rho_FG_kg_Nm3,
}) {
  return {
    Q_gaz_kg_h: Masse_gaz_kg_h,
    Q_gaz_Nm3_h: Masse_gaz_kg_h / 0.87,
    Masse_gaz_kg_h,
    iteration: iter,
    converged,

    Temp_fumee_voute_C,
    Tf_voute_ap_HX_C,

    Volume_air_balayage_Nm3_h: Vair_balayage,
    Masse_air_balayage_kg_h: Maire_balayage,

    Masse_air_sec_combustion_boue_kg_h: Maire_sec_comb_boue,
    Volume_air_sec_combustion_boue_Nm3_h: Vair_sec_comb_boue,
    Masse_humidite_air_combustion_boue_kg_h: Mhum_comb_boue,
    VolumeVapeurEauAirCombustionBoue_Nm3_h: Vvap_boue,

    Masse_air_sec_combustion_gaz_kg_h: Maire_sec_comb_gaz,
    Volume_air_sec_combustion_gaz_Nm3_h: Vair_sec_comb_gaz,
    Masse_humidite_air_combustion_gaz_kg_h: Mhum_comb_gaz,
    VolumeVapeurEauAirCombustionGaz_Nm3_h: Vvap_gaz,

    Masse_air_sec_combustion_tot_kg_h: Maire_sec_comb_tot,
    Volume_air_sec_combustion_tot_Nm3_h: Vair_sec_comb_tot,
    Masse_humidite_air_combustion_total_kg_h: Mhum_comb_tot,
    VolumeVapeurEauAirCombustionTot_Nm3_h: Vvap_tot,
    VolumeAirCombustionTot_Nm3_h: Vair_comb_tot,
    Masse_air_sec_boue_total_kg_h: Maire_sec_boue_tot,

    MolesBoues_C: MB_C,
    MolesBoues_H: MB_H,
    MolesBoues_O: MB_O,
    MolesBoues_N: MB_N,
    MolesBoues_S: MB_S,
    MolesBoues_Cl: MB_Cl,
    MolesO2excesBoue: MolesO2excBoue,
    MolesGaz_C: MG_C,
    MolesGaz_H: MG_H,
    MolesGaz_O: MG_O,
    MolesGaz_N: MG_N,
    MolesGaz_S: MG_S,
    MolesGaz_Cl: MG_Cl,
    MolesO2excesGaz: MolesO2excGaz,
    Moles_Fumees_O2exces: MF_O2exc,

    FG_kg_h_SO2: FG_SO2,
    FG_kg_h_HCl: FG_HCl,
    FG_kg_h_CO2: FG_CO2,
    FG_kg_h_CO: FG_CO,
    FG_kg_h_H2O: FG_H2O,
    FG_kg_h_O2exces: FG_O2exc,
    FG_kg_h_NOX: FG_NOX,
    FG_kg_h_N2: FG_N2,
    FG_kg_h_SO2reel: FG_SO2reel,
    FG_wet_kg_h: FG_wet_kg,
    FG_dry_kg_h: FG_dry_kg,

    FG_Nm3_h_SO2: FGv_SO2,
    FG_Nm3_h_HCl: FGv_HCl,
    FG_Nm3_h_CO2: FGv_CO2,
    FG_Nm3_h_CO: FGv_CO,
    FG_Nm3_h_H2O: FGv_H2O,
    FG_Nm3_h_O2exces: FGv_O2exc,
    FG_Nm3_h_NOX: FGv_NOX,
    FG_Nm3_h_N2: FGv_N2,
    FG_Nm3_h_SO2reel: FGv_SO2reel,
    FG_wet_Nm3_h: FG_wet_Nm3,
    FG_dry_Nm3_h: FG_dry_Nm3,

    Masses_boues_composition_kg_h: Mboue,
    Masses_gaz_composition_kg_h: Mgaz,

    H_MV_boue_entree_kW: H_MV,
    H_MS_boue_entree_kW: H_MS,
    H_Evap_boue_entree_kW: H_Evap,
    H_matiere_minerale_kW: H_MM,
    H_NETTE_BOUE_kW: H_NET_BOUE,
    H_air_fluidisation_av_prechauffe_kW: H_air_flu,
    H_air_secondaire_kW: H_air2,
    H_air_tertiaire_kW: H_air3,
    Pertes_thermiques_kW: Pertes,
    Temp_air_soufflante_C: T_soufflante,
    Masse_eau_air_balayage_kg_h: Meau_balayage,
    H_air_balayage_instrumentation_kW: H_balayage,
    Hf_voute_kW: Hf_voute,
    Hf_voute_ap_HX_kW: Hf_voute_HX,
    Tair_ap_prechauffe_C: Tair_prech,
    Hair_ap_prechauffage_kW: H_air_prech,

    H_gaz_inter,
    H_gaz,
    H_in,
    H_out,

    Rho_FG_kg_Nm3,
  };
}

// ============================================================
// COMPOSANT PRINCIPAL
// ============================================================

const CombustionTab = ({ innerData = {}, onInnerDataChange, onResultsChange, currentLanguage = 'fr' }) => {
  // ✅ Utiliser le hook pour traductions dynamiques
  const t = useTranslation(currentLanguage);

  const [emissions, setEmissions] = useState(() => lsGet('emissions', DEFAULT_EMISSIONS));
  const [thermalParams, setThermalParams] = useState(() => lsGet('thermalParams', DEFAULT_THERMAL));

  useEffect(() => {
    lsSet('emissions', emissions);
  }, [emissions]);

  useEffect(() => {
    lsSet('thermalParams', thermalParams);
  }, [thermalParams]);

  // ---- Sync boue depuis innerData ----
  useEffect(() => {
    setEmissions((prev) => {
      const map = {
        Masse_volatile_kg_h: innerData.MV_kg_h,
        Masse_brute_kg_h: innerData.BoueBrute_kg_h,
        Masse_seche_kg_h: innerData.MS_kg_h,
        Masse_mineral_kg_h: innerData.MM_kg_h,
        PCI_boue_kcal_kgMV: innerData.PCIKCALKGMV,
        Masse_eau_kg_h: innerData.EauExtraite_kg_h,
      };
      let changed = false;
      const next = { ...prev };
      Object.entries(map).forEach(([k, v]) => {
        if (v !== undefined && v !== prev[k]) {
          next[k] = v;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [
    innerData.MV_kg_h,
    innerData.BoueBrute_kg_h,
    innerData.MS_kg_h,
    innerData.MM_kg_h,
    innerData.PCIKCALKGMV,
    innerData.EauExtraite_kg_h,
  ]);

  const composition = useMemo(
    () => FUEL_PROPERTIES[emissions.type_energy] || FUEL_PROPERTIES.GAZ,
    [emissions.type_energy]
  );

  const results = useMemo(() => {
    try {
      return runIterativeCalc({
        composition,
        sludgeC: innerData.C_percent || 0,
        sludgeH: innerData.H_percent || 0,
        sludgeO: innerData.O_percent || 0,
        sludgeN: innerData.N_percent || 0,
        sludgeS: innerData.S_percent || 0,
        sludgeCl: innerData.Cl_percent || 0,
        Exces_air: emissions.Exces_air || 0,
        Teneur_en_eau_kgH2O_kgAS: emissions.Teneur_en_eau_kgH2O_kgAS || 0,
        Masse_volatile_kg_h: emissions.Masse_volatile_kg_h || 0,
        Masse_seche_kg_h: emissions.Masse_seche_kg_h || 0,
        Masse_mineral_kg_h: emissions.Masse_mineral_kg_h || 0,
        PCI_boue_kcal_kgMV: emissions.PCI_boue_kcal_kgMV || 0,
        Masse_eau_kg_h: emissions.Masse_eau_kg_h || 0,
        SO2_recupere_cendre_pourcent: emissions.SO2_recupere_cendre_pourcent || 0,
        Temp_fumee_voute_C: thermalParams.Temp_fumee_voute_C,
        Temp_boue_entree_C: thermalParams.Temp_boue_entree_C,
        Temp_air_fluidisation_av_prechauffe_C: thermalParams.Temp_air_fluidisation_av_prechauffe_C,
        Temp_air_secondaire_C: thermalParams.Temp_air_secondaire_C,
        Temp_air_tertiaire_C: thermalParams.Temp_air_tertiaire_C,
        Pertes_thermiques_pourcent: thermalParams.Pertes_thermiques_pourcent,
        Temp_air_balayage_instrumentation_C: thermalParams.Temp_air_balayage_instrumentation_C,
        Tf_voute_ap_HX_C: thermalParams.Tf_voute_ap_HX_C,
        Rdt_HX: thermalParams.Rdt_HX,
        Masse_air_secondaire_kg_h: thermalParams.Masse_air_secondaire_kg_h,
        Masse_air_tertiaire_kg_h: thermalParams.Masse_air_tertiaire_kg_h,
        MS_pourcent: innerData.MS_pourcent || 0,
        MV_pourcent: innerData.MV_pourcent || 0,
        BoueBrute_kg_h: innerData.BoueBrute_kg_h || 0,
      });
    } catch (err) {
      console.error('Erreur calcul combustion:', err);
      return {};
    }
  }, [
    emissions,
    thermalParams,
    composition,
    innerData.C_percent,
    innerData.H_percent,
    innerData.O_percent,
    innerData.N_percent,
    innerData.S_percent,
    innerData.Cl_percent,
    innerData.MS_pourcent,
    innerData.MV_pourcent,
    innerData.BoueBrute_kg_h,
  ]);

  // ---- Mise à jour innerData + notification au parent ----
  useEffect(() => {
    innerData.FG_wet_Nm3_h = results.FG_wet_Nm3_h || 0;
    innerData.FG_dry_Nm3_h = results.FG_dry_Nm3_h || 0;
    innerData.Volume_air_balayage = results.Volume_air_balayage_Nm3_h || 0;
    innerData.Hf_voute_kW = results.Hf_voute_kW || 0;
    innerData.Q_gaz_kg_h = results.Q_gaz_kg_h || 0;
    innerData.Q_gaz_Nm3_h = results.Q_gaz_Nm3_h || 0;
    innerData.Tair_ap_prechauffe_C = results.Tair_ap_prechauffe_C || 0;
    innerData.Temp_air_fluidisation_av_prechauffe_C =
      thermalParams.Temp_air_fluidisation_av_prechauffe_C || 0;
    innerData.Exces_air = emissions.Exces_air || 0;
    innerData.Temp_fumee_voute_C = thermalParams.Temp_fumee_voute_C || 870;
    innerData.Tf_voute_ap_HX_C = thermalParams.Tf_voute_ap_HX_C || 550;
    innerData.Rdt_HX = thermalParams.Rdt_HX * 100 || 85;
    innerData.Temp_air_soufflante_C = results.Temp_air_soufflante_C || 60;
    innerData.Q_air_comb_tot_Nm3_h = results.VolumeAirCombustionTot_Nm3_h || 0;
    innerData.Rho_FG_kg_Nm3 = results.Rho_FG_kg_Nm3 || 0;
    innerData.Masse_air_sec_combustion_tot_kg_h = results.Masse_air_sec_combustion_tot_kg_h || 0;

    // Fractions massiques fumées
    innerData.m_co = results.FG_kg_h_CO || 0;
    innerData.m_co2 = results.FG_kg_h_CO2 || 0;
    innerData.m_h2o = results.FG_kg_h_H2O || 0;
    innerData.m_h2 = 0;
    innerData.m_n2 = results.FG_kg_h_N2 || 0;
    innerData.m_o2 = results.FG_kg_h_O2exces || 0;
    innerData.m_so2 = results.FG_kg_h_SO2reel || 0;
    innerData.m_chcl = results.FG_kg_h_HCl || 0;

    // ✅ STRUCTURE COHÉRENTE POUR POLLUTANT
    const masses_FG_out = {
      CO2: results.FG_kg_h_CO2 + results.FG_kg_h_CO,
      O2: results.FG_kg_h_O2exces,
      H2O: results.FG_kg_h_H2O,
      N2: results.FG_kg_h_N2,
      dry: results.FG_kg_h_CO2 + results.FG_kg_h_CO + results.FG_kg_h_O2exces + results.FG_kg_h_N2,
      wet:
        results.FG_kg_h_CO2 +
        results.FG_kg_h_CO +
        results.FG_kg_h_O2exces +
        results.FG_kg_h_N2 +
        results.FG_kg_h_H2O,
    };

    const masses_pollutant_FG_out = {
      NOx: results.FG_kg_h_NOX,
      HCl: results.FG_kg_h_HCl,
      SO2: results.FG_kg_h_SO2reel,
      N2: results.FG_kg_h_N2,
      CO2: results.FG_kg_h_CO2 + results.FG_kg_h_CO,
    };

    const FG_CO2_Nm3_h = CO2_kg_m3(masses_FG_out.CO2);
    const FG_H2O_Nm3_h = H2O_kg_m3(masses_FG_out.H2O);
    const FG_O2_Nm3_h = O2_kg_m3(masses_FG_out.O2);
    const FG_N2_Nm3_h = N2_kg_m3(masses_FG_out.N2);

    const FG_dry_Nm3_h = FG_CO2_Nm3_h + FG_N2_Nm3_h + FG_O2_Nm3_h;
    const FG_wet_Nm3_h = FG_dry_Nm3_h + FG_H2O_Nm3_h;
    const O2_sec_pourcent = FG_dry_Nm3_h > 0 ? FG_O2_Nm3_h / FG_dry_Nm3_h : 0;

    const volume_FG_out = {
      CO2: FG_CO2_Nm3_h,
      O2: FG_O2_Nm3_h,
      H2O: FG_H2O_Nm3_h,
      N2: FG_N2_Nm3_h,
      dry: FG_dry_Nm3_h,
      wet: FG_wet_Nm3_h,
    };

    innerData['FG_OUT_kg_h'] = masses_FG_out;
    innerData['FG_OUT_Nm3_h'] = volume_FG_out;
    innerData['FG_pollutant_OUT_kg_h'] = masses_pollutant_FG_out;
    innerData['O2_calcule'] = O2_sec_pourcent;

    onInnerDataChange?.();

    onResultsChange?.({
      m_co: results.FG_kg_h_CO || 0,
      m_co2: results.FG_kg_h_CO2 || 0,
      m_h2o: results.FG_kg_h_H2O || 0,
      m_h2: 0,
      m_n2: results.FG_kg_h_N2 || 0,
      m_o2: results.FG_kg_h_O2exces || 0,
      m_so2: results.FG_kg_h_SO2reel || 0,
      m_chcl: results.FG_kg_h_HCl || 0,
      Temp_fumee_voute_C: thermalParams.Temp_fumee_voute_C || 870,
      FG_wet_Nm3_h: results.FG_wet_Nm3_h || 0,
      FG_dry_Nm3_h: results.FG_dry_Nm3_h || 0,
      Hf_voute_kW: results.Hf_voute_kW || 0,
      Rho_FG_kg_Nm3: results.Rho_FG_kg_Nm3 || 0,
      Temp_air_fluidisation_av_prechauffe_C: thermalParams.Temp_air_fluidisation_av_prechauffe_C || 15,
      Q_air_comb_tot_Nm3_h: results.VolumeAirCombustionTot_Nm3_h || 0,
      Masse_air_sec_combustion_tot_kg_h: results.Masse_air_sec_combustion_tot_kg_h || 0,
      Rdt_HX: thermalParams.Rdt_HX || 0.85,
      Tair_ap_prechauffe_C: results.Tair_ap_prechauffe_C || 0,
    });
  }, [results, emissions, innerData, thermalParams, onInnerDataChange, onResultsChange]);

  const handleFuelChange = useCallback((fuelType) => {
    const p = FUEL_PROPERTIES[fuelType];
    setEmissions((prev) => ({
      ...prev,
      type_energy: fuelType,
      densite_combustible: p.density,
      PCI_combustible: p.pci,
    }));
  }, []);

  const handleEmission = useCallback((key, value) => {
    setEmissions((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  }, []);

  const handleThermal = useCallback((key, value) => {
    setThermalParams((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  }, []);

  // ---- Styles ----
  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    fontSize: '14px',
    color: '#333',
  };

  const card = { padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px', marginBottom: '20px' };
  const cardTitle = { fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#222' };
  const secTitle = {
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '20px',
    marginBottom: '15px',
    color: '#444',
    borderBottom: '2px solid #ddd',
    paddingBottom: '10px',
  };

  const TH = {
    border: '1px solid #999',
    padding: '8px',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '11px',
    backgroundColor: '#D4B5A0',
  };

  const TD = { border: '1px solid #CCC', padding: '6px', textAlign: 'center', fontSize: '11px' };
  const resultBox = {
    ...inputStyle,
    backgroundColor: '#e8f5e9',
    padding: '12px',
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#2e7d32',
  };

  const sludgeComp = {
    C: innerData.C_percent || 0,
    H: innerData.H_percent || 0,
    O: innerData.O_percent || 0,
    N: innerData.N_percent || 0,
    S: innerData.S_percent || 0,
    Cl: innerData.Cl_percent || 0,
  };

  const residuConvergence = results.H_gaz ?? null;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* ── COMBUSTIBLE ── */}
      <div style={card}>
        <div style={cardTitle}>🔥 {t('Paramètres de Combustion') || 'Paramètres de Combustion'}</div>
        <div style={secTitle}>{t('Type de combustible') || 'Type de combustible'}</div>
        <div style={{ marginBottom: '25px' }}>
          <label style={labelStyle}>{t('Sélectionner le combustible') || 'Sélectionner le combustible'}</label>
          <select
            value={emissions.type_energy}
            onChange={(e) => handleFuelChange(e.target.value)}
            style={inputStyle}
          >
            <option value="GAZ">Gaz naturel</option>
            <option value="BIOGAZ">Biogaz</option>
            <option value="FIOUL">Fioul</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          <div>
            <label style={labelStyle}>
              {t('Densité') || 'Densité'} (kg/m³)
            </label>
            <input
              type="number"
              step="0.01"
              value={emissions.densite_combustible}
              onChange={(e) => handleEmission('densite_combustible', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              {t('PCI') || 'PCI'} (kcal/kg)
            </label>
            <input
              type="number"
              step="1"
              value={emissions.PCI_combustible}
              onChange={(e) => handleEmission('PCI_combustible', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── BOUE ── */}
      <div style={card}>
        <div style={secTitle}>
          📊 {t('Paramètres des Boues') || 'Paramètres des Boues'} (
          {t('synchronisés depuis l\'onglet 1') || 'synchronisés depuis l\'onglet 1'})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {[
            { label: t('Masse brute') || 'Masse brute', key: 'Masse_brute_kg_h', unit: '(kg/h)' },
            { label: t('Masse sèche') || 'Masse sèche', key: 'Masse_seche_kg_h', unit: '(kg/h)' },
            { label: t('Masse volatile') || 'Masse volatile', key: 'Masse_volatile_kg_h', unit: '(kg/h)' },
            { label: t('Masse eau') || 'Masse eau', key: 'Masse_eau_kg_h', unit: '(kg/h)' },
            { label: t('PCI boue') || 'PCI boue', key: 'PCI_boue_kcal_kgMV', unit: '(kcal/kg MV)' },
            { label: t('SO₂ récupéré') || 'SO₂ récupéré', key: 'SO2_recupere_cendre_pourcent', unit: '(%)' },
          ].map(({ label, key, unit }) => (
            <div key={key}>
              <label style={labelStyle}>
                {label} {unit}
              </label>
              <input
                type="number"
                step="0.1"
                value={emissions[key] ?? 0}
                onChange={(e) => handleEmission(key, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── PARAMÈTRES COMBUSTION ── */}
      <div style={card}>
        <div style={secTitle}>💨 {t('Paramètres de Combustion') || 'Paramètres de Combustion'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '15px' }}>
          <div>
            <label style={labelStyle}>{t('Excès d\'air') || 'Excès d\'air'} (%)</label>
            <input
              type="number"
              step="0.1"
              value={emissions.Exces_air}
              onChange={(e) => handleEmission('Exces_air', e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>
              {t('Teneur en eau') || 'Teneur en eau'} (kg H₂O/kg AS)
            </label>
            <input
              type="number"
              step="0.0001"
              value={emissions.Teneur_en_eau_kgH2O_kgAS}
              onChange={(e) => handleEmission('Teneur_en_eau_kgH2O_kgAS', e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* ── RÉSULTATS CONVERGENCE ── */}
      <div style={card}>
        <div style={cardTitle}>
          📈 {t('Résultats de Convergence') || 'Résultats de Convergence'}
          {results.converged === false && (
            <span style={{ marginLeft: '10px', color: '#ef4444', fontSize: '14px' }}>
              ⚠ {t('Non convergé') || 'Non convergé'} {t('en') || 'en'} {results.iteration}{' '}
              {t('itérations') || 'itérations'}
            </span>
          )}
          {results.converged === true && (
            <span style={{ marginLeft: '10px', color: '#10b981', fontSize: '14px' }}>
              ✓ {t('Convergé') || 'Convergé'} {t('en') || 'en'} {results.iteration}{' '}
              {t('itérations') || 'itérations'}
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          {[
            { label: 'Q_gaz (kg/h)', val: results.Q_gaz_kg_h },
            { label: 'Q_gaz (Nm³/h)', val: results.Q_gaz_Nm3_h },
            { label: 'H_in (kW)', val: results.H_in },
            { label: 'H_out (kW)', val: results.H_out },
          ].map(({ label, val }) => (
            <div key={label}>
              <label style={labelStyle}>{label}</label>
              <div style={resultBox}>{val?.toFixed(2) ?? '-'}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginTop: '15px' }}>
          <div>
            <label style={labelStyle}>Rho_FG (kg/Nm³)</label>
            <div style={{ ...resultBox, backgroundColor: '#e3f2fd', color: '#1565c0' }}>
              {results.Rho_FG_kg_Nm3?.toFixed(4) ?? '-'}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABLEAU AIR DE COMBUSTION ── */}
      <div style={card}>
        <div style={cardTitle}>🌬️ {t('Air de Combustion') || 'Air de Combustion'}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr>
                {[
                  'Paramètre',
                  'C',
                  'H',
                  'O',
                  'N',
                  'S',
                  'Cl',
                  'O₂ Exc (mol)',
                  'Air sec (kg/h)',
                  'Vol air sec (Nm³/h)',
                  'Humidité (kg/h)',
                  'Vap eau (Nm³/h)',
                  'V comb tot (Nm³/h)',
                ].map((h) => (
                  <th key={h} style={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#FFFFCC' }}>
                <td style={TD}>
                  <b>{t('Boue') || 'Boue'}</b>
                </td>
                {['C', 'H', 'O', 'N', 'S', 'Cl'].map((el) => (
                  <td key={el} style={TD}>
                    {sludgeComp[el]?.toFixed(1) ?? '-'}
                  </td>
                ))}
                <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
              </tr>
              <tr style={{ backgroundColor: '#FFFFCC' }}>
                <td style={TD}>
                  <b>{emissions.type_energy}</b>
                </td>
                {['C_percent', 'H_percent', 'O_percent', 'N_percent', 'S_percent', 'Cl_percent'].map((k) => (
                  <td key={k} style={TD}>
                    {composition[k]?.toFixed(1) ?? '-'}
                  </td>
                ))}
                <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
              </tr>
              <tr style={{ backgroundColor: '#FFF9E6' }}>
                <td style={TD}>
                  <b>{t('Moles Boue') || 'Moles Boue'}</b>
                </td>
                {[
                  results.MolesBoues_C,
                  results.MolesBoues_H,
                  results.MolesBoues_O,
                  results.MolesBoues_N,
                  results.MolesBoues_S,
                  results.MolesBoues_Cl,
                ].map((v, i) => (
                  <td key={i} style={TD}>
                    {v?.toFixed(2) ?? '-'}
                  </td>
                ))}
                <td style={TD}>{results.MolesO2excesBoue?.toFixed(2) ?? '-'}</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
              </tr>
              <tr style={{ backgroundColor: '#F0F8FF' }}>
                <td style={TD}>
                  <b>{t('Moles Gaz') || 'Moles Gaz'}</b>
                </td>
                {[
                  results.MolesGaz_C,
                  results.MolesGaz_H,
                  results.MolesGaz_O,
                  results.MolesGaz_N,
                  results.MolesGaz_S,
                  results.MolesGaz_Cl,
                ].map((v, i) => (
                  <td key={i} style={TD}>
                    {v?.toFixed(2) ?? '-'}
                  </td>
                ))}
                <td style={TD}>{results.MolesO2excesGaz?.toFixed(2) ?? '-'}</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>-</td>
              </tr>
              <tr style={{ backgroundColor: '#FFE6CC' }}>
                <td style={TD}>
                  <b>{t('Masse comp. boue') || 'Masse comp. boue'}</b>
                </td>
                {['C', 'H', 'O', 'N', 'S', 'Cl'].map((el) => (
                  <td key={el} style={TD}>
                    {results.Masses_boues_composition_kg_h?.[el]?.toFixed(2) ?? '-'}
                  </td>
                ))}
                <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>-</td>
                <td style={TD}>{results.Masse_air_sec_combustion_boue_kg_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.Volume_air_sec_combustion_boue_Nm3_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.Masse_humidite_air_combustion_boue_kg_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.VolumeVapeurEauAirCombustionBoue_Nm3_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>-</td>
              </tr>
              <tr style={{ backgroundColor: '#E6F3FF' }}>
                <td style={TD}>
                  <b>{t('Masse comp. gaz') || 'Masse comp. gaz'}</b>
                </td>
                {['C', 'H', 'O', 'N', 'S', 'Cl'].map((el) => (
                  <td key={el} style={TD}>
                    {results.Masses_gaz_composition_kg_h?.[el]?.toFixed(2) ?? '-'}
                  </td>
                ))}
                <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>-</td>
                <td style={TD}>{results.Masse_air_sec_combustion_gaz_kg_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.Volume_air_sec_combustion_gaz_Nm3_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.Masse_humidite_air_combustion_gaz_kg_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.VolumeVapeurEauAirCombustionGaz_Nm3_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>-</td>
              </tr>
              <tr style={{ backgroundColor: '#E8F4F8', fontWeight: 'bold' }}>
                <td style={TD}>
                  <b>{t('Total') || 'Total'}</b>
                </td>
                {['-', '-', '-', '-', '-', '-'].map((v, i) => (
                  <td key={i} style={TD}>
                    {v}
                  </td>
                ))}
                <td style={{ ...TD, backgroundColor: '#FFB6C1' }}>
                  {results.Moles_Fumees_O2exces?.toFixed(2) ?? '-'}
                </td>
                <td style={TD}>{results.Masse_air_sec_combustion_tot_kg_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.Volume_air_sec_combustion_tot_Nm3_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.Masse_humidite_air_combustion_total_kg_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.VolumeVapeurEauAirCombustionTot_Nm3_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.VolumeAirCombustionTot_Nm3_h?.toFixed(2) ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABLEAU FUMÉES ── */}
      <div style={card}>
        <div style={cardTitle}>💨 {t('Fumées') || 'Fumées'}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: '#D4B5A0' }}>
                {[
                  'Fumées',
                  'SO₂',
                  'HCl',
                  'CO₂',
                  'CO',
                  'H₂O',
                  'O₂ exc',
                  'NOx',
                  'N₂',
                  'SO₂ réel',
                  'M sèche',
                  'M humide',
                  'V sec',
                  'V humide',
                ].map((h) => (
                  <th key={h} style={TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ backgroundColor: '#FFFFCC' }}>
                <td style={{ ...TD, fontWeight: 'bold' }}>kg/h</td>
                {[
                  results.FG_kg_h_SO2,
                  results.FG_kg_h_HCl,
                  results.FG_kg_h_CO2,
                  results.FG_kg_h_CO,
                  results.FG_kg_h_H2O,
                  results.FG_kg_h_O2exces,
                  results.FG_kg_h_NOX,
                  results.FG_kg_h_N2,
                  results.FG_kg_h_SO2reel,
                  results.FG_dry_kg_h,
                  results.FG_wet_kg_h,
                ].map((v, i) => (
                  <td key={i} style={TD}>
                    {v?.toFixed(2) ?? '-'}
                  </td>
                ))}
                <td style={TD}>-</td>
                <td style={TD}>-</td>
              </tr>
              <tr style={{ backgroundColor: '#FFFFCC' }}>
                <td style={{ ...TD, fontWeight: 'bold' }}>Nm³/h</td>
                {[
                  results.FG_Nm3_h_SO2,
                  results.FG_Nm3_h_HCl,
                  results.FG_Nm3_h_CO2,
                  results.FG_Nm3_h_CO,
                  results.FG_Nm3_h_H2O,
                  results.FG_Nm3_h_O2exces,
                  results.FG_Nm3_h_NOX,
                  results.FG_Nm3_h_N2,
                  results.FG_Nm3_h_SO2reel,
                ].map((v, i) => (
                  <td key={i} style={TD}>
                    {v?.toFixed(2) ?? '-'}
                  </td>
                ))}
                <td style={TD}>-</td>
                <td style={TD}>-</td>
                <td style={TD}>{results.FG_dry_Nm3_h?.toFixed(2) ?? '-'}</td>
                <td style={TD}>{results.FG_wet_Nm3_h?.toFixed(2) ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SCHÉMA ── */}
      <SchemaProcessus data={{ ...emissions, ...thermalParams, ...results }} />

      {/* ── PARAMÈTRES THERMIQUES ── */}
      <div style={card}>
        <div style={cardTitle}>🌡️ {t('Paramètres Thermiques') || 'Paramètres Thermiques'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          {[
            {
              label: t('Temp. boue entrée') || 'Temp. boue entrée',
              key: 'Temp_boue_entree_C',
            },
            {
              label: t('Temp. fumée voûte / Freeboard') || 'Temp. fumée voûte / Freeboard',
              key: 'Temp_fumee_voute_C',
            },
            {
              label: t('Temp. air fluidisation av. préch.') || 'Temp. air fluidisation av. préch.',
              key: 'Temp_air_fluidisation_av_prechauffe_C',
            },
            {
              label: t('Temp. air secondaire') || 'Temp. air secondaire',
              key: 'Temp_air_secondaire_C',
            },
            {
              label: t('Masse air secondaire') || 'Masse air secondaire',
              key: 'Masse_air_secondaire_kg_h',
            },
            {
              label: t('Temp. air tertiaire') || 'Temp. air tertiaire',
              key: 'Temp_air_tertiaire_C',
            },
            {
              label: t('Masse air tertiaire') || 'Masse air tertiaire',
              key: 'Masse_air_tertiaire_kg_h',
            },
            {
              label: t('Temp. air balayage') || 'Temp. air balayage',
              key: 'Temp_air_balayage_instrumentation_C',
            },
            {
              label: t('Pertes thermiques') || 'Pertes thermiques',
              key: 'Pertes_thermiques_pourcent',
            },
            {
              label: t('Temp. fumée après HX') || 'Temp. fumée après HX',
              key: 'Tf_voute_ap_HX_C',
            },
            { label: t('Rendement HX') || 'Rendement HX', key: 'Rdt_HX', step: '0.01' },
          ].map(({ label, key, step = '0.1' }) => (
            <div key={key}>
              <label style={labelStyle}>{label}</label>
              <input
                type="number"
                step={step}
                value={thermalParams[key] ?? 0}
                onChange={(e) => handleThermal(key, e.target.value)}
                style={inputStyle}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── BILAN ÉNERGÉTIQUE ── */}
      <div style={card}>
        <div style={cardTitle}>⚡ {t('Bilan Énergétique') || 'Bilan Énergétique'} (kW)</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#D4B5A0' }}>
                <th style={{ ...TH, width: '40%' }}>Paramètre</th>
                <th style={{ ...TH, backgroundColor: '#FFE6CC' }}>
                  {t('Entrée') || 'Entrée'} (kW)
                </th>
                <th style={{ ...TH, backgroundColor: '#E6F3FF' }}>
                  {t('Sortie') || 'Sortie'} (kW)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'H_NETTE_BOUE', in: results.H_NETTE_BOUE_kW, out: null },
                { label: 'Hair_ap_préchauffage', in: results.Hair_ap_prechauffage_kW, out: null },
                { label: 'H_air_balayage', in: results.H_air_balayage_instrumentation_kW, out: null },
                { label: 'H_gaz appoint (combustible)', in: results.H_gaz_inter ?? null, out: null },
                { label: 'H_matière_minérale', in: null, out: results.H_matiere_minerale_kW },
                { label: 'Hf_voûte', in: null, out: results.Hf_voute_kW },
                { label: 'Pertes thermiques', in: null, out: results.Pertes_thermiques_kW },
              ].map(({ label, in: vin, out: vout }) => (
                <tr key={label}>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{label}</td>
                  <td style={{ ...TD, backgroundColor: '#FFE6CC' }}>
                    {vin != null ? vin.toFixed(2) : '-'}
                  </td>
                  <td style={{ ...TD, backgroundColor: '#E6F3FF' }}>
                    {vout != null ? vout.toFixed(2) : '-'}
                  </td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ ...TD, backgroundColor: '#B0D0E8' }}>
                  {t('TOTAL ENTRÉE') || 'TOTAL ENTRÉE'} (H_in)
                </td>
                <td style={{ ...TD, backgroundColor: '#ADD8E6' }}>{results.H_in?.toFixed(2) ?? '-'}</td>
                <td style={{ ...TD, backgroundColor: '#B0D0E8' }}>-</td>
              </tr>
              <tr style={{ fontWeight: 'bold' }}>
                <td style={{ ...TD, backgroundColor: '#B0D0E8' }}>
                  {t('TOTAL SORTIE') || 'TOTAL SORTIE'} (H_out)
                </td>
                <td style={{ ...TD, backgroundColor: '#B0D0E8' }}>-</td>
                <td style={{ ...TD, backgroundColor: '#ADD8E6' }}>{results.H_out?.toFixed(2) ?? '-'}</td>
              </tr>
              <tr style={{ opacity: 0.75 }}>
                <td
                  style={{
                    ...TD,
                    fontStyle: 'italic',
                    backgroundColor: '#f8f8f8',
                  }}
                >
                  {t('Résidu') || 'Résidu'} (H_out − H_in) — {t('doit être') || 'doit être'} ≈ 0
                </td>
                <td style={{ ...TD, backgroundColor: '#f8f8f8' }}>-</td>
                <td
                  style={{
                    ...TD,
                    backgroundColor: '#f8f8f8',
                    fontStyle: 'italic',
                    color:
                      residuConvergence != null && Math.abs(residuConvergence) < 1 ? '#16a34a' : '#dc2626',
                  }}
                >
                  {residuConvergence?.toFixed(4) ?? '-'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── AIR PRÉCHAUFFÉ RÉSULTATS ── */}
      <div style={card}>
        <div style={cardTitle}>🌡️ {t('Air Préchauffé — Résultats') || 'Air Préchauffé — Résultats'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {[
            { label: t('Temp. air après préch.') || 'Temp. air après préch.', val: results.Tair_ap_prechauffe_C },
            { label: t('Enthalpie air préch.') || 'Enthalpie air préch.', val: results.Hair_ap_prechauffage_kW },
            { label: t('Hf fumées voûte') || 'Hf fumées voûte', val: results.Hf_voute_kW },
            { label: t('Hf fumées après HX') || 'Hf fumées après HX', val: results.Hf_voute_ap_HX_kW },
            { label: t('Temp. air soufflante') || 'Temp. air soufflante', val: results.Temp_air_soufflante_C },
            { label: t('Q_gaz') || 'Q_gaz', val: results.Q_gaz_kg_h },
          ].map(({ label, val }) => (
            <div key={label}>
              <label style={labelStyle}>{label}</label>
              <div style={resultBox}>{val?.toFixed(2) ?? '-'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CombustionTab;