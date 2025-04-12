'use client';

import React, { useState } from 'react';
import { VenueLayout, Seat } from './VenueLayoutEditor';

interface VenueLayoutSettingsProps {
  layout: VenueLayout;
  selectedSeat: Seat | null;
  onLayoutChange: (layout: VenueLayout) => void;
  onSeatUpdate: (seat: Seat) => void;
  onSeatDelete: (id: string) => void;
  ticketTypes: { id: string; name: string }[];
}

export const VenueLayoutSettings: React.FC<VenueLayoutSettingsProps> = ({
  layout,
  selectedSeat,
  onLayoutChange,
  onSeatUpdate,
  onSeatDelete,
  ticketTypes = [],
}) => {
  const [activeTab, setActiveTab] = useState<'venue' | 'seating' | 'stage' | 'advanced'>('venue');
  
  // Update layout property with validation
  const updateLayoutProperty = <K extends keyof VenueLayout>(
    key: K,
    value: VenueLayout[K]
  ) => {
    onLayoutChange({ ...layout, [key]: value });
  };
  
  // Update nested stage property
  const updateStageProperty = <K extends keyof typeof layout.stageConfig>(
    key: K,
    value: typeof layout.stageConfig[K]
  ) => {
    onLayoutChange({
      ...layout,
      stageConfig: {
        ...layout.stageConfig,
        [key]: value,
      },
    });
  };
  
  // Handle input changes for numeric values
  const handleNumericInput = (
    key: keyof VenueLayout,
    value: string,
    min = 0,
    max = Number.MAX_SAFE_INTEGER
  ) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      updateLayoutProperty(key, numValue);
    }
  };
  
  // Handle input changes for stage numeric values
  const handleStageNumericInput = (
    key: keyof typeof layout.stageConfig,
    value: string,
    min = 0,
    max = Number.MAX_SAFE_INTEGER
  ) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= min && numValue <= max) {
      updateStageProperty(key, numValue);
    }
  };
  
  // Handle changes to selected seat
  const handleSeatPropertyChange = <K extends keyof Seat>(
    key: K,
    value: Seat[K]
  ) => {
    if (selectedSeat) {
      onSeatUpdate({
        ...selectedSeat,
        [key]: value,
      });
    }
  };
  
  return (
    <div className="bg-white border border-gray-300 rounded-md shadow-sm">
      {/* Settings Tabs */}
      <div className="flex border-b border-gray-300">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'venue'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('venue')}
        >
          Venue
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'seating'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('seating')}
        >
          Seating
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'stage'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('stage')}
        >
          Stage
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'advanced'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced
        </button>
      </div>
      
      <div className="p-4">
        {/* Venue Tab */}
        {activeTab === 'venue' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="venueName" className="block text-sm font-medium text-gray-700">
                Venue Name
              </label>
              <input
                type="text"
                id="venueName"
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                value={layout.name}
                onChange={(e) => updateLayoutProperty('name', e.target.value)}
                placeholder="e.g., Main Concert Hall"
              />
            </div>
            
            <div>
              <label htmlFor="venueType" className="block text-sm font-medium text-gray-700">
                Venue Type
              </label>
              <select
                id="venueType"
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                value={layout.venueType}
                onChange={(e) => updateLayoutProperty('venueType', e.target.value as 'seated' | 'standing' | 'mixed')}
              >
                <option value="seated">Seated</option>
                <option value="standing">Standing</option>
                <option value="mixed">Mixed (Seated & Standing)</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="venueWidth" className="block text-sm font-medium text-gray-700">
                  Width (px)
                </label>
                <input
                  type="number"
                  id="venueWidth"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.venueWidth}
                  onChange={(e) => handleNumericInput('venueWidth', e.target.value, 100, 2000)}
                  min="100"
                  max="2000"
                />
              </div>
              
              <div>
                <label htmlFor="venueHeight" className="block text-sm font-medium text-gray-700">
                  Height (px)
                </label>
                <input
                  type="number"
                  id="venueHeight"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.venueHeight}
                  onChange={(e) => handleNumericInput('venueHeight', e.target.value, 100, 2000)}
                  min="100"
                  max="2000"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Seating Tab */}
        {activeTab === 'seating' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rows" className="block text-sm font-medium text-gray-700">
                  Number of Rows
                </label>
                <input
                  type="number"
                  id="rows"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.rows}
                  onChange={(e) => handleNumericInput('rows', e.target.value, 1, 50)}
                  min="1"
                  max="50"
                />
              </div>
              
              <div>
                <label htmlFor="columns" className="block text-sm font-medium text-gray-700">
                  Seats per Row
                </label>
                <input
                  type="number"
                  id="columns"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.columns}
                  onChange={(e) => handleNumericInput('columns', e.target.value, 1, 100)}
                  min="1"
                  max="100"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="rowSpacing" className="block text-sm font-medium text-gray-700">
                  Row Spacing (px)
                </label>
                <input
                  type="number"
                  id="rowSpacing"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.rowSpacing}
                  onChange={(e) => handleNumericInput('rowSpacing', e.target.value, 10, 200)}
                  min="10"
                  max="200"
                />
              </div>
              
              <div>
                <label htmlFor="columnSpacing" className="block text-sm font-medium text-gray-700">
                  Seat Spacing (px)
                </label>
                <input
                  type="number"
                  id="columnSpacing"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.columnSpacing}
                  onChange={(e) => handleNumericInput('columnSpacing', e.target.value, 10, 200)}
                  min="10"
                  max="200"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="seatSize" className="block text-sm font-medium text-gray-700">
                Seat Size (px)
              </label>
              <input
                type="number"
                id="seatSize"
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                value={layout.seatSize}
                onChange={(e) => handleNumericInput('seatSize', e.target.value, 5, 50)}
                min="5"
                max="50"
              />
            </div>
            
            <div className="flex items-center pt-4">
              <input
                type="checkbox"
                id="arcEnabled"
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                checked={layout.arcEnabled}
                onChange={(e) => updateLayoutProperty('arcEnabled', e.target.checked)}
              />
              <label htmlFor="arcEnabled" className="block ml-2 text-sm font-medium text-gray-700">
                Enable Curved Rows
              </label>
            </div>
            
            {/* Curved seating options */}
            {layout.arcEnabled && (
              <div className="pl-6 space-y-4 border-l-2 border-indigo-100">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="arcRadius" className="block text-sm font-medium text-gray-700">
                      Arc Radius (px)
                    </label>
                    <input
                      type="number"
                      id="arcRadius"
                      className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                      value={layout.arcRadius}
                      onChange={(e) => handleNumericInput('arcRadius', e.target.value, 50, 1000)}
                      min="50"
                      max="1000"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="arcSpanDegrees" className="block text-sm font-medium text-gray-700">
                      Arc Span (degrees)
                    </label>
                    <input
                      type="number"
                      id="arcSpanDegrees"
                      className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                      value={layout.arcSpanDegrees}
                      onChange={(e) => handleNumericInput('arcSpanDegrees', e.target.value, 10, 180)}
                      min="10"
                      max="180"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="arcStartDegree" className="block text-sm font-medium text-gray-700">
                    Start Angle (degrees)
                  </label>
                  <input
                    type="number"
                    id="arcStartDegree"
                    className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                    value={layout.arcStartDegree}
                    onChange={(e) => handleNumericInput('arcStartDegree', e.target.value, -180, 180)}
                    min="-180"
                    max="180"
                  />
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Stage Tab */}
        {activeTab === 'stage' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="stageShape" className="block text-sm font-medium text-gray-700">
                Stage Shape
              </label>
              <select
                id="stageShape"
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                value={layout.stageConfig.shape}
                onChange={(e) => updateStageProperty('shape', e.target.value as 'rectangle' | 'semicircle' | 'circle')}
              >
                <option value="rectangle">Rectangle</option>
                <option value="semicircle">Semicircle</option>
                <option value="circle">Circle</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="stageWidth" className="block text-sm font-medium text-gray-700">
                  Width (px)
                </label>
                <input
                  type="number"
                  id="stageWidth"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.stageConfig.width}
                  onChange={(e) => handleStageNumericInput('width', e.target.value, 50, 1000)}
                  min="50"
                  max="1000"
                />
              </div>
              
              <div>
                <label htmlFor="stageHeight" className="block text-sm font-medium text-gray-700">
                  Height (px)
                </label>
                <input
                  type="number"
                  id="stageHeight"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.stageConfig.height}
                  onChange={(e) => handleStageNumericInput('height', e.target.value, 20, 500)}
                  min="20"
                  max="500"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="stageX" className="block text-sm font-medium text-gray-700">
                  X Position (px)
                </label>
                <input
                  type="number"
                  id="stageX"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.stageConfig.x}
                  onChange={(e) => handleStageNumericInput('x', e.target.value, 0, layout.venueWidth)}
                  min="0"
                  max={layout.venueWidth}
                />
              </div>
              
              <div>
                <label htmlFor="stageY" className="block text-sm font-medium text-gray-700">
                  Y Position (px)
                </label>
                <input
                  type="number"
                  id="stageY"
                  className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                  value={layout.stageConfig.y}
                  onChange={(e) => handleStageNumericInput('y', e.target.value, 0, layout.venueHeight)}
                  min="0"
                  max={layout.venueHeight}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="stageRotation" className="block text-sm font-medium text-gray-700">
                Rotation (degrees)
              </label>
              <input
                type="number"
                id="stageRotation"
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                value={layout.stageConfig.rotation || 0}
                onChange={(e) => handleStageNumericInput('rotation', e.target.value, -180, 180)}
                min="-180"
                max="180"
              />
            </div>
            
            <div>
              <button
                className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
                onClick={() => {
                  // Center the stage at the top of the venue
                  const newX = (layout.venueWidth - layout.stageConfig.width) / 2;
                  const newY = 20; // 20px from the top
                  
                  onLayoutChange({
                    ...layout,
                    stageConfig: {
                      ...layout.stageConfig,
                      x: newX,
                      y: newY,
                    },
                  });
                }}
              >
                Center Stage at Top
              </button>
            </div>
          </div>
        )}
        
        {/* Advanced Tab */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="rowLetters" className="block text-sm font-medium text-gray-700">
                Row Labels (comma-separated)
              </label>
              <input
                type="text"
                id="rowLetters"
                className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                value={layout.rowLabels ? layout.rowLabels.join(', ') : ''}
                onChange={(e) => {
                  const labels = e.target.value.split(',').map(l => l.trim());
                  updateLayoutProperty('rowLabels', labels);
                }}
                placeholder="A, B, C, D, E..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Leave empty to use automatic row labels (A, B, C, ...)
              </p>
            </div>
            
            <div className="pt-3 mt-3 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Selected Seat Properties</h3>
              
              {selectedSeat ? (
                <div className="pt-4 mt-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="seatRow" className="block text-sm font-medium text-gray-700">
                        Row
                      </label>
                      <input
                        type="text"
                        id="seatRow"
                        className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                        value={selectedSeat.row}
                        onChange={(e) => handleSeatPropertyChange('row', e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="seatNumber" className="block text-sm font-medium text-gray-700">
                        Number
                      </label>
                      <input
                        type="text"
                        id="seatNumber"
                        className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                        value={selectedSeat.number}
                        onChange={(e) => handleSeatPropertyChange('number', e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="seatType" className="block text-sm font-medium text-gray-700">
                      Seat Type
                    </label>
                    <select
                      id="seatType"
                      className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                      value={selectedSeat.seatType || 'regular'}
                      onChange={(e) => handleSeatPropertyChange('seatType', e.target.value)}
                    >
                      <option value="regular">Regular Seat</option>
                      <option value="accessible">Accessible Seat</option>
                      <option value="premium">Premium Seat</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="seatStatus" className="block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      id="seatStatus"
                      className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                      value={selectedSeat.status}
                      onChange={(e) => handleSeatPropertyChange('status', e.target.value)}
                    >
                      <option value="available">Available</option>
                      <option value="reserved">Reserved</option>
                      <option value="sold">Sold</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="ticketType" className="block text-sm font-medium text-gray-700">
                      Ticket Type
                    </label>
                    <select
                      id="ticketType"
                      className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                      value={selectedSeat.typeId || ''}
                      onChange={(e) => handleSeatPropertyChange('typeId', e.target.value)}
                    >
                      <option value="">Select Ticket Type</option>
                      {ticketTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="seatRotation" className="block text-sm font-medium text-gray-700">
                      Rotation (degrees)
                    </label>
                    <input
                      type="number"
                      id="seatRotation"
                      className="w-full p-2 mt-1 border border-gray-300 rounded-md"
                      value={selectedSeat.rotation || 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        if (!isNaN(value) && value >= -180 && value <= 180) {
                          handleSeatPropertyChange('rotation', value);
                        }
                      }}
                      min="-180"
                      max="180"
                    />
                  </div>
                  
                  <div className="pt-2">
                    <button
                      className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
                      onClick={() => onSeatDelete(selectedSeat.id)}
                    >
                      Delete Seat
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">
                  Click on a seat in the layout to edit its properties
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 