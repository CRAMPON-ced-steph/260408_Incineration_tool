import React, { useState, useEffect } from 'react';

import { performCalculation_COOLINGTOWER_option_Qeau } from './COOLINGTOWER_calculations';

import InputField from '../../C_Components/input_retro';
import ClearButton from '../../C_Components/Clear_Button';
import ShowResultButton from '../../C_Components/Show_result_retro';
import ToggleButton from '../../C_Components/toggle_button_retro';
import CloseButton from '../../C_Components/OnCloseButton_retro';
import CalculationResults from '../../C_Components/ShowCalculationResult_retro';

import COOLINGTOWER_Retro_Rapport from './COOLINGTOWER_Retro_Rapport';
import '../../index.css';

const COOLINGTOWER_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage }) => {
  
  const [Teau, setTeau] = useState(() => parseFloat(localStorage.getItem('Teau')) || 15);
  const [T_steam_C, setT_steam_C] = useState(() => parseFloat(localStorage.getItem('T_steam_C')) || (nodeData?.result?.dataFlow?.T || 120));
  const [Qeau_kg_h, setQeau_kg_h] = useState(() => parseFloat(localStorage.getItem('Qeau_kg_h')) || 0);
  const [Qsteam_kg_h, setQsteam_kg_h] = useState(() => parseFloat(localStorage.getItem('Qsteam_kg_h')) || 0);
  const [PDC_aero, setPDC_aero] = useState(() => localStorage.getItem('PDC_aero') || '20');


  const [calculationResult_COOLINGTOWER, setCalculationResult] = useState(null);
  const [isSliderOpen, setIsSliderOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);


  // Sauvegarde dans le localStorage
  useEffect(() => { localStorage.setItem('Teau', Teau); }, [Teau]);
  useEffect(() => { localStorage.setItem('T_steam_C', T_steam_C); }, [T_steam_C]);
  useEffect(() => { localStorage.setItem('Qeau_kg_h', Qeau_kg_h); }, [Qeau_kg_h]);
  useEffect(() => { localStorage.setItem('Qsteam_kg_h', Qsteam_kg_h); }, [Qsteam_kg_h]);
  useEffect(() => { localStorage.setItem('PDC_aero', PDC_aero); }, [PDC_aero]);
  useEffect(() => { if (calculationResult_COOLINGTOWER) { localStorage.setItem('calculationResult_COOLINGTOWER', JSON.stringify(calculationResult_COOLINGTOWER)); } }, [calculationResult_COOLINGTOWER]);

  // Calcul à chaque changement de paramètre
  useEffect(() => {
    if (nodeData?.result) {
      try {

          const result = performCalculation_COOLINGTOWER_option_Qeau(nodeData, parseFloat(Teau),parseFloat(T_steam_C),parseFloat(Qeau_kg_h), parseFloat(Qsteam_kg_h), parseFloat(PDC_aero));
          setCalculationResult(result);
        
      } catch (error) {
        console.error('Error recalculating with updated nodeData:', error);
      }
    }
  }, [nodeData, Teau, T_steam_C, Qeau_kg_h, Qsteam_kg_h, PDC_aero]);

  const handleSendData = () => {
    if (!nodeData?.result) {
      console.warn('No input data available');
      return;
    }

    try {
      let result;
        result = performCalculation_COOLINGTOWER_option_Qeau(nodeData, parseFloat(Teau),parseFloat(T_steam_C),parseFloat(Qeau_kg_h), parseFloat(Qsteam_kg_h), parseFloat(PDC_aero));
  
      setCalculationResult(result);
      onSendData({ result, inputData: { Teau, T_steam_C, Qeau_kg_h, Qsteam_kg_h, PDC_aero } });
    } catch (error) {
      console.error('Calculation error:', error);
      alert(`Error in calculation: ${error.message}`);
    }
  };

  const toggleSlider = () => {
    setIsSliderOpen(!isSliderOpen);
  };



  // Fonction pour réinitialiser le localStorage
  const clearMemory = () => {
    localStorage.removeItem('Teau');
    localStorage.removeItem('T_steam_C');
    localStorage.removeItem('Qeau_kg_h');
    localStorage.removeItem('Qsteam_kg_h');
    localStorage.removeItem('PDC_aero');
    localStorage.removeItem('calculationResult_COOLINGTOWER');
    setTeau(15);  // Réinitialise l'état après avoir vidé le localStorage
    setT_steam_C(120);
    setQeau_kg_h(0);
    setQsteam_kg_h(0);
    setPDC_aero(20);
    
    setCalculationResult(null);
  };

  return (
    <div className="container-box">
      <CloseButton onClose={onClose} />

      <h3>{title} Parameters</h3>


      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <InputField label="T eau injectée" unit="[°C]" value={Teau} onChange={(e) => setTeau(parseFloat(e.target.value) || 15)} />
        <InputField label="T vapeur injectée" unit="[°C]" value={T_steam_C} onChange={(e) => setT_steam_C(parseFloat(e.target.value) || 15)} />
        <InputField label="Q eau" unit="[kg/h]" value={Qeau_kg_h} onChange={(e) => setQeau_kg_h(parseFloat(e.target.value) || 0)} />
        <InputField label="Q vapeur" unit="[kg/h]" value={Qsteam_kg_h} onChange={(e) => setQsteam_kg_h(parseFloat(e.target.value) || 0)} />
        <InputField label="PDC" unit="[mmCE]" value={PDC_aero} onChange={(e) => setPDC_aero(parseFloat(e.target.value) || 0)} />
      </div>

      <div className="prez-3-buttons">
        <button onClick={handleSendData}>Calculate and Send Data</button>
        <ShowResultButton isOpen={isSliderOpen} onToggle={toggleSlider} />
        <ClearButton onClick={clearMemory} />
      </div>

      {isSliderOpen && calculationResult_COOLINGTOWER && (
        <CalculationResults isOpen={isSliderOpen} results={calculationResult_COOLINGTOWER} />
      )}

      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setShowReport(true)}
          disabled={!calculationResult_COOLINGTOWER}
          style={{ width: '100%', padding: '8px 16px', background: calculationResult_COOLINGTOWER ? '#1a3a6b' : '#ccc', color: '#fff', border: 'none', borderRadius: '4px', cursor: calculationResult_COOLINGTOWER ? 'pointer' : 'not-allowed', fontWeight: 'bold', fontSize: '13px' }}
        >
          Editer Rapport
        </button>
      </div>

      {showReport && calculationResult_COOLINGTOWER && (
        <COOLINGTOWER_Retro_Rapport
          calculationResult={calculationResult_COOLINGTOWER}
          inputParams={{ Teau, T_steam_C, Qeau_kg_h, Qsteam_kg_h, PDC_aero }}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
};

export default COOLINGTOWER_Parameter_Tab;