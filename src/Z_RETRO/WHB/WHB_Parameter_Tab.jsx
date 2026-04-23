import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { performCalculation_WHB_option_T_Qair } from './WHB_calculation_option1';
import { performCalculation_WHB_option_T_O2 } from './WHB_calculation_option2';
import { performCalculation_WHB_option_Qeau_Qair } from './WHB_calculation_option3';
import { performCalculation_WHB_option_Qeau_O2 } from './WHB_calculation_option4';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import WHB_Retro_Rapport from './WHB_Retro_Rapport';
import '../../index.css';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './WHB_traduction';

// Constantes pour les modes de calcul
const STEAM_TYPES = {
  SATURATED: 'SATURATED_STEAM',
  SUPERHEATED: 'SUPERHEATED_STEAM'
};

const BALANCE_TYPES = {
  TEMPERATURE: 'TEMPERATURE_BALANCE',
  WATER_FLOW: 'WATER_FLOW_BALANCE'
};

const AIR_BALANCE_TYPES = {
  PARASITIC_AIR: 'PARASITIC_AIR_FLOW',
  O2_MEASUREMENT: 'O2_MEASUREMENT'
};

// Constantes pour localStorage
const STORAGE_KEYS = {
  T_EAU_ALIMENTATION: 'T_eau_alimentation_C',
  Q_AIR_PARASITE: 'Q_air_parasite_Nm3_h',
  Q_EAU_PURGE: 'Q_eau_purge_pourcent',
  T_AIR_EXTERIEUR: 'T_air_exterieur_C',
  P_TH: 'P_th_pourcent',
  P_VAPEUR: 'P_vapeur_bar',
  T_VAPEUR: 'T_vapeur',
  T_VAPEUR_SURCHAUFFEE: 'T_vapeur_surchauffee_C',
  T_AMONT_WHB: 'T_amont_WHB_C',
  Q_EAU_ALIMENTATION: 'Q_eau_alimentation',
  O2_MESURE: 'O2_mesure',
  BILAN_TYPE_VAPEUR: 'bilanTypeVapeur',
  BILAN_TYPE: 'WHB_bilanType',
  BILAN_TYPE_AIR: 'bilanTypeAir',
  CALCULATION_RESULT: 'calculationResult_WHB'
};

// Valeurs par défaut
const DEFAULT_VALUES = {
  T_eau_alimentation_C: '130',
  Q_air_parasite_Nm3_h: '1000',
  Q_eau_purge_pourcent: '1.5',
  T_air_exterieur_C: '15',
  P_th_pourcent: '2',
  P_vapeur_bar: '30',
  T_vapeur: '0',
  T_vapeur_surchauffee_C: '250',
  T_amont_WHB_C: '950',
  Q_eau_alimentation: '0',
  O2_mesure: '0',
  bilanTypeVapeur: STEAM_TYPES.SATURATED,
  bilanType: BALANCE_TYPES.TEMPERATURE,
  bilanTypeAir: AIR_BALANCE_TYPES.PARASITIC_AIR
};

const WHB_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage }) => {
  // États principaux
  const [T_eau_alimentation_C, setT_eau_alimentation_C] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.T_EAU_ALIMENTATION) || DEFAULT_VALUES.T_eau_alimentation_C
  );
  const [Q_air_parasite_Nm3_h, setQ_air_parasite_Nm3_h] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.Q_AIR_PARASITE) || DEFAULT_VALUES.Q_air_parasite_Nm3_h
  );
  const [Q_eau_purge_pourcent, setQ_eau_purge_pourcent] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.Q_EAU_PURGE) || DEFAULT_VALUES.Q_eau_purge_pourcent
  );
  const [T_air_exterieur_C, setT_air_exterieur_C] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.T_AIR_EXTERIEUR) || DEFAULT_VALUES.T_air_exterieur_C
  );
  const [P_th_pourcent, setP_th_pourcent] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.P_TH) || DEFAULT_VALUES.P_th_pourcent
  );
  const [P_vapeur_bar, setP_vapeur_bar] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.P_VAPEUR) || DEFAULT_VALUES.P_vapeur_bar
  );
  const [T_vapeur, setT_vapeur] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.T_VAPEUR) || DEFAULT_VALUES.T_vapeur
  );
  const [T_vapeur_surchauffee_C, setT_vapeur_surchauffee_C] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.T_VAPEUR_SURCHAUFFEE) || DEFAULT_VALUES.T_vapeur_surchauffee_C
  );
  const [T_amont_WHB_C, setT_amont_WHB_C] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.T_AMONT_WHB) || DEFAULT_VALUES.T_amont_WHB_C
  );
  const [Q_eau_alimentation, setQ_eau_alimentation] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.Q_EAU_ALIMENTATION) || DEFAULT_VALUES.Q_eau_alimentation
  );
  const [O2_mesure, setO2_mesure] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.O2_MESURE) || nodeData?.result?.dataFlow?.O2_dry_pourcent || DEFAULT_VALUES.O2_mesure
  );

  // États pour les modes de calcul
  const [bilanTypeVapeur, setBilanTypeVapeur] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.BILAN_TYPE_VAPEUR) || DEFAULT_VALUES.bilanTypeVapeur
  );
  const [bilanType, setBilanType] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.BILAN_TYPE);
    return Object.values(BALANCE_TYPES).includes(stored) ? stored : DEFAULT_VALUES.bilanType;
  });
  const [bilanTypeAir, setBilanTypeAir] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.BILAN_TYPE_AIR) || DEFAULT_VALUES.bilanTypeAir
  );

  // États pour l'interface
  const [calculationResult_WHB, setCalculationResult_WHB] = useState(() => {
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
  const { t } = useMemo(() => {
    const code = getLanguageCode(currentLanguage);
    const translationsObj = translations[code] || translations['en'];
    return { t: translationsObj };
  }, [currentLanguage]);

  // Mappings pour les traductions des toggles
  const steamTypeMapping = useMemo(() => ({
    [STEAM_TYPES.SATURATED]: t.VapeurSaturee,
    [STEAM_TYPES.SUPERHEATED]: t.VapeurSurchauffee
  }), [t]);

  const balanceTypeMapping = useMemo(() => ({
    [BALANCE_TYPES.TEMPERATURE]: t.BilanParT,
    [BALANCE_TYPES.WATER_FLOW]: t.BilanParQeau
  }), [t]);

  const airBalanceTypeMapping = useMemo(() => ({
    [AIR_BALANCE_TYPES.PARASITIC_AIR]: t.BilanParQair,
    [AIR_BALANCE_TYPES.O2_MEASUREMENT]: t.BilanParO2
  }), [t]);

  // Sauvegarde centralisée dans localStorage
  useEffect(() => {
    const saveToLocalStorage = () => {
      try {
        const dataToSave = {
          [STORAGE_KEYS.T_EAU_ALIMENTATION]: T_eau_alimentation_C,
          [STORAGE_KEYS.Q_AIR_PARASITE]: Q_air_parasite_Nm3_h,
          [STORAGE_KEYS.Q_EAU_PURGE]: Q_eau_purge_pourcent,
          [STORAGE_KEYS.T_AIR_EXTERIEUR]: T_air_exterieur_C,
          [STORAGE_KEYS.P_TH]: P_th_pourcent,
          [STORAGE_KEYS.P_VAPEUR]: P_vapeur_bar,
          [STORAGE_KEYS.T_VAPEUR]: T_vapeur,
          [STORAGE_KEYS.T_VAPEUR_SURCHAUFFEE]: T_vapeur_surchauffee_C,
          [STORAGE_KEYS.T_AMONT_WHB]: T_amont_WHB_C,
          [STORAGE_KEYS.Q_EAU_ALIMENTATION]: Q_eau_alimentation,
          [STORAGE_KEYS.O2_MESURE]: O2_mesure,
          [STORAGE_KEYS.BILAN_TYPE_VAPEUR]: bilanTypeVapeur,
          [STORAGE_KEYS.BILAN_TYPE]: bilanType,
          [STORAGE_KEYS.BILAN_TYPE_AIR]: bilanTypeAir
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
    T_eau_alimentation_C, Q_air_parasite_Nm3_h, Q_eau_purge_pourcent, T_air_exterieur_C,
    P_th_pourcent, P_vapeur_bar, T_vapeur, T_vapeur_surchauffee_C, T_amont_WHB_C,
    Q_eau_alimentation, O2_mesure, bilanTypeVapeur, bilanType, bilanTypeAir
  ]);

  // Sauvegarde des résultats
  useEffect(() => {
    if (calculationResult_WHB) {
      try {
        localStorage.setItem(STORAGE_KEYS.CALCULATION_RESULT, JSON.stringify(calculationResult_WHB));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [calculationResult_WHB]);

  // Validation des entrées
  const validateInputs = useCallback(() => {
    const inputs = {
      T_eau_alimentation_C: parseFloat(T_eau_alimentation_C),
      Q_air_parasite_Nm3_h: parseFloat(Q_air_parasite_Nm3_h),
      Q_eau_purge_pourcent: parseFloat(Q_eau_purge_pourcent),
      T_air_exterieur_C: parseFloat(T_air_exterieur_C),
      P_th_pourcent: parseFloat(P_th_pourcent),
      P_vapeur_bar: parseFloat(P_vapeur_bar),
      T_vapeur: parseFloat(T_vapeur),
      T_vapeur_surchauffee_C: parseFloat(T_vapeur_surchauffee_C),
      T_amont_WHB_C: parseFloat(T_amont_WHB_C),
      Q_eau_alimentation: parseFloat(Q_eau_alimentation),
      O2_mesure: parseFloat(O2_mesure)
    };

    // Validation des valeurs numériques
    for (const [key, value] of Object.entries(inputs)) {
      if (isNaN(value)) {
        throw new Error(`${t.InvalidInput}: ${key}`);
      }
    }

    // Validations spécifiques
    if (inputs.P_vapeur_bar <= 0) {
      throw new Error(`${t.InvalidInput}: Steam pressure must be positive`);
    }
    if (inputs.Q_eau_purge_pourcent < 0 || inputs.Q_eau_purge_pourcent > 100) {
      throw new Error(`${t.InvalidInput}: Purge percentage must be between 0-100%`);
    }
    if (inputs.O2_mesure < 0 || inputs.O2_mesure > 21) {
      throw new Error(`${t.InvalidInput}: O2 percentage must be between 0-21%`);
    }

    return inputs;
  }, [
    T_eau_alimentation_C, Q_air_parasite_Nm3_h, Q_eau_purge_pourcent, T_air_exterieur_C,
    P_th_pourcent, P_vapeur_bar, T_vapeur, T_vapeur_surchauffee_C, T_amont_WHB_C,
    Q_eau_alimentation, O2_mesure, t
  ]);

  // Sélection de la fonction de calcul appropriée
  const getCalculationFunction = useCallback(() => {
    if (bilanType === BALANCE_TYPES.TEMPERATURE && bilanTypeAir === AIR_BALANCE_TYPES.PARASITIC_AIR) {
      return performCalculation_WHB_option_T_Qair;
    }
    if (bilanType === BALANCE_TYPES.TEMPERATURE && bilanTypeAir === AIR_BALANCE_TYPES.O2_MEASUREMENT) {
      return performCalculation_WHB_option_T_O2;
    }
    if (bilanType === BALANCE_TYPES.WATER_FLOW && bilanTypeAir === AIR_BALANCE_TYPES.PARASITIC_AIR) {
      return performCalculation_WHB_option_Qeau_Qair;
    }
    if (bilanType === BALANCE_TYPES.WATER_FLOW && bilanTypeAir === AIR_BALANCE_TYPES.O2_MEASUREMENT) {
      return performCalculation_WHB_option_Qeau_O2;
    }
    throw new Error('Invalid calculation mode combination');
  }, [bilanType, bilanTypeAir]);

  // Préparation des paramètres de calcul
  const getCalculationParams = useCallback((validatedInputs) => {
    const baseParams = [
      nodeData,
      validatedInputs.T_eau_alimentation_C,
      validatedInputs.Q_eau_purge_pourcent,
      validatedInputs.T_air_exterieur_C,
      validatedInputs.P_th_pourcent,
      validatedInputs.P_vapeur_bar,
      bilanTypeVapeur,
      validatedInputs.T_vapeur_surchauffee_C
    ];

    // Le dernier paramètre dépend du type de bilan et du type d'air
    if (bilanType === BALANCE_TYPES.TEMPERATURE) {
      baseParams.push(validatedInputs.T_amont_WHB_C);
    } else {
      baseParams.push(validatedInputs.Q_eau_alimentation);
    }

    if (bilanTypeAir === AIR_BALANCE_TYPES.PARASITIC_AIR) {
      baseParams.push(validatedInputs.Q_air_parasite_Nm3_h);
    } else {
      baseParams.push(validatedInputs.O2_mesure);
    }

    return baseParams;
  }, [nodeData, bilanType, bilanTypeAir, bilanTypeVapeur]);

  // Gestion du calcul principal
  const handleSendData = useCallback(async () => {
    if (!nodeData?.result) {
      alert(t.NoInputData);
      return;
    }

    setIsCalculating(true);
    
    try {
      const validatedInputs = validateInputs();
      const calculationFunction = getCalculationFunction();
      const params = getCalculationParams(validatedInputs);
      
      const result = calculationFunction(...params);
      
      setCalculationResult_WHB(result);
      onSendData({ result, inputData: { T_eau_alimentation_C, Q_air_parasite_Nm3_h, Q_eau_purge_pourcent, T_air_exterieur_C, P_th_pourcent, P_vapeur_bar, T_vapeur_surchauffee_C, T_amont_WHB_C, Q_eau_alimentation, O2_mesure, bilanTypeVapeur, bilanType, bilanTypeAir } });

    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      alert(`${t.CalculationError}: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  }, [nodeData, validateInputs, getCalculationFunction, getCalculationParams, onSendData, t]);

  // Gestion des toggles
  const toggleBilanTypeVapeur = useCallback(() => {
    setBilanTypeVapeur(prev => 
      prev === STEAM_TYPES.SATURATED ? STEAM_TYPES.SUPERHEATED : STEAM_TYPES.SATURATED
    );
  }, []);

  const toggleBilanType = useCallback(() => {
    setBilanType(prev => 
      prev === BALANCE_TYPES.TEMPERATURE ? BALANCE_TYPES.WATER_FLOW : BALANCE_TYPES.TEMPERATURE
    );
  }, []);

  const toggleBilanAir = useCallback(() => {
    setBilanTypeAir(prev => 
      prev === AIR_BALANCE_TYPES.PARASITIC_AIR ? AIR_BALANCE_TYPES.O2_MEASUREMENT : AIR_BALANCE_TYPES.PARASITIC_AIR
    );
  }, []);

  // Autres gestionnaires
  const toggleSlider = useCallback(() => {
    setIsSliderOpen(prev => !prev);
  }, []);

  const clearMemory = useCallback(() => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      
      setCalculationResult_WHB(null);
      
      // Réinitialisation aux valeurs par défaut
      setT_eau_alimentation_C(DEFAULT_VALUES.T_eau_alimentation_C);
      setQ_air_parasite_Nm3_h(DEFAULT_VALUES.Q_air_parasite_Nm3_h);
      setQ_eau_purge_pourcent(DEFAULT_VALUES.Q_eau_purge_pourcent);
      setT_air_exterieur_C(DEFAULT_VALUES.T_air_exterieur_C);
      setP_th_pourcent(DEFAULT_VALUES.P_th_pourcent);
      setP_vapeur_bar(DEFAULT_VALUES.P_vapeur_bar);
      setT_vapeur(DEFAULT_VALUES.T_vapeur);
      setT_vapeur_surchauffee_C(DEFAULT_VALUES.T_vapeur_surchauffee_C);
      setT_amont_WHB_C(DEFAULT_VALUES.T_amont_WHB_C);
      setQ_eau_alimentation(DEFAULT_VALUES.Q_eau_alimentation);
      setO2_mesure(DEFAULT_VALUES.O2_mesure);
      setBilanTypeVapeur(DEFAULT_VALUES.bilanTypeVapeur);
      setBilanType(DEFAULT_VALUES.bilanType);
      setBilanTypeAir(DEFAULT_VALUES.bilanTypeAir);
      
    } catch (error) {
      console.warn('Erreur lors de l\'effacement:', error);
    }
  }, []);

  // Gestionnaires d'entrée optimisés
  const createInputHandler = useCallback((setter, fallback = '0') => 
    (e) => setter(e.target.value || fallback), []
  );

  // Composant ToggleButton réutilisable
  const ToggleButton = React.memo(({ label, value, mapping, onChange, testId }) => {
    const displayValue = mapping[value] || value;
    const isFirstOption = value === Object.keys(mapping)[0];
    
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
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
      
      <div className="inputs-container" style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Champs communs */}
        <InputField 
          label={t.T_eau_alimentation} 
          unit={`[${t.celsius}]`} 
          value={T_eau_alimentation_C} 
          onChange={createInputHandler(setT_eau_alimentation_C, DEFAULT_VALUES.T_eau_alimentation_C)}
          disabled={isCalculating}
        />
        
        <InputField 
          label={t.Q_eau_purge} 
          unit={`[${t.percent}]`} 
          value={Q_eau_purge_pourcent} 
          onChange={createInputHandler(setQ_eau_purge_pourcent, DEFAULT_VALUES.Q_eau_purge_pourcent)}
          disabled={isCalculating}
        />
        
        <InputField 
          label={t.T_air_exterieur} 
          unit={`[${t.celsius}]`} 
          value={T_air_exterieur_C} 
          onChange={createInputHandler(setT_air_exterieur_C, DEFAULT_VALUES.T_air_exterieur_C)}
          disabled={isCalculating}
        />
        
        <InputField 
          label={t.Pertes_thermiques} 
          unit={`[${t.percent}]`} 
          value={P_th_pourcent} 
          onChange={createInputHandler(setP_th_pourcent, DEFAULT_VALUES.P_th_pourcent)}
          disabled={isCalculating}
        />
        
        <InputField 
          label={t.Pression_vapeur} 
          unit={`[${t.bar}]`} 
          value={P_vapeur_bar} 
          onChange={createInputHandler(setP_vapeur_bar, DEFAULT_VALUES.P_vapeur_bar)}
          disabled={isCalculating}
        />

        {/* Toggle type de vapeur */}
        <ToggleButton 
          label={t.BilanTypeVapeur}
          value={bilanTypeVapeur}
          mapping={steamTypeMapping}
          onChange={toggleBilanTypeVapeur}
          testId="steam-type-toggle"
        />

        {/* Champ conditionnel pour vapeur surchauffée */}
        {bilanTypeVapeur === STEAM_TYPES.SUPERHEATED && (
          <InputField 
            label={t.T_vapeur_surchauffee} 
            unit={`[${t.celsius}]`} 
            value={T_vapeur_surchauffee_C} 
            onChange={createInputHandler(setT_vapeur_surchauffee_C, DEFAULT_VALUES.T_vapeur_surchauffee_C)}
            disabled={isCalculating}
          />
        )}

        {/* Toggle type de bilan principal */}
        <ToggleButton 
          label={t.BilanType}
          value={bilanType}
          mapping={balanceTypeMapping}
          onChange={toggleBilanType}
          testId="balance-type-toggle"
        />

        {/* Champs conditionnels selon le type de bilan */}
        {bilanType === BALANCE_TYPES.TEMPERATURE ? (
          <InputField 
            label={t.T_amont_WHB} 
            unit={`[${t.celsius}]`} 
            value={T_amont_WHB_C} 
            onChange={createInputHandler(setT_amont_WHB_C, DEFAULT_VALUES.T_amont_WHB_C)}
            disabled={isCalculating}
          />
        ) : (
          <InputField 
            label={t.Q_eau_alimentation} 
            unit={`[${t.kg_h}]`} 
            value={Q_eau_alimentation} 
            onChange={createInputHandler(setQ_eau_alimentation, DEFAULT_VALUES.Q_eau_alimentation)}
            disabled={isCalculating}
          />
        )}

        {/* Toggle type de bilan air */}
        <ToggleButton 
          label={t.BilanAirType}
          value={bilanTypeAir}
          mapping={airBalanceTypeMapping}
          onChange={toggleBilanAir}
          testId="air-balance-toggle"
        />

        {/* Champs conditionnels selon le type de bilan air */}
        {bilanTypeAir === AIR_BALANCE_TYPES.PARASITIC_AIR ? (
          <InputField 
            label={t.Q_air_parasite} 
            unit={`[${t.Nm3_h}]`} 
            value={Q_air_parasite_Nm3_h} 
            onChange={createInputHandler(setQ_air_parasite_Nm3_h, DEFAULT_VALUES.Q_air_parasite_Nm3_h)}
            disabled={isCalculating}
          />
        ) : (
          <InputField 
            label={t.O2_sec_mesure} 
            unit={`[${t.percent}]`} 
            value={O2_mesure} 
            onChange={createInputHandler(setO2_mesure, DEFAULT_VALUES.O2_mesure)}
            disabled={isCalculating}
          />
        )}
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
          disabled={!calculationResult_WHB}
        />
        
        <ClearButton 
          onClick={clearMemory}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && calculationResult_WHB && (
        <CalculationResults 
          isOpen={isSliderOpen} 
          results={calculationResult_WHB}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !calculationResult_WHB && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!calculationResult_WHB || isCalculating}
          style={{ width: '100%', padding: '8px 16px', background: calculationResult_WHB ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: calculationResult_WHB ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && calculationResult_WHB && (
        <WHB_Retro_Rapport
          calculationResult={calculationResult_WHB}
          inputParams={{ T_eau_alimentation_C, Q_air_parasite_Nm3_h, Q_eau_purge_pourcent, T_air_exterieur_C, P_th_pourcent, P_vapeur_bar, T_vapeur_surchauffee_C, T_amont_WHB_C, Q_eau_alimentation, O2_mesure, bilanTypeVapeur, bilanType, bilanTypeAir }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(WHB_Parameter_Tab);