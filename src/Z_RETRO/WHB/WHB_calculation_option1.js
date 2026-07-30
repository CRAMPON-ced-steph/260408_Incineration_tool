import { fh_CO2, fh_H2O, fh_O2, fh_N2 } from '../../A_Transverse_fonction/enthalpy_gas';
import { CO2_kg_m3, O2_kg_m3, N2_kg_m3, H2O_kg_m3 } from '../../A_Transverse_fonction/conv_calculation';
import { hV_p, hL_T, h_pT, Tsat_p } from '../../A_Transverse_fonction/steam_table3';
import {O2_masse_volume, rho_air, Lv} from '../../A_Transverse_fonction/constantes';




export const performCalculation_WHB_option_T_Qair = (nodeData, T_eau_alimentation_C, Q_eau_purge_pourcent, T_air_exterieur_C, P_th_pourcent, P_vapeur_bar, bilanTypeVapeur, T_vapeur_surchauffee_C, T_amont_WHB_C, Q_air_parasite_Nm3_h) => {
  // Parse input parameters
  const Taval_WHB = nodeData.result.dataFlow.T;

  
const  Teau_alim = parseFloat(T_eau_alimentation_C) || 0;
  const Qpurge_pourcent = parseFloat(Q_eau_purge_pourcent) || 0;
  const Tair = parseFloat(T_air_exterieur_C) || 0;
  const Pth_pourcent = parseFloat(P_th_pourcent) || 0;
  const Pvap_bar = parseFloat(P_vapeur_bar) || 0;
  const Tvap_surchauffee = parseFloat(T_vapeur_surchauffee_C) || 0;
  const T = parseFloat(T_amont_WHB_C) || 0;
  const Qair_parasite_Nm3_h = parseFloat(Q_air_parasite_Nm3_h) || 0;


  // Extract data from nodeData.result
  const {
    Qv_wet_Nm3_h: Qv_wet_out_Nm3_h,
    O2_dry_pourcent: O2_dry_out_pourcent,
    H2O_pourcent: H2O_out_pourcent,
    O2_humide_pourcent: O2_humide_out_pourcent,
    N2_humide_pourcent: N2_humide_out_pourcent,
    CO2_dry_pourcent: CO2_dry_out_pourcent,
    CO2_humide_pourcent: CO2_humide_out_pourcent,
    Qv_CO2_Nm3_h: Qv_CO2_out_Nm3_h,
    Qv_H2O_Nm3_h: Qv_H2O_out_Nm3_h,
    Qv_O2_Nm3_h: Qv_O2_out_Nm3_h,
    Qv_N2_Nm3_h: Qv_N2_out_Nm3_h,
    Qv_sec_Nm3_h: Qv_sec_out_Nm3_h,
    Qm_CO2_kg_h: Qm_CO2_out_kg_h,
    Qm_H2O_kg_h: Qm_H2O_out_kg_h,
    Qm_O2_kg_h: Qm_O2_out_kg_h,
    Qm_N2_kg_h: Qm_N2_out_kg_h,
    Qm_tot_kg_h: Qm_tot_out_kg_h,
    H_tot_kj: H_tot_out_kj
  } = nodeData.result.dataFlow;

  // Calculate parasitic air composition
  const Qv_air_entrant_tot_Nm3_h = Qair_parasite_Nm3_h;
  const Qv_air_entrant_Nm3_h = Qv_air_entrant_tot_Nm3_h;
  const Qm_air_entrant_kg_h = Qv_air_entrant_Nm3_h * rho_air;
  const Qm_O2_air_entrant_kg_h = O2_masse_volume * Qm_air_entrant_kg_h;
  const Qm_N2_air_entrant_kg_h = (1-O2_masse_volume) * Qm_air_entrant_kg_h;

  // Calculate enthalpies for incoming air
  const H_O2_air_entrant_kj = fh_O2(Tair) * Qm_O2_air_entrant_kg_h;
  const H_N2_air_entrant_kj = fh_N2(Tair) * Qm_N2_air_entrant_kg_h;
  const H_tot_air_entrant_kj = H_O2_air_entrant_kj + H_N2_air_entrant_kj;
  const H_tot_air_entrant_kW = H_tot_air_entrant_kj / 3600;

  // Calculate flue gas composition
  const Qm_CO2_kg_h = Qm_CO2_out_kg_h;
  const Qm_H2O_kg_h = Qm_H2O_out_kg_h;
  const Qm_O2_kg_h = Qm_O2_out_kg_h - Qm_O2_air_entrant_kg_h;
  const Qm_N2_kg_h = Qm_N2_out_kg_h - Qm_N2_air_entrant_kg_h;
  const Qm_tot_kg_h = Qm_CO2_kg_h + Qm_H2O_kg_h + Qm_O2_kg_h + Qm_N2_kg_h;

  // Convert masses to volumes
  const Qv_CO2_Nm3_h = CO2_kg_m3(Qm_CO2_kg_h);
  const Qv_H2O_Nm3_h = H2O_kg_m3(Qm_H2O_kg_h);
  const Qv_O2_Nm3_h = O2_kg_m3(Qm_O2_kg_h);
  const Qv_N2_Nm3_h = N2_kg_m3(Qm_N2_kg_h);
  const Qv_sec_Nm3_h = Qv_CO2_Nm3_h + Qv_O2_Nm3_h + Qv_N2_Nm3_h;
  const Qv_wet_Nm3_h = Qv_sec_Nm3_h + Qv_H2O_Nm3_h;

  // Calculate volume percentages
  const O2_dry_pourcent = (Qv_O2_Nm3_h / Qv_sec_Nm3_h) * 100;
  const O2_humide_pourcent = (Qv_O2_Nm3_h / Qv_wet_Nm3_h) * 100;
  const H2O_pourcent = (Qv_H2O_Nm3_h / Qv_wet_Nm3_h) * 100;
  const N2_humide_pourcent = (Qv_N2_Nm3_h / Qv_wet_Nm3_h) * 100;
  const CO2_dry_pourcent = (Qv_CO2_Nm3_h / Qv_sec_Nm3_h) * 100;
  const CO2_humide_pourcent = (Qv_CO2_Nm3_h / Qv_wet_Nm3_h) * 100;

  // Calculate enthalpies
  const H_CO2_kj = fh_CO2(T) * Qm_CO2_kg_h;
  const H_H2O_kj = (fh_H2O(T) + Lv) * Qm_H2O_kg_h;
  const H_O2_kj = fh_O2(T) * Qm_O2_kg_h;
  const H_N2_kj = fh_N2(T) * Qm_N2_kg_h;
  const H_tot_kj = H_CO2_kj + H_H2O_kj + H_O2_kj + H_N2_kj;
  const H_tot_kW = H_tot_kj / 3600;

  // Calculate steam production
  const Pvap_bar_abs = Pvap_bar + 1;
  let Q_vapeur_calculee_kg_h;
  let H_vapeur;
  let Tvap_saturee;
  let Energie_recuperee_WHB_kW;
  
  let Delta_h;

  if (bilanTypeVapeur === 'SATURATED_STEAM') {
    const dH_sat = hV_p(Pvap_bar_abs) - hL_T(Teau_alim);
    Q_vapeur_calculee_kg_h = dH_sat !== 0 ? (H_tot_kj - H_tot_out_kj) * (1 - Pth_pourcent / 100) / dH_sat : 0;
    H_vapeur = dH_sat * Q_vapeur_calculee_kg_h / 3600;
    Tvap_saturee = Tsat_p(Pvap_bar_abs);

    Delta_h = hV_p(Pvap_bar_abs) - hL_T(Teau_alim);

  } else if (bilanTypeVapeur === 'SUPERHEATED_STEAM') {
    const dH_sup = h_pT(Pvap_bar_abs, Tvap_surchauffee) - hL_T(Teau_alim);
    Q_vapeur_calculee_kg_h = dH_sup !== 0 ? (H_tot_kj - H_tot_out_kj) * (1 - Pth_pourcent / 100) / dH_sup : 0;
    H_vapeur = dH_sup * Q_vapeur_calculee_kg_h / 3600;

    Delta_h = h_pT(Pvap_bar_abs, Tvap_surchauffee) - hL_T(Teau_alim);
  }

  const T_denom = T !== 0 ? (T - Taval_WHB) / T : 0;
  Energie_recuperee_WHB_kW = T_denom !== 0 ? Delta_h * Q_vapeur_calculee_kg_h / T_denom / 3600 : 0;

  // Calculate feed water
  const purgeFactor = 1 - Qpurge_pourcent / 100;
  const Q_eau_alimentation_kg_h = purgeFactor > 0 ? Q_vapeur_calculee_kg_h / purgeFactor : Q_vapeur_calculee_kg_h;
  const H_eau_alimentation_kj = hL_T(Teau_alim) * Q_eau_alimentation_kg_h;
  const H_eau_alimentation_kW = H_eau_alimentation_kj / 3600;








  // Prepare return data
  const data_Air_WHB = {
    Energie_recuperee_WHB_kW,
    Taval_WHB,
    T_amont_WHB_C,
    bilanTypeVapeur,
    H_tot_kj,
    H_tot_out_kj,
    Pth_pourcent,
    Tair,
    Qv_air_parasite_Nm3_h: Qair_parasite_Nm3_h,
    Qv_air_entrant_Nm3_h,
    Qm_air_entrant_kg_h,
    Qm_O2_air_entrant_kg_h,
    Qm_N2_air_entrant_kg_h,
    H_O2_air_entrant_kj,
    H_N2_air_entrant_kj,
    H_tot_air_entrant_kW,
  };

  const data_vapeur_WHB = {
    Tvap_saturee,
    Tvap_surchauffee,
    Q_vapeur_calculee_kg_h,
    H_vapeur,
  };

  const data_eau_alim_WHB = {
    Teau_alim,
    Q_eau_alimentation_kg_h,
    H_eau_alimentation_kj,
    H_eau_alimentation_kW,
  };

  const dataFlow = {
    T_in: Taval_WHB,
    T,
    Qv_wet_Nm3_h,
    O2_dry_pourcent,
    H2O_pourcent,
    O2_humide_pourcent,
    N2_humide_pourcent,
    CO2_dry_pourcent,
    CO2_humide_pourcent,
    Qv_CO2_Nm3_h,
    Qv_H2O_Nm3_h,
    Qv_O2_Nm3_h,
    Qv_N2_Nm3_h,
    Qv_sec_Nm3_h,
    Qm_CO2_kg_h,
    Qm_H2O_kg_h,
    Qm_O2_kg_h,
    Qm_N2_kg_h,
    Qm_tot_kg_h,
    H_CO2_kj,
    H_H2O_kj,
    H_O2_kj,
    H_N2_kj,
    H_tot_kj,
    H_tot_kW,
  };

  return { data_Air_WHB, data_vapeur_WHB, data_eau_alim_WHB, dataFlow };
};
