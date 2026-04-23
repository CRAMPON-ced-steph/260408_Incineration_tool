import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { performCalculation_QUENCH_option_T } from './QUENCH_calculations';
import { performCalculation_QUENCH_option_Qeau } from './QUENCH_calculations2';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';

import { getTranslatedParameter, getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './QUENCH_traduction';

import QUENCH_Retro_Rapport from './QUENCH_Retro_Rapport';
import '../../index.css';

// Constantes pour les types de bilan
const BALANCE_TYPES = {
  TEMPERATURE: 'TEMPERATURE_BALANCE',
  WATER_FLOW: 'WATER_FLOW_BALANCE'
};

// Constantes pour localStorage
const STORAGE_KEYS = {
  T_EAU: 'Teau',
  T_AMONT_QUENCH: 'T_amont_QUENCH',
  Q_EAU: 'Qeau',
  PDC_AERO: 'PDC_aero',
  BILAN_TYPE: 'QUENCH_bilanType',
  CALCULATION_RESULT: 'calculationResult_QUENCH'
};

// Valeurs par défaut
const DEFAULT_VALUES = {
  Teau: '15',
  T_amont_QUENCH: '10',
  Qeau: '0',
  PDC_aero: '10',
  bilanType: BALANCE_TYPES.TEMPERATURE
};

const QUENCH_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage }) => {
  // États principaux
  const [Teau, setTeau] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.T_EAU) || DEFAULT_VALUES.Teau
  );
  const [T_amont_QUENCH, setT_amont_QUENCH] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.T_AMONT_QUENCH) || 
    nodeData?.result?.dataFlow?.T?.toString() || 
    DEFAULT_VALUES.T_amont_QUENCH
  );
  const [Qeau, setQeau] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.Q_EAU) || DEFAULT_VALUES.Qeau
  );
  const [PDC_aero, setPDC_aero] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.PDC_AERO) || DEFAULT_VALUES.PDC_aero
  );

  // Type de bilan
  const [bilanType, setBilanType] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BILAN_TYPE);
    return Object.values(BALANCE_TYPES).includes(stored) ? stored : DEFAULT_VALUES.bilanType;
  });

  // États pour l'interface
  const [calculationResult_QUENCH, setCalculationResult_QUENCH] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CALCULATION_RESULT);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Erreur lors du chargement des résultats:', error);
      return null;
    }
  });
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
  const balanceTypeMapping = useMemo(() => ({
    [BALANCE_TYPES.TEMPERATURE]: t.BilanParT,
    [BALANCE_TYPES.WATER_FLOW]: t.BilanParQeau
  }), [t]);

  // Sauvegarde centralisée dans localStorage
  useEffect(() => {
    const saveToLocalStorage = () => {
      try {
        const dataToSave = {
          [STORAGE_KEYS.T_EAU]: Teau,
          [STORAGE_KEYS.T_AMONT_QUENCH]: T_amont_QUENCH,
          [STORAGE_KEYS.Q_EAU]: Qeau,
          [STORAGE_KEYS.PDC_AERO]: PDC_aero,
          [STORAGE_KEYS.BILAN_TYPE]: bilanType
        };

        Object.entries(dataToSave).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
    };

    saveToLocalStorage();
  }, [Teau, T_amont_QUENCH, Qeau, PDC_aero, bilanType]);

  // Sauvegarde des résultats de calcul
  useEffect(() => {
    if (calculationResult_QUENCH) {
      try {
        localStorage.setItem(STORAGE_KEYS.CALCULATION_RESULT, JSON.stringify(calculationResult_QUENCH));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [calculationResult_QUENCH]);

  // Validation des entrées
  const validateInputs = useCallback(() => {
    const inputs = {
      Teau: parseFloat(Teau),
      T_amont_QUENCH: parseFloat(T_amont_QUENCH),
      Qeau: parseFloat(Qeau),
      PDC_aero: parseFloat(PDC_aero)
    };

    // Validation des valeurs numériques
    for (const [key, value] of Object.entries(inputs)) {
      if (isNaN(value)) {
        throw new Error(`${t.InvalidInput}: ${key}`);
      }
    }

    // Validations spécifiques aux contraintes physiques
    if (inputs.Teau < -273.15) {
      throw new Error(`${t.InvalidInput}: Water temperature cannot be below absolute zero`);
    }
    if (inputs.T_amont_QUENCH < -273.15) {
      throw new Error(`${t.InvalidInput}: Upstream temperature cannot be below absolute zero`);
    }
    if (inputs.Qeau < 0) {
      throw new Error(`${t.InvalidInput}: Water flow rate cannot be negative`);
    }
    if (inputs.PDC_aero < 0) {
      throw new Error(`${t.InvalidInput}: Pressure drop cannot be negative`);
    }

    return inputs;
  }, [Teau, T_amont_QUENCH, Qeau, PDC_aero, t]);

  // Gestion du calcul principal
  const handleSendData = useCallback(async () => {
    if (!nodeData?.result) {
      alert(t.NoInputData);
      return;
    }

    setIsCalculating(true);
    
    try {
      const validatedInputs = validateInputs();
      let result;

      if (bilanType === BALANCE_TYPES.TEMPERATURE) {
        result = performCalculation_QUENCH_option_T(
          nodeData, 
          validatedInputs.T_amont_QUENCH, 
          validatedInputs.Teau, 
          validatedInputs.PDC_aero
        );
      } else if (bilanType === BALANCE_TYPES.WATER_FLOW) {
        result = performCalculation_QUENCH_option_Qeau(
          nodeData, 
          validatedInputs.Qeau, 
          validatedInputs.Teau, 
          validatedInputs.PDC_aero
        );
      } else {
        throw new Error('Invalid balance type');
      }

      setCalculationResult_QUENCH(result);
      onSendData && onSendData({ result, inputData: { Teau, T_amont_QUENCH, Qeau, PDC_aero, bilanType } });

    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      alert(`${t.CalculationError}: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  }, [nodeData, validateInputs, bilanType, onSendData, t]);

  // Toggle du type de bilan
  const toggleBilanType = useCallback(() => {
    setBilanType(prev => 
      prev === BALANCE_TYPES.TEMPERATURE ? BALANCE_TYPES.WATER_FLOW : BALANCE_TYPES.TEMPERATURE
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
      
      setCalculationResult_QUENCH(null);
      
      // Réinitialisation aux valeurs par défaut
      setTeau(DEFAULT_VALUES.Teau);
      setT_amont_QUENCH(nodeData?.result?.dataFlow?.T?.toString() || DEFAULT_VALUES.T_amont_QUENCH);
      setQeau(DEFAULT_VALUES.Qeau);
      setPDC_aero(DEFAULT_VALUES.PDC_aero);
      setBilanType(DEFAULT_VALUES.bilanType);
      
    } catch (error) {
      console.warn('Erreur lors de l\'effacement:', error);
    }
  }, [nodeData]);

  // Gestionnaires d'entrée optimisés
  const createInputHandler = useCallback((setter, fallback = '0') => 
    (e) => setter(e.target.value || fallback), []
  );

  const handleTeauChange = createInputHandler(setTeau, DEFAULT_VALUES.Teau);
  const handleTAmontChange = createInputHandler(setT_amont_QUENCH, DEFAULT_VALUES.T_amont_QUENCH);
  const handleQeauChange = createInputHandler(setQeau, DEFAULT_VALUES.Qeau);
  const handlePDCChange = createInputHandler(setPDC_aero, DEFAULT_VALUES.PDC_aero);

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

  return (
    <div className="container-box">
      <CloseButton onClose={onClose} />
      <h3>{t.Parametres} {title}</h3>

      {/* Toggle type de bilan */}
      <ToggleButton 
        label={t.BilanType}
        value={bilanType}
        mapping={balanceTypeMapping}
        onChange={toggleBilanType}
        testId="balance-type-toggle"
      />

      <div className="inputs-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Champ température eau injectée - toujours visible */}
        <InputField 
          label={t.T_eau_injectee} 
          unit={`[${t.celsius}]`} 
          value={Teau} 
          onChange={handleTeauChange}
          disabled={isCalculating}
          aria-label={`${t.T_eau_injectee} en ${t.celsius}`}
        />

        {/* Champs conditionnels selon le type de bilan */}
        {bilanType === BALANCE_TYPES.TEMPERATURE && (
          <InputField 
            label={t.T_fumees_amont} 
            unit={`[${t.celsius}]`} 
            value={T_amont_QUENCH} 
            onChange={handleTAmontChange}
            disabled={isCalculating}
            aria-label={`${t.T_fumees_amont} en ${t.celsius}`}
          />
        )}

        {bilanType === BALANCE_TYPES.WATER_FLOW && (
          <InputField 
            label={t.Q_eau} 
            unit={`[${t.kg_h}]`} 
            value={Qeau} 
            onChange={handleQeauChange}
            disabled={isCalculating}
            aria-label={`${t.Q_eau} en ${t.kg_h}`}
          />
        )}

        {/* Champ PDC aérodynamique - toujours visible */}
        <InputField 
          label={t.PDC_aero} 
          unit={`[${t.mmCE}]`} 
          value={PDC_aero} 
          onChange={handlePDCChange}
          disabled={isCalculating}
          aria-label={`${t.PDC_aero} en ${t.mmCE}`}
        />
      </div>

      {/* Boutons d'action */}
      <div className="prez-3-buttons">
        <button 
          onClick={handleSendData}
          disabled={isCalculating || !nodeData?.result}
          className={isCalculating ? 'button-loading' : ''}
        >
          {isCalculating ? t.Calculating : t.calculer_et_envoyer_data}
        </button>
        
        <ShowResultButton 
          isOpen={isSliderOpen} 
          onToggle={toggleSlider}
          currentLanguage={currentLanguage}
          disabled={!calculationResult_QUENCH}
        />
        
        <ClearButton 
          onClick={clearMemory}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && calculationResult_QUENCH && (
        <CalculationResults 
          isOpen={isSliderOpen} 
          results={calculationResult_QUENCH}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !calculationResult_QUENCH && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!calculationResult_QUENCH || isCalculating}
          style={{ width: '100%', padding: '8px 16px', background: calculationResult_QUENCH ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: calculationResult_QUENCH ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && calculationResult_QUENCH && (
        <QUENCH_Retro_Rapport
          calculationResult={calculationResult_QUENCH}
          inputParams={{ Teau, T_amont_QUENCH, Qeau, PDC_aero, bilanType }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(QUENCH_Parameter_Tab);