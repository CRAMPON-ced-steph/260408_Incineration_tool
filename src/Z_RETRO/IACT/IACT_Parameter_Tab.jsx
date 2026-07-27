/* eslint-disable react/prop-types */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { performCalculation_IACT } from './IACT_calculations';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import CalculateSendButton from '../../C_Components/CalculateSendButton';
import useBatchCalcResult from '../../C_Components/useBatchCalcResult';

import IACT_Retro_Rapport from './IACT_Retro_Rapport';
import '../../index.css';

// Constantes pour localStorage (suffixées par nodeId)
const getStorageKeys = (nodeId) => ({
  T_AIR_DECOLMATATION: `T_air_decolmatation_IACT_${nodeId}`,
  T_AIR_CHAUFFE: `T_air_chauffe_IACT_${nodeId}`,
  RENDEMENT_ECHANGE: `Rendement_echange_IACT_${nodeId}`,
  T_AMONT_IACT: `T_amont_IACT_${nodeId}`,
  PDC_AERO: `PDC_aero_IACT_${nodeId}`,
  CALCULATION_RESULT: `CalculationResult_IACT_${nodeId}`
});

const IACT_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage, nodeId, autoTrigger = false }) => {
  const STORAGE_KEYS = useMemo(() => getStorageKeys(nodeId), [nodeId]);

  const [T_air_ambiant, setT_air_ambiant]       = useState(() => parseFloat(localStorage.getItem(getStorageKeys(nodeId).T_AIR_DECOLMATATION)) || 15);
  const [T_air_chauffe, setT_air_chauffe]       = useState(() => parseFloat(localStorage.getItem(getStorageKeys(nodeId).T_AIR_CHAUFFE)) || 150);
  const [Rendement_echange, setRendement_echange] = useState(() => parseFloat(localStorage.getItem(getStorageKeys(nodeId).RENDEMENT_ECHANGE)) || 95);
  const [T_amont_IACT, setT_amont_IACT]         = useState(() => parseFloat(localStorage.getItem(getStorageKeys(nodeId).T_AMONT_IACT)) || nodeData?.result?.dataFlow?.T || 200);
  const [PDC_aero, setPDC_aero]                 = useState(() => parseFloat(localStorage.getItem(getStorageKeys(nodeId).PDC_AERO)) || 10);

  const [CalculationResult_IACT, setCalculationResult] = useState(null);
  useBatchCalcResult(nodeId, setCalculationResult);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEYS.T_AIR_DECOLMATATION, T_air_ambiant); }, [T_air_ambiant, STORAGE_KEYS]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.T_AIR_CHAUFFE, T_air_chauffe); }, [T_air_chauffe, STORAGE_KEYS]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.RENDEMENT_ECHANGE, Rendement_echange); }, [Rendement_echange, STORAGE_KEYS]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.T_AMONT_IACT, T_amont_IACT); }, [T_amont_IACT, STORAGE_KEYS]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PDC_AERO, PDC_aero); }, [PDC_aero, STORAGE_KEYS]);

  useEffect(() => {
    if (CalculationResult_IACT) {
      localStorage.setItem(STORAGE_KEYS.CALCULATION_RESULT, JSON.stringify(CalculationResult_IACT));
    }
  }, [CalculationResult_IACT, STORAGE_KEYS]);

  useEffect(() => {
    if (nodeData?.result) {
      try {
        const result = performCalculation_IACT(
          nodeData,
          parseFloat(T_air_ambiant),
          parseFloat(T_air_chauffe),
          parseFloat(Rendement_echange),
          parseFloat(T_amont_IACT),
          parseFloat(PDC_aero)
        );
        setCalculationResult(result);
        if (hasCalculatedOnce.current) {
          onSendData({ result, inputData: { T_amont_IACT, T_air_ambiant, T_air_chauffe, Rendement_echange, PDC_aero } });
        }
      } catch (error) {
        console.error('Error recalculating with updated nodeData:', error);
      }
    }
  }, [nodeData, T_air_ambiant, T_air_chauffe, Rendement_echange, T_amont_IACT, PDC_aero]);

  const handleSendData = () => {
    if (!nodeData?.result) {
      console.warn('No input data available');
      return;
    }
    try {
      const result = performCalculation_IACT(
        nodeData,
        parseFloat(T_air_ambiant),
        parseFloat(T_air_chauffe),
        parseFloat(Rendement_echange),
        parseFloat(T_amont_IACT),
        parseFloat(PDC_aero)
      );
      setCalculationResult(result);
      hasCalculatedOnce.current = true;
      onSendData({
        result,
        inputData: { T_amont_IACT, T_air_ambiant, T_air_chauffe, Rendement_echange, PDC_aero },
      });
    } catch (error) {
      console.error('Calculation error:', error);
      alert(`Error in calculation: ${error.message}`);
    }
  };

  const clearMemory = () => {
    setT_air_ambiant(15);
    setT_air_chauffe(150);
    setRendement_echange(95);
    setT_amont_IACT(nodeData?.result?.dataFlow?.T || 200);
    setPDC_aero(10);
    setCalculationResult(null);
    setIsSliderOpen(false);
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
  };

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

      <h3>{title} Parameters</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <InputField label="T fumées amont"       unit="[°C]"  value={T_amont_IACT}      onChange={(e) => setT_amont_IACT(parseFloat(e.target.value) || 0)} />
        <InputField label="T air ambiant"         unit="[°C]"  value={T_air_ambiant}     onChange={(e) => setT_air_ambiant(parseFloat(e.target.value) || 0)} />
        <InputField label="T air réchauffé"       unit="[°C]"  value={T_air_chauffe}     onChange={(e) => setT_air_chauffe(parseFloat(e.target.value) || 0)} />
        <InputField label="Rendement d'échange"   unit="[%]"   value={Rendement_echange} onChange={(e) => setRendement_echange(parseFloat(e.target.value) || 0)} />
        <InputField label="PDC aero"              unit="[mmCE]" value={PDC_aero}         onChange={(e) => setPDC_aero(parseFloat(e.target.value) || 0)} />
      </div>

      <div className="prez-3-buttons">
        <CalculateSendButton onClick={handleSendData} currentLanguage={currentLanguage} storageKey={`calcSent_${title}_${nodeId}`} />
        <ShowResultButton isOpen={isSliderOpen} onToggle={() => setIsSliderOpen(!isSliderOpen)} currentLanguage={currentLanguage} />
        <ClearButton onClick={clearMemory} currentLanguage={currentLanguage} />
      </div>

      {isSliderOpen && CalculationResult_IACT && (
        <CalculationResults isOpen={isSliderOpen} results={CalculationResult_IACT} />
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!CalculationResult_IACT}
          style={{ width: '100%', padding: '8px 16px', background: CalculationResult_IACT ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: CalculationResult_IACT ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && CalculationResult_IACT && (
        <IACT_Retro_Rapport
          calculationResult={CalculationResult_IACT}
          inputParams={{ T_amont_IACT, T_air_ambiant, T_air_chauffe, Rendement_echange, PDC_aero }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default IACT_Parameter_Tab;
