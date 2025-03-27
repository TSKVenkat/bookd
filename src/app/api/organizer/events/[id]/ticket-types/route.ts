import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const { id: eventId } = params;

    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
    });

    if (!organizer) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }

    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
        organizerId: organizer.id
      }
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        eventId: eventId
      }
    });

    return NextResponse.json(ticketTypes);
  } catch (error) {
    console.error("Error fetching ticket types:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await validateSessionFromCookies();
    
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    
    const { id: eventId } = params;
    
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id }
    });

    if (!organizer) {
      return NextResponse.json({ error: "Organizer not found" }, { status: 404 });
    }

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
    const { name, description, price } = body;

    if (!name || typeof price !== 'number') {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const ticketType = await prisma.ticketType.create({
      data: {
        name,
        description: description || null,
        price,
        color: body.color || '#3B82F6', // Default blue color if not provided
        event: {
          connect: { id: eventId }
        }
      }
    });

    return NextResponse.json(ticketType, { status: 201 });
  } catch (error) {
    console.error("Error creating ticket type:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}