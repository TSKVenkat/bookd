'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Toast } from '@/components/ui/Toast';
import { Loader } from '@/components/ui/Loader';
import { TicketType } from './SeatMapTypes';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { useSeatMapStore } from '@/store/seatMapStore';

interface TicketTypeManagerProps {
  eventId: string;
  onTicketTypesChange?: (ticketTypes: TicketType[]) => void;
}

export function TicketTypeManager({ eventId, onTicketTypesChange }: TicketTypeManagerProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [tempType, setTempType] = useState<Partial<TicketType>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { setSelectedTicketType } = useSeatMapStore();

  // Load ticket types
  useEffect(() => {
    fetchTicketTypes();
  }, [eventId]);

  const fetchTicketTypes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/ticket-types`);
      if (!response.ok) {
        throw new Error('Failed to fetch ticket types');
      }
      const data = await response.json();
      setTicketTypes(data);
      if (onTicketTypesChange) {
        onTicketTypesChange(data);
      }
      
      // Set the first ticket type as selected in the store
      if (data.length > 0) {
        setSelectedTicketType(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket types');
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing a ticket type
  const handleEdit = (type: TicketType) => {
    setTempType({
      id: type.id,
      name: type.name,
      price: type.price,
      description: type.description || '',
      color: type.color
    });
    setIsEditing(type.id);
  };

  // Start adding a new ticket type
  const handleAddNew = () => {
    setTempType({
      name: '',
      price: 0,
      description: '',
      color: getRandomColor(),
      isPublic: true
    });
    setIsAddingNew(true);
  };

  // Cancel editing or adding
  const handleCancel = () => {
    setIsEditing(null);
    setIsAddingNew(false);
    setTempType({});
  };

  // Save changes to a ticket type
  const handleSave = async () => {
    if (!tempType.name || tempType.price === undefined) {
      setError('Name and price are required');
      return;
    }

    try {
      let response;
      const payload = {
        name: tempType.name,
        price: parseFloat(String(tempType.price)),
        description: tempType.description || '',
        color: tempType.color || '#4CAF50',
        capacity: tempType.capacity !== undefined ? parseInt(String(tempType.capacity)) : null,
        isPublic: tempType.isPublic !== undefined ? tempType.isPublic : true
      };

      if (isAddingNew) {
        response = await fetch(`/api/organizer/events/${eventId}/ticket-types`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else if (isEditing) {
        response = await fetch(`/api/organizer/events/${eventId}/ticket-types/${isEditing}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response || !response.ok) {
        throw new Error('Failed to save ticket type');
      }

      const successMsg = isAddingNew 
        ? 'Ticket type added successfully' 
        : 'Ticket type updated successfully';
      
      setSuccess(successMsg);
      setIsEditing(null);
      setIsAddingNew(false);
      setTempType({});
      await fetchTicketTypes();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save ticket type');
    }
  };

  // Delete a ticket type
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ticket type?')) {
      return;
    }

    try {
      const response = await fetch(`/api/organizer/events/${eventId}/ticket-types/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete ticket type');
      }

      setSuccess('Ticket type deleted successfully');
      await fetchTicketTypes();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete ticket type');
    }
  };

  // Generate a random color
  const getRandomColor = (): string => {
    const colors = ['#4CAF50', '#2196F3', '#FFC107', '#F44336', '#9C27B0', '#FF5722', '#3F51B5', '#00BCD4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    // Handle checkbox inputs
    if (type === 'checkbox') {
      setTempType({
        ...tempType,
        [name]: checked
      });
      return;
    }
    
    setTempType({
      ...tempType,
      [name]: value
    });
  };

  const handleColorChange = (color: string) => {
    setTempType({
      ...tempType,
      color
    });
  };

  // Select a ticket type from the list
  const handleSelectTicketType = (ticketType: TicketType) => {
    setSelectedTicketType(ticketType.id);
  };

  if (isLoading) {
    return <Loader text="Loading ticket types..." />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Toast 
          type="error" 
          message={error} 
          onClose={() => setError('')} 
        />
      )}
      
      {success && (
        <Toast 
          type="success" 
          message={success} 
          onClose={() => setSuccess('')} 
        />
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Ticket Types</h2>
        <Button 
          onClick={handleAddNew}
          disabled={isAddingNew || isEditing !== null}
        >
          Add Ticket Type
        </Button>
      </div>

      {/* Edit Form */}
      {(isAddingNew || isEditing) && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">
            {isAddingNew ? 'Add New Ticket Type' : 'Edit Ticket Type'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              name="name"
              value={tempType.name || ''}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={tempType.price || ''}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Capacity (optional)"
              name="capacity"
              type="number"
              min="0"
              value={tempType.capacity || ''}
              onChange={handleInputChange}
            />
            <div className="col-span-1 md:col-span-2">
              <Input
                label="Description (optional)"
                name="description"
                value={tempType.description || ''}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <ColorPicker 
                color={tempType.color || '#4CAF50'} 
                onChange={handleColorChange} 
              />
            </div>
            <div className="flex items-center mt-6">
              <input
                type="checkbox"
                id="isPublic"
                name="isPublic"
                checked={tempType.isPublic !== undefined ? tempType.isPublic : true}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
                Publicly available for booking
              </label>
            </div>
          </div>
          <div className="mt-4 flex justify-end space-x-2">
            <Button
              variant="secondary"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
            >
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Ticket Types List */}
      {ticketTypes.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Capacity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ticketTypes.map((type) => (
                <tr key={type.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{type.name}</div>
                    {type.description && (
                      <div className="text-sm text-gray-500">{type.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    ${typeof type.price === 'number' ? type.price.toFixed(2) : type.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="h-6 w-6 rounded-full" 
                        style={{ backgroundColor: type.color || '#4CAF50' }}
                      ></div>
                      <span className="ml-2 text-sm text-gray-500">{type.color}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {type.capacity || 'Unlimited'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      type.isPublic ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {type.isPublic ? 'Public' : 'Private'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(type)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                      disabled={isAddingNew || isEditing !== null}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={isAddingNew || isEditing !== null}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-gray-50 p-8 text-center rounded-lg border">
          <p className="text-gray-500">No ticket types have been created yet.</p>
          {!isAddingNew && (
            <Button
              variant="primary"
              onClick={handleAddNew}
              className="mt-4"
            >
              Create Your First Ticket Type
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default TicketTypeManager; 