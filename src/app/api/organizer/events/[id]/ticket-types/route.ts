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

    // Check if event belongs to organizer
    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        organizerId: organizer.id
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const ticketTypes = await prisma.ticketType.findMany({
      where: {
        eventId: params.id
      },
      orderBy: {
        price: 'asc'
      }
    });

    return NextResponse.json(ticketTypes);
  } catch (error) {
    console.error('Error fetching ticket types:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Check if event belongs to organizer
    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
        organizerId: organizer.id
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const data = await request.json();
    const { name, description, price, color } = data;

    const ticketType = await prisma.ticketType.create({
      data: {
        eventId: params.id,
        name,
        description,
        price,
        color
      }
    });

    return NextResponse.json(ticketType);
  } catch (error) {
    console.error('Error creating ticket type:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 