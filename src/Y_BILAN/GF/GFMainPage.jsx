import React, { useState, useRef, useCallback, useMemo } from 'react';
import BouesTab from './1_OmTab';
import CombustionTab from './2_CombustionTab';
import GF_Report from './GF_Report';
import { fmt } from '../../A_Transverse_fonction/formatNumber';

//import CombustionTab from './2_CombustionTabTequi';

import Pollutant from './3_Pollutant_Emission';
import DimensionnementTab from './3_VouteTab';
import GFopex from './5_GF_Opex';
import GFCalcOpex from './5_1_GF_calcul_Opex';

import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './GF_traduction';

const GFMainPage = ({ nodeData, title, onSendData, onClose, onGoBack, currentLanguage = 'fr', nodeId }) => {
  // ============================================================
  // LANGUAGE MANAGEMENT
  // ============================================================
  const languageCode = getLanguageCode(currentLanguage);
  const t = (key) => translations[languageCode]?.[key] || translations['fr']?.[key] || key;

  // ============================================================
  // STATE & REFS
  // ============================================================

  // ✅ innerDataRef : ref partagée pour les mutations directes
  // Contient TOUTES les données échangées entre onglets
  // Seeded from nodeData.result so tabs (Pollutant) have combustion data without needing
  // to visit the Combustion tab first each session.
  const innerDataRef = useRef(null);
  if (!innerDataRef.current) {
    const r = nodeData?.result ?? {};
    innerDataRef.current = {
      ...(r.FG_OUT_kg_h          ? { FG_OUT_kg_h: r.FG_OUT_kg_h }                           : {}),
      ...(r.FG_OUT_Nm3_h         ? { FG_OUT_Nm3_h: r.FG_OUT_Nm3_h,
                                     FG_dry_Nm3_h: r.FG_OUT_Nm3_h.dry || 0,
                                     FG_wet_Nm3_h: r.FG_OUT_Nm3_h.wet || 0 }                : {}),
      ...(r.FG_pollutant_OUT_kg_h ? { FG_pollutant_OUT_kg_h: r.FG_pollutant_OUT_kg_h }      : {}),
      ...(r.O2_calcule != null    ? { O2_calcule: r.O2_calcule }                             : {}),
      ...(r.Conso_reactifs        ? { Conso_reactifs: r.Conso_reactifs }                     : {}),
      ...(r.MasseBoueBrute != null ? { MasseBoueBrute: r.MasseBoueBrute,
                                       BoueBrute_kg_h: r.MasseBoueBrute }                   : {}),
    };
  }

  const [combustionResults, setCombustionResults] = useState({});

  // ✅ Compteur de version pour forcer le re-render des onglets aval
  const [innerDataTick, setInnerDataTick] = useState(0);
  const notifyInnerDataChanged = useCallback(() => {
    setInnerDataTick((t) => t + 1);
  }, []);

  const setInnerDataForCalcOpex = useCallback((updater) => {
    const newVal = typeof updater === 'function' ? updater(innerDataRef.current) : updater;
    Object.assign(innerDataRef.current, newVal);
    notifyInnerDataChanged();
  }, [notifyInnerDataChanged]);

  // ✅ State pour onglet actif
  const [activeTab, setActiveTab] = useState('boues');

  // ============================================================
  // TABS CONFIGURATION — RÉACTIF À LA LANGUE
  // ============================================================
  // ✨ useMemo + dépendance [currentLanguage] = traduction dynamique des titres
  const tabs = useMemo(() => [
    { name: 'boues', label: t('Caractéristiques des OM') || 'Caractéristiques des OM' },
    { name: 'combustion', label: t('Combustion') || 'Combustion' },
    { name: 'pollutant', label: t('Polluant') || 'Polluant' },
    { name: 'voute', label: t('Voûte') || 'Voûte' },
    { name: 'opex', label: t('OPEX') || 'OPEX' },
    { name: 'rapport', label: t('Rapport') || 'Rapport' },
  ], [currentLanguage]);

  // ============================================================
  // HANDLERS — SEND DATA & BACK
  // ============================================================

  const sendAllData = useCallback(() => {
    if (!onSendData || typeof onSendData !== 'function') {
      alert('Erreur : Le callback onSendData n\'est pas défini.');
      return;
    }

    try {
      // ✅ DONNÉES COHÉRENTES
      const dataToSend = {
        result: {
          // === COMBUSTION (depuis CombustionTab) ===
          FG_OUT_kg_h: innerDataRef.current['FG_OUT_kg_h'] || {
            CO2: 0,
            O2: 0,
            H2O: 0,
            N2: 0,
            dry: 0,
            wet: 0,
          },
          FG_OUT_Nm3_h: innerDataRef.current['FG_OUT_Nm3_h'] || {
            CO2: 0,
            O2: 0,
            H2O: 0,
            N2: 0,
            dry: 0,
            wet: 0,
          },
          FG_pollutant_OUT_kg_h: innerDataRef.current['FG_pollutant_OUT_kg_h'] || {
            NOx: 0,
            HCl: 0,
            SO2: 0,
            N2: 0,
            CO2: 0,
          },
          O2_calcule: innerDataRef.current['O2_calcule'] ?? 0,

          T_OUT: innerDataRef.current['Temp_fumee_voute_C'] ?? 0,
          P_out_mmCE: 0,

          // === POLLUANT (depuis Pollutant_Emission) ===
          PollutantInput: innerDataRef.current['PInput'] || {},
          PollutantOutput: innerDataRef.current['Poutput'] || {},
          Residus: innerDataRef.current['Residus'] || {
            DryBottomAsh_kg_h: 0,
            WetBottomAsh_kg_h: 0,
            FlyAsh_kg_h: 0,
          },
          REFIDIS: innerDataRef.current['REFIDIS'] ?? 0,
          Conso_reactifs: innerDataRef.current['Conso_reactifs'] || {},

          // === DONNÉES BOUE ===
          MasseBoueBrute: innerDataRef.current['MasseBoueBrute'] ?? 0,
          masse_dechets: innerDataRef.current['MasseBoueBrute'] ?? 0,

          // Fonctionnement
          daysPerWeek:       innerDataRef.current['daysPerWeek']       ?? 0,
          hoursPerDay:       innerDataRef.current['hoursPerDay']       ?? 0,
          totalHoursPerWeek: innerDataRef.current['totalHoursPerWeek'] ?? 0,

          // Caractéristiques boue
          sludgeType:       innerDataRef.current['sludgeType']       ?? '',
          MS_pourcent:      innerDataRef.current['MS_pourcent']      ?? 0,
          MV_pourcent:      innerDataRef.current['MV_pourcent']      ?? 0,
          MS_kg_h:          innerDataRef.current['MS_kg_h']          ?? 0,
          BoueBrute_kg_h:   innerDataRef.current['BoueBrute_kg_h']   ?? 0,
          MV_kg_h:          innerDataRef.current['MV_kg_h']          ?? 0,
          EauExtraite_kg_h: innerDataRef.current['EauExtraite_kg_h'] ?? 0,
          MM_kg_h:          innerDataRef.current['MM_kg_h']          ?? 0,

          // CHONS (% de MV)
          C_percent:  innerDataRef.current['C_percent']  ?? 0,
          H_percent:  innerDataRef.current['H_percent']  ?? 0,
          O_percent:  innerDataRef.current['O_percent']  ?? 0,
          N_percent:  innerDataRef.current['N_percent']  ?? 0,
          S_percent:  innerDataRef.current['S_percent']  ?? 0,
          Cl_percent: innerDataRef.current['Cl_percent'] ?? 0,

          // PCI / PCS
          pciKJkgMV:   innerDataRef.current['pciKJkgMV']   ?? 0,
          PCIKCALKGMV: innerDataRef.current['PCIKCALKGMV'] ?? 0,
          pciKcalkg:   innerDataRef.current['pciKcalkg']   ?? 0,
          pcsKcalkgMV: innerDataRef.current['pcsKcalkgMV'] ?? 0,
          pcsKcalkg:   innerDataRef.current['pcsKcalkg']   ?? 0,
          pciDulong:   innerDataRef.current['pciDulong']   ?? 0,

          // Métaux lourds (mg/kg MS)
          heavyMetalsData: innerDataRef.current['heavyMetalsData'] || {},

          // Masses métalliques [kg/h]
          Al_kg_h:    innerDataRef.current['Al_kg_h']    ?? 0,
          As_kg_h:    innerDataRef.current['As_kg_h']    ?? 0,
          Cd_kg_h:    innerDataRef.current['Cd_kg_h']    ?? 0,
          Cr_kg_h:    innerDataRef.current['Cr_kg_h']    ?? 0,
          Cu_kg_h:    innerDataRef.current['Cu_kg_h']    ?? 0,
          Fe_kg_h:    innerDataRef.current['Fe_kg_h']    ?? 0,
          Hg_kg_h:    innerDataRef.current['Hg_kg_h']    ?? 0,
          Ni_kg_h:    innerDataRef.current['Ni_kg_h']    ?? 0,
          Pb_kg_h:    innerDataRef.current['Pb_kg_h']    ?? 0,
          Zn_kg_h:    innerDataRef.current['Zn_kg_h']    ?? 0,
          PCDDF_kg_h: innerDataRef.current['PCDDF_kg_h'] ?? 0,
          Ti_kg_h:    innerDataRef.current['Ti_kg_h']    ?? 0,
          HF_kg_h:    innerDataRef.current['HF_kg_h']    ?? 0,

          // === AIR DE COMBUSTION ===
          Masse_air_sec_combustion_tot_kg_h:    innerDataRef.current['Masse_air_sec_combustion_tot_kg_h']    ?? 0,
          Q_air_comb_tot_Nm3_h:                 innerDataRef.current['Q_air_comb_tot_Nm3_h']                 ?? 0,
          Volume_air_balayage:                  innerDataRef.current['Volume_air_balayage']                  ?? 0,
          Volume_air_combustible_total_Nm3_h:   innerDataRef.current['Volume_air_combustible_total_Nm3_h']   ?? 0,
          Temp_air_fluidisation_av_prechauffe_C: innerDataRef.current['Temp_air_fluidisation_av_prechauffe_C'] ?? 0,
          Meau_air_comburant:                   innerDataRef.current['Meau_air_comburant']                   ?? 0,

          // === PARAMÈTRES COMBUSTION ===
          Exces_air:                innerDataRef.current['Exces_air']                ?? 0,
          Exces_air_lit:            innerDataRef.current['Exces_air_lit']            ?? 0,
          Exces_air_combustible:    innerDataRef.current['Exces_air_combustible']    ?? 0,
          Q_gaz_kg_h:               innerDataRef.current['Q_gaz_kg_h']              ?? 0,
          Q_gaz_Nm3_h:              innerDataRef.current['Q_gaz_Nm3_h']             ?? 0,

          // === FUMÉES VOÛTE ===
          FG_wet_Nm3_h:             innerDataRef.current['FG_wet_Nm3_h']            ?? 0,
          FG_dry_Nm3_h:             innerDataRef.current['FG_dry_Nm3_h']            ?? 0,
          Rho_FG_kg_Nm3:            innerDataRef.current['Rho_FG_kg_Nm3']           ?? 0,
          Temp_fumee_voute_C:       innerDataRef.current['Temp_fumee_voute_C']      ?? 0,
          m_co:                     innerDataRef.current['m_co']                    ?? 0,
          m_co2:                    innerDataRef.current['m_co2']                   ?? 0,
          m_h2o:                    innerDataRef.current['m_h2o']                   ?? 0,
          m_n2:                     innerDataRef.current['m_n2']                    ?? 0,
          m_o2:                     innerDataRef.current['m_o2']                    ?? 0,
          m_so2:                    innerDataRef.current['m_so2']                   ?? 0,
          m_chcl:                   innerDataRef.current['m_chcl']                  ?? 0,

          // === PARAMÈTRES THERMIQUES ===
          Hf_voute_kW:              innerDataRef.current['Hf_voute_kW']             ?? 0,

          // === BILAN ÉNERGÉTIQUE ===
          H_in_kW:                  innerDataRef.current['H_in_kW']                 ?? 0,
          H_out_kW:                 innerDataRef.current['H_out_kW']                ?? 0,
          H_pertes_kW:              innerDataRef.current['H_pertes_kW']             ?? 0,
          H_imbrule_kW:             innerDataRef.current['H_imbrule_kW']            ?? 0,
          H_air_balayage_kW:        innerDataRef.current['H_air_balayage_kW']       ?? 0,
          H_air_fluidisation_av_prechauffe_kW: innerDataRef.current['H_air_fluidisation_av_prechauffe_kW'] ?? 0,
          H_air_secondaire_kW:     innerDataRef.current['H_air_secondaire_kW']      ?? 0,
          H_air_tertiaire_kW:      innerDataRef.current['H_air_tertiaire_kW']       ?? 0,
          H_NETTE_BOUE_kW:          innerDataRef.current['H_NETTE_BOUE_kW']         ?? 0,
          H_matiere_minerale_kW:    innerDataRef.current['H_matiere_minerale_kW']   ?? 0,
          H_gaz_inter:              innerDataRef.current['H_gaz_inter']             ?? 0,
          H_gaz_residuel:           innerDataRef.current['H_gaz_residuel']          ?? 0,
        },
      };

      onSendData(dataToSend);
    } catch (error) {
      console.error('❌ Error sending data:', error);
      alert('Erreur lors de l\'envoi des données : ' + error.message);
    }
  }, [onSendData]);

  const handleBackToFlow = useCallback(() => {
    sendAllData();
    if (onGoBack && typeof onGoBack === 'function') {
      onGoBack(null);
    }
  }, [sendAllData, onGoBack]);

  // ============================================================
  // HANDLERS — CLEAR & SAVE
  // ============================================================

  const clearForm = useCallback(() => {
    // Réinitialiser les refs et state
    innerDataRef.current = {};
    setCombustionResults({});

    // Supprimer les données du localStorage
    const suffix = nodeId ? `_${nodeId}` : '';
    const keys = [
      `bouesTab_fonctionnement_GF${suffix}`,
      `bouesTab_boue_GF${suffix}`,
      `bouesTab_chons_GF${suffix}`,
      `bouesTab_heavyMetals_GF${suffix}`,
      `emissions_GF${suffix}`,
      `Temperatures_imposees${suffix}`,
      `thermalParams_GF${suffix}`,
      `airComposition_GF${suffix}`,
      `emissions2_GF${suffix}`,
      `opexDashboard_GF${suffix}`,
    ];
    keys.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch (e) {
        console.warn(`Failed to remove localStorage key: ${k}`, e);
      }
    });

    // Recharger la page
    window.location.reload();
  }, []);

  const saveData = useCallback(() => {
    const d = innerDataRef.current;

    // Créer un résumé de ce qui a été enregistré
    const summary = [
      'DONNÉES ENREGISTRÉES AVEC SUCCÈS',
      '',
      '📅 FONCTIONNEMENT',
      `• ${d.daysPerWeek ?? 0} jours/semaine × ${d.hoursPerDay ?? 0} h/jour`,
      `• Total: ${d.totalHoursPerWeek ?? 0} heures/semaine`,
      '',
      '🧪 CARACTÉRISTIQUES DES BOUES',
      `• Type: ${d.sludgeType ?? ''}`,
      `• Siccité: ${d.MS_pourcent ?? 0}%`,
      `• Quantité: ${d.MS_kg_h ?? 0} kg MS/h`,
      `• Matière volatile: ${d.MV_kg_h ?? 0} kg/h`,
      `• Matière brute: ${d.MasseBoueBrute ?? 0} kg/h`,
      '',
      '🔥 COMBUSTION',
      `• PCI boue: ${d.PCIKCALKGMV ?? 0} kCal/kg MV`,
      `• Excès d\'air: ${d.Exces_air ?? 0}%`,
      `• Temp. fumée voûte: ${d.Temp_fumee_voute_C ?? 0} °C`,
      '',
      '💨 FUMÉES',
      `• Débit humide: ${d.FG_OUT_Nm3_h?.wet ?? 0} Nm³/h`,
      `• Débit sec: ${d.FG_OUT_Nm3_h?.dry ?? 0} Nm³/h`,
      `• O₂ calculé: ${fmt((d.O2_calcule ?? 0) * 100)}%`,
    ].join('\n');

    // Afficher l'alerte
    alert(summary);

  }, []);

  const isSaveBtnDisabled = () => {
    const d = innerDataRef.current;
    return !d.daysPerWeek || !d.hoursPerDay || !d.sludgeType || !d.MS_pourcent || !d.MS_kg_h;
  };

  // ============================================================
  // HANDLERS — DATA FLOW
  // ============================================================

  // ============================================================
  // RENDER TAB CONTENT
  // ============================================================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'boues':
        return (
          <BouesTab
            innerData={innerDataRef.current}
            currentLanguage={currentLanguage}
            nodeId={nodeId}
          />
        );

      case 'combustion':
        return (
          <CombustionTab
            innerData={innerDataRef.current}
            onInnerDataChange={notifyInnerDataChanged}
            onResultsChange={setCombustionResults}
            currentLanguage={currentLanguage}
            nodeId={nodeId}
          />
        );

      case 'pollutant':
        return (
          <Pollutant
            innerData={innerDataRef.current}
            setInnerData={(updater) => {
              const newVal = typeof updater === 'function' ? updater(innerDataRef.current) : updater;
              Object.assign(innerDataRef.current, newVal);
              notifyInnerDataChanged();
            }}
            onInnerDataChange={notifyInnerDataChanged}
            currentLanguage={currentLanguage}
            nodeId={nodeId}
          />
        );

      case 'voute':
        return (
          <DimensionnementTab
            innerData={innerDataRef.current}
            innerDataTick={innerDataTick}
            currentLanguage={currentLanguage}
            nodeId={nodeId}
          />
        );

      case 'opex':
        return (
          <GFopex
            innerData={innerDataRef.current}
            innerDataTick={innerDataTick}
            setInnerData={(updater) => {
              const newVal = typeof updater === 'function' ? updater(innerDataRef.current) : updater;
              Object.assign(innerDataRef.current, newVal);
              notifyInnerDataChanged();
            }}
            currentLanguage={currentLanguage}
            nodeId={nodeId}
          />
        );

      case 'rapport':
        return (
          <GF_Report
            innerData={innerDataRef.current}
            currentLanguage={currentLanguage}
            nodeId={nodeId}
          />
        );

      default:
        return null;
    }
  };

  // ============================================================
  // STYLES
  // ============================================================

  const tabButtonStyle = (isActive) => ({
    padding: '10px 20px',
    background: isActive ? '#4a90e2' : 'white',
    color: isActive ? 'white' : '#333',
    border: 'none',
    borderBottom: isActive ? '2px solid #4a90e2' : '2px solid transparent',
    cursor: 'pointer',
    fontWeight: isActive ? 'bold' : 'normal',
    flex: 1,
    minWidth: '200px',
    fontSize: '14px',
    transition: 'all 0.3s ease',
  });

  const actionButtonStyle = (color) => ({
    padding: '8px 16px',
    background: color,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  });

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="container" style={{ padding: '0' }}>
      {/* ════════════════════════════════════════ HEADER ════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '20px',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px', color: '#1a202c' }}>
          {t('Caractéristiques de Fonctionnement') || 'Caractéristiques de Fonctionnement'} - Four à grille
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={clearForm}
            style={actionButtonStyle('#ef4444')}
            title={t('Réinitialiser et recharger l\'application') || 'Réinitialiser et recharger l\'application'}
          >
            {t('Effacer') || 'Effacer'}
          </button>
          <button
            onClick={saveData}
            disabled={isSaveBtnDisabled()}
            style={{
              ...actionButtonStyle(isSaveBtnDisabled() ? '#cccccc' : '#28a745'),
              cursor: isSaveBtnDisabled() ? 'not-allowed' : 'pointer',
              opacity: isSaveBtnDisabled() ? 0.6 : 1,
            }}
            title={
              isSaveBtnDisabled()
                ? t('Complétez les données OM obligatoires') || 'Complétez les données OM obligatoires'
                : t('Enregistrer les données') || 'Enregistrer les données'
            }
          >
            {t('Enregistrer') || 'Enregistrer'}
          </button>

          <button
            onClick={handleBackToFlow}
            style={actionButtonStyle('#4a90e2')}
            title={t('Envoyer les données et retourner au flow') || 'Envoyer les données et retourner au flow'}
          >
            {t('Retour au flow') || 'Retour au flow'}
          </button>
          <button
            onClick={sendAllData}
            style={actionButtonStyle('#10b981')}
            title={t('Envoyer les données au nœud suivant') || 'Envoyer les données au nœud suivant'}
          >
            {t('Envoyer données') || 'Envoyer données'}
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════ DIVIDER ════════════════════════════════════════ */}
      <div className="underline" style={{ height: '2px', backgroundColor: '#e5e7eb', margin: '0 20px 20px 20px' }} />

      {/* ════════════════════════════════════════ TABS ════════════════════════════════════════ */}
      <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: '20px', padding: '0 20px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            style={tabButtonStyle(activeTab === tab.name)}
            title={`${t('Aller à l\'onglet') || 'Aller à l\'onglet'}: ${tab.label}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Composant de calcul OPEX — invisible, toujours monté */}
      <GFCalcOpex
        innerData={innerDataRef.current}
        innerDataTick={innerDataTick}
        setInnerData={setInnerDataForCalcOpex}
        nodeId={nodeId}
      />

      {/* ════════════════════════════════════════ CONTENT ════════════════════════════════════════ */}
      <div
        style={{
          padding: '20px',
          background: '#f9f9f9',
          borderRadius: '8px',
          minHeight: '500px',
          margin: '0 20px 20px 20px',
        }}
      >
        {renderTabContent()}
      </div>

      {/* ════════════════════════════════════════ FOOTER ════════════════════════════════════════ */}
      <div
        style={{
          padding: '20px',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '12px',
          borderTop: '1px solid #e5e7eb',
        }}
      >
      </div>
    </div>
  );
};

export default GFMainPage;