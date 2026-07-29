import React, { useState } from 'react';

const ParameterInput = ({ paramKey, value, handleChange }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  const handleFocus = () => {
    setLocalValue(value === 0 || value == null ? '' : String(value));
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleInputChange = (e) => {
    setLocalValue(e.target.value);
    handleChange(paramKey, Number(e.target.value));
  };

  return (
    <input
      type="number"
      value={isFocused ? localValue : (value ?? '')}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleInputChange}
      style={{
        flex: '0 0 100px',
        padding: '8px',
        border: '1px solid #ddd',
        borderRadius: '4px',
      }}
    />
  );
};

const Input_bilan = ({ input, handleChange, currentLanguage = 'fr', translations }) => {
  const t = (key) => {
    if (!translations) return key;
    return translations[currentLanguage]?.[key] || translations['fr']?.[key] || key;
  };

  return (
    <div>
      {Object.entries(input).map(([key, value]) => (
        <div
          key={key}
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '10px',
          }}
        >
          <label
            style={{
              flex: '1',
              marginRight: '10px',
              textAlign: 'right',
              fontWeight: 'bold',
            }}
          >
            {t(key)}:
          </label>
          <ParameterInput paramKey={key} value={value} handleChange={handleChange} />
        </div>
      ))}
    </div>
  );
};

export default Input_bilan;
