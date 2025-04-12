import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';

export const runtime = 'nodejs';

// GET - Fetch venue layout configuration for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const { id: eventId } = params;

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Verify organizer owns this event
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id },
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
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Find configuration in SeatMap
    const seatMap = await prisma.seatMap.findUnique({
      where: { eventId },
    });

    if (!seatMap) {
      // Return a default configuration if none exists
      return NextResponse.json({
        layout: {
          name: 'Default Layout',
          rows: 10,
          columns: 15,
          seatSize: 25,
          venueType: 'seated',
          rowLabels: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
        },
        stageConfig: {
          name: 'Main Stage',
          shape: 'rectangle',
          width: 300,
          height: 100,
          x: 200,
          y: 50,
        },
        mapData: {
          stageName: 'Main Stage',
        }
      }, { status: 200 });
    }

    // Extract layout and stageConfig from their respective fields
    const layout = seatMap.layout ? JSON.parse(seatMap.layout) : {
      name: 'Default Layout',
      rows: 10,
      columns: 15,
      seatSize: 25,
      venueType: 'seated',
      rowLabels: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
    };
    
    const stageConfig = seatMap.stageConfig ? JSON.parse(seatMap.stageConfig) : {
      name: 'Main Stage',
      shape: 'rectangle',
      width: 300,
      height: 100,
      x: 200,
      y: 50,
    };
    
    // Construct default mapData
    const mapData = {
      stageName: stageConfig.name || 'Main Stage',
    };
    
    return NextResponse.json({
      layout,
      stageConfig,
      mapData
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching venue configuration:', error);
    return NextResponse.json(
      { error: 'Failed to fetch venue configuration' },
      { status: 500 }
    );
  }
}

// POST - Create or update venue layout configuration
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await validateSessionFromCookies();
    const { id: eventId } = params;

    if (!user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Verify organizer owns this event
    const organizer = await prisma.organizer.findUnique({
      where: { userId: user.id },
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
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if event date has passed
    const currentDate = new Date();
    if (event.startDate < currentDate) {
      return NextResponse.json(
        { error: 'Cannot modify configuration for past events' },
        { status: 400 }
      );
    }

    const requestData = await request.json();
    const { layout, stageConfig } = requestData;
    
    // Prepare data for Prisma
    const seatMapData = {
      layout: layout ? JSON.stringify(layout) : null,
      stageConfig: stageConfig ? JSON.stringify(stageConfig) : null,
    };

    // Store configuration in SeatMap
    let seatMap = await prisma.seatMap.findUnique({
      where: { eventId },
    });

    if (!seatMap) {
      // Create a new SeatMap
      seatMap = await prisma.seatMap.create({
        data: {
          eventId,
          ...seatMapData,
          event: {
            connect: {
              id: eventId
            }
          }
        }
      });
    } else {
      // Update existing SeatMap
      seatMap = await prisma.seatMap.update({
        where: { id: seatMap.id },
        data: seatMapData
      });
    }

    return NextResponse.json(
      { success: true, message: 'Configuration saved successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error saving venue configuration:', error);
    return NextResponse.json(
      { error: 'Failed to save venue configuration' },
      { status: 500 }
    );
  }
} 