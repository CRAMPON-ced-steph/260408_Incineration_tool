import React, { useState, useEffect } from 'react';
import { performCalculation_BHF } from './BHF_calculations';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import ToggleButton from '../../C_Components/toggle_button_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';

import BHF_Retro_Rapport from './BHF_Retro_Rapport';
import '../../index.css';

const BHF_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage }) => {
  const [Qair_decolmatation, setQair_decolmatation] = useState(() => parseFloat(localStorage.getItem('Qair_decolmatation')) || 0);
  const [T_air_decolmatation, setT_air_decolmatation] = useState(() => parseFloat(localStorage.getItem('T_air_decolmatation')) || 15);
  const [T_amont_BHF, setT_amont_BHF] = useState(() => parseFloat(localStorage.getItem('T_amont_BHF')) || nodeData?.result?.dataFlow?.T || '10');
  const [PDC_aero, setPDC_aero] = useState(() => localStorage.getItem('PDC_aero') || '50');

  const [CalculationResult_BHF, setCalculationResult] = useState(null);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {localStorage.setItem('Qair_decolmatation', Qair_decolmatation);}, [Qair_decolmatation]);
  useEffect(() => {localStorage.setItem('T_air_decolmatation', T_air_decolmatation);}, [T_air_decolmatation]);
  useEffect(() => {localStorage.setItem('T_amont_BHF', T_amont_BHF);}, [T_amont_BHF]);
  useEffect(() => { localStorage.setItem('PDC_aero', PDC_aero); }, [PDC_aero]);

  useEffect(() => {
    if (CalculationResult_BHF) {
      localStorage.setItem('CalculationResult_BHF', JSON.stringify(CalculationResult_BHF));
    }
  }, [CalculationResult_BHF]);

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
    setQair_decolmatation(0);
    setT_air_decolmatation(15);
    setT_amont_BHF(nodeData?.result?.dataFlow?.T || '10');
    setPDC_aero('50');
    setCalculationResult(null);
    setIsSliderOpen(false);
    localStorage.removeItem('PDC_aero');
    localStorage.removeItem('Qair_decolmatation');
    localStorage.removeItem('T_air_decolmatation');
    localStorage.removeItem('T_amont_BHF');
    localStorage.removeItem('CalculationResult_BHF');
  };

  return (
    <div className="container-box">
      <CloseButton onClose={onClose} />

      <h3>{title} Parameters</h3>

      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center' }}>
    
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <InputField label="Qair_decolmatation" unit="[m³/h]" value={Qair_decolmatation} onChange={(e) => setQair_decolmatation(parseFloat(e.target.value) || 0)}/>
        <InputField label="Tair" unit="[°C]" value={T_air_decolmatation} onChange={(e) => setT_air_decolmatation(parseFloat(e.target.value) || 0)}/>
        <InputField label="T fumées amont" unit="[°C]" value={T_amont_BHF} onChange={(e) => setT_amont_BHF(parseFloat(e.target.value) || 0)}/>
        <InputField label="PDC aero" unit="[mmCE]" value={PDC_aero} onChange={(e) => setPDC_aero(e.target.value)} />
      </div>

      <div className="prez-3-buttons">
        <button onClick={handleSendData}>Calculate and Send Data</button>
        <ShowResultButton isOpen={isSliderOpen} onToggle={toggleSlider} />
        <ClearButton onClick={clearMemory} />
      </div>

      {isSliderOpen && CalculationResult_BHF && (
      <CalculationResults isOpen={isSliderOpen} results={CalculationResult_BHF} />)}

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