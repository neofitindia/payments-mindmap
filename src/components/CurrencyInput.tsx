import React, { useState, useEffect, memo } from 'react';
import './CurrencyInput.css';

interface CurrencyInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
  disabled?: boolean;
  className?: string;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  id,
  value,
  onChange,
  placeholder = "0.00",
  required = false,
  min,
  step = "0.01",
  disabled = false,
  className
}) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number with Indian currency formatting (lakhs and crores)
  const formatIndianCurrency = (num: number): string => {
    if (isNaN(num) || num === 0) return '';
    
    const isNegative = num < 0;
    const numStr = Math.abs(num).toString();
    const [integerPart, decimalPart] = numStr.split('.');
    
    if (!integerPart) return '';
    
    // Indian number formatting: first 3 digits, then groups of 2
    let formatted = '';
    const reversed = integerPart.split('').reverse();
    
    for (let i = 0; i < reversed.length; i++) {
      if (i === 3) {
        formatted = ',' + formatted;
      } else if (i > 3 && (i - 3) % 2 === 0) {
        formatted = ',' + formatted;
      }
      formatted = reversed[i] + formatted;
    }
    
    if (decimalPart) {
      formatted += '.' + decimalPart;
    }
    
    return isNegative ? '-' + formatted : formatted;
  };

  // Remove formatting and return clean number string
  const parseDisplayValue = (displayVal: string): string => {
    return displayVal.replace(/,/g, '');
  };

  // Update display value when prop value changes
  useEffect(() => {
    if (!isFocused) {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue !== 0) {
        setDisplayValue(formatIndianCurrency(numValue));
      } else {
        setDisplayValue('');
      }
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const cleanValue = parseDisplayValue(inputValue);
    
    // Check if negative values are allowed based on min prop
    const allowNegative = min === undefined || parseFloat(min) < 0;
    
    // Allow empty, numbers, decimal points, and optionally negative sign
    const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    if (cleanValue === '' || regex.test(cleanValue)) {
      setDisplayValue(cleanValue);
      onChange(cleanValue);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    // Show unformatted value when focused
    setDisplayValue(parseDisplayValue(displayValue));
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Format the value when losing focus
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue !== 0) {
      setDisplayValue(formatIndianCurrency(numValue));
    } else {
      setDisplayValue('');
    }
  };

  return (
    <div className="currency-input-wrapper">
      <div className="currency-prefix">₹</div>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={className || "currency-input"}
        autoComplete="off"
      />
    </div>
  );
};

export default memo(CurrencyInput);