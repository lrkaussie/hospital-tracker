import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Create a component to handle map position updates
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 13);
    }
  }, [center, map]);
  return null;
}

const HospitalMap = () => {
  const [currentPosition, setCurrentPosition] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cache, setCache] = useState({});
  const searchTimeoutRef = useRef(null);

  const deg2rad = useCallback((deg) => {
    return deg * (Math.PI/180);
  }, []);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance.toFixed(1);
  }, [deg2rad]);

  const searchNearbyHospitals = useCallback(async (location) => {
    if (!location) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const cacheKey = `${Math.round(location.lat * 100) / 100},${Math.round(location.lng * 100) / 100}`;
    
    if (cache[cacheKey]) {
      setHospitals(cache[cacheKey]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Create Overpass query
        const radius = 10000; // 10km in meters
        const query = `
          [out:json][timeout:25];
          (
            node["amenity"="hospital"](around:${radius},${location.lat},${location.lng});
            way["amenity"="hospital"](around:${radius},${location.lat},${location.lng});
            relation["amenity"="hospital"](around:${radius},${location.lat},${location.lng});
          );
          out body center;
        `;

        const response = await axios.get(
          'https://overpass-api.de/api/interpreter',
          {
            params: { data: query },
            headers: {
              'User-Agent': 'HospitalFinder/1.0'
            }
          }
        );

        if (response.data && response.data.elements) {
          const hospitalsWithDistance = response.data.elements
            .filter(element => element.tags && element.tags.amenity === 'hospital')
            .map(hospital => ({
              id: hospital.id,
              name: hospital.tags.name || 'Unnamed Hospital',
              lat: hospital.lat,
              lng: hospital.lon,
              distance: calculateDistance(
                location.lat,
                location.lng,
                hospital.lat,
                hospital.lon
              )
            }))
            .filter(hospital => hospital.distance <= 10)
            .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));

          setCache(prev => ({
            ...prev,
            [cacheKey]: hospitalsWithDistance
          }));
          
          setHospitals(hospitalsWithDistance);
        }
      } catch (error) {
        console.error("Error fetching hospitals:", error);
        setError("Failed to fetch nearby hospitals. Please try again later.");
        setHospitals([]);
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  }, [cache, calculateDistance]);

  // Get user's current position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentPosition(currentPos);
          searchNearbyHospitals(currentPos);
        },
        (error) => {
          console.error("Error getting location:", error);
          setError("Unable to get your location. Please enable location services.");
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  }, [searchNearbyHospitals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  if (!currentPosition) {
    return <div>Loading your location...</div>;
  }

  return (
    <div className="map-container">
      <div className="map-div">
        <MapContainer
          center={[currentPosition.lat, currentPosition.lng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapUpdater center={currentPosition} />
          
          {currentPosition && (
            <Marker position={[currentPosition.lat, currentPosition.lng]}>
              <Popup>You are here</Popup>
            </Marker>
          )}

          {hospitals.map((hospital) => (
            <Marker
              key={hospital.id}
              position={[hospital.lat, hospital.lng]}
            >
              <Popup>
                <h3>{hospital.name}</h3>
                <p>Distance: {hospital.distance} km</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="hospitals-list">
        <h2>Nearby Hospitals</h2>
        {isLoading ? (
          <p>Loading hospitals...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : hospitals.length > 0 ? (
          hospitals.map((hospital) => (
            <div 
              key={hospital.id} 
              className="hospital-item"
            >
              <h3>{hospital.name}</h3>
              <p>Distance: {hospital.distance} km</p>
            </div>
          ))
        ) : (
          <p>No hospitals found nearby</p>
        )}
      </div>
    </div>
  );
};

export default HospitalMap; 