import React, { useState, useEffect, useRef, useMemo } from 'react';
import { performCalculation_BHF } from './BHF_calculations';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import ToggleButton from '../../C_Components/toggle_button_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';
import CalculateSendButton from '../../C_Components/CalculateSendButton';
import useBatchCalcResult from '../../C_Components/useBatchCalcResult';

import BHF_Retro_Rapport from './BHF_Retro_Rapport';
import '../../index.css';

const BHF_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage, autoTrigger = false, nodeId }) => {
  const [Qair_decolmatation, setQair_decolmatation] = useState(() => { const v = localStorage.getItem(`Qair_decolmatation_BHF_${nodeId}`); return v !== null ? parseFloat(v) : 500; });
  const [T_air_decolmatation, setT_air_decolmatation] = useState(() => { const v = localStorage.getItem(`T_air_decolmatation_BHF_${nodeId}`); return v !== null ? parseFloat(v) : 15; });
  const [T_amont_BHF, setT_amont_BHF] = useState(() => { const v = localStorage.getItem(`T_amont_BHF_${nodeId}`); return v !== null ? parseFloat(v) : (nodeData?.result?.dataFlow?.T || 10); });
  const [PDC_aero, setPDC_aero] = useState(() => localStorage.getItem(`PDC_aero_BHF_${nodeId}`) || '200');

  const [CalculationResult_BHF, setCalculationResult] = useState(null);
  useBatchCalcResult(nodeId, setCalculationResult);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {localStorage.setItem(`Qair_decolmatation_BHF_${nodeId}`, Qair_decolmatation);}, [Qair_decolmatation, nodeId]);
  useEffect(() => {localStorage.setItem(`T_air_decolmatation_BHF_${nodeId}`, T_air_decolmatation);}, [T_air_decolmatation, nodeId]);
  useEffect(() => {localStorage.setItem(`T_amont_BHF_${nodeId}`, T_amont_BHF);}, [T_amont_BHF, nodeId]);
  useEffect(() => { localStorage.setItem(`PDC_aero_BHF_${nodeId}`, PDC_aero); }, [PDC_aero, nodeId]);

  useEffect(() => {
    if (CalculationResult_BHF) {
      localStorage.setItem(`CalculationResult_BHF_${nodeId}`, JSON.stringify(CalculationResult_BHF));
    }
  }, [CalculationResult_BHF, nodeId]);

  useEffect(() => {
    if (nodeData?.result) {
      try {
        const result = performCalculation_BHF(
          nodeData,
          parseFloat(T_air_decolmatation),
          parseFloat(Qair_decolmatation),
          parseFloat(T_amont_BHF), 
          parseFloat(PDC_aero)
        );
        setCalculationResult(result);
        if (hasCalculatedOnce.current) {
          onSendData({ result, inputData: { T_amont_BHF, T_air_decolmatation, Qair_decolmatation, PDC_aero } });
        }
      } catch (error) {
        console.error('Error recalculating with updated nodeData:', error);
      }
    }
  }, [nodeData, T_air_decolmatation, Qair_decolmatation, T_amont_BHF, PDC_aero]);

  const handleSendData = () => {
    if (!nodeData?.result) {
      console.warn('No input data available');
      return;
    }

    try {
      const result = performCalculation_BHF(
        nodeData,
        parseFloat(T_air_decolmatation),
        parseFloat(Qair_decolmatation),
        parseFloat(T_amont_BHF),
        parseFloat(PDC_aero)
      );
      setCalculationResult(result);
      hasCalculatedOnce.current = true;
      onSendData({
        result,
        inputData: { T_amont_BHF, T_air_decolmatation, Qair_decolmatation, PDC_aero },
      });
    } catch (error) {
      console.error('Calculation error:', error);
      alert(`Error in calculation: ${error.message}`);
    }
  };

  const toggleSlider = () => {
    setIsSliderOpen(!isSliderOpen);
  };

  // Function to clear values
  const clearMemory = () => {
    setQair_decolmatation(500);
    setT_air_decolmatation(15);
    setT_amont_BHF(nodeData?.result?.dataFlow?.T || '10');
    setPDC_aero('200');
    setCalculationResult(null);
    setIsSliderOpen(false);
    localStorage.removeItem(`PDC_aero_BHF_${nodeId}`);
    localStorage.removeItem(`Qair_decolmatation_BHF_${nodeId}`);
    localStorage.removeItem(`T_air_decolmatation_BHF_${nodeId}`);
    localStorage.removeItem(`T_amont_BHF_${nodeId}`);
    localStorage.removeItem(`CalculationResult_BHF_${nodeId}`);
  };

  // Copie d'affichage : échange les étiquettes T / T_in dans le panneau "Calculation
  // Results" (valeur amont sous "T_in", aval sous "T"), sans toucher au résultat propagé.
  const displayResult = useMemo(() => {
    if (!CalculationResult_BHF || typeof CalculationResult_BHF !== 'object') return CalculationResult_BHF;
    const df = CalculationResult_BHF.dataFlow;
    if (!df || typeof df !== 'object') return CalculationResult_BHF;
    const renamedDf = Object.entries(df).reduce((acc, [k, v]) => {
      if (k === 'T') acc['T_in'] = v;
      else if (k === 'T_in') acc['T'] = v;
      else acc[k] = v;
      return acc;
    }, {});
    return { ...CalculationResult_BHF, dataFlow: renamedDf };
  }, [CalculationResult_BHF]);

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

      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
    
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <InputField label="Qair_decolmatation" unit="[m³/h]" value={Qair_decolmatation} onChange={(e) => setQair_decolmatation(parseFloat(e.target.value) || 0)}/>
        <InputField label="T air exterieur" unit="[°C]" value={T_air_decolmatation} onChange={(e) => setT_air_decolmatation(parseFloat(e.target.value) || 0)}/>
        <InputField label="T fumées amont" unit="[°C]" value={T_amont_BHF} onChange={(e) => setT_amont_BHF(parseFloat(e.target.value) || 0)}/>
        <InputField label="PDC aero" unit="[mmCE]" value={PDC_aero} onChange={(e) => setPDC_aero(e.target.value)} />
      </div>

      <div className="prez-3-buttons">
        <CalculateSendButton onClick={handleSendData} currentLanguage={currentLanguage} storageKey={`calcSent_${title}_${nodeId}`} />
        <ShowResultButton isOpen={isSliderOpen} onToggle={toggleSlider} currentLanguage={currentLanguage} />
        <ClearButton onClick={clearMemory} currentLanguage={currentLanguage} />
      </div>

      {isSliderOpen && CalculationResult_BHF && (
      <CalculationResults isOpen={isSliderOpen} results={displayResult} />)}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!CalculationResult_BHF}
          style={{ width: '100%', padding: '8px 16px', background: CalculationResult_BHF ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: CalculationResult_BHF ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && CalculationResult_BHF && (
        <BHF_Retro_Rapport
          calculationResult={CalculationResult_BHF}
          inputParams={{ T_amont_BHF, T_air_decolmatation, Qair_decolmatation, PDC_aero }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default BHF_Parameter_Tab;