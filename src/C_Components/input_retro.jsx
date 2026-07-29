import React, { useState } from 'react';

const InputField = ({ label, value, onChange, unit }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState('');

  const handleFocus = () => {
    // If the stored value is 0 (result of cleared field), start with empty string
    setLocalValue(value === 0 || value == null ? '' : String(value));
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    onChange(e);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <label style={{ color: 'black', width: '300px' }}>
        {label} {unit}:
      </label>
      <input
        type="number"
        value={isFocused ? localValue : (value ?? '')}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        style={{
          width: 'auto',
          minWidth: '60px',
          maxWidth: '1000px'
        }}
      />
    </div>
  );
};

export default InputField;
