import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { performCalculation_SCRUBBER_option_TinTout } from './SCRUBBER_calculations';
import { performCalculation_SCRUBBER_option_TinTsat } from './SCRUBBER_calculations2';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';

import SCRUBBER_Retro_Rapport from './SCRUBBER_Retro_Rapport';
import '../../index.css';

import { getTranslatedParameter, getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './SCRUBBER_traduction';

// Constantes pour les modes de calcul
const BALANCE_TYPES = {
  TIN_TOUT: 'TIN_TOUT',
  TIN_TSAT: 'TIN_TSAT'
};

// Constantes pour localStorage
const STORAGE_KEYS = {
  T_EAU: 'Teau',
  T_AMONT_SCRUBBER: 'T_amont_SCRUBBER',
  PDC_AERO: 'PDC_aero',
  BILAN_TYPE: 'SCRUBBER_bilanType',
  CALCULATION_RESULT: 'calculationResult_SCRUBBER'
};

// Valeurs par défaut
const DEFAULT_VALUES = {
  Teau: '15',
  T_amont_SCRUBBER: '50',
  PDC_aero: '50',
  bilanType: BALANCE_TYPES.TIN_TOUT
};

const SCRUBBER_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage }) => {
  // États principaux
  const [Teau, setT_eau] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.T_EAU) || DEFAULT_VALUES.Teau
  );
  const [T_amont_SCRUBBER, setT_amont_SCRUBBER] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.T_AMONT_SCRUBBER) || 
    nodeData?.result?.dataFlow?.T?.toString() || 
    DEFAULT_VALUES.T_amont_SCRUBBER
  );
  const [PDC_aero, setPDC_aero] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.PDC_AERO) || DEFAULT_VALUES.PDC_aero
  );

  // États pour les modes de calcul
  const [bilanType, setBilanType] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BILAN_TYPE);
    return Object.values(BALANCE_TYPES).includes(stored) ? stored : DEFAULT_VALUES.bilanType;
  });

  // États pour l'interface
  const [calculationResult_SCRUBBER, setCalculationResult_SCRUBBER] = useState(() => {
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
    [BALANCE_TYPES.TIN_TOUT]: t.TinTout,
    [BALANCE_TYPES.TIN_TSAT]: t.TinTsat
  }), [t]);

  // Sauvegarde centralisée dans localStorage
  useEffect(() => {
    const saveToLocalStorage = () => {
      try {
        const dataToSave = {
          [STORAGE_KEYS.T_EAU]: Teau,
          [STORAGE_KEYS.T_AMONT_SCRUBBER]: T_amont_SCRUBBER,
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
  }, [Teau, T_amont_SCRUBBER, PDC_aero, bilanType]);

  // Sauvegarde des résultats de calcul
  useEffect(() => {
    if (calculationResult_SCRUBBER) {
      try {
        localStorage.setItem(STORAGE_KEYS.CALCULATION_RESULT, JSON.stringify(calculationResult_SCRUBBER));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [calculationResult_SCRUBBER]);

  // Validation des entrées
  const validateInputs = useCallback(() => {
    const inputs = {
      Teau: parseFloat(Teau),
      T_amont_SCRUBBER: parseFloat(T_amont_SCRUBBER),
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
    if (inputs.T_amont_SCRUBBER < -273.15) {
      throw new Error(`${t.InvalidInput}: Upstream temperature cannot be below absolute zero`);
    }
    if (inputs.PDC_aero < 0) {
      throw new Error(`${t.InvalidInput}: Pressure drop cannot be negative`);
    }

    return inputs;
  }, [Teau, T_amont_SCRUBBER, PDC_aero, t]);

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

      if (bilanType === BALANCE_TYPES.TIN_TOUT) {
        result = performCalculation_SCRUBBER_option_TinTout(
          nodeData, 
          validatedInputs.PDC_aero
        );
      } else if (bilanType === BALANCE_TYPES.TIN_TSAT) {
        result = performCalculation_SCRUBBER_option_TinTsat(
          nodeData, 
          validatedInputs.Teau, 
          validatedInputs.T_amont_SCRUBBER, 
          validatedInputs.PDC_aero
        );
      } else {
        throw new Error('Invalid balance type');
      }

      setCalculationResult_SCRUBBER(result);
      onSendData({ result, inputData: { Teau, T_amont_SCRUBBER, PDC_aero, bilanType } });

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
      prev === BALANCE_TYPES.TIN_TOUT ? BALANCE_TYPES.TIN_TSAT : BALANCE_TYPES.TIN_TOUT
    );
  }, []);

  // Toggle du slider des résultats
  const toggleSlider = useCallback(() => {
    setIsSliderOpen(prev => !prev);
  }, []);

  // Effacement de la mémoire
  const handleClearStorage = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      setCalculationResult_SCRUBBER(null);
      
      // Réinitialisation aux valeurs par défaut
      setT_eau(DEFAULT_VALUES.Teau);
      setT_amont_SCRUBBER(nodeData?.result?.dataFlow?.T?.toString() || DEFAULT_VALUES.T_amont_SCRUBBER);
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

  const handleTeauChange = createInputHandler(setT_eau, DEFAULT_VALUES.Teau);
  const handleTamontChange = createInputHandler(setT_amont_SCRUBBER, DEFAULT_VALUES.T_amont_SCRUBBER);
  const handlePDCChange = createInputHandler(setPDC_aero, DEFAULT_VALUES.PDC_aero);

  // Composant ToggleButton réutilisable
  const ToggleButton = React.memo(({ label, value, mapping, onChange, testId }) => {
    const displayValue = mapping[value] || value;
    const isFirstOption = value === Object.keys(mapping)[0];
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
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
        label={t.ScrubberInput}
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

        {/* Champ conditionnel - température amont (uniquement en mode Tin=Tsat) */}
        {bilanType === BALANCE_TYPES.TIN_TSAT && (
          <InputField 
            label={t.T_amont_SCRUBBER} 
            unit={`[${t.celsius}]`} 
            value={T_amont_SCRUBBER} 
            onChange={handleTamontChange}
            disabled={isCalculating}
            aria-label={`${t.T_amont_SCRUBBER} en ${t.celsius}`}
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
          disabled={!calculationResult_SCRUBBER}
        />
        
        <ClearButton 
          onClick={handleClearStorage}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && calculationResult_SCRUBBER && (
        <CalculationResults 
          isOpen={isSliderOpen} 
          results={calculationResult_SCRUBBER}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !calculationResult_SCRUBBER && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!calculationResult_SCRUBBER || isCalculating}
          style={{ width: '100%', padding: '8px 16px', background: calculationResult_SCRUBBER ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: calculationResult_SCRUBBER ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && calculationResult_SCRUBBER && (
        <SCRUBBER_Retro_Rapport
          calculationResult={calculationResult_SCRUBBER}
          inputParams={{ Teau, T_amont_SCRUBBER, PDC_aero, bilanType }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(SCRUBBER_Parameter_Tab);