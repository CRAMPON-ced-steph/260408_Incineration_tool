import React, { useState, useEffect, useRef } from 'react';
import TableGeneric from '../../C_Components/Tableau_generique';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';
import DENOXimage from '../../B_Images/DENOX_img.png';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './DENOX_traduction';

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

const DENOXDesign = ({ innerData, setInnerData, currentLanguage = 'fr' }) => {
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
    gasTypes = {},
    waterPrices = {},
    currency = '€',
  } = opexData;

  const [technologieSelectionnee, setTechnologieSelectionnee] = useState('plaques');

  // Paramètres SCR
  const [parametresSCR, setParametresSCR] = useState({
    'Débit de gaz [Nm³/h]': getInitialValue('FG_DENOX_wet_OUT_reheating', 10000),
    'Concentration NOx entrée [mg/Nm³]': getInitialValue('Concentration_NOx_entree', 500),
    'Taux de réduction NOx [%]': getInitialValue('Taux_reduction_NOx', 90),
    'Température des gaz [°C]': getInitialValue('Temperature_gaz', 350),
    'Vitesse spatiale [h⁻¹]': getInitialValue('Vitesse_spatiale', 4000),
    'Vitesse superficielle [m/s]': getInitialValue('Vitesse_superficielle', 4.5),
  });

  // Paramètres FAM
  const [parametresFAM, setParametresFAM] = useState({
    'Rendement de capture [%]': getInitialValue('Rendement_capture', 99.9),
    'Vitesse de filtration [m/h]': getInitialValue('Vitesse_filtration', 60),
    'PDC [mmCE]': getInitialValue('PDC_mmCE', 200),
  });

  // Extraction des paramètres
  const debitGaz = parametresSCR['Débit de gaz [Nm³/h]'];
  const concNOxEntree = parametresSCR['Concentration NOx entrée [mg/Nm³]'];
  const tauxReduction = parametresSCR['Taux de réduction NOx [%]'];
  const temperatureGaz = parametresSCR['Température des gaz [°C]'];
  const vitesseSpatiale = parametresSCR['Vitesse spatiale [h⁻¹]'];
  const vitesseSuperficielle = parametresSCR['Vitesse superficielle [m/s]'];
  const Rdt_capture = parametresFAM['Rendement de capture [%]'];
  const Vitess_filtration = parametresFAM['Vitesse de filtration [m/h]'];
  const PDC = parametresFAM['PDC [mmCE]'];

  // Calculs SCR de base
  const volumeCatalyseur = debitGaz / vitesseSpatiale;
  const sectionTransversale = (debitGaz * 1.2) / (vitesseSuperficielle * 3600);
  const concNOxSortie = concNOxEntree * (1 - tauxReduction / 100);
  const consoAmmoniaque = (concNOxEntree * tauxReduction / 100 * debitGaz * 17) / (30.01 * 1000000);
  const Qv_m3_h = debitGaz * 1.2;
  const surfaceManches = Math.abs(Qv_m3_h / Vitess_filtration);
  const pressionSortie = 30 - PDC;

  // Calcul de la perte de charge selon la technologie
  const calculerPerteCharge = () => {
    switch (technologieSelectionnee) {
      case 'plaques':
        const nombreCouches = Math.ceil(Math.sqrt(Math.ceil(volumeCatalyseur / (1.0 * 1.0 * 0.08)) / 4));
        return 800 + (nombreCouches - 1) * 100;
      case 'nid_abeilles':
        return 500 + (1.0 * 200);
      case 'lit_fixe':
        const porosite = 0.4;
        const volumeLitTotal = volumeCatalyseur / (1 - porosite);
        const hauteurLit = Math.min(3.0, Math.max(0.5, volumeLitTotal / sectionTransversale));
        return 1500 + (hauteurLit * 300);
      default:
        return 1000;
    }
  };

  const perteCharge = calculerPerteCharge();

  // Dimensionnement spécifique par technologie
  const calculerDimensionnement = () => {
    switch (technologieSelectionnee) {
      case 'plaques':
        const volumePlaque = 1.0 * 1.0 * 0.08;
        const nombrePlaques = Math.ceil(volumeCatalyseur / volumePlaque);
        const nombreCouches = Math.ceil(Math.sqrt(nombrePlaques / 4));
        const plaquesParCouche = Math.ceil(nombrePlaques / nombreCouches);
        const hauteurTotale = nombreCouches * 0.08;
        const largeurReacteur = Math.ceil(Math.sqrt(plaquesParCouche)) * 1.0;
        const longueurReacteur = Math.ceil(plaquesParCouche / Math.ceil(Math.sqrt(plaquesParCouche))) * 1.0;

        return {
          'Nombre de plaques': nombrePlaques,
          'Nombre de couches': nombreCouches,
          'Plaques par couche': plaquesParCouche,
          'Hauteur réacteur [m]': fmt(hauteurTotale, 2),
          'Largeur réacteur [m]': fmt(largeurReacteur, 2),
          'Longueur réacteur [m]': fmt(longueurReacteur, 2),
          'Volume total plaques [m³]': fmt((nombrePlaques * volumePlaque), 2)
        };

      case 'nid_abeilles':
        const volumeElement = 0.15 * 0.15 * 1.0;
        const nombreElements = Math.ceil(volumeCatalyseur / volumeElement);
        const elementsParRangee = Math.ceil(Math.sqrt(nombreElements));
        const nombreRangees = Math.ceil(nombreElements / elementsParRangee);

        return {
          'Nombre d\'éléments': nombreElements,
          'Éléments par rangée': elementsParRangee,
          'Nombre de rangées': nombreRangees,
          'Hauteur réacteur [m]': '1.00',
          'Largeur réacteur [m]': fmt((elementsParRangee * 0.15), 2),
          'Longueur réacteur [m]': fmt((nombreRangees * 0.15), 2),
          'Densité cellulaire [cpsi]': '400',
          'Volume total éléments [m³]': fmt((nombreElements * volumeElement), 2)
        };

      case 'lit_fixe':
        const porosite = 0.4;
        const volumeLitTotal = volumeCatalyseur / (1 - porosite);
        const hauteurLit = Math.min(3.0, Math.max(0.5, volumeLitTotal / sectionTransversale));
        const sectionLitRecalculee = volumeLitTotal / hauteurLit;
        const diametreLit = Math.sqrt(4 * sectionLitRecalculee / Math.PI);
        const masseCatalyseur = volumeCatalyseur * 600;

        return {
          'Volume lit total [m³]': fmt(volumeLitTotal, 2),
          'Hauteur du lit [m]': fmt(hauteurLit, 2),
          'Diamètre réacteur [m]': fmt(diametreLit, 2),
          'Section du lit [m²]': fmt(sectionLitRecalculee, 2),
          'Porosité du lit [%]': fmt((porosite * 100), 1),
          'Masse catalyseur [kg]': fmt(masseCatalyseur, 0),
          'Densité apparente [kg/m³]': '600'
        };

      default:
        return {};
    }
  };

  const dimensionnementSpecifique = calculerDimensionnement();

  // Gestion des changements de paramètres
  const handleSCRChange = (name, value) => {
    const numericValue = parseFloat(value) || 0;
    let validatedValue = numericValue;

    if (name === 'Taux de réduction NOx [%]') {
      validatedValue = Math.max(0, Math.min(100, numericValue));
    }
    if (name === 'Vitesse spatiale [h⁻¹]') {
      validatedValue = Math.max(2000, Math.min(8000, numericValue));
    }
    if (name === 'Température des gaz [°C]') {
      validatedValue = Math.max(250, Math.min(450, numericValue));
    }

    setParametresSCR(prev => ({ ...prev, [name]: validatedValue }));
  };

  const handleFAMChange = (name, value) => {
    const numericValue = parseFloat(value) || 0;
    let validatedValue = numericValue;

    if (name === 'Rendement de capture [%]') {
      validatedValue = Math.max(0, Math.min(100, numericValue));
    }
    if (name === 'Vitesse de filtration [m/h]') {
      validatedValue = Math.max(30, Math.min(100, numericValue));
    }

    setParametresFAM(prev => ({ ...prev, [name]: validatedValue }));
  };

  // Paramètres calculés
  const elementsGeneral = [
    { text: t('Volume catalyseur requis [m³]'), value: fmt(volumeCatalyseur, 2) },
    { text: t('Section transversale [m²]'), value: fmt(sectionTransversale, 2) },
    { text: t('Concentration NOx sortie [mg/Nm³]'), value: fmt(concNOxSortie, 1) },
    { text: t('Consommation NH₃ [kg/h]'), value: fmt(consoAmmoniaque, 2) },
    { text: t('Perte de charge [Pa]'), value: fmt(perteCharge, 0) },
    { text: t('Surface des manches [m²]'), value: fmt(surfaceManches, 2) },
    { text: t('Pression de sortie [mmCE]'), value: fmt(pressionSortie, 2) },
  ];

  const elementsSpecifiques = Object.entries(dimensionnementSpecifique).map(([key, value]) => ({
    text: key,
    value: value.toString()
  }));

  // Synchronisation des données
  useEffect(() => {
    if (setInnerData && typeof setInnerData === 'function') {
      const consoElec1 = 2 + (perteCharge / 1000 * debitGaz / 10000);
      const consoElec2 = 0.5;

      setInnerData(prevData => ({
        ...prevData,
        P_out_mmCE: pressionSortie,
        consoElec1: consoElec1.toFixed(2),
        consoElec2: consoElec2.toFixed(2),
        labelElec1: 'Ventilateur SCR',
        labelElec2: 'Pompe NH₃',
        Conso_Ammonia_kg: consoAmmoniaque.toFixed(2),
        conso_air_co_N_m3: 0,
      }));
    }
  }, [perteCharge, debitGaz, consoAmmoniaque, pressionSortie, setInnerData]);

  return (
    <div className="cadre_pour_onglet">
      {/* Sélection de technologie */}
      <Section title={t('Technologie SCR')} t={t}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ flex: 1, minWidth: '200px', textAlign: 'right', fontWeight: '500', color: '#333' }}>
            {t('Technologie SCR')}:
          </label>
          <select
            value={technologieSelectionnee}
            onChange={(e) => setTechnologieSelectionnee(e.target.value)}
            style={{ flex: '0 0 150px', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="plaques">Plaques catalytiques</option>
            <option value="nid_abeilles">Nid d'abeilles</option>
            <option value="lit_fixe">Lit fixe</option>
          </select>
        </div>
      </Section>

      {/* Image */}
      <div style={{ textAlign: 'center', marginBottom: '30px', padding: '20px' }}>
        <img
          src={DENOXimage}
          alt="DENOX"
          style={{ width: '100%', maxWidth: '400px', height: 'auto', borderRadius: '8px', objectFit: 'contain' }}
        />
      </div>

      {/* Paramètres SCR */}
      <Section title={t('Paramètres SCR')} t={t}>
        {Object.entries(parametresSCR).map(([key, value]) => (
          <ParameterInput
            key={key}
            translationKey={key}
            value={value}
            onChange={(v) => handleSCRChange(key, v)}
            t={t}
          />
        ))}
      </Section>

      {/* Paramètres FAM */}
      <Section title={t('Paramètres FAM')} t={t}>
        {Object.entries(parametresFAM).map(([key, value]) => (
          <ParameterInput
            key={key}
            translationKey={key}
            value={value}
            onChange={(v) => handleFAMChange(key, v)}
            t={t}
          />
        ))}
      </Section>

      {/* Résultats généraux */}
      <Section title={t('Paramètres Calculés Généraux')} results={elementsGeneral} t={t} />

      {/* Dimensionnement spécifique */}
      <Section
        title={t('Dimensionnement Spécifique')}
        results={elementsSpecifiques}
        t={t}
      />

      {/* Résumé */}
      <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#e8f4f8', borderRadius: '8px' }}>
        <h3>{t('Résumé des paramètres principaux')}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
          <p><strong>{t('Technologie')}:</strong> {technologieSelectionnee.replace('_', ' ')}</p>
          <p><strong>{t('Volume catalyseur [m³]')}:</strong> {fmt(volumeCatalyseur, 2)}</p>
          <p><strong>{t('Taux de réduction NOx [%]')}:</strong> {tauxReduction}%</p>
          <p><strong>{t('Concentration NOx sortie [mg/Nm³]')}:</strong> {fmt(concNOxSortie, 1)}</p>
          <p><strong>{t('Consommation NH₃ [kg/h]')}:</strong> {fmt(consoAmmoniaque, 2)}</p>
          <p><strong>{t('Surface des manches [m²]')}:</strong> {fmt(surfaceManches, 2)}</p>
          <p><strong>{t('Perte de charge [Pa]')}:</strong> {fmt(perteCharge, 0)}</p>
          <p><strong>{t('Pression de sortie [mmCE]')}:</strong> {fmt(pressionSortie, 2)}</p>
        </div>
      </div>
    </div>
  );
};

export default DENOXDesign;
