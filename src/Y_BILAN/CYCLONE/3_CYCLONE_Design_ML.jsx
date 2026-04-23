import React, { useState, useEffect, useCallback } from 'react';
import { T_ref, P_ref } from '../../A_Transverse_fonction/constantes';
import cycloneImage from '/src/B_Images/cyclone_img.png';
import TableGeneric from '../../C_Components/Tableau_generique';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './CYCLONE_traduction';
import '../../index.css';

const CYCLONEDesign = ({ innerData, setInnerData, currentLanguage = 'fr' }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const t = (key) => {
    return translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  };

  const opexData = getOpexData() || {};

  // Default parameters
  const defaultParameters_cyclone = {
    FlueGasFlow_Nm3_h: 6062,
    Tempe_flue_gas_C: 180,
    VelocityTarget: 25,
  };

  // State management
  const [Parameters_cyclone, setParameters_cyclone] = useState(() => {
    return {
      FlueGasFlow_Nm3_h: innerData?.FG_humide_tot || defaultParameters_cyclone.FlueGasFlow_Nm3_h,
      Tempe_flue_gas_C: defaultParameters_cyclone.Tempe_flue_gas_C,
      VelocityTarget: defaultParameters_cyclone.VelocityTarget,
    };
  });

  const [selectedModel, setSelectedModel] = useState('LAPPLE');
  const [selectedPdcModel, setSelectedPdcModel] = useState('Casal and Martinez');
  const [constants, setConstants] = useState({});

  // Extract parameters
  const FlueGasFlow_Nm3_h = Parameters_cyclone['FlueGasFlow_Nm3_h'];
  const Tempe_flue_gas_C = Parameters_cyclone['Tempe_flue_gas_C'];
  const VelocityTarget = Parameters_cyclone['VelocityTarget'];

  // Cyclone model data
  const tableData = [
    { param: 'a/D', LAPPLE: '0.5', SWIFT: '0.5', PETERSON: '0.583', ZENZ: '0.5', STAIRMAND: '0.5', SWIFT_HE: '0.44' },
    { param: 'b/D', LAPPLE: '0.25', SWIFT: '0.25', PETERSON: '0.208', ZENZ: '0.25', STAIRMAND: '0.2', SWIFT_HE: '0.21' },
    { param: 'h/D', LAPPLE: '0.625', SWIFT: '0.6', PETERSON: '0.583', ZENZ: '0.75', STAIRMAND: '0.5', SWIFT_HE: '0.5' },
    { param: 'd/D', LAPPLE: '0.5', SWIFT: '0.5', PETERSON: '0.5', ZENZ: '0.5', STAIRMAND: '0.5', SWIFT_HE: '0.4' },
    { param: "H'/D", LAPPLE: '2', SWIFT: '1.75', PETERSON: '1.333', ZENZ: '2', STAIRMAND: '1.5', SWIFT_HE: '1.4' },
    { param: 'H/D', LAPPLE: '2', SWIFT: '2', PETERSON: '1.84', ZENZ: '2', STAIRMAND: '2.5', SWIFT_HE: '2.5' },
    { param: 'Ds/D', LAPPLE: '0.25', SWIFT: '0.4', PETERSON: '0.5', ZENZ: '0.25', STAIRMAND: '0.375', SWIFT_HE: '0.4' },
    { param: 'k', LAPPLE: '0.729', SWIFT: '0.729', PETERSON: '0.671', ZENZ: '0.729', STAIRMAND: '0.659', SWIFT_HE: '0.674' },
    { param: 'K', LAPPLE: '403', SWIFT: '382', PETERSON: '330', ZENZ: '347', STAIRMAND: '551', SWIFT_HE: '699' },
    { param: 'Nt', LAPPLE: '4', SWIFT: '3.5', PETERSON: '2.3', ZENZ: '/', STAIRMAND: '3', SWIFT_HE: '3.2' },
  ];

  // Calculate constants when model or parameters change
  useEffect(() => {
    const modelConstants = tableData.reduce((acc, row) => {
      const value = row[selectedModel];
      if (value !== '/' && value !== undefined) {
        acc[row.param] = parseFloat(value);
      }
      return acc;
    }, {});

    const flueGasFlow = Parameters_cyclone.FlueGasFlow_Nm3_h;
    const temperature = Parameters_cyclone.Tempe_flue_gas_C;
    const velocityTarget = Parameters_cyclone.VelocityTarget;

    const airDensity = P_ref / (287.05 * (temperature + T_ref));
    const volumeFlowRate = flueGasFlow * (temperature + T_ref) / T_ref;
    const FlueGasFlow_m3_h = flueGasFlow * (T_ref + temperature) / T_ref;

    // Iterative algorithm to find optimal diameter
    let D = 0.1;
    let Velocity_section_m_s = 0;
    let L_vortex_m = 0;
    let S_a_b_m2 = 0;

    do {
      S_a_b_m2 = modelConstants['a/D'] * D * modelConstants['b/D'] * D;
      Velocity_section_m_s = FlueGasFlow_m3_h / 3600 / S_a_b_m2;
      L_vortex_m = 2.3 * modelConstants['d/D'] * D * Math.pow(D, 2/3) / 
                  Math.pow(modelConstants['a/D'] * D * modelConstants['b/D'] * D, 1/3);

      if (Velocity_section_m_s > velocityTarget) {
        D += 0.001;
      }
    } while (Velocity_section_m_s > velocityTarget && D < 10);

    const dimensions = {
      flueGasFlow,
      volumeFlowRate,
      D,
      a: modelConstants['a/D'] * D,
      b: modelConstants['b/D'] * D,
      h: modelConstants['h/D'] * D,
      d: modelConstants['d/D'] * D,
      Hprime: modelConstants["H'/D"] * D,
      H: modelConstants['H/D'] * D,
      Ds: modelConstants['Ds/D'] * D,
      Q: volumeFlowRate,
      airDensity,
      S_a_b_m2,
      velocitySection: Velocity_section_m_s,
      L_vortex: L_vortex_m,
      KValue: modelConstants['K'],
      kValue: modelConstants['k'],
      Nt: modelConstants['Nt'] || 'N/A'
    };

    setConstants(dimensions);
  }, [selectedModel, Parameters_cyclone]);

  // Calculate head losses
  const calculateHeadLosses = useCallback(() => {
    if (!constants.a || !constants.b || !constants.d || !constants.velocitySection) {
      return { coeff: 0, dzeta: 0, RHO_fumee: 1.22, PDC: 0 };
    }

    const a = constants.a;
    const b = constants.b;
    const d = constants.d;
    const velocitySection = constants.velocitySection;

    const coeff = (a * b) / Math.pow(d, 2);

    let dzeta;
    if (selectedPdcModel === 'Shepherd and Lappel') {
      dzeta = 16 * coeff;
    } else {
      dzeta = 11.3 * Math.pow(coeff, 2) + 3.33;
    }

    const RHO_fumee = 1.22;
    const PDC = 0.5 * dzeta * RHO_fumee * Math.pow(velocitySection, 2);

    return { coeff, dzeta, RHO_fumee, PDC };
  }, [constants, selectedPdcModel]);

  const headLosses = calculateHeadLosses();

  // Calculate pressures
  const P_in_mmCE = innerData?.P_OUT || 0;
  const PDC_mmCE = headLosses.PDC * 0.1020408163265306;
  const P_out_mmCE = P_in_mmCE - PDC_mmCE;

  // Handle input changes
  const handleChange = (name, value) => {
    const numericValue = parseFloat(value);
    if (!isNaN(numericValue)) {
      if (name === 'VelocityTarget') {
        const limitedValue = Math.min(Math.max(numericValue, 10), 25);
        setParameters_cyclone(prev => ({ ...prev, [name]: limitedValue }));
      } else {
        setParameters_cyclone(prev => ({ ...prev, [name]: numericValue }));
      }
    }
  };

  const clearMemory = useCallback(() => {
    setParameters_cyclone(defaultParameters_cyclone);
  }, []);

  // Data for display
  const modelData = tableData.reduce((acc, row) => {
    acc[row.param] = parseFloat(row[selectedModel]) || '-';
    return acc;
  }, {});

  const dimensionsGeneric = Object.keys(modelData).map(key => ({ 
    text: key, 
    value: modelData[key] 
  }));

  const constantsForTable = Object.entries(constants).map(([key, value]) => ({
    text: key,
    value: typeof value === 'number' ? value.toFixed(3) : value
  }));

  const elementsHeadLosses = [
    { text: t('a x b / d^2'), value: headLosses.coeff?.toFixed(4) || '0' },
    { text: t('Dzeta'), value: headLosses.dzeta?.toFixed(2) || '0' },
    { text: t('RHO [kg/m3]'), value: headLosses.RHO_fumee?.toFixed(2) || '0' },
    { text: t('Pin [mmCE]'), value: P_in_mmCE.toFixed(1) || '0' },
    { text: t('PDC [Pa]'), value: headLosses.PDC?.toFixed(1) || '0' },
    { text: t('PDC [mmCE]'), value: PDC_mmCE?.toFixed(2) || '0' },
    { text: t('Pout [mmCE]'), value: P_out_mmCE?.toFixed(2) || '0' },
  ];

  // Update innerData
  useEffect(() => {
    if (setInnerData && headLosses.PDC !== undefined) {
      setInnerData(prevData => ({
        ...prevData,
        P_out_mmCE,
        PDC_Pa: headLosses.PDC,
        PDC_mmCE,
        consoElec1: 4,
        labelElec1: t('Conveyor'),
        conso_air_co_N_m3: 0,
        Conso_EauPotable_m3: 0,
        Conso_EauRefroidissement_m3: 0,
        Conso_EauDemin_m3: 0,
        conso_incineration_ash_kg_h: 0,
        conso_boiler_ash_kg_h: 1,
        conso_fly_ash_kg_h: 0,
      }));
    }
  }, [setInnerData, headLosses.PDC, P_out_mmCE, PDC_mmCE, t]);

  // Reusable Components
  const Section = ({ title, results, children }) => (
    <div style={{
      marginBottom: '30px',
      padding: '20px',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px'
    }}>
      <h3 style={{
        marginTop: 0,
        borderBottom: '2px solid #4a90e2',
        paddingBottom: '10px'
      }}>
        {title}
      </h3>
      <div style={{ display: 'grid', gap: '15px' }}>
        {children}
        {results && results.length > 0 && (
          <>
            <h4 style={{ marginTop: '15px', marginBottom: '10px' }}>
              {t('Results')}
            </h4>
            <TableGeneric elements={results} />
          </>
        )}
      </div>
    </div>
  );

  const ParameterInput = ({ translationKey, value, onChange, type = 'number', options = null, min = null, max = null }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <label style={{
        flex: 1,
        minWidth: '200px',
        textAlign: 'right',
        fontWeight: '500',
        color: '#333',
      }}>
        {t(translationKey)}:
      </label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: '0 0 150px',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          min={min}
          max={max}
          style={{
            flex: '0 0 150px',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
      )}
    </div>
  );

  return (
    <div className="cadre_pour_onglet">
      {/* Model Selection and Cyclone Parameters */}
      <Section title={t('Cyclone Model Selection')}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
          <div style={{ flex: '0 0 300px' }}>
            <img
              src={cycloneImage}
              alt="Cyclone Diagram"
              style={{ width: '100%', height: 'auto', borderRadius: '8px' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontWeight: 'bold', marginRight: '10px' }}>
                {t('Select Model')}:
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  minWidth: '150px'
                }}
              >
                {['LAPPLE', 'SWIFT', 'PETERSON', 'ZENZ', 'STAIRMAND', 'SWIFT_HE'].map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            <h4>{t('Cyclone parameters')}</h4>
            <TableGeneric elements={dimensionsGeneric} />
          </div>
        </div>
      </Section>

      {/* Input Parameters */}
      <Section title={t('Input Parameters')}>
        <button
          onClick={clearMemory}
          style={{
            padding: '8px 16px',
            backgroundColor: '#ff6b6b',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginBottom: '15px'
          }}
        >
          {t('Clear parameters')}
        </button>

        <div style={{ display: 'grid', gap: '12px' }}>
          <ParameterInput
            translationKey="Flue Gas Flow [Nm3/h]"
            value={FlueGasFlow_Nm3_h}
            onChange={(v) => handleChange('FlueGasFlow_Nm3_h', v)}
          />
          <ParameterInput
            translationKey="Temperature Flue Gas [°C]"
            value={Tempe_flue_gas_C}
            onChange={(v) => handleChange('Tempe_flue_gas_C', v)}
          />
          <ParameterInput
            translationKey="Velocity Target [m/s]"
            value={VelocityTarget}
            onChange={(v) => handleChange('VelocityTarget', v)}
            min="10"
            max="25"
          />
        </div>
      </Section>

      {/* Calculated Constants */}
      <Section title={t('Calculated Dimensions')}>
        <TableGeneric elements={constantsForTable} />
      </Section>

      {/* Pressure Drop Model */}
      <Section title={t('Pressure Drop Calculation')}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ fontWeight: 'bold', marginRight: '10px' }}>
            {t('Pressure Drop Model')}:
          </label>
          <select
            value={selectedPdcModel}
            onChange={(e) => setSelectedPdcModel(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ddd',
              minWidth: '200px'
            }}
          >
            <option value="Casal and Martinez">Casal and Martinez</option>
            <option value="Shepherd and Lappel">Shepherd and Lappel</option>
          </select>
        </div>
        <TableGeneric elements={elementsHeadLosses} />
      </Section>

      {/* Summary */}
      <div style={{
        padding: '20px',
        maxWidth: '1000px',
        margin: '0 auto',
        backgroundColor: '#e8f4f8',
        borderRadius: '8px'
      }}>
        <h3>{t('Summary of Main Parameters')}</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <p><strong>{t('Model')}:</strong> {selectedModel}</p>
          <p><strong>{t('Cyclone Diameter [m]')}:</strong> {constants.D?.toFixed(3)} m</p>
          <p><strong>{t('Velocity Section [m/s]')}:</strong> {constants.velocitySection?.toFixed(2)} m/s</p>
          <p><strong>{t('Pressure Drop [Pa]')}:</strong> {headLosses.PDC?.toFixed(1)} Pa</p>
          <p><strong>{t('Pressure Drop [mmCE]')}:</strong> {PDC_mmCE?.toFixed(2)} mmCE</p>
          <p><strong>{t('Outlet Pressure [mmCE]')}:</strong> {P_out_mmCE?.toFixed(2)} mmCE</p>
        </div>
      </div>
    </div>
  );
};

export default CYCLONEDesign;