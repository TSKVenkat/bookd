import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export const runtime = 'nodejs';

// GET - Get a specific ticket type
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; typeId: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    
    // Check if user is authenticated
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Use destructuring instead of awaiting params
    const { id: eventId, typeId } = params;
    
    // Check if organizer exists
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
    });
    
    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }
    
    // Check if event exists and belongs to the organizer
    const event = await prisma.event.findUnique({
      where: { 
        id: eventId,
        organizerId: organizer.id
      }
    });
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    
    // Get the ticket type
    const ticketType = await prisma.ticketType.findUnique({
      where: { 
        id: typeId,
        eventId
      }
    });
    
    if (!ticketType) {
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(ticketType);
  } catch (error) {
    console.error('Error fetching ticket type:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// PUT - Update a ticket type
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; typeId: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Use destructuring instead of awaiting params
    const { id: eventId, typeId } = params;
    
    // Check if organizer exists
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
    });
    
    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }
    
    // Check if event exists and belongs to the organizer
    const event = await prisma.event.findUnique({
      where: { 
        id: eventId,
        organizerId: organizer.id
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
        { error: 'Cannot modify ticket types for past events' },
        { status: 400 }
      );
    }
    
    // Check if ticket type exists
    const existingTicketType = await prisma.ticketType.findUnique({
      where: { 
        id: typeId,
        eventId
      }
    });
    
    if (!existingTicketType) {
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }
    
    const data = await request.json();
    
    if (!data.name || data.price === undefined) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }
    
    // Ensure price is a valid number
    const price = typeof data.price === 'string' 
      ? parseFloat(data.price) 
      : data.price;
      
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a valid positive number' },
        { status: 400 }
      );
    }
    
    // Prepare the update data object with explicitly allowed fields from the schema
    const updateData = {
      name: data.name,
      price,
      description: data.description ?? existingTicketType.description,
      color: data.color || existingTicketType.color,
    };

    // Add optional fields conditionally
    if (data.isPublic !== undefined) {
      // @ts-ignore - isPublic is a valid field in the schema
      updateData.isPublic = data.isPublic;
    }
    
    if (data.capacity !== undefined) {
      const capacityValue = parseInt(String(data.capacity), 10);
      if (!isNaN(capacityValue)) {
        // @ts-ignore - capacity is a valid field in the schema
        updateData.capacity = capacityValue;
      }
    }
    
    // Update ticket type
    const updatedTicketType = await prisma.ticketType.update({
      where: { id: typeId },
      data: updateData
    });
    
    return NextResponse.json(updatedTicketType);
  } catch (error) {
    console.error('Error updating ticket type:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a ticket type
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; typeId: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Use destructuring instead of awaiting params
    const { id: eventId, typeId } = params;
    
    // Check if organizer exists
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
    });
    
    if (!organizer) {
      return NextResponse.json(
        { error: 'Organizer not found' },
        { status: 404 }
      );
    }
    
    // Check if event exists and belongs to the organizer
    const event = await prisma.event.findUnique({
      where: { 
        id: eventId,
        organizerId: organizer.id
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
        { error: 'Cannot modify ticket types for past events' },
        { status: 400 }
      );
    }
    
    // Check if ticket type exists
    const ticketType = await prisma.ticketType.findUnique({
      where: { 
        id: typeId,
        eventId
      }
    });
    
    if (!ticketType) {
      return NextResponse.json(
        { error: 'Ticket type not found' },
        { status: 404 }
      );
    }
    
    // Check if there are any seats using this ticket type
    const seatsCount = await prisma.seat.count({
      where: {
        typeId,
        SeatMap: {
          eventId
        }
      }
    });
    
    if (seatsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete ticket type that is assigned to seats' },
        { status: 400 }
      );
    }
    
    // Delete ticket type
    await prisma.ticketType.delete({
      where: { id: typeId }
    });
    
    return NextResponse.json(
      { success: true, message: 'Ticket type deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting ticket type:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
} 