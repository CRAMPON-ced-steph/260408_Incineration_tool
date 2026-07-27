import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { performCalculation_DENOX_option_Qeau } from './DENOX_calculations';
import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import CalculateSendButton from '../../C_Components/CalculateSendButton';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './DENOX_traduction';
import useBatchCalcResult from '../../C_Components/useBatchCalcResult';

import DENOX_Retro_Rapport from './DENOX_Retro_Rapport';
import '../../index.css';

// Constantes pour localStorage (suffixées par nodeId)
const getStorageKeys = (nodeId) => ({
  TARGET_NOX: `targetNOx_DENOX_${nodeId}`,
  SPRAY_WATER_TEMP: `sprayWaterTemp_DENOX_${nodeId}`,
  COEFF_STOECH: `coeffStoech_DENOX_${nodeId}`,
  SOLUTION_CONC: `solutionConc_DENOX_${nodeId}`,
  SOLUTION_DENSITY: `solutionDensity_DENOX_${nodeId}`,
  SPRAY_FLOWRATE: `sprayFlowrate_DENOX_${nodeId}`,
  PDC: `pdc_DENOX_${nodeId}`,
  CALCULATION_RESULT: `calculationResult_DENOX_${nodeId}`
});

// Valeurs par défaut
const DEFAULT_VALUES = {
  targetNOx: '150',
  sprayWaterTemp: '15',
  coeffStoech: '1.2',
  solutionConc: '25',
  solutionDensity: '908',
  sprayFlowrate: '15',
  pdc: '50'
};

const DENOX_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage, nodeId, autoTrigger = false }) => {
  const STORAGE_KEYS = useMemo(() => getStorageKeys(nodeId), [nodeId]);

  // États principaux
  const [targetNOx, setTargetNOx] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).TARGET_NOX) || DEFAULT_VALUES.targetNOx
  );
  const [sprayWaterTemp, setSprayWaterTemp] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).SPRAY_WATER_TEMP) || DEFAULT_VALUES.sprayWaterTemp
  );
  const [coeffStoech, setCoeffStoech] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).COEFF_STOECH) || DEFAULT_VALUES.coeffStoech
  );
  const [solutionConc, setSolutionConc] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).SOLUTION_CONC) || DEFAULT_VALUES.solutionConc
  );
  const [solutionDensity, setSolutionDensity] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).SOLUTION_DENSITY) || DEFAULT_VALUES.solutionDensity
  );
  const [sprayFlowrate, setSprayFlowrate] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).SPRAY_FLOWRATE) || DEFAULT_VALUES.sprayFlowrate
  );
  const [pdc, setPdc] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).PDC) || DEFAULT_VALUES.pdc
  );

  // États pour l'interface
  const [calculationResult_DENOX, setCalculationResult_DENOX] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKeys(nodeId).CALCULATION_RESULT);
      return stored ? JSON.parse(stored) : nodeData?.calculationResult || null;
    } catch (error) {
      console.warn('Erreur lors du chargement des résultats:', error);
      return nodeData?.calculationResult || null;
    }
  });
  useBatchCalcResult(nodeId, setCalculationResult_DENOX);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Récupération des traductions avec mémorisation
  const { languageCode, t } = useMemo(() => {
    const code = getLanguageCode(currentLanguage);
    const translationsObj = translations[code] || translations['en'];
    return { languageCode: code, t: translationsObj };
  }, [currentLanguage]);

  // Sauvegarde automatique dans localStorage
  useEffect(() => {
    const saveToLocalStorage = () => {
      try {
        const dataToSave = {
          [STORAGE_KEYS.TARGET_NOX]: targetNOx,
          [STORAGE_KEYS.SPRAY_WATER_TEMP]: sprayWaterTemp,
          [STORAGE_KEYS.COEFF_STOECH]: coeffStoech,
          [STORAGE_KEYS.SOLUTION_CONC]: solutionConc,
          [STORAGE_KEYS.SOLUTION_DENSITY]: solutionDensity,
          [STORAGE_KEYS.SPRAY_FLOWRATE]: sprayFlowrate,
          [STORAGE_KEYS.PDC]: pdc
        };

        Object.entries(dataToSave).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
    };

    saveToLocalStorage();
  }, [targetNOx, sprayWaterTemp, coeffStoech, solutionConc, solutionDensity, sprayFlowrate, pdc]);

  // Sauvegarde des résultats de calcul
  useEffect(() => {
    if (calculationResult_DENOX) {
      try {
        localStorage.setItem(STORAGE_KEYS.CALCULATION_RESULT, JSON.stringify(calculationResult_DENOX));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [calculationResult_DENOX]);

  // Calcul initial si pas de résultats existants
  useEffect(() => {
    if (nodeData && !calculationResult_DENOX) {
      try {
        const initialResult = performCalculation_DENOX_option_Qeau(
          nodeData,
          parseFloat(targetNOx),
          parseFloat(sprayWaterTemp),
          parseFloat(coeffStoech),
          parseFloat(solutionConc),
          parseFloat(solutionDensity),
          parseFloat(sprayFlowrate),
          parseFloat(pdc)
        );
        setCalculationResult_DENOX(initialResult);
      } catch (error) {
        console.warn('Erreur lors du calcul initial:', error);
      }
    }
  }, [nodeData, calculationResult_DENOX, targetNOx, sprayWaterTemp, coeffStoech, solutionConc, solutionDensity, sprayFlowrate, pdc]);

  // Validation des entrées
  const validateInputs = useCallback(() => {
    const inputs = {
      targetNOx: parseFloat(targetNOx),
      sprayWaterTemp: parseFloat(sprayWaterTemp),
      coeffStoech: parseFloat(coeffStoech),
      solutionConc: parseFloat(solutionConc),
      solutionDensity: parseFloat(solutionDensity),
      sprayFlowrate: parseFloat(sprayFlowrate),
      pdc: parseFloat(pdc)
    };

    // Validation des valeurs numériques
    for (const [key, value] of Object.entries(inputs)) {
      if (isNaN(value)) {
        throw new Error(`${t.InvalidInput}: ${key}`);
      }
    }

    // Validations spécifiques aux contraintes physiques et chimiques
    if (inputs.targetNOx < 0) {
      throw new Error(`${t.InvalidInput}: ${t.Target_NOx_Emission} cannot be negative`);
    }
    if (inputs.coeffStoech <= 0) {
      throw new Error(`${t.InvalidInput}: ${t.Coefficient_stoechiometric} must be positive`);
    }
    if (inputs.solutionConc < 0 || inputs.solutionConc > 100) {
      throw new Error(`${t.InvalidInput}: ${t.Commercial_solution_concentration} must be between 0-100%`);
    }
    if (inputs.solutionDensity <= 0) {
      throw new Error(`${t.InvalidInput}: ${t.Commercial_solution_relative_density} must be positive`);
    }
    if (inputs.sprayFlowrate < 0) {
      throw new Error(`${t.InvalidInput}: ${t.Spray_flowrate} cannot be negative`);
    }
    if (inputs.pdc < 0) {
      throw new Error(`${t.InvalidInput}: ${t.PDC} cannot be negative`);
    }

    return inputs;
  }, [targetNOx, sprayWaterTemp, coeffStoech, solutionConc, solutionDensity, sprayFlowrate, pdc, t]);

  // Gestion du calcul principal
  const handleSendData = useCallback(async () => {
    if (!nodeData?.result && !nodeData) {
      alert(t.NoInputData);
      return;
    }

    setIsCalculating(true);
    
    try {
      const validatedInputs = validateInputs();

      const result = performCalculation_DENOX_option_Qeau(
        nodeData,
        validatedInputs.targetNOx,
        validatedInputs.sprayWaterTemp,
        validatedInputs.coeffStoech,
        validatedInputs.solutionConc,
        validatedInputs.solutionDensity,
        validatedInputs.sprayFlowrate,
        validatedInputs.pdc
      );

      setCalculationResult_DENOX(result);
      hasCalculatedOnce.current = true;
      if (onSendData) {
        onSendData({ result, inputData: { targetNOx, sprayWaterTemp, coeffStoech, solutionConc, solutionDensity, sprayFlowrate, pdc } });
      }

    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      alert(`${t.ErrorInCalculation}: ${error.message}`);
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
      
      setCalculationResult_DENOX(null);
      
      // Réinitialisation aux valeurs par défaut
      setTargetNOx(DEFAULT_VALUES.targetNOx);
      setSprayWaterTemp(DEFAULT_VALUES.sprayWaterTemp);
      setCoeffStoech(DEFAULT_VALUES.coeffStoech);
      setSolutionConc(DEFAULT_VALUES.solutionConc);
      setSolutionDensity(DEFAULT_VALUES.solutionDensity);
      setSprayFlowrate(DEFAULT_VALUES.sprayFlowrate);
      setPdc(DEFAULT_VALUES.pdc);
      
    } catch (error) {
      console.warn('Erreur lors de l\'effacement:', error);
    }
  }, []);

  // Gestionnaires d'entrée optimisés
  const createInputHandler = useCallback((setter, fallback = '0') =>
    (e) => setter(e.target.value || fallback), []
  );

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
      
      <h3>{t.Parameters} {title}</h3>
      
      <div className="inputs-container">
        <InputField
          label={t.Target_NOx_Emission}
          unit={`[${t.mg_Nm3}]`}
          value={targetNOx}
          onChange={createInputHandler(setTargetNOx, DEFAULT_VALUES.targetNOx)}
          disabled={isCalculating}
        />
        <InputField
          label={t.Spray_water_temperature}
          unit={`[${t.celsius}]`}
          value={sprayWaterTemp}
          onChange={createInputHandler(setSprayWaterTemp, DEFAULT_VALUES.sprayWaterTemp)}
          disabled={isCalculating}
        />
        <InputField
          label={t.Coefficient_stoechiometric}
          unit={`[${t.adimensional}]`}
          value={coeffStoech}
          onChange={createInputHandler(setCoeffStoech, DEFAULT_VALUES.coeffStoech)}
          disabled={isCalculating}
        />
        <InputField
          label={t.Commercial_solution_concentration}
          unit={`[${t.percent}]`}
          value={solutionConc}
          onChange={createInputHandler(setSolutionConc, DEFAULT_VALUES.solutionConc)}
          disabled={isCalculating}
        />
        <InputField
          label={t.Commercial_solution_relative_density}
          unit={`[${t.kg_m3}]`}
          value={solutionDensity}
          onChange={createInputHandler(setSolutionDensity, DEFAULT_VALUES.solutionDensity)}
          disabled={isCalculating}
        />
        <InputField
          label={t.Spray_flowrate}
          unit={`[${t.l_h}]`}
          value={sprayFlowrate}
          onChange={createInputHandler(setSprayFlowrate, DEFAULT_VALUES.sprayFlowrate)}
          disabled={isCalculating}
        />
        <InputField
          label={t.PDC}
          unit={`[${t.mmCE}]`}
          value={pdc}
          onChange={createInputHandler(setPdc, DEFAULT_VALUES.pdc)}
          disabled={isCalculating}
        />
      </div>

      {/* Boutons d'action */}
      <div className="prez-3-buttons">
        <CalculateSendButton
          onClick={handleSendData}
          disabled={isCalculating || (!nodeData?.result && !nodeData)}
          currentLanguage={currentLanguage}
          isCalculating={isCalculating}
          storageKey={`calcSent_${title}_${nodeId}`}
        />
        
        <ShowResultButton 
          isOpen={isSliderOpen} 
          onToggle={toggleSlider}
          currentLanguage={currentLanguage}
          disabled={!calculationResult_DENOX}
        />
        
        <ClearButton 
          onClick={clearMemory}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && calculationResult_DENOX && (
        <CalculationResults
          isOpen={isSliderOpen}
          results={calculationResult_DENOX}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !calculationResult_DENOX && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!calculationResult_DENOX || isCalculating}
          style={{ width: '100%', padding: '8px 16px', background: calculationResult_DENOX ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: calculationResult_DENOX ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && calculationResult_DENOX && (
        <DENOX_Retro_Rapport
          calculationResult={calculationResult_DENOX}
          inputParams={{ targetNOx, sprayWaterTemp, coeffStoech, solutionConc, solutionDensity, sprayFlowrate, pdc }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(DENOX_Parameter_Tab);