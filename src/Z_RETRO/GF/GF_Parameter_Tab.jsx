import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { performCalculation_GF } from './GF_calculations';
import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import CalculateSendButton from '../../C_Components/CalculateSendButton';
import ToggleButton from '../../C_Components/toggleButton';

import GF_Retro_Rapport from './GF_Retro_Rapport';
import '../../index.css';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './GF_traduction';
import useBatchCalcResult from '../../C_Components/useBatchCalcResult';

// Constantes pour localStorage (suffixées par nodeId)
const getStorageKeys = (nodeId) => ({
  // Paramètres principaux
  WASTE_FLOW_RATE: `Waste_flow_rate_kg_h_GF_${nodeId}`,
  PRESSURE_LOSS: `Pressure_losse_mmCE_GF_${nodeId}`,
  COMBUSTION_AIR_FLOWRATE: `Combustion_air_flowrate_Nm3_h_GF_${nodeId}`,
  MEASURED_AIR_TEMPERATURE: `Measured_air_temperature_C_GF_${nodeId}`,
  FEED_WATER_FLOW: `Q_feed_water_kg_h_GF_${nodeId}`,
  FEED_WATER_TEMP: `T_feed_water_C_GF_${nodeId}`,
  BLOWDOWN_PERCENT: `Blowdown_pourcent_GF_${nodeId}`,

  // Paramètres conditionnels
  Q_AIR_INGRESS: `Q_air_ingress_Nm3_h_GF_${nodeId}`,
  T_AIR_INGRESS: `T_air_ingress_C_GF_${nodeId}`,
  Q_SATURATED_STEAM: `Q_saturated_steam_GF_${nodeId}`,
  STEAM_PRESSURE: `Steam_pressure_gauge_bar_GF_${nodeId}`,
  SUPERHEATED_STEAM_TEMP: `super_heated_steam_temperature_C_GF_${nodeId}`,
  Q_SUPERHEATED_STEAM: `Q_superheated_steam_kg_h_GF_${nodeId}`,
  P_SUPERHEATED_STEAM: `P_superheated_steam_bar_GF_${nodeId}`,
  T_SUPERHEATED_WATER: `T_superheated_water_boiler_C_GF_${nodeId}`,
  Q_SUPERHEATED_WATER: `Q_superheated_water_kg_h_GF_${nodeId}`,
  Q_RECYCLED_FLUE_GAS: `Q_recycled_flue_gas_Nm3_h_GF_${nodeId}`,
  T_RECYCLED_FLUE_GAS: `T_recycled_flue_gas_C_GF_${nodeId}`,
  INJECTED_WATER_TEMP: `Injected_water_temperature_C_GF_${nodeId}`,
  Q_TREATMENT_INJECTED_WATER: `Q_treatment_injected_water_kg_h_GF_${nodeId}`,
  AUXILIARY_FUEL: `Auxiliary_fuel_kWh_GF_${nodeId}`,
  BOTTOM_ASH_PERCENT: `Bottom_ash_pourcent_GF_${nodeId}`,
  BOTTOM_ASH_TEMP: `Bottom_ash_temperature_C_GF_${nodeId}`,
  UNBURNT_BOTTOM_ASH: `Unburnt_bottom_ash_pourcent_GF_${nodeId}`,
  UNBURNT_LCV: `Unburnt_LCV_kcal_kg_GF_${nodeId}`,
  REFERENCE_TEMP: `Reference_temperature_C_GF_${nodeId}`,

  // États des toggles
  SATURATED_STEAM_ENABLED: `saturatedSteamEnabled_GF_${nodeId}`,
  SUPERHEATED_STEAM_ENABLED: `superheatedSteamEnabled_GF_${nodeId}`,
  SUPERHEATED_WATER_ENABLED: `superheatedWaterEnabled_GF_${nodeId}`,
  RECYCLED_FLUE_GAS_ENABLED: `recycledFlueGasEnabled_GF_${nodeId}`,
  INJECTED_WATER_ENABLED: `injectedWaterEnabled_GF_${nodeId}`,
  AIR_INGRESS_ENABLED: `AirIngressEnabled_GF_${nodeId}`,

  CALCULATION_RESULT: `calculationResult_GF_${nodeId}`,
  DIAGRAM_MODE: `GF_diagramMode_${nodeId}`
});

// Valeurs par défaut
const DEFAULT_VALUES = {
  // Paramètres principaux
  Waste_flow_rate_kg_h: '1000',
  Pressure_losse_mmCE: '100',
  Combustion_air_flowrate_Nm3_h: '10000',
  Measured_air_temperature_C: '20',
  Q_feed_water_kg_h: '0',
  T_feed_water_C: '0',
  Blowdown_pourcent: '0',
  
  // Paramètres conditionnels
  Q_air_ingress_Nm3_h: '0',
  T_air_ingress_C: '20',
  Q_saturated_steam: '0',
  Steam_pressure_gauge_bar: '0',
  super_heated_steam_temperature_C: '0',
  Q_superheated_steam_kg_h: '0',
  P_superheated_steam_bar: '0',
  T_superheated_water_boiler_C: '0',
  Q_superheated_water_kg_h: '0',
  Q_recycled_flue_gas_Nm3_h: '0',
  T_recycled_flue_gas_C: '0',
  Injected_water_temperature_C: '0',
  Q_treatment_injected_water_kg_h: '0',
  Auxiliary_fuel_kWh: '0',
  Bottom_ash_pourcent: '15',
  Bottom_ash_temperature_C: '400',
  Unburnt_bottom_ash_pourcent: '2',
  Unburnt_LCV_kcal_kg: '7882',
  Reference_temperature_C: '20',
  
  // États des toggles
  saturatedSteamEnabled: false,
  superheatedSteamEnabled: false,
  superheatedWaterEnabled: false,
  recycledFlueGasEnabled: false,
  injectedWaterEnabled: false,
  AirIngressEnabled: false,
  diagramMode: 'NO'
};

const GF_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage, nodeId, autoTrigger = false }) => {
  const STORAGE_KEYS = useMemo(() => getStorageKeys(nodeId), [nodeId]);

  // États principaux - Paramètres de base
  const [Waste_flow_rate_kg_h, setWaste_flow_rate_kg_h] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).WASTE_FLOW_RATE) || DEFAULT_VALUES.Waste_flow_rate_kg_h
  );
  const [Pressure_losse_mmCE, setPressure_losse_mmCE] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).PRESSURE_LOSS) || DEFAULT_VALUES.Pressure_losse_mmCE
  );
  const [Combustion_air_flowrate_Nm3_h, setCombustion_air_flowrate_Nm3_h] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).COMBUSTION_AIR_FLOWRATE) || DEFAULT_VALUES.Combustion_air_flowrate_Nm3_h
  );
  const [Measured_air_temperature_C, setMeasured_air_temperature_C] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).MEASURED_AIR_TEMPERATURE) || DEFAULT_VALUES.Measured_air_temperature_C
  );
  const [Q_feed_water_kg_h, setQ_feed_water_kg_h] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).FEED_WATER_FLOW) || DEFAULT_VALUES.Q_feed_water_kg_h
  );
  const [T_feed_water_C, setT_feed_water_C] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).FEED_WATER_TEMP) || DEFAULT_VALUES.T_feed_water_C
  );
  const [Blowdown_pourcent, setBlowdown_pourcent] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).BLOWDOWN_PERCENT) || DEFAULT_VALUES.Blowdown_pourcent
  );

  // États conditionnels - Sections avec toggles
  const [Q_air_ingress_Nm3_h, setQ_air_ingress_Nm3_h] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).Q_AIR_INGRESS) || DEFAULT_VALUES.Q_air_ingress_Nm3_h
  );
  const [T_air_ingress_C, setT_air_ingress_C] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).T_AIR_INGRESS) || DEFAULT_VALUES.T_air_ingress_C
  );

  // États vapeur saturée
  const [Q_saturated_steam, setQ_saturated_steam] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).Q_SATURATED_STEAM) || DEFAULT_VALUES.Q_saturated_steam
  );
  const [Steam_pressure_gauge_bar, setSteam_pressure_gauge_bar] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).STEAM_PRESSURE) || DEFAULT_VALUES.Steam_pressure_gauge_bar
  );

  // États vapeur surchauffée
  const [super_heated_steam_temperature_C, setSuper_heated_steam_temperature_C] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).SUPERHEATED_STEAM_TEMP) || DEFAULT_VALUES.super_heated_steam_temperature_C
  );
  const [Q_superheated_steam_kg_h, setQ_superheated_steam_kg_h] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).Q_SUPERHEATED_STEAM) || DEFAULT_VALUES.Q_superheated_steam_kg_h
  );
  const [P_superheated_steam_bar, setP_superheated_steam_bar] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).P_SUPERHEATED_STEAM) || DEFAULT_VALUES.P_superheated_steam_bar
  );

  // États eau surchauffée
  const [T_superheated_water_boiler_C, setT_superheated_water_boiler_C] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).T_SUPERHEATED_WATER) || DEFAULT_VALUES.T_superheated_water_boiler_C
  );
  const [Q_superheated_water_kg_h, setQ_superheated_water_kg_h] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).Q_SUPERHEATED_WATER) || DEFAULT_VALUES.Q_superheated_water_kg_h
  );

  // États gaz recyclés
  const [Q_recycled_flue_gas_Nm3_h, setQ_recycled_flue_gas_Nm3_h] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).Q_RECYCLED_FLUE_GAS) || DEFAULT_VALUES.Q_recycled_flue_gas_Nm3_h
  );
  const [T_recycled_flue_gas_C, setT_recycled_flue_gas_C] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).T_RECYCLED_FLUE_GAS) || DEFAULT_VALUES.T_recycled_flue_gas_C
  );

  // États eau injectée
  const [Injected_water_temperature_C, setInjected_water_temperature_C] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).INJECTED_WATER_TEMP) || DEFAULT_VALUES.Injected_water_temperature_C
  );
  const [Q_treatment_injected_water_kg_h, setQ_treatment_injected_water_kg_h] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).Q_TREATMENT_INJECTED_WATER) || DEFAULT_VALUES.Q_treatment_injected_water_kg_h
  );

  // États autres paramètres
  const [Auxiliary_fuel_kWh, setAuxiliary_fuel_kWh] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).AUXILIARY_FUEL) || DEFAULT_VALUES.Auxiliary_fuel_kWh
  );
  const [Bottom_ash_pourcent, setBottom_ash_pourcent] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).BOTTOM_ASH_PERCENT) || DEFAULT_VALUES.Bottom_ash_pourcent
  );
  const [Bottom_ash_temperature_C, setBottom_ash_temperature_C] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).BOTTOM_ASH_TEMP) || DEFAULT_VALUES.Bottom_ash_temperature_C
  );
  const [Unburnt_bottom_ash_pourcent, setUnburnt_bottom_ash_pourcent] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).UNBURNT_BOTTOM_ASH) || DEFAULT_VALUES.Unburnt_bottom_ash_pourcent
  );
  const [Unburnt_LCV_kcal_kg, setUnburnt_LCV_kcal_kg] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).UNBURNT_LCV) || DEFAULT_VALUES.Unburnt_LCV_kcal_kg
  );
  const [Reference_temperature_C, setReference_temperature_C] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).REFERENCE_TEMP) || DEFAULT_VALUES.Reference_temperature_C
  );

  // États des toggles
  const [saturatedSteamEnabled, setSaturatedSteamEnabled] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).SATURATED_STEAM_ENABLED) === 'true'
  );
  const [superheatedSteamEnabled, setSuperheatedSteamEnabled] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).SUPERHEATED_STEAM_ENABLED) === 'true'
  );
  const [superheatedWaterEnabled, setSuperheatedWaterEnabled] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).SUPERHEATED_WATER_ENABLED) === 'true'
  );
  const [recycledFlueGasEnabled, setRecycledFlueGasEnabled] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).RECYCLED_FLUE_GAS_ENABLED) === 'true'
  );
  const [injectedWaterEnabled, setInjectedWaterEnabled] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).INJECTED_WATER_ENABLED) === 'true'
  );
  const [AirIngressEnabled, setAirIngressEnabled] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).AIR_INGRESS_ENABLED) === 'true'
  );
  const [diagramMode, setDiagramMode] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).DIAGRAM_MODE) || DEFAULT_VALUES.diagramMode
  );

  // États pour l'interface
  const [showReport, setShowReport] = useState(false);
  const [calculationResult_GF, setCalculationResult_GF] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKeys(nodeId).CALCULATION_RESULT);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Erreur lors du chargement des résultats:', error);
      return null;
    }
  });
  useBatchCalcResult(nodeId, setCalculationResult_GF);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Récupération des traductions avec mémorisation
  const { languageCode, t } = useMemo(() => {
    const code = getLanguageCode(currentLanguage);
    const translationsObj = translations[code] || translations['en'];
    return { languageCode: code, t: translationsObj };
  }, [currentLanguage]);

  // Sauvegarde centralisée dans localStorage
  useEffect(() => {
    const saveToLocalStorage = () => {
      try {
        const dataToSave = {
          // Paramètres principaux
          [STORAGE_KEYS.WASTE_FLOW_RATE]: Waste_flow_rate_kg_h,
          [STORAGE_KEYS.PRESSURE_LOSS]: Pressure_losse_mmCE,
          [STORAGE_KEYS.COMBUSTION_AIR_FLOWRATE]: Combustion_air_flowrate_Nm3_h,
          [STORAGE_KEYS.MEASURED_AIR_TEMPERATURE]: Measured_air_temperature_C,
          [STORAGE_KEYS.FEED_WATER_FLOW]: Q_feed_water_kg_h,
          [STORAGE_KEYS.FEED_WATER_TEMP]: T_feed_water_C,
          [STORAGE_KEYS.BLOWDOWN_PERCENT]: Blowdown_pourcent,
          
          // Paramètres conditionnels
          [STORAGE_KEYS.Q_AIR_INGRESS]: Q_air_ingress_Nm3_h,
          [STORAGE_KEYS.T_AIR_INGRESS]: T_air_ingress_C,
          [STORAGE_KEYS.Q_SATURATED_STEAM]: Q_saturated_steam,
          [STORAGE_KEYS.STEAM_PRESSURE]: Steam_pressure_gauge_bar,
          [STORAGE_KEYS.SUPERHEATED_STEAM_TEMP]: super_heated_steam_temperature_C,
          [STORAGE_KEYS.Q_SUPERHEATED_STEAM]: Q_superheated_steam_kg_h,
          [STORAGE_KEYS.P_SUPERHEATED_STEAM]: P_superheated_steam_bar,
          [STORAGE_KEYS.T_SUPERHEATED_WATER]: T_superheated_water_boiler_C,
          [STORAGE_KEYS.Q_SUPERHEATED_WATER]: Q_superheated_water_kg_h,
          [STORAGE_KEYS.Q_RECYCLED_FLUE_GAS]: Q_recycled_flue_gas_Nm3_h,
          [STORAGE_KEYS.T_RECYCLED_FLUE_GAS]: T_recycled_flue_gas_C,
          [STORAGE_KEYS.INJECTED_WATER_TEMP]: Injected_water_temperature_C,
          [STORAGE_KEYS.Q_TREATMENT_INJECTED_WATER]: Q_treatment_injected_water_kg_h,
          [STORAGE_KEYS.AUXILIARY_FUEL]: Auxiliary_fuel_kWh,
          [STORAGE_KEYS.BOTTOM_ASH_PERCENT]: Bottom_ash_pourcent,
          [STORAGE_KEYS.BOTTOM_ASH_TEMP]: Bottom_ash_temperature_C,
          [STORAGE_KEYS.UNBURNT_BOTTOM_ASH]: Unburnt_bottom_ash_pourcent,
          [STORAGE_KEYS.UNBURNT_LCV]: Unburnt_LCV_kcal_kg,
          [STORAGE_KEYS.REFERENCE_TEMP]: Reference_temperature_C,
          
          // États des toggles
          [STORAGE_KEYS.SATURATED_STEAM_ENABLED]: saturatedSteamEnabled.toString(),
          [STORAGE_KEYS.SUPERHEATED_STEAM_ENABLED]: superheatedSteamEnabled.toString(),
          [STORAGE_KEYS.SUPERHEATED_WATER_ENABLED]: superheatedWaterEnabled.toString(),
          [STORAGE_KEYS.RECYCLED_FLUE_GAS_ENABLED]: recycledFlueGasEnabled.toString(),
          [STORAGE_KEYS.INJECTED_WATER_ENABLED]: injectedWaterEnabled.toString(),
          [STORAGE_KEYS.AIR_INGRESS_ENABLED]: AirIngressEnabled.toString(),
          [STORAGE_KEYS.DIAGRAM_MODE]: diagramMode
        };

        Object.entries(dataToSave).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
    };

    saveToLocalStorage();
  }, [
    // Paramètres principaux
    Waste_flow_rate_kg_h, Pressure_losse_mmCE, Combustion_air_flowrate_Nm3_h, Measured_air_temperature_C,
    Q_feed_water_kg_h, T_feed_water_C, Blowdown_pourcent,
    // Paramètres conditionnels
    Q_air_ingress_Nm3_h, T_air_ingress_C, Q_saturated_steam, Steam_pressure_gauge_bar,
    super_heated_steam_temperature_C, Q_superheated_steam_kg_h, P_superheated_steam_bar,
    T_superheated_water_boiler_C, Q_superheated_water_kg_h, Q_recycled_flue_gas_Nm3_h,
    T_recycled_flue_gas_C, Injected_water_temperature_C, Q_treatment_injected_water_kg_h,
    Auxiliary_fuel_kWh, Bottom_ash_pourcent, Bottom_ash_temperature_C, Unburnt_bottom_ash_pourcent,
    Unburnt_LCV_kcal_kg, Reference_temperature_C,
    // États des toggles
    saturatedSteamEnabled, superheatedSteamEnabled, superheatedWaterEnabled,
    recycledFlueGasEnabled, injectedWaterEnabled, AirIngressEnabled,
    diagramMode
  ]);

  // Sauvegarde des résultats de calcul
  useEffect(() => {
    if (calculationResult_GF) {
      try {
        localStorage.setItem(STORAGE_KEYS.CALCULATION_RESULT, JSON.stringify(calculationResult_GF));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [calculationResult_GF]);

  // Validation des entrées
  const validateInputs = useCallback(() => {
    const inputs = {
      Waste_flow_rate_kg_h: parseFloat(Waste_flow_rate_kg_h),
      Pressure_losse_mmCE: parseFloat(Pressure_losse_mmCE),
      Combustion_air_flowrate_Nm3_h: parseFloat(Combustion_air_flowrate_Nm3_h),
      Measured_air_temperature_C: parseFloat(Measured_air_temperature_C),
      Q_feed_water_kg_h: parseFloat(Q_feed_water_kg_h),
      T_feed_water_C: parseFloat(T_feed_water_C),
      Blowdown_pourcent: parseFloat(Blowdown_pourcent),
      Q_air_ingress_Nm3_h: parseFloat(Q_air_ingress_Nm3_h),
      T_air_ingress_C: parseFloat(T_air_ingress_C),
      Q_saturated_steam: parseFloat(Q_saturated_steam),
      Steam_pressure_gauge_bar: parseFloat(Steam_pressure_gauge_bar),
      super_heated_steam_temperature_C: parseFloat(super_heated_steam_temperature_C),
      Q_superheated_steam_kg_h: parseFloat(Q_superheated_steam_kg_h),
      P_superheated_steam_bar: parseFloat(P_superheated_steam_bar),
      T_superheated_water_boiler_C: parseFloat(T_superheated_water_boiler_C),
      Q_superheated_water_kg_h: parseFloat(Q_superheated_water_kg_h),
      Q_recycled_flue_gas_Nm3_h: parseFloat(Q_recycled_flue_gas_Nm3_h),
      T_recycled_flue_gas_C: parseFloat(T_recycled_flue_gas_C),
      Injected_water_temperature_C: parseFloat(Injected_water_temperature_C),
      Q_treatment_injected_water_kg_h: parseFloat(Q_treatment_injected_water_kg_h),
      Auxiliary_fuel_kWh: parseFloat(Auxiliary_fuel_kWh),
      Bottom_ash_pourcent: parseFloat(Bottom_ash_pourcent),
      Bottom_ash_temperature_C: parseFloat(Bottom_ash_temperature_C),
      Unburnt_bottom_ash_pourcent: parseFloat(Unburnt_bottom_ash_pourcent),
      Unburnt_LCV_kcal_kg: parseFloat(Unburnt_LCV_kcal_kg),
      Reference_temperature_C: parseFloat(Reference_temperature_C)
    };

    // Validation des valeurs numériques
    for (const [key, value] of Object.entries(inputs)) {
      if (isNaN(value)) {
        throw new Error(`${t.InvalidInput}: ${key}`);
      }
    }

    // Validations spécifiques aux contraintes physiques
    if (inputs.Waste_flow_rate_kg_h < 0) {
      throw new Error(`${t.InvalidInput}: Waste flow rate cannot be negative`);
    }
    if (inputs.Combustion_air_flowrate_Nm3_h < 0) {
      throw new Error(`${t.InvalidInput}: Air flow rate cannot be negative`);
    }
    if (inputs.Blowdown_pourcent < 0 || inputs.Blowdown_pourcent > 100) {
      throw new Error(`${t.InvalidInput}: Blowdown percentage must be between 0-100%`);
    }
    if (inputs.Bottom_ash_pourcent < 0 || inputs.Bottom_ash_pourcent > 100) {
      throw new Error(`${t.InvalidInput}: Bottom ash percentage must be between 0-100%`);
    }
    if (inputs.Unburnt_bottom_ash_pourcent < 0 || inputs.Unburnt_bottom_ash_pourcent > 100) {
      throw new Error(`${t.InvalidInput}: Unburnt ash percentage must be between 0-100%`);
    }

    return inputs;
  }, [
    Waste_flow_rate_kg_h, Pressure_losse_mmCE, Combustion_air_flowrate_Nm3_h, Measured_air_temperature_C,
    Q_feed_water_kg_h, T_feed_water_C, Blowdown_pourcent, Q_air_ingress_Nm3_h, T_air_ingress_C,
    Q_saturated_steam, Steam_pressure_gauge_bar, super_heated_steam_temperature_C, Q_superheated_steam_kg_h,
    P_superheated_steam_bar, T_superheated_water_boiler_C, Q_superheated_water_kg_h, Q_recycled_flue_gas_Nm3_h,
    T_recycled_flue_gas_C, Injected_water_temperature_C, Q_treatment_injected_water_kg_h, Auxiliary_fuel_kWh,
    Bottom_ash_pourcent, Bottom_ash_temperature_C, Unburnt_bottom_ash_pourcent, Unburnt_LCV_kcal_kg,
    Reference_temperature_C, t
  ]);

  // Gestion du calcul principal
  const handleSendData = useCallback(async () => {
    if (!nodeData?.result) {
      alert(t.NoInputData);
      return;
    }

    setIsCalculating(true);
    
    try {
      const validatedInputs = validateInputs();

      const result = performCalculation_GF(
        nodeData,
        validatedInputs.Waste_flow_rate_kg_h,
        validatedInputs.Pressure_losse_mmCE,
        validatedInputs.Combustion_air_flowrate_Nm3_h,
        validatedInputs.Measured_air_temperature_C,
        validatedInputs.Q_feed_water_kg_h,
        validatedInputs.T_feed_water_C,
        validatedInputs.Blowdown_pourcent,
        validatedInputs.Q_saturated_steam,
        validatedInputs.Steam_pressure_gauge_bar,
        validatedInputs.super_heated_steam_temperature_C,
        validatedInputs.Q_superheated_steam_kg_h,
        validatedInputs.P_superheated_steam_bar,
        validatedInputs.T_superheated_water_boiler_C,
        validatedInputs.Q_superheated_water_kg_h,
        validatedInputs.Q_recycled_flue_gas_Nm3_h,
        validatedInputs.T_recycled_flue_gas_C,
        validatedInputs.Injected_water_temperature_C,
        validatedInputs.Q_treatment_injected_water_kg_h,
        validatedInputs.Auxiliary_fuel_kWh,
        validatedInputs.Bottom_ash_pourcent,
        validatedInputs.Bottom_ash_temperature_C,
        validatedInputs.Unburnt_bottom_ash_pourcent,
        validatedInputs.Unburnt_LCV_kcal_kg,
        validatedInputs.Reference_temperature_C,
        validatedInputs.Q_air_ingress_Nm3_h,
        validatedInputs.T_air_ingress_C
      );

      setCalculationResult_GF(result);
      hasCalculatedOnce.current = true;
      if (diagramMode === 'YES') {
        const pointE = { x: result.Waste_flow_rate_kg_h || 0, y: result.P_incinerateur_MWH || 0, label: 'GF', nodeId, lineName: nodeData?.lineName || null };
        localStorage.setItem(`pointE_${nodeId}`, JSON.stringify(pointE));
      }
      if (onSendData) {
        onSendData({ result: { ...result, Waste_flow_rate_kg_h: validatedInputs.Waste_flow_rate_kg_h, dataFlow: nodeData?.result?.dataFlow || {} }, inputData: { Waste_flow_rate_kg_h, Pressure_losse_mmCE, Combustion_air_flowrate_Nm3_h, Measured_air_temperature_C, Q_feed_water_kg_h, T_feed_water_C, Blowdown_pourcent } });
      }

    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      alert(`${t.CalculationError}: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  }, [nodeData, validateInputs, onSendData, t]);

  // Toggle du slider des résultats
  const toggleSlider = useCallback(() => {
    setIsSliderOpen(prev => !prev);
  }, []);

  // Effacement de la mémoire
  const clearMemory = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      setCalculationResult_GF(null);
      
      // Réinitialisation aux valeurs par défaut
      setWaste_flow_rate_kg_h(DEFAULT_VALUES.Waste_flow_rate_kg_h);
      setPressure_losse_mmCE(DEFAULT_VALUES.Pressure_losse_mmCE);
      setCombustion_air_flowrate_Nm3_h(DEFAULT_VALUES.Combustion_air_flowrate_Nm3_h);
      setMeasured_air_temperature_C(DEFAULT_VALUES.Measured_air_temperature_C);
      setQ_feed_water_kg_h(DEFAULT_VALUES.Q_feed_water_kg_h);
      setT_feed_water_C(DEFAULT_VALUES.T_feed_water_C);
      setBlowdown_pourcent(DEFAULT_VALUES.Blowdown_pourcent);
      setQ_air_ingress_Nm3_h(DEFAULT_VALUES.Q_air_ingress_Nm3_h);
      setT_air_ingress_C(DEFAULT_VALUES.T_air_ingress_C);
      setQ_saturated_steam(DEFAULT_VALUES.Q_saturated_steam);
      setSteam_pressure_gauge_bar(DEFAULT_VALUES.Steam_pressure_gauge_bar);
      setSuper_heated_steam_temperature_C(DEFAULT_VALUES.super_heated_steam_temperature_C);
      setQ_superheated_steam_kg_h(DEFAULT_VALUES.Q_superheated_steam_kg_h);
      setP_superheated_steam_bar(DEFAULT_VALUES.P_superheated_steam_bar);
      setT_superheated_water_boiler_C(DEFAULT_VALUES.T_superheated_water_boiler_C);
      setQ_superheated_water_kg_h(DEFAULT_VALUES.Q_superheated_water_kg_h);
      setQ_recycled_flue_gas_Nm3_h(DEFAULT_VALUES.Q_recycled_flue_gas_Nm3_h);
      setT_recycled_flue_gas_C(DEFAULT_VALUES.T_recycled_flue_gas_C);
      setInjected_water_temperature_C(DEFAULT_VALUES.Injected_water_temperature_C);
      setQ_treatment_injected_water_kg_h(DEFAULT_VALUES.Q_treatment_injected_water_kg_h);
      setAuxiliary_fuel_kWh(DEFAULT_VALUES.Auxiliary_fuel_kWh);
      setBottom_ash_pourcent(DEFAULT_VALUES.Bottom_ash_pourcent);
      setBottom_ash_temperature_C(DEFAULT_VALUES.Bottom_ash_temperature_C);
      setUnburnt_bottom_ash_pourcent(DEFAULT_VALUES.Unburnt_bottom_ash_pourcent);
      setUnburnt_LCV_kcal_kg(DEFAULT_VALUES.Unburnt_LCV_kcal_kg);
      setReference_temperature_C(DEFAULT_VALUES.Reference_temperature_C);
      
      // Réinitialisation des toggles
      setSaturatedSteamEnabled(DEFAULT_VALUES.saturatedSteamEnabled);
      setSuperheatedSteamEnabled(DEFAULT_VALUES.superheatedSteamEnabled);
      setSuperheatedWaterEnabled(DEFAULT_VALUES.superheatedWaterEnabled);
      setRecycledFlueGasEnabled(DEFAULT_VALUES.recycledFlueGasEnabled);
      setInjectedWaterEnabled(DEFAULT_VALUES.injectedWaterEnabled);
      setAirIngressEnabled(DEFAULT_VALUES.AirIngressEnabled);
      setDiagramMode(DEFAULT_VALUES.diagramMode);

    } catch (error) {
      console.warn('Erreur lors de l\'effacement:', error);
    }
  }, []);

  // Gestionnaires d'entrée optimisés
  const createInputHandler = useCallback((setter, fallback = '0') => 
    (e) => setter(e.target.value || fallback), []
  );

  // Gestionnaires de toggle avec réinitialisation conditionnelle
  const handleToggleRecycledFlueGas = useCallback((value) => {
    setRecycledFlueGasEnabled(value);
    if (!value) {
      setQ_recycled_flue_gas_Nm3_h('0');
      setT_recycled_flue_gas_C('0');
    }
  }, []);

  const handleToggleInjectedWater = useCallback((value) => {
    setInjectedWaterEnabled(value);
    if (!value) {
      setInjected_water_temperature_C('0');
      setQ_treatment_injected_water_kg_h('0');
    }
  }, []);

  const handleToggleAirIngress = useCallback((value) => {
    setAirIngressEnabled(value);
    if (!value) {
      setQ_air_ingress_Nm3_h('0');
      setT_air_ingress_C('20');
    }
  }, []);

  const handleToggleSaturatedSteam = useCallback((value) => {
    setSaturatedSteamEnabled(value);
    if (!value) {
      setQ_saturated_steam('0');
      setSteam_pressure_gauge_bar('0');
    }
  }, []);

  const handleToggleSuperheatedSteam = useCallback((value) => {
    setSuperheatedSteamEnabled(value);
    if (!value) {
      setSuper_heated_steam_temperature_C('0');
      setQ_superheated_steam_kg_h('0');
      setP_superheated_steam_bar('0');
    }
  }, []);

  const toggleDiagramMode = useCallback(() => {
    setDiagramMode(prev => prev === 'NO' ? 'YES' : 'NO');
  }, []);

  const handleToggleSuperheatedWater = useCallback((value) => {
    setSuperheatedWaterEnabled(value);
    if (!value) {
      setT_superheated_water_boiler_C('0');
      setQ_superheated_water_kg_h('0');
    }
  }, []);

  const hasCalculatedOnce = useRef(false);
  const hasAutoTriggered = useRef(false);
  useEffect(() => {
    if (!autoTrigger || hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;
    handleSendData();
  }, [autoTrigger]);

  useEffect(() => {
    if (!hasCalculatedOnce.current) return;
    handleSendData();
  }, [handleSendData]);

  return (
    <div className="container-box">
      <CloseButton onClose={onClose} />

      <h3>{t.Parametres} {title}</h3>
      
      <div className="inputs-container">
        {/* Paramètres principaux */}
        <h4>{t.Parametres}</h4>
        <InputField 
          label={t.Waste_flow_rate} 
          unit={`[${t.kg_h}]`} 
          value={Waste_flow_rate_kg_h} 
          onChange={createInputHandler(setWaste_flow_rate_kg_h, DEFAULT_VALUES.Waste_flow_rate_kg_h)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Pressure_loss} 
          unit={`[${t.mmCE}]`} 
          value={Pressure_losse_mmCE} 
          onChange={createInputHandler(setPressure_losse_mmCE, DEFAULT_VALUES.Pressure_losse_mmCE)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Combustion_air_flowrate} 
          unit={`[${t.Nm3_h}]`} 
          value={Combustion_air_flowrate_Nm3_h} 
          onChange={createInputHandler(setCombustion_air_flowrate_Nm3_h, DEFAULT_VALUES.Combustion_air_flowrate_Nm3_h)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Measured_air_temperature} 
          unit={`[${t.celsius}]`} 
          value={Measured_air_temperature_C} 
          onChange={createInputHandler(setMeasured_air_temperature_C, DEFAULT_VALUES.Measured_air_temperature_C)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Feed_water_flow} 
          unit={`[${t.kg_h}]`} 
          value={Q_feed_water_kg_h} 
          onChange={createInputHandler(setQ_feed_water_kg_h, DEFAULT_VALUES.Q_feed_water_kg_h)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Feed_water_temperature} 
          unit={`[${t.celsius}]`} 
          value={T_feed_water_C} 
          onChange={createInputHandler(setT_feed_water_C, DEFAULT_VALUES.T_feed_water_C)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Blowdown_percent} 
          unit={`[${t.percent}]`} 
          value={Blowdown_pourcent} 
          onChange={createInputHandler(setBlowdown_pourcent, DEFAULT_VALUES.Blowdown_pourcent)}
          disabled={isCalculating}
        />

        {/* Section Air Ingress */}
        <div className="toggle-container-plus-moins">
          <ToggleButton 
            label={t.AirIngress} 
            toggled={AirIngressEnabled} 
            onToggle={handleToggleAirIngress}
          />
        </div>
        {AirIngressEnabled && (
          <>
            <InputField 
              label={t.Q_air_ingress} 
              unit={`[${t.Nm3_h}]`} 
              value={Q_air_ingress_Nm3_h} 
              onChange={createInputHandler(setQ_air_ingress_Nm3_h, DEFAULT_VALUES.Q_air_ingress_Nm3_h)}
              disabled={isCalculating}
            />
            <InputField 
              label={t.T_air_ingress} 
              unit={`[${t.celsius}]`} 
              value={T_air_ingress_C} 
              onChange={createInputHandler(setT_air_ingress_C, DEFAULT_VALUES.T_air_ingress_C)}
              disabled={isCalculating}
            />
          </>
        )}

        {/* Section Saturated Steam */}
        <div className="toggle-container-plus-moins">
          <ToggleButton 
            label={t.SaturatedSteam} 
            toggled={saturatedSteamEnabled} 
            onToggle={handleToggleSaturatedSteam}
          />
        </div>
        {saturatedSteamEnabled && (
          <>
            <InputField 
              label={t.Q_saturated_steam} 
              unit={`[${t.kg_h}]`} 
              value={Q_saturated_steam} 
              onChange={createInputHandler(setQ_saturated_steam, DEFAULT_VALUES.Q_saturated_steam)}
              disabled={isCalculating}
            />
            <InputField 
              label={t.Steam_pressure} 
              unit={`[${t.bar}]`} 
              value={Steam_pressure_gauge_bar} 
              onChange={createInputHandler(setSteam_pressure_gauge_bar, DEFAULT_VALUES.Steam_pressure_gauge_bar)}
              disabled={isCalculating}
            />
          </>
        )}

        {/* Section Superheated Steam */}
        <div className="toggle-container-plus-moins">
          <ToggleButton 
            label={t.SuperheatedSteam} 
            toggled={superheatedSteamEnabled} 
            onToggle={handleToggleSuperheatedSteam}
          />
        </div>
        {superheatedSteamEnabled && (
          <>
            <InputField 
              label={t.Superheated_steam_temperature} 
              unit={`[${t.celsius}]`} 
              value={super_heated_steam_temperature_C} 
              onChange={createInputHandler(setSuper_heated_steam_temperature_C, DEFAULT_VALUES.super_heated_steam_temperature_C)}
              disabled={isCalculating}
            />
            <InputField 
              label={t.Q_superheated_steam} 
              unit={`[${t.kg_h}]`} 
              value={Q_superheated_steam_kg_h} 
              onChange={createInputHandler(setQ_superheated_steam_kg_h, DEFAULT_VALUES.Q_superheated_steam_kg_h)}
              disabled={isCalculating}
            />
            <InputField 
              label={t.P_superheated_steam} 
              unit={`[${t.bar}]`} 
              value={P_superheated_steam_bar} 
              onChange={createInputHandler(setP_superheated_steam_bar, DEFAULT_VALUES.P_superheated_steam_bar)}
              disabled={isCalculating}
            />
          </>
        )}

        {/* Section Superheated Water */}
        <div className="toggle-container-plus-moins">
          <ToggleButton 
            label={t.SuperheatedWater} 
            toggled={superheatedWaterEnabled} 
            onToggle={handleToggleSuperheatedWater}
          />
        </div>
        {superheatedWaterEnabled && (
          <>
            <InputField 
              label={t.T_superheated_water} 
              unit={`[${t.celsius}]`} 
              value={T_superheated_water_boiler_C} 
              onChange={createInputHandler(setT_superheated_water_boiler_C, DEFAULT_VALUES.T_superheated_water_boiler_C)}
              disabled={isCalculating}
            />
            <InputField 
              label={t.Q_superheated_water} 
              unit={`[${t.kg_h}]`} 
              value={Q_superheated_water_kg_h} 
              onChange={createInputHandler(setQ_superheated_water_kg_h, DEFAULT_VALUES.Q_superheated_water_kg_h)}
              disabled={isCalculating}
            />
          </>
        )}

        {/* Section Recycled Flue Gas */}
        <div className="toggle-container-plus-moins">
          <ToggleButton 
            label={t.RecycledFlueGas} 
            toggled={recycledFlueGasEnabled} 
            onToggle={handleToggleRecycledFlueGas}
          />
        </div>
        {recycledFlueGasEnabled && (
          <>
            <InputField 
              label={t.Q_recycled_flue_gas} 
              unit={`[${t.Nm3_h}]`} 
              value={Q_recycled_flue_gas_Nm3_h} 
              onChange={createInputHandler(setQ_recycled_flue_gas_Nm3_h, DEFAULT_VALUES.Q_recycled_flue_gas_Nm3_h)}
              disabled={isCalculating}
            />
            <InputField 
              label={t.T_recycled_flue_gas} 
              unit={`[${t.celsius}]`} 
              value={T_recycled_flue_gas_C} 
              onChange={createInputHandler(setT_recycled_flue_gas_C, DEFAULT_VALUES.T_recycled_flue_gas_C)}
              disabled={isCalculating}
            />
          </>
        )}

        {/* Section Injected Water */}
        <div className="toggle-container-plus-moins">
          <ToggleButton 
            label={t.InjectedWater} 
            toggled={injectedWaterEnabled} 
            onToggle={handleToggleInjectedWater}
          />
        </div>
        {injectedWaterEnabled && (
          <>
            <InputField 
              label={t.Injected_water_temperature} 
              unit={`[${t.celsius}]`} 
              value={Injected_water_temperature_C} 
              onChange={createInputHandler(setInjected_water_temperature_C, DEFAULT_VALUES.Injected_water_temperature_C)}
              disabled={isCalculating}
            />
            <InputField 
              label={t.Q_treatment_injected_water} 
              unit={`[${t.kg_h}]`} 
              value={Q_treatment_injected_water_kg_h} 
              onChange={createInputHandler(setQ_treatment_injected_water_kg_h, DEFAULT_VALUES.Q_treatment_injected_water_kg_h)}
              disabled={isCalculating}
            />
          </>
        )}

        {/* Autres paramètres */}
        <InputField 
          label={t.Auxiliary_fuel} 
          unit={`[${t.kWh}]`} 
          value={Auxiliary_fuel_kWh} 
          onChange={createInputHandler(setAuxiliary_fuel_kWh, DEFAULT_VALUES.Auxiliary_fuel_kWh)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Bottom_ash_percentage} 
          unit={`[${t.percent}]`} 
          value={Bottom_ash_pourcent} 
          onChange={createInputHandler(setBottom_ash_pourcent, DEFAULT_VALUES.Bottom_ash_pourcent)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Bottom_ash_temperature} 
          unit={`[${t.celsius}]`} 
          value={Bottom_ash_temperature_C} 
          onChange={createInputHandler(setBottom_ash_temperature_C, DEFAULT_VALUES.Bottom_ash_temperature_C)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Unburnt_bottom_ash} 
          unit={`[${t.percent}]`} 
          value={Unburnt_bottom_ash_pourcent} 
          onChange={createInputHandler(setUnburnt_bottom_ash_pourcent, DEFAULT_VALUES.Unburnt_bottom_ash_pourcent)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Unburnt_LCV} 
          unit={`[${t.kcal_kg}]`} 
          value={Unburnt_LCV_kcal_kg} 
          onChange={createInputHandler(setUnburnt_LCV_kcal_kg, DEFAULT_VALUES.Unburnt_LCV_kcal_kg)}
          disabled={isCalculating}
        />
        <InputField
          label={t.Reference_temperature}
          unit={`[${t.celsius}]`}
          value={Reference_temperature_C}
          onChange={createInputHandler(setReference_temperature_C, DEFAULT_VALUES.Reference_temperature_C)}
          disabled={isCalculating}
        />

        {/* Toggle pour l'envoi vers le diagramme de combustion */}
        <div className="toggle-container" style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
          <label style={{ marginRight: '10px' }}>Diagramme:</label>
          <button
            onClick={toggleDiagramMode}
            data-testid="diagram-toggle"
            className={`toggle-button ${diagramMode === 'NO' ? 'toggle-button--option1' : 'toggle-button--option2'}`}
            disabled={isCalculating}
          >
            {diagramMode === 'NO' ? 'Non' : 'Oui'}
          </button>
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="prez-3-buttons">
        <CalculateSendButton
          onClick={handleSendData}
          disabled={isCalculating || !nodeData?.result}
          currentLanguage={currentLanguage}
          isCalculating={isCalculating}
          storageKey={`calcSent_${title}_${nodeId}`}
        />
        
        <ShowResultButton 
          isOpen={isSliderOpen} 
          onToggle={toggleSlider}
          currentLanguage={currentLanguage}
          disabled={!calculationResult_GF}
        />
        
        <ClearButton 
          onClick={clearMemory}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && calculationResult_GF && (
        <CalculationResults 
          isOpen={isSliderOpen} 
          results={calculationResult_GF}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !calculationResult_GF && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!calculationResult_GF || isCalculating}
          style={{ width: '100%', padding: '8px 16px', background: calculationResult_GF ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: calculationResult_GF ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && calculationResult_GF && (
        <GF_Retro_Rapport
          calculationResult={calculationResult_GF}
          nodeData={nodeData}
          inputParams={{ Waste_flow_rate_kg_h, Pressure_losse_mmCE, Combustion_air_flowrate_Nm3_h, Measured_air_temperature_C, Q_feed_water_kg_h, T_feed_water_C, Blowdown_pourcent }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(GF_Parameter_Tab);