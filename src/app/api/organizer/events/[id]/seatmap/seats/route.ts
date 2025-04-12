import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export const runtime = 'nodejs';

// GET: Fetch all seats for a seat map
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

    // Check if the user is the organizer of this event
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
      },
      include: {
        SeatMap: true
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or not owned by this organizer' },
        { status: 404 }
      );
    }

    // Using type assertion to bypass TypeScript errors
    const seatMap = (event as any).SeatMap;

    if (!seatMap) {
      return NextResponse.json(
        { seats: [] },
        { status: 200 }
      );
    }

    // Fetch seats
    const seats = await prisma.seat.findMany({
      where: { seatMapId: seatMap.id },
      include: { ticketType: true }
    });

    return NextResponse.json(seats, { status: 200 });
  } catch (error) {
    console.error('Error fetching seats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seats' },
      { status: 500 }
    );
  }
}

// POST: Create or update seats in batch
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

    // Check if the user is the organizer of this event
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
      },
      include: {
        SeatMap: true
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or not owned by this organizer' },
        { status: 404 }
      );
    }

    // Check if the event has already occurred
    const eventDate = event.startDate;
    if (eventDate && new Date(eventDate) < new Date()) {
      return NextResponse.json(
        { error: 'Cannot modify seats for past events' },
        { status: 400 }
      );
    }

    // Using type assertion to bypass TypeScript errors
    const seatMap = (event as any).SeatMap;

    if (!seatMap) {
      return NextResponse.json(
        { error: 'No seat map found for this event' },
        { status: 404 }
      );
    }

    // Get request body
    const { seats } = await request.json();

    if (!Array.isArray(seats)) {
      return NextResponse.json(
        { error: 'Seats must be an array' },
        { status: 400 }
      );
    }

    // Get existing seats
    const existingSeats = await prisma.seat.findMany({
      where: { seatMapId: seatMap.id }
    });

    // Track operations to be performed
    const seatsToCreate = [];
    const seatsToUpdate = [];
    const keepSeatIds = seats.map((seat: any) => seat.id).filter(Boolean);
    const seatsToDelete = existingSeats.filter(seat => !keepSeatIds.includes(seat.id));

    for (const seatData of seats) {
      // Required fields validation
      if (!seatData.row || !seatData.number || !seatData.typeId) {
        continue; // Skip invalid seats
      }

      const seatRecord = {
        seatMapId: seatMap.id,
        row: seatData.row,
        number: seatData.number,
        typeId: seatData.typeId,
        x: seatData.x || 0,
        y: seatData.y || 0,
        rotation: seatData.rotation || 0,
        seatType: seatData.seatType || 'regular',
        status: seatData.status || 'available'
      };

      if (seatData.id) {
        // Update existing seat
        const existingSeat = existingSeats.find(s => s.id === seatData.id);
        if (existingSeat) {
          // Only update if seat is not reserved or sold
          if (['reserved', 'sold'].includes(existingSeat.status)) {
            continue; // Skip updating reserved or sold seats
          }
          
          seatsToUpdate.push({
            id: seatData.id,
            ...seatRecord
          });
        }
      } else {
        // Create new seat
        seatsToCreate.push(seatRecord);
      }
    }

    // Process all seat operations in a transaction
    const results = await prisma.$transaction(async (tx) => {
      // Create new seats
      const createdSeats = await Promise.all(
        seatsToCreate.map(seatData => 
          tx.seat.create({ data: seatData })
        )
      );

      // Update existing seats
      const updatedSeats = await Promise.all(
        seatsToUpdate.map(seatData => {
          const { id, ...data } = seatData;
          return tx.seat.update({
            where: { id },
            data
          });
        })
      );

      // Delete seats that are no longer needed
      // Only delete if they're not reserved or sold
      const deletableSeats = seatsToDelete.filter(
        seat => !['reserved', 'sold'].includes(seat.status)
      );
      
      const deletedCount = deletableSeats.length > 0 
        ? await tx.seat.deleteMany({
            where: {
              id: { in: deletableSeats.map(s => s.id) },
              status: { notIn: ['reserved', 'sold'] }
            }
          })
        : { count: 0 };

      return {
        created: createdSeats.length,
        updated: updatedSeats.length,
        deleted: deletedCount.count,
        skipped: seatsToDelete.length - deletableSeats.length
      };
    });

    return NextResponse.json(
      { 
        message: 'Seats updated successfully',
        results
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating seats:', error);
    return NextResponse.json(
      { error: 'Failed to update seats' },
      { status: 500 }
    );
  }
} 