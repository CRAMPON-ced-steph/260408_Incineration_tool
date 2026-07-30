// batchCalculators.js
// Direct calculation functions for Calc. All batch mode.
// Each entry reads its own parameters from localStorage (mirroring what each Parameter_Tab does)
// and calls the underlying calculation function directly — no React component mounting needed.
// Every localStorage key is suffixed with `_${nodeId}` so multiple instances of the same
// equipment type can coexist with independent parameters.

import { performCalculation_STACK } from './STACK/STACK_calculations';
import { performCalculation_IDFAN } from './IDFAN/IDFAN_calculations';
import { performCalculation_IDFAN2 } from './IDFAN/IDFAN_calculations2';
import { performCalculation_BHF } from './BHF/BHF_calculations';
import { performCalculation_ELECTROFILTER } from './ELECTROFILTER/ELECTROFILTER_calculations';
import { performCalculation_CYCLONE } from './CYCLONE/CYCLONE_calculations';
import { performCalculation_REACTOR } from './REACTOR/REACTOR_calculations';
import { performCalculation_SCRUBBER_option_TinTout } from './SCRUBBER/SCRUBBER_calculations';
import { performCalculation_SCRUBBER_option_TinTsat } from './SCRUBBER/SCRUBBER_calculations2';
import { performCalculation_SCRUBBER_option_TsupTsat } from './SCRUBBER/SCRUBBER_calculations3';
import { performCalculation_QUENCH_option_T } from './QUENCH/QUENCH_calculations';
import { performCalculation_QUENCH_option_Qeau } from './QUENCH/QUENCH_calculations2';
import { performCalculation_DENOX_option_Qeau } from './DENOX/DENOX_calculations';
import { performCalculation_COOLINGTOWER_option_Qeau } from './COOLINGTOWER/COOLINGTOWER_calculations';
import { performCalculation_WATER_INJECTION_option_T } from './WATER_INJECTION/WATER_INJECTION_calculations';
import { performCalculation_WATER_INJECTION_option_Qeau } from './WATER_INJECTION/WATER_INJECTION_calculations2';
import { performCalculation_AIRINJECTION } from './AIRINJECTION/AIRINJECTION_calculations';
import { performCalculation_WHB_option_T_Qair } from './WHB/WHB_calculation_option1';
import { performCalculation_WHB_option_T_O2 } from './WHB/WHB_calculation_option2';
import { performCalculation_WHB_option_Qeau_Qair } from './WHB/WHB_calculation_option3';
import { performCalculation_WHB_option_Qeau_O2 } from './WHB/WHB_calculation_option4';
import { performCalculation_IACT } from './IACT/IACT_calculations';
import { performCalculation_RK } from './RK/RK_calculations1';
import { performCalculation_RK_with_WHB } from './RK/RK_calculations2';
import { performCalculation_FB_MS } from './FB/FB_calculation_MS';
import { performCalculation_FB_Qboue } from './FB/FB_calculation_Qboue';
import { performCalculation_GF } from './GF/GF_calculations';

// Helpers
const ls = (key, def) => { const v = localStorage.getItem(key); return v !== null ? v : def; };
const f  = (key, def) => parseFloat(ls(key, def));

export const batchCalcMap = {

  'STACK': (_nodeData, nodeId) => {
    const mode = ls(`STACK_inputMode_${nodeId}`, 'Qv_wet_Nm3_h');
    const flow =
      mode === 'Qv_dry_Nm3_h' ? f(`Qv_dry_Nm3_h_STACK_${nodeId}`, '35000')
      : mode === 'Qv_wet_m3_h' ? f(`Qv_wet_m3_h_STACK_${nodeId}`, '64000')
      : f(`Qv_wet_Nm3_h_STACK_${nodeId}`, '50000');
    return performCalculation_STACK(
      f(`Tstack_STACK_${nodeId}`, '80'),
      flow,
      f(`O2_dry_pourcent_STACK_${nodeId}`, '10'),
      f(`H2O_pourcent_STACK_${nodeId}`, '30'),
      f(`CO2_dry_pourcent_STACK_${nodeId}`, '10'),
      f(`P_out_mmCE_STACK_${nodeId}`, '100'),
      mode
    );
  },

  'IDFAN': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    const Type    = ls(`Type_IDFAN_${nodeId}`, 'OFF');
    const P_amont = f(`P_amont_IDFAN_${nodeId}`, '-250');
    const Rdt     = f(`Rdt_elec_IDFAN_${nodeId}`, '70');
    return Type === 'ON'
      ? performCalculation_IDFAN2(nodeData, P_amont, Rdt)
      : performCalculation_IDFAN(nodeData, P_amont, Rdt);
  },

  'BHF': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    return performCalculation_BHF(
      nodeData,
      f(`T_air_decolmatation_BHF_${nodeId}`, '15'),
      f(`Qair_decolmatation_BHF_${nodeId}`, '500'),
      f(`T_amont_BHF_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 170)),
      f(`PDC_aero_BHF_${nodeId}`, '200')
    );
  },

  'ELECTROFILTER': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    return performCalculation_ELECTROFILTER(
      nodeData,
      f(`T_air_decolmatation_ELECTROFILTER_${nodeId}`, '15'),
      f(`Qair_decolmatation_ELECTROFILTER_${nodeId}`, '0'),
      f(`T_amont_ELECTROFILTER_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 170)),
      f(`PDC_aero_ELECTROFILTER_${nodeId}`, '100')
    );
  },

  'CYCLONE': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    return performCalculation_CYCLONE(
      nodeData,
      f(`T_air_parasite_CYCLONE_${nodeId}`, '15'),
      f(`Qair_parasite_CYCLONE_${nodeId}`, '0'),
      f(`T_amont_CYCLONE_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 15)),
      f(`PDC_aero_CYCLONE_${nodeId}`, '10')
    );
  },

  'REACTOR': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    return performCalculation_REACTOR(
      nodeData,
      f(`T_amont_REACTOR_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 200)),
      f(`T_air_REACTOR_${nodeId}`, '20'),
      f(`PDC_aero_REACTOR_${nodeId}`, '20'),
      ls(`reagentType_REACTOR_${nodeId}`, 'CAP'),
      f(`Besoin_air_pulverisation_lime_Nm3_kg_REACTOR_${nodeId}`, '0.5'),
      f(`Besoin_air_pulverisation_cap_Nm3_kg_REACTOR_${nodeId}`, '0.5'),
      f(`Concentration_cap_mg_cap_Nm3_FG_REACTOR_${nodeId}`, '0.1'),
      f(`Qv_air_parasite_Nm3_h_REACTOR_${nodeId}`, '0')
    );
  },

  'SCRUBBER': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    const bilanType = ls(`SCRUBBER_bilanType_${nodeId}`, 'TIN_TOUT');
    const PDC = f(`PDC_aero_SCRUBBER_${nodeId}`, '50');
    if (bilanType === 'TIN_TOUT') {
      return performCalculation_SCRUBBER_option_TinTout(nodeData, PDC);
    }
    const Teau = f(`Teau_SCRUBBER_${nodeId}`, '15');
    const Tamont = f(`T_amont_SCRUBBER_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 50));
    if (bilanType === 'T_SUP_TSAT') {
      return performCalculation_SCRUBBER_option_TsupTsat(nodeData, Teau, Tamont, PDC);
    }
    return performCalculation_SCRUBBER_option_TinTsat(nodeData, Teau, Tamont, PDC);
  },

  'QUENCH': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    const bilanType = ls(`QUENCH_bilanType_${nodeId}`, 'TEMPERATURE_BALANCE');
    const Teau = f(`Teau_QUENCH_${nodeId}`, '15');
    const PDC  = f(`PDC_aero_QUENCH_${nodeId}`, '10');
    if (bilanType === 'TEMPERATURE_BALANCE') {
      return performCalculation_QUENCH_option_T(
        nodeData,
        f(`T_amont_QUENCH_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 200)),
        Teau, PDC
      );
    }
    return performCalculation_QUENCH_option_Qeau(nodeData, f(`Qeau_QUENCH_${nodeId}`, '0'), Teau, PDC);
  },

  'DENOX': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    return performCalculation_DENOX_option_Qeau(
      nodeData,
      f(`targetNOx_DENOX_${nodeId}`, '150'),
      f(`sprayWaterTemp_DENOX_${nodeId}`, '15'),
      f(`coeffStoech_DENOX_${nodeId}`, '1.2'),
      f(`solutionConc_DENOX_${nodeId}`, '25'),
      f(`solutionDensity_DENOX_${nodeId}`, '908'),
      f(`sprayFlowrate_DENOX_${nodeId}`, '15'),
      f(`pdc_DENOX_${nodeId}`, '50')
    );
  },

  'COOLINGTOWER': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    return performCalculation_COOLINGTOWER_option_Qeau(
      nodeData,
      f(`Teau_COOLINGTOWER_${nodeId}`, '15'),
      f(`T_steam_C_COOLINGTOWER_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 120)),
      f(`Qeau_kg_h_COOLINGTOWER_${nodeId}`, '0'),
      f(`Qsteam_kg_h_COOLINGTOWER_${nodeId}`, '0'),
      f(`PDC_aero_COOLINGTOWER_${nodeId}`, '20')
    );
  },

  'WATER_INJECTION': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    const bilanType = ls(`WATER_INJECTION_bilanType_${nodeId}`, 'TEMPERATURE_BALANCE');
    const Teau = f(`Teau_WATER_INJECTION_${nodeId}`, '15');
    const PDC  = f(`PDC_aero_WATER_INJECTION_${nodeId}`, '10');
    if (bilanType === 'TEMPERATURE_BALANCE') {
      return performCalculation_WATER_INJECTION_option_T(
        nodeData,
        f(`T_amont_WATER_INJECTION_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 200)),
        Teau, PDC
      );
    }
    return performCalculation_WATER_INJECTION_option_Qeau(
      nodeData, f(`Qeau_WATER_INJECTION_${nodeId}`, '0'), Teau, PDC
    );
  },

  'AIRINJECTION': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    return performCalculation_AIRINJECTION(
      nodeData,
      f(`T_air_parasite_AIRINJECTION_${nodeId}`, '15'),
      f(`Qair_parasite_AIRINJECTION_${nodeId}`, '0'),
      f(`T_amont_AIRINJECTION_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 15)),
      f(`PDC_aero_AIRINJECTION_${nodeId}`, '10')
    );
  },

  'WHB': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    const bilanType    = ls(`WHB_bilanType_${nodeId}`, 'TEMPERATURE_BALANCE');
    const bilanTypeAir = ls(`bilanTypeAir_WHB_${nodeId}`, 'PARASITIC_AIR_FLOW');
    const bilanTypeVap = ls(`bilanTypeVapeur_WHB_${nodeId}`, 'SATURATED_STEAM');

    const base = [
      nodeData,
      f(`T_eau_alimentation_C_WHB_${nodeId}`, '130'),
      f(`Q_eau_purge_pourcent_WHB_${nodeId}`, '1.5'),
      f(`T_air_exterieur_C_WHB_${nodeId}`, '15'),
      f(`P_th_pourcent_WHB_${nodeId}`, '2'),
      f(`P_vapeur_bar_WHB_${nodeId}`, '30'),
      bilanTypeVap,
      f(`T_vapeur_surchauffee_C_WHB_${nodeId}`, '250'),
    ];

    const lastTemp = bilanType === 'TEMPERATURE_BALANCE'
      ? f(`T_amont_WHB_C_${nodeId}`, '950')
      : f(`Q_eau_alimentation_WHB_${nodeId}`, '0');

    const lastAir = bilanTypeAir === 'PARASITIC_AIR_FLOW'
      ? f(`Q_air_parasite_Nm3_h_WHB_${nodeId}`, '1000')
      : parseFloat(nodeData?.result?.dataFlow?.O2_dry_pourcent ?? ls(`O2_mesure_WHB_${nodeId}`, '0'));

    const params = [...base, lastTemp, lastAir];

    if (bilanType === 'TEMPERATURE_BALANCE' && bilanTypeAir === 'PARASITIC_AIR_FLOW')
      return performCalculation_WHB_option_T_Qair(...params);
    if (bilanType === 'TEMPERATURE_BALANCE' && bilanTypeAir === 'O2_MEASUREMENT')
      return performCalculation_WHB_option_T_O2(...params);
    if (bilanType === 'WATER_FLOW_BALANCE' && bilanTypeAir === 'PARASITIC_AIR_FLOW')
      return performCalculation_WHB_option_Qeau_Qair(...params);
    return performCalculation_WHB_option_Qeau_O2(...params);
  },

  'IACT': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    return performCalculation_IACT(
      nodeData,
      f(`T_air_decolmatation_IACT_${nodeId}`, '15'),
      f(`T_air_chauffe_IACT_${nodeId}`, '150'),
      f(`Rendement_echange_IACT_${nodeId}`, '95'),
      f(`T_amont_IACT_${nodeId}`, String(nodeData?.result?.dataFlow?.T ?? 200)),
      f(`PDC_aero_IACT_${nodeId}`, '10')
    );
  },

  'RK+SCC': (nodeData, nodeId) => {
    const bilanType_whb      = ls(`bilanType_whb_RK_${nodeId}`, 'WITH_WHB');
    const bilanType_NCV_Masse = ls(`bilanType_NCV_Masse_RK_${nodeId}`, 'NCV_MODE');
    const Tair    = f(`Tair_RK_C_${nodeId}`, '20');
    const Thermal = f(`Thermal_losses_MW_RK_${nodeId}`, '1');
    const NCV     = f(`NCV_kcal_kg_RK_${nodeId}`, '2200');
    const Masse   = f(`Masse_dechet_kg_h_RK_${nodeId}`, '5000');

    const receivedDataFlow = nodeData?.result?.dataFlow || {};
    if (bilanType_whb === 'WITH_WHB') {
      if (!nodeData?.result?.data_Air_WHB) return null; // WHB data required
      const r = performCalculation_RK_with_WHB(nodeData, Tair, Thermal, NCV, Masse, bilanType_NCV_Masse);
      return r ? { ...r, dataFlow: receivedDataFlow } : null;
    }
    const r = performCalculation_RK(nodeData, Tair, Thermal, NCV, Masse, bilanType_NCV_Masse);
    return r ? { ...r, dataFlow: receivedDataFlow } : null;
  },

  'FB': (nodeData, nodeId) => {
    const bilanType = ls(`FB_bilanType_${nodeId}`, 'DRY SOLIDS');
    const Tair      = f(`Tair_FB_C_${nodeId}`, '15');
    const Thermal   = f(`Thermal_losses_MW_FB_${nodeId}`, '1');
    const wasteType = ls(`wasteType_FB_${nodeId}`, 'PRIMAIRE');
    const MV        = f(`MV_percent_FB_${nodeId}`, '70');
    const receivedDataFlow = nodeData?.result?.dataFlow || {};

    const r = bilanType === 'DRY SOLIDS'
      ? performCalculation_FB_MS(nodeData, Tair, Thermal, f(`Q_boue_kg_h_FB_${nodeId}`, '1000'), wasteType, MV)
      : performCalculation_FB_Qboue(nodeData, Tair, Thermal, wasteType, f(`MS_percent_FB_${nodeId}`, '25'), MV);
    return r ? { ...r, dataFlow: receivedDataFlow } : null;
  },

  'GF': (nodeData, nodeId) => {
    if (!nodeData?.result) return null;
    const receivedDataFlow = nodeData?.result?.dataFlow || {};
    const r = performCalculation_GF(
      nodeData,
      f(`Waste_flow_rate_kg_h_GF_${nodeId}`, '1000'),
      f(`Pressure_losse_mmCE_GF_${nodeId}`, '100'),
      f(`Combustion_air_flowrate_Nm3_h_GF_${nodeId}`, '10000'),
      f(`Measured_air_temperature_C_GF_${nodeId}`, '20'),
      f(`Q_feed_water_kg_h_GF_${nodeId}`, '0'),
      f(`T_feed_water_C_GF_${nodeId}`, '0'),
      f(`Blowdown_pourcent_GF_${nodeId}`, '0'),
      f(`Q_saturated_steam_GF_${nodeId}`, '0'),
      f(`Steam_pressure_gauge_bar_GF_${nodeId}`, '0'),
      f(`super_heated_steam_temperature_C_GF_${nodeId}`, '0'),
      f(`Q_superheated_steam_kg_h_GF_${nodeId}`, '0'),
      f(`P_superheated_steam_bar_GF_${nodeId}`, '0'),
      f(`T_superheated_water_boiler_C_GF_${nodeId}`, '0'),
      f(`Q_superheated_water_kg_h_GF_${nodeId}`, '0'),
      f(`Q_recycled_flue_gas_Nm3_h_GF_${nodeId}`, '0'),
      f(`T_recycled_flue_gas_C_GF_${nodeId}`, '0'),
      f(`Injected_water_temperature_C_GF_${nodeId}`, '0'),
      f(`Q_treatment_injected_water_kg_h_GF_${nodeId}`, '0'),
      f(`Auxiliary_fuel_kWh_GF_${nodeId}`, '0'),
      f(`Bottom_ash_pourcent_GF_${nodeId}`, '0'),
      f(`Bottom_ash_temperature_C_GF_${nodeId}`, '0'),
      f(`Unburnt_bottom_ash_pourcent_GF_${nodeId}`, '0'),
      f(`Unburnt_LCV_kcal_kg_GF_${nodeId}`, '0'),
      f(`Reference_temperature_C_GF_${nodeId}`, '15'),
      f(`Q_air_ingress_Nm3_h_GF_${nodeId}`, '0'),
      f(`T_air_ingress_C_GF_${nodeId}`, '20')
    );
    return r ? { ...r, dataFlow: receivedDataFlow } : null;
  },
};
