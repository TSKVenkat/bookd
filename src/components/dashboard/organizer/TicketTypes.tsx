'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  color: string;
}

interface TicketTypeFormData {
  name: string;
  description: string;
  price: number;
  color: string;
}

const COLORS = [
  'bg-blue-200',
  'bg-green-200',
  'bg-yellow-200',
  'bg-red-200',
  'bg-purple-200',
  'bg-pink-200',
  'bg-indigo-200',
  'bg-gray-200'
];

export default function TicketTypes({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<TicketTypeFormData>({
    name: '',
    description: '',
    price: 0,
    color: COLORS[0]
  });

  useEffect(() => {
    fetchTicketTypes();
  }, [eventId]);

  const fetchTicketTypes = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${eventId}/ticket-types`);
      if (!response.ok) throw new Error('Failed to fetch ticket types');
      const data = await response.json();
      setTicketTypes(data);
    } catch (err) {
      setError('Failed to load ticket types');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/organizer/events/${eventId}/ticket-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create ticket type');

      await fetchTicketTypes();
      setIsAdding(false);
      setFormData({
        name: '',
        description: '',
        price: 0,
        color: COLORS[0]
      });
    } catch (err) {
      setError('Failed to create ticket type');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this ticket type?')) return;

    try {
      const response = await fetch(
        `/api/organizer/events/${eventId}/ticket-types/${typeId}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete ticket type');

      await fetchTicketTypes();
    } catch (err) {
      setError('Failed to delete ticket type');
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Ticket Types</h2>
        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Add Ticket Type
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          {error}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Price (₹)
            </label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
              min="0"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="grid grid-cols-8 gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full ${color} ${
                    formData.color === color ? 'ring-2 ring-blue-500' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {ticketTypes.map(type => (
          <div
            key={type.id}
            className={`p-4 rounded-lg ${type.color} relative group`}
          >
            <button
              onClick={() => handleDelete(type.id)}
              className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <h3 className="font-medium">{type.name}</h3>
            {type.description && (
              <p className="text-sm text-gray-600 mt-1">{type.description}</p>
            )}
            <p className="text-lg font-semibold mt-2">₹{type.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 