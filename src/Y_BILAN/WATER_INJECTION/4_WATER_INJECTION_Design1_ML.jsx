import React, { useState, useEffect, useCallback, useRef } from 'react';
import { T_ref } from '../../A_Transverse_fonction/constantes';
import TableGeneric from '../../C_Components/Tableau_generique';
import { coeff_Nm3_to_m3 } from '../../A_Transverse_fonction/conv_calculation';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import reactImage from '../../B_Images/quench_img.png';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './WATER_INJECTION_traduction';

import { fmt } from '../../A_Transverse_fonction/formatNumber';

// ─── Composants UI au niveau module (références stables → pas de perte de focus) ───
const Section = ({ title, results, children, t }) => (
  <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
    <h3 style={{ marginTop: 0, borderBottom: '2px solid #4a90e2', paddingBottom: '10px' }}>
      {title}
    </h3>
    <div style={{ display: 'grid', gap: '15px' }}>
      {children}
      {results && results.length > 0 && (
        <>
          <h4 style={{ marginTop: '15px', marginBottom: '10px' }}>{t('Résultats')}</h4>
          <TableGeneric elements={results} />
        </>
      )}
    </div>
  </div>
);

const ParameterInput = ({ translationKey, value, onChange, type = 'number', options = null, disabled = false, step = '1', t }) => {
  const [display, setDisplay] = useState(() => value !== undefined && value !== null ? String(value) : '');
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDisplay(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <label style={{ flex: 1, minWidth: '250px', textAlign: 'right', fontWeight: '500', color: '#333' }}>
        {t(translationKey)}:
      </label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: '0 0 150px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
          step={step}
          style={{ flex: '0 0 150px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '14px' }}
        />
      )}
    </div>
  );
};

const WATER_INJECTIONDesign = ({ innerData, setInnerData, upstreamT_IN, currentLanguage = 'fr' }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const t = (key) => {
    return translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  };

  const getInitialValue = (paramName, defaultValue) => {
    return innerData?.[paramName] !== undefined ? innerData[paramName] : defaultValue;
  };

  // Nozzle types with characteristics
  const nozzleTypes = {
    'cone creux': { defaultN: 2.8, dMeanRange: { min: 0.0001, max: 0.0003 }, description: t('Distribution étroite, bon pour uniformité') },
    'cone plein': { defaultN: 2.3, dMeanRange: { min: 0.00015, max: 0.0004 }, description: t('Distribution plus large, meilleure couverture') },
    'jet plat': { defaultN: 2.0, dMeanRange: { min: 0.0002, max: 0.0005 }, description: t('Distribution large, bon pour surfaces') },
    'spirale': { defaultN: 3.2, dMeanRange: { min: 0.00008, max: 0.00025 }, description: t('Distribution très étroite, excellente atomisation') }
  };

  // Water types mapping
  const waterTypeLabels = {
    'eau potable': t('Eau potable'),
    'eau de refroidissement': t('Eau de refroidissement'),
    'eau déminéralisée': t('Eau déminéralisée'),
    'eau adoucie': t('Eau adoucie'),
    'eau de rivière': t('Eau de rivière')
  };

  const opexData = getOpexData() || {};
  const { waterPrices = {} } = opexData;

  // State management
  const [PDC_calcul, setPDC_calcul] = useState({
    'Pression aéraulique [mmCE]': getInitialValue('P_OUT', 0),
    'PDC [mmCE]': getInitialValue('PDC_mmCE_WATER_INJECTION', 150),
  });

  const [Design_parameters, setDesign_parameters] = useState({
    'Quench diameter [m]': getInitialValue('Quench_diameter', 1.5),
    'Pression pulverisation [bar]': getInitialValue('Pression_pulverisation', 3),
    'Type de buse': getInitialValue('Type_buse', 'cone creux'),
    'Type d\'eau': getInitialValue('Type_eau', 'eau potable'),
  });

  const [Parametres_conso_Elec, setParametres_conso_Elec] = useState({
    'Puissance pompe [kW]': getInitialValue('Puissance_pompe_quench', 15),
    'Rendement pompe [%]': getInitialValue('Rendement_pompe', 85),
  });

  // Input data with fallback values
  const P_in_mmCE = innerData?.P_OUT || PDC_calcul['Pression aéraulique [mmCE]'];
  const PDC_mmCE = PDC_calcul['PDC [mmCE]'];
  const P_out_mmCE = P_in_mmCE - PDC_mmCE;

  const T_IN = upstreamT_IN ?? 200;
  const T_sortie = innerData?.T_sortie || 80;
  const Debit_fumees_humide_Nm3_h = innerData?.FG_humide_EAU_tot || 28000;
  const Eau_add = innerData?.Q_eau_kg_h || 5000;

  const DiameterQuench = Design_parameters['Quench diameter [m]'];
  const P_pulverisation = Design_parameters['Pression pulverisation [bar]'];
  const nozzleType = Design_parameters['Type de buse'];
  const waterType = Design_parameters['Type d\'eau'];

  const Puissance_pompe_kW = Parametres_conso_Elec['Puissance pompe [kW]'];
  const Rendement_pompe = Parametres_conso_Elec['Rendement pompe [%]'];

  // Calculations
  const Surface_Quench = 0.25 * Math.PI * DiameterQuench * DiameterQuench;
  const Q_eau_m3_h = Eau_add / 1000;
  const Q_eau_add_l_min = Eau_add / 60;
  const V_FG_m_s = (Debit_fumees_humide_Nm3_h / 3600) / Surface_Quench;

  const T_IN_K = T_IN + T_ref;
  const T_sortie_K = T_sortie + T_ref;

  const Conso_elec_pompe_reelle_kW = Puissance_pompe_kW / (Rendement_pompe / 100);

  // Water type mapping
  const getWaterPrice = (waterType) => {
    const prices = waterPrices || {};
    const priceMap = {
      'eau potable': prices.potable || 3,
      'eau de refroidissement': prices.cooling || 1,
      'eau déminéralisée': prices.demineralized || 5,
      'eau adoucie': prices.soft || 2,
      'eau de rivière': prices.river || 0.5,
    };
    return priceMap[waterType] || 3;
  };

  const currentWaterPrice = getWaterPrice(waterType);
  const waterCostPerHour = Q_eau_m3_h * currentWaterPrice;

  // Water consumption by type
  let Qv_eau_potable_m3 = 0, Qv_Eau_Refroidissement_m3 = 0, Qv_Eau_Riviere_m3 = 0;
  let Qv_Eau_Demin_m3 = 0, Qv_Eau_Adoucie_m3 = 0;

  switch(waterType) {
    case 'eau potable': Qv_eau_potable_m3 = Q_eau_m3_h; break;
    case 'eau de refroidissement': Qv_Eau_Refroidissement_m3 = Q_eau_m3_h; break;
    case 'eau de rivière': Qv_Eau_Riviere_m3 = Q_eau_m3_h; break;
    case 'eau déminéralisée': Qv_Eau_Demin_m3 = Q_eau_m3_h; break;
    case 'eau adoucie': Qv_Eau_Adoucie_m3 = Q_eau_m3_h; break;
    default: Qv_eau_potable_m3 = Q_eau_m3_h;
  }

  // Quench calculator functions
  const calculateDMean = (nozzleType, pressure) => {
    const nozzleInfo = nozzleTypes[nozzleType];
    const { min, max } = nozzleInfo.dMeanRange;
    const pressureFactor = Math.max(0, Math.min(1, (1 - pressure / 10)));
    return min + pressureFactor * (max - min);
  };

  const getSprayQuality = (dMean, n) => {
    const atomization = dMean < 0.0002 ? t('Excellente') : dMean < 0.0003 ? t('Bonne') : t('Moyenne');
    const uniformity = n > 3.0 ? t('Très uniforme') : n > 2.5 ? t('Uniforme') : t('Moins uniforme');
    const coverage = n < 2.2 ? t('Large couverture') : n < 2.8 ? t('Couverture moyenne') : t('Couverture concentrée');

    return { atomization, uniformity, coverage };
  };

  const calculateSprayCharacteristics = (dMean, n, pressure, flowRate) => {
    const smd = dMean * 0.693 * (1 + 1/n);
    const dropletVelocity = Math.sqrt(2 * pressure / 1000);
    const sprayAngle = 2 * Math.atan(0.2 * Math.sqrt(pressure / flowRate));

    return {
      smd,
      dropletVelocity,
      sprayAngle: sprayAngle * (180 / Math.PI)
    };
  };

  const calculateQuenchHeight = (vGas, dSMD, T_in_C, T_out_C) => {
    const T_mean   = (T_in_C + T_out_C) / 2;
    const lambda   = 0.024 + 7e-5 * T_mean;
    const rho_eau  = 960;
    const L_vap    = 2257e3;
    const T_boil   = 100;
    const delta_T  = Math.max(1, T_mean - T_boil);

    const K_evap   = (8 * lambda * delta_T) / (rho_eau * L_vap);
    const t_evap   = (dSMD * dSMD) / K_evap;
    return vGas * t_evap * 1.5;
  };

  // Quench calculations
  const currentNozzle = nozzleTypes[nozzleType];
  const dMean = calculateDMean(nozzleType, P_pulverisation);
  const n = currentNozzle.defaultN;
  const sprayQuality = getSprayQuality(dMean, n);
  const sprayCharacteristics = calculateSprayCharacteristics(dMean, n, P_pulverisation, Q_eau_add_l_min);
  const quenchHeight = calculateQuenchHeight(V_FG_m_s, sprayCharacteristics.smd, T_IN, T_sortie);

  // Intermédiaires pour affichage
  const T_mean_quench  = (T_IN + T_sortie) / 2;
  const lambda_quench  = 0.024 + 7e-5 * T_mean_quench;
  const K_evap_quench  = (8 * lambda_quench * Math.max(1, T_mean_quench - 100)) / (960 * 2257e3);
  const t_evap_quench  = (sprayCharacteristics.smd * sprayCharacteristics.smd) / K_evap_quench;

  // Event handlers
  const handleParametresChange = (name, value) => {
    const numericValue = parseFloat(value) || 0;

    if (name in PDC_calcul) {
      setPDC_calcul(prev => ({ ...prev, [name]: numericValue }));
    } else if (name in Parametres_conso_Elec) {
      let validatedValue = numericValue;
      if (name === 'Rendement pompe [%]') {
        validatedValue = Math.max(30, Math.min(95, numericValue));
      } else if (name === 'Puissance pompe [kW]') {
        validatedValue = Math.max(1, Math.min(500, numericValue));
      }
      setParametres_conso_Elec(prev => ({ ...prev, [name]: validatedValue }));
    } else if (name in Design_parameters) {
      let validatedValue = value;
      if (name === 'Quench diameter [m]') {
        validatedValue = Math.max(0.1, Math.min(10, numericValue));
      } else if (name === 'Pression pulverisation [bar]') {
        validatedValue = Math.max(0.5, Math.min(20, numericValue));
      }
      setDesign_parameters(prev => ({ ...prev, [name]: validatedValue }));
    }
  };

  const clearMemory = useCallback(() => {
    setPDC_calcul({ 'Pression aéraulique [mmCE]': 0, 'PDC [mmCE]': 150 });
    setDesign_parameters({ 'Quench diameter [m]': 1.5, 'Pression pulverisation [bar]': 3, 'Type de buse': 'cone creux', 'Type d\'eau': 'eau potable' });
    setParametres_conso_Elec({ 'Puissance pompe [kW]': 15, 'Rendement pompe [%]': 85 });
  }, []);

  // Update innerData
  useEffect(() => {
    if (setInnerData && typeof setInnerData === 'function') {
      const toSignificantFigures = (value, figures = 2) => {
        if (value === 0 || value === null || value === undefined || !isFinite(value)) return 0;
        return parseFloat(value.toPrecision(figures));
      };

      setInnerData(prevData => ({
        ...prevData,
        P_out_mmCE,
        consoElec1: toSignificantFigures(Conso_elec_pompe_reelle_kW),
        labelElec1: t('pompe quench'),
        Conso_EauPotable_m3: toSignificantFigures(Qv_eau_potable_m3),
        Conso_EauRefroidissement_m3: toSignificantFigures(Qv_Eau_Refroidissement_m3),
        Conso_EauDemin_m3: toSignificantFigures(Qv_Eau_Demin_m3),
        Conso_EauRiviere_m3: toSignificantFigures(Qv_Eau_Riviere_m3),
        Conso_EauAdoucie_m3: toSignificantFigures(Qv_Eau_Adoucie_m3),
        Quench_diameter: DiameterQuench,
        Pression_pulverisation: P_pulverisation,
        Type_buse: nozzleType,
        Type_eau: waterType,
        Puissance_pompe_quench: Puissance_pompe_kW,
        Rendement_pompe,
        PDC_mmCE_WATER_INJECTION: PDC_mmCE,
      }));
    }
  }, [Conso_elec_pompe_reelle_kW, Puissance_pompe_kW, Rendement_pompe, Eau_add, waterType, P_out_mmCE, DiameterQuench, P_pulverisation, nozzleType, PDC_mmCE, setInnerData, t]);

  // Elements for tables
  const elements_conso_pompe = [
    { text: t('Puissance pompe nominale [kW]'), value: fmt(Puissance_pompe_kW, 2) },
    { text: t('Rendement pompe [%]'), value: fmt(Rendement_pompe, 1) },
    { text: t('Consommation réelle [kW]'), value: fmt(Conso_elec_pompe_reelle_kW, 2) },
  ];

  const elementsGenericSummary = [
    { text: t('Quench diameter [m]'), value: fmt(DiameterQuench, 2) },
    { text: t('Pression pulvérisation [bar]'), value: fmt(P_pulverisation, 1) },
    { text: t('Type de buse'), value: nozzleType },
    { text: t('Type d\'eau'), value: waterTypeLabels[waterType] },
    { text: t('Surface quench [m²]'), value: fmt(Surface_Quench, 2) },
    { text: t('Hauteur quench [m]'), value: fmt(quenchHeight, 2) },
    { text: t('Puissance pompe [kW]'), value: fmt(Puissance_pompe_kW, 2) },
    { text: t('Consommation eau [kg/h]'), value: fmt(Eau_add, 0) },
  ];

  return (
    <div className="cadre_pour_onglet">
      {/* Dimensionnement du WATER_INJECTION */}
      <Section title={t('Dimensionnement du Quench')} t={t}>
        <ParameterInput translationKey="Type d'eau" value={waterType}
          onChange={(v) => handleParametresChange('Type d\'eau', v)}
          options={Object.keys(waterTypeLabels)} t={t} />
      </Section>

      {/* Consommation électrique de la pompe */}
      <Section title={t('Consommation électrique de la pompe')} results={elements_conso_pompe} t={t}>
        <ParameterInput translationKey="Puissance pompe [kW]" value={Puissance_pompe_kW}
          onChange={(v) => handleParametresChange('Puissance pompe [kW]', v)} t={t} />
        <ParameterInput translationKey="Rendement pompe [%]" value={Rendement_pompe}
          onChange={(v) => handleParametresChange('Rendement pompe [%]', v)} t={t} />
      </Section>

      {/* Résumé */}
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
        <h3>{t('Résumé des paramètres principaux')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <p><strong>{t('Diamètre quench')}:</strong> {DiameterQuench} m</p>
          <p><strong>{t('Pression pulvérisation')}:</strong> {P_pulverisation} bar</p>
          <p><strong>{t('Type de buse')}:</strong> {nozzleType}</p>
          <p><strong>{t('Type d\'eau')}:</strong> {waterTypeLabels[waterType]}</p>
          <p><strong>{t('Surface quench')}:</strong> {fmt(Surface_Quench, 2)} m²</p>
          <p><strong>{t('Hauteur quench')}:</strong> {fmt(quenchHeight, 2)} m</p>
          <p><strong>{t('Puissance pompe')}:</strong> {Puissance_pompe_kW} kW</p>
          <p><strong>{t('Consommation eau')}:</strong> {fmt(Eau_add, 0)} kg/h</p>
        </div>
        <h4>{t('Paramètres calculés détaillés')}</h4>
        <TableGeneric elements={elementsGenericSummary} />
      </div>
    </div>
  );
};

export default WATER_INJECTIONDesign;
