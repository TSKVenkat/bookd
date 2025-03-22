import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizer = await prisma.organizer.findFirst({
      where: {
        user: {
          email: session.user.email
        },
        status: 'APPROVED'
      }
    });

    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }

    const events = await prisma.event.findMany({
      where: {
        organizerId: organizer.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const organizer = await prisma.organizer.findFirst({
      where: {
        user: {
          email: session.user.email
        },
        status: 'APPROVED'
      }
    });

    if (!organizer) {
      return NextResponse.json({ error: 'Organizer not found' }, { status: 404 });
    }

    const data = await request.json();
    const { title, description, date, venue, ticketPrice, totalTickets, imageUrl } = data;

    const event = await prisma.event.create({
      data: {
        name: title,
        description,
        startDate: new Date(date),
        endDate: new Date(date),
        venueId: venue,
        artistId: "placeholder",
        thumbnail: imageUrl,
        organizerId: organizer.id
      }
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 