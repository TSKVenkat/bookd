# Interactive Seat Map for Bookd

## Overview

The Interactive Seat Map is a feature-rich component that enables event organizers to create and manage complex venue layouts with support for both rectangular and curved seating sections. This README explains the architecture and usage of the seat map components.

## Features

- **Interactive Drawing**: Create seats, rectangular sections, and curved (arc) sections
- **Zoom and Pan**: Navigate large venue layouts with ease
- **Section Management**: Define properties like row count, seats per row, and naming conventions
- **Ticket Type Integration**: Assign ticket types to seats with visual color coding
- **Seat Organization**: Automatic seat generation with consistent row/number labels
- **Accessibility**: Keyboard controls and screen reader support
- **Real-time Updates**: Changes reflect immediately in the user interface

## Components

### Main Components

1. **EnhancedVenueLayoutEditor**: The main container component that orchestrates the editor experience
2. **InteractiveSeatMap**: Manages the canvas, zoom/pan functionality, and editing modes
3. **InteractiveSeat**: Renders individual seats with proper styling and interaction handling
4. **InteractiveSection**: Renders sections (rectangular or arc) with proper styling
5. **ArcSectionEditor**: Specialized editor for curved seating sections
6. **TicketTypeManager**: Interface for creating and managing ticket types
7. **DrawTools**: Handles drawing new seats and sections

### Hooks

1. **useZoomAndPan**: Manages zoom and pan functionality for the canvas
2. **useSeatMapKeyboard**: Provides keyboard shortcuts and accessibility features

### State Management

The application uses Zustand for state management with the following stores:

- **seatMapStore**: Manages seats, sections, layout settings, and editor state

## Database Schema

The seat map data is stored in the following tables:

- **SeatMap**: Stores the overall layout configuration
- **Section**: Stores section data including positioning and sizing
- **Seat**: Stores individual seat data including position and ticket type

## Getting Started

### Prerequisites

- Node.js 14+
- Dependencies: uuid, framer-motion

### Installation

1. Ensure the database schema is up to date:
   ```
   npx prisma migrate dev
   ```

2. Install the necessary dependencies:
   ```
   npm install uuid framer-motion
   ```

### Usage

1. Import the EnhancedVenueLayoutEditor component:
   ```tsx
   import EnhancedVenueLayoutEditor from '@/components/dashboard/organizer/venue/EnhancedVenueLayoutEditor';
   ```

2. Use the component in your page:
   ```tsx
   <EnhancedVenueLayoutEditor
     eventId="your-event-id"
     initialLayout={seatmapData}
     ticketTypes={ticketTypesData}
   />
   ```

## API Reference

### API Endpoints

- **GET /api/organizer/events/[eventId]/seatmap**: Retrieve the seat map for an event
- **POST /api/organizer/events/[eventId]/seatmap**: Create or update a seat map

## Contributing

1. Follow the existing code style and patterns
2. Ensure all components are properly typed with TypeScript
3. Test thoroughly, especially for edge cases in layout calculations

## Future Improvements

- Add support for multiple floors/levels
- Implement undo/redo functionality
- Add more visualization options for different venue types
- Support for custom seat shapes
- Implement seat filtering by attributes
- Add reporting and statistics for ticket sales by section 