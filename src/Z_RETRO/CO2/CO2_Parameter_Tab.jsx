import React, { useState, useEffect } from 'react';
// CO2_calculations.js non implémenté — stub local
const performCalculation_CO2 = () => null;

const CO2_Parameter_Tab = ({ nodeData, title, onSendData, onClose, currentLanguage }) => {
    // Initialiser les états avec les données reçues ou des valeurs par défaut
    const [calculationResult_CO2, setCalculationResult] = useState(nodeData?.calculationResult || null);
    const [isSliderOpen, setIsSliderOpen] = useState(false);

    useEffect(() => {
        if (nodeData && !calculationResult_CO2) {
            // Effectuer un calcul initial si les données du noeud sont présentes
            const initialResult = performCalculation_CO2(nodeData);
            setCalculationResult(initialResult);
        }
    }, [nodeData, calculationResult_CO2]);

    const handleSendData = () => {
        try {
            const result = performCalculation_CO2(nodeData); // Appel du calcul avec les données reçues
            setCalculationResult(result); // Mise à jour de l'état avec les résultats
            onSendData({ result }); // Envoi des résultats vers le parent
        } catch (error) {
            console.error('Calculation error:', error);
            alert(`Error in calculation: ${error.message}`);
        }
    };

    const toggleSlider = () => {
        setIsSliderOpen(!isSliderOpen);
    };

    return (
        <div
            style={{
                width: '400px',
                background: 'gray',
                padding: '10px',
                boxShadow: '0 0 10px rgba(0,0,0,1)',
                position: 'relative',
            }}
        >
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    right: '10px',
                    top: '10px',
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                }}
            >
                ✕
            </button>
            <h3>{title} Parameters</h3>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={handleSendData}>Calculate and Send Data</button>
                <button onClick={toggleSlider} style={{ background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', padding: '8px 16px', cursor: 'pointer' }}>
                    {isSliderOpen ? 'Hide Results' : 'Show Results'}
                </button>
            </div>

            <div
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: '50%',
                    transform: `translate(-50%, ${isSliderOpen ? '0' : '100%'})`,
                    width: '80%',
                    maxHeight: '80vh',
                    background: 'white',
                    padding: '20px',
                    borderRadius: '20px 20px 0 0',
                    boxShadow: '0 -2px 10px rgba(0,0,0,0.2)',
                    transition: 'transform 0.3s ease-in-out',
                    overflowY: 'auto',
                    zIndex: 1000,
                }}
            >
                  </div>
                {isSliderOpen && calculationResult_CO2 && (
                    <>
                        <h4>Calculation Results</h4>
                        <pre
                            style={{
                                background: '#f1f1f1',
                                padding: '10px',
                                borderRadius: '4px',
                            }}
                        >
                            {JSON.stringify(calculationResult_CO2, null, 2)}
                        </pre>
                    </>
                )}
          
        </div>
    );
};

export default CO2_Parameter_Tab;