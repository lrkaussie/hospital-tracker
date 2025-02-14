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
- **HospitalMap Component**
  - `currentPosition`: Tracks user's current location
  - `hospitals`: Stores list of nearby hospitals
  - `isLoading`: Loading state indicator
  - `error`: Error state management
  - `cache`: Location-based caching system
  - `selectedId`: Currently selected hospital
  - `mapRef`: Reference to map instance

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
1. Browser's Geolocation API is used to get user's position
2. On successful location retrieval:
   - Updates `currentPosition` state
   - Triggers hospital search
3. Error handling for:
   - Permission denied
   - Position unavailable
   - Timeout
   - Browser compatibility

### 2. Hospital Data Fetching
1. **Initial Request**
   - Triggered when user location is obtained
   - Uses Overpass API with 10km radius
   - Debounced search with 300ms delay
   
2. **Data Processing**
   - Filters for proper hospitals with emergency services
   - Calculates distance from user
   - Sorts by type and distance
   - Caches results by location

3. **Data Categories**
   - Hospitals
   - Medical Centres
   - Other Medical Facilities

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
- Permission denied: User notification
- Position unavailable: Error message display
- Timeout: Retry mechanism
- Browser compatibility check

### 2. API Errors
- Network failures: Error state management
- Timeout handling: 25-second limit
- Invalid data handling
- Graceful degradation with error messages
- Cache fallback when available

## Configuration

### Constants
```javascript
CONSTANTS = {
  RADIUS_KM: 10,
  RADIUS_METERS: 10000,
  MAP_ZOOM_LEVEL: 13,
  SELECTED_ZOOM_LEVEL: 15,
  CACHE_PRECISION: 100,
  API_TIMEOUT: 25
}
```

### Styling Architecture

### CSS Organization
- Component-specific styles
- Global map styles
- Responsive design
- Custom animations

### Key Style Classes
- `.map-container`: Main layout container
- `.map-div`: Map visualization container
- `.hospitals-list`: Hospital list sidebar
- `.hospital-item`: Individual hospital entry
  - `.emergency`: Emergency hospital styling
  - `.medical-centre`: Medical centre styling
  - `.other-facility`: Other facility styling
  - `.selected`: Selected item highlighting
- `.popup-content`: Map marker popup styling
- `.loading-spinner`: Loading state animation
- `.error-message`: Error display styling
- `.no-results`: Empty results message

## Development Setup

### Prerequisites
- Node.js >= 14
- npm >= 6
- Modern web browser with geolocation support

### Installation
1. Clone the repository
2. Run `npm install` to install dependencies
3. Create `.env` file with required environment variables

### Running Locally
1. `npm start` - Starts development server
2. Open `http://localhost:3000` in browser
3. Allow location access when prompted

### Building for Production
1. `npm run build` - Creates optimized production build
2. Deploy the contents of the `build` directory
3. Ensure HTTPS for geolocation API support

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
```overpassql
[out:json][timeout:25];
(
  node["amenity"="hospital"]["healthcare"="hospital"](around:10000,${lat},${lng});
  way["amenity"="hospital"]["healthcare"="hospital"](around:10000,${lat},${lng});
  relation["amenity"="hospital"]["healthcare"="hospital"](around:10000,${lat},${lng});
);
out body center;
```