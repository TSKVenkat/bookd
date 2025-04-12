'use client';

import React from 'react';

interface Tool {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface ToolGroup {
  id: string;
  name: string;
  tools: Tool[];
}

interface VenueLayoutToolbarProps {
  activeToolMode: string;
  activeTool: string;
  onToolModeChange: (mode: string) => void;
  onToolChange: (tool: string) => void;
  toolGroups: ToolGroup[];
}

const VenueLayoutToolbar: React.FC<VenueLayoutToolbarProps> = ({
  activeToolMode,
  activeTool,
  onToolModeChange,
  onToolChange,
  toolGroups,
}) => {
  return (
    <div className="flex flex-col bg-white shadow-md rounded-md overflow-hidden">
      {/* Mode Selection */}
      <div className="flex border-b border-gray-200">
        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeToolMode === 'view'
              ? 'bg-blue-50 text-blue-600 font-semibold'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => onToolModeChange('view')}
        >
          View Mode
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeToolMode === 'edit'
              ? 'bg-blue-50 text-blue-600 font-semibold'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => onToolModeChange('edit')}
        >
          Edit Mode
        </button>
        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeToolMode === 'add'
              ? 'bg-blue-50 text-blue-600 font-semibold'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => onToolModeChange('add')}
        >
          Add Mode
        </button>
      </div>

      {/* Tool Groups */}
      <div className="p-3 space-y-4">
        {toolGroups.map((group) => (
          <div key={group.id} className="space-y-2">
            <h3 className="text-sm font-medium text-gray-700">{group.name}</h3>
            <div className="flex flex-wrap gap-2">
              {group.tools.map((tool) => (
                <button
                  key={tool.id}
                  className={`flex items-center justify-center p-2 rounded-md ${
                    activeTool === tool.id
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                  }`}
                  onClick={() => onToolChange(tool.id)}
                  title={tool.description}
                >
                  <span className="material-icons text-lg">{tool.icon}</span>
                  <span className="ml-1 text-sm whitespace-nowrap">{tool.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
        <p className="text-xs text-gray-600">
          {activeToolMode === 'view' && 'Drag to pan, scroll to zoom'}
          {activeToolMode === 'edit' &&
            'Select seats or sections to edit their properties'}
          {activeToolMode === 'add' &&
            `Click on the canvas to add ${
              activeTool === 'seat'
                ? 'seats'
                : activeTool === 'section'
                ? 'sections'
                : activeTool === 'stage'
                ? 'a stage'
                : 'elements'
            }`}
        </p>
      </div>

      {/* Additional Controls for Edit Mode */}
      {activeToolMode === 'edit' && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex items-center justify-between">
            <button
              className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200"
              title="Delete selected seat or section"
            >
              <span className="material-icons text-sm mr-1">delete</span>
              Delete Selected
            </button>
            <button
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
              title="Duplicate selected seat or section"
            >
              <span className="material-icons text-sm mr-1">content_copy</span>
              Duplicate
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VenueLayoutToolbar; 