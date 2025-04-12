import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateSessionFromCookies } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

// GET - Fetch analytics data for an event
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
      include: {
        SeatMap: true,
        ticketTypes: true
      }
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get booking statistics
    const bookingsStats = await prisma.booking.aggregate({
      where: { eventId },
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    // Count tickets
    const ticketCount = await prisma.ticket.count({
      where: { eventId }
    });

    // Calculate sales by ticket type
    const ticketTypeStats = await Promise.all(
      event.ticketTypes.map(async (type) => {
        const count = await prisma.ticket.count({
          where: { 
            eventId,
            typeId: type.id 
          }
        });
        
        return {
          name: type.name,
          value: count * Number(type.price),
          count,
          color: type.color
        };
      })
    );

    // Get sales by day
    const bookings = await prisma.booking.findMany({
      where: { eventId },
      select: {
        createdAt: true,
        totalAmount: true
      }
    });

    const salesByDay: { [key: string]: number } = {};
    bookings.forEach(booking => {
      const date = new Date(booking.createdAt).toISOString().split('T')[0];
      if (!salesByDay[date]) {
        salesByDay[date] = 0;
      }
      salesByDay[date] += booking.totalAmount;
    });

    const salesByDayArray = Object.entries(salesByDay).map(([date, sales]) => ({
      date,
      sales
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Calculate occupancy rate
    let occupancyRate = 0;
    let totalSeats = 0;
    
    if (event.SeatMap?.mapData) {
      try {
        const mapData = JSON.parse(String(event.SeatMap.mapData));
        totalSeats = mapData.totalSeats || 0;
      } catch (e) {
        console.error('Error parsing seat map data:', e);
      }
    }
    
    if (totalSeats > 0) {
      occupancyRate = Math.round((ticketCount / totalSeats) * 100);
    }

    // Prepare analytics data
    const analyticsData = {
      totalSales: bookingsStats._sum.totalAmount || 0,
      totalTickets: ticketCount,
      occupancyRate,
      salesByTicketType: ticketTypeStats,
      salesByDay: salesByDayArray
    };

    // Log this analytics request
    await prisma.adminAuditLog.create({
      data: {
        id: uuidv4(),
        adminId: user.id,
        action: 'VIEW_ANALYTICS',
        resourceType: 'EVENT',
        resourceId: eventId,
        details: JSON.stringify({
          eventId,
          timestamp: new Date()
        })
      }
    });

    return NextResponse.json(analyticsData, { status: 200 });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
} 