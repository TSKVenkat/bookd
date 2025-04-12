import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';
import { sendTicketSaleNotification, sendTicketConfirmation } from '@/lib/email';

export const runtime = 'nodejs';

// Define interfaces for proper typing
interface TicketType {
  id: string;
  name: string;
  price: number | string;
  color: string;
  description?: string;
}

interface ExtendedTicket {
  id: string;
  bookingId: string;
  seatId?: string;
  typeId?: string;
  qrCode: string;
  status: string;
  eventId?: string;
  seat?: any;
  booking?: any;
  ticketType?: TicketType;
}

// GET - Fetch tickets for an event with seat information
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const eventId = await params.id;

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Verify organizer owns this event
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id },
    });
    
    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }

    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizerId: organizer.id,
      },
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get tickets for this event (using a direct query to avoid schema issues)
    const tickets = await prisma.$queryRaw`
      SELECT t.*, s.*
      FROM "Ticket" t
      LEFT JOIN "Seat" s ON t."seatId" = s.id
      WHERE t."eventId" = ${eventId}
    ` as ExtendedTicket[];

    // Fetch booking user details separately
    const bookingIds = [...new Set(tickets.map(ticket => ticket.bookingId))];
    const bookings = await prisma.booking.findMany({
      where: {
        id: {
          in: bookingIds
        }
      },
      include: {
        User: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    // Assuming tickets have typeId that might not be in the schema
    // Fetch ticket types separately using raw query if needed
    const ticketTypeIds = await prisma.$queryRaw`
      SELECT DISTINCT "typeId" FROM "Ticket" WHERE "eventId" = ${eventId}
    ` as { typeId: string }[];
    
    const typeIds = ticketTypeIds.map(t => t.typeId).filter(Boolean);
    
    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        id: {
          in: typeIds
        }
      }
    });

    // Create maps for quick lookup
    const ticketTypeMap = ticketTypes.reduce((acc, type) => {
      acc[type.id] = type;
      return acc;
    }, {} as Record<string, any>);

    const bookingMap = bookings.reduce((acc, booking) => {
      acc[booking.id] = booking;
      return acc;
    }, {} as Record<string, any>);

    // Transform the data to match the expected format in the frontend
    const formattedTickets = tickets.map(ticket => {
      const booking = bookingMap[ticket.bookingId];
      const typeId = (ticket as any).typeId;
      return {
        ...ticket,
        ticketType: typeId ? ticketTypeMap[typeId] : null,
        booking: booking ? {
          ...booking,
          userEmail: booking?.User?.email,
          userName: booking?.User?.name
        } : null
      };
    });

    return NextResponse.json(formattedTickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
}

// POST - Issue tickets manually
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const eventId = await params.id;

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Verify organizer owns this event
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id },
      include: { user: true }
    });
    
    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }

    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizerId: organizer.id,
      },
      include: {
        venue: true,
        SeatMap: true
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if event date has passed
    const currentDate = new Date();
    if (event.startDate < currentDate) {
      return NextResponse.json(
        { error: 'Cannot sell tickets for past events' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { tickets, customerInfo } = data;

    if (!tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return NextResponse.json(
        { error: 'At least one ticket is required' },
        { status: 400 }
      );
    }

    if (!customerInfo || !customerInfo.email || !customerInfo.name) {
      return NextResponse.json(
        { error: 'Customer information is required' },
        { status: 400 }
      );
    }

    let totalAmount = 0;
    const ticketDetails = [];

    // Verify all ticket types exist and calculate total
    for (const ticket of tickets) {
      const ticketType = await prisma.ticketType.findUnique({
        where: {
          id: ticket.typeId,
          eventId,
        },
      });

      if (!ticketType) {
        return NextResponse.json(
          { error: `Ticket type with ID ${ticket.typeId} not found` },
          { status: 404 }
        );
      }

      // If seat is specified, verify it exists and is available
      if (ticket.seatId) {
        const seat = await prisma.seat.findUnique({
          where: {
            id: ticket.seatId,
          },
        });

        if (!seat) {
          return NextResponse.json(
            { error: `Seat with ID ${ticket.seatId} not found` },
            { status: 404 }
          );
        }

        if (seat.status !== 'available') {
          return NextResponse.json(
            { error: `Seat ${seat.row}${seat.number} is not available` },
            { status: 400 }
          );
        }
      }

      // Convert Decimal to number before using += operator
      totalAmount += Number(ticketType.price);
      ticketDetails.push({
        typeId: ticket.typeId,
        seatId: ticket.seatId,
        ticketType
      });
    }

    // Generate a unique booking reference
    const bookingReference = `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // Find or create customer user account
    let userId = user.id; // Default to organizer's user ID for now
    
    // Generate QR codes for tickets
    const generateQrCode = () => `TICKET-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    // Create booking and tickets in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Create booking
      const newBooking = await tx.booking.create({
        data: {
          eventId,
          userId, // Use the found or created user's ID
          totalAmount,
          status: 'COMPLETED',
          ticketCount: tickets.length,
        },
      });

      // Create tickets and update seat status using raw queries if needed to handle schema mismatches
      for (const ticket of tickets) {
        // Create a new ticket with proper fields
        const newTicket = await tx.ticket.create({
          data: {
            bookingId: newBooking.id,
            seatId: ticket.seatId || null,
            qrCode: generateQrCode(), // Generate unique QR code
            status: 'ACTIVE'
          } as any // Use type assertion to bypass schema checks
        });
        
        // Manually set the typeId and eventId if they don't exist in the schema
        if (newTicket.id) {
          await tx.$executeRaw`
            UPDATE "Ticket" 
            SET "typeId" = ${ticket.typeId}, "eventId" = ${eventId}
            WHERE id = ${newTicket.id}
          `;
        }

        if (ticket.seatId) {
          await tx.seat.update({
            where: { id: ticket.seatId },
            data: { status: 'sold' }
          });
        }
      }

      // Update seat map if needed (handle in another way)
      if (event.SeatMap) {
        console.log(`Updating seat availability for event ${eventId}`);
      }

      return newBooking;
    });

    // Get ticket details with raw query to handle schema issues
    const ticketsWithDetails = await prisma.$queryRaw`
      SELECT t.*, s.*
      FROM "Ticket" t
      LEFT JOIN "Seat" s ON t."seatId" = s.id
      WHERE t."bookingId" = ${booking.id}
    ` as ExtendedTicket[];

    // Get ticket types separately
    const typeIds = [...new Set(ticketsWithDetails.map(t => (t as any).typeId).filter(Boolean))];
    const types = await prisma.ticketType.findMany({
      where: { id: { in: typeIds } }
    });

    // Combine the data
    const enrichedTickets = ticketsWithDetails.map(ticket => ({
      ...ticket,
      ticketType: types.find(t => t.id === (ticket as any).typeId)
    }));

    // Send notification to organizer
    sendTicketSaleNotification(
      organizer.user.email,
      event.name,
      tickets.length,
      totalAmount,
      customerInfo.name
    );

    // Send confirmation to customer
    sendTicketConfirmation(
      customerInfo.email,
      event.name,
      event.startDate,
      event.venue.name,
      enrichedTickets,
      totalAmount,
      bookingReference
    );

    // Log this ticket sale
    await prisma.adminAuditLog.create({
      data: {
        id: `LOG-${Date.now()}`, // Generate a unique ID
        adminId: user.id,
        action: 'SELL_TICKETS',
        resourceType: 'BOOKING',
        resourceId: booking.id,
        details: JSON.stringify({
          eventId,
          bookingId: booking.id,
          ticketCount: tickets.length,
          totalAmount,
          timestamp: new Date()
        })
      }
    });

    // Return the response
    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        totalAmount: booking.totalAmount,
        ticketCount: tickets.length,
        // Add these for API compatibility
        customerName: customerInfo.name,
        customerEmail: customerInfo.email,
        reference: bookingReference
      }
    });
  } catch (error) {
    console.error('Error creating tickets:', error);
    return NextResponse.json(
      { error: 'Failed to create tickets' },
      { status: 500 }
    );
  }
} 