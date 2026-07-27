import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { performCalculation_ELECTROFILTER } from './ELECTROFILTER_calculations';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import CalculateSendButton from '../../C_Components/CalculateSendButton';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './ELECTROFILTER_traduction';
import useBatchCalcResult from '../../C_Components/useBatchCalcResult';

import ELECTROFILTER_Retro_Rapport from './ELECTROFILTER_Retro_Rapport';
import '../../index.css';

// Constantes pour localStorage (suffixées par nodeId)
const getStorageKeys = (nodeId) => ({
  QAIR_DECOLMATATION: `Qair_decolmatation_ELECTROFILTER_${nodeId}`,
  T_AIR_DECOLMATATION: `T_air_decolmatation_ELECTROFILTER_${nodeId}`,
  T_AMONT_ELECTROFILTER: `T_amont_ELECTROFILTER_${nodeId}`,
  PDC_AERO: `PDC_aero_ELECTROFILTER_${nodeId}`,
  CALCULATION_RESULT: `CalculationResult_ELECTROFILTER_${nodeId}`
});

// Valeurs par défaut
const DEFAULT_VALUES = {
  Qair_decolmatation: '0',
  T_air_decolmatation: '15',
  T_amont_ELECTROFILTER: '10',
  PDC_aero: '100'
};

const ELECTROFILTER_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage, nodeId, autoTrigger = false }) => {
  const STORAGE_KEYS = useMemo(() => getStorageKeys(nodeId), [nodeId]);

  // États principaux
  const [Qair_decolmatation, setQair_decolmatation] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).QAIR_DECOLMATATION) || DEFAULT_VALUES.Qair_decolmatation
  );
  const [T_air_decolmatation, setT_air_decolmatation] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).T_AIR_DECOLMATATION) || DEFAULT_VALUES.T_air_decolmatation
  );
  const [T_amont_ELECTROFILTER, setT_amont_ELECTROFILTER] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).T_AMONT_ELECTROFILTER) ||
    nodeData?.result?.dataFlow?.T || DEFAULT_VALUES.T_amont_ELECTROFILTER
  );
  const [PDC_aero, setPDC_aero] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).PDC_AERO) || DEFAULT_VALUES.PDC_aero
  );

  // États pour l'interface
  const [CalculationResult_ELECTROFILTER, setCalculationResult_ELECTROFILTER] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKeys(nodeId).CALCULATION_RESULT);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Erreur lors du chargement des résultats:', error);
      return null;
    }
  });
  useBatchCalcResult(nodeId, setCalculationResult_ELECTROFILTER);
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
          [STORAGE_KEYS.QAIR_DECOLMATATION]: Qair_decolmatation,
          [STORAGE_KEYS.T_AIR_DECOLMATATION]: T_air_decolmatation,
          [STORAGE_KEYS.T_AMONT_ELECTROFILTER]: T_amont_ELECTROFILTER,
          [STORAGE_KEYS.PDC_AERO]: PDC_aero
        };

        Object.entries(dataToSave).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
    };

    saveToLocalStorage();
  }, [Qair_decolmatation, T_air_decolmatation, T_amont_ELECTROFILTER, PDC_aero]);

  // Sauvegarde des résultats de calcul
  useEffect(() => {
    if (CalculationResult_ELECTROFILTER) {
      try {
        localStorage.setItem(STORAGE_KEYS.CALCULATION_RESULT, JSON.stringify(CalculationResult_ELECTROFILTER));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [CalculationResult_ELECTROFILTER]);

  // Validation des entrées
  const validateInputs = useCallback(() => {
    const inputs = {
      Qair_decolmatation: parseFloat(Qair_decolmatation),
      T_air_decolmatation: parseFloat(T_air_decolmatation),
      T_amont_ELECTROFILTER: parseFloat(T_amont_ELECTROFILTER),
      PDC_aero: parseFloat(PDC_aero)
    };

    // Validation des valeurs numériques
    for (const [key, value] of Object.entries(inputs)) {
      if (isNaN(value)) {
        throw new Error(`${t.InvalidInput}: ${key}`);
      }
    }

    // Validations spécifiques aux contraintes physiques
    if (inputs.Qair_decolmatation < 0) {
      throw new Error(`${t.InvalidInput}: ${t.Qair_decolmatation} cannot be negative`);
    }
    if (inputs.PDC_aero < 0) {
      throw new Error(`${t.InvalidInput}: ${t.PDC_aero} cannot be negative`);
    }

    return inputs;
  }, [Qair_decolmatation, T_air_decolmatation, T_amont_ELECTROFILTER, PDC_aero, t]);

  // Gestion du calcul principal
  const handleSendData = useCallback(async () => {
    if (!nodeData?.result) {
      alert(t.NoInputData);
      return;
    }

    setIsCalculating(true);
    
    try {
      const validatedInputs = validateInputs();

      const result = performCalculation_ELECTROFILTER(
        nodeData,
        validatedInputs.T_air_decolmatation,
        validatedInputs.Qair_decolmatation,
        validatedInputs.T_amont_ELECTROFILTER,
        validatedInputs.PDC_aero
      );

      setCalculationResult_ELECTROFILTER(result);
      hasCalculatedOnce.current = true;
      if (onSendData) {
        onSendData({ result, inputData: { T_amont_ELECTROFILTER, T_air_decolmatation, Qair_decolmatation, PDC_aero } });
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
      
      setCalculationResult_ELECTROFILTER(null);
      
      // Réinitialisation aux valeurs par défaut
      setQair_decolmatation(DEFAULT_VALUES.Qair_decolmatation);
      setT_air_decolmatation(DEFAULT_VALUES.T_air_decolmatation);
      setT_amont_ELECTROFILTER(nodeData?.result?.dataFlow?.T || DEFAULT_VALUES.T_amont_ELECTROFILTER);
      setPDC_aero(DEFAULT_VALUES.PDC_aero);
      
    } catch (error) {
      console.warn('Erreur lors de l\'effacement:', error);
    }
  }, [nodeData]);

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
          label={t.Qair_decolmatation} 
          unit={`[${t.m3_h}]`} 
          value={Qair_decolmatation} 
          onChange={createInputHandler(setQair_decolmatation, DEFAULT_VALUES.Qair_decolmatation)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Tair} 
          unit={`[${t.celsius}]`} 
          value={T_air_decolmatation} 
          onChange={createInputHandler(setT_air_decolmatation, DEFAULT_VALUES.T_air_decolmatation)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.T_fumees_amont} 
          unit={`[${t.celsius}]`} 
          value={T_amont_ELECTROFILTER} 
          onChange={createInputHandler(setT_amont_ELECTROFILTER, DEFAULT_VALUES.T_amont_ELECTROFILTER)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.PDC_aero} 
          unit={`[${t.mmCE}]`} 
          value={PDC_aero} 
          onChange={createInputHandler(setPDC_aero, DEFAULT_VALUES.PDC_aero)}
          disabled={isCalculating}
        />
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
          disabled={!CalculationResult_ELECTROFILTER}
        />
        
        <ClearButton 
          onClick={clearMemory}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && CalculationResult_ELECTROFILTER && (
        <CalculationResults 
          isOpen={isSliderOpen} 
          results={CalculationResult_ELECTROFILTER}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !CalculationResult_ELECTROFILTER && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!CalculationResult_ELECTROFILTER || isCalculating}
          style={{ width: '100%', padding: '8px 16px', background: CalculationResult_ELECTROFILTER ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: CalculationResult_ELECTROFILTER ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && CalculationResult_ELECTROFILTER && (
        <ELECTROFILTER_Retro_Rapport
          calculationResult={CalculationResult_ELECTROFILTER}
          inputParams={{ T_amont_ELECTROFILTER, T_air_decolmatation, Qair_decolmatation, PDC_aero }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(ELECTROFILTER_Parameter_Tab);