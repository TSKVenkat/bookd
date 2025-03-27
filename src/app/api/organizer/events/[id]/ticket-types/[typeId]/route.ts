import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string; typeId: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const organizer = await prisma.organizer.findFirst({
      where: {
        userId: user.id,
        status: 'APPROVED'
      }
    });
    
    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }
    
    // Ensure params is properly awaited
    const { id: eventId, typeId } = params;
    
    // Check if event belongs to the organizer
    const event = await prisma.event.findFirst({
      where: { 
        id: eventId,
        organizerId: organizer.id
      },
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Get the specific ticket type
    const ticketType = await prisma.ticketType.findUnique({
      where: { 
        id: typeId,
        eventId
      }
    });
    
    if (!ticketType) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
    }
    
    return NextResponse.json(ticketType);
  } catch (error) {
    console.error('Error fetching ticket type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string; typeId: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const organizer = await prisma.organizer.findFirst({
      where: {
        userId: user.id,
        status: 'APPROVED'
      }
    });
    
    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }
    
    // Ensure params is properly awaited
    const { id: eventId, typeId } = params;
    
    // Check if event belongs to the organizer
    const event = await prisma.event.findFirst({
      where: { 
        id: eventId,
        organizerId: organizer.id
      }
    });
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    
    // Check if ticket type exists
    const existingTicketType = await prisma.ticketType.findUnique({
      where: { 
        id: typeId,
        eventId
      }
    });
    
    if (!existingTicketType) {
      return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
    }
    
    const body = await request.json();
    const { name, description, price, color } = body;
    
    if (!name || typeof price !== 'number' || price <= 0) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
    }
    
    // Update ticket type
    const updatedTicketType = await prisma.ticketType.update({
      where: { id: typeId },
      data: {
        name,
        description,
        price,
        color: color || '#3B82F6'
      }
    });
    
    return NextResponse.json(updatedTicketType);
  } catch (error) {
    console.error('Error updating ticket type:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; typeId: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    // Ensure params is properly awaited
    const { id: eventId, typeId } = params;
    
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
    
    // Check if the ticket type exists
    const ticketType = await prisma.ticketType.findUnique({
      where: {
        id: typeId,
        eventId
      }
    });
    
    if (!ticketType) {
      return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
    }
    
    // Check if ticket type is in use by any seats
    const seatCount = await prisma.seat.count({
      where: {
        typeId
      }
    });
    
    if (seatCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete ticket type that is in use by seats" },
        { status: 400 }
      );
    }
    
    // Delete the ticket type
    await prisma.ticketType.delete({
      where: {
        id: typeId
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ticket type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 