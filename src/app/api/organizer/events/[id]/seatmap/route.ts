import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export const runtime = 'nodejs';

// GET handler to fetch the seat map for an event
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    // Ensure params is properly awaited
    const { id: eventId } = params;
    
    // Verify the organizer
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
    });
    
    if (!organizer) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }
    
    // Check if the event belongs to the organizer
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizerId: organizer.id
      }
    });
    
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    
    // First find if a seatmap exists for this event
    const seatMap = await prisma.seatMap.findUnique({
      where: { eventId },
      include: {
        seats: {
          include: {
            ticketType: true
          }
        }
      }
    });
    
    if (!seatMap) {
      return NextResponse.json([]);
    }
    
    // Add position data from mapData to the seats
    const seatsWithPositions = seatMap.seats.map(seat => {
      // Find position data for this seat in mapData
      const positionData = seatMap.mapData?.seatPositions?.[`${seat.row}-${seat.number}`] || {};
      
      return {
        ...seat,
        x: positionData.x,
        y: positionData.y
      };
    });
    
    return NextResponse.json(seatsWithPositions);
  } catch (error) {
    console.error("Error fetching seat map:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST handler to create or update seats for an event
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    // Ensure params is properly awaited
    const { id: eventId } = params;
    
    // Verify the organizer
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
    });
    
    if (!organizer) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }
    
    // Check if the event belongs to the organizer
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizerId: organizer.id
      }
    });
    
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    
    const body = await request.json();
    const { seats, mapData } = body;
    
    if (!Array.isArray(seats)) {
      return NextResponse.json({ error: "Invalid seat data" }, { status: 400 });
    }
    
    // Prepare the seatPositions data structure to store x/y coordinates
    const seatPositions = {};
    seats.forEach(seat => {
      // Create a unique key for each seat using row and number
      const seatKey = `${seat.row}-${seat.number || seat.column}`;
      seatPositions[seatKey] = {
        x: seat.x,
        y: seat.y
      };
    });
    
    // Prepare the updated map data by merging with existing
    const updatedMapData = {
      ...(mapData || {}),
      seatPositions 
    };
    
    // First, find or create a seatmap for this event
    let seatMap = await prisma.seatMap.findUnique({
      where: { eventId }
    });
    
    if (!seatMap) {
      seatMap = await prisma.seatMap.create({
        data: {
          eventId,
          mapData: updatedMapData
        }
      });
    } else {
      // Update the existing seatmap data
      seatMap = await prisma.seatMap.update({
        where: { id: seatMap.id },
        data: { mapData: updatedMapData }
      });
    }
    
    // Delete existing seats for this seatmap
    await prisma.seat.deleteMany({
      where: {
        seatMapId: seatMap.id
      }
    });
    
    // Create new seats (without x and y as they're not in the schema)
    const createdSeats = await prisma.seat.createMany({
      data: seats.map((seat: any) => ({
        seatMapId: seatMap!.id,
        row: seat.row,
        number: seat.number || seat.column, // Support both number and column
        typeId: seat.ticketTypeId || seat.typeId, // Support both typeId formats
        status: seat.status || 'available'
      }))
    });
    
    return NextResponse.json({ 
      success: true, 
      count: createdSeats.count,
      seatMapId: seatMap.id
    });
  } catch (error) {
    console.error("Error updating seat map:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 