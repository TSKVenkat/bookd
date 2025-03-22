'use client';

import { useState } from 'react';
import { Tab } from '@headlessui/react';
import TicketTypes from '@/components/dashboard/organizer/TicketTypes';
import SeatMap from '@/components/dashboard/organizer/SeatMap';

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function ManageEvent({ params }: { params: { id: string } }) {
  const [selectedTab, setSelectedTab] = useState(0);

  const tabs = [
    { name: 'Ticket Types', component: <TicketTypes eventId={params.id} /> },
    { name: 'Seat Map', component: <SeatMap eventId={params.id} /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
            <Tab.List className="flex p-1 space-x-1 bg-gray-100 rounded-t-lg">
              {tabs.map((tab) => (
                <Tab
                  key={tab.name}
                  className={({ selected }) =>
                    classNames(
                      'w-full py-3 px-4 text-sm font-medium rounded-lg',
                      'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60',
                      selected
                        ? 'bg-white text-blue-600 shadow'
                        : 'text-gray-600 hover:bg-white/[0.12] hover:text-blue-600'
                    )
                  }
                >
                  {tab.name}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="p-4">
              {tabs.map((tab, idx) => (
                <Tab.Panel
                  key={idx}
                  className={classNames(
                    'rounded-xl p-3',
                    'focus:outline-none focus:ring-2 ring-offset-2 ring-offset-blue-400 ring-white ring-opacity-60'
                  )}
                >
                  {tab.component}
                </Tab.Panel>
              ))}
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>
    </div>
  );
} 