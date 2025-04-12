'use client';

import React, { useState } from 'react';

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

// Predefined color palette
const colorPalette = [
  // Vibrant colors
  '#FF3B30', '#FF9500', '#FFCC00', '#4CD964', '#5AC8FA', '#007AFF', '#5856D6', '#FF2D55',
  // Light colors
  '#FFCDD2', '#F8BBD0', '#E1BEE7', '#C5CAE9', '#BBDEFB', '#B3E5FC', '#B2EBF2', '#B2DFDB',
  // Dark colors
  '#D32F2F', '#C2185B', '#7B1FA2', '#303F9F', '#1976D2', '#0288D1', '#0097A7', '#00796B',
  // Grayscale
  '#000000', '#424242', '#616161', '#9E9E9E', '#BDBDBD', '#E0E0E0', '#FFFFFF'
];

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <div 
        className="flex items-center space-x-2 border rounded-md p-2 w-full cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div 
          className="w-6 h-6 rounded-sm" 
          style={{ backgroundColor: color }}
        />
        <span className="flex-1 text-left">{color}</span>
      </div>
      
      {isOpen && (
        <div className="absolute z-10 mt-2 bg-white p-3 rounded-md shadow-lg border">
          <div className="grid grid-cols-8 gap-1">
            {colorPalette.map((paletteColor) => (
              <div
                key={paletteColor}
                className={`w-6 h-6 rounded-sm cursor-pointer transition-transform hover:scale-110 ${
                  paletteColor === color ? 'ring-2 ring-offset-1 ring-blue-500' : ''
                }`}
                style={{ backgroundColor: paletteColor }}
                onClick={() => {
                  onChange(paletteColor);
                  setIsOpen(false);
                }}
              />
            ))}
          </div>
          
          <div className="mt-2 pt-2 border-t">
            <label className="block text-xs mb-1 text-gray-600">Custom color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-8"
            />
          </div>
          
          <button
            className="mt-2 w-full text-sm px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            onClick={() => setIsOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}; 