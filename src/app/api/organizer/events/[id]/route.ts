import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        organizerId: organizer.id
      },
      include: {
        venue: true,
        artist: true
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if event exists and belongs to the organizer
    const existingEvent = await prisma.event.findFirst({
      where: {
        id: params.id,
        organizerId: organizer.id
      }
    });

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const data = await request.json();
    const { name, description, startDate, endDate, venueId, artistId, thumbnail } = data;

    const event = await prisma.event.update({
      where: {
        id: params.id
      },
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        venueId,
        artistId,
        thumbnail
      }
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Check if event exists and belongs to the organizer
    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        organizerId: organizer.id
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if event has any bookings
    const bookingsCount = await prisma.booking.count({
      where: {
        eventId: params.id
      }
    });

    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete event with existing bookings' },
        { status: 400 }
      );
    }

    // Delete the event
    await prisma.event.delete({
      where: {
        id: params.id
      }
    });

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 