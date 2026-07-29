import React, { useState } from 'react';
import { getLanguageCode } from '../F_Gestion_Langues/Fonction_Traduction';

// Définition des couleurs
const COLORS = {
  PURPLE: '#9C27B0',
  GREEN: '#4CAF50',
  BLUE: '#2196F3',
  CYAN: '#00BCD4',
  BLUEVIOLET: '#8A2BE2',
  ORANGERED: '#FF4500',
  CHARTREUSE: '#7FFF00',
  CHOCOLATE: '#D2691E',
  TEAL: '#008080', // Couleur pour le screenshot
  DARKORANGE: '#FF8C00', // Couleur pour l'édition de rapport
  SLATEGRAY: '#607D8B', // Couleur pour Air parasite
};

function DropdownMenu({ 
  currentUser, 
  adminEmail, 
  mode, 
  showDataFlowDisplay, 
  showGraph, 
  showOPEX,
  onToggleMode,
  onToggleDataFlow,
  onToggleGraph,
  onShowAirParasite,
  onShowDashboard,
  onShowEmailManagement,
  onToggleOPEX,
  onSaveProject,
  onLoadProject,
  onLogout,
  onScreenshot, // Nouvelle prop pour la capture d'écran
  onEditRapport,
  currentLanguage = 'fr',
  onLanguageChange 
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Fonction de traduction
  const translate = (key) => {
    const translations = {
      'fr': {
        'Bilan': 'Bilan',
        'Retro bilan': 'Retro bilan',
        'Hide Combined Data': 'Masquer Données Combinées',
        'Show Combined Data': 'Afficher Données Combinées',
        'Hide Graph': 'Masquer Graphique',
        'Show Graph': 'Afficher Graphique',
        'Air parasite': 'Air parasite',
        'Consommations': 'Consommations',
        'Gérer Utilisateurs': 'Gérer Utilisateurs',
        'Fermer OPEX': 'Fermer OPEX',
        'Ouvrir OPEX': 'Ouvrir OPEX',
        'Save Project': 'Sauvegarder Projet',
        'Load Project': 'Charger Projet',
        'Logout': 'Déconnexion',
        'Language': 'Langue',
        'Screenshot': 'Capture d\'écran',
        'Edit Rapport': 'Éditer Rapport'
      },
      'en': {
        'Bilan': 'Balance',
        'Retro bilan': 'Retro Balance',
        'Hide Combined Data': 'Hide Combined Data',
        'Show Combined Data': 'Show Combined Data',
        'Hide Graph': 'Hide Graph',
        'Show Graph': 'Show Graph',
        'Air parasite': 'Parasitic Air',
        'Consommations': 'Consumption',
        'Gérer Utilisateurs': 'Manage Users',
        'Fermer OPEX': 'Close OPEX',
        'Ouvrir OPEX': 'Open OPEX',
        'Save Project': 'Save Project',
        'Load Project': 'Load Project',
        'Logout': 'Logout',
        'Language': 'Language',
        'Screenshot': 'Screenshot',
        'Edit Rapport': 'Edit Report'
      },
      'de': {
        'Bilan': 'Bilanz',
        'Retro bilan': 'Retro Bilanz',
        'Hide Combined Data': 'Kombinierte Daten ausblenden',
        'Show Combined Data': 'Kombinierte Daten anzeigen',
        'Hide Graph': 'Diagramm ausblenden',
        'Show Graph': 'Diagramm anzeigen',
        'Air parasite': 'Falschluft',
        'Consommations': 'Verbrauch',
        'Gérer Utilisateurs': 'Benutzer verwalten',
        'Fermer OPEX': 'OPEX schließen',
        'Ouvrir OPEX': 'OPEX öffnen',
        'Save Project': 'Projekt speichern',
        'Load Project': 'Projekt laden',
        'Logout': 'Abmelden',
        'Language': 'Sprache',
        'Screenshot': 'Bildschirmfoto',
        'Edit Rapport': 'Bericht bearbeiten'
      },
      'es': {
        'Bilan': 'Balance',
        'Retro bilan': 'Retro Balance',
        'Hide Combined Data': 'Ocultar Datos Combinados',
        'Show Combined Data': 'Mostrar Datos Combinados',
        'Hide Graph': 'Ocultar Gráfico',
        'Show Graph': 'Mostrar Gráfico',
        'Air parasite': 'Aire parásito',
        'Consommations': 'Consumos',
        'Gérer Utilisateurs': 'Gestionar Usuarios',
        'Fermer OPEX': 'Cerrar OPEX',
        'Ouvrir OPEX': 'Abrir OPEX',
        'Save Project': 'Guardar Proyecto',
        'Load Project': 'Cargar Proyecto',
        'Logout': 'Cerrar Sesión',
        'Language': 'Idioma',
        'Screenshot': 'Captura de pantalla',
        'Edit Rapport': 'Editar Informe'
      },
      'it': {
        'Bilan': 'Bilancio',
        'Retro bilan': 'Retro Bilancio',
        'Hide Combined Data': 'Nascondi Dati Combinati',
        'Show Combined Data': 'Mostra Dati Combinati',
        'Hide Graph': 'Nascondi Grafico',
        'Show Graph': 'Mostra Grafico',
        'Air parasite': 'Aria parassita',
        'Consommations': 'Consumi',
        'Gérer Utilisateurs': 'Gestisci Utenti',
        'Fermer OPEX': 'Chiudi OPEX',
        'Ouvrir OPEX': 'Apri OPEX',
        'Save Project': 'Salva Progetto',
        'Load Project': 'Carica Progetto',
        'Logout': 'Disconnetti',
        'Language': 'Lingua',
        'Screenshot': 'Screenshot',
        'Edit Rapport': 'Modifica Report'
      },
      'pt': {
        'Bilan': 'Balanço',
        'Retro bilan': 'Retro Balanço',
        'Hide Combined Data': 'Ocultar Dados Combinados',
        'Show Combined Data': 'Mostrar Dados Combinados',
        'Hide Graph': 'Ocultar Gráfico',
        'Show Graph': 'Mostrar Gráfico',
        'Air parasite': 'Ar parasita',
        'Consommations': 'Consumos',
        'Gérer Utilisateurs': 'Gerenciar Usuários',
        'Fermer OPEX': 'Fechar OPEX',
        'Ouvrir OPEX': 'Abrir OPEX',
        'Save Project': 'Salvar Projeto',
        'Load Project': 'Carregar Projeto',
        'Logout': 'Sair',
        'Language': 'Idioma',
        'Screenshot': 'Captura de tela',
        'Edit Rapport': 'Editar Relatório'
      },
      'ru': {
        'Bilan': 'Баланс',
        'Retro bilan': 'Ретро баланс',
        'Hide Combined Data': 'Скрыть объединённые данные',
        'Show Combined Data': 'Показать объединённые данные',
        'Hide Graph': 'Скрыть график',
        'Show Graph': 'Показать график',
        'Air parasite': 'Паразитный воздух',
        'Consommations': 'Потребление',
        'Gérer Utilisateurs': 'Управление пользователями',
        'Fermer OPEX': 'Закрыть OPEX',
        'Ouvrir OPEX': 'Открыть OPEX',
        'Save Project': 'Сохранить проект',
        'Load Project': 'Загрузить проект',
        'Logout': 'Выйти',
        'Language': 'Язык',
        'Screenshot': 'Снимок экрана',
        'Edit Rapport': 'Редактировать отчёт'
      },
      'zh': {
        'Bilan': '能量平衡',
        'Retro bilan': '逆向平衡',
        'Hide Combined Data': '隐藏综合数据',
        'Show Combined Data': '显示综合数据',
        'Hide Graph': '隐藏图表',
        'Show Graph': '显示图表',
        'Air parasite': '寄生空气',
        'Consommations': '消耗量',
        'Gérer Utilisateurs': '管理用户',
        'Fermer OPEX': '关闭运营成本',
        'Ouvrir OPEX': '打开运营成本',
        'Save Project': '保存项目',
        'Load Project': '加载项目',
        'Logout': '退出登录',
        'Language': '语言',
        'Screenshot': '截图',
        'Edit Rapport': '编辑报告'
      },
      'ja': {
        'Bilan': 'エネルギーバランス',
        'Retro bilan': 'レトロバランス',
        'Hide Combined Data': '結合データを非表示',
        'Show Combined Data': '結合データを表示',
        'Hide Graph': 'グラフを非表示',
        'Show Graph': 'グラフを表示',
        'Air parasite': '寄生空気',
        'Consommations': '消費量',
        'Gérer Utilisateurs': 'ユーザー管理',
        'Fermer OPEX': 'OPEXを閉じる',
        'Ouvrir OPEX': 'OPEXを開く',
        'Save Project': 'プロジェクトを保存',
        'Load Project': 'プロジェクトを読み込む',
        'Logout': 'ログアウト',
        'Language': '言語',
        'Screenshot': 'スクリーンショット',
        'Edit Rapport': 'レポートを編集'
      },
      'ar': {
        'Bilan': 'ميزان الطاقة',
        'Retro bilan': 'ميزان رجعي',
        'Hide Combined Data': 'إخفاء البيانات المجمعة',
        'Show Combined Data': 'إظهار البيانات المجمعة',
        'Hide Graph': 'إخفاء الرسم البياني',
        'Show Graph': 'إظهار الرسم البياني',
        'Air parasite': 'هواء طفيلي',
        'Consommations': 'الاستهلاك',
        'Gérer Utilisateurs': 'إدارة المستخدمين',
        'Fermer OPEX': 'إغلاق OPEX',
        'Ouvrir OPEX': 'فتح OPEX',
        'Save Project': 'حفظ المشروع',
        'Load Project': 'تحميل المشروع',
        'Logout': 'تسجيل الخروج',
        'Language': 'اللغة',
        'Screenshot': 'لقطة شاشة',
        'Edit Rapport': 'تحرير التقرير'
      }
    };
    
    const lang = getLanguageCode(currentLanguage);
    return translations[lang]?.[key] || translations['en']?.[key] || key;
  };

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ar', name: 'العربية', flag: '🇸🇦' }
  ];

  const menuItems = [
    {
      id: 'mode',
      label: translate(mode === 'Bilan' ? 'Retro bilan' : 'Bilan'),
      onClick: onToggleMode,
      backgroundColor: mode === 'Bilan' ? '#4CAF50' : '#2196F3',
    },
    // "Show Combined Data" et "Air parasite" : masqués en mode Bilan
    ...(mode !== 'Bilan'
      ? [{
          id: 'dataflow',
          label: translate(showDataFlowDisplay ? 'Hide Combined Data' : 'Show Combined Data'),
          onClick: onToggleDataFlow,
          backgroundColor: COLORS.PURPLE,
        }]
      : []
    ),
    {
      id: 'graph',
      label: translate(showGraph ? 'Hide Graph' : 'Show Graph'),
      onClick: onToggleGraph,
      backgroundColor: COLORS.GREEN,
    },
    ...(mode !== 'Bilan'
      ? [{
          id: 'airParasite',
          label: translate('Air parasite'),
          onClick: onShowAirParasite,
          backgroundColor: COLORS.SLATEGRAY,
        }]
      : []
    ),
    // "Consommations" : masqué en mode Retro bilan
    ...(mode === 'Bilan'
      ? [{
          id: 'dashboard',
          label: translate('Consommations'),
          onClick: onShowDashboard,
          backgroundColor: COLORS.BLUE,
        }]
      : []
    ),
    ...(currentUser === adminEmail
      ? [{
          id: 'email-management',
          label: translate('Gérer Utilisateurs'),
          onClick: onShowEmailManagement,
          backgroundColor: COLORS.CYAN,
        }]
      : []
    ),
    // "OPEX" : masqué en mode Retro bilan
    ...(mode === 'Bilan'
      ? [{
          id: 'opex',
          label: translate(showOPEX ? 'Fermer OPEX' : 'Ouvrir OPEX'),
          onClick: onToggleOPEX,
          backgroundColor: COLORS.BLUEVIOLET,
        }]
      : []
    ),
    {
      id: 'screenshot',
      label: translate('Screenshot'),
      onClick: onScreenshot,
      backgroundColor: COLORS.TEAL,
    },
    {
      id: 'editRapport',
      label: translate('Edit Rapport'),
      onClick: onEditRapport,
      backgroundColor: COLORS.DARKORANGE,
    },
    {
      id: 'save',
      label: translate('Save Project'),
      onClick: onSaveProject,
      backgroundColor: COLORS.ORANGERED,
    },
    {
      id: 'load',
      label: translate('Load Project'),
      onClick: onLoadProject,
      backgroundColor: COLORS.CHARTREUSE,
    },
    {
      id: 'logout',
      label: translate('Logout'),
      onClick: onLogout,
      backgroundColor: COLORS.CHOCOLATE,
    }
  ];

  const handleItemClick = (onClick) => {
    if (onClick) {
      onClick();
    }
    setIsOpen(false);
  };

  const handleLanguageChange = (langCode) => {
    if (onLanguageChange) {
      onLanguageChange(langCode);
    }
    setIsOpen(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 10000,
    }}>
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
      
      {/* Bouton principal pour ouvrir/fermer le menu */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
          zIndex: 10001,
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
        }}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Menu déroulant */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '0',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          minWidth: '220px',
          maxHeight: '500px',
          overflowY: 'auto',
          zIndex: 10002,
          border: '2px solid rgba(33, 150, 243, 0.3)',
          animation: 'slideDown 0.3s ease-out',
        }}>
          {/* Section des actions principales */}
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.onClick)}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'transparent',
                color: '#333',
                border: 'none',
                borderBottom: '1px solid #eee',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                transition: 'background-color 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = item.backgroundColor + '20';
                e.target.style.color = item.backgroundColor;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = '#333';
              }}
            >
              <div style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: item.backgroundColor,
                flexShrink: 0,
              }} />
              {item.label}
            </button>
          ))}
          
          {/* Séparateur */}
          {onLanguageChange && (
            <div style={{
              height: '2px',
              backgroundColor: '#eee',
              margin: '8px 0'
            }} />
          )}
          
          {/* Section de sélection de langue */}
          {onLanguageChange && (
            <div style={{ padding: '8px 16px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#666',
                marginBottom: '8px'
              }}>
                {translate('Language')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: currentLanguage === lang.code ? '#2196F3' : 'transparent',
                      color: currentLanguage === lang.code ? 'white' : '#333',
                      border: currentLanguage === lang.code ? '1px solid #2196F3' : '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => {
                      if (currentLanguage !== lang.code) {
                        e.target.style.backgroundColor = '#f0f0f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentLanguage !== lang.code) {
                        e.target.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overlay pour fermer le menu en cliquant à l'extérieur */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: 'transparent',
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default DropdownMenu;