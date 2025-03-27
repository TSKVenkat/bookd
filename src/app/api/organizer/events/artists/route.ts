// app/api/organizer/events/artists/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export const runtime = 'nodejs';

// GET handler for fetching artists
export async function GET() {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    
    // Get all artists
    const artists = await prisma.artist.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    return NextResponse.json(artists);
  } catch (error) {
    console.error("Error fetching artists:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST handler for creating a new artist
export async function POST(request: NextRequest) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      description, 
      genre,
      thumbnail
    } = body;
    
    if (!name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    const artist = await prisma.artist.create({
      data: {
        name,
        description: description || null,
        genre: genre || null,
        thumbnail: thumbnail || null,
        createdBy: organizer.id
      }
    });
    
    return NextResponse.json(artist, { status: 201 });
  } catch (error) {
    console.error("Error creating artist:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}