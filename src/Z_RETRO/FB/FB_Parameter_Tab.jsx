import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { performCalculation_FB_MS } from './FB_calculation_MS';
import { performCalculation_FB_Qboue } from './FB_calculation_Qboue';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import CalculateSendButton from '../../C_Components/CalculateSendButton';
import FB_Retro_Rapport from './FB_Retro_Rapport';
import '../../index.css';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './FB_traduction';
import useBatchCalcResult from '../../C_Components/useBatchCalcResult';

// Constantes pour les valeurs logiques (ne changent pas avec la langue)
const BALANCE_TYPES = {
  QBOUE: 'Q SLUDGE',
  DS: 'DRY SOLIDS'
};

const DIAGRAM_MODES = {
  NO: 'NO',
  YES: 'YES'
};

// Nouveaux types de déchets
const WASTE_TYPES = {
  PRIMAIRE: 'PRIMAIRE',
  MIXTE: 'MIXTE',
  BIOLOGIQUE: 'BIOLOGIQUE',
  DIGEREE: 'DIGEREE',
  GRAISSE: 'GRAISSE',
  REFUS_DEGRILLAGE: 'REFUS_DEGRILLAGE'
};

// Valeurs par défaut
const DEFAULT_VALUES = {
  Tair_FB_C: '15',
  Thermal_losses_MW: '1',
  NCV_kcal_kg: '2200',
  Masse_dechet_kg_h: '6000',
  bilanType: BALANCE_TYPES.DS,
  diagramMode: DIAGRAM_MODES.NO,
  // Nouveaux paramètres
  wasteType: WASTE_TYPES.PRIMAIRE,
  Q_boue_kg_h: '1000',
  MS_percent: '25',
  MV_percent: '70'
};

const FB_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage, autoTrigger = false, nodeId }) => {
  // Refs stables — évite de recréer handleSendData à chaque update parent
  const nodeDataRef = useRef(nodeData);
  nodeDataRef.current = nodeData;
  const onSendDataRef = useRef(onSendData);
  onSendDataRef.current = onSendData;

  // États principaux existants
  const [Tair_FB_C, setTair_FB_C] = useState(() =>
    localStorage.getItem(`Tair_FB_C_${nodeId}`) || DEFAULT_VALUES.Tair_FB_C
  );
  const [Thermal_losses_MW, setThermal_losses_MW] = useState(() =>
    localStorage.getItem(`Thermal_losses_MW_FB_${nodeId}`) || DEFAULT_VALUES.Thermal_losses_MW
  );
  const [NCV_kcal_kg, setNCV_kcal_kg] = useState(() =>
    localStorage.getItem(`NCV_kcal_kg_FB_${nodeId}`) || DEFAULT_VALUES.NCV_kcal_kg
  );
  const [Masse_dechet_kg_h, setMasse_dechet_kg_h] = useState(() =>
    localStorage.getItem(`Masse_dechet_kg_h_FB_${nodeId}`) || DEFAULT_VALUES.Masse_dechet_kg_h
  );

  // États pour les types de calcul
  const [bilanType, setBilanType] = useState(() =>
    (() => { const s = localStorage.getItem(`FB_bilanType_${nodeId}`); return Object.values(BALANCE_TYPES).includes(s) ? s : DEFAULT_VALUES.bilanType; })()
  );

  // Nouveaux états pour les paramètres ajoutés
  const [wasteType, setWasteType] = useState(() =>
    localStorage.getItem(`wasteType_FB_${nodeId}`) || DEFAULT_VALUES.wasteType
  );
  const [Q_boue_kg_h, setQ_boue_kg_h] = useState(() =>
    localStorage.getItem(`Q_boue_kg_h_FB_${nodeId}`) || DEFAULT_VALUES.Q_boue_kg_h
  );
  const [MS_percent, setMS_percent] = useState(() =>
    localStorage.getItem(`MS_percent_FB_${nodeId}`) || DEFAULT_VALUES.MS_percent
  );
  const [MV_percent, setMV_percent] = useState(() =>
    localStorage.getItem(`MV_percent_FB_${nodeId}`) || DEFAULT_VALUES.MV_percent
  );
  const [diagramMode, setDiagramMode] = useState(() =>
    localStorage.getItem(`FB_diagramMode_${nodeId}`) || DEFAULT_VALUES.diagramMode
  );

  // États pour l'interface
  const [calculationResult_FB, setCalculationResult_FB] = useState(null);
  useBatchCalcResult(nodeId, setCalculationResult_FB);
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
        localStorage.setItem(`Tair_FB_C_${nodeId}`, Tair_FB_C);
        localStorage.setItem(`Thermal_losses_MW_FB_${nodeId}`, Thermal_losses_MW);
        localStorage.setItem(`NCV_kcal_kg_FB_${nodeId}`, NCV_kcal_kg);
        localStorage.setItem(`Masse_dechet_kg_h_FB_${nodeId}`, Masse_dechet_kg_h);
        localStorage.setItem(`FB_bilanType_${nodeId}`, bilanType);
        localStorage.setItem(`FB_diagramMode_${nodeId}`, diagramMode);
        // Nouveaux paramètres
        localStorage.setItem(`wasteType_FB_${nodeId}`, wasteType);
        localStorage.setItem(`Q_boue_kg_h_FB_${nodeId}`, Q_boue_kg_h);
        localStorage.setItem(`MS_percent_FB_${nodeId}`, MS_percent);
        localStorage.setItem(`MV_percent_FB_${nodeId}`, MV_percent);
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
    };
    saveToLocalStorage();
  }, [
    Tair_FB_C, Thermal_losses_MW, NCV_kcal_kg, Masse_dechet_kg_h, 
    bilanType, wasteType, Q_boue_kg_h, MS_percent, MV_percent, diagramMode
  ]);

  // Sauvegarde des résultats de calcul
  useEffect(() => {
    if (calculationResult_FB) {
      try {
        localStorage.setItem(`calculationResult_FB_${nodeId}`, JSON.stringify(calculationResult_FB));
      } catch (error) {
        console.warn('Erreur lors de la sauvegarde des résultats:', error);
      }
    }
  }, [calculationResult_FB]);

  // Validation des entrées mise à jour
  const validateInputs = useCallback(() => {
    const numericValues = {
      Tair_FB_C: parseFloat(Tair_FB_C),
      Thermal_losses_MW: parseFloat(Thermal_losses_MW),
      NCV_kcal_kg: parseFloat(NCV_kcal_kg),
      Masse_dechet_kg_h: parseFloat(Masse_dechet_kg_h),
      Q_boue_kg_h: parseFloat(Q_boue_kg_h),
      MS_percent: parseFloat(MS_percent),
      MV_percent: parseFloat(MV_percent)
    };

    for (const [key, value] of Object.entries(numericValues)) {
      if (isNaN(value) || value < 0) {
        throw new Error(`${t.InvalidInput}: ${key}`);
      }
    }

    // Validation spécifique pour les pourcentages
    if (numericValues.MS_percent > 100) {
      throw new Error(`${t.InvalidInput}: MS ne peut pas dépasser 100%`);
    }
    if (numericValues.MV_percent > 100) {
      throw new Error(`${t.InvalidInput}: MV ne peut pas dépasser 100%`);
    }

    return numericValues;
  }, [Tair_FB_C, Thermal_losses_MW, NCV_kcal_kg, Masse_dechet_kg_h, Q_boue_kg_h, MS_percent, MV_percent, t]);

  // Gestion du calcul principal mise à jour
  const handleSendData = useCallback(async () => {
    setIsCalculating(true);
    try {
      const validatedInputs = validateInputs();
      const nd = nodeDataRef.current;

      let result;

      // Choix de la fonction de calcul selon le type de bilan
      if (bilanType === BALANCE_TYPES.DS) {
        result = performCalculation_FB_MS(
          nd,
          validatedInputs.Tair_FB_C,
          validatedInputs.Thermal_losses_MW,
          validatedInputs.Q_boue_kg_h,
          wasteType,
          validatedInputs.MV_percent
        );
      } else {
        result = performCalculation_FB_Qboue(
          nd,
          validatedInputs.Tair_FB_C,
          validatedInputs.Thermal_losses_MW,
          wasteType,
          validatedInputs.MS_percent,
          validatedInputs.MV_percent
        );
      }

      const resultWithFlow = {
        ...result,
        dataFlow: nd?.result?.dataFlow || {},
      };
      setCalculationResult_FB(resultWithFlow);
      hasCalculatedOnce.current = true;
      if (diagramMode === DIAGRAM_MODES.YES) {
        const pointE = { x: result.MasseDechet || 0, y: result.P_incinerateur_MWH || 0, label: 'FB', nodeId };
        localStorage.setItem(`pointE_${nodeId}`, JSON.stringify(pointE));
      }
      onSendDataRef.current({ result: resultWithFlow, inputData: { Tair_FB_C, Thermal_losses_MW, bilanType, wasteType, Q_boue_kg_h, MS_percent, MV_percent, NCV_kcal_kg } });

    } catch (error) {
      console.error('Erreur lors du calcul:', error);
      alert(`${t.CalculationError}: ${error.message}`);
    } finally {
      setIsCalculating(false);
    }
  }, [
    bilanType, wasteType, validateInputs, t, diagramMode
  ]);

  // Toggle pour le diagramme de combustion
  const toggleDiagramMode = useCallback(() => {
    setDiagramMode(prev =>
      prev === DIAGRAM_MODES.NO ? DIAGRAM_MODES.YES : DIAGRAM_MODES.NO
    );
  }, []);

  // Toggle pour le type de bilan
  const toggleBilanType = useCallback(() => {
    setBilanType(prev => 
      prev === BALANCE_TYPES.DS 
        ? BALANCE_TYPES.QBOUE 
        : BALANCE_TYPES.DS
    );
  }, []);

  // Toggle du slider des résultats
  const toggleSlider = useCallback(() => {
    setIsSliderOpen(prev => !prev);
  }, []);

  // Effacement de la mémoire mis à jour
  const clearMemory = useCallback(() => {
    try {
      [
        `Tair_FB_C_${nodeId}`, `Thermal_losses_MW_FB_${nodeId}`, `NCV_kcal_kg_FB_${nodeId}`,
        `Masse_dechet_kg_h_FB_${nodeId}`, `FB_bilanType_${nodeId}`, `FB_diagramMode_${nodeId}`,
        `wasteType_FB_${nodeId}`, `Q_boue_kg_h_FB_${nodeId}`, `MS_percent_FB_${nodeId}`,
        `MV_percent_FB_${nodeId}`, `calculationResult_FB_${nodeId}`,
      ].forEach(k => localStorage.removeItem(k));
      setCalculationResult_FB(null);
      
      // Réinitialisation aux valeurs par défaut
      setTair_FB_C(DEFAULT_VALUES.Tair_FB_C);
      setThermal_losses_MW(DEFAULT_VALUES.Thermal_losses_MW);
      setNCV_kcal_kg(DEFAULT_VALUES.NCV_kcal_kg);
      setMasse_dechet_kg_h(DEFAULT_VALUES.Masse_dechet_kg_h);
      setBilanType(DEFAULT_VALUES.bilanType);
      setDiagramMode(DEFAULT_VALUES.diagramMode);
      // Nouveaux paramètres
      setWasteType(DEFAULT_VALUES.wasteType);
      setQ_boue_kg_h(DEFAULT_VALUES.Q_boue_kg_h);
      setMS_percent(DEFAULT_VALUES.MS_percent);
      setMV_percent(DEFAULT_VALUES.MV_percent);
      
    } catch (error) {
      console.warn('Erreur lors de l\'effacement:', error);
    }
  }, []);

  // Gestionnaires d'entrée avec validation
  const handleInputChange = useCallback((setter, fallbackValue) => (e) => {
    const value = e.target.value;
    setter(value || fallbackValue);
  }, []);

  // Gestionnaire pour le menu déroulant
  const handleWasteTypeChange = useCallback((e) => {
    setWasteType(e.target.value);
  }, []);

  // Mappage des valeurs pour l'affichage traduit
  const getDisplayValue = useCallback((internalValue, mapping) => {
    return mapping[internalValue] || internalValue;
  }, []);

  // Mappings pour les traductions
  const balanceDisplayMapping = useMemo(() => ({
    [BALANCE_TYPES.DS]: 'DRY SOLIDS',
    [BALANCE_TYPES.QBOUE]: 'Q SLUDGE'
  }), []);

  const diagramDisplayMapping = useMemo(() => ({
    [DIAGRAM_MODES.NO]: 'Non',
    [DIAGRAM_MODES.YES]: 'Oui'
  }), []);

  // Mapping pour les types de déchets
  const wasteTypeMapping = useMemo(() => ({
    [WASTE_TYPES.PRIMAIRE]: 'Primaire',
    [WASTE_TYPES.MIXTE]: 'Mixte',
    [WASTE_TYPES.BIOLOGIQUE]: 'Biologique',
    [WASTE_TYPES.DIGEREE]: 'Digérée',
    [WASTE_TYPES.GRAISSE]: 'Graisse',
    [WASTE_TYPES.REFUS_DEGRILLAGE]: 'Refus dégrillage'
  }), []);

  // Composant ToggleButton réutilisable
  const ToggleButton = ({ label, value, mapping, onChange, testId }) => {
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
  };

  // Composant pour le menu déroulant aligné avec les InputField
  const WasteTypeSelector = () => (
    <div style={{ 
      marginBottom: '15px',
      display: 'flex', 
      flexDirection: 'column',
      gap: '5px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <label style={{ 
          fontSize: '14px',
          fontWeight: '500',
          color: '#333',
          minWidth: '120px',
          textAlign: 'left'
        }}>
          Type de déchet:
        </label>
        <select 
          value={wasteType}
          onChange={handleWasteTypeChange}
          disabled={isCalculating}
          className="waste-type-selector"
          style={{
            flex: '1',
            padding: '8px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: 'white',
            fontSize: '14px',
            minHeight: '36px',
            outline: 'none',
            transition: 'border-color 0.2s ease'
          }}
          onFocus={(e) => e.target.style.borderColor = '#007bff'}
          onBlur={(e) => e.target.style.borderColor = '#ccc'}
        >
          {Object.entries(wasteTypeMapping).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </div>
    </div>
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
      <h3>{t.Parametres} {title}</h3>

      {/* Menu déroulant pour le type de déchet */}
      <div className="waste-type-container">
        <WasteTypeSelector />
      </div>
      
      <div className="inputs-container">
        {/* Champ température de l'air */}
        <InputField 
          label={t.Tair} 
          unit={`[${t.celsius}]`} 
          value={Tair_FB_C} 
          onChange={handleInputChange(setTair_FB_C, '15')}
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

        {/* Toggle pour le type de bilan */}
        <div className="toggle-container">
          <ToggleButton 
            label="Type de bilan"
            value={bilanType}
            mapping={balanceDisplayMapping}
            onChange={toggleBilanType}
            testId="balance-type-toggle"
          />
        </div>

        {/* Nouveaux champs conditionnels selon le type de bilan */}
        {bilanType === BALANCE_TYPES.DS ? (
          // Si "DRY SOLIDS" est sélectionné, on affiche Q boue ET MV
          <>
            <InputField 
              label="Q boue" 
              unit="[m³/h]" 
              value={Q_boue_kg_h} 
              onChange={handleInputChange(setQ_boue_kg_h, '100')}
              disabled={isCalculating}
            />
            
            <InputField 
              label="MV" 
              unit="[%]" 
              value={MV_percent} 
              onChange={handleInputChange(setMV_percent, '70')}
              disabled={isCalculating}
            />
          </>
        ) : (
          // Si "Q SLUDGE" est sélectionné, on affiche MS et MV
          <>
            <InputField 
              label="MS" 
              unit="[%]" 
              value={MS_percent} 
              onChange={handleInputChange(setMS_percent, '25')}
              disabled={isCalculating}
            />

            <InputField 
              label="MV" 
              unit="[%]" 
              value={MV_percent} 
              onChange={handleInputChange(setMV_percent, '70')}
              disabled={isCalculating}
            />
          </>
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

        {/* Champ PCI */}
        <InputField
          label={t.PCI}
          unit={`[${t.kcalPerKg}]`} 
          value={NCV_kcal_kg} 
          onChange={handleInputChange(setNCV_kcal_kg, '2200')}
          disabled={isCalculating}
        />
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
          disabled={!calculationResult_FB}
        />
        
        <ClearButton 
          onClick={clearMemory}
          currentLanguage={currentLanguage}
          disabled={isCalculating}
        />
      </div>

      {/* Affichage conditionnel des résultats */}
      {isSliderOpen && calculationResult_FB && (
        <CalculationResults 
          isOpen={isSliderOpen} 
          results={calculationResult_FB}
          currentLanguage={currentLanguage}
        />
      )}

      {/* Message si pas de résultats */}
      {isSliderOpen && !calculationResult_FB && (
        <div className="no-results-message">
          <p>{t.NoResults}</p>
        </div>
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!calculationResult_FB || isCalculating}
          style={{ width: '100%', padding: '8px 16px', background: calculationResult_FB ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: calculationResult_FB ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && calculationResult_FB && (
        <FB_Retro_Rapport
          calculationResult={calculationResult_FB}
          nodeData={nodeDataRef.current}
          inputParams={{ Tair_FB_C, Thermal_losses_MW, bilanType, wasteType, Q_boue_kg_h, MS_percent, MV_percent, NCV_kcal_kg }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default React.memo(FB_Parameter_Tab);