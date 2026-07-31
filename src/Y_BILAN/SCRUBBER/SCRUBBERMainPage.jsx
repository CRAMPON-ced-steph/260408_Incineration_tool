import React, { useState } from 'react';
import SCRUBBERFlueGasParameters from './2_SCRUBBER_Flue_gas_ML';
import SCRUBBERFlueGasPollutantEmission from './3_SCRUBBER_Pollutant_Emission_ML';
import TourLavageCalculator from './4_SCRUBBER_TourLavage';
import SCRUBBEROpex from './5_SCRUBBER_Opex';
import SCRUBBER_Report from './SCRUBBER_Report';
import { getLanguageCode } from '../../F_Gestion_Langues/Fonction_Traduction';
import { translations } from './SCRUBBER_traduction';
import { tlTranslations } from './TourLavage_traduction';
import '../../index.css';

const SCRUBBERMainPage = ({ nodeData, title, onSendData, onClose, onGoBack, currentLanguage = 'fr', nodeId }) => {
  const languageCode = getLanguageCode(currentLanguage);
  const t = (key) => {
    return (
      tlTranslations[languageCode]?.[key] ||
      tlTranslations['fr']?.[key] ||
      translations[languageCode]?.[key] ||
      translations['fr']?.[key] ||
      key
    );
  };

  const [innerData, setInnerData] = useState(nodeData.result);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      name: t('Flue gases'),
      content: <SCRUBBERFlueGasParameters innerData={innerData} setInnerData={setInnerData} currentLanguage={currentLanguage} nodeId={nodeId} />
    },
    {
      name: t('Pollutant Emissions'),
      content: <SCRUBBERFlueGasPollutantEmission innerData={innerData} setInnerData={setInnerData} currentLanguage={currentLanguage} nodeId={nodeId} />
    },
    {
      // Remplace les anciens onglets « Scrubber acide » + « Scrubber basique »
      name: t('TL_report_section'),
      content: <TourLavageCalculator innerData={innerData} setInnerData={setInnerData} currentLanguage={currentLanguage} nodeId={nodeId} />
    },
    {
      name: t('Opex'),
      content: <SCRUBBEROpex innerData={innerData} setInnerData={setInnerData} currentLanguage={currentLanguage} nodeId={nodeId} />
    },
    {
      name: t('rapport'),
      content: <SCRUBBER_Report innerData={innerData} currentLanguage={currentLanguage} nodeId={nodeId} />
    },
  ];

  const renderTabContent = () => {
    return tabs[activeTab]?.content || null;
  };

  const sendAllData = () => {
    onSendData({
      result: {
        ...innerData,
        FG_OUT_kg_h: innerData['FG_OUT_kg_h'],
        PollutantInput: innerData['PInput'],
        T_OUT: innerData['T_OUT'],
        PollutantOutput: innerData['Poutput'],
        ResidusOutput: innerData['Residus'],
        MasseDechet: innerData['masse'],
        // Fumées épurées par la tour de lavage (vers le node aval)
        FG_scrubber_out_kg_h: innerData['FG_scrubber_out_kg_h'],
        T_scrubber_out: innerData['T_scrubber_out'],
        activeNodes_Elec: innerData['activeNodes_Elec'],
        activeNodes_Eau: innerData['activeNodes_Eau'],
        activeNodes_Reactifs: innerData['activeNodes_Reactifs'],
        activeNodes_Energie: innerData['activeNodes_Energie'],
        activeNodes_CO2: innerData['activeNodes_CO2'],
        activeNodes_cout: innerData['activeNodes_cout']
      }
    });
  };

  return (
    <div className="cadre_pour_onglet_principal">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h1>{t('SCRUBBER Configuration')}</h1>
        <button
          onClick={() => {
            onGoBack(null);
            sendAllData();
          }}
          style={{
            padding: '8px 16px',
            background: '#4a90e2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          {t('Back to Flow')}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid #ddd',
          marginBottom: '20px',
          overflowX: 'auto',
        }}
      >
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => setActiveTab(index)}
            style={{
              padding: '10px 20px',
              background: activeTab === index ? '#4a90e2' : 'white',
              color: activeTab === index ? 'white' : '#333',
              border: 'none',
              borderBottom:
                activeTab === index
                  ? '2px solid #4a90e2'
                  : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === index ? 'bold' : 'normal',
              whiteSpace: 'nowrap',
              minWidth: 'fit-content',
            }}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div
        style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}
      >
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SCRUBBERMainPage;
