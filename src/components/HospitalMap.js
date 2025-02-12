import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import { CONSTANTS } from '../constants';

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
  const [selectedId, setSelectedId] = useState(null);
  const mapRef = useRef(null);

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
      searchTimeoutRef.current = null;
    }

    const cacheKey = `${Math.round(location.lat * 100) / 100},${Math.round(location.lng * 100) / 100}`;
    
    if (cache[cacheKey]) {
      setHospitals(cache[cacheKey]);
      setSelectedId(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      setSelectedId(null);
      
      try {
        // Modified Overpass query to be more specific about hospitals
        const radius = 10000; // 10km in meters
        const query = `
          [out:json][timeout:25];
          (
            // Get only proper hospitals, excluding clinics and medical centers
            node["amenity"="hospital"]["healthcare"="hospital"](around:${radius},${location.lat},${location.lng});
            way["amenity"="hospital"]["healthcare"="hospital"](around:${radius},${location.lat},${location.lng});
            relation["amenity"="hospital"]["healthcare"="hospital"](around:${radius},${location.lat},${location.lng});
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
            .filter(element => 
              element.tags && 
              element.tags.amenity === 'hospital' &&
              element.tags.healthcare === 'hospital' &&
              // Exclude facilities that are explicitly marked as not emergency
              element.tags.emergency !== 'no'
            )
            .map(hospital => ({
              id: hospital.id,
              name: hospital.tags.name || 'Unnamed Hospital',
              lat: hospital.lat || hospital.center.lat,
              lng: hospital.lon || hospital.center.lon,
              emergency: hospital.tags.emergency === 'yes' ? 'Emergency' : 'Hospital',
              distance: calculateDistance(
                location.lat,
                location.lng,
                hospital.lat || hospital.center.lat,
                hospital.lon || hospital.center.lon
              )
            }))
            .filter(hospital => hospital.distance <= 10)
            .sort((a, b) => {
              // First, check if the name contains "Hospital"
              const aIsHospital = a.name.toLowerCase().includes('hospital');
              const bIsHospital = b.name.toLowerCase().includes('hospital');
              
              if (aIsHospital && !bIsHospital) return -1;
              if (!aIsHospital && bIsHospital) return 1;
              
              // If both are hospitals or both aren't, sort by distance
              return parseFloat(a.distance) - parseFloat(b.distance);
            });

          setCache(prev => ({
            ...prev,
            [cacheKey]: hospitalsWithDistance
          }));
          
          setHospitals(hospitalsWithDistance);
        }
      } catch (err) {
        setError('Failed to fetch hospitals. Please try again.');
        setHospitals([]);
      } finally {
        setIsLoading(false);
        searchTimeoutRef.current = null;
      }
    }, 300);
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

  // Add cleanup effect for searchTimeoutRef
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Modify handleItemSelect to be more robust
  const handleItemSelect = useCallback((hospital) => {
    if (!hospital || !hospital.id) return;
    
    setSelectedId(prev => prev === hospital.id ? null : hospital.id);
    
    if (mapRef.current) {
      mapRef.current.setView(
        [hospital.lat, hospital.lng],
        CONSTANTS.SELECTED_ZOOM_LEVEL
      );
    }
  }, []);

  // Add effect to cleanup markers when hospitals change
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            layer.remove();
          }
        });
      }
    };
  }, [hospitals]);

  // Memoize filtered hospital lists
  const hospitalsList = useMemo(() => 
    hospitals.filter(h => h.name.toLowerCase().includes('hospital')),
    [hospitals]
  );

  const medicalCentresList = useMemo(() => 
    hospitals.filter(h => 
      h.name.toLowerCase().includes('medical centre') || 
      h.name.toLowerCase().includes('medical center')
    ),
    [hospitals]
  );

  if (!currentPosition) {
    return (
      <div className="map-loading">
        <p>📍 Loading your location...</p>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div className="map-div">
        <MapContainer
          center={[currentPosition.lat, currentPosition.lng]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
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
              eventHandlers={{
                click: () => handleItemSelect(hospital)
              }}
              icon={selectedId === hospital.id ? 
                new L.Icon({
                  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                  iconSize: [25, 41],
                  iconAnchor: [12, 41],
                  popupAnchor: [1, -34],
                  shadowSize: [41, 41]
                }) : 
                new L.Icon.Default()
              }
            >
              <Popup>
                <div className={`popup-content ${selectedId === hospital.id ? 'selected' : ''}`}>
                  <h3>{hospital.name}</h3>
                  <p>📍 Distance: {hospital.distance} km</p>
                  {hospital.emergency === 'Emergency' && (
                    <p className="emergency-text">🚨 Emergency Services Available</p>
                  )}
                  <p className="facility-type">
                    {hospital.name.toLowerCase().includes('hospital') ? '🏥 Hospital' :
                     hospital.name.toLowerCase().includes('medical centre') || 
                     hospital.name.toLowerCase().includes('medical center') ? '🏥 Medical Centre' :
                     '🏥 Medical Facility'}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="hospitals-list">
        <h2>Nearby Hospitals</h2>
        {isLoading ? (
          <div className="loading-spinner">
            <p>Loading hospitals...</p>
          </div>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : hospitals.length > 0 ? (
          <>
            {/* Display Hospitals */}
            {hospitalsList.map((hospital) => (
              <div 
                key={hospital.id} 
                className={`hospital-item ${hospital.emergency === 'Emergency' ? 'emergency' : ''} ${
                  selectedId === hospital.id ? 'selected' : ''
                }`}
                onClick={() => handleItemSelect(hospital)}
                role="button"
                tabIndex={0}
                data-testid="hospital-item"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleItemSelect(hospital);
                  }
                }}
              >
                <h3>{hospital.name}</h3>
                <p>
                  <span>📍 Distance: {hospital.distance} km</span>
                </p>
                {hospital.emergency === 'Emergency' && (
                  <p>🚨 Emergency Services Available</p>
                )}
              </div>
            ))}

            {/* Display Medical Centres */}
            {medicalCentresList.length > 0 && (
              <>
                <h2 className="section-heading">Medical Centres</h2>
                {medicalCentresList.map((hospital) => (
                  <div 
                    key={hospital.id} 
                    className={`hospital-item medical-centre ${
                      selectedId === hospital.id ? 'selected' : ''
                    }`}
                    onClick={() => handleItemSelect(hospital)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${hospital.name}, ${hospital.distance} kilometers away`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleItemSelect(hospital);
                      }
                    }}
                  >
                    <h3>{hospital.name}</h3>
                    <p>
                      <span>📍 Distance: {hospital.distance} km</span>
                    </p>
                    {hospital.emergency === 'Emergency' && (
                      <p>🚨 Emergency Services Available</p>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Display Other Facilities */}
            {hospitals.some(h => !h.name.toLowerCase().includes('hospital') && 
                                !h.name.toLowerCase().includes('medical centre') && 
                                !h.name.toLowerCase().includes('medical center')) && (
              <>
                <h2 className="section-heading">Other Medical Facilities</h2>
                {hospitals
                  .filter(h => !h.name.toLowerCase().includes('hospital') && 
                             !h.name.toLowerCase().includes('medical centre') && 
                             !h.name.toLowerCase().includes('medical center'))
                  .map((hospital) => (
                    <div 
                      key={hospital.id} 
                      className={`hospital-item other-facility ${
                        selectedId === hospital.id ? 'selected' : ''
                      }`}
                      onClick={() => handleItemSelect(hospital)}
                      role="button"
                      tabIndex={0}
                      aria-label={`${hospital.name}, ${hospital.distance} kilometers away`}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleItemSelect(hospital);
                        }
                      }}
                    >
                      <h3>{hospital.name}</h3>
                      <p>
                        <span>📍 Distance: {hospital.distance} km</span>
                      </p>
                      {hospital.emergency === 'Emergency' && (
                        <p>🚨 Emergency Services Available</p>
                      )}
                    </div>
                  ))}
              </>
            )}
          </>
        ) : (
          <div className="no-results">
            <p>No hospitals found nearby</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default HospitalMap; 