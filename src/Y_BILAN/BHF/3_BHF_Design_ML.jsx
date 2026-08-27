import React, { useState, useEffect, useRef } from 'react';
import TableGeneric from '../../C_Components/Tableau_generique';
import { coeff_Nm3_to_m3 } from '../../A_Transverse_fonction/conv_calculation';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import BHFimage from '../../B_Images/BHF_img.png';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './BHF_traduction';

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

const ParameterInput = ({ translationKey, value, onChange, type = 'number', options = null, disabled = false, t }) => {
  const [display, setDisplay] = useState(() => value !== undefined && value !== null ? String(value) : '');
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDisplay(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <label style={{ flex: 1, minWidth: '200px', textAlign: 'right', fontWeight: '500', color: '#333' }}>
        {t(translationKey)}:
      </label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: '0 0 150px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
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
          style={{ flex: '0 0 150px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      )}
    </div>
  );
};

const BHFDesign = ({ innerData, setInnerData, currentLanguage = 'fr' }) => {
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

  const Debit_fumees_sec_Nm3_h = innerData?.FG_RK_OUT_Nm3_h?.dry || 28666;
  const Debit_fumees_humide_Nm3_h = innerData?.FG_RK_OUT_Nm3_h?.wet || 28666;

  // PDC calcul
  const [PDC_calcul, setPDC_calcul] = useState({
    'Pression aéraulique [mmCE]': getInitialValue('P_OUT', 0),
    'PDC [mmCE]': getInitialValue('PDC_mmCE', 200),
  });

  const P_in_mmCE = innerData?.P_OUT || PDC_calcul['Pression aéraulique [mmCE]'];
  const PDC_mmCE = PDC_calcul['PDC [mmCE]'];
  const P_out_mmCE = P_in_mmCE - PDC_mmCE;
  const T_IN = innerData?.T_OUT || 200;
  const Qv_humide_m3_h = coeff_Nm3_to_m3(P_in_mmCE, T_IN) * Debit_fumees_humide_Nm3_h;

  // Dimensionnement FAM
  const [DimensionnementFAM, setDimensionnementFAM] = useState({
    'Rendement de capture [%]': getInitialValue('Rendement_capture', 99.9),
    'Vitesse de filtration [m/h]': getInitialValue('Vitesse_filtration', 60),
  });

  const Rdt_capture = DimensionnementFAM['Rendement de capture [%]'];
  const Vitesse_filtration_m_h = DimensionnementFAM['Vitesse de filtration [m/h]'];
  const surfaceManches = Math.abs(Qv_humide_m3_h / Vitesse_filtration_m_h);

  // Consommation électrique
  const [Parametres_conso_Elec, setParametres_conso_Elec] = useState({
    'conso elec vis de transport [kW]': getInitialValue('Vis_de_transport', 4),
  });

  const Conso_elec_vis_transport_kW = Parametres_conso_Elec['conso elec vis de transport [kW]'];

  // Consommation air comprimé
  const [conso_air_comprime, setConso_air_comprime] = useState({
    'Nombre de cycles [Nb]': getInitialValue('Nombre_cycles', 60),
    'Pression air comprimé [Bar]': getInitialValue('Pression_air_comprime', '7'),
    'Air comprime par cycle [Nm3/cycle]': getInitialValue('Air_comprime_cycle', 28),
  });

  const nombre_cycle_nb = conso_air_comprime['Nombre de cycles [Nb]'];
  const pression_air_comprime_bar = parseFloat(conso_air_comprime['Pression air comprimé [Bar]'] || '7');
  const air_comprime_par_cycle = conso_air_comprime['Air comprime par cycle [Nm3/cycle]'];
  const conso_air_co_Nm3_h = air_comprime_par_cycle * nombre_cycle_nb;
  const Conso_elec_air_co_kW = conso_air_co_Nm3_h * powerRatio;

  // Évacuation résidus
  const [evacuation_BHF_ash, setEvacuation_BHF_ash] = useState({
    'Type de camion': getInitialValue('Type_camion', '15t'),
    'Distance [km]': getInitialValue('Distance_transport', 50),
  });

  const residus_a_evacuer = innerData?.Residus || { DryBottomAsh_kg_h: 0, WetBottomAsh_kg_h: 0 };
  const type_camion = evacuation_BHF_ash['Type de camion'];
  const distance_km = evacuation_BHF_ash['Distance [km]'];
  const cendres_kg_h = residus_a_evacuer.WetBottomAsh_kg_h;

  let CO2_transport_kg_km, cout_transport_euro_km;
  switch(type_camion) {
    case '15t': CO2_transport_kg_km = truck15TCO2; cout_transport_euro_km = truck15TPrice; break;
    case '20t': CO2_transport_kg_km = truck20TCO2; cout_transport_euro_km = truck20TPrice; break;
    case '25t': CO2_transport_kg_km = truck25TCO2; cout_transport_euro_km = truck25TPrice; break;
    default: CO2_transport_kg_km = truck15TCO2; cout_transport_euro_km = truck15TPrice;
  }

  let CO2_transport_total = CO2_transport_kg_km * distance_km * (cendres_kg_h / 1000);
  let cout_transport_total = cendres_kg_h === 0 ? 0 : cout_transport_euro_km * distance_km;

  const elementsGeneric = [
    { text: t('Surface des manches [m²]'), value: fmt(surfaceManches, 2) },
    { text: t('Consommation air comprimé [Nm3/h]'), value: fmt(conso_air_co_Nm3_h, 2) },
    { text: t('Pression air comprimé [Bar]'), value: fmt(pression_air_comprime_bar, 1) },
    { text: t('Residus du BHF [kg/h]'), value: fmt(cendres_kg_h, 2) },
    { text: t('CO2 transport total [kg]'), value: fmt(CO2_transport_total, 2) },
    { text: t('Coût transport total [€]'), value: fmt(cout_transport_total, 2) },
  ];

  const handleParametresChange = (name, value) => {
    const numericValue = parseFloat(value) || 0;

    if (name === 'Rendement de capture [%]') {
      const validatedValue = Math.max(0, Math.min(100, numericValue));
      setDimensionnementFAM(prev => ({ ...prev, [name]: validatedValue }));
      return;
    }
    if (name === 'Vitesse de filtration [m/h]') {
      const validatedValue = Math.max(30, Math.min(100, numericValue));
      setDimensionnementFAM(prev => ({ ...prev, [name]: validatedValue }));
      return;
    }
    if (name in PDC_calcul) {
      setPDC_calcul(prev => ({ ...prev, [name]: numericValue }));
    } else if (name in Parametres_conso_Elec) {
      setParametres_conso_Elec(prev => ({ ...prev, [name]: numericValue }));
    } else if (name in conso_air_comprime) {
      setConso_air_comprime(prev => ({ ...prev, [name]: value }));
    } else if (name in evacuation_BHF_ash) {
      setEvacuation_BHF_ash(prev => ({ ...prev, [name]: typeof value === 'string' ? value : numericValue }));
    }
  };

  const consommation_reactifs = innerData?.Conso_reactifs || {
    CaCO3: 0, CaO: 0, CaOH2wet: 0, CaOH2dry: 0, NaOH: 0, NaOHCO3: 0,
    Ammonia: 0, NaBrCaBr2: 0, CAP: 0, cout: 0, CO2_transport: 0,
  };

  useEffect(() => {
    if (setInnerData && typeof setInnerData === 'function') {
      const toSignificantFigures = (value, figures = 2) => {
        if (value === 0 || value === null || value === undefined || !isFinite(value)) return 0;
        return parseFloat(value.toPrecision(figures));
      };

      setInnerData(prevData => ({
        ...prevData,
        P_out_mmCE,
        consoElec1: toSignificantFigures(Conso_elec_vis_transport_kW),
        consoElec2: toSignificantFigures(Conso_elec_air_co_kW),
        labelElec1: 'vis transport',
        labelElec2: 'Air comprimé',
        conso_air_co_N_m3: conso_air_co_Nm3_h,
        pression_air_comprime_bar,
        Conso_CaCO3_kg: toSignificantFigures(consommation_reactifs.CaCO3),
        Conso_CaO_kg: toSignificantFigures(consommation_reactifs.CaO),
        Conso_CaOH2_dry_kg: toSignificantFigures(consommation_reactifs.CaOH2dry),
        Conso_CaOH2_wet_kg: toSignificantFigures(consommation_reactifs.CaOH2wet),
        Conso_NaOH_kg: toSignificantFigures(consommation_reactifs.NaOH),
        Conso_NaOHCO3_kg: toSignificantFigures(consommation_reactifs.NaOHCO3),
        Conso_Ammonia_kg: toSignificantFigures(consommation_reactifs.Ammonia),
        Conso_NaBrCaBr2_kg: toSignificantFigures(consommation_reactifs.NaBrCaBr2),
        Conso_CAP_kg: toSignificantFigures(consommation_reactifs.CAP),
        conso_fly_ash_kg_h: toSignificantFigures(cendres_kg_h),
        CO2_transport_fly_ash: toSignificantFigures(CO2_transport_total),
        cout_transport_fly_ash: toSignificantFigures(cout_transport_total),
      }));
    }
  }, [Conso_elec_vis_transport_kW, Conso_elec_air_co_kW, conso_air_co_Nm3_h,
      pression_air_comprime_bar, cout_transport_total, CO2_transport_total,
      cendres_kg_h, P_out_mmCE, consommation_reactifs, setInnerData]);

  return (
    <div className="cadre_pour_onglet">
      {/* Pertes de charge aéraulique */}
      <Section title={t('Pertes de charge aéraulique')} results={[{ text: t('Pression de sortie [mmCE]'), value: fmt(P_out_mmCE, 2) }]} t={t}>
        <ParameterInput translationKey="Pression aéraulique [mmCE]" value={PDC_calcul['Pression aéraulique [mmCE]']}
          onChange={(v) => handleParametresChange('Pression aéraulique [mmCE]', v)} t={t} />
        <ParameterInput translationKey="PDC [mmCE]" value={PDC_calcul['PDC [mmCE]']}
          onChange={(v) => handleParametresChange('PDC [mmCE]', v)} t={t} />
      </Section>

      {/* Dimensionnement du FAM */}
      <Section
        title={t('Dimensionnement du FAM')}
        results={[
          { text: t('Surface des manches [m²]'), value: fmt(surfaceManches, 2) },
          { text: t('Pression de sortie [mmCE]'), value: fmt(P_out_mmCE, 2) },
        ]}
        t={t}
      >
        <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <img src={BHFimage} alt="BHF" style={{ width: '100%', maxWidth: '300px', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, display: 'grid', gap: '15px' }}>
            <ParameterInput translationKey="Rendement de capture [%]" value={Rdt_capture}
              onChange={(v) => handleParametresChange('Rendement de capture [%]', v)} t={t} />
            <ParameterInput translationKey="Vitesse de filtration [m/h]" value={Vitesse_filtration_m_h}
              onChange={(v) => handleParametresChange('Vitesse de filtration [m/h]', v)} t={t} />
          </div>
        </div>
      </Section>

      {/* Consommation électrique vis */}
      <Section title={t('Consommation électrique de la vis sans fin')} results={[
        { text: t('conso elec vis de transport [kW]'), value: fmt(Conso_elec_vis_transport_kW, 2) },
      ]} t={t}>
        <ParameterInput translationKey="conso elec vis de transport [kW]" value={Conso_elec_vis_transport_kW}
          onChange={(v) => handleParametresChange('conso elec vis de transport [kW]', v)} t={t} />
      </Section>

      {/* Consommation air comprimé */}
      <Section title={t('Consommation d\'air comprimé')} results={[
        { text: t('Consommation air comprimé [Nm3/h]'), value: fmt(conso_air_co_Nm3_h, 2) },
        { text: t('Conso élec air comprimé [kW]'), value: fmt(Conso_elec_air_co_kW, 2) },
      ]} t={t}>
        <ParameterInput translationKey="Nombre de cycles [Nb]" value={nombre_cycle_nb}
          onChange={(v) => handleParametresChange('Nombre de cycles [Nb]', v)} t={t} />
        <ParameterInput translationKey="Pression air comprimé [Bar]" value={pression_air_comprime_bar}
          onChange={(v) => handleParametresChange('Pression air comprimé [Bar]', v)}
          options={['7', '10', '13', '15']} t={t} />
        <ParameterInput translationKey="Air comprime par cycle [Nm3/cycle]" value={air_comprime_par_cycle}
          onChange={(v) => handleParametresChange('Air comprime par cycle [Nm3/cycle]', v)} t={t} />
      </Section>

      {/* Évacuation résidus */}
      <Section title={t('Évacuation des residus BHF')} results={[
        { text: t('Residus du BHF [kg/h]'), value: fmt(cendres_kg_h, 2) },
        { text: t('Type de camion'), value: type_camion },
        { text: t('Distance [km]'), value: fmt(distance_km, 0) },
        { text: t('CO2 transport total [kg]'), value: fmt(CO2_transport_total, 2) },
        { text: t('Coût transport total [€]'), value: fmt(cout_transport_total, 2) },
      ]} t={t}>
        <ParameterInput translationKey="Type de camion" value={type_camion}
          onChange={(v) => handleParametresChange('Type de camion', v)}
          options={['15t', '20t', '25t']} t={t} />
        <ParameterInput translationKey="Distance [km]" value={distance_km}
          onChange={(v) => handleParametresChange('Distance [km]', v)} t={t} />
      </Section>

      {/* Résumé */}
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
        <h3>{t('Résumé des paramètres principaux')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <p><strong>{t('Surface des manches [m²]')}:</strong> {fmt(surfaceManches, 2)} m²</p>
          <p><strong>{t('Rendement de capture [%]')}:</strong> {Rdt_capture}%</p>
          <p><strong>{t('Vitesse de filtration [m/h]')}:</strong> {Vitesse_filtration_m_h} m/h</p>
          <p><strong>{t('Pression air comprimé [Bar]')}:</strong> {pression_air_comprime_bar} Bar</p>
          <p><strong>{t('Consommation air comprimé [Nm3/h]')}:</strong> {fmt(conso_air_co_Nm3_h, 2)} Nm³/h</p>
          <p><strong>{t('Conso élec air comprimé [kW]')}:</strong> {fmt(Conso_elec_air_co_kW, 2)} kW</p>
          <p><strong>{t('Residus du BHF [kg/h]')}:</strong> {fmt(cendres_kg_h, 2)} kg/h</p>
          <p><strong>{t('Type de camion')}:</strong> {type_camion}</p>
        </div>
        <h4>{t('Paramètres calculés détaillés')}</h4>
        <TableGeneric elements={elementsGeneric} />
      </div>
    </div>
  );
};

export default BHFDesign;
