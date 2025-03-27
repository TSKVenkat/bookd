'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TicketTypeManagerProps {
  eventId: string;
}

interface TicketType {
  id: string;
  name: string;
  description?: string;
  price: number | string;
  color: string;
}

export default function TicketTypeManager({ eventId }: TicketTypeManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    color: '#3B82F6' // Default blue
  });

  const predefinedColors = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6B7280', // Gray
    '#1F2937'  // Dark Gray
  ];

  useEffect(() => {
    fetchTicketTypes();
  }, [eventId]);

  const fetchTicketTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/organizer/events/${eventId}/ticket-types`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch ticket types');
      }
      
      const data = await response.json();
      setTicketTypes(data);
    } catch (err) {
      console.error('Error fetching ticket types:', err);
      setError('Failed to load ticket types');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({
      ...prev,
      color
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Validate form data
      if (!formData.name || !formData.price) {
        setError('Name and price are required');
        setLoading(false);
        return;
      }
      
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        setError('Price must be a positive number');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`/api/organizer/events/${eventId}/ticket-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          price,
          color: formData.color
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create ticket type');
      }
      
      const newTicketType = await response.json();
      
      // Add new ticket type to the list
      setTicketTypes(prev => [...prev, newTicketType]);
      
      // Reset form and show success
      setFormData({
        name: '',
        description: '',
        price: '',
        color: '#3B82F6'
      });
      
      setSuccess('Ticket type created successfully');
      setIsAddingNew(false);
    } catch (err: any) {
      console.error('Error creating ticket type:', err);
      setError(err.message || 'Failed to create ticket type');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSeatMap = () => {
    if (ticketTypes.length === 0) {
      setError('Please create at least one ticket type before creating a seat map');
      return;
    }
    
    router.push(`/organizer/events/${eventId}/seatmap`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Ticket Types</h2>
        <button
          type="button"
          onClick={() => setIsAddingNew(!isAddingNew)}
          className="px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
        >
          {isAddingNew ? 'Cancel' : '+ Add Ticket Type'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-500 p-4 rounded-lg mb-4">
          {success}
        </div>
      )}
      
      {isAddingNew && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Add New Ticket Type</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., VIP, Regular, Standing"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="Optional description of this ticket type"
              />
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                Price (in $) *
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleFormChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="grid grid-cols-8 gap-2">
                {predefinedColors.map(color => (
                  <div
                    key={color}
                    onClick={() => handleColorSelect(color)}
                    className={`w-8 h-8 rounded-full cursor-pointer ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleFormChange}
                className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                placeholder="#RRGGBB"
              />
            </div>
            
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Ticket Type'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {ticketTypes.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-500 mb-4">No ticket types created yet</p>
          <p className="text-sm text-gray-400">Create ticket types to define different pricing tiers for your event</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {ticketTypes.map(type => (
                <tr key={type.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{type.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{type.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${typeof type.price === 'number' 
                        ? type.price.toFixed(2) 
                        : parseFloat(String(type.price)).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className="inline-block w-6 h-6 rounded-full" 
                      style={{ backgroundColor: type.color }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="pt-6 flex justify-end">
        <button
          type="button"
          onClick={handleCreateSeatMap}
          disabled={ticketTypes.length === 0}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Create Seat Map
        </button>
      </div>
    </div>
  );
} 