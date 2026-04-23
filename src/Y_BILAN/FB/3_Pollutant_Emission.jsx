import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PollutantCalculator from '../../C_Components/Tableau_polluants';
import FGT from '../../C_Components/Traitement_fumées';
import { R_1, R_2, R_3 } from '../../A_Transverse_fonction/FGT_fct';

import SCC_NOxAndMercuryCalculator from '../../C_Components/Traitement_fumées_SCC';
import TableGeneric from '../../C_Components/Tableau_generique';
import { getOpexData } from '../../A_Transverse_fonction/opexDataService';

import PrintButton from '../../C_Components/Windows_print';
import Input_bilan from '../../C_Components/MiseEnFormeInputParamBilan';

import { getTranslatedParameter, getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './FB_traduction';

// ✅ Hook personnalisé pour traductions dynamiques
const useTranslation = (currentLanguage = 'fr') => {
  return useMemo(() => {
    const languageCode = getLanguageCode(currentLanguage);
    return (key) => translations[languageCode]?.[key] || translations['fr']?.[key] || key;
  }, [currentLanguage]);
};

const FBPollutantEmission = ({ innerData, currentLanguage = 'fr' }) => {
  // ✅ Utiliser le hook pour traductions dynamiques
  const t = useTranslation(currentLanguage);
  // ✅ CORRECTION : Ajouter languageCode ici
  const languageCode = getLanguageCode(currentLanguage);

  // ✅ CORRECTION : Initialisation sécurisée avec valeurs par défaut robustes
  const [emissions2, setEmissions2] = useState(() => {
    const savedEmissions = localStorage.getItem('emissions2');
    if (savedEmissions) {
      try {
        return JSON.parse(savedEmissions);
      } catch (e) {
        console.warn('Erreur parsing emissions2:', e);
      }
    }

    // Initialisation par défaut
    return {
      mercuryTreatmentThreshold: 9,
      pcddf: 500,
      hfPercent: 1,
      cdTi: 0.05,
      heavyMetals: 0.5,
      flyAshesContent: 2.3,
      siccityBottomAsh: 66,
      o2Ref: 11,
      sncrtEnabled: false,
      noxLimit: 150,
      stoichiometry: 1.2,
      hgTreatmentEnabled: false,
      brHgRatio: 400,
      soxReactif: 'None',
      hclReactif: 'None',
      hfReactif: 'None',
      efficaciteSox: 40,
      hclEfficacite: 40,
      hfEfficacite: 40,
      soxStoechiometrie: 1.2,
      hclStoechiometrie: 1.2,
      hfStoechiometrie: 1.2,
    };
  });

  const {
    availability,
    ratioElec,
    purchaseElectricityPrice,
    selectedCountryCode,
    currency,
    truck15TCO2,
    truck15TPrice,
    truck20TCO2,
    truck20TPrice,
    truck25TCO2,
    truck25TPrice,
    airPressure,
    compressorType,
    powerRatio,
    airConsumptionPrice,
    sellingElectricityPrice,
    gasTypes,
    steamPrices,
    waterPrices,
    reagentsTypes,
    byproducts,
  } = getOpexData();

  useEffect(() => {
    localStorage.setItem('emissions2', JSON.stringify(emissions2));
  }, [emissions2]);

  // ✅ CORRECTION : Extraction robuste avec vérification de l'existence
  const Hg_microg_m3 = emissions2.mercuryTreatmentThreshold ?? 9;
  const HF_pourcent = emissions2.hfPercent ?? 1;
  const PCDDF_microg_Nm3 = emissions2.pcddf ?? 500;
  const CdTi_g_Nm3 = emissions2.cdTi ?? 0.05;
  const SdAsPbCrCoCuMnNi_mg_Nm3 = emissions2.heavyMetals ?? 0.5;
  const FlyAsh_g_Nm3 = emissions2.flyAshesContent ?? 2.3;
  const Bottom_Ash_Siccity = emissions2.siccityBottomAsh ?? 66;
  const O2ref = emissions2.o2Ref ?? 11;

  const SNCR_enabled = emissions2.sncrtEnabled ?? false;
  const NOx_limit_mg_Nm3 = emissions2.noxLimit ?? 150;
  const Stoichiometry = emissions2.stoichiometry ?? 1.2;

  const Hg_treatment_enabled = emissions2.hgTreatmentEnabled ?? false;
  const Br_Hg_ratio = emissions2.brHgRatio ?? 400;

  const SOx_reactif = emissions2.soxReactif ?? 'None';
  const HCl_reactif = emissions2.hclReactif ?? 'None';
  const HF_reactif = emissions2.hfReactif ?? 'None';

  const efficacite_SOx = emissions2.efficaciteSox ?? 40;
  const HCl_efficacité = emissions2.hclEfficacite ?? 40;
  const HF_efficacité = emissions2.hfEfficacite ?? 40;

  const SOx_stoechiométrie = emissions2.soxStoechiometrie ?? 1.2;
  const HCl_stoechiométrie = emissions2.hclStoechiometrie ?? 1.2;
  const HF_stoechiométrie = emissions2.hfStoechiometrie ?? 1.2;

  // ✅ CORRECTION : Extraction robuste des données depuis innerData
  const Debit_fumees_sec_Nm3_h = innerData?.FG_OUT_Nm3_h?.dry ?? 10000;
  const Debit_fumees_humide_Nm3_h = innerData?.FG_OUT_Nm3_h?.wet ?? 10000;
  const FG_O2_calcule = innerData?.O2_calcule ?? 12;
  const masse_dechets = innerData?.MasseBoueBrute ?? 0;
  const Inert_kg_h = innerData?.Inert_kg_h ?? 0;

  // Calculs des masses de polluants d'entrée
  const Masse_polluant_HCl_kg_h = innerData?.FG_pollutant_OUT_kg_h?.HCl ?? 0;
  const Masse_polluant_Cl_kg_h = (Masse_polluant_HCl_kg_h * 35.45) / 36.46;

  const Masse_polluant_SO2_kg_h = innerData?.FG_pollutant_OUT_kg_h?.SO2 ?? 0;
  const Masse_polluant_S_kg_h = (Masse_polluant_SO2_kg_h * 32) / 64;

  const Masse_polluant_HF_kg_h = innerData?.masse_pollutant_metallique_kg_h?.HF_kg_h ?? 0;

  const Masse_polluant_NOx_kg_h = innerData?.FG_pollutant_OUT_kg_h?.NOx ?? 0;
  const Masse_polluant_Dust_FlyAshes_kg_h = (FlyAsh_g_Nm3 * Debit_fumees_sec_Nm3_h) / 1000;

  const Masse_polluant_Hg_kg_h = innerData?.masse_pollutant_metallique_kg_h?.Hg_kg_h ?? 0;

  const Masse_polluant_PCDDF_kg_h = innerData?.masse_pollutant_metallique_kg_h?.PCDDF_kg_h ?? 0;

  const Masse_polluant_CdTi_kg_h =
    (innerData?.masse_pollutant_metallique_kg_h?.Cd_kg_h ?? 0) +
    (innerData?.masse_pollutant_metallique_kg_h?.Ti_kg_h ?? 0);

  const Masse_polluant_SdAsPbCrCoCuMnNi_kg_h =
    (innerData?.masse_pollutant_metallique_kg_h?.Al_kg_h ?? 0) +
    (innerData?.masse_pollutant_metallique_kg_h?.As_kg_h ?? 0) +
    (innerData?.masse_pollutant_metallique_kg_h?.Pb_kg_h ?? 0) +
    (innerData?.masse_pollutant_metallique_kg_h?.Cr_kg_h ?? 0) +
    (innerData?.masse_pollutant_metallique_kg_h?.Cu_kg_h ?? 0) +
    (innerData?.masse_pollutant_metallique_kg_h?.Ni_kg_h ?? 0) +
    (innerData?.masse_pollutant_metallique_kg_h?.Fe_kg_h ?? 0) +
    (innerData?.masse_pollutant_metallique_kg_h?.Zn_kg_h ?? 0);

  // Calcul de la consommation d'ammoniaque
  const calculateAmmoniaConsumption = useCallback(() => {
    if (!SNCR_enabled) return 0;
    const NOx_to_reduce = Math.max(0, Masse_polluant_NOx_kg_h - NOx_limit_mg_Nm3);
    const NOx_mass_to_reduce = NOx_to_reduce * (17 / 30) * Stoichiometry;
    return NOx_mass_to_reduce;
  }, [SNCR_enabled, Masse_polluant_NOx_kg_h, NOx_limit_mg_Nm3, Stoichiometry]);

  // Calcul du traitement du mercure
  const calculateHgTreatment = useCallback(() => {
    if (!Hg_treatment_enabled) return { hg_mass: 0, bromide_consumption: 0 };
    const hg_mass = Masse_polluant_Hg_kg_h;
    const bromide_consumption = hg_mass * Br_Hg_ratio * (120 / 200.59);
    return { hg_mass, bromide_consumption };
  }, [Hg_treatment_enabled, Masse_polluant_Hg_kg_h, Br_Hg_ratio]);

  const NH3_consumption_kg_h = calculateAmmoniaConsumption();
  const hg_treatment = calculateHgTreatment();
  const NOx_to_reduce = SNCR_enabled ? Math.max(0, Masse_polluant_NOx_kg_h - NOx_limit_mg_Nm3) : 0;
  const NOx_mass_to_reduce = NOx_to_reduce * (17 / 30) * Stoichiometry;

  // Masses de polluants d'entrée
  const masses_pollutant_input = {
    HCl: Masse_polluant_HCl_kg_h,
    HF: Masse_polluant_HF_kg_h,
    Cl: Masse_polluant_Cl_kg_h,
    S: Masse_polluant_S_kg_h,
    SO2: Masse_polluant_SO2_kg_h,
    N2: innerData?.FG_OUT_kg_h?.N2 ?? 1,
    NOx: innerData?.FG_pollutant_OUT_kg_h?.NOx ?? 0,
    CO2: innerData?.FG_OUT_kg_h?.CO2 ?? 1,
    NH3: SNCR_enabled ? NH3_consumption_kg_h : 0,
    DustFlyAsh: Masse_polluant_Dust_FlyAshes_kg_h,
    Mercury: Masse_polluant_Hg_kg_h,
    PCDDF: Masse_polluant_PCDDF_kg_h,
    Cd_Ti: Masse_polluant_CdTi_kg_h,
    Sb_As_Pb_Cr_Co_Cu_Mn_Ni_V: Masse_polluant_SdAsPbCrCoCuMnNi_kg_h,
  };

  // Calculs de traitement des polluants
  let R1_SOx = 1,
    R1_HCl = 1,
    R1_HF = 1;
  let R2_SOx = 1,
    R2_HCl = 1,
    R2_HF = 1;
  let R3_SOx = 1,
    R3_HCl = 1,
    R3_HF = 1;

  const HCl = 'HCl';
  const SOx = 'SOx';
  const HF = 'HF';

  if (SOx_reactif !== 'None') {
    try {
      R1_SOx = R_1(SOx, SOx_reactif) || 1;
      R2_SOx = R_2(SOx, SOx_reactif) || 1;
      R3_SOx = R_3(SOx, SOx_reactif) || 1;
    } catch (error) {
      console.warn('Erreur calcul R_SOx:', error);
    }
  }

  if (HCl_reactif !== 'None') {
    try {
      R1_HCl = R_1(HCl, HCl_reactif) || 1;
      R2_HCl = R_2(HCl, HCl_reactif) || 1;
      R3_HCl = R_3(HCl, HCl_reactif) || 1;
    } catch (error) {
      console.warn('Erreur calcul R_HCl:', error);
    }
  }

  if (HF_reactif !== 'None') {
    try {
      R1_HF = R_1(HF, HF_reactif) || 1;
      R2_HF = R_2(HF, HF_reactif) || 1;
      R3_HF = R_3(HF, HF_reactif) || 1;
    } catch (error) {
      console.warn('Erreur calcul R_HF:', error);
    }
  }

  const mass_reduction_SOx = SOx_reactif !== 'None' ? (masses_pollutant_input.SO2 * efficacite_SOx) / 100 : 0;
  const mass_reduction_HCl = HCl_reactif !== 'None' ? (masses_pollutant_input.HCl * HCl_efficacité) / 100 : 0;
  const mass_reduction_HF = HF_reactif !== 'None' ? (masses_pollutant_input.HF * HF_efficacité) / 100 : 0;

  const mass_reactif_st_SOx = SOx_reactif !== 'None' ? mass_reduction_SOx * R1_SOx : 0;
  const mass_reactif_st_HCl = HCl_reactif !== 'None' ? mass_reduction_HCl * R1_HCl : 0;
  const mass_reactif_st_HF = HF_reactif !== 'None' ? mass_reduction_HF * R1_HF : 0;

  const mass_reactif_reel_SOx = SOx_reactif !== 'None' ? mass_reactif_st_SOx * SOx_stoechiométrie : 0;
  const mass_reactif_reel_HCl = HCl_reactif !== 'None' ? mass_reactif_st_HCl * HCl_stoechiométrie : 0;
  const mass_reactif_reel_HF = HF_reactif !== 'None' ? mass_reactif_st_HF * HF_stoechiométrie : 0;

  const mass_residus_SOx =
    SOx_reactif !== 'None' ? R2_SOx * (mass_reactif_reel_SOx - mass_reactif_st_SOx) + R3_SOx * mass_reduction_SOx : 0;
  const mass_residus_HCl =
    HCl_reactif !== 'None' ? R2_HCl * (mass_reactif_reel_HCl - mass_reactif_st_HCl) + R3_HCl * mass_reduction_HCl : 0;
  const mass_residus_HF =
    HF_reactif !== 'None' ? R2_HF * (mass_reactif_reel_HF - mass_reactif_st_HF) + R3_HF * mass_reduction_HF : 0;

  const mass_residus_tot = mass_residus_SOx + mass_residus_HCl + mass_residus_HF;

  // Masses de polluants de sortie
  const masses_pollutant_output = {
    HCl: masses_pollutant_input.HCl - mass_reduction_HCl,
    HF: masses_pollutant_input.HF - mass_reduction_HF,
    SO2: masses_pollutant_input.SO2 - mass_reduction_SOx,
    N2: masses_pollutant_input.N2,
    NOx: masses_pollutant_input.NOx - NOx_mass_to_reduce,
    CO2: masses_pollutant_input.CO2,
    NH3: masses_pollutant_input.NH3,
    DustFlyAsh: masses_pollutant_input.DustFlyAsh,
    Mercury: Hg_treatment_enabled ? 0 : masses_pollutant_input.Mercury,
    PCDDF: masses_pollutant_input.PCDDF,
    Cd_Ti: masses_pollutant_input.Cd_Ti,
    Sb_As_Pb_Cr_Co_Cu_Mn_Ni_V: masses_pollutant_input.Sb_As_Pb_Cr_Co_Cu_Mn_Ni_V,
  };

  masses_pollutant_output.Cl = (masses_pollutant_output.HCl * 35) / 36.5;
  masses_pollutant_output.S = masses_pollutant_output.SO2 / 2;

  // Calculs des cendres
  let DryBottomAsh_kg_h = 0;
  let FlyAsh_kg_h = 0;
  let WetBottomAsh_kg_h = 0;

  if (Inert_kg_h !== 0) {
    FlyAsh_kg_h = (FlyAsh_g_Nm3 * Debit_fumees_sec_Nm3_h) / 1000;
    DryBottomAsh_kg_h = Inert_kg_h - FlyAsh_kg_h + mass_residus_tot;
    WetBottomAsh_kg_h = DryBottomAsh_kg_h / (Bottom_Ash_Siccity / 100);

    if (FlyAsh_kg_h < 0) FlyAsh_kg_h = 0;
    if (DryBottomAsh_kg_h < 0) DryBottomAsh_kg_h = 0;
    if (WetBottomAsh_kg_h < 0) WetBottomAsh_kg_h = 0;
  }

  // Calcul des consommations totales par réactif
  let conso_CaCO3_SOx = 0,
    conso_CaO_SOx = 0,
    conso_CaOH2wet_SOx = 0;
  let conso_CaOH2dry_SOx = 0,
    conso_NaOH_SOx = 0,
    conso_NaOHCO3_SOx = 0;

  let conso_CaCO3_HCl = 0,
    conso_CaO_HCl = 0,
    conso_CaOH2wet_HCl = 0;
  let conso_CaOH2dry_HCl = 0,
    conso_NaOH_HCl = 0,
    conso_NaOHCO3_HCl = 0;

  let conso_CaCO3_HF = 0,
    conso_CaO_HF = 0,
    conso_CaOH2wet_HF = 0;
  let conso_CaOH2dry_HF = 0,
    conso_NaOH_HF = 0,
    conso_NaOHCO3_HF = 0;

  if (SOx_reactif === 'CaCO3') conso_CaCO3_SOx = mass_reactif_reel_SOx;
  if (SOx_reactif === 'CaO') conso_CaO_SOx = mass_reactif_reel_SOx;
  if (SOx_reactif === 'CaOH2wet') conso_CaOH2wet_SOx = mass_reactif_reel_SOx;
  if (SOx_reactif === 'CaOH2dry') conso_CaOH2dry_SOx = mass_reactif_reel_SOx;
  if (SOx_reactif === 'NaOH') conso_NaOH_SOx = mass_reactif_reel_SOx;
  if (SOx_reactif === 'NaOHCO3') conso_NaOHCO3_SOx = mass_reactif_reel_SOx;

  if (HCl_reactif === 'CaCO3') conso_CaCO3_HCl = mass_reactif_reel_HCl;
  if (HCl_reactif === 'CaO') conso_CaO_HCl = mass_reactif_reel_HCl;
  if (HCl_reactif === 'CaOH2wet') conso_CaOH2wet_HCl = mass_reactif_reel_HCl;
  if (HCl_reactif === 'CaOH2dry') conso_CaOH2dry_HCl = mass_reactif_reel_HCl;
  if (HCl_reactif === 'NaOH') conso_NaOH_HCl = mass_reactif_reel_HCl;
  if (HCl_reactif === 'NaOHCO3') conso_NaOHCO3_HCl = mass_reactif_reel_HCl;

  if (HF_reactif === 'CaCO3') conso_CaCO3_HF = mass_reactif_reel_HF;
  if (HF_reactif === 'CaO') conso_CaO_HF = mass_reactif_reel_HF;
  if (HF_reactif === 'CaOH2wet') conso_CaOH2wet_HF = mass_reactif_reel_HF;
  if (HF_reactif === 'CaOH2dry') conso_CaOH2dry_HF = mass_reactif_reel_HF;
  if (HF_reactif === 'NaOH') conso_NaOH_HF = mass_reactif_reel_HF;
  if (HF_reactif === 'NaOHCO3') conso_NaOHCO3_HF = mass_reactif_reel_HF;

  const Conso_CaCO3_kg = conso_CaCO3_SOx + conso_CaCO3_HCl + conso_CaCO3_HF;
  const Conso_CaO_kg = conso_CaO_SOx + conso_CaO_HCl + conso_CaO_HF;
  const Conso_CaOH2wet_kg = conso_CaOH2wet_SOx + conso_CaOH2wet_HCl + conso_CaOH2wet_HF;
  const Conso_CaOH2dry_kg = conso_CaOH2dry_SOx + conso_CaOH2dry_HCl + conso_CaOH2dry_HF;
  const Conso_NaOH_kg = conso_NaOH_SOx + conso_NaOH_HCl + conso_NaOH_HF;
  const Conso_NaOHCO3_kg = conso_NaOHCO3_SOx + conso_NaOHCO3_HCl + conso_NaOHCO3_HF;
  const Conso_Ammonia_kg = NH3_consumption_kg_h;
  const Conso_NaBrCaBr2_kg = hg_treatment.bromide_consumption;
  const Conso_CAP_kg = 1;

  const Cout_CaCO3 = reagentsTypes?.CaCO3 ? (Conso_CaCO3_kg / 1000) * reagentsTypes.CaCO3.cost : 0;
  const Cout_CaO = reagentsTypes?.CaO ? (Conso_CaO_kg / 1000) * reagentsTypes.CaO.cost : 0;
  const Cout_CaOH2wet = reagentsTypes?.CaOH2wet ? (Conso_CaOH2wet_kg / 1000) * reagentsTypes.CaOH2wet.cost : 0;
  const Cout_CaOH2dry = reagentsTypes?.CaOH2dry ? (Conso_CaOH2dry_kg / 1000) * reagentsTypes.CaOH2dry.cost : 0;
  const Cout_NaOH = reagentsTypes?.NaOH ? (Conso_NaOH_kg / 1000) * reagentsTypes.NaOH.cost : 0;
  const Cout_NaOHCO3 = reagentsTypes?.NaOHCO3 ? (Conso_NaOHCO3_kg / 1000) * reagentsTypes.NaOHCO3.cost : 0;
  const Cout_Ammonia = reagentsTypes?.Ammonia ? (Conso_Ammonia_kg / 1000) * reagentsTypes.Ammonia.cost : 0;
  const Cout_NaBrCaBr2 = reagentsTypes?.NaBr_CaBr2 ? (Conso_NaBrCaBr2_kg / 1000) * reagentsTypes.NaBr_CaBr2.cost : 0;
  const Cout_CAP = reagentsTypes?.CAP ? (Conso_CAP_kg / 1000) * reagentsTypes.CAP.cost : 0;

  const CO2_CaCO3 = reagentsTypes?.CaCO3 ? (Conso_CaCO3_kg / 1000) * reagentsTypes.CaCO3.co2PerTrip : 0;
  const CO2_CaO = reagentsTypes?.CaO ? (Conso_CaO_kg / 1000) * reagentsTypes.CaO.co2PerTrip : 0;
  const CO2_CaOH2wet = reagentsTypes?.CaOH2wet ? (Conso_CaOH2wet_kg / 1000) * reagentsTypes.CaOH2wet.co2PerTrip : 0;
  const CO2_CaOH2dry = reagentsTypes?.CaOH2dry ? (Conso_CaOH2dry_kg / 1000) * reagentsTypes.CaOH2dry.co2PerTrip : 0;
  const CO2_NaOH = reagentsTypes?.NaOH ? (Conso_NaOH_kg / 1000) * reagentsTypes.NaOH.co2PerTrip : 0;
  const CO2_NaOHCO3 = reagentsTypes?.NaOHCO3 ? (Conso_NaOHCO3_kg / 1000) * reagentsTypes.NaOHCO3.co2PerTrip : 0;
  const CO2_Ammonia = reagentsTypes?.Ammonia ? (Conso_Ammonia_kg / 1000) * reagentsTypes.Ammonia.co2PerTrip : 0;
  const CO2_NaBrCaBr2 =
    reagentsTypes?.NaBr_CaBr2 ? (Conso_NaBrCaBr2_kg / 1000) * reagentsTypes.NaBr_CaBr2.co2PerTrip : 0;
  const CO2_CAP = reagentsTypes?.CAP ? (Conso_CAP_kg / 1000) * reagentsTypes.CAP.co2PerTrip : 0;

  const cout_conso_reactifs =
    Cout_CaCO3 + Cout_CaO + Cout_CaOH2wet + Cout_CaOH2dry + Cout_NaOH + Cout_NaOHCO3 + Cout_Ammonia + Cout_NaBrCaBr2 + Cout_CAP;

  const CO2_total_reactifs =
    CO2_CaCO3 + CO2_CaO + CO2_CaOH2wet + CO2_CaOH2dry + CO2_NaOH + CO2_NaOHCO3 + CO2_Ammonia + CO2_NaBrCaBr2 + CO2_CAP;

  const Conso_Reactifs = {
    CaCO3: Conso_CaCO3_kg,
    CaO: Conso_CaO_kg,
    CaOH2wet: Conso_CaOH2wet_kg,
    CaOH2dry: Conso_CaOH2dry_kg,
    NaOH: Conso_NaOH_kg,
    NaOHCO3: Conso_NaOHCO3_kg,
    Ammonia: Conso_Ammonia_kg,
    NaBrCaBr2: Conso_NaBrCaBr2_kg,
    CAP: Conso_CAP_kg,
    cout: cout_conso_reactifs,
    CO2_transport: CO2_total_reactifs,
  };

  const Residus = {
    DryBottomAsh_kg_h,
    WetBottomAsh_kg_h,
    FlyAsh_kg_h,
  };

  const calculationParameters = {
    flyAshesContent: emissions2.flyAshesContent,
    o2Ref: emissions2.o2Ref,
    noxLimit: emissions2.noxLimit,
    brHgRatio: emissions2.brHgRatio,
  };

  const handleChange = useCallback((name, value) => {
    if (typeof value === 'number' && value < 0) {
      value = 0;
    }

    setEmissions2((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleReset = useCallback(() => {
    const defaultValues = {
      mercuryTreatmentThreshold: 9,
      noxIn: 296,
      pcddf: 500,
      hfPercent: 1,
      cdTi: 0.05,
      heavyMetals: 0.5,
      flyAshesContent: 2.3,
      siccityBottomAsh: 66,
      o2Ref: 11,
      sncrtEnabled: false,
      noxLimit: 150,
      stoichiometry: 1.2,
      hgTreatmentEnabled: false,
      brHgRatio: 400,
      soxReactif: 'None',
      hclReactif: 'None',
      hfReactif: 'None',
      efficaciteSox: 40,
      hclEfficacite: 40,
      hfEfficacite: 40,
      soxStoechiometrie: 1.2,
      hclStoechiometrie: 1.2,
      hfStoechiometrie: 1.2,
    };

    setEmissions2(defaultValues);
    try {
      localStorage.removeItem('emissions2');
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  }, []);

  const elementsGeneric = [
    { text: t('wasteFlow'), value: masse_dechets },
    { text: t('flueGasFlowWet'), value: Debit_fumees_humide_Nm3_h.toFixed(0) },
    { text: t('flueGasFlowDry'), value: Debit_fumees_sec_Nm3_h.toFixed(0) },
    { text: t('o2Calculated'), value: FG_O2_calcule.toFixed(2) },
  ];

  const residusCalculations = [
    { text: t('bottomAsh'), value: DryBottomAsh_kg_h },
    { text: t('bottomAshWet'), value: WetBottomAsh_kg_h },
    { text: t('flyAsh'), value: FlyAsh_kg_h },
  ];

  // Mise à jour de innerData
  if (innerData) {
    innerData['Residus'] = Residus;
    innerData['PInput'] = masses_pollutant_input;
    innerData['Poutput'] = masses_pollutant_output;
    innerData['REFIDIS'] = mass_residus_tot;
    innerData['Conso_reactifs'] = Conso_Reactifs;
  }

  return (
    <div className="cadre_pour_onglet">
      <h3>{t('calculationParameters') || 'Paramètres de calcul'}</h3>
      <div className="cadre_param_bilan">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span></span>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#ff5252')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#ff6b6b')}
          >
            {t('resetDefaultValues') || 'Réinitialiser'}
          </button>
        </div>
        <Input_bilan
          input={calculationParameters}
          handleChange={handleChange}
          currentLanguage={languageCode}
          translations={translations}
        />
      </div>

      <h3>{t('calculatedParameters') || 'Paramètres calculés'}</h3>
      <TableGeneric elements={elementsGeneric} />

      <h3>{t('flueGasComposition') || 'Composition des fumées'}</h3>
      <h4>{t('inputFlueGas') || 'Fumées d\'entrée'}</h4>
      <PollutantCalculator
        masses={masses_pollutant_input}
        O2_mesure={FG_O2_calcule}
        O2_ref={O2ref}
        Debit_fumees_sec_Nm3_h={Debit_fumees_sec_Nm3_h}
      />

      {/* Section SNCR */}
      <h4>{t('sncr') || 'SNCR'}</h4>
      <div className="cadre_param_bilan">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ marginBottom: '5px', fontSize: '12px' }}>
              {t('sncrtEnabled') || 'Activation SNCR'}:
            </label>
            <input
              type="checkbox"
              checked={SNCR_enabled}
              onChange={(e) => handleChange('sncrtEnabled', e.target.checked)}
            />
          </div>

          {SNCR_enabled && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ marginBottom: '5px', fontSize: '12px' }}>
                  {t('noxLimit') || 'Limite NOx'}:
                </label>
                <input
                  type="number"
                  value={NOx_limit_mg_Nm3}
                  onChange={(e) => handleChange('noxLimit', parseFloat(e.target.value) || 0)}
                  style={{ width: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ marginBottom: '5px', fontSize: '12px' }}>
                  {t('stoichiometry') || 'Stœchiométrie'}:
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={Stoichiometry}
                  onChange={(e) => handleChange('stoichiometry', parseFloat(e.target.value) || 1)}
                  style={{ width: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ marginBottom: '5px', fontSize: '12px' }}>
                  {t('nh3Consumption') || 'Consommation NH₃'}:
                </label>
                <input
                  type="text"
                  value={NH3_consumption_kg_h.toFixed(3)}
                  readOnly
                  style={{ width: '80px', backgroundColor: '#f0f0f0' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section traitement Hg */}
      <h4>{t('mercuryTreatment') || 'Traitement du mercure'}</h4>
      <div className="cadre_param_bilan">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <label style={{ marginBottom: '5px', fontSize: '12px' }}>
              {t('hgTreatmentEnabled') || 'Traitement Hg activé'}:
            </label>
            <input
              type="checkbox"
              checked={Hg_treatment_enabled}
              onChange={(e) => handleChange('hgTreatmentEnabled', e.target.checked)}
            />
          </div>

          {Hg_treatment_enabled && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ marginBottom: '5px', fontSize: '12px' }}>
                  {t('brHgRatio') || 'Ratio Br/Hg'}:
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={Br_Hg_ratio}
                  onChange={(e) => handleChange('brHgRatio', parseFloat(e.target.value) || 1)}
                  style={{ width: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ marginBottom: '5px', fontSize: '12px' }}>
                  {t('hgMass') || 'Masse Hg'}:
                </label>
                <input
                  type="text"
                  value={hg_treatment.hg_mass.toFixed(6)}
                  readOnly
                  style={{ width: '80px', backgroundColor: '#f0f0f0' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ marginBottom: '5px', fontSize: '12px' }}>
                  {t('bromideConsumption') || 'Consommation bromure'}:
                </label>
                <input
                  type="text"
                  value={hg_treatment.bromide_consumption.toFixed(6)}
                  readOnly
                  style={{ width: '80px', backgroundColor: '#f0f0f0' }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tableau de traitement des polluants */}
      <h4>{t('pollutantTreatmentTable') || 'Tableau de traitement des polluants'}</h4>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '10px',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {t('pollutant') || 'Polluant'}
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {t('reactif') || 'Réactif'}
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {t('massInput') || 'Masse entrée'}
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {t('efficiency') || 'Efficacité'}
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {t('stoechCoeff') || 'Coeff stoech'}
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {t('massOutput') || 'Masse sortie'}
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {t('massResidue') || 'Résidu'}
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {t('massReactif') || 'Masse réactif'}
              </th>
              <th style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {t('massReduced') || 'Masse réduite'}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>SOx</td>
              <td style={{ padding: '4px', textAlign: 'center', width: '11.11%' }}>
                <select
                  value={SOx_reactif}
                  onChange={(e) => handleChange('soxReactif', e.target.value)}
                  style={{ width: '100%', padding: '2px', fontSize: '10px' }}
                >
                  <option value="None">None</option>
                  <option value="CaCO3">CaCO3</option>
                  <option value="CaO">CaO</option>
                  <option value="CaOH2dry">CaOH2dry</option>
                  <option value="CaOH2wet">CaOH2wet</option>
                  <option value="CAP">CAP</option>
                </select>
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {SOx_reactif !== 'None' ? Masse_polluant_SO2_kg_h.toFixed(3) : ''}
              </td>
              <td style={{ padding: '4px', textAlign: 'center', width: '11.11%' }}>
                <input
                  type="number"
                  value={efficacite_SOx}
                  onChange={(e) => handleChange('efficaciteSox', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '2px', fontSize: '10px', textAlign: 'center' }}
                  min="0"
                  max="100"
                  disabled={SOx_reactif === 'None'}
                />
              </td>
              <td style={{ padding: '4px', textAlign: 'center', width: '11.11%' }}>
                <input
                  type="number"
                  step="0.1"
                  value={SOx_stoechiométrie}
                  onChange={(e) => handleChange('soxStoechiometrie', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '2px', fontSize: '10px', textAlign: 'center' }}
                  min="0"
                  disabled={SOx_reactif === 'None'}
                />
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {masses_pollutant_output.SO2.toFixed(3)}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {SOx_reactif !== 'None' ? mass_residus_SOx.toFixed(3) : '0.000'}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {SOx_reactif !== 'None' ? mass_reactif_reel_SOx.toFixed(3) : '0.000'}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {SOx_reactif !== 'None' ? mass_reduction_SOx.toFixed(3) : '0.000'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>HCl</td>
              <td style={{ padding: '4px', textAlign: 'center', width: '11.11%' }}>
                <select
                  value={HCl_reactif}
                  onChange={(e) => handleChange('hclReactif', e.target.value)}
                  style={{ width: '100%', padding: '2px', fontSize: '10px' }}
                >
                  <option value="None">None</option>
                  <option value="CaCO3">CaCO3</option>
                  <option value="CaO">CaO</option>
                  <option value="CaOH2dry">CaOH2dry</option>
                  <option value="CaOH2wet">CaOH2wet</option>
                  <option value="CAP">CAP</option>
                </select>
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {HCl_reactif !== 'None' ? Masse_polluant_HCl_kg_h.toFixed(3) : ''}
              </td>
              <td style={{ padding: '4px', textAlign: 'center', width: '11.11%' }}>
                <input
                  type="number"
                  value={HCl_efficacité}
                  onChange={(e) => handleChange('hclEfficacite', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '2px', fontSize: '10px', textAlign: 'center' }}
                  min="0"
                  max="100"
                  disabled={HCl_reactif === 'None'}
                />
              </td>
              <td style={{ padding: '4px', textAlign: 'center', width: '11.11%' }}>
                <input
                  type="number"
                  step="0.1"
                  value={HCl_stoechiométrie}
                  onChange={(e) => handleChange('hclStoechiometrie', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '2px', fontSize: '10px', textAlign: 'center' }}
                  min="0"
                  disabled={HCl_reactif === 'None'}
                />
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {masses_pollutant_output.HCl.toFixed(3)}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {HCl_reactif !== 'None' ? mass_residus_HCl.toFixed(3) : '0.000'}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {HCl_reactif !== 'None' ? mass_reactif_reel_HCl.toFixed(3) : '0.000'}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {HCl_reactif !== 'None' ? mass_reduction_HCl.toFixed(3) : '0.000'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>HF</td>
              <td style={{ padding: '4px', textAlign: 'center', width: '11.11%' }}>
                <select
                  value={HF_reactif}
                  onChange={(e) => handleChange('hfReactif', e.target.value)}
                  style={{ width: '100%', padding: '2px', fontSize: '10px' }}
                >
                  <option value="None">None</option>
                  <option value="CaCO3">CaCO3</option>
                  <option value="CaO">CaO</option>
                  <option value="CaOH2dry">CaOH2dry</option>
                  <option value="CaOH2wet">CaOH2wet</option>
                  <option value="CAP">CAP</option>
                </select>
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {HF_reactif !== 'None' ? Masse_polluant_HF_kg_h.toFixed(3) : ''}
              </td>
              <td style={{ padding: '4px', textAlign: 'center', width: '11.11%' }}>
                <input
                  type="number"
                  value={HF_efficacité}
                  onChange={(e) => handleChange('hfEfficacite', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '2px', fontSize: '10px', textAlign: 'center' }}
                  min="0"
                  max="100"
                  disabled={HF_reactif === 'None'}
                />
              </td>
              <td style={{ padding: '4px', textAlign: 'center', width: '11.11%' }}>
                <input
                  type="number"
                  step="0.1"
                  value={HF_stoechiométrie}
                  onChange={(e) => handleChange('hfStoechiometrie', parseFloat(e.target.value) || 0)}
                  style={{ width: '100%', padding: '2px', fontSize: '10px', textAlign: 'center' }}
                  min="0"
                  disabled={HF_reactif === 'None'}
                />
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {masses_pollutant_output.HF.toFixed(3)}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {HF_reactif !== 'None' ? mass_residus_HF.toFixed(3) : '0.000'}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {HF_reactif !== 'None' ? mass_reactif_reel_HF.toFixed(3) : '0.000'}
              </td>
              <td style={{ padding: '8px', textAlign: 'center', width: '11.11%' }}>
                {HF_reactif !== 'None' ? mass_reduction_HF.toFixed(3) : '0.000'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h4>{t('outputFlueGas') || 'Fumées de sortie'}</h4>
      <PollutantCalculator
        masses={masses_pollutant_output}
        O2_mesure={FG_O2_calcule}
        O2_ref={O2ref}
        Debit_fumees_sec_Nm3_h={Debit_fumees_sec_Nm3_h}
      />

      <h3>{t('bottomAshesCalculated') || 'Cendres de fond calculées'}</h3>
      <TableGeneric elements={residusCalculations} />
    </div>
  );
};

export default FBPollutantEmission;