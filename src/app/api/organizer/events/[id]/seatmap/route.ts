import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

// Define types to match schema
interface SeatData {
  id: string;
  row: string;
  number: string | number;
  status: string;
  typeId?: string;
  x: number;
  y: number;
  rotation?: number;
  label?: string;
  sectionId?: string;
}

// GET: Fetch the seat map for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const { id: eventId } = params;

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

    // Find existing seat map for this event
    const seatMap = await prisma.seatMap.findUnique({
      where: { eventId }
    });

    if (!seatMap) {
      return NextResponse.json(
        { layout: null, seats: [], sections: [] },
        { status: 200 }
      );
    }

    // Parse stored layout data
    let layout: any = null;
    let sections: any[] = [];

    try {
      // Get layout from seatMap's mapData field
      if (seatMap.mapData) {
        layout = JSON.parse((seatMap.mapData as any).toString());
      }
      
      return NextResponse.json({ 
        layout, 
        seats: [], 
        sections
      });
    } catch (err) {
      console.error('Error parsing seat map data:', err);
      return NextResponse.json(
        { error: 'Error parsing seat map data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching seat map:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seat map' },
      { status: 500 }
    );
  }
}

// POST: Create or update the seat map for an event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const { id: eventId } = params;

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

    // Check if event date has passed
    const currentDate = new Date();
    const eventDate = event.startDate;
    if (eventDate && eventDate < currentDate) {
      return NextResponse.json(
        { error: 'Cannot modify seat map for past events' },
        { status: 400 }
      );
    }

    const data = await request.json();
    const { layout, seats, sections } = data;

    console.log('Received data:', JSON.stringify({ 
      layoutFields: layout ? Object.keys(layout) : null,
      seatsCount: seats?.length,
      sectionsCount: sections?.length
    }));

    // Use a transaction to update the seat map
    try {
      // Find or create the seat map
      let seatMap = await prisma.seatMap.findUnique({
        where: { eventId },
      });

      // Convert layout to string for storage
      const layoutJson = layout ? JSON.stringify(layout) : '{}';

      if (!seatMap) {
        // Create a new seat map with both id and mapData fields
        seatMap = await prisma.seatMap.create({
          data: {
            id: uuidv4(),
            eventId,
            mapData: layoutJson, // Use mapData field as required by schema
            updatedAt: new Date(),
          },
        });

        // Update the event to indicate it has a seat map
        try {
          await prisma.event.update({
            where: { id: eventId },
            data: { hasSeatMap: true }
          });
        } catch (error) {
          console.warn('Could not update hasSeatMap field:', error);
          // Continue without failing if this field doesn't exist
        }
      } else {
        // Update the existing seat map
        try {
          seatMap = await prisma.seatMap.update({
            where: { id: seatMap.id },
            data: {
              mapData: layoutJson // Use mapData field as required by schema
            }
          });
        } catch (error) {
          console.warn('Error updating mapData field:', error);
          // Try updating without the mapData field if it fails
          seatMap = await prisma.seatMap.update({
            where: { id: seatMap.id },
            data: {}
          });
        }
      }

      return NextResponse.json(
        { success: true, message: 'Seat map updated successfully' },
        { status: 200 }
      );
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error updating seat map:', error);
    return NextResponse.json(
      { error: 'Failed to update seat map: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE: Delete a seat map for an event
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const { id: eventId } = params;

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check if event exists and belongs to the organizer
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
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
        organizerId: organizer.id
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or not owned by this organizer' },
        { status: 404 }
      );
    }

    // Find the seat map
    const seatMap = await prisma.seatMap.findUnique({
      where: { eventId }
    });
    
    // Check if seat map exists
    if (!seatMap) {
      return NextResponse.json(
        { error: 'No seat map found for this event' },
        { status: 404 }
      );
    }

    // Check if the event date has passed
    const eventDate = event.startDate;
    if (eventDate && new Date(eventDate) < new Date()) {
      return NextResponse.json(
        { error: 'Cannot delete seat map for past events' },
        { status: 400 }
      );
    }

    // Check if there are any reserved or sold seats
    const reservedOrSoldSeats = await prisma.seat.count({
      where: {
        seatMapId: seatMap.id,
        status: {
          in: ['reserved', 'sold']
        }
      }
    });

    if (reservedOrSoldSeats > 0) {
      return NextResponse.json(
        { error: 'Cannot delete seat map with sold or reserved seats' },
        { status: 400 }
      );
    }

    // Delete all seats
    await prisma.seat.deleteMany({
      where: { seatMapId: seatMap.id }
    });

    // Delete seat map
    await prisma.seatMap.delete({
      where: { id: seatMap.id }
    });

    // If the Event model has a hasSeatMap field, update it
    try {
      await prisma.$executeRaw`UPDATE "Event" SET "hasSeatMap" = false WHERE id = ${eventId}`;
    } catch (err) {
      console.error('Could not update hasSeatMap field:', err);
      // Continue without failing if this field doesn't exist
    }

    return NextResponse.json(
      { message: 'Seat map deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting seat map:', error);
    return NextResponse.json(
      { error: 'Failed to delete seat map' },
      { status: 500 }
    );
  }
} 