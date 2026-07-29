import React, { useState, useEffect } from 'react';

const Toggle10Choices = ({ currentLanguage, onLanguageChange }) => {
  // Supprimé l'état local - on utilise maintenant les props
  const [showOptions, setShowOptions] = useState(true);
  
  const options = ['fr', 'en', 'es', 'de', 'it', 'pt', 'zh', 'ja', 'ru', 'ar'];

  const displayLabels = {
    fr: 'francais', en: 'english', es: 'español', de: 'deutsch', it: 'italiano',
    pt: 'português', zh: '中文', ja: '日本語', ru: 'русский', ar: 'العربية',
  };
  
  const colors = [
    '#4CAF50', // Vert
    '#2196F3', // Bleu
    '#FF9800', // Orange
    '#9C27B0', // Violet
    '#F44336', // Rouge
    '#00BCD4', // Cyan
    '#8BC34A', // Vert clair
    '#FF5722', // Rouge-orange
    '#607D8B', // Bleu-gris
    '#795548'  // Marron
  ];
  
  const toggleMode = () => {
    // Utilisez currentLanguage passé en prop au lieu de l'état local
    const currentIndex = options.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % options.length;
    const newLanguage = options[nextIndex];
    
    // Appelez la fonction callback du parent pour mettre à jour la langue
    if (onLanguageChange) {
      onLanguageChange(newLanguage);
    }
    
    // Afficher les options à nouveau quand on clique
    setShowOptions(true);
  };
  
  // Cacher les options au bout de 5 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowOptions(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [showOptions]);
  
  const getButtonConfig = () => {
    // Utilisez currentLanguage passé en prop
    const currentIndex = options.indexOf(currentLanguage);
    return {
      onClick: toggleMode,
      top: -30,
      left: 0,
      label: displayLabels[currentLanguage] || currentLanguage,
      backgroundColor: colors[currentIndex] || colors[0], // Fallback au cas où
    };
  };
  
  const buttonConfig = getButtonConfig();
  
  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: '#f3f4f6', position: 'relative' }}>
      {/* Bouton principal */}
      <button
        onClick={buttonConfig.onClick}
        style={{
          position: 'absolute',
          top: `${buttonConfig.top}px`,
          left: `${buttonConfig.left}px`,
          backgroundColor: buttonConfig.backgroundColor,
          padding: '12px 24px',
          color: 'white',
          fontWeight: '600',
          borderRadius: '8px',
          border: 'none',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        }}
      >
        {buttonConfig.label}
      </button>
      
      {/* Indicateur des options - se cache après 5 secondes */}
      {showOptions && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(100%, -40%)',
          backgroundColor: 'white',
          padding: '16px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 1000
        }}>
          <h3 style={{ fontWeight: 'bold', marginBottom: '8px', margin: '0 0 8px 0' }}>Options disponibles :</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {options.map((option, index) => (
              <div 
                key={option}
                style={{
                  padding: '4px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                    backgroundColor: option === currentLanguage ? colors[index] : '#e5e7eb',
                  color: option === currentLanguage ? 'white' : '#374151',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  if (onLanguageChange) {
                    onLanguageChange(option);
                  }
                }}
              >
                {displayLabels[option] || option}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Toggle10Choices;