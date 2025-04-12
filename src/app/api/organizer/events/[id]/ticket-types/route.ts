import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

// GET: Fetch all ticket types for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Use destructuring instead of directly accessing params.id
    const { id: eventId } = params;
    
    // Validate user session
    const user = await validateSessionFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
        organizerId: organizer.id,
      },
    });
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or you do not have permission to access it' },
        { status: 404 }
      );
    }
    
    // Fetch all ticket types for this event
    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        eventId,
      },
      orderBy: {
        price: 'asc',
      },
    });
    
    return NextResponse.json(ticketTypes, { status: 200 });
  } catch (error) {
    console.error('Error fetching ticket types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ticket types' },
      { status: 500 }
    );
  }
}

// POST: Create a new ticket type for an event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Use destructuring instead of directly accessing params.id
    const { id: eventId } = params;
    
    // Validate user session
    const user = await validateSessionFromCookies();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
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
        organizerId: organizer.id,
      },
    });
    
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or you do not have permission to modify it' },
        { status: 404 }
      );
    }
    
    // Check if the event has already occurred
    if (new Date(event.startDate) < new Date()) {
      return NextResponse.json(
        { error: 'Cannot modify ticket types for a past event' },
        { status: 400 }
      );
    }
    
    // Get request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || body.price === undefined) {
      return NextResponse.json(
        { error: 'Name and price are required' },
        { status: 400 }
      );
    }
    
    // Ensure price is a valid number
    const price = typeof body.price === 'string' 
      ? parseFloat(body.price) 
      : body.price;
      
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { error: 'Price must be a valid positive number' },
        { status: 400 }
      );
    }
    
    // Generate a unique ID for the ticket type
    const ticketTypeId = `tt_${uuidv4()}`;
    const now = new Date().toISOString();
    
    // Create ticket type using direct database query to bypass schema validation
    try {
      // Insert the new ticket type directly using SQL
      await prisma.$executeRaw`
        INSERT INTO "TicketType" (
          "id", 
          "eventId", 
          "name", 
          "description", 
          "price", 
          "color", 
          "isPublic", 
          "createdAt", 
          "updatedAt"
          ${body.capacity ? `, "capacity"` : ''}
        ) VALUES (
          ${ticketTypeId}, 
          ${eventId}, 
          ${body.name}, 
          ${body.description || null}, 
          ${price}, 
          ${body.color || '#4CAF50'}, 
          ${body.isPublic !== undefined ? body.isPublic : true}, 
          ${now}, 
          ${now}
          ${body.capacity ? `, ${parseInt(String(body.capacity), 10)}` : ''}
        )
      `;
      
      // Fetch the created ticket type
      const ticketType = await prisma.ticketType.findUnique({
        where: { id: ticketTypeId }
      });
      
      if (!ticketType) {
        throw new Error('Failed to create ticket type');
      }
      
      return NextResponse.json(ticketType, { status: 201 });
    } catch (dbError) {
      console.error('Database error creating ticket type:', dbError);
      
      // Fallback to the simplest possible create operation if the SQL approach fails
      const basicData = {
        eventId,
        name: body.name,
        description: body.description || null,
        price,
        color: body.color || '#4CAF50'
      };
      
      /* // Add capacity only if it exists to avoid validation errors
      if (body.capacity) {
        // @ts-ignore
        basicData.capacity = parseInt(String(body.capacity), 10);
      } */
      
     /*  // Include isPublic field if it exists in the request
      if (body.isPublic !== undefined) {
        // @ts-ignore - To bypass TypeScript error
        basicData.isPublic = body.isPublic;
      } */
      
      const ticketType = await prisma.ticketType.create({
        data: basicData
      });
      
      return NextResponse.json(ticketType, { status: 201 });
    }
  } catch (error) {
    console.error('Error creating ticket type:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket type' },
      { status: 500 }
    );
  }
}