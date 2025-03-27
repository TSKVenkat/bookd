import TicketTypeManager from './TicketTypeManager';

interface TicketTypesProps {
  eventId: string;
}

export default function TicketTypes({ eventId }: TicketTypesProps) {
  return <TicketTypeManager eventId={eventId} />;
} 