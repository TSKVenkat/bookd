'use client';

import React from 'react';
import { useSeatMapStore } from '@/store/seatMapStore';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Square, Circle, Grid, Edit, Trash, Eye, Pen, PanelTop } from 'lucide-react';

interface ControlPanelProps {
  editorMode: 'view' | 'edit' | 'draw' | 'delete';
  activeTool: string | null;
  ticketTypes: any[];
  selectedTicketType: any | null;
  selectedSectionId: string | null;
  section: any | null;
}

export default function ControlPanel({
  editorMode,
  activeTool,
  ticketTypes,
  selectedTicketType,
  selectedSectionId,
  section
}: ControlPanelProps) {
  const {
    setEditorMode,
    setActiveTool,
    setSelectedTicketType,
    updateSection,
    generateSeatsForSection,
    removeSection,
    setLayout,
    layout
  } = useSeatMapStore();

  // Handle section update
  const handleSectionUpdate = (key: string, value: string | number) => {
    if (!section) return;
    
    updateSection({
      ...section,
      [key]: value
    });
  };

  // Handle color change for section
  const handleColorChange = (color: string) => {
    if (!section) return;
    
    updateSection({
      ...section,
      color
    });
  };

  // Generate seats for section
  const handleGenerateSeats = () => {
    if (!section || !selectedTicketType) return;
    
    generateSeatsForSection(section.id, selectedTicketType.id);
  };

  // Delete section
  const handleDeleteSection = () => {
    if (!section) return;
    
    if (confirm(`Are you sure you want to delete "${section.name}"?`)) {
      removeSection(section.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode switcher */}
      <div className="flex items-center space-x-2 bg-white p-2 rounded-md shadow-sm">
        <span className="text-sm font-medium mr-2">Mode:</span>
        <Button
          size="sm"
          variant={editorMode === 'view' ? 'default' : 'outline'}
          onClick={() => setEditorMode('view')}
          title="View Mode"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Button
          size="sm"
          variant={editorMode === 'draw' ? 'default' : 'outline'}
          onClick={() => setEditorMode('draw')}
          title="Draw Mode"
        >
          <Pen className="h-4 w-4 mr-1" />
          Draw
        </Button>
        <Button
          size="sm"
          variant={editorMode === 'edit' ? 'default' : 'outline'}
          onClick={() => setEditorMode('edit')}
          title="Edit Mode"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          size="sm"
          variant={editorMode === 'delete' ? 'default' : 'outline'}
          onClick={() => setEditorMode('delete')}
          title="Delete Mode"
        >
          <Trash className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>

      {/* Tools for Draw mode */}
      {editorMode === 'draw' && (
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-md shadow-sm">
          <span className="text-sm font-medium mr-2">Draw:</span>
          <Button
            size="sm"
            variant={activeTool === 'seat' ? 'default' : 'outline'}
            onClick={() => setActiveTool('seat')}
            title="Draw Seats"
          >
            <Circle className="h-4 w-4 mr-1" />
            Seat
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'section' ? 'default' : 'outline'}
            onClick={() => setActiveTool('section')}
            title="Draw Section"
          >
            <Square className="h-4 w-4 mr-1" />
            Section
          </Button>
          <Button
            size="sm"
            variant={activeTool === 'arc-section' ? 'default' : 'outline'}
            onClick={() => setActiveTool('arc-section')}
            title="Draw Arc Section"
          >
            <Circle className="h-4 w-4 mr-1" />
            Arc Section
          </Button>
          <div className="ml-auto">
            <div className="flex items-center space-x-2">
              <label className="text-sm flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={layout.snapToGrid || false}
                  onChange={(e) => setLayout({ ...layout, snapToGrid: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Snap to Grid</span>
              </label>
              <label className="text-sm flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={layout.showGrid || false}
                  onChange={(e) => setLayout({ ...layout, showGrid: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Show Grid</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Ticket type selector */}
      {(editorMode === 'draw' || editorMode === 'edit') && ticketTypes.length > 0 && (
        <div className="bg-white p-2 rounded-md shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium">Ticket Type:</span>
            <Select
              value={selectedTicketType?.id || ''}
              onChange={(value) => {
                const ticketType = ticketTypes.find(t => t.id === value);
                if (ticketType) {
                  setSelectedTicketType(ticketType);
                }
              }}
              options={ticketTypes.map(type => ({
                value: type.id,
                label: `${type.name} ($${typeof type.price === 'number' ? type.price.toFixed(2) : type.price})`
              }))}
            />
            <div 
              className="w-5 h-5 rounded-full" 
              style={{ backgroundColor: selectedTicketType?.color || '#CCCCCC' }}
            ></div>
          </div>
        </div>
      )}

      {/* Section editor - only shown when a section is selected */}
      {selectedSectionId && section && editorMode === 'edit' && (
        <div className="bg-white p-4 rounded-md shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-md font-medium">Edit Section</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDeleteSection}
              className="text-red-600 hover:text-red-800"
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>

          <div className="space-y-3">
            <Input
              label="Section Name"
              value={section.name}
              onChange={(e) => handleSectionUpdate('name', e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Rows"
                type="number"
                min={1}
                max={26}
                value={section.rows || 1}
                onChange={(e) => handleSectionUpdate('rows', parseInt(e.target.value))}
              />
              <Input
                label="Seats Per Row"
                type="number"
                min={1}
                max={50}
                value={section.seatsPerRow || 1}
                onChange={(e) => handleSectionUpdate('seatsPerRow', parseInt(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Row Start Label"
                value={section.rowStartLabel || 'A'}
                onChange={(e) => handleSectionUpdate('rowStartLabel', e.target.value)}
              />
              <Input
                label="First Seat Number"
                type="number"
                min={1}
                value={section.seatStartNumber || 1}
                onChange={(e) => handleSectionUpdate('seatStartNumber', parseInt(e.target.value))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section Color</label>
                <ColorPicker
                  color={section.color || '#94a3b8'}
                  onChange={handleColorChange}
                />
              </div>
              <Input
                label="Rotation (°)"
                type="number"
                min={-180}
                max={180}
                value={section.rotation || 0}
                onChange={(e) => handleSectionUpdate('rotation', parseInt(e.target.value))}
              />
            </div>

            <Button
              onClick={handleGenerateSeats}
              disabled={!selectedTicketType}
              className="w-full"
            >
              Generate Seats for Section
            </Button>
          </div>
        </div>
      )}

      {/* Venue settings */}
      <div className="bg-white p-4 rounded-md shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-md font-medium">Venue Settings</h3>
          <div className="flex items-center space-x-2">
            <label className="text-sm flex items-center space-x-2">
              <input
                type="checkbox"
                checked={layout.showRowLabels || false}
                onChange={(e) => setLayout({ ...layout, showRowLabels: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show Row</span>
            </label>
            <label className="text-sm flex items-center space-x-2">
              <input
                type="checkbox"
                checked={layout.showSeatNumbers || false}
                onChange={(e) => setLayout({ ...layout, showSeatNumbers: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show Numbers</span>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            label="Venue Name"
            value={layout.name || 'Venue'}
            onChange={(e) => setLayout({ ...layout, name: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Seat Size (px)"
              type="number"
              min={10}
              max={50}
              value={layout.seatSize || 25}
              onChange={(e) => setLayout({ ...layout, seatSize: parseInt(e.target.value) })}
            />
            <Input
              label="Grid Size (px)"
              type="number"
              min={10}
              max={100}
              value={layout.gridSize || 20}
              onChange={(e) => setLayout({ ...layout, gridSize: parseInt(e.target.value) })}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 