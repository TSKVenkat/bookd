import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const organizer = await prisma.organizer.findUnique({
      where: { 
        userId: user.id, 
        status: 'APPROVED'
      },
    });
    
    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }
    
    const events = await prisma.event.findMany({
      where: { organizerId: organizer.id },
      include: {
        venue: {
          select: {
            name: true,
            city: true,
          }
        },
        artist: {
          select: {
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const organizer = await prisma.organizer.findUnique({
      where: { 
        userId: user.id,
        status: 'APPROVED' 
      },
    });
    
    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found or not approved' }, { status: 403 });
    }
    
    // Log the request body for debugging
    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);
    
    // Parse the body
    const body = JSON.parse(rawBody);
    console.log('Parsed request body:', body);
    
    // Extract fields based on actual schema
    const { 
      name,               // Changed from title to name
      description, 
      startDate,          // Changed from date to startDate
      endDate,            // Added endDate
      venueId,            // Changed from venue to venueId
      artistId,           // Keep as is
      thumbnail           // Changed from imageUrl to thumbnail
    } = body;
    
    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    
    if (!startDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }
    
    if (!venueId) {
      return NextResponse.json({ error: 'Venue is required' }, { status: 400 });
    }
    
    // Verify venue exists
    const venue = await prisma.venue.findUnique({
      where: { id: venueId }
    });
    
    if (!venue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    
    // Verify artist exists if provided
    if (artistId) {
      const artist = await prisma.artist.findUnique({
        where: { id: artistId }
      });
      
      if (!artist) {
        return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
      }
    }
    
    // Create the event
    const event = await prisma.event.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : new Date(new Date(startDate).getTime() + (2 * 60 * 60 * 1000)),
        organizerId: organizer.id,
        venueId,
        artistId: artistId || undefined,
        thumbnail,
      }
    });
    
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}