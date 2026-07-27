import {fh_CO2, fh_H2O, fh_O2, fh_N2} from '../../A_Transverse_fonction/enthalpy_gas';
import {Qeau_remove_to_be_at_T} from '../../A_Transverse_fonction/enthalpy_mix_gas';
import {H2O_m3_kg, coeff_Nm3_to_m3, CO2_kg_m3, H2O_kg_m3, O2_kg_m3, N2_kg_m3} from '../../A_Transverse_fonction/conv_calculation';
import { psat_T } from '../../A_Transverse_fonction/steam_table3';
import { Lv } from '../../A_Transverse_fonction/constantes';

export const performCalculation_SCRUBBER_option_TsupTsat = (nodeData, Teau, T_amont_SCRUBBER, PDC_aero) => {

  const T = T_amont_SCRUBBER;
  const T_intermediaire = 80;

  // LECTURE DU NOEUD PRECEDENT
  const Qm_CO2_kg_h_intermediaire = nodeData.result.dataFlow.Qm_CO2_kg_h;
  const Qm_H2O_out_kg_h           = nodeData.result.dataFlow.Qm_H2O_kg_h;
  const Qm_O2_kg_h_intermediaire  = nodeData.result.dataFlow.Qm_O2_kg_h;
  const Qm_N2_kg_h_intermediaire  = nodeData.result.dataFlow.Qm_N2_kg_h;

  const Qv_CO2_Nm3_h_intermediaire = nodeData.result.dataFlow.Qv_CO2_Nm3_h;
  const Qv_O2_Nm3_h_intermediaire  = nodeData.result.dataFlow.Qv_O2_Nm3_h;
  const Qv_N2_Nm3_h_intermediaire  = nodeData.result.dataFlow.Qv_N2_Nm3_h;

  // ETAPE 1 : ETAT INTERMEDIAIRE A 80°C (saturation)
  const H2O_pourcent_intermediaire = psat_T(T_intermediaire) * 100;
  const Qv_H2O_Nm3_h_intermediaire = (
    (Qv_N2_Nm3_h_intermediaire + Qv_O2_Nm3_h_intermediaire + Qv_CO2_Nm3_h_intermediaire) /
    (1 - H2O_pourcent_intermediaire / 100)
  ) * (H2O_pourcent_intermediaire / 100);
  const Qm_H2O_kg_h_intermediaire = H2O_m3_kg(Qv_H2O_Nm3_h_intermediaire);

  // Eau condensée entre l'état intermédiaire (80°C sat) et la sortie aval
  const Qeau_condensee_kg_h = Qm_H2O_kg_h_intermediaire - Qm_H2O_out_kg_h;

  // ETAPE 2 : QUENCH — eau à retirer de l'état intermédiaire pour remonter à T_amont
  // m_H2O = Qm_H2O_kg_h_intermediaire : composition du gaz À l'état intermédiaire (80°C sat)
  const Qeau = Qeau_remove_to_be_at_T(
    T, Teau, T_intermediaire,
    Qm_CO2_kg_h_intermediaire, Qm_H2O_kg_h_intermediaire,
    Qm_N2_kg_h_intermediaire, Qm_O2_kg_h_intermediaire
  );

  // COMPOSITION AMONT
  const Qm_CO2_kg_h = Qm_CO2_kg_h_intermediaire;
  const Qm_H2O_kg_h = Qm_H2O_kg_h_intermediaire - Qeau;
  const Qm_O2_kg_h  = Qm_O2_kg_h_intermediaire;
  const Qm_N2_kg_h  = Qm_N2_kg_h_intermediaire;
  const Qm_tot_kg_h = Qm_CO2_kg_h + Qm_H2O_kg_h + Qm_O2_kg_h + Qm_N2_kg_h;

  const Qv_CO2_Nm3_h = CO2_kg_m3(Qm_CO2_kg_h);
  const Qv_H2O_Nm3_h = H2O_kg_m3(Qm_H2O_kg_h);
  const Qv_O2_Nm3_h  = O2_kg_m3(Qm_O2_kg_h);
  const Qv_N2_Nm3_h  = N2_kg_m3(Qm_N2_kg_h);
  const Qv_sec_Nm3_h = Qv_CO2_Nm3_h + Qv_O2_Nm3_h + Qv_N2_Nm3_h;
  const Qv_wet_Nm3_h = Qv_sec_Nm3_h + Qv_H2O_Nm3_h;

  const O2_dry_pourcent     = Qv_sec_Nm3_h > 0 ? (Qv_O2_Nm3_h  / Qv_sec_Nm3_h) * 100 : 0;
  const O2_humide_pourcent  = Qv_wet_Nm3_h > 0 ? (Qv_O2_Nm3_h  / Qv_wet_Nm3_h) * 100 : 0;
  const H2O_pourcent        = Qv_wet_Nm3_h > 0 ? (Qv_H2O_Nm3_h / Qv_wet_Nm3_h) * 100 : 0;
  const N2_humide_pourcent  = Qv_wet_Nm3_h > 0 ? (Qv_N2_Nm3_h  / Qv_wet_Nm3_h) * 100 : 0;
  const CO2_dry_pourcent    = Qv_sec_Nm3_h > 0 ? (Qv_CO2_Nm3_h / Qv_sec_Nm3_h) * 100 : 0;
  const CO2_humide_pourcent = Qv_wet_Nm3_h > 0 ? (Qv_CO2_Nm3_h / Qv_wet_Nm3_h) * 100 : 0;

  const H_CO2_kj = fh_CO2(T) * Qm_CO2_kg_h;
  const H_H2O_kj = (fh_H2O(T) + Lv) * Qm_H2O_kg_h;
  const H_O2_kj  = fh_O2(T)  * Qm_O2_kg_h;
  const H_N2_kj  = fh_N2(T)  * Qm_N2_kg_h;
  const H_tot_kj = H_CO2_kj + H_H2O_kj + H_O2_kj + H_N2_kj;
  const H_tot_kW = H_tot_kj / 3600;

  const P_out_mmCE  = nodeData.result.dataFlow.P_mmCE;
  const P_mmCE      = P_out_mmCE - PDC_aero;
  const Qv_wet_m3_h = coeff_Nm3_to_m3(P_mmCE, T) * Qv_wet_Nm3_h;

  const Qeau_condensee_kg_h_tot = Qeau_condensee_kg_h + Qeau;

  const dataSCRUBBER = {
    'Q eau saturation [kg/h]': Qeau,
    'Q eau condensée [kg/h]': Qeau_condensee_kg_h_tot,
    PDC_aero,
    P_out_mmCE,
  };

  const dataFlow = {
    T_in: nodeData.result.dataFlow.T,
    T,
    P_mmCE,
    Qv_wet_m3_h,
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

  return { dataSCRUBBER, dataFlow };
};
