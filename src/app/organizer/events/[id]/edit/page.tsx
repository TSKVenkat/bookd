'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Event {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  venueId: string;
  artistId: string;
  thumbnail: string | null;
}

interface Artist {
  id: string;
  name: string;
}

interface Venue {
  id: string;
  name: string;
  city: string;
}

export default function EditEvent({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [artists, setArtists] = useState<Artist[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    venueId: '',
    artistId: '',
    thumbnail: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [eventRes, artistsRes, venuesRes] = await Promise.all([
          fetch(`/api/organizer/events/${params.id}`),
          fetch('/api/artists'),
          fetch('/api/venues')
        ]);

        if (!eventRes.ok) throw new Error('Failed to fetch event');
        if (!artistsRes.ok) throw new Error('Failed to fetch artists');
        if (!venuesRes.ok) throw new Error('Failed to fetch venues');

        const [eventData, artistsData, venuesData] = await Promise.all([
          eventRes.json(),
          artistsRes.json(),
          venuesRes.json()
        ]);

        setEvent(eventData);
        setArtists(artistsData);
        setVenues(venuesData);

        // Format dates for datetime-local input
        const startDate = new Date(eventData.startDate)
          .toISOString()
          .slice(0, 16);
        const endDate = new Date(eventData.endDate)
          .toISOString()
          .slice(0, 16);

        setFormData({
          name: eventData.name,
          description: eventData.description,
          startDate,
          endDate,
          venueId: eventData.venueId,
          artistId: eventData.artistId,
          thumbnail: eventData.thumbnail || ''
        });
      } catch (err) {
        setError('Failed to load event data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const formData = new FormData();
      formData.append('file', e.target.files[0]);

      try {
        const response = await fetch('/api/organizer/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) throw new Error('Failed to upload image');
        const { url } = await response.json();

        setFormData(prev => ({
          ...prev,
          thumbnail: url
        }));
      } catch (err) {
        setError('Failed to upload image');
        console.error(err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/api/organizer/events/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update event');

      router.push('/organizer/dashboard');
      router.refresh();
    } catch (err) {
      setError('Failed to update event');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">Edit Event</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Event Name
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
            rows={4}
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Date & Time
            </label>
            <input
              type="datetime-local"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Date & Time
            </label>
            <input
              type="datetime-local"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Venue
            </label>
            <select
              name="venueId"
              value={formData.venueId}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select a venue</option>
              {venues.map(venue => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}, {venue.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Artist
            </label>
            <select
              name="artistId"
              value={formData.artistId}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Select an artist</option>
              {artists.map(artist => (
                <option key={artist.id} value={artist.id}>
                  {artist.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Event Image
          </label>
          {formData.thumbnail && (
            <img
              src={formData.thumbnail}
              alt="Event thumbnail"
              className="mt-2 h-32 w-auto object-cover rounded-md"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
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
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
} 