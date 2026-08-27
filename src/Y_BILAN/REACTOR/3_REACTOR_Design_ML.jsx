import React, { useState, useEffect, useRef } from 'react';
import { T_ref } from '../../A_Transverse_fonction/constantes';
import TableGeneric from '../../C_Components/Tableau_generique';
import { coeff_Nm3_to_m3 } from '../../A_Transverse_fonction/conv_calculation';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import REACTORimage from '/src/B_Images/SDA_img.png';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './REACTOR_traduction';

import { fmt } from '../../A_Transverse_fonction/formatNumber';

// ─── Composants UI au niveau module (références stables → pas de perte de focus) ───
const Section = ({ title, children }) => (
  <div style={{ backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '4px', marginBottom: '20px' }}>
    <h3>{title}</h3>
    <div style={{ display: 'flex', gap: '20px' }}>
      {children}
    </div>
  </div>
);

const ParameterInput = ({ label, value, onChange, type = 'number', options = null, disabled = false, t }) => {
  const [display, setDisplay] = useState(() => value !== undefined && value !== null ? String(value) : '');
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDisplay(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
      <label style={{ flex: 1, marginRight: '10px', textAlign: 'right', fontWeight: 'bold' }}>
        {t(label)}:
      </label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: '0 0 100px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={display}
          onChange={(e) => { setDisplay(e.target.value); onChange(e.target.value); }}
          onFocus={() => { focused.current = true; }}
          onBlur={() => {
            focused.current = false;
            const n = parseFloat(display);
            setDisplay(isNaN(n) ? (value !== undefined && value !== null ? String(value) : '0') : String(n));
          }}
          disabled={disabled}
          style={{ flex: '0 0 100px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      )}
    </div>
  );
};

const REACTORDesign = ({ innerData, setInnerData, currentLanguage = 'fr' }) => {
  const getInitialValue = (paramName, defaultValue) => {
    return innerData?.[paramName] !== undefined ? innerData[paramName] : defaultValue;
  };

  const languageCode = getLanguageCode(currentLanguage);
  const t = (key) => {
    return translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  };

  const opexData = getOpexData() || {};
  const {
    truck15TCO2 = 0.5,
    truck15TPrice = 2,
    truck20TCO2 = 0.6,
    truck20TPrice = 2.5,
    truck25TCO2 = 0.7,
    truck25TPrice = 3,
    powerRatio = 0.1,
  } = opexData;

  // Input data
  const Debit_fumees_sec_Nm3_h = parseFloat(innerData?.FG_sec_EAU_tot || 1);
  const Debit_fumees_humide_Nm3_h = parseFloat(innerData?.FG_humide_EAU_tot || 1);
  const T_IN = innerData?.T_OUT || 200;

  // PDC calcul
  const [PDC_calcul, setPDC_calcul] = useState({
    'Pression aéraulique [mmCE]': getInitialValue('P_OUT', 0),
    'PDC [mmCE]': getInitialValue('PDC_mmCE', 200),
  });

  // Reactor parameters
  const [reactorParams, setReactorParams] = useState({
    'Flow Rate [Nm3/h]': getInitialValue('flowRate', Debit_fumees_sec_Nm3_h),
    'Temperature [°C]': getInitialValue('temperature', T_IN),
    'Residence Time [s]': getInitialValue('residenceTime', 3.5),
    'L/D Ratio': getInitialValue('ldRatio', 4),
    'Agitation Type': getInitialValue('agitationType', 'mechanical'),
  });

  // Electric consumption
  const [Parametres_conso_Elec, setParametres_conso_Elec] = useState({
    'Electric consumption belt [kW]': getInitialValue('Vis_de_transport', 4),
  });

  // Compressed air consumption
  const [conso_air_comprime, setConso_air_comprime] = useState({
    'Number of cycles [Nb]': getInitialValue('Nombre_cycles', 60),
    'Compressed air pressure [Bar]': getInitialValue('Pression_air_comprime', '7'),
    'Air per cycle [Nm3/cycle]': getInitialValue('Air_comprime_cycle', 28),
  });

  // Ash evacuation
  const [evacuation_REACTOR_ash, setEvacuation_REACTOR_ash] = useState({
    'Truck Type': getInitialValue('Type_camion', '15t'),
    'Distance [km]': getInitialValue('Distance_transport', 50),
  });

  // Pressure loss calculations
  const P_in_mmCE = innerData?.P_OUT_mmce || PDC_calcul['Pression aéraulique [mmCE]'];
  const PDC_mmCE = PDC_calcul['PDC [mmCE]'];
  const P_out_mmCE = P_in_mmCE - PDC_mmCE;
  const Qv_humide_m3_h = coeff_Nm3_to_m3(P_in_mmCE, T_IN) * Debit_fumees_humide_Nm3_h;

  // Reactor calculations
  const calculateReactor = () => {
    const flowRate = reactorParams['Flow Rate [Nm3/h]'];
    const temperature = reactorParams['Temperature [°C]'];
    const residenceTime = reactorParams['Residence Time [s]'];
    const ldRatio = reactorParams['L/D Ratio'];
    const agitationType = reactorParams['Agitation Type'];

    const volumetricFlowRate = flowRate * (T_ref + temperature) / T_ref;
    const volumetricFlowRateMs = volumetricFlowRate / 3600;
    const reactorVolume = volumetricFlowRateMs * residenceTime;

    const diameter = Math.pow(4 * reactorVolume / (Math.PI * ldRatio), 1 / 3);
    const height = ldRatio * diameter;

    let agitationPower;
    let reactorAirConsumption = 0;

    if (agitationType === 'mechanical') {
      agitationPower = reactorVolume * 300 / 1000;
    } else {
      reactorAirConsumption = reactorVolume * 0.2 * 60;
      agitationPower = reactorAirConsumption * powerRatio;
    }

    const velocity = volumetricFlowRateMs / (Math.PI * Math.pow(diameter / 2, 2));
    const pressureDrop = velocity * velocity * 1.2 / 2 * 1000 / 9.81 * 10;

    return {
      reactorVolume,
      diameter,
      height,
      residenceTime,
      agitationPower,
      pressureDrop,
      velocity,
      reactorAirConsumption,
      ldRatio,
    };
  };

  const reactorResults = calculateReactor();

  // Electric consumption
  const Conso_elec_vis_transport_kW = Parametres_conso_Elec['Electric consumption belt [kW]'];

  // Compressed air consumption
  const nombre_cycle_nb = conso_air_comprime['Number of cycles [Nb]'];
  const pression_air_comprime_bar = parseFloat(conso_air_comprime['Compressed air pressure [Bar]'] || '7');
  const air_comprime_par_cycle = conso_air_comprime['Air per cycle [Nm3/cycle]'];
  const conso_air_co_Nm3_h = air_comprime_par_cycle * nombre_cycle_nb + (reactorResults.reactorAirConsumption || 0);
  const Conso_elec_air_co_kW = conso_air_co_Nm3_h * powerRatio;

  // Ash evacuation
  const residus_a_evacuer = innerData?.Residus || {
    DryBottomAsh_kg_h: 0,
    WetBottomAsh_kg_h: 0,
  };

  const type_camion = evacuation_REACTOR_ash['Truck Type'];
  const distance_km = evacuation_REACTOR_ash['Distance [km]'];
  const cendres_kg_h = residus_a_evacuer.WetBottomAsh_kg_h;

  let CO2_transport_kg_km;
  let cout_transport_euro_km;

  switch (type_camion) {
    case '15t':
      CO2_transport_kg_km = truck15TCO2;
      cout_transport_euro_km = truck15TPrice;
      break;
    case '20t':
      CO2_transport_kg_km = truck20TCO2;
      cout_transport_euro_km = truck20TPrice;
      break;
    case '25t':
      CO2_transport_kg_km = truck25TCO2;
      cout_transport_euro_km = truck25TPrice;
      break;
    default:
      CO2_transport_kg_km = truck15TCO2;
      cout_transport_euro_km = truck15TPrice;
  }

  let CO2_transport_total = CO2_transport_kg_km * distance_km * (cendres_kg_h / 1000);
  let cout_transport_total = cendres_kg_h === 0 ? 0 : cout_transport_euro_km * distance_km;

  // Generic table elements
  const elementsGeneric = [
    { text: t('Reactor Volume [m³]'), value: fmt(reactorResults.reactorVolume, 1) },
    { text: t('Reactor Diameter [m]'), value: fmt(reactorResults.diameter, 2) },
    { text: t('Reactor Height [m]'), value: fmt(reactorResults.height, 2) },
    { text: t('Residence Time [s]'), value: fmt(reactorResults.residenceTime, 1) },
    { text: t('Compressed Air Consumption [Nm3/h]'), value: fmt(conso_air_co_Nm3_h, 2) },
    { text: t('Compressed Air Pressure [Bar]'), value: fmt(pression_air_comprime_bar, 1) },
    { text: t('Residues [kg/h]'), value: fmt(cendres_kg_h, 2) },
    { text: t('CO2 Transport Total [kg]'), value: fmt(CO2_transport_total, 2) },
    { text: t('Cost Transport Total [€]'), value: fmt(cout_transport_total, 2) },
  ];

  // Event handlers
  const handleChange = (name, value) => {
    const numericValue = parseFloat(value) || 0;

    if (name in reactorParams) {
      setReactorParams((prev) => ({
        ...prev,
        [name]: name === 'Agitation Type' ? value : numericValue,
      }));
    } else if (name in PDC_calcul) {
      setPDC_calcul((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else if (name in Parametres_conso_Elec) {
      setParametres_conso_Elec((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else if (name in conso_air_comprime) {
      setConso_air_comprime((prev) => ({
        ...prev,
        [name]: value,
      }));
    } else if (name in evacuation_REACTOR_ash) {
      setEvacuation_REACTOR_ash((prev) => ({
        ...prev,
        [name]: typeof value === 'string' ? value : numericValue,
      }));
    }
  };

  const consommation_reactifs = innerData?.Conso_reactifs || {
    CaCO3: 0,
    CaO: 0,
    CaOH2wet: 0,
    CaOH2dry: 0,
    NaOH: 0,
    NaOHCO3: 0,
  };

  // Export data
  useEffect(() => {
    if (setInnerData && typeof setInnerData === 'function') {
      const toSignificantFigures = (value, figures = 2) => {
        if (value === 0 || value === null || value === undefined || !isFinite(value)) return 0;
        return parseFloat(value.toPrecision(figures));
      };

      const consoElec1 = toSignificantFigures(Conso_elec_vis_transport_kW);
      const consoElec2 = toSignificantFigures(Conso_elec_air_co_kW);
      const consoElec3 = toSignificantFigures(
        reactorParams['Agitation Type'] === 'mechanical' ? reactorResults.agitationPower : 0
      );

      setInnerData((prevData) => ({
        ...prevData,
        P_out_mmCE,
        consoElec1,
        consoElec2,
        consoElec3,
        labelElec1: 'Belt',
        labelElec2: 'Compressed Air',
        labelElec3: reactorParams['Agitation Type'] === 'mechanical' ? 'Mechanical Agitation' : 'Not Used',
        conso_air_co_N_m3: conso_air_co_Nm3_h,
        pression_air_comprime_bar,
        Conso_CaCO3_kg: toSignificantFigures(consommation_reactifs.CaCO3),
        Conso_CaO_kg: toSignificantFigures(consommation_reactifs.CaO),
        Conso_CaOH2_wet_kg: toSignificantFigures(consommation_reactifs.CaOH2wet),
        Conso_NaOH_kg: toSignificantFigures(consommation_reactifs.NaOH),
        Conso_NaOHCO3_kg: toSignificantFigures(consommation_reactifs.NaOHCO3),
        conso_fly_ash_kg_h: toSignificantFigures(cendres_kg_h),
        CO2_transport_fly_ash: toSignificantFigures(CO2_transport_total),
        cout_transport_fly_ash: toSignificantFigures(cout_transport_total),
        reactorVolume: reactorResults.reactorVolume,
        reactorDiameter: reactorResults.diameter,
        reactorHeight: reactorResults.height,
        agitationPower: reactorResults.agitationPower,
      }));
    }
  }, [
    Conso_elec_vis_transport_kW,
    Conso_elec_air_co_kW,
    reactorResults,
    conso_air_co_Nm3_h,
    pression_air_comprime_bar,
    cout_transport_total,
    CO2_transport_total,
    cendres_kg_h,
    P_out_mmCE,
    consommation_reactifs,
    reactorParams,
    setInnerData,
  ]);

  return (
    <div className="cadre_pour_onglet">
      {/* 1. Pressure Loss */}
      <Section title={t('Aeraulic Pressure Loss')}>
        <div style={{ flex: 1 }}>
          <ParameterInput label="Aeraulic Pressure [mmCE]" value={PDC_calcul['Pression aéraulique [mmCE]']}
            onChange={(v) => handleChange('Pression aéraulique [mmCE]', v)} t={t} />
          <ParameterInput label="PDC [mmCE]" value={PDC_calcul['PDC [mmCE]']}
            onChange={(v) => handleChange('PDC [mmCE]', v)} t={t} />
        </div>
        <div style={{ flex: 1 }}>
          <TableGeneric elements={[{ text: t('Output Pressure [mmCE]'), value: fmt(P_out_mmCE, 2) }]} />
        </div>
      </Section>

      {/* 2. Reactor Design */}
      <Section title={t('Reactor Design')}>
        <div style={{ flex: 1 }}>
          <img src={REACTORimage} alt="Reactor" style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1 }}>
          <ParameterInput label="Flow Rate [Nm3/h]" value={reactorParams['Flow Rate [Nm3/h]']}
            onChange={(v) => handleChange('Flow Rate [Nm3/h]', v)} t={t} />
          <ParameterInput label="Temperature [°C]" value={reactorParams['Temperature [°C]']}
            onChange={(v) => handleChange('Temperature [°C]', v)} t={t} />
          <ParameterInput label="Residence Time [s]" value={reactorParams['Residence Time [s]']}
            onChange={(v) => handleChange('Residence Time [s]', v)} t={t} />
          <ParameterInput label="L/D Ratio" value={reactorParams['L/D Ratio']}
            onChange={(v) => handleChange('L/D Ratio', v)} t={t} />
          <ParameterInput label="Agitation Type" value={reactorParams['Agitation Type']}
            onChange={(v) => handleChange('Agitation Type', v)}
            options={['mechanical', 'air']} t={t} />
          <h4 style={{ marginTop: '15px' }}>{t('Design Results')}</h4>
          <TableGeneric elements={[
            { text: t('Reactor Volume [m³]'), value: fmt(reactorResults.reactorVolume, 1) },
            { text: t('Diameter [m]'), value: fmt(reactorResults.diameter, 2) },
            { text: t('Height [m]'), value: fmt(reactorResults.height, 2) },
            { text: t('Agitation Power [kW]'), value: fmt(reactorResults.agitationPower, 2) },
            ...(reactorParams['Agitation Type'] === 'air' ? [
              { text: t('Air Consumption [Nm3/h]'), value: fmt(reactorResults.reactorAirConsumption, 0) },
            ] : []),
          ]} />
        </div>
      </Section>

      {/* 3. Electric Consumption Belt */}
      <Section title={t('Electric Consumption Belt')}>
        <div style={{ flex: 1 }}>
          <ParameterInput label="Electric consumption belt [kW]" value={Conso_elec_vis_transport_kW}
            onChange={(v) => handleChange('Electric consumption belt [kW]', v)} t={t} />
        </div>
        <div style={{ flex: 1 }}>
          <TableGeneric elements={[{ text: t('Belt Consumption [kW]'), value: fmt(Conso_elec_vis_transport_kW, 2) }]} />
        </div>
      </Section>

      {/* 4. Compressed Air Consumption */}
      <Section title={t('Compressed Air Consumption')}>
        <div style={{ flex: 1 }}>
          <ParameterInput label="Number of cycles [Nb]" value={nombre_cycle_nb}
            onChange={(v) => handleChange('Number of cycles [Nb]', v)} t={t} />
          <ParameterInput label="Compressed air pressure [Bar]" value={pression_air_comprime_bar}
            onChange={(v) => handleChange('Compressed air pressure [Bar]', v)}
            options={['7', '10', '13', '15']} t={t} />
          <ParameterInput label="Air per cycle [Nm3/cycle]" value={air_comprime_par_cycle}
            onChange={(v) => handleChange('Air per cycle [Nm3/cycle]', v)} t={t} />
        </div>
        <div style={{ flex: 1 }}>
          <TableGeneric elements={[
            { text: t('Air Consumption [Nm3/h]'), value: fmt(conso_air_co_Nm3_h, 2) },
            { text: t('Electric Consumption [kW]'), value: fmt(Conso_elec_air_co_kW, 2) },
          ]} />
        </div>
      </Section>

      {/* 5. Ash Evacuation */}
      <Section title={t('Ash Evacuation')}>
        <div style={{ flex: 1 }}>
          <ParameterInput label="Truck Type" value={type_camion}
            onChange={(v) => handleChange('Truck Type', v)}
            options={['15t', '20t', '25t']} t={t} />
          <ParameterInput label="Distance [km]" value={distance_km}
            onChange={(v) => handleChange('Distance [km]', v)} t={t} />
        </div>
        <div style={{ flex: 1 }}>
          <TableGeneric elements={[
            { text: t('Residues [kg/h]'), value: fmt(cendres_kg_h, 2) },
            { text: t('Truck Type'), value: type_camion },
            { text: t('Distance [km]'), value: fmt(distance_km, 0) },
            { text: t('CO2 Transport [kg]'), value: fmt(CO2_transport_total, 2) },
            { text: t('Cost Transport [€]'), value: fmt(cout_transport_total, 2) },
          ]} />
        </div>
      </Section>

      {/* 6. Summary */}
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
        <h3>{t('Summary of Main Parameters')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <p><strong>{t('Reactor Volume [m³]')}:</strong> {fmt(reactorResults.reactorVolume, 1)} m³</p>
          <p><strong>{t('Diameter [m]')}:</strong> {fmt(reactorResults.diameter, 2)} m</p>
          <p><strong>{t('Height [m]')}:</strong> {fmt(reactorResults.height, 2)} m</p>
          <p><strong>{t('L/D Ratio')}:</strong> {reactorParams['L/D Ratio']}</p>
          <p><strong>{t('Compressed Air Pressure [Bar]')}:</strong> {pression_air_comprime_bar} Bar</p>
          <p><strong>{t('Air Consumption [Nm3/h]')}:</strong> {fmt(conso_air_co_Nm3_h, 2)} Nm³/h</p>
          <p><strong>{t('Electric Consumption [kW]')}:</strong> {fmt(Conso_elec_air_co_kW, 2)} kW</p>
          <p><strong>{t('Truck Type')}:</strong> {type_camion}</p>
        </div>
        <h4>{t('Detailed Calculated Parameters')}</h4>
        <TableGeneric elements={elementsGeneric} />
      </div>
    </div>
  );
};

export default REACTORDesign;
