'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Tab } from '@headlessui/react';
import TicketTypes from '@/components/dashboard/organizer/TicketTypes';
import SeatMap from '@/components/dashboard/organizer/SeatMap';

// Helper function for dynamic class names
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ManageEvent() {
  // Use the Next.js useParams hook to properly handle params
  const params = useParams();
  const eventId = params.id as string;
  
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Event</h1>

      <Tab.Group selectedIndex={selectedIndex} onChange={setSelectedIndex}>
        <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1">
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white shadow text-blue-700'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            Ticket Types
          </Tab>
          <Tab
            className={({ selected }) =>
              classNames(
                'w-full rounded-lg py-2.5 text-sm font-medium leading-5',
                'ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2',
                selected
                  ? 'bg-white shadow text-blue-700'
                  : 'text-blue-100 hover:bg-white/[0.12] hover:text-white'
              )
            }
          >
            Seat Map
          </Tab>
        </Tab.List>
        <Tab.Panels className="mt-6">
          <Tab.Panel className="rounded-xl bg-white p-3 focus:outline-none">
            <TicketTypes eventId={eventId} />
          </Tab.Panel>
          <Tab.Panel className="rounded-xl bg-white p-3 focus:outline-none">
            <SeatMap eventId={eventId} />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
} 