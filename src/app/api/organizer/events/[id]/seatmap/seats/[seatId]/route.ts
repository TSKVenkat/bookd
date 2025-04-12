import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export const runtime = 'nodejs';

// GET: Fetch a specific seat
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; seatId: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const { id: eventId, seatId } = params;

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

    // First check if the event exists and belongs to the organizer
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
        { error: 'No seat map found for this event' },
        { status: 404 }
      );
    }

    // Fetch the seat
    const seat = await prisma.seat.findUnique({
      where: { 
        id: seatId,
        seatMapId: seatMap.id 
      },
      include: { ticketType: true }
    });

    if (!seat) {
      return NextResponse.json(
        { error: 'Seat not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(seat, { status: 200 });
  } catch (error) {
    console.error('Error fetching seat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch seat' },
      { status: 500 }
    );
  }
}

// PUT: Update a specific seat
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; seatId: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const { id: eventId, seatId } = params;

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

    // Check if the seat exists
    const existingSeat = await prisma.seat.findUnique({
      where: { 
        id: seatId,
        seatMapId: seatMap.id 
      }
    });

    if (!existingSeat) {
      return NextResponse.json(
        { error: 'Seat not found' },
        { status: 404 }
      );
    }

    // Only allow updates if the seat is not reserved or sold
    if (['reserved', 'sold'].includes(existingSeat.status)) {
      return NextResponse.json(
        { error: 'Cannot modify reserved or sold seats' },
        { status: 400 }
      );
    }

    // Get request body
    const seatData = await request.json();

    // Validate required fields
    if (!seatData.row || !seatData.number || !seatData.typeId) {
      return NextResponse.json(
        { error: 'Row, number, and typeId are required' },
        { status: 400 }
      );
    }

    // Update the seat
    const updatedSeat = await prisma.seat.update({
      where: { id: seatId },
      data: {
        row: seatData.row,
        number: seatData.number,
        typeId: seatData.typeId,
        x: seatData.x !== undefined ? seatData.x : existingSeat.x,
        y: seatData.y !== undefined ? seatData.y : existingSeat.y,
        rotation: seatData.rotation !== undefined ? seatData.rotation : existingSeat.rotation,
        seatType: seatData.seatType || existingSeat.seatType,
        status: seatData.status || existingSeat.status
      },
      include: { ticketType: true }
    });

    return NextResponse.json(updatedSeat, { status: 200 });
  } catch (error) {
    console.error('Error updating seat:', error);
    return NextResponse.json(
      { error: 'Failed to update seat' },
      { status: 500 }
    );
  }
}

// DELETE: Delete a specific seat
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; seatId: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const { id: eventId, seatId } = params;

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

    // Check if the seat exists
    const existingSeat = await prisma.seat.findUnique({
      where: { 
        id: seatId,
        seatMapId: seatMap.id 
      }
    });

    if (!existingSeat) {
      return NextResponse.json(
        { error: 'Seat not found' },
        { status: 404 }
      );
    }

    // Only allow deletion if the seat is not reserved or sold
    if (['reserved', 'sold'].includes(existingSeat.status)) {
      return NextResponse.json(
        { error: 'Cannot delete reserved or sold seats' },
        { status: 400 }
      );
    }

    // Delete the seat
    await prisma.seat.delete({
      where: { id: seatId }
    });

    return NextResponse.json(
      { message: 'Seat deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting seat:', error);
    return NextResponse.json(
      { error: 'Failed to delete seat' },
      { status: 500 }
    );
  }
} 