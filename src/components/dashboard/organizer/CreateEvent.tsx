'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface EventFormData {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  venueId: string;
  artistId: string;
  thumbnail: File | null;
}

interface Venue {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  capacity: number;
  description?: string;
  thumbnail?: string;
  latitude?: number;
  longitude?: number;
}

interface Artist {
  id: string;
  name: string;
  genre?: string;
}

interface VenueFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pinCode: string;
  capacity: string;
  description: string;
  thumbnail: string;
  latitude: string;
  longitude: string;
}

export default function CreateEvent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreatingVenue, setIsCreatingVenue] = useState(false);
  const [isCreatingArtist, setIsCreatingArtist] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [venueFormData, setVenueFormData] = useState<VenueFormData>({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pinCode: '',
    capacity: '',
    description: '',
    thumbnail: '',
    latitude: '',
    longitude: ''
  });
  const [artistFormData, setArtistFormData] = useState({
    name: '',
    description: '',
    genre: '',
    thumbnail: ''
  });
  const [eventData, setEventData] = useState<EventFormData>({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    venueId: '',
    artistId: '',
    thumbnail: null
  });

  useEffect(() => {
    fetchVenues();
    fetchArtists();
  }, []);

  const fetchVenues = async () => {
    try {
      const response = await fetch('/api/organizer/events/venues');
      if (!response.ok) throw new Error('Failed to fetch venues');
      const data = await response.json();
      setVenues(data);
    } catch (err) {
      setError('Failed to load venues');
      console.error(err);
    }
  };

  const fetchArtists = async () => {
    try {
      const response = await fetch('/api/organizer/events/artists');
      if (!response.ok) throw new Error('Failed to fetch artists');
      const data = await response.json();
      setArtists(data);
    } catch (err) {
      setError('Failed to load artists');
      console.error(err);
    }
  };

  const handleVenueFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVenueFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleArtistFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setArtistFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEventFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEventData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEventData(prev => ({
        ...prev,
        thumbnail: e.target.files![0]
      }));
    }
  };

  const handleCreateVenue = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    // Add validation
    if (!venueFormData.name || !venueFormData.address || !venueFormData.city || !venueFormData.capacity) {
      setError('Please fill in all required venue fields');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/organizer/events/venues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(venueFormData),
      });

      if (!response.ok) throw new Error('Failed to create venue');
      const newVenue = await response.json();
      
      setVenues(prev => [...prev, newVenue]);
      setEventData(prev => ({
        ...prev,
        venueId: newVenue.id
      }));
      setIsCreatingVenue(false);
      setSuccess('Venue created successfully');
    } catch (err) {
      setError('Failed to create venue');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateArtist = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    // Add validation
    if (!artistFormData.name) {
      setError('Artist name is required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/organizer/events/artists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(artistFormData),
      });

      if (!response.ok) throw new Error('Failed to create artist');
      const newArtist = await response.json();
      
      setArtists(prev => [...prev, newArtist]);
      setEventData(prev => ({
        ...prev,
        artistId: newArtist.id
      }));
      setIsCreatingArtist(false);
      setSuccess('Artist created successfully');
    } catch (err) {
      setError('Failed to create artist');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate form data
      if (!eventData.name || !eventData.description || !eventData.startDate || !eventData.venueId) {
        setError('Please fill in all required fields');
        setLoading(false);
        return;
      }

      // First, upload image if exists
      let thumbnail = '';
      if (eventData.thumbnail) {
        const imageFormData = new FormData();
        imageFormData.append('file', eventData.thumbnail);
        
        console.log('Uploading image...');
        const uploadResponse = await fetch('/api/organizer/upload', {
          method: 'POST',
          body: imageFormData
        });
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('Upload error response:', errorText);
          throw new Error('Failed to upload image');
        }

        try {
          const uploadData = await uploadResponse.json();
          console.log('Upload result:', uploadData);
          thumbnail = uploadData.secure_url || uploadData.url || '';
        } catch (jsonError) {
          console.error('Error parsing upload response:', jsonError);
          throw new Error('Invalid response from upload service');
        }
      }

      // Create event payload with correct field names
      const eventPayload = {
        name: eventData.name,
        description: eventData.description,
        startDate: eventData.startDate,
        endDate: eventData.endDate || new Date(new Date(eventData.startDate).getTime() + (2 * 60 * 60 * 1000)).toISOString(),
        venueId: eventData.venueId,
        artistId: eventData.artistId,
        thumbnail
      };

      console.log('Creating event with payload:', eventPayload);
      
      const response = await fetch('/api/organizer/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Event creation error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error || 'Failed to create event');
        } catch (jsonError) {
          throw new Error('Failed to create event: ' + errorText);
        }
      }
      
      const eventResponse = await response.json();
      console.log('Event created:', eventResponse);
      
      router.push(`/organizer/events/${eventResponse.id}/manage`);
    } catch (err: any) {
      console.error('Event creation error:', err);
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold mb-6">Create New Event</h2>
      
      {error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 text-green-500 p-4 rounded-lg mb-6">
          {success}
        </div>
      )}

      <form onSubmit={handleCreateEvent} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Event Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={eventData.name}
            onChange={handleEventFormChange}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            required
            value={eventData.description}
            onChange={handleEventFormChange}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              id="startDate"
              name="startDate"
              required
              value={eventData.startDate}
              onChange={handleEventFormChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              id="endDate"
              name="endDate"
              required
              value={eventData.endDate}
              onChange={handleEventFormChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="venueId" className="block text-sm font-medium text-gray-700">
              Venue
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingVenue(!isCreatingVenue)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isCreatingVenue ? 'Cancel' : '+ Add New Venue'}
            </button>
          </div>
          
          {!isCreatingVenue && (
            <select
              id="venueId"
              name="venueId"
              required={!isCreatingVenue}
              value={eventData.venueId}
              onChange={handleEventFormChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a venue</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name} - {venue.city}
                </option>
              ))}
            </select>
          )}
        </div>

        {isCreatingVenue && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">Add New Venue</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Venue Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={venueFormData.name}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  required
                  value={venueFormData.address}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  required
                  value={venueFormData.city}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={venueFormData.state}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Country
                </label>
                <input
                  type="text"
                  name="country"
                  value={venueFormData.country}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pin Code
                </label>
                <input
                  type="text"
                  name="pinCode"
                  value={venueFormData.pinCode}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Capacity
                </label>
                <input
                  type="number"
                  name="capacity"
                  required
                  value={venueFormData.capacity}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Latitude
                </label>
                <input
                  type="text"
                  name="latitude"
                  value={venueFormData.latitude}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Longitude
                </label>
                <input
                  type="text"
                  name="longitude"
                  value={venueFormData.longitude}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={venueFormData.description}
                  onChange={handleVenueFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateVenue}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Venue'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label htmlFor="artistId" className="block text-sm font-medium text-gray-700">
              Artist
            </label>
            <button
              type="button"
              onClick={() => setIsCreatingArtist(!isCreatingArtist)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {isCreatingArtist ? 'Cancel' : '+ Add New Artist'}
            </button>
          </div>
          
          {!isCreatingArtist && (
            <select
              id="artistId"
              name="artistId"
              required={!isCreatingArtist}
              value={eventData.artistId}
              onChange={handleEventFormChange}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select an artist</option>
              {artists.map(artist => (
                <option key={artist.id} value={artist.id}>
                  {artist.name} {artist.genre ? `- ${artist.genre}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {isCreatingArtist && (
          <div className="bg-gray-50 p-4 rounded-lg space-y-4">
            <h3 className="font-medium text-gray-900">Add New Artist</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Artist Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={artistFormData.name}
                  onChange={handleArtistFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Genre
                </label>
                <input
                  type="text"
                  name="genre"
                  value={artistFormData.genre}
                  onChange={handleArtistFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={artistFormData.description}
                  onChange={handleArtistFormChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateArtist}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Artist'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div>
          <label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700">
            Event Image
          </label>
          <input
            type="file"
            id="thumbnail"
            name="thumbnail"
            accept="image/*"
            onChange={handleFileChange}
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  );
}