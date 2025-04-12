'use client';

import React, { useState, useEffect } from 'react';
import { Toast } from '@/components/ui/Toast';

interface Ticket {
  id: string;
  status: string;
  type: {
    id: string;
    name: string;
    price: number;
  };
  seat?: {
    id: string;
    row: string;
    number: string;
    status: string;
  };
  booking: {
    id: string;
    status: string;
    userEmail: string;
    userName: string;
  };
}

interface TicketType {
  id: string;
  name: string;
  price: number;
}

interface Seat {
  id: string;
  row: string;
  number: string;
  status: string;
}

interface TicketManagerProps {
  eventId: string;
}

export const TicketManager: React.FC<TicketManagerProps> = ({ eventId }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // New ticket form state
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedSeatId, setSelectedSeatId] = useState('');
  const [isManualTicketModalOpen, setIsManualTicketModalOpen] = useState(false);

  // Fetch tickets for this event
  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/organizer/events/${eventId}/tickets`);
        
        if (response.ok) {
          const data = await response.json();
          setTickets(data);
        } else {
          console.error('Failed to load tickets');
        }
      } catch (err) {
        console.error('Error loading tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [eventId]);

  // Fetch ticket types and available seats
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch ticket types
        const typesResponse = await fetch(`/api/organizer/events/${eventId}/ticket-types`);
        if (typesResponse.ok) {
          const typesData = await typesResponse.json();
          setTicketTypes(typesData);
          if (typesData.length > 0) {
            setSelectedTypeId(typesData[0].id);
          }
        }
        
        // Fetch available seats
        const seatsResponse = await fetch(`/api/organizer/events/${eventId}/seatmap`);
        if (seatsResponse.ok) {
          const seatsData = await seatsResponse.json();
          // Filter only available seats
          const available = seatsData.filter((seat: Seat) => seat.status === 'available');
          setAvailableSeats(available);
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    fetchData();
  }, [eventId]);

  // Handle manual ticket creation
  const handleCreateManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName || !customerEmail || !selectedTypeId) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/organizer/events/${eventId}/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tickets: [
            {
              typeId: selectedTypeId,
              seatId: selectedSeatId || null,
            },
          ],
          customerInfo: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
          },
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccess('Ticket created successfully');
        setIsManualTicketModalOpen(false);
        
        // Reset form
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setSelectedTypeId(ticketTypes[0]?.id || '');
        setSelectedSeatId('');
        
        // Refresh tickets
        const updatedTicketsResponse = await fetch(`/api/organizer/events/${eventId}/tickets`);
        if (updatedTicketsResponse.ok) {
          const updatedTickets = await updatedTicketsResponse.json();
          setTickets(updatedTickets);
        }
        
        // Refresh available seats
        const updatedSeatsResponse = await fetch(`/api/organizer/events/${eventId}/seatmap`);
        if (updatedSeatsResponse.ok) {
          const seatsData = await updatedSeatsResponse.json();
          const available = seatsData.filter((seat: Seat) => seat.status === 'available');
          setAvailableSeats(available);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create ticket');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error and success messages */}
      {error && <Toast type="error" message={error} onClose={() => setError('')} />}
      {success && <Toast type="success" message={success} onClose={() => setSuccess('')} />}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Ticket Management</h2>
        <button
          onClick={() => setIsManualTicketModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Create Manual Ticket
        </button>
      </div>
      
      {/* Tickets table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Seat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No tickets found
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ticket.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.booking.userName} <br />
                      <span className="text-xs text-gray-400">{ticket.booking.userEmail}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.type.name} <br />
                      <span className="text-xs text-gray-400">${ticket.type.price.toFixed(2)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.seat ? (
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded">
                          {ticket.seat.row}{ticket.seat.number}
                        </span>
                      ) : (
                        <span className="text-gray-400">No seat</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-block px-2 py-1 rounded ${
                        ticket.status === 'ISSUED' 
                          ? 'bg-green-100 text-green-800' 
                          : ticket.status === 'CANCELLED' 
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Manual ticket modal */}
      {isManualTicketModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Create Manual Ticket</h3>
            
            <form onSubmit={handleCreateManualTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer Email *
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Customer Phone
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ticket Type *
                </label>
                <select
                  value={selectedTypeId}
                  onChange={(e) => setSelectedTypeId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  required
                >
                  {ticketTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} (${type.price.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Seat (Optional)
                </label>
                <select
                  value={selectedSeatId}
                  onChange={(e) => setSelectedSeatId(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">No specific seat</option>
                  {availableSeats.map((seat) => (
                    <option key={seat.id} value={seat.id}>
                      {seat.row}{seat.number}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsManualTicketModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketManager; 