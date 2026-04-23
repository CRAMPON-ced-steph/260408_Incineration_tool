export const mole_C = 12;
export const mole_H = 2;
export const mole_O = 16/2;
export const mole_N = 14/2;
export const mole_S = 32;
export const mole_Cl = 35.45;

export const O2_masse_volume = (21 * 32/22.4)/(21 * 32/22.4 + 79*28/22.4);
export const rho_air = 0.21*32/22.4+0.79*28/22.4;

export const molarMasses = {
  C:12.01,
  H: 1.008,
  O: 16.00,
  N: 14.007,
  S: 32.066,
  Cl: 35.45,
  CO : 28.01,
  HCl: 36.46,
  HF: 20.01,
  //Cl: 35.45,
  //S: 32.07,
  SO2: 64.07,
  N2: 28.014,
  NOx: 30.01, // Supposons que NOx est principalement NO2
  CO2: 44.01,
  NH3: 17.03,
  DustFlyAsh: 1, // Supposons une masse molaire de 1 kg/mol pour les poussières
  Mercury: 200.59,
  PCDDF: 1, // Supposons une masse molaire de 1 kg/mol pour PCDDF
  Cd_Ti: 1, // Supposons une masse molaire moyenne de 1 kg/mol
  Sb_As_Pb_Cr_Co_Cu_Mn_Ni_V: 1 ,// Supposons une masse molaire moyenne de 1 kg/mol
  CaCO3: 100,
  Ca_OH_2: 74, // Ca(OH)2
  NaOH: 40,
  NaHCO3: 84,
  CaO: 56,
  O2: 32,
  H2O: 18.015,
  // S
  CaSO3: 120,
  CaSO3_H2O: 138, // (CaSO3,H2O)
  CaSO3_2H2O: 156,
  CaSO3_6H2O: 228,
  Na2SO3: 126,
  Na2SO3_2H2O: 162,
  Na2SO3_H2O: 144,
  CaSO4: 136,
  CaSO4_2H2O: 172,
  CaSO4_3H2O: 190,
  Na2SO4: 142,
  H2SO3: 82,
  // Cl
  CaCl2: 111,
  NaCl: 58.5,
  // HF
  CaF2: 78,
  NaF: 42,
  // Add product
  Na2CO3: 106};


  export const massVolumique = {
    SO2: 2.8601,
    CO2: 1.9647,
    CO: 1.2504,
    H2O: 0.804,
    H2: 0.09,
    O2: 1.4286,
    NOX: 1.3396,
    N2: 1.2507,
    HCl: 1.6279,};


