import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { performCalculation_CYCLONE } from './CYCLONE_calculations';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import CalculateSendButton from '../../C_Components/CalculateSendButton';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './CYCLONE_traduction';
import useBatchCalcResult from '../../C_Components/useBatchCalcResult';

import CYCLONE_Retro_Rapport from './CYCLONE_Retro_Rapport';
import '../../index.css';

// Constantes pour localStorage (suffixées par nodeId)
const getStorageKeys = (nodeId) => ({
  QAIR_PARASITE: `Qair_parasite_CYCLONE_${nodeId}`,
  T_AIR_PARASITE: `T_air_parasite_CYCLONE_${nodeId}`,
  T_AMONT_CYCLONE: `T_amont_CYCLONE_${nodeId}`,
  PDC_AERO: `PDC_aero_CYCLONE_${nodeId}`,
  CALCULATION_RESULT: `CalculationResult_CYCLONE_${nodeId}`
});

// Valeurs par défaut
const DEFAULT_VALUES = {
  Qair_parasite: '0',
  T_air_parasite: '15',
  T_amont_CYCLONE: '15',
  PDC_aero: '10'
};

const CYCLONE_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage, nodeId, autoTrigger = false }) => {
  const STORAGE_KEYS = useMemo(() => getStorageKeys(nodeId), [nodeId]);

  // États principaux
  const [Qair_parasite, setQair_parasite] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).QAIR_PARASITE) || DEFAULT_VALUES.Qair_parasite
  );
  const [T_air_parasite, setT_air_parasite] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).T_AIR_PARASITE) || DEFAULT_VALUES.T_air_parasite
  );
  const [T_amont_CYCLONE, setT_amont_CYCLONE] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).T_AMONT_CYCLONE) ||
    nodeData?.result?.dataFlow?.T || DEFAULT_VALUES.T_amont_CYCLONE
  );
  const [PDC_aero, setPDC_aero] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).PDC_AERO) || DEFAULT_VALUES.PDC_aero
  );

  // États pour l'interface
  const [CalculationResult_CYCLONE, setCalculationResult_CYCLONE] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKeys(nodeId).CALCULATION_RESULT);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Erreur lors du chargement des résultats:', error);
      return null;
    }
  });
  useBatchCalcResult(nodeId, setCalculationResult_CYCLONE);
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
          [STORAGE_KEYS.QAIR_PARASITE]: Qair_parasite,
          [STORAGE_KEYS.T_AIR_PARASITE]: T_air_parasite,
          [STORAGE_KEYS.T_AMONT_CYCLONE]: T_amont_CYCLONE,
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
  }, [Qair_parasite, T_air_parasite, T_amont_CYCLONE, PDC_aero]);

  // Sauvegarde des résultats de calcul
  useEffect(() => {
    if (CalculationResult_CYCLONE) {
      try {
        localStorage.setItem(STORAGE_KEYS.CALCULATION_RESULT, JSON.stringify(CalculationResult_CYCLONE));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [CalculationResult_CYCLONE]);

  // Calcul automatique lors du changement des données d'entrée
  useEffect(() => {
    if (nodeData?.result && !isCalculating) {
      try {
        const validatedInputs = {
          T_air_parasite: parseFloat(T_air_parasite) || 0,
          Qair_parasite: parseFloat(Qair_parasite) || 0,
          T_amont_CYCLONE: parseFloat(T_amont_CYCLONE) || 0,
          PDC_aero: parseFloat(PDC_aero) || 0
        };

        const result = performCalculation_CYCLONE(
          nodeData,
          validatedInputs.T_air_parasite,
          validatedInputs.Qair_parasite,
          validatedInputs.T_amont_CYCLONE,
          validatedInputs.PDC_aero
        );
        setCalculationResult_CYCLONE(result);
        if (hasCalculatedOnce.current) {
          onSendData({ result, inputData: { T_amont_CYCLONE, T_air_parasite, Qair_parasite, PDC_aero } });
        }
      } catch (error) {
        console.error('Erreur lors du recalcul automatique:', error);
      }
    }
  }, [nodeData, T_air_parasite, Qair_parasite, T_amont_CYCLONE, PDC_aero, isCalculating]);

  // Validation des entrées
  const validateInputs = useCallback(() => {
    const inputs = {
      Qair_parasite: parseFloat(Qair_parasite),
      T_air_parasite: parseFloat(T_air_parasite),
      T_amont_CYCLONE: parseFloat(T_amont_CYCLONE),
      PDC_aero: parseFloat(PDC_aero)
    };

    // Validation des valeurs numériques
    for (const [key, value] of Object.entries(inputs)) {
      if (isNaN(value)) {
        throw new Error(`${t.InvalidInput}: ${key}`);
      }
    }

    // Validations spécifiques aux contraintes physiques
    if (inputs.Qair_parasite < 0) {
      throw new Error(`${t.InvalidInput}: ${t.Qair_parasite} cannot be negative`);
    }
    if (inputs.PDC_aero < 0) {
      throw new Error(`${t.InvalidInput}: ${t.PDC_aero} cannot be negative`);
    }

    return inputs;
  }, [Qair_parasite, T_air_parasite, T_amont_CYCLONE, PDC_aero, t]);

  // Gestion du calcul principal
  const handleSendData = useCallback(async () => {
    if (!nodeData?.result) {
      alert(t.NoInputData);
      return;
    }

    setIsCalculating(true);
    
    try {
      const validatedInputs = validateInputs();

      const result = performCalculation_CYCLONE(
        nodeData,
        validatedInputs.T_air_parasite,
        validatedInputs.Qair_parasite,
        validatedInputs.T_amont_CYCLONE,
        validatedInputs.PDC_aero
      );

      setCalculationResult_CYCLONE(result);
      hasCalculatedOnce.current = true;
      if (onSendData) {
        onSendData({ result, inputData: { T_amont_CYCLONE, T_air_parasite, Qair_parasite, PDC_aero } });
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
      
      setCalculationResult_CYCLONE(null);
      
      // Réinitialisation aux valeurs par défaut
      setQair_parasite(DEFAULT_VALUES.Qair_parasite);
      setT_air_parasite(DEFAULT_VALUES.T_air_parasite);
      setT_amont_CYCLONE(nodeData?.result?.dataFlow?.T || DEFAULT_VALUES.T_amont_CYCLONE);
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

  return (
    <div className="container-box">
      <CloseButton onClose={onClose} />
      
      <h3>{t.Parameters} {title}</h3>
      
      <div className="inputs-container">
        <InputField 
          label={t.Qair_parasite} 
          unit={`[${t.m3_h}]`} 
          value={Qair_parasite} 
          onChange={createInputHandler(setQair_parasite, DEFAULT_VALUES.Qair_parasite)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.Tair} 
          unit={`[${t.celsius}]`} 
          value={T_air_parasite} 
          onChange={createInputHandler(setT_air_parasite, DEFAULT_VALUES.T_air_parasite)}
          disabled={isCalculating}
        />
        <InputField 
          label={t.T_fumees_amont} 
          unit={`[${t.celsius}]`} 
          value={T_amont_CYCLONE} 
          onChange={createInputHandler(setT_amont_CYCLONE, DEFAULT_VALUES.T_amont_CYCLONE)}
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
          disabled={!CalculationResult_CYCLONE}
        />
        
        <ClearButton 
          onClick={clearMemory}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && CalculationResult_CYCLONE && (
        <CalculationResults 
          isOpen={isSliderOpen} 
          results={CalculationResult_CYCLONE}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !CalculationResult_CYCLONE && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!CalculationResult_CYCLONE || isCalculating}
          style={{ width: '100%', padding: '8px 16px', background: CalculationResult_CYCLONE ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: CalculationResult_CYCLONE ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && CalculationResult_CYCLONE && (
        <CYCLONE_Retro_Rapport
          calculationResult={CalculationResult_CYCLONE}
          inputParams={{ T_amont_CYCLONE, T_air_parasite, Qair_parasite, PDC_aero }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(CYCLONE_Parameter_Tab);