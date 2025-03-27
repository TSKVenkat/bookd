// app/api/organizer/events/venues/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export const runtime = 'nodejs';

// GET handler for fetching venues
export async function GET() {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const organizer = await prisma.organizer.findFirst({
      where: { 
        userId: user.id, 
        status: "APPROVED"
      }
    });
    
    if (!organizer) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }
    
    // Get all venues
    const venues = await prisma.venue.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(venues);
  } catch (error) {
    console.error("Error fetching venues:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST handler for creating a new venue
export async function POST(request: NextRequest) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const organizer = await prisma.organizer.findFirst({
      where: { 
        userId: user.id,
        status: "APPROVED" 
      }
    });
    
    if (!organizer) {
      return NextResponse.json({ error: "Organizer not found or not approved" }, { status: 403 });
    }
    
    const body = await request.json();
    
    const { 
      name, 
      address, 
      city, 
      state, 
      country, 
      pinCode,
      capacity,
      description,
      thumbnail,
      latitude,
      longitude
    } = body;
    
    if (!name || !address || !city || !capacity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const venue = await prisma.venue.create({
      data: {
        organizerId: organizer.id,
        name,
        address,
        city,
        state: state || null,
        country: country || null,
        pinCode: pinCode || null,
        capacity: parseInt(capacity),
        description: description || null,
        thumbnail: thumbnail || null,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null
      }
    });
    
    return NextResponse.json(venue, { status: 201 });
  } catch (error) {
    console.error("Error creating venue:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}