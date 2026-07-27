import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { T_ref } from '../../A_Transverse_fonction/constantes';
import { performCalculation_REACTOR } from './REACTOR_calculations';

import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import CalculateSendButton from '../../C_Components/CalculateSendButton';
import InputField from '../../C_Components/input_retro';
import REACTOR_Retro_Rapport from './REACTOR_Retro_Rapport';
import '../../index.css';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './REACTOR_traduction';
import useBatchCalcResult from '../../C_Components/useBatchCalcResult';

// Constantes pour les types de réactifs
const REAGENT_TYPES = {
  CAP: 'CAP',
  LIME: 'LIME'
};

// Constantes pour localStorage (suffixées par nodeId)
const getStorageKeys = (nodeId) => ({
  T_AMONT_REACTOR: `T_amont_REACTOR_${nodeId}`,
  T_AIR: `T_air_REACTOR_${nodeId}`,
  PDC_AERO: `PDC_aero_REACTOR_${nodeId}`,
  QV_AIR_PARASITE: `Qv_air_parasite_Nm3_h_REACTOR_${nodeId}`,
  REAGENT_TYPE: `reagentType_REACTOR_${nodeId}`,
  BESOIN_AIR_LIME: `Besoin_air_pulverisation_lime_Nm3_kg_REACTOR_${nodeId}`,
  CONCENTRATION_LIME: `Concentration_Lime_kg_lime_Nm3_FG_REACTOR_${nodeId}`,
  BESOIN_AIR_CAP: `Besoin_air_pulverisation_cap_Nm3_kg_REACTOR_${nodeId}`,
  CONCENTRATION_CAP: `Concentration_cap_mg_cap_Nm3_FG_REACTOR_${nodeId}`,
  CALCULATION_RESULT: `calculationResult_REACTOR_${nodeId}`
});

// Valeurs par défaut
const DEFAULT_VALUES = {
  T_amont_REACTOR: '10',
  T_air: '20',
  PDC_aero: '20',
  Qv_air_parasite_Nm3_h: '0',
  reagentType: REAGENT_TYPES.CAP,
  Besoin_air_pulverisation_lime_Nm3_kg: '0.5',
  Concentration_Lime_kg_lime_Nm3_FG: '0.1',
  Besoin_air_pulverisation_cap_Nm3_kg: '0.5',
  Concentration_cap_mg_cap_Nm3_FG: '0.1'
};

const REACTOR_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage, nodeId, autoTrigger = false }) => {
  const STORAGE_KEYS = useMemo(() => getStorageKeys(nodeId), [nodeId]);

  // États principaux
  const [T_amont_REACTOR, setT_amont_REACTOR] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).T_AMONT_REACTOR) ||
    nodeData?.result?.dataFlow?.T?.toString() ||
    DEFAULT_VALUES.T_amont_REACTOR
  );
  const [T_air, setT_air] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).T_AIR) || DEFAULT_VALUES.T_air
  );
  const [PDC_aero, setPDC_aero] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).PDC_AERO) || DEFAULT_VALUES.PDC_aero
  );
  const [Qv_air_parasite_Nm3_h, setQv_air_parasite_Nm3_h] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).QV_AIR_PARASITE) || DEFAULT_VALUES.Qv_air_parasite_Nm3_h
  );

  // Paramètres spécifiques aux réactifs
  const [Besoin_air_pulverisation_lime_Nm3_kg, setBesoin_air_pulverisation_lime_Nm3_kg] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).BESOIN_AIR_LIME) || DEFAULT_VALUES.Besoin_air_pulverisation_lime_Nm3_kg
  );
  const [Concentration_Lime_kg_lime_Nm3_FG, setConcentration_Lime_kg_lime_Nm3_FG] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).CONCENTRATION_LIME) || DEFAULT_VALUES.Concentration_Lime_kg_lime_Nm3_FG
  );
  const [Besoin_air_pulverisation_cap_Nm3_kg, setBesoin_air_pulverisation_cap_Nm3_kg] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).BESOIN_AIR_CAP) || DEFAULT_VALUES.Besoin_air_pulverisation_cap_Nm3_kg
  );
  const [Concentration_cap_mg_cap_Nm3_FG, setConcentration_cap_mg_cap_Nm3_FG] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).CONCENTRATION_CAP) || DEFAULT_VALUES.Concentration_cap_mg_cap_Nm3_FG
  );

  // Type de réactif
  const [reagentType, setReagentType] = useState(() =>
    localStorage.getItem(getStorageKeys(nodeId).REAGENT_TYPE) || DEFAULT_VALUES.reagentType
  );

  // États pour l'interface
  const [calculationResult_REACTOR, setCalculationResult_REACTOR] = useState(() => {
    try {
      const stored = localStorage.getItem(getStorageKeys(nodeId).CALCULATION_RESULT);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Erreur lors du chargement des résultats:', error);
      return null;
    }
  });
  useBatchCalcResult(nodeId, setCalculationResult_REACTOR);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Récupération des traductions avec mémorisation
  const { languageCode, t } = useMemo(() => {
    const code = getLanguageCode(currentLanguage);
    const translationsObj = translations[code] || translations['en'];
    return { languageCode: code, t: translationsObj };
  }, [currentLanguage]);

  // Mapping pour les traductions du toggle
  const reagentTypeMapping = useMemo(() => ({
    [REAGENT_TYPES.CAP]: t.CAP,
    [REAGENT_TYPES.LIME]: t.LIME
  }), [t]);

  // Sauvegarde centralisée dans localStorage
  useEffect(() => {
    const saveToLocalStorage = () => {
      try {
        const dataToSave = {
          [STORAGE_KEYS.T_AMONT_REACTOR]: T_amont_REACTOR,
          [STORAGE_KEYS.T_AIR]: T_air,
          [STORAGE_KEYS.PDC_AERO]: PDC_aero,
          [STORAGE_KEYS.QV_AIR_PARASITE]: Qv_air_parasite_Nm3_h,
          [STORAGE_KEYS.REAGENT_TYPE]: reagentType,
          [STORAGE_KEYS.BESOIN_AIR_LIME]: Besoin_air_pulverisation_lime_Nm3_kg,
          [STORAGE_KEYS.CONCENTRATION_LIME]: Concentration_Lime_kg_lime_Nm3_FG,
          [STORAGE_KEYS.BESOIN_AIR_CAP]: Besoin_air_pulverisation_cap_Nm3_kg,
          [STORAGE_KEYS.CONCENTRATION_CAP]: Concentration_cap_mg_cap_Nm3_FG
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
    T_amont_REACTOR, T_air, PDC_aero, Qv_air_parasite_Nm3_h, reagentType,
    Besoin_air_pulverisation_lime_Nm3_kg, Concentration_Lime_kg_lime_Nm3_FG,
    Besoin_air_pulverisation_cap_Nm3_kg, Concentration_cap_mg_cap_Nm3_FG
  ]);

  // Sauvegarde des résultats de calcul
  useEffect(() => {
    if (calculationResult_REACTOR) {
      try {
        localStorage.setItem(STORAGE_KEYS.CALCULATION_RESULT, JSON.stringify(calculationResult_REACTOR));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [calculationResult_REACTOR]);

  // Validation des entrées
  const validateInputs = useCallback(() => {
    const inputs = {
      T_amont_REACTOR: parseFloat(T_amont_REACTOR),
      T_air: parseFloat(T_air),
      PDC_aero: parseFloat(PDC_aero),
      Qv_air_parasite_Nm3_h: parseFloat(Qv_air_parasite_Nm3_h),
      Besoin_air_pulverisation_lime_Nm3_kg: parseFloat(Besoin_air_pulverisation_lime_Nm3_kg),
      Concentration_Lime_kg_lime_Nm3_FG: parseFloat(Concentration_Lime_kg_lime_Nm3_FG),
      Besoin_air_pulverisation_cap_Nm3_kg: parseFloat(Besoin_air_pulverisation_cap_Nm3_kg),
      Concentration_cap_mg_cap_Nm3_FG: parseFloat(Concentration_cap_mg_cap_Nm3_FG)
    };

    // Validation des valeurs numériques
    for (const [key, value] of Object.entries(inputs)) {
      if (isNaN(value)) {
        throw new Error(`${t.InvalidInput}: ${key}`);
      }
    }

    // Validations spécifiques aux contraintes physiques
    if (inputs.T_amont_REACTOR < -T_ref) {
      throw new Error(`${t.InvalidInput}: Upstream temperature cannot be below absolute zero`);
    }
    if (inputs.T_air < -T_ref) {
      throw new Error(`${t.InvalidInput}: Air temperature cannot be below absolute zero`);
    }
    if (inputs.PDC_aero < 0) {
      throw new Error(`${t.InvalidInput}: Pressure drop cannot be negative`);
    }
    if (inputs.Qv_air_parasite_Nm3_h < 0) {
      throw new Error(`${t.InvalidInput}: Parasitic air flow rate cannot be negative`);
    }
    if (inputs.Concentration_Lime_kg_lime_Nm3_FG < 0) {
      throw new Error(`${t.InvalidInput}: Lime concentration cannot be negative`);
    }
    if (inputs.Concentration_cap_mg_cap_Nm3_FG < 0) {
      throw new Error(`${t.InvalidInput}: CAP concentration cannot be negative`);
    }
    if (inputs.Besoin_air_pulverisation_lime_Nm3_kg < 0) {
      throw new Error(`${t.InvalidInput}: Lime air requirement cannot be negative`);
    }
    if (inputs.Besoin_air_pulverisation_cap_Nm3_kg < 0) {
      throw new Error(`${t.InvalidInput}: CAP air requirement cannot be negative`);
    }

    return inputs;
  }, [
    T_amont_REACTOR, T_air, PDC_aero, Qv_air_parasite_Nm3_h,
    Besoin_air_pulverisation_lime_Nm3_kg, Concentration_Lime_kg_lime_Nm3_FG,
    Besoin_air_pulverisation_cap_Nm3_kg, Concentration_cap_mg_cap_Nm3_FG, t
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

      const result = performCalculation_REACTOR(
        nodeData,
        validatedInputs.T_amont_REACTOR,
        validatedInputs.T_air,
        validatedInputs.PDC_aero,
        reagentType,
        validatedInputs.Besoin_air_pulverisation_lime_Nm3_kg,
        validatedInputs.Besoin_air_pulverisation_cap_Nm3_kg,
        validatedInputs.Concentration_cap_mg_cap_Nm3_FG,
        validatedInputs.Qv_air_parasite_Nm3_h
      );

      setCalculationResult_REACTOR(result);
      hasCalculatedOnce.current = true;
      onSendData({ result, inputData: { T_amont_REACTOR, T_air, PDC_aero, Qv_air_parasite_Nm3_h, reagentType, Besoin_air_pulverisation_lime_Nm3_kg, Concentration_Lime_kg_lime_Nm3_FG, Besoin_air_pulverisation_cap_Nm3_kg, Concentration_cap_mg_cap_Nm3_FG } });

    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      alert(`${t.CalculationError}: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  }, [nodeData, validateInputs, reagentType, onSendData, t]);

  // Toggle du type de réactif
  const toggleReagentType = useCallback(() => {
    setReagentType(prev => 
      prev === REAGENT_TYPES.CAP ? REAGENT_TYPES.LIME : REAGENT_TYPES.CAP
    );
  }, []);

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
      
      setCalculationResult_REACTOR(null);
      
      // Réinitialisation aux valeurs par défaut
      setT_amont_REACTOR(nodeData?.result?.dataFlow?.T?.toString() || DEFAULT_VALUES.T_amont_REACTOR);
      setT_air(DEFAULT_VALUES.T_air);
      setPDC_aero(DEFAULT_VALUES.PDC_aero);
      setQv_air_parasite_Nm3_h(DEFAULT_VALUES.Qv_air_parasite_Nm3_h);
      setBesoin_air_pulverisation_lime_Nm3_kg(DEFAULT_VALUES.Besoin_air_pulverisation_lime_Nm3_kg);
      setConcentration_Lime_kg_lime_Nm3_FG(DEFAULT_VALUES.Concentration_Lime_kg_lime_Nm3_FG);
      setBesoin_air_pulverisation_cap_Nm3_kg(DEFAULT_VALUES.Besoin_air_pulverisation_cap_Nm3_kg);
      setConcentration_cap_mg_cap_Nm3_FG(DEFAULT_VALUES.Concentration_cap_mg_cap_Nm3_FG);
      setReagentType(DEFAULT_VALUES.reagentType);
      
    } catch (error) {
      console.warn('Erreur lors de l\'effacement:', error);
    }
  }, [nodeData]);

  // Gestionnaires d'entrée optimisés
  const createInputHandler = useCallback((setter, fallback = '0') => 
    (e) => setter(e.target.value || fallback), []
  );

  const handleTAmontChange = createInputHandler(setT_amont_REACTOR, DEFAULT_VALUES.T_amont_REACTOR);
  const handleTAirChange = createInputHandler(setT_air, DEFAULT_VALUES.T_air);
  const handlePDCChange = createInputHandler(setPDC_aero, DEFAULT_VALUES.PDC_aero);
  const handleQvAirParasiteChange = createInputHandler(setQv_air_parasite_Nm3_h, DEFAULT_VALUES.Qv_air_parasite_Nm3_h);
  const handleBesoinAirLimeChange = createInputHandler(setBesoin_air_pulverisation_lime_Nm3_kg, DEFAULT_VALUES.Besoin_air_pulverisation_lime_Nm3_kg);
  const handleConcentrationLimeChange = createInputHandler(setConcentration_Lime_kg_lime_Nm3_FG, DEFAULT_VALUES.Concentration_Lime_kg_lime_Nm3_FG);
  const handleBesoinAirCapChange = createInputHandler(setBesoin_air_pulverisation_cap_Nm3_kg, DEFAULT_VALUES.Besoin_air_pulverisation_cap_Nm3_kg);
  const handleConcentrationCapChange = createInputHandler(setConcentration_cap_mg_cap_Nm3_FG, DEFAULT_VALUES.Concentration_cap_mg_cap_Nm3_FG);

  // Composant ToggleButton réutilisable
  const ToggleButton = React.memo(({ label, value, mapping, onChange, testId }) => {
    const displayValue = mapping[value] || value;
    const isFirstOption = value === Object.keys(mapping)[0];
    
    return (
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label>{label}:</label>
        <button 
          onClick={onChange}
          data-testid={testId}
          className={`toggle-button ${isFirstOption ? 'toggle-button--option1' : 'toggle-button--option2'}`}
          disabled={isCalculating}
          aria-label={`${label}: ${displayValue}`}
        >
          {displayValue}
        </button>
      </div>
    );
  });

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

      <div className="inputs-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Champs communs */}
        <InputField 
          label={t.T_fumees_amont} 
          unit={`[${t.celsius}]`} 
          value={T_amont_REACTOR} 
          onChange={handleTAmontChange}
          disabled={isCalculating}
          aria-label={`${t.T_fumees_amont} en ${t.celsius}`}
        />
        
        <InputField 
          label={t.T_air} 
          unit={`[${t.celsius}]`} 
          value={T_air} 
          onChange={handleTAirChange}
          disabled={isCalculating}
          aria-label={`${t.T_air} en ${t.celsius}`}
        />
        
        <InputField
          label={t.PDC_aero}
          unit={`[${t.mmCE}]`}
          value={PDC_aero}
          onChange={handlePDCChange}
          disabled={isCalculating}
          aria-label={`${t.PDC_aero} en ${t.mmCE}`}
        />

        <InputField
          label={t.Qv_air_parasite}
          unit="[Nm³/h]"
          value={Qv_air_parasite_Nm3_h}
          onChange={handleQvAirParasiteChange}
          disabled={isCalculating}
          aria-label={`${t.Qv_air_parasite} en Nm³/h`}
        />

        {/* Toggle type de réactif */}
        <ToggleButton 
          label={t.ReagentType}
          value={reagentType}
          mapping={reagentTypeMapping}
          onChange={toggleReagentType}
          testId="reagent-type-toggle"
        />

        {/* Champs conditionnels selon le type de réactif */}
        {reagentType === REAGENT_TYPES.LIME && (
          <>
            <InputField 
              label={t.Besoin_air_pulverisation_lime} 
              unit={`[${t.Nm3_kg}]`} 
              value={Besoin_air_pulverisation_lime_Nm3_kg} 
              onChange={handleBesoinAirLimeChange}
              disabled={isCalculating}
              aria-label={`${t.Besoin_air_pulverisation_lime} en ${t.Nm3_kg}`}
            />
            <InputField 
              label={t.Concentration_lime} 
              unit={`[${t.kg_Nm3_FG}]`} 
              value={Concentration_Lime_kg_lime_Nm3_FG} 
              onChange={handleConcentrationLimeChange}
              disabled={isCalculating}
              aria-label={`${t.Concentration_lime} en ${t.kg_Nm3_FG}`}
            />
          </>
        )}
        
        {reagentType === REAGENT_TYPES.CAP && (
          <>
            <InputField 
              label={t.Besoin_air_pulverisation_cap} 
              unit={`[${t.Nm3_kg}]`} 
              value={Besoin_air_pulverisation_cap_Nm3_kg} 
              onChange={handleBesoinAirCapChange}
              disabled={isCalculating}
              aria-label={`${t.Besoin_air_pulverisation_cap} en ${t.Nm3_kg}`}
            />
            <InputField 
              label={t.Concentration_cap} 
              unit={`[${t.mg_Nm3_FG}]`} 
              value={Concentration_cap_mg_cap_Nm3_FG} 
              onChange={handleConcentrationCapChange}
              disabled={isCalculating}
              aria-label={`${t.Concentration_cap} en ${t.mg_Nm3_FG}`}
            />
          </>
        )}
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
          disabled={!calculationResult_REACTOR}
        />
        
        <ClearButton 
          onClick={clearMemory}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && calculationResult_REACTOR && (
        <CalculationResults 
          isOpen={isSliderOpen} 
          results={calculationResult_REACTOR}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !calculationResult_REACTOR && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!calculationResult_REACTOR || isCalculating}
          style={{ width: '100%', padding: '8px 16px', background: calculationResult_REACTOR ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: calculationResult_REACTOR ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && calculationResult_REACTOR && (
        <REACTOR_Retro_Rapport
          calculationResult={calculationResult_REACTOR}
          inputParams={{ T_amont_REACTOR, T_air, PDC_aero, Qv_air_parasite_Nm3_h, reagentType, Besoin_air_pulverisation_lime_Nm3_kg, Concentration_Lime_kg_lime_Nm3_FG, Besoin_air_pulverisation_cap_Nm3_kg, Concentration_cap_mg_cap_Nm3_FG }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(REACTOR_Parameter_Tab);