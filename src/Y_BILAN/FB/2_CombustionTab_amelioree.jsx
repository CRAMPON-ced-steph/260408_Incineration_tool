import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { molarMasses, massVolumique } from '../../A_Transverse_fonction/constantes';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './FB_traduction';

const useTranslation = (currentLanguage = 'fr') => {
  return useMemo(() => {
    const languageCode = getLanguageCode(currentLanguage);
    return (key) => translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  }, [currentLanguage]);
};




import {
  cp_dt_h2o, fh_MS_kW, fh_MM_kW, Hfvoute_kW, Tair_fluide_FB,
  Masse_Air_Instrumentation, Mole_Excess_O2, Mole_Excess_O2_air_varia,
  MoleNOx, cp_air, Masse_Air_Comb_gaz_Func, MasseAir_e, Vol_Air_e,
  FractionMassiqueC, FractionMassiqueH, FractionMassiqueO, FractionMassiqueN, FractionMassiqueS, FractionMassiqueCl
} from '../../A_Transverse_fonction/bilan_fct_FB';





import {
  H2O_kg_m3, CO2_kg_m3, O2_kg_m3, N2_kg_m3,
} from '../../A_Transverse_fonction/conv_calculation';

import SchemaProcessus from './SchemaProcessus';

// ============================================================
// CONSTANTES
// ============================================================

const FUEL_PROPERTIES = {
  GAZ: { density: 0.75, pci: 7730, C_percent: 88.7, H_percent: 7.4, O_percent: 0.6, N_percent: 0.9, S_percent: 1.2, Cl_percent: 0 },
  BIOGAZ: { density: 1.15, pci: 5000, C_percent: 75, H_percent: 25, O_percent: 0, N_percent: 0, S_percent: 0, Cl_percent: 0 },
  FIOUL: { density: 850, pci: 10223, C_percent: 75, H_percent: 25, O_percent: 0, N_percent: 0, S_percent: 0, Cl_percent: 0 },
};

const DEFAULT_AIR_COMP_ROW = { CO2_pct: 0, H2O_pct: 0, O2_pct: 23.14, N2_pct: 76.86, SO2_pct: 0, Cl_pct: 0 };

const DEFAULT_AIR_COMPOSITION = {
  air_combustion_boue: { masse_seche: 0, ...DEFAULT_AIR_COMP_ROW, override_H2O: null, override_O2: null, override_N2: null, override_SO2: null, override_Cl: null },
  air_combustion_gaz:  { masse_seche: 0, ...DEFAULT_AIR_COMP_ROW, override_H2O: null, override_O2: null, override_N2: null, override_SO2: null, override_Cl: null },
  air_instrumentation: { masse_seche: 0, ...DEFAULT_AIR_COMP_ROW, override_H2O: null, override_O2: null, override_N2: null, override_SO2: null, override_Cl: null },
  air_secondaire:      { masse_seche: 0, ...DEFAULT_AIR_COMP_ROW, override_H2O: null, override_O2: null, override_N2: null, override_SO2: null, override_Cl: null },
  air_tertiaire:       { masse_seche: 0, ...DEFAULT_AIR_COMP_ROW, override_H2O: null, override_O2: null, override_N2: null, override_SO2: null, override_Cl: null },
};

const DEFAULT_EMISSIONS = {
  type_energy: 'GAZ',
  densite_combustible: 0.75,
  PCI_combustible: 7730,
  Exces_air_lit: 78,
  Exces_air_combustible: 78,
  O2_pct_air_combustion: 21,
  Teneur_en_eau_kgH2O_kgAS: 0.008,
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
const lsGet = (key, def) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; } };
const lsSet = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* noop */ } };

// ============================================================
// CALCUL ITÉRATIF — FONCTION PURE
// ============================================================

function runIterativeCalc({
  composition, sludgeC, sludgeH, sludgeO, sludgeN, sludgeS, sludgeCl,
  Exces_air_lit, Exces_air_combustible,
  Teneur_en_eau_kgH2O_kgAS, Masse_volatile_kg_h, Masse_seche_kg_h, Masse_mineral_kg_h,
  PCI_boue_kcal_kgMV, Masse_eau_kg_h, SO2_recupere_cendre_pourcent,
  Temp_boue_entree_C, Temp_fumee_voute_C, Temp_air_fluidisation_av_prechauffe_C,
  Temp_air_secondaire_C, Temp_air_tertiaire_C, Pertes_thermiques_pourcent,
  Temp_air_balayage_instrumentation_C, Tf_voute_ap_HX_C, Rdt_HX,
  Masse_air_secondaire_kg_h, Masse_air_tertiaire_kg_h,
  MS_pourcent, MV_pourcent, BoueBrute_kg_h,
  airComposition,
  forceGazZero = false,
}) {
  const MAX_ITER = forceGazZero ? 1 : 20;
  const TOLERANCE = 0.1;
  let Masse_gaz_kg_h = 0;
  let r = {};

  // Composition air de combustion (% massique) pour boue et gaz
  const airCombBoue = airComposition?.air_combustion_boue || DEFAULT_AIR_COMP_ROW;
  const airCombGaz = airComposition?.air_combustion_gaz || DEFAULT_AIR_COMP_ROW;
  const airInstru = airComposition?.air_instrumentation || DEFAULT_AIR_COMP_ROW;
  const airSec = airComposition?.air_secondaire || DEFAULT_AIR_COMP_ROW;
  const airTert = airComposition?.air_tertiaire || DEFAULT_AIR_COMP_ROW;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const Mgaz = {
      C: (composition.C_percent / 100) * Masse_gaz_kg_h,
      H: (composition.H_percent / 100) * Masse_gaz_kg_h,
      O: (composition.O_percent / 100) * Masse_gaz_kg_h,
      N: (composition.N_percent / 100) * Masse_gaz_kg_h,
      S: (composition.S_percent / 100) * Masse_gaz_kg_h,
      Cl: (composition.Cl_percent / 100) * Masse_gaz_kg_h,
    };

    const Maire_sec_comb_gaz = Masse_Air_Comb_gaz_Func(
      Masse_gaz_kg_h, Exces_air_combustible,
      composition.C_percent, composition.H_percent, composition.S_percent, composition.O_percent
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


    const Maire_sec_comb_boue = MasseAir_e(Mboue.C, Mboue.H, Mboue.S, Mboue.O, Exces_air_lit, 21).MasseAir_e || 0;
    const Vair_sec_comb_boue = Vol_Air_e(Mboue.C, Mboue.H, Mboue.S, Mboue.O, Exces_air_lit, 21) || 0;
    const Vair_sec_comb_gaz = Vol_Air_e(Mgaz.C, Mgaz.H, Mgaz.S, Mgaz.O, Exces_air_combustible, 21) || 0;

    const Vair_sec_comb_tot = Vair_sec_comb_boue + Vair_sec_comb_gaz;

    const Mhum_comb_boue = Maire_sec_comb_boue * Teneur_en_eau_kgH2O_kgAS;
    const Mhum_comb_gaz = Maire_sec_comb_gaz * Teneur_en_eau_kgH2O_kgAS;
    const Mhum_comb_tot = Mhum_comb_boue + Mhum_comb_gaz;

    const Vvap_boue = Vair_sec_comb_boue * 1.293 * Teneur_en_eau_kgH2O_kgAS * (0.0224 / 0.018);
    const Vvap_gaz = Vair_sec_comb_gaz * 1.293 * Teneur_en_eau_kgH2O_kgAS * (0.0224 / 0.018);
    const Vvap_tot = Vvap_boue + Vvap_gaz;
    const Vair_comb_tot = Vair_sec_comb_tot + Vvap_tot;

    const Debit_eau = Masse_eau_kg_h + Maire_balayage * Teneur_en_eau_kgH2O_kgAS + Maire_sec_comb_boue * Teneur_en_eau_kgH2O_kgAS;

    // --- Moles boues ---
    const MB_C = (Mboue.C / 12.01) * 1000;
    const MB_H = ((Mboue.H / 1.008 + (2 * Debit_eau) / 18.015) * 1000);
    const MB_O = (Mboue.O / 16 + Debit_eau / 18.015 + ((Maire_sec_comb_boue / 4.310055 + Maire_balayage / 4.32) / 16)) * 1000;
    const MB_N = ((Mboue.N + (Maire_sec_comb_boue * (1 - 1 / 4.310055) + Maire_balayage * (1 - 1 / 4.32)))) * 1000 / 14.007;
    const MB_S = (Mboue.S / 32.066) * 1000;
    const MB_Cl = (Mboue.Cl / 35.45) * 1000;

    // --- Moles eau issue de la boue ---
    const MEau_H = (2 * Debit_eau / 18.015) * 1000;
    const MEau_O = (Debit_eau / 18.015) * 1000;

    // --- Moles gaz ---
    const MG_C = (Mgaz.C / 12.01) * 1000;
    const MG_H = ((Mgaz.H / 1.008 + (2 * Mhum_comb_gaz) / 18.015) * 1000);
    const MG_O = ((Mgaz.O / 16 + Mhum_comb_gaz / 18.015 + Maire_sec_comb_gaz / 4.310055 / 16) * 1000);
    const MG_N = ((Mgaz.N + Maire_sec_comb_gaz * (1 - 1 / 4.310055)) * 1000) / 14.007;
    const MG_S = (Mgaz.S / 32.066) * 1000;
    const MG_Cl = (Mgaz.Cl / 35.45) * 1000;

    // --- Moles air combustion boues ---
    const MAirCombBoue_H = (Maire_sec_comb_boue * Teneur_en_eau_kgH2O_kgAS * 2 / 18.015) * 1000;
    const MAirCombBoue_O = (Maire_sec_comb_boue * (airCombBoue.O2_pct / 100) / 16) * 1000;
    const MAirCombBoue_N = (Maire_sec_comb_boue * (airCombBoue.N2_pct / 100) / 14.007) * 1000;

    // --- Moles air combustion gaz ---
    const MAirCombGaz_H = (Maire_sec_comb_gaz * Teneur_en_eau_kgH2O_kgAS * 2 / 18.015) * 1000;
    const MAirCombGaz_O = (Maire_sec_comb_gaz * (airCombGaz.O2_pct / 100) / 16) * 1000;
    const MAirCombGaz_N = (Maire_sec_comb_gaz * (airCombGaz.N2_pct / 100) / 14.007) * 1000;

    // --- Moles air instrumentation ---
    const MAirInstru_H = (Maire_balayage * Teneur_en_eau_kgH2O_kgAS * 2 / 18.015) * 1000;
    const MAirInstru_O = (Maire_balayage * (airInstru.O2_pct / 100) / 16) * 1000;
    const MAirInstru_N = (Maire_balayage * (airInstru.N2_pct / 100) / 14.007) * 1000;

    // --- Moles air secondaire ---
    const MAirSec_H = (Masse_air_secondaire_kg_h * Teneur_en_eau_kgH2O_kgAS * 2 / 18.015) * 1000;
    const MAirSec_O = (Masse_air_secondaire_kg_h * (airSec.O2_pct / 100) / 16) * 1000;
    const MAirSec_N = (Masse_air_secondaire_kg_h * (airSec.N2_pct / 100) / 14.007) * 1000;

    // --- Moles air tertiaire ---
    const MAirTert_H = (Masse_air_tertiaire_kg_h * Teneur_en_eau_kgH2O_kgAS * 2 / 18.015) * 1000;
    const MAirTert_O = (Masse_air_tertiaire_kg_h * (airTert.O2_pct / 100) / 16) * 1000;
    const MAirTert_N = (Masse_air_tertiaire_kg_h * (airTert.N2_pct / 100) / 14.007) * 1000;

    const MolesO2excGaz = ((Maire_sec_comb_gaz * (1 - 1 / (1 + Exces_air_combustible / 100))) * (1 / 4.310055) * 1000) / 32;

    const MF_C = MB_C + MG_C;
    const MF_H = MB_H + MG_H;
    const MF_O2 = MB_O + MG_O;
    const MF_N = MB_N + MG_N;
    const MF_SO2 = MB_S + MG_S;
    const MF_HCl = MB_Cl + MG_Cl;

    const MF_CO2 = (MF_C * Math.sqrt(Math.max(MF_O2, 0))) / (0.05 + Math.sqrt(Math.max(MF_O2, 0)));
    const MF_CO = MF_C - MF_CO2;




    const MolesO2excBoue = Mole_Excess_O2(Exces_air_lit, Maire_sec_comb_boue) || 0;
    const MoleO2excesAirInstrumentation = Mole_Excess_O2_air_varia(Maire_balayage) || 0;
    const MoleO2excesAirSecondaire = Mole_Excess_O2_air_varia(Masse_air_secondaire_kg_h) || 0;
    const MoleO2excesAirTertiaire = Mole_Excess_O2_air_varia(Masse_air_tertiaire_kg_h) || 0;




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

    const FG_wet_Nm3 = FGv_HCl + FGv_CO2 + FGv_CO + FGv_H2O + FGv_O2exc + FGv_NOX + FGv_N2 + FGv_SO2reel;
    const FG_dry_Nm3 = FG_wet_Nm3 - FGv_H2O;
    const FG_wet_kg = FG_HCl + FG_CO2 + FG_CO + FG_H2O + FG_O2exc + FG_NOX + FG_N2 + FG_SO2reel;
    const FG_dry_kg = FG_wet_kg - FG_H2O;

    const Maire_sec_boue_tot = Maire_sec_comb_boue + Maire_balayage;
    const Maire_sec_comb_tot = Maire_sec_comb_gaz + Maire_sec_comb_boue;
    const Meau_air_comburant = Teneur_en_eau_kgH2O_kgAS * Maire_sec_comb_tot;

    const H_MV = (PCI_boue_kcal_kgMV * Masse_volatile_kg_h * 4.1868) / 3600;
    const H_MS = fh_MS_kW(Temp_boue_entree_C, Masse_seche_kg_h) || 0;
    const H_Evap = (Masse_eau_kg_h * (4.1868 * Temp_boue_entree_C - 2501.6)) / 3600;
    const H_MM = fh_MM_kW(Temp_fumee_voute_C, Masse_mineral_kg_h) || 0;
    const H_NET_BOUE = H_MV + H_MS + H_Evap;

    const H_air_flu = cp_air(Temp_air_fluidisation_av_prechauffe_C) * Maire_sec_comb_tot + cp_dt_h2o(Temp_air_fluidisation_av_prechauffe_C) * Meau_air_comburant;

    const Meau_air2 = Teneur_en_eau_kgH2O_kgAS * Masse_air_secondaire_kg_h;
    const H_air2 = cp_air(Temp_air_secondaire_C) * Masse_air_secondaire_kg_h + cp_dt_h2o(Temp_air_secondaire_C) * Meau_air2;

    const Meau_air3 = Teneur_en_eau_kgH2O_kgAS * Masse_air_tertiaire_kg_h;
    const H_air3 = cp_air(Temp_air_tertiaire_C) * Masse_air_tertiaire_kg_h + cp_dt_h2o(Temp_air_tertiaire_C) * Meau_air3;

    const Pertes = ((PCI_boue_kcal_kgMV * Masse_volatile_kg_h * (Pertes_thermiques_pourcent / 100)) / 3600) * 4.1868;

    const T_soufflante = Temp_air_fluidisation_av_prechauffe_C + 45;

    const Meau_balayage = Teneur_en_eau_kgH2O_kgAS * Maire_balayage;
    const H_balayage = cp_air(T_soufflante) * Maire_balayage + cp_dt_h2o(T_soufflante) * Meau_balayage;

    const Hf_voute = Hfvoute_kW(Temp_fumee_voute_C, FG_HCl, FG_CO2, FG_CO, FG_H2O, FG_H2, FG_O2exc, FG_N2, FG_SO2reel) || 0;
    const Hf_voute_HX = Hfvoute_kW(Tf_voute_ap_HX_C, FG_HCl, FG_CO2, FG_CO, FG_H2O, FG_H2, FG_O2exc, FG_N2, FG_SO2reel) || 0;

    const Tair_prech = Tair_fluide_FB(Hf_voute, Hf_voute_HX, 0, Rdt_HX, Maire_sec_comb_tot, Meau_air_comburant) || 0;
    const H_air_prech = cp_air(Tair_prech) * Maire_sec_comb_tot + cp_dt_h2o(Tair_prech) * (Maire_sec_comb_tot * Teneur_en_eau_kgH2O_kgAS);

    const H_gaz_inter = (Masse_gaz_kg_h / 0.87) * 11.493;

    const H_in = H_NET_BOUE + H_air_prech + H_balayage + H_gaz_inter;
    const H_out = H_MM + Hf_voute + Pertes;
    const H_gaz = H_out - H_in;

    const Q_gaz_Nm3 = H_gaz / 11.493;
    const Q_gaz_kg = Q_gaz_Nm3 * 0.87;

    const Rho_FG_kg_Nm3 = Vvap_boue > 0 ? FG_wet_kg / FG_wet_Nm3 : 0;

    // Masse humidité air total
    const Mhum_air_instru = Teneur_en_eau_kgH2O_kgAS * Maire_balayage;
    const Mhum_air_sec = Teneur_en_eau_kgH2O_kgAS * Masse_air_secondaire_kg_h;
    const Mhum_air_tert = Teneur_en_eau_kgH2O_kgAS * Masse_air_tertiaire_kg_h;

    // Volume vapeur d'eau
    const Vvap_instru = Maire_balayage * Teneur_en_eau_kgH2O_kgAS * (0.0224 / 0.018);
    const Vvap_sec = Masse_air_secondaire_kg_h * Teneur_en_eau_kgH2O_kgAS * (0.0224 / 0.018);
    const Vvap_tert = Masse_air_tertiaire_kg_h * Teneur_en_eau_kgH2O_kgAS * (0.0224 / 0.018);

    // Volume air sec instrumentation / secondaire / tertiaire
    const Vair_instru = Maire_balayage / 1.293;
    const Vair_sec = Masse_air_secondaire_kg_h / 1.293;
    const Vair_tert = Masse_air_tertiaire_kg_h / 1.293;

    // Volume air combustible total = volume air sec + volume vapeur
    const Vair_comb_boue_tot = Vair_sec_comb_boue + Vvap_boue;
    const Vair_comb_gaz_tot = Vair_sec_comb_gaz + Vvap_gaz;
    const Vair_instru_tot = Vair_instru + Vvap_instru;
    const Vair_sec_tot = Vair_sec + Vvap_sec;
    const Vair_tert_tot = Vair_tert + Vvap_tert;

    const isConverged = forceGazZero || Math.abs(Q_gaz_kg) < TOLERANCE;
    const isLastIter = iter === MAX_ITER - 1;

    if (isConverged || isLastIter) {
      r = {
        Q_gaz_kg_h: Masse_gaz_kg_h, Q_gaz_Nm3_h: Masse_gaz_kg_h / 0.87,
        Masse_gaz_kg_h, iteration: iter + 1, converged: isConverged,
        forceGazZero,
        Temp_fumee_voute_C, Tf_voute_ap_HX_C,

        // Air balayage
        Volume_air_balayage_Nm3_h: Vair_balayage, Masse_air_balayage_kg_h: Maire_balayage,

        // Air combustion boue
        Masse_air_sec_combustion_boue_kg_h: Maire_sec_comb_boue,
        Volume_air_sec_combustion_boue_Nm3_h: Vair_sec_comb_boue,
        Masse_humidite_air_combustion_boue_kg_h: Mhum_comb_boue,
        VolumeVapeurEauAirCombustionBoue_Nm3_h: Vvap_boue,
        VolumeAirCombustionBoue_total_Nm3_h: Vair_comb_boue_tot,

        // Air combustion gaz
        Masse_air_sec_combustion_gaz_kg_h: Maire_sec_comb_gaz,
        Volume_air_sec_combustion_gaz_Nm3_h: Vair_sec_comb_gaz,
        Masse_humidite_air_combustion_gaz_kg_h: Mhum_comb_gaz,
        VolumeVapeurEauAirCombustionGaz_Nm3_h: Vvap_gaz,
        VolumeAirCombustionGaz_total_Nm3_h: Vair_comb_gaz_tot,

        // Totaux
        Masse_air_sec_combustion_tot_kg_h: Maire_sec_comb_tot,
        Volume_air_sec_combustion_tot_Nm3_h: Vair_sec_comb_tot,
        Masse_humidite_air_combustion_total_kg_h: Mhum_comb_tot,
        VolumeVapeurEauAirCombustionTot_Nm3_h: Vvap_tot,
        VolumeAirCombustionTot_Nm3_h: Vair_comb_tot,
        Masse_air_sec_boue_total_kg_h: Maire_sec_boue_tot,

        // Air instrumentation / secondaire / tertiaire détail
        Masse_air_instru_kg_h: Maire_balayage,
        Volume_air_instru_Nm3_h: Vair_instru,
        Mhum_air_instru, Vvap_instru, Vair_instru_tot,
        Masse_air_secondaire_kg_h_calc: Masse_air_secondaire_kg_h,
        Volume_air_sec_Nm3_h: Vair_sec,
        Mhum_air_sec, Vvap_sec, Vair_sec_tot,
        Masse_air_tertiaire_kg_h_calc: Masse_air_tertiaire_kg_h,
        Volume_air_tert_Nm3_h: Vair_tert,
        Mhum_air_tert, Vvap_tert, Vair_tert_tot,

        // Moles boues
        MolesBoues_C: MB_C, MolesBoues_H: MB_H, MolesBoues_O: MB_O,
        MolesBoues_N: MB_N, MolesBoues_S: MB_S, MolesBoues_Cl: MB_Cl,
        MolesO2excesBoue: MolesO2excBoue,

        // Moles eau issue de la boue
        MolesEauBoue_H: MEau_H, MolesEauBoue_O: MEau_O,

        // Moles gaz
        MolesGaz_C: MG_C, MolesGaz_H: MG_H, MolesGaz_O: MG_O,
        MolesGaz_N: MG_N, MolesGaz_S: MG_S, MolesGaz_Cl: MG_Cl,
        MolesO2excesGaz: MolesO2excGaz,
        MoleO2excesAirInstrumentation,
        MoleO2excesAirSecondaire,
        MoleO2excesAirTertiaire,

        // Moles air combustion boue/gaz
        MAirCombBoue_H, MAirCombBoue_O, MAirCombBoue_N,
        MAirCombGaz_H, MAirCombGaz_O, MAirCombGaz_N,

        // Moles air instru/sec/tert
        MAirInstru_H, MAirInstru_O, MAirInstru_N,
        MAirSec_H, MAirSec_O, MAirSec_N,
        MAirTert_H, MAirTert_O, MAirTert_N,

        // Moles fumées totales
        Moles_Fumees_C: MF_C, Moles_Fumees_H: MF_H,
        Moles_Fumees_O2: MF_O2, Moles_Fumees_N: MF_N,
        Moles_Fumees_SO2: MF_SO2, Moles_Fumees_HCl: MF_HCl,
        Moles_Fumees_CO2: MF_CO2, Moles_Fumees_CO: MF_CO,
        Moles_Fumees_H2O: MF_H2O, Moles_Fumees_O2exces: MF_O2exc,
        Moles_Fumees_NOX: MF_NOX, Moles_Fumees_N2: MF_N2,

        // kg/h
        FG_kg_h_SO2: FG_SO2, FG_kg_h_HCl: FG_HCl, FG_kg_h_CO2: FG_CO2,
        FG_kg_h_CO: FG_CO, FG_kg_h_H2O: FG_H2O, FG_kg_h_O2exces: FG_O2exc,
        FG_kg_h_NOX: FG_NOX, FG_kg_h_N2: FG_N2, FG_kg_h_SO2reel: FG_SO2reel,
        FG_kg_h_H2: FG_H2,
        FG_wet_kg_h: FG_wet_kg, FG_dry_kg_h: FG_dry_kg,

        // Nm3/h
        FG_Nm3_h_SO2: FGv_SO2, FG_Nm3_h_HCl: FGv_HCl, FG_Nm3_h_CO2: FGv_CO2,
        FG_Nm3_h_CO: FGv_CO, FG_Nm3_h_H2O: FGv_H2O, FG_Nm3_h_O2exces: FGv_O2exc,
        FG_Nm3_h_NOX: FGv_NOX, FG_Nm3_h_N2: FGv_N2, FG_Nm3_h_SO2reel: FGv_SO2reel,
        FG_wet_Nm3_h: FG_wet_Nm3, FG_dry_Nm3_h: FG_dry_Nm3,

        Masses_boues_composition_kg_h: Mboue,
        Masses_gaz_composition_kg_h: Mgaz,

        // Enthalpies
        H_MV_boue_entree_kW: H_MV, H_MS_boue_entree_kW: H_MS,
        H_Evap_boue_entree_kW: H_Evap, H_matiere_minerale_kW: H_MM,
        H_NETTE_BOUE_kW: H_NET_BOUE,
        H_air_fluidisation_av_prechauffe_kW: H_air_flu,
        H_air_secondaire_kW: H_air2, H_air_tertiaire_kW: H_air3,
        Pertes_thermiques_kW: Pertes,
        Temp_air_soufflante_C: T_soufflante,
        Masse_eau_air_balayage_kg_h: Meau_balayage,
        H_air_balayage_instrumentation_kW: H_balayage,
        Hf_voute_kW: Hf_voute, Hf_voute_ap_HX_kW: Hf_voute_HX,
        Tair_ap_prechauffe_C: Tair_prech,
        Hair_ap_prechauffage_kW: H_air_prech,
        H_gaz_inter, H_gaz, H_in, H_out,
        Rho_FG_kg_Nm3, Meau_air_comburant,

        // Moles display-only (composant pur, sans correction humidité/air)
        Display_MolesBoues_C: (Mboue.C / 12.01) * 1000,
        Display_MolesBoues_H: (Mboue.H / 1.008) * 1000,
        Display_MolesBoues_O: (Mboue.O / 16) * 1000,
        Display_MolesBoues_N: (Mboue.N / 14.007) * 1000,
        Display_MolesBoues_S: (Mboue.S / 32.066) * 1000,
        Display_MolesBoues_Cl: (Mboue.Cl / 35.45) * 1000,
        Display_MolesEauBoue_H: (2 * Masse_eau_kg_h / 18.015) * 1000,
        Display_MolesEauBoue_O: (Masse_eau_kg_h / 18.015) * 1000,
        Display_MolesGaz_C: (Mgaz.C / 12.01) * 1000,
        Display_MolesGaz_H: (Mgaz.H / 1.008) * 1000,
        Display_MolesGaz_O: (Mgaz.O / 16) * 1000,
        Display_MolesGaz_N: (Mgaz.N / 14.007) * 1000,
        Display_MolesGaz_S: (Mgaz.S / 32.066) * 1000,
        Display_MolesGaz_Cl: (Mgaz.Cl / 35.45) * 1000,
      };
      break;
    }

    Masse_gaz_kg_h = Math.max(0, Masse_gaz_kg_h + Q_gaz_kg);
  }

  return r;
}

// ============================================================
// TOGGLE SWITCH
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
// COMPOSANT PRINCIPAL
// ============================================================

const CombustionTab = ({ innerData = {}, onInnerDataChange, onResultsChange, currentLanguage = 'fr' }) => {
  const t = useTranslation(currentLanguage);

  const [emissions, setEmissions] = useState(() => {
    const saved = lsGet('emissions', {});
    return { ...DEFAULT_EMISSIONS, ...Object.fromEntries(Object.entries(saved).filter(([, v]) => v != null)) };
  });
  const [thermalParams, setThermalParams] = useState(() => {
    const saved = lsGet('thermalParams', {});
    return { ...DEFAULT_THERMAL, ...Object.fromEntries(Object.entries(saved).filter(([, v]) => v != null)) };
  });
  const [airComposition, setAirComposition] = useState(() => lsGet('airComposition', DEFAULT_AIR_COMPOSITION));
  const [showExpertAir, setShowExpertAir] = useState(false);
  const [showExpertFumees, setShowExpertFumees] = useState(false);
  const [showDetailedBilan, setShowDetailedBilan] = useState(false);
  const [useGazAppoint, setUseGazAppoint] = useState(false);

  useEffect(() => { lsSet('emissions', emissions); }, [emissions]);
  useEffect(() => { lsSet('thermalParams', thermalParams); }, [thermalParams]);
  useEffect(() => { lsSet('airComposition', airComposition); }, [airComposition]);

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
        if (v !== undefined && v !== prev[k]) { next[k] = v; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [innerData.MV_kg_h, innerData.BoueBrute_kg_h, innerData.MS_kg_h, innerData.MM_kg_h, innerData.PCIKCALKGMV, innerData.EauExtraite_kg_h]);

  const composition = useMemo(() => FUEL_PROPERTIES[emissions.type_energy] || FUEL_PROPERTIES.GAZ, [emissions.type_energy]);

  const results = useMemo(() => {
    try {
      return runIterativeCalc({
        composition,
        sludgeC: innerData.C_percent || 0, sludgeH: innerData.H_percent || 0,
        sludgeO: innerData.O_percent || 0, sludgeN: innerData.N_percent || 0,
        sludgeS: innerData.S_percent || 0, sludgeCl: innerData.Cl_percent || 0,
        Exces_air_lit: emissions.Exces_air_lit || 0,
        Exces_air_combustible: emissions.Exces_air_combustible || 0,
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
        airComposition,
        forceGazZero: true,
      });
    } catch (err) { console.error('Erreur calcul combustion:', err); return {}; }
  }, [emissions, thermalParams, composition, airComposition, useGazAppoint,
    innerData.C_percent, innerData.H_percent, innerData.O_percent,
    innerData.N_percent, innerData.S_percent, innerData.Cl_percent,
    innerData.MS_pourcent, innerData.MV_pourcent, innerData.BoueBrute_kg_h]);

  // ---- Mise à jour innerData + notification au parent ----
  useEffect(() => {
    innerData.FG_wet_Nm3_h = results.FG_wet_Nm3_h || 0;
    innerData.FG_dry_Nm3_h = results.FG_dry_Nm3_h || 0;
    innerData.Volume_air_balayage = results.Volume_air_balayage_Nm3_h || 0;
    innerData.Hf_voute_kW = results.Hf_voute_kW || 0;
    innerData.Q_gaz_kg_h = results.Q_gaz_kg_h || 0;
    innerData.Q_gaz_Nm3_h = results.Q_gaz_Nm3_h || 0;
    innerData.Tair_ap_prechauffe_C = results.Tair_ap_prechauffe_C || 0;
    innerData.Temp_air_fluidisation_av_prechauffe_C = thermalParams.Temp_air_fluidisation_av_prechauffe_C || 0;
    innerData.Exces_air = emissions.Exces_air_lit || 0;
    innerData.Exces_air_lit = emissions.Exces_air_lit || 0;
    innerData.Exces_air_combustible = emissions.Exces_air_combustible || 0;
    innerData.Temp_fumee_voute_C = thermalParams.Temp_fumee_voute_C || 870;
    innerData.Tf_voute_ap_HX_C = thermalParams.Tf_voute_ap_HX_C || 550;
    innerData.Rdt_HX = thermalParams.Rdt_HX * 100 || 85;
    innerData.Temp_air_soufflante_C = results.Temp_air_soufflante_C || 60;
    innerData.Q_air_comb_tot_Nm3_h = results.VolumeAirCombustionTot_Nm3_h || 0;
    innerData.Rho_FG_kg_Nm3 = results.Rho_FG_kg_Nm3 || 0;
    innerData.Masse_air_sec_combustion_tot_kg_h = results.Masse_air_sec_combustion_tot_kg_h || 0;

    innerData.m_co = results.FG_kg_h_CO || 0;
    innerData.m_co2 = results.FG_kg_h_CO2 || 0;
    innerData.m_h2o = results.FG_kg_h_H2O || 0;
    innerData.m_h2 = 0;
    innerData.m_n2 = results.FG_kg_h_N2 || 0;
    innerData.m_o2 = results.FG_kg_h_O2exces || 0;
    innerData.m_so2 = results.FG_kg_h_SO2reel || 0;
    innerData.m_chcl = results.FG_kg_h_HCl || 0;

    const masses_FG_out = {
      CO2: (results.FG_kg_h_CO2 || 0) + (results.FG_kg_h_CO || 0),
      O2: results.FG_kg_h_O2exces || 0, H2O: results.FG_kg_h_H2O || 0, N2: results.FG_kg_h_N2 || 0,
      dry: (results.FG_kg_h_CO2 || 0) + (results.FG_kg_h_CO || 0) + (results.FG_kg_h_O2exces || 0) + (results.FG_kg_h_N2 || 0),
      wet: (results.FG_kg_h_CO2 || 0) + (results.FG_kg_h_CO || 0) + (results.FG_kg_h_O2exces || 0) + (results.FG_kg_h_N2 || 0) + (results.FG_kg_h_H2O || 0),
    };
    const masses_pollutant_FG_out = {
      NOx: results.FG_kg_h_NOX, HCl: results.FG_kg_h_HCl, SO2: results.FG_kg_h_SO2reel,
      N2: results.FG_kg_h_N2, CO2: (results.FG_kg_h_CO2 || 0) + (results.FG_kg_h_CO || 0),
    };
    const FG_CO2_Nm3_h = CO2_kg_m3(masses_FG_out.CO2);
    const FG_H2O_Nm3_h = H2O_kg_m3(masses_FG_out.H2O);
    const FG_O2_Nm3_h = O2_kg_m3(masses_FG_out.O2);
    const FG_N2_Nm3_h = N2_kg_m3(masses_FG_out.N2);
    const FG_dry_Nm3_h = FG_CO2_Nm3_h + FG_N2_Nm3_h + FG_O2_Nm3_h;
    const FG_wet_Nm3_h = FG_dry_Nm3_h + FG_H2O_Nm3_h;
    const O2_sec_pourcent = FG_dry_Nm3_h > 0 ? FG_O2_Nm3_h / FG_dry_Nm3_h : 0;
    const volume_FG_out = { CO2: FG_CO2_Nm3_h, O2: FG_O2_Nm3_h, H2O: FG_H2O_Nm3_h, N2: FG_N2_Nm3_h, dry: FG_dry_Nm3_h, wet: FG_wet_Nm3_h };

    innerData['FG_OUT_kg_h'] = masses_FG_out;
    innerData['FG_OUT_Nm3_h'] = volume_FG_out;
    innerData['FG_pollutant_OUT_kg_h'] = masses_pollutant_FG_out;
    innerData['O2_calcule'] = O2_sec_pourcent;

    onInnerDataChange?.();
    onResultsChange?.({
      m_co: results.FG_kg_h_CO || 0, m_co2: results.FG_kg_h_CO2 || 0,
      m_h2o: results.FG_kg_h_H2O || 0, m_h2: 0,
      m_n2: results.FG_kg_h_N2 || 0, m_o2: results.FG_kg_h_O2exces || 0,
      m_so2: results.FG_kg_h_SO2reel || 0, m_chcl: results.FG_kg_h_HCl || 0,
      Temp_fumee_voute_C: thermalParams.Temp_fumee_voute_C || 870,
      FG_wet_Nm3_h: results.FG_wet_Nm3_h || 0, FG_dry_Nm3_h: results.FG_dry_Nm3_h || 0,
      Hf_voute_kW: results.Hf_voute_kW || 0, Rho_FG_kg_Nm3: results.Rho_FG_kg_Nm3 || 0,
      Temp_air_fluidisation_av_prechauffe_C: thermalParams.Temp_air_fluidisation_av_prechauffe_C || 15,
      Q_air_comb_tot_Nm3_h: results.VolumeAirCombustionTot_Nm3_h || 0,
      Masse_air_sec_combustion_tot_kg_h: results.Masse_air_sec_combustion_tot_kg_h || 0,
      Rdt_HX: thermalParams.Rdt_HX || 0.85, Tair_ap_prechauffe_C: results.Tair_ap_prechauffe_C || 0,
    });
  }, [results, emissions, innerData, thermalParams, onInnerDataChange, onResultsChange]);

  const handleFuelChange = useCallback((fuelType) => {
    const p = FUEL_PROPERTIES[fuelType];
    setEmissions((prev) => ({ ...prev, type_energy: fuelType, densite_combustible: p.density, PCI_combustible: p.pci }));
  }, []);
  const handleEmission = useCallback((key, value) => { setEmissions((prev) => ({ ...prev, [key]: parseFloat(value) || 0 })); }, []);
  const handleThermal = useCallback((key, value) => { setThermalParams((prev) => ({ ...prev, [key]: parseFloat(value) || 0 })); }, []);
  const handleAirCompKgH = useCallback((airKey, pctKey, kgHValue, masseSeche) => {
    const newPct = masseSeche > 0 ? (parseFloat(kgHValue) || 0) / masseSeche * 100 : 0;
    setAirComposition((prev) => ({ ...prev, [airKey]: { ...prev[airKey], [pctKey]: newPct } }));
  }, []);
  // ---- Styles ----
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

  const sludgeComp = { C: innerData.C_percent || 0, H: innerData.H_percent || 0, O: innerData.O_percent || 0, N: innerData.N_percent || 0, S: innerData.S_percent || 0, Cl: innerData.Cl_percent || 0 };
  const residuConvergence = results.H_gaz ?? null;
  const f = (v, d = 2) => v != null && isFinite(v) ? v.toFixed(d) : '-';
  const f0 = (v) => f(v, 0);

  // ============================================================
  // AIR COMPOSITION ROWS pour le tableau simplifié
  // ============================================================
  const airCompRows = [
    { key: 'air_instrumentation', label: 'Air instrumentation' },
    { key: 'air_secondaire', label: 'Air secondaire' },
    { key: 'air_tertiaire', label: 'Air tertiaire' },
    { key: 'air_combustion_boue', label: 'Air combustion boue' },
    { key: 'air_combustion_gaz', label: 'Air combustion gaz' },
  ];

  // Masses relatives par kg d'air sec (référence = 1 kg) pour le calcul des fractions élémentaires.
  // On n'utilise pas masse_seche (= 0 par défaut) — les fractions sont indépendantes de la masse totale.
  const airMasses = useMemo(() => {
    const calc = (row) => {
      const te = emissions.Teneur_en_eau_kgH2O_kgAS || 0;
      const CO2 = (row.CO2_pct || 0) / 100;   // kg CO2 par kg d'air sec
      const H2O = te;                           // kg H2O par kg d'air sec (humidité)
      const O2  = (row.O2_pct  || 0) / 100;
      const N2  = (row.N2_pct  || 0) / 100;
      const SO2 = (row.SO2_pct || 0) / 100;
      const Cl  = (row.Cl_pct  || 0) / 100;
      return { CO2, H2O, O2, N2, SO2, Cl, Somme: CO2 + H2O + O2 + N2 + SO2 + Cl };
    };
    const r = {};
    for (const [key, row] of Object.entries(airComposition)) {
      r[key] = calc(row);
    }
    return r;
  }, [airComposition, emissions.Teneur_en_eau_kgH2O_kgAS]);

  // Fractions massiques élémentaires C/H/O/N/S/Cl de chaque flux d'air (en %)
  const airFractions = useMemo(() => {
    const calc = (m) => ({
      C:  FractionMassiqueC (m.CO2, m.O2, m.N2, m.H2O, m.SO2, m.Cl, molarMasses),
      H:  FractionMassiqueH (m.CO2, m.O2, m.N2, m.H2O, m.SO2, m.Cl, molarMasses),
      O:  FractionMassiqueO (m.CO2, m.O2, m.N2, m.H2O, m.SO2, m.Cl, molarMasses),
      N:  FractionMassiqueN (m.CO2, m.O2, m.N2, m.H2O, m.SO2, m.Cl, molarMasses),
      S:  FractionMassiqueS (m.CO2, m.O2, m.N2, m.H2O, m.SO2, m.Cl, molarMasses),
      Cl: FractionMassiqueCl(m.CO2, m.O2, m.N2, m.H2O, m.SO2, m.Cl, molarMasses),
    });
    const r = {};
    for (const [key, m] of Object.entries(airMasses)) r[key] = calc(m);
    return r;
  }, [airMasses]);

  // Masses composants (kg/h) de chaque flux d'air calculé
  const airComponentMasses = useMemo(() => {
    const apply = (fracs, total) => ({
      C:  (fracs?.C  || 0) * total / 100,
      H:  (fracs?.H  || 0) * total / 100,
      O:  (fracs?.O  || 0) * total / 100,
      N:  (fracs?.N  || 0) * total / 100,
      S:  (fracs?.S  || 0) * total / 100,
      Cl: (fracs?.Cl || 0) * total / 100,
    });
    return {
      air_instrumentation: apply(
        airFractions.air_instrumentation,
        (results.Masse_air_instru_kg_h || 0) + (results.Mhum_air_instru || 0)
      ),
      air_secondaire: apply(
        airFractions.air_secondaire,
        (results.Masse_air_secondaire_kg_h_calc || 0) + (results.Mhum_air_sec || 0)
      ),
      air_tertiaire: apply(
        airFractions.air_tertiaire,
        (results.Masse_air_tertiaire_kg_h_calc || 0) + (results.Mhum_air_tert || 0)
      ),
      air_combustion_boue: apply(
        airFractions.air_combustion_boue,
        (results.Masse_air_sec_combustion_boue_kg_h || 0) + (results.Masse_humidite_air_combustion_boue_kg_h || 0)
      ),
      air_combustion_gaz: apply(
        airFractions.air_combustion_gaz,
        (results.Masse_air_sec_combustion_gaz_kg_h || 0) + (results.Masse_humidite_air_combustion_gaz_kg_h || 0)
      ),
    };
  }, [airFractions, results]);

  // Moles de chaque flux d'air (mol/h × 10⁻³)
  const airMolesCalc = useMemo(() => {
    const toMoles = (m) => ({
      C:  (m.C  / 12.01)  * 1000,
      H:  (m.H  / 1.008)  * 1000,
      O:  (m.O  / 16)     * 1000,
      N:  (m.N  / 14.007) * 1000,
      S:  (m.S  / 32.066) * 1000,
      Cl: (m.Cl / 35.45)  * 1000,
    });
    const r = {};
    for (const [key, masses] of Object.entries(airComponentMasses)) r[key] = toMoles(masses);
    return r;
  }, [airComponentMasses]);

  // ============================================================
  // RENDER
  // ============================================================
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
            <input type="number" step="0.1" value={emissions.Exces_air_lit ?? DEFAULT_EMISSIONS.Exces_air_lit} onChange={(e) => handleEmission('Exces_air_lit', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t("Excès d'air Combustible d'appoint")} (%)</label>
            <input type="number" step="0.1" value={emissions.Exces_air_combustible ?? DEFAULT_EMISSIONS.Exces_air_combustible} onChange={(e) => handleEmission('Exces_air_combustible', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('O₂% air de combustion lit')}</label>
            <input type="number" step="0.1" value={emissions.O2_pct_air_combustion ?? DEFAULT_EMISSIONS.O2_pct_air_combustion} onChange={(e) => handleEmission('O2_pct_air_combustion', e.target.value)} style={inputStyle} /></div>
          <div><label style={labelStyle}>{t('Teneur en eau')} (kg H₂O/kg AS)</label>
            <input type="number" step="0.0001" value={emissions.Teneur_en_eau_kgH2O_kgAS ?? DEFAULT_EMISSIONS.Teneur_en_eau_kgH2O_kgAS} onChange={(e) => handleEmission('Teneur_en_eau_kgH2O_kgAS', e.target.value)} style={inputStyle} /></div>
        </div>
      </div>

      {/* ═══ RÉSULTATS CONVERGENCE ═══ */}
      <div style={card}>
        <div style={{ ...cardTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <span>
            📈 {t('Résultats de Convergence')}
            {!useGazAppoint && <span style={{ marginLeft: '10px', color: '#6366f1', fontSize: '13px', fontWeight: 'normal' }}>— gaz appoint = 0 (forcé)</span>}
            {useGazAppoint && results.converged === false && <span style={{ marginLeft: '10px', color: '#ef4444', fontSize: '14px' }}>⚠ Non convergé en {results.iteration} itérations</span>}
            {useGazAppoint && results.converged === true  && <span style={{ marginLeft: '10px', color: '#10b981', fontSize: '14px' }}>✓ Convergé en {results.iteration} itérations</span>}
          </span>
          <ToggleSwitch label={t('Gaz appoint (itératif)')} checked={useGazAppoint} onChange={setUseGazAppoint} />
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

      {/* ═══ COMPOSITION DES AIRS DE COMBUSTION ═══ */}
      <div style={card}>
        <div style={cardTitle}>🌬️ {t('Composition des airs de combustion')}</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: 'left', width: '180px' }}>Flux d'air</th>
                <th style={TH}>Masse sèche (kg/h)</th>
                <th style={TH}>O₂% sec</th>
                <th style={TH}>N₂% sec</th>
                <th style={TH}>CO₂ (kg/h)</th>
                <th style={TH}>H₂O (kg/h)</th>
                <th style={TH}>O₂ (kg/h)</th>
                <th style={TH}>N₂ (kg/h)</th>
                <th style={TH}>SO₂ (kg/h)</th>
                <th style={TH}>Cl (kg/h)</th>
                <th style={TH}>Somme (kg/h)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'air_combustion_boue', label: 'Air combustion boue', masse: results.Masse_air_sec_combustion_boue_kg_h || 0 },
                { key: 'air_combustion_gaz',  label: 'Air combustion gaz',  masse: results.Masse_air_sec_combustion_gaz_kg_h  || 0 },
                { key: 'air_instrumentation', label: 'Air instrumentation', masse: results.Masse_air_instru_kg_h              || 0 },
              ].map(({ key, label, masse }) => {
                const comp = airComposition[key] || DEFAULT_AIR_COMP_ROW;
                const te   = emissions.Teneur_en_eau_kgH2O_kgAS || 0;
                const CO2_kg = masse * (comp.CO2_pct || 0) / 100;
                const H2O_kg = masse * te;
                const O2_kg  = masse * (comp.O2_pct  || 0) / 100;
                const N2_kg  = masse * (comp.N2_pct  || 0) / 100;
                const SO2_kg = masse * (comp.SO2_pct || 0) / 100;
                const Cl_kg  = masse * (comp.Cl_pct  || 0) / 100;
                const somme  = CO2_kg + H2O_kg + O2_kg + N2_kg + SO2_kg + Cl_kg;
                return (
                  <tr key={key} style={{ backgroundColor: '#FFFDE7' }}>
                    <td style={TDL}>{label}</td>
                    <td style={TD}>{f(masse)}</td>
                    <td style={TD}>{f(comp.O2_pct, 2)}</td>
                    <td style={TD}>{f(comp.N2_pct, 2)}</td>
                    <td style={TD}>{f(CO2_kg)}</td>
                    <td style={TD}>{f(H2O_kg)}</td>
                    <td style={TD}>{f(O2_kg)}</td>
                    <td style={TD}>{f(N2_kg)}</td>
                    <td style={TD}>{f(SO2_kg)}</td>
                    <td style={TD}>{f(Cl_kg)}</td>
                    <td style={{ ...TD, fontWeight: 'bold' }}>{f(somme)}</td>
                  </tr>
                );
              })}
              {[
                { key: 'air_secondaire', label: 'Air secondaire', masseKey: 'Masse_air_secondaire_kg_h' },
                { key: 'air_tertiaire',  label: 'Air tertiaire',  masseKey: 'Masse_air_tertiaire_kg_h'  },
              ].map(({ key, label, masseKey }) => {
                const masse  = thermalParams[masseKey] || 0;
                const comp   = airComposition[key] || DEFAULT_AIR_COMP_ROW;
                const te     = emissions.Teneur_en_eau_kgH2O_kgAS || 0;
                const CO2_kg = masse * (comp.CO2_pct || 0) / 100;
                const H2O_kg = masse * te;
                const O2_kg  = masse * (comp.O2_pct  || 0) / 100;
                const N2_kg  = masse * (comp.N2_pct  || 0) / 100;
                const SO2_kg = masse * (comp.SO2_pct || 0) / 100;
                const Cl_kg  = masse * (comp.Cl_pct  || 0) / 100;
                const somme  = CO2_kg + H2O_kg + O2_kg + N2_kg + SO2_kg + Cl_kg;
                const mkInput = (val, pctKey) => (
                  <input type="number" step="0.01"
                    value={parseFloat(f(val))}
                    onChange={(e) => handleAirCompKgH(key, pctKey, e.target.value, masse)}
                    style={smallInput} />
                );
                return (
                  <tr key={key} style={{ backgroundColor: '#E6F3FF' }}>
                    <td style={TDL}>{label}</td>
                    <td style={TD}>
                      <input type="number" step="0.1" value={masse}
                        onChange={(e) => handleThermal(masseKey, e.target.value)}
                        style={smallInput} />
                    </td>
                    <td style={TD}>{f(comp.O2_pct, 2)}</td>
                    <td style={TD}>{f(comp.N2_pct, 2)}</td>
                    <td style={TD}>{mkInput(CO2_kg, 'CO2_pct')}</td>
                    <td style={{ ...TD, backgroundColor: '#f0f0f0', fontStyle: 'italic' }}>{f(H2O_kg)}</td>
                    <td style={TD}>{mkInput(O2_kg,  'O2_pct')}</td>
                    <td style={TD}>{mkInput(N2_kg,  'N2_pct')}</td>
                    <td style={TD}>{mkInput(SO2_kg, 'SO2_pct')}</td>
                    <td style={TD}>{mkInput(Cl_kg,  'Cl_pct')}</td>
                    <td style={{ ...TD, fontWeight: 'bold' }}>{f(somme)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══ TABLEAU AIR DE COMBUSTION ═══ */}
      <div style={card}>
        <div style={{ ...cardTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>🌬️ {t('Air de Combustion')}</span>
          <ToggleSwitch label="Expert" checked={showExpertAir} onChange={setShowExpertAir} />
        </div>

        {showExpertAir ? (
          /* ═══ EXPERT AIR TABLE (matching Excel screenshot) ═══ */
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
                {/* --- Boue --- */}
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
                {/* --- Gaz naturel --- */}
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
                {/* --- Air compositions (5 rows) --- */}
                {[
                  { key: 'air_combustion_boue', label: 'Air de combustion des boues', color: '#dc2626' },
                  { key: 'air_combustion_gaz', label: 'Air de combustion gaz', color: '#dc2626' },
                  { key: 'air_instrumentation', label: 'Air instrumentation', color: '#dc2626' },
                  { key: 'air_secondaire', label: 'Air secondaire', color: '#dc2626' },
                  { key: 'air_tertiaire', label: 'Air tertiaire', color: '#dc2626' },
                ].map(({ key, label, color }) => {
                  const fr = airFractions[key] || {};
                  return (
                    <tr key={key} style={{ backgroundColor: '#F0F8FF' }}>
                      <td style={{ ...TDR, color }}>{label}</td>
                      <td style={TD}>{f(fr.C,  2)}</td>
                      <td style={TD}>{f(fr.H,  2)}</td>
                      <td style={TD}>{f(fr.O,  2)}</td>
                      <td style={TD}>{f(fr.N,  2)}</td>
                      <td style={TD}>{f(fr.S,  2)}</td>
                      <td style={TD}>{f(fr.Cl, 2)}</td>
                      <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                    </tr>
                  );
                })}
                {/* --- g O2/g composant --- */}
                <tr style={{ backgroundColor: '#FFF9E6' }}>
                  <td style={TDR}>g O₂/g composant</td>
                  <td style={TD}>2.6644</td><td style={TD}>7.9365</td><td style={TD}>0</td>
                  <td style={TD}>0</td><td style={TD}>0.9979</td><td style={TD}>0</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- Separator --- */}
                <tr><td colSpan={13} style={{ height: '4px', backgroundColor: '#FFD700' }} /></tr>
                {/* --- Moles boues --- */}
                <tr style={{ backgroundColor: '#FFFF99' }}>
                  <td style={{ ...TDL, color: '#dc2626' }}>Moles boues</td>
                  <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.Display_MolesBoues_C, 1)}</td>
                  <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.Display_MolesBoues_H, 1)}</td>
                  <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.Display_MolesBoues_O, 1)}</td>
                  <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.Display_MolesBoues_N, 1)}</td>
                  <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.Display_MolesBoues_S, 3)}</td>
                  <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.Display_MolesBoues_Cl, 1)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- Moles eau issue de la boue --- */}
                <tr style={{ backgroundColor: '#FFFF99' }}>
                  <td style={{ ...TDL, color: '#dc2626' }}>Moles eau issue de la boue</td>
                  <td style={TD}></td>
                  <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.Display_MolesEauBoue_H, 1)}</td>
                  <td style={{ ...TD, color: '#0ea5e9', fontWeight: 'bold' }}>{f(results.Display_MolesEauBoue_O, 1)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- Moles du gaz de combustion --- */}
                <tr>
                  <td style={TDR}>Moles du gaz de combustion</td>
                  <td style={TD}>{f(results.Display_MolesGaz_C, 3)}</td>
                  <td style={TD}>{f(results.Display_MolesGaz_H, 3)}</td>
                  <td style={TD}>{f(results.Display_MolesGaz_O, 3)}</td>
                  <td style={TD}>{f(results.Display_MolesGaz_N, 3)}</td>
                  <td style={TD}>{f(results.Display_MolesGaz_S, 3)}</td>
                  <td style={TD}>{f(results.Display_MolesGaz_Cl, 3)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- Separator --- */}
                <tr><td colSpan={13} style={{ height: '4px', backgroundColor: '#FFD700' }} /></tr>
                {/* --- Moles air de combustion des boues --- */}
                <tr style={{ backgroundColor: '#E6F3FF' }}>
                  <td style={{ ...TDL, color: '#dc2626' }}>Moles air de combustion des boues</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_boue?.C, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_boue?.H, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_boue?.O, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_boue?.N, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_boue?.S, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_boue?.Cl, 3)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- Moles air combustion gaz --- */}
                <tr style={{ backgroundColor: '#E6F3FF' }}>
                  <td style={{ ...TDL, color: '#dc2626' }}>Moles air combustion gaz</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_gaz?.C, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_gaz?.H, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_gaz?.O, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_gaz?.N, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_gaz?.S, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_combustion_gaz?.Cl, 3)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- Separator --- */}
                <tr><td colSpan={13} style={{ height: '2px', backgroundColor: '#ccc' }} /></tr>
                {/* --- Moles air instrumentation --- */}
                <tr>
                  <td style={TDR}>Moles air instrumentation</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.C, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.H, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.O, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.N, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.S, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.Cl, 3)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- Moles air secondaire --- */}
                <tr>
                  <td style={TDR}>Moles air secondaire</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.C, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.H, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.O, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.N, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.S, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.Cl, 3)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- Moles air tertiaire --- */}
                <tr>
                  <td style={TDR}>Moles air tertiaire</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.C, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.H, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.O, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.N, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.S, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.Cl, 3)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- Separator --- */}
                <tr><td colSpan={13} style={{ height: '4px', backgroundColor: '#ccc' }} /></tr>
                {/* --- Masse composant boue --- */}
                <tr>
                  <td style={TDR}>Masse composant boue</td>
                  <td style={TD}>{f(results.Masses_boues_composition_kg_h?.C)}</td>
                  <td style={TD}>{f(results.Masses_boues_composition_kg_h?.H)}</td>
                  <td style={TD}>{f(results.Masses_boues_composition_kg_h?.O)}</td>
                  <td style={TD}>{f(results.Masses_boues_composition_kg_h?.N)}</td>
                  <td style={TD}>{f(results.Masses_boues_composition_kg_h?.S, 4)}</td>
                  <td style={TD}>{f(results.Masses_boues_composition_kg_h?.Cl, 3)}</td>
                  <td style={TD}>{f(results.MolesO2excesBoue)}</td>
                  <td style={{ ...TD, fontWeight: 'bold', color: '#dc2626' }}>{f(results.Masse_air_sec_combustion_boue_kg_h, 0)}</td>
                  <td style={{ ...TD, fontWeight: 'bold', color: '#dc2626' }}>{f(results.Volume_air_sec_combustion_boue_Nm3_h, 0)}</td>
                  <td style={TD}>{f(results.Masse_humidite_air_combustion_boue_kg_h)}</td>
                  <td style={TD}>{f(results.VolumeVapeurEauAirCombustionBoue_Nm3_h)}</td>
                  <td style={TD}>{f(results.VolumeAirCombustionBoue_total_Nm3_h)}</td>
                </tr>
                {/* --- Masse composant gaz --- */}
                <tr>
                  <td style={{ ...TDR, color: '#dc2626' }}>Masse composant gaz</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f(results.Masses_gaz_composition_kg_h?.C, 1)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f(results.Masses_gaz_composition_kg_h?.H, 1)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f(results.Masses_gaz_composition_kg_h?.O, 1)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f(results.Masses_gaz_composition_kg_h?.N, 1)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f(results.Masses_gaz_composition_kg_h?.S, 1)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f(results.Masses_gaz_composition_kg_h?.Cl, 1)}</td>
                  <td style={TD}>{f(results.MolesO2excesGaz)}</td>
                  <td style={{ ...TD, fontWeight: 'bold', color: '#dc2626' }}>{f(results.Masse_air_sec_combustion_gaz_kg_h, 0)}</td>
                  <td style={{ ...TD, fontWeight: 'bold', color: '#dc2626' }}>{f(results.Volume_air_sec_combustion_gaz_Nm3_h, 0)}</td>
                  <td style={TD}>{f(results.Masse_humidite_air_combustion_gaz_kg_h)}</td>
                  <td style={TD}>{f(results.VolumeVapeurEauAirCombustionGaz_Nm3_h)}</td>
                  <td style={TD}>{f(results.VolumeAirCombustionGaz_total_Nm3_h)}</td>
                </tr>
                {/* --- Totaux comb --- */}
                <tr style={{ backgroundColor: '#E8F4F8' }}>
                  <td style={TDR}></td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                  <td style={TD}></td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.Masse_air_sec_combustion_tot_kg_h, 0)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.Volume_air_sec_combustion_tot_Nm3_h, 0)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.Masse_humidite_air_combustion_total_kg_h)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.VolumeVapeurEauAirCombustionTot_Nm3_h)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.VolumeAirCombustionTot_Nm3_h)}</td>
                </tr>
                {/* --- Masse air instrumentation --- */}
                <tr>
                  <td style={{ ...TDR, color: '#dc2626' }}>Masse air instrumentation</td>
                  <td style={TD}>{f(airComponentMasses.air_instrumentation?.C, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_instrumentation?.H, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_instrumentation?.O, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_instrumentation?.N, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_instrumentation?.S, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_instrumentation?.Cl, 3)}</td>
                  <td style={TD}>{f(results.MoleO2excesAirInstrumentation)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.Masse_air_instru_kg_h)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.Volume_air_instru_Nm3_h)}</td>
                  <td style={TD}>{f(results.Mhum_air_instru)}</td>
                  <td style={TD}>{f(results.Vvap_instru)}</td>
                  <td style={TD}>{f(results.Vair_instru_tot)}</td>
                </tr>
                {/* --- Masse air secondaire --- */}
                <tr>
                  <td style={{ ...TDR, color: '#dc2626' }}>Masse air secondaire</td>
                  <td style={TD}>{f(airComponentMasses.air_secondaire?.C, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_secondaire?.H, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_secondaire?.O, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_secondaire?.N, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_secondaire?.S, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_secondaire?.Cl, 3)}</td>
                  <td style={TD}>{f(results.MoleO2excesAirSecondaire)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.Masse_air_secondaire_kg_h_calc)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.Volume_air_sec_Nm3_h)}</td>
                  <td style={TD}>{f(results.Mhum_air_sec)}</td>
                  <td style={TD}>{f(results.Vvap_sec)}</td>
                  <td style={TD}>{f(results.Vair_sec_tot)}</td>
                </tr>
                {/* --- Masse air tertiaire --- */}
                <tr>
                  <td style={{ ...TDR, color: '#dc2626' }}>Masse air tertiaire</td>
                  <td style={TD}>{f(airComponentMasses.air_tertiaire?.C, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_tertiaire?.H, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_tertiaire?.O, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_tertiaire?.N, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_tertiaire?.S, 3)}</td>
                  <td style={TD}>{f(airComponentMasses.air_tertiaire?.Cl, 3)}</td>
                  <td style={TD}>{f(results.MoleO2excesAirTertiaire)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.Masse_air_tertiaire_kg_h_calc)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f(results.Volume_air_tert_Nm3_h)}</td>
                  <td style={TD}>{f(results.Mhum_air_tert)}</td>
                  <td style={TD}>{f(results.Vvap_tert)}</td>
                  <td style={TD}>{f(results.Vair_tert_tot)}</td>
                </tr>
                {/* --- Totaux air non-comb --- */}
                <tr style={{ backgroundColor: '#E8F4F8' }}>
                  <td style={TDR}></td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                  <td style={TD}></td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f((results.Masse_air_instru_kg_h || 0) + (results.Masse_air_secondaire_kg_h_calc || 0) + (results.Masse_air_tertiaire_kg_h_calc || 0), 0)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f((results.Volume_air_instru_Nm3_h || 0) + (results.Volume_air_sec_Nm3_h || 0) + (results.Volume_air_tert_Nm3_h || 0), 0)}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f((results.Mhum_air_instru || 0) + (results.Mhum_air_sec || 0) + (results.Mhum_air_tert || 0))}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f((results.Vvap_instru || 0) + (results.Vvap_sec || 0) + (results.Vvap_tert || 0))}</td>
                  <td style={{ ...TD, fontWeight: 'bold' }}>{f((results.Vair_instru_tot || 0) + (results.Vair_sec_tot || 0) + (results.Vair_tert_tot || 0))}</td>
                </tr>
                {/* --- Air sec combustion totale / Volume air combustible total --- */}
                <tr style={{ fontWeight: 'bold', backgroundColor: '#DBEAFE' }}>
                  <td style={TDR}>Air sec de combustion totale</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                  <td style={TD}></td>
                  <td style={TD}>{f((results.Masse_air_sec_combustion_tot_kg_h || 0) + (results.Masse_air_instru_kg_h || 0) + (results.Masse_air_secondaire_kg_h_calc || 0) + (results.Masse_air_tertiaire_kg_h_calc || 0), 0)}</td>
                  <td style={TD}></td>
                  <td style={TD}>{f((results.Masse_humidite_air_combustion_total_kg_h || 0) + (results.Mhum_air_instru || 0) + (results.Mhum_air_sec || 0) + (results.Mhum_air_tert || 0))}</td>
                  <td style={TD}></td>
                  <td style={TD}></td>
                </tr>
                <tr style={{ fontWeight: 'bold', backgroundColor: '#DBEAFE' }}>
                  <td style={TDR}>Volume air de combustible total</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                  <td style={TD}></td><td style={TD}></td>
                  <td style={TD}>{f((results.Volume_air_sec_combustion_tot_Nm3_h || 0) + (results.Volume_air_instru_Nm3_h || 0) + (results.Volume_air_sec_Nm3_h || 0) + (results.Volume_air_tert_Nm3_h || 0), 0)}</td>
                  <td style={TD}></td>
                  <td style={TD}>{f((results.VolumeVapeurEauAirCombustionTot_Nm3_h || 0) + (results.Vvap_instru || 0) + (results.Vvap_sec || 0) + (results.Vvap_tert || 0))}</td>
                  <td style={TD}>{f((results.VolumeAirCombustionTot_Nm3_h || 0) + (results.Vair_instru_tot || 0) + (results.Vair_sec_tot || 0) + (results.Vair_tert_tot || 0))}</td>
                </tr>
                {/* --- Separator --- */}
                <tr><td colSpan={13} style={{ height: '4px', backgroundColor: '#FFD700' }} /></tr>
                {/* --- SUM Moles boue = Moles boues + Moles eau boue + Moles air comb boue --- */}
                <tr style={{ backgroundColor: '#FFFF99', fontWeight: 'bold' }}>
                  <td style={{ ...TDL, color: '#dc2626' }}>SUM Moles boue</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f((results.Display_MolesBoues_C || 0) + (airMolesCalc.air_combustion_boue?.C || 0), 1)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f((results.Display_MolesBoues_H || 0) + (results.Display_MolesEauBoue_H || 0) + (airMolesCalc.air_combustion_boue?.H || 0), 1)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f((results.Display_MolesBoues_O || 0) + (results.Display_MolesEauBoue_O || 0) + (airMolesCalc.air_combustion_boue?.O || 0), 1)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f((results.Display_MolesBoues_N || 0) + (airMolesCalc.air_combustion_boue?.N || 0), 1)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f((results.Display_MolesBoues_S || 0) + (airMolesCalc.air_combustion_boue?.S || 0), 3)}</td>
                  <td style={{ ...TD, color: '#dc2626' }}>{f((results.Display_MolesBoues_Cl || 0) + (airMolesCalc.air_combustion_boue?.Cl || 0), 3)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td>
                  <td style={TD}></td>
                  <td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- SUM Moles comb appoint = Moles gaz + Moles air comb gaz --- */}
                <tr>
                  <td style={TDR}>SUM Moles comb appoint</td>
                  <td style={TD}>{f((results.Display_MolesGaz_C || 0) + (airMolesCalc.air_combustion_gaz?.C || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_H || 0) + (airMolesCalc.air_combustion_gaz?.H || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_O || 0) + (airMolesCalc.air_combustion_gaz?.O || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_N || 0) + (airMolesCalc.air_combustion_gaz?.N || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_S || 0) + (airMolesCalc.air_combustion_gaz?.S || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_Cl || 0) + (airMolesCalc.air_combustion_gaz?.Cl || 0), 3)}</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
                {/* --- SUM moles air (non combustion) --- */}
                <tr>
                  <td style={TDR}>SUM moles air (non combustion)</td>
                  <td style={TD}>0,0</td>
                  <td style={TD}>{f((results.MAirInstru_H || 0) + (results.MAirSec_H || 0) + (results.MAirTert_H || 0), 1)}</td>
                  <td style={TD}>{f((results.MAirInstru_O || 0) + (results.MAirSec_O || 0) + (results.MAirTert_O || 0), 1)}</td>
                  <td style={TD}>{f((results.MAirInstru_N || 0) + (results.MAirSec_N || 0) + (results.MAirTert_N || 0), 1)}</td>
                  <td style={TD}>0,0</td><td style={TD}>0,0</td>
                  <td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td><td style={TD}></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          /* ═══ NORMAL AIR TABLE (simplified - original) ═══ */
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
        )}
      </div>

      {/* ═══ TABLEAU FUMÉES ═══ */}
      <div style={card}>
        <div style={{ ...cardTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>💨 {t('Fumées')}</span>
          <ToggleSwitch label="Expert" checked={showExpertFumees} onChange={setShowExpertFumees} />
        </div>
        {showExpertFumees ? (
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
                  <td style={TD}>{f((results.Display_MolesBoues_C || 0) + (airMolesCalc.air_combustion_boue?.C || 0), 1)}</td>
                  <td style={TD}>{f((results.Display_MolesBoues_H || 0) + (results.Display_MolesEauBoue_H || 0) + (airMolesCalc.air_combustion_boue?.H || 0), 1)}</td>
                  <td style={TD}>{f((results.Display_MolesBoues_O || 0) + (results.Display_MolesEauBoue_O || 0) + (airMolesCalc.air_combustion_boue?.O || 0), 1)}</td>
                  <td style={TD}>{f((results.Display_MolesBoues_N || 0) + (airMolesCalc.air_combustion_boue?.N || 0), 1)}</td>
                  <td style={TD}>{f((results.Display_MolesBoues_S || 0) + (airMolesCalc.air_combustion_boue?.S || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesBoues_Cl || 0) + (airMolesCalc.air_combustion_boue?.Cl || 0), 3)}</td>
                  <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
                  <td style={TD}>{f(results.MolesO2excesBoue)}</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
                  <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
                </tr>
                <tr style={{ backgroundColor: '#FFFDE7' }}>
                  <td style={TDL}>Moles combustible</td>
                  <td style={TD}>{f((results.Display_MolesGaz_C || 0) + (airMolesCalc.air_combustion_gaz?.C || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_H || 0) + (airMolesCalc.air_combustion_gaz?.H || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_O || 0) + (airMolesCalc.air_combustion_gaz?.O || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_N || 0) + (airMolesCalc.air_combustion_gaz?.N || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_S || 0) + (airMolesCalc.air_combustion_gaz?.S || 0), 3)}</td>
                  <td style={TD}>{f((results.Display_MolesGaz_Cl || 0) + (airMolesCalc.air_combustion_gaz?.Cl || 0), 3)}</td>
                  <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
                  <td style={TD}>{f(results.MolesO2excesGaz)}</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
                  <td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td><td style={TD}>-</td>
                </tr>
                <tr style={{ backgroundColor: '#F3F4F6' }}>
                  <td style={TDR}>Moles eau additionnelle dans carneau</td>
                  {Array(18).fill(null).map((_, i) => <td key={i} style={TD}>-</td>)}
                </tr>
                <tr style={{ backgroundColor: '#F3F4F6' }}>
                  <td style={TDR}>Moles air instrumentation</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.C, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.H, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.O, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.N, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.S, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_instrumentation?.Cl, 3)}</td>
                  {Array(12).fill(null).map((_, i) => <td key={i} style={TD}>-</td>)}
                </tr>
                <tr style={{ backgroundColor: '#F3F4F6' }}>
                  <td style={TDR}>Moles air secondaire</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.C, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.H, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.O, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.N, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.S, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_secondaire?.Cl, 3)}</td>
                  {Array(12).fill(null).map((_, i) => <td key={i} style={TD}>-</td>)}
                </tr>
                <tr style={{ backgroundColor: '#F3F4F6' }}>
                  <td style={TDR}>Moles air tertiaire</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.C, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.H, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.O, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.N, 1)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.S, 3)}</td>
                  <td style={TD}>{f(airMolesCalc.air_tertiaire?.Cl, 3)}</td>
                  {Array(12).fill(null).map((_, i) => <td key={i} style={TD}>-</td>)}
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
        ) : (
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
        )}
      </div>

      {/* ═══ SCHÉMA ═══ */}
      <SchemaProcessus data={{ ...emissions, ...thermalParams, ...results }} />

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
      <div style={card}>
        <div style={{ ...cardTitle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⚡ {t('Bilan Énergétique')} (kW)</span>
          <ToggleSwitch label="Bilan détaillé" checked={showDetailedBilan} onChange={setShowDetailedBilan} />
        </div>

        {showDetailedBilan && (
          <div style={{ marginBottom: '25px' }}>
            <div style={secTitle}>📋 Bilan Énergétique Détaillé</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, width: '160px', position: 'sticky', left: 0, zIndex: 1 }}>Énergie</th>
                    {[
                      { label: 'Boue entrée', c: '#FFE4B5' }, { label: '1. Matières minérales', c: '#D3D3D3' },
                      { label: 'Énergie nette boues', c: '#90EE90' }, { label: '2. Air flu. neuf préch.', c: '#87CEEB' },
                      { label: '3. Air secondaire', c: '#87CEEB' }, { label: '4. Air tertiaire', c: '#87CEEB' },
                      { label: '5. Énergie combustible', c: '#FFD700' }, { label: '6. Pertes therm.', c: '#FFA07A' },
                      { label: '7. Air balayage', c: '#87CEEB' }, { label: '8. Air flu. ap. préch.', c: '#87CEEB' },
                      { label: '9. Air flu. av. préch.', c: '#87CEEB' }, { label: '10. Fumées four', c: '#DDA0DD' },
                      { label: '11. Fumées préch.', c: '#DDA0DD' }, { label: '12. Fumées préch. 2', c: '#DDA0DD' },
                      { label: '13. Eau refr. entrée', c: '#ADD8E6' }, { label: '14. Eau refr. sortie', c: '#ADD8E6' },
                      { label: '15. Pertes imbrûlés', c: '#FFA07A' },
                    ].map((col, i) => <th key={i} style={{ ...TH, backgroundColor: col.c, fontSize: '8px', minWidth: '70px' }}>{col.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: 'Température [°C]', vals: [thermalParams.Temp_boue_entree_C, thermalParams.Temp_fumee_voute_C, null, thermalParams.Temp_air_fluidisation_av_prechauffe_C, thermalParams.Temp_air_secondaire_C, thermalParams.Temp_air_tertiaire_C, null, null, thermalParams.Temp_air_balayage_instrumentation_C, results.Tair_ap_prechauffe_C, thermalParams.Temp_air_fluidisation_av_prechauffe_C, thermalParams.Temp_fumee_voute_C, thermalParams.Tf_voute_ap_HX_C, null, null, null, null] },
                    { label: 'T° soufflante [°C]', vals: [null, null, null, null, null, null, null, null, results.Temp_air_soufflante_C, null, null, null, null, null, null, null, null] },
                    { label: 'Masse [kg/h]', vals: [emissions.Masse_brute_kg_h, emissions.Masse_mineral_kg_h, null, results.Masse_air_sec_combustion_tot_kg_h, thermalParams.Masse_air_secondaire_kg_h, thermalParams.Masse_air_tertiaire_kg_h, null, null, results.Masse_air_balayage_kg_h, results.Masse_air_sec_combustion_tot_kg_h, results.Masse_air_sec_combustion_tot_kg_h, null, null, null, null, null, null] },
                    { label: 'Enthalpie [kW]', vals: [results.H_NETTE_BOUE_kW, results.H_matiere_minerale_kW, results.H_NETTE_BOUE_kW, results.H_air_fluidisation_av_prechauffe_kW, results.H_air_secondaire_kW, results.H_air_tertiaire_kW, results.H_gaz_inter, results.Pertes_thermiques_kW, results.H_air_balayage_instrumentation_kW, results.Hair_ap_prechauffage_kW, results.H_air_fluidisation_av_prechauffe_kW, results.Hf_voute_kW, results.Hf_voute_ap_HX_kW, null, null, null, null] },
                  ].map((row, ri) => (
                    <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? '#FAFAFA' : '#fff' }}>
                      <td style={{ ...TD, fontWeight: 'bold', textAlign: 'left', position: 'sticky', left: 0, backgroundColor: ri % 2 === 0 ? '#FAFAFA' : '#fff', zIndex: 1 }}>{row.label}</td>
                      {row.vals.map((v, ci) => <td key={ci} style={TD}>{v != null ? (typeof v === 'number' ? v.toFixed(2) : v) : ''}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                  <td style={{ ...TD, backgroundColor: '#FFE6CC' }}>{vin != null ? vin.toFixed(2) : '-'}</td>
                  <td style={{ ...TD, backgroundColor: '#E6F3FF' }}>{vout != null ? vout.toFixed(2) : '-'}</td>
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
                  {residuConvergence?.toFixed(4) ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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

export default CombustionTab;