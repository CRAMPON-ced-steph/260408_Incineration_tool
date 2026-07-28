/* eslint-disable react/prop-types */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { performCalculation_RK } from './RK_calculations1';
import { performCalculation_RK_with_WHB } from './RK_calculations2';
import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import CalculateSendButton from '../../C_Components/CalculateSendButton';
import '../../index.css';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './RK_traduction';
import useBatchCalcResult from '../../C_Components/useBatchCalcResult';
import RK_Retro_Rapport from './RK_Retro_Rapport';

// Constantes pour les valeurs logiques (ne changent pas avec la langue)
const CALCULATION_MODES = {
  WITH_WHB: 'WITH_WHB',
  WITHOUT_WHB: 'WITHOUT_WHB'
};

const BALANCE_TYPES = {
  NET_CALORIFIC_VALUE: 'NET_CALORIFIC_VALUE',
  WASTE_FLOWRATE: 'WASTE_FLOWRATE'
};

const DIAGRAM_MODES = {
  NO: 'NO',
  YES: 'YES'
};

// Valeurs par défaut
const DEFAULT_VALUES = {
  Tair_RK_C: '15',
  Thermal_losses_MW: '2',
  NCV_kcal_kg: '2200',
  Masse_dechet_kg_h: '6000',
  bilanType_NCV_Masse: BALANCE_TYPES.NET_CALORIFIC_VALUE,
  bilanType_whb: CALCULATION_MODES.WITH_WHB,
  diagramMode: DIAGRAM_MODES.NO
};

const RK_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage, autoTrigger = false, allNodes, nodeId }) => {
  // États principaux
  const [Tair_RK_C, setTair_RK_C] = useState(() =>
    localStorage.getItem(`Tair_RK_C_${nodeId}`) || DEFAULT_VALUES.Tair_RK_C
  );
  const [Thermal_losses_MW, setThermal_losses_MW] = useState(() =>
    localStorage.getItem(`Thermal_losses_MW_RK_${nodeId}`) || DEFAULT_VALUES.Thermal_losses_MW
  );
  const [NCV_kcal_kg, setNCV_kcal_kg] = useState(() =>
    localStorage.getItem(`NCV_kcal_kg_RK_${nodeId}`) || DEFAULT_VALUES.NCV_kcal_kg
  );
  const [Masse_dechet_kg_h, setMasse_dechet_kg_h] = useState(() =>
    localStorage.getItem(`Masse_dechet_kg_h_RK_${nodeId}`) || DEFAULT_VALUES.Masse_dechet_kg_h
  );

  // États pour les types de calcul (utilisation des constantes)
  const [bilanType_NCV_Masse, setBilanType_NCV_Masse] = useState(() =>
    localStorage.getItem(`bilanType_NCV_Masse_RK_${nodeId}`) || DEFAULT_VALUES.bilanType_NCV_Masse
  );
  const [bilanType_whb, setBilanType_whb] = useState(() =>
    localStorage.getItem(`bilanType_whb_RK_${nodeId}`) || DEFAULT_VALUES.bilanType_whb
  );
  const [diagramMode, setDiagramMode] = useState(() =>
    localStorage.getItem(`RK_diagramMode_${nodeId}`) || DEFAULT_VALUES.diagramMode
  );

  // États pour l'interface
  const [calculationResult_RK, setCalculationResult_RK] = useState(() => {
    try {
      const stored = localStorage.getItem(`calculationResult_RK_${nodeId}`);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  useBatchCalcResult(nodeId, setCalculationResult_RK);
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
        localStorage.setItem(`Tair_RK_C_${nodeId}`, Tair_RK_C);
        localStorage.setItem(`Thermal_losses_MW_RK_${nodeId}`, Thermal_losses_MW);
        localStorage.setItem(`NCV_kcal_kg_RK_${nodeId}`, NCV_kcal_kg);
        localStorage.setItem(`Masse_dechet_kg_h_RK_${nodeId}`, Masse_dechet_kg_h);
        localStorage.setItem(`bilanType_NCV_Masse_RK_${nodeId}`, bilanType_NCV_Masse);
        localStorage.setItem(`bilanType_whb_RK_${nodeId}`, bilanType_whb);
        localStorage.setItem(`RK_diagramMode_${nodeId}`, diagramMode);
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
    };
    saveToLocalStorage();
  }, [Tair_RK_C, Thermal_losses_MW, NCV_kcal_kg, Masse_dechet_kg_h, bilanType_NCV_Masse, bilanType_whb, diagramMode]);

  // Sauvegarde des résultats de calcul
  useEffect(() => {
    if (calculationResult_RK) {
      try {
        localStorage.setItem(`calculationResult_RK_${nodeId}`, JSON.stringify(calculationResult_RK));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [calculationResult_RK]);

  // Détection automatique du mode WHB selon la présence d'un noeud WHB sur le canvas
  useEffect(() => {
    if (!allNodes) return;
    const hasWHB = allNodes.some(n => n.data?.label === 'WHB');
    const expected = hasWHB ? CALCULATION_MODES.WITH_WHB : CALCULATION_MODES.WITHOUT_WHB;
    if (bilanType_whb !== expected) {
      setBilanType_whb(expected);
    }
  }, [allNodes]);

  // Validation des entrées
  const validateInputs = useCallback(() => {
    const numericValues = {
      Tair_RK_C: parseFloat(Tair_RK_C),
      Thermal_losses_MW: parseFloat(Thermal_losses_MW),
      NCV_kcal_kg: parseFloat(NCV_kcal_kg),
      Masse_dechet_kg_h: parseFloat(Masse_dechet_kg_h)
    };

    for (const [key, value] of Object.entries(numericValues)) {
      if (isNaN(value) || value < 0) {
        throw new Error(`${t.InvalidInput}: ${key}`);
      }
    }

    return numericValues;
  }, [Tair_RK_C, Thermal_losses_MW, NCV_kcal_kg, Masse_dechet_kg_h, t]);

  // Gestion du calcul principal
  const handleSendData = useCallback(async () => {
    setIsCalculating(true);
    try {
      const validatedInputs = validateInputs();
      
      let result;
      
      if (bilanType_whb === CALCULATION_MODES.WITH_WHB) {
        if (!nodeData?.result?.data_Air_WHB) {
          throw new Error('Données WHB manquantes — calculez d\'abord le nœud WHB puis renvoyez ses données avant de calculer RK en mode WITH_WHB.');
        }
        result = performCalculation_RK_with_WHB(
          nodeData,
          validatedInputs.Tair_RK_C,
          validatedInputs.Thermal_losses_MW,
          validatedInputs.NCV_kcal_kg,
          validatedInputs.Masse_dechet_kg_h,
          bilanType_NCV_Masse
        );
      } else {
        result = performCalculation_RK(
          nodeData,
          validatedInputs.Tair_RK_C,
          validatedInputs.Thermal_losses_MW,
          validatedInputs.NCV_kcal_kg,
          validatedInputs.Masse_dechet_kg_h,
          bilanType_NCV_Masse
        );
      }
      
      const resultWithFlow = {
        ...result,
        dataFlow: nodeData?.result?.dataFlow || {},
      };
      setCalculationResult_RK(resultWithFlow);
      hasCalculatedOnce.current = true;
      onSendData({
        result: resultWithFlow,
        inputData: {
          Tair_RK_C,
          Thermal_losses_MW,
          NCV_kcal_kg,
          Masse_dechet_kg_h,
          bilanType_NCV_Masse,
          bilanType_whb,
        },
      });

      if (diagramMode === DIAGRAM_MODES.YES) {
        const pointE = { x: result.MasseDechet || 0, y: result.P_incinerateur_MWH || 0, label: 'RK', nodeId, lineName: nodeData?.lineName || null };
        localStorage.setItem(`pointE_${nodeId}`, JSON.stringify(pointE));
      }
      
    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      alert(`${t.CalculationError}: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  }, [
    nodeData, bilanType_whb, bilanType_NCV_Masse, diagramMode, validateInputs, onSendData, t
  ]);

  // Toggle pour le diagramme de combustion
  const toggleDiagramMode = useCallback(() => {
    setDiagramMode(prev =>
      prev === DIAGRAM_MODES.NO ? DIAGRAM_MODES.YES : DIAGRAM_MODES.NO
    );
  }, []);



  // Toggle pour le type de bilan NCV/Masse
  const toggleBilanType_NCV_Masse = useCallback(() => {
    setBilanType_NCV_Masse(prev => 
      prev === BALANCE_TYPES.NET_CALORIFIC_VALUE 
        ? BALANCE_TYPES.WASTE_FLOWRATE 
        : BALANCE_TYPES.NET_CALORIFIC_VALUE
    );
  }, []);

  // Toggle du slider des résultats
  const toggleSlider = useCallback(() => {
    setIsSliderOpen(prev => !prev);
  }, []);

  // Effacement de la mémoire
  const clearMemory = useCallback(() => {
    try {
      [`Tair_RK_C_${nodeId}`, `Thermal_losses_MW_RK_${nodeId}`, `NCV_kcal_kg_RK_${nodeId}`, `Masse_dechet_kg_h_RK_${nodeId}`,
       `bilanType_NCV_Masse_RK_${nodeId}`, `bilanType_whb_RK_${nodeId}`, `calculationResult_RK_${nodeId}`, `RK_diagramMode_${nodeId}`
      ].forEach(key => localStorage.removeItem(key));
      setCalculationResult_RK(null);
      
      // Réinitialisation aux valeurs par défaut
      setTair_RK_C(DEFAULT_VALUES.Tair_RK_C);
      setThermal_losses_MW(DEFAULT_VALUES.Thermal_losses_MW);
      setNCV_kcal_kg(DEFAULT_VALUES.NCV_kcal_kg);
      setMasse_dechet_kg_h(DEFAULT_VALUES.Masse_dechet_kg_h);
      setBilanType_NCV_Masse(DEFAULT_VALUES.bilanType_NCV_Masse);
      setBilanType_whb(DEFAULT_VALUES.bilanType_whb);
      setDiagramMode(DEFAULT_VALUES.diagramMode);
      
    } catch (error) {
      console.warn('Erreur lors de l\'effacement:', error);
    }
  }, []);

  // Gestionnaires d'entrée avec validation
  const handleInputChange = useCallback((setter, fallbackValue) => (e) => {
    const value = e.target.value;
    setter(value || fallbackValue);
  }, []);

  // Mappage des valeurs pour l'affichage traduit
  const getDisplayValue = useCallback((internalValue, mapping) => {
    return mapping[internalValue] || internalValue;
  }, []);

  const getDisplayOptions = useCallback((mapping) => {
    return Object.values(mapping);
  }, []);

  // Mappings pour les traductions
  const balanceDisplayMapping = useMemo(() => ({
    [BALANCE_TYPES.NET_CALORIFIC_VALUE]: t.NetCalorificValue,
    [BALANCE_TYPES.WASTE_FLOWRATE]: t.WasteFlowrate
  }), [t]);

  const diagramDisplayMapping = useMemo(() => ({
    [DIAGRAM_MODES.NO]: 'Non',
    [DIAGRAM_MODES.YES]: 'Oui'
  }), []);

  // Composant ToggleButton réutilisable et corrigé
  const ToggleButton = React.memo(({ label, value, mapping, onChange, testId }) => {
    const displayValue = getDisplayValue(value, mapping);
    const isFirstOption = value === Object.keys(mapping)[0];
    
    return (
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
        <label style={{ marginRight: '10px' }}>{label}:</label>
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

  // Réf vers la dernière version de handleSendData, pour la déclencher sans dépendre
  // de son identité. handleSendData change à chaque fois que `onSendData` change
  // (recréé quand `nodes` change dans Main_FLOW) ; dépendre de [handleSendData]
  // provoquait une boucle onSendData → setNodes → recalcul qui bloquait l'onglet.
  const handleSendDataRef = useRef(handleSendData);
  handleSendDataRef.current = handleSendData;

  useEffect(() => {
    if (!autoTrigger || hasAutoTriggered.current) return;
    hasAutoTriggered.current = true;
    handleSendDataRef.current();
  }, [autoTrigger]);

  // Recalcul automatique quand l'utilisateur change une entrée OU une option.
  // Dépendances = valeurs (pas handleSendData) → une seule passe, pas de boucle.
  useEffect(() => {
    if (!hasCalculatedOnce.current) return;
    handleSendDataRef.current();
  }, [Tair_RK_C, Thermal_losses_MW, NCV_kcal_kg, Masse_dechet_kg_h, bilanType_NCV_Masse, bilanType_whb, diagramMode]);

  // Copie d'affichage : renomme la clé top-level "NCV" → "NCV [kcal/kg]" pour le tableau
  // Calculation Results, sans toucher au résultat stocké/envoyé (r.NCV reste utilisé ailleurs).
  const displayResult = useMemo(() => {
    if (!calculationResult_RK || typeof calculationResult_RK !== 'object') return calculationResult_RK;
    return Object.entries(calculationResult_RK).reduce((acc, [k, v]) => {
      acc[k === 'NCV' ? 'NCV [kcal/kg]' : k] = v;
      return acc;
    }, {});
  }, [calculationResult_RK]);

  return (
    <div className="container-box">
      <CloseButton onClose={onClose} />
      <h3>{t.Parametres} {title}</h3>

      {/* Mode WHB détecté automatiquement selon la présence d'un nœud WHB sur le canvas
          (bouton indicateur masqué — voir useEffect de détection auto plus haut) */}

      <div className="inputs-container">
        {/* Champ température de l'air */}
        <InputField 
          label={t.Tair} 
          unit={`[${t.celsius}]`} 
          value={Tair_RK_C} 
          onChange={handleInputChange(setTair_RK_C, '15')}
          disabled={isCalculating}
        />
        
        {/* Champ pertes thermiques */}
        <InputField 
          label={t.PertesThermiques} 
          unit={`[${t.megawatt}]`} 
          value={Thermal_losses_MW} 
          onChange={handleInputChange(setThermal_losses_MW, '2')}
          disabled={isCalculating}
        />

        {/* Toggle pour le type de bilan NCV/Masse */}
        <div className="toggle-container">
          <ToggleButton 
            label={t.BilanTyp}
            value={bilanType_NCV_Masse}
            mapping={balanceDisplayMapping}
            onChange={toggleBilanType_NCV_Masse}
            testId="balance-type-toggle"
          />
        </div>

        {/* Champ conditionnel selon le type de bilan */}
        {bilanType_NCV_Masse === BALANCE_TYPES.NET_CALORIFIC_VALUE ? (
          <InputField
            label={t.PCI}
            unit={`[${t.kcalPerKg}]`}
            value={NCV_kcal_kg}
            onChange={handleInputChange(setNCV_kcal_kg, '0')}
            disabled={isCalculating}
          />
        ) : (
          <InputField
            label={t.DebitDechets}
            unit={`[${t.kgPerHour}]`}
            value={Masse_dechet_kg_h}
            onChange={handleInputChange(setMasse_dechet_kg_h, '0')}
            disabled={isCalculating}
          />
        )}

        {/* Toggle pour l'envoi vers le diagramme de combustion */}
        <div className="toggle-container">
          <ToggleButton
            label="Diagramme"
            value={diagramMode}
            mapping={diagramDisplayMapping}
            onChange={toggleDiagramMode}
            testId="diagram-toggle"
          />
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="prez-3-buttons">
        <CalculateSendButton
          onClick={handleSendData}
          disabled={isCalculating}
          currentLanguage={currentLanguage}
          isCalculating={isCalculating}
          storageKey={`calcSent_${title}_${nodeId}`}
        />
        
        <ShowResultButton 
          isOpen={isSliderOpen} 
          onToggle={toggleSlider}
          currentLanguage={currentLanguage}
          disabled={!calculationResult_RK}
        />
        
        <ClearButton 
          onClick={clearMemory}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && calculationResult_RK && (
        <CalculationResults
          isOpen={isSliderOpen}
          results={displayResult}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !calculationResult_RK && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      {/* Bouton Editer Rapport */}
      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!calculationResult_RK || isCalculating}
          style={{
            width: '100%',
            padding: '8px 16px',
            background: calculationResult_RK ? '#1a3a6b' : '#ccc',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: calculationResult_RK ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
        >
          Editer Rapport
        </button>
      </div>

      {/* Modal rapport */}
      {showReport && calculationResult_RK && (
        <RK_Retro_Rapport
          calculationResult={calculationResult_RK}
          nodeData={nodeData}
          inputParams={{
            Tair_RK_C,
            Thermal_losses_MW,
            NCV_kcal_kg,
            Masse_dechet_kg_h,
            bilanType_NCV_Masse,
            bilanType_whb,
          }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(RK_Parameter_Tab);