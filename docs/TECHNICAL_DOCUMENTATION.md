# Hospital Tracker - Technical Documentation

## Overview
Hospital Tracker is a React-based web application that helps users locate nearby hospitals and medical facilities using real-time geolocation and OpenStreetMap data. The application provides an interactive map interface and categorized list of medical facilities within a 10km radius.

## Technical Stack

### Frontend Framework & Libraries
- React 18.2.0
- react-leaflet 4.2.1 (Map integration)
- leaflet 1.9.4 (Interactive maps)
- axios 1.7.9 (HTTP client)

### APIs
- Browser Geolocation API
- Overpass API (OpenStreetMap data)

## Component Architecture

### Main Components

1. **App.js**
   - Root component
   - Renders header and main component
   - Basic layout management

2. **HospitalMap.js**
   - Core functionality component
   - Handles geolocation
   - Manages hospital data
   - Renders map and list view

3. **ErrorBoundary.js**
   - Error handling component
   - Provides fallback UI
   - Handles component errors

### State Management


## Key Features

### 1. Geolocation
- Real-time user location tracking
- Browser's Geolocation API integration
- Error handling for location services

### 2. Hospital Search
- 10km radius search
- Categorized results:
  - Hospitals
  - Medical Centres
  - Other Facilities
- Distance-based sorting

### 3. Interactive Map
- OpenStreetMap integration
- Custom markers
- Popup information
- Zoom controls

## Data Flow

### 1. Location Detection


### 2. Hospital Data Fetching



## Performance Optimizations

### 1. Caching
- Location-based caching
- Precision-based cache keys
- Memory-efficient storage

### 2. React Optimizations
- useCallback for event handlers
- useMemo for filtered lists
- Debounced API calls
- Efficient re-renders

### 3. Map Optimizations
- Lazy loading of markers
- Custom zoom controls
- Marker cleanup

## Error Handling

### 1. Geolocation Errors



### 2. API Errors



## Configuration

### Constants



## Styling Architecture

### CSS Organization
- Component-specific styles
- Global map styles
- Responsive design
- Custom animations

### Key Style Classes


## Development Setup

### Prerequisites
- Node.js >= 14
- npm >= 6

### Installation



### Running Locally


### Building for Production



## Security Considerations

1. **Data Privacy**
   - User location data only used client-side
   - No sensitive data storage
   - Secure API calls

2. **Error Handling**
   - Graceful error recovery
   - User-friendly error messages
   - Error boundary implementation

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Future Improvements

1. **Features**
   - PWA implementation
   - Offline support
   - Route planning
   - Real-time updates

2. **Technical**
   - State management library integration
   - Unit test coverage
   - E2E testing
   - Performance monitoring

## API Documentation

### Overpass API
- Endpoint: `https://overpass-api.de/api/interpreter`
- Method: GET
- Query Parameters:
  - `data`: Overpass QL query string
- Headers:
  - `User-Agent`: 'HospitalFinder/1.0'

### Sample Query