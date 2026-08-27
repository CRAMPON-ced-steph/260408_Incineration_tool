import React, { useState, useEffect, useCallback, useRef } from 'react';
import COOLINGTOWERImage from '/src/B_Images/quench_img.png';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './COOLINGTOWER_traduction';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';

import { fmt } from '../../A_Transverse_fonction/formatNumber';

// ─── Composants UI au niveau module (références stables → pas de perte de focus) ───
const Section = ({ title, children, results: sectionResults, t }) => (
  <div className="mb-6 p-6 bg-gray-50 rounded-lg shadow">
    <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b-2 border-blue-500 pb-2">
      {title}
    </h3>
    <div className="space-y-4">
      {children}
      {sectionResults && sectionResults.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-300">
          <h4 className="font-semibold text-gray-700 mb-3">{t('Résultats')}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sectionResults.map((result, idx) => (
              <div key={idx} className="text-sm">
                <p className="text-gray-600">
                  <strong>{result.label}:</strong> {result.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
);

const ParameterInput = ({ label, name, value, onChange, type = 'number', options = null }) => {
  const [display, setDisplay] = useState(() => value !== undefined && value !== null ? String(value) : '');
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDisplay(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      <label className="w-full sm:w-64 text-sm font-medium text-gray-700">
        {label}:
      </label>
      {options ? (
        <select
          value={value}
          onChange={onChange}
          className="w-full sm:w-72 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          value={display}
          onChange={(e) => {
            setDisplay(e.target.value);
            onChange(e);
          }}
          onFocus={() => { focused.current = true; }}
          onBlur={() => {
            focused.current = false;
            const n = parseFloat(display);
            setDisplay(isNaN(n) ? (value !== undefined && value !== null ? String(value) : '0') : String(n));
          }}
          className="w-full sm:w-72 p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
        />
      )}
    </div>
  );
};

const ResultsGrid = ({ results: resultsData, t }) => (
  <div className="bg-white p-6 rounded-lg shadow-lg mt-6">
    <h3 className="text-xl font-semibold text-gray-800 mb-4">{t('Résultats')}</h3>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div>
        <h4 className="font-semibold text-lg text-gray-700 mb-3">{t('Caractéristiques calculées')}</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li><strong>{t('Hauteur minimale')}:</strong> {fmt(resultsData.height, 2)} m</li>
          <li><strong>SMD:</strong> {fmt((resultsData.sprayCharacteristics.smd * 1e6), 1)} μm</li>
          <li><strong>{t('Vitesse des gouttes')}:</strong> {fmt(resultsData.sprayCharacteristics.dropletVelocity, 1)} m/s</li>
          <li><strong>{t('Angle de spray')}:</strong> {fmt(resultsData.sprayCharacteristics.sprayAngle, 1)}°</li>
        </ul>
      </div>

      <div>
        <h4 className="font-semibold text-lg text-gray-700 mb-3">{t('Qualité du spray')}</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li><strong>{t('Atomisation')}:</strong> {resultsData.sprayQuality.atomization}</li>
          <li><strong>{t('Uniformité')}:</strong> {resultsData.sprayQuality.uniformity}</li>
          <li><strong>{t('Couverture')}:</strong> {resultsData.sprayQuality.coverage}</li>
        </ul>
      </div>
    </div>
  </div>
);

const COOLINGTOWERDesign = ({ innerData, setInnerData, currentLanguage = 'fr' }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const t = (key) => {
    return translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  };

  const { truck15TPrice } = getOpexData();

  // ========== NOZZLE TYPES CONFIGURATION ==========
  const NOZZLE_TYPES = {
    HOLLOW_CONE: {
      name: t('Cône creux'),
      defaultN: 2.8,
      dMeanRange: { min: 0.0001, max: 0.0003 },
      description: t('Distribution étroite, bon pour l\'uniformité')
    },
    FULL_CONE: {
      name: t('Cône plein'),
      defaultN: 2.3,
      dMeanRange: { min: 0.00015, max: 0.0004 },
      description: t('Distribution plus large, meilleure couverture')
    },
    FLAT_JET: {
      name: t('Jet plat'),
      defaultN: 2.0,
      dMeanRange: { min: 0.0002, max: 0.0005 },
      description: t('Distribution large, bon pour les grandes surfaces')
    },
    SPIRAL: {
      name: t('Spirale'),
      defaultN: 3.2,
      dMeanRange: { min: 0.00008, max: 0.00025 },
      description: t('Distribution très étroite, excellente atomisation')
    }
  };

  // ========== INITIAL STATE ==========
  const initialParams = {
    vGas: 5,
    dMean: 0.0002,
    n: 2.0,
    vDropInitial: -2.0,
    tGasIn: 200,
    tLiquid: 293,
    pressure: 3,
    flowRate: 1,
    nozzleType: 'FULL_CONE'
  };

  const [params, setParams] = useState(initialParams);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // ========== CALCULATOR METHODS ==========
  const calculateSprayCharacteristics = useCallback((calcParams) => {
    const { dMean, n, pressure, flowRate } = calcParams;
    const smd = dMean * 0.693 * (1 + 1 / n);
    const dropletVelocity = Math.sqrt(2 * pressure / 1000);
    const sprayAngle = 2 * Math.atan(0.2 * Math.sqrt(pressure / flowRate));

    return {
      smd,
      dropletVelocity,
      sprayAngle: sprayAngle * (180 / Math.PI)
    };
  }, []);

  const getSprayQuality = useCallback((dMean, n) => {
    let quality = {
      atomization: '',
      coverage: '',
      uniformity: ''
    };

    if (dMean < 0.0002) {
      quality.atomization = t('Excellente');
    } else if (dMean < 0.0003) {
      quality.atomization = t('Bonne');
    } else {
      quality.atomization = t('Moyenne');
    }

    if (n > 3.0) {
      quality.uniformity = t('Très uniforme');
    } else if (n > 2.5) {
      quality.uniformity = t('Uniforme');
    } else {
      quality.uniformity = t('Moins uniforme');
    }

    if (n < 2.2) {
      quality.coverage = t('Large couverture');
    } else if (n < 2.8) {
      quality.coverage = t('Couverture moyenne');
    } else {
      quality.coverage = t('Couverture concentrée');
    }

    return quality;
  }, [t]);

  const calculateCOOLINGTOWERHeight = useCallback((calcParams) => {
    const { vGas, dMean, n, vDropInitial, tGasIn, tLiquid, pressure, flowRate } = calcParams;

    const sprayCharacteristics = calculateSprayCharacteristics({
      dMean,
      n,
      pressure,
      flowRate
    });

    const sprayQuality = getSprayQuality(dMean, n);
    const height = 1.2 * Math.abs(vGas - vDropInitial) * (tGasIn - tLiquid) / 100;

    return { height, sprayCharacteristics, sprayQuality };
  }, [calculateSprayCharacteristics, getSprayQuality]);

  // ========== EVENT HANDLERS ==========
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setParams(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  }, []);

  const handleNozzleChange = useCallback((e) => {
    const value = e.target.value;
    const nozzleType = NOZZLE_TYPES[value];
    setParams(prev => ({
      ...prev,
      nozzleType: value,
      n: nozzleType.defaultN,
      dMean: (nozzleType.dMeanRange.min + nozzleType.dMeanRange.max) / 2
    }));
  }, [NOZZLE_TYPES]);

  const handleReset = useCallback(() => {
    setParams(initialParams);
  }, []);

  // ========== RECALCULATE RESULTS ==========
  useEffect(() => {
    try {
      const calculatedResults = calculateCOOLINGTOWERHeight(params);
      setResults(calculatedResults);
      setError(null);
    } catch (err) {
      setError(t('Erreur lors du calcul. Vérifiez les paramètres d\'entrée.'));
      setResults(null);
    }
  }, [params, calculateCOOLINGTOWERHeight, t]);

  // ========== UPDATE INNER DATA ==========
  useEffect(() => {
    if (innerData && setInnerData && typeof setInnerData === 'function') {
      const toSignificantFigures = (value, figures = 2) => {
        if (value === 0 || value === null || value === undefined || !isFinite(value)) return 0;
        return parseFloat(value.toPrecision(figures));
      };

      setInnerData(prevData => ({
        ...prevData,
        consoElec1: toSignificantFigures(2),
        consoElec2: toSignificantFigures(0),
        consoElec3: toSignificantFigures(0),
        consoElec4: toSignificantFigures(0),
        consoElec5: toSignificantFigures(0),
        labelElec1: t('pompe'),
        labelElec2: t('pompe'),
        labelElec3: t('pompe'),
        labelElec4: t('pompe'),
        labelElec5: t('pompe'),
        conso_air_co_N_m3: toSignificantFigures(0),
        Conso_EauPotable_m3: toSignificantFigures(1),
        Conso_EauRefroidissement_m3: toSignificantFigures(1),
        Conso_EauDemin_m3: toSignificantFigures(1),
        Conso_EauRiviere_m3: toSignificantFigures(1),
        Conso_EauAdoucie_m3: toSignificantFigures(1),
        Conso_CaCO3_kg: toSignificantFigures(1),
        Conso_CaO_kg: toSignificantFigures(1),
        Conso_CaOH2_dry_kg: toSignificantFigures(1),
        Conso_CaOH2_wet_kg: toSignificantFigures(0),
        Conso_NaOH_kg: toSignificantFigures(0),
        Conso_NaOHCO3_kg: toSignificantFigures(0),
        Conso_Ammonia_kg: toSignificantFigures(0),
        Conso_NaBrCaBr2_kg: toSignificantFigures(0),
        truck15TPrice: toSignificantFigures(truck15TPrice || 0),
        conso_gaz_H_MW: toSignificantFigures(0),
        conso_gaz_L_MW: toSignificantFigures(0),
        conso_gaz_Process_MW: toSignificantFigures(0),
        conso_fuel: toSignificantFigures(0),
        conso_incineration_ash_kg_h: toSignificantFigures(1),
        conso_boiler_ash_kg_h: toSignificantFigures(1),
        conso_fly_ash_kg_h: toSignificantFigures(1),
        CO2_transport_incineratino_ash: toSignificantFigures(90),
        CO2_transport_boiler_ash: toSignificantFigures(90),
        CO2_transport_fly_ash: toSignificantFigures(90),
        cout_transport_incineratino_ash: toSignificantFigures(90),
        cout_transport_boiler_ash: toSignificantFigures(90),
        cout_transport_fly_ash: toSignificantFigures(90),
      }));
    }
  }, [innerData, setInnerData, truck15TPrice, t]);

  return (
    <div className="p-6 flex flex-col lg:flex-row items-start bg-gray-50">
      {/* ========== IMAGE COLUMN ========== */}
      <div className="lg:w-1/3 mb-6 lg:mb-0 lg:mr-8">
        <img
          src={COOLINGTOWERImage}
          alt={t('COOLINGTOWER Image')}
          className="w-full h-auto rounded-lg shadow-lg"
        />
      </div>

      {/* ========== PARAMETERS & CALCULATIONS COLUMN ========== */}
      <div className="lg:w-2/3 bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          {t('Configuration du COOLINGTOWER')}
        </h2>

        {/* ========== NOZZLE SELECTION SECTION ========== */}
        <Section title={t('Sélection de la buse')} t={t}>
          <div className="space-y-4">
            <ParameterInput
              label={t('Type de buse')}
              value={params.nozzleType}
              onChange={handleNozzleChange}
              options={Object.keys(NOZZLE_TYPES)}
            />
            <p className="text-sm text-gray-600 p-3 bg-blue-50 rounded">
              {NOZZLE_TYPES[params.nozzleType].description}
            </p>
          </div>
        </Section>

        {/* ========== SPRAY PARAMETERS SECTION ========== */}
        <Section title={t('Paramètres du spray')} t={t}>
          <div className="space-y-4">
            <ParameterInput
              label={t('Pression (bar)')}
              name="pressure"
              value={params.pressure}
              onChange={handleInputChange}
            />
            <ParameterInput
              label={t('Débit (L/min)')}
              name="flowRate"
              value={params.flowRate}
              onChange={handleInputChange}
            />
            <ParameterInput
              label={t('Diamètre moyen (m)')}
              name="dMean"
              value={params.dMean}
              onChange={handleInputChange}
            />
            <ParameterInput
              label={t('Indice de distribution (n)')}
              name="n"
              value={params.n}
              onChange={handleInputChange}
            />
          </div>
        </Section>

        {/* ========== GAS PARAMETERS SECTION ========== */}
        <Section title={t('Paramètres du gaz')} t={t}>
          <div className="space-y-4">
            <ParameterInput
              label={t('Température du gaz (K)')}
              name="tGasIn"
              value={params.tGasIn}
              onChange={handleInputChange}
            />
            <ParameterInput
              label={t('Vitesse du gaz (m/s)')}
              name="vGas"
              value={params.vGas}
              onChange={handleInputChange}
            />
            <ParameterInput
              label={t('Vitesse des gouttes initiale (m/s)')}
              name="vDropInitial"
              value={params.vDropInitial}
              onChange={handleInputChange}
            />
          </div>
        </Section>

        {/* ========== LIQUID PARAMETERS SECTION ========== */}
        <Section title={t('Paramètres du liquide')} t={t}>
          <div className="space-y-4">
            <ParameterInput
              label={t('Température du liquide (K)')}
              name="tLiquid"
              value={params.tLiquid}
              onChange={handleInputChange}
            />
          </div>
        </Section>

        {/* ========== RESET BUTTON ========== */}
        <div className="mb-6">
          <button
            onClick={handleReset}
            className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
          >
            {t('Réinitialiser les paramètres')}
          </button>
        </div>

        {/* ========== RESULTS SECTION ========== */}
        {results && <ResultsGrid results={results} t={t} />}

        {/* ========== ERROR SECTION ========== */}
        {error && (
          <div className="mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default COOLINGTOWERDesign;
