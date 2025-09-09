import React, { createContext, useContext, useState, useEffect,  } from 'react';
import type {ReactNode} from "react"
import { useAuth } from './AuthContext';

interface Location {
  lat: number;
  lng: number;
  timestamp: Date;
  accuracy?: number;
}

interface MechanicLocation {
  mechanicId: string;
  mechanicName: string;
  location: Location;
  bookingId: string;
  status: 'idle' | 'on-way' | 'arrived' | 'working';
}

interface LocationContextType {
  currentLocation: Location | null;
  mechanicLocations: MechanicLocation[];
  isTracking: boolean;
  
  // Location functions
  startTracking: () => Promise<void>;
  stopTracking: () => void;
  updateMechanicLocation: (mechanicId: string, location: Location, bookingId: string, status: string) => void;
  getMechanicLocation: (mechanicId: string) => MechanicLocation | null;
  
  // Permission and error handling
  hasLocationPermission: boolean;
  locationError: string | null;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://backend-3lsi.onrender.com';

export const LocationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [mechanicLocations, setMechanicLocations] = useState<MechanicLocation[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  // Check location permission on mount
  useEffect(() => {
    checkLocationPermission();
  }, []);

  // Auto-start tracking for mechanics
  useEffect(() => {
    if (user?.role === 'mechanic' && hasLocationPermission) {
      startTracking();
    }
    
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [user, hasLocationPermission]);

  const checkLocationPermission = async () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setHasLocationPermission(permission.state === 'granted');
      
      permission.addEventListener('change', () => {
        setHasLocationPermission(permission.state === 'granted');
      });
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const startTracking = async (): Promise<void> => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported');
      return;
    }

    setLocationError(null);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    try {
      // Get initial position
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, options);
      });

      const location: Location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        timestamp: new Date(),
        accuracy: position.coords.accuracy
      };

      setCurrentLocation(location);
      setIsTracking(true);
      setHasLocationPermission(true);

      // Start watching position
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation: Location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date(),
            accuracy: position.coords.accuracy
          };

          setCurrentLocation(newLocation);

          // If user is a mechanic, broadcast location
          if (user?.role === 'mechanic') {
            broadcastMechanicLocation(newLocation);
          }
        },
        (error) => {
          console.error('Location tracking error:', error);
          setLocationError(error.message);
        },
        options
      );

      setWatchId(id);
    } catch (error: any) {
      setLocationError(error.message);
      setHasLocationPermission(false);
    }
  };

  const stopTracking = () => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsTracking(false);
  };

  const broadcastMechanicLocation = async (location: Location) => {
    if (!user || user.role !== 'mechanic') return;

    try {
      const token = localStorage.getItem('mechiee_token');
      await fetch(`${API_BASE_URL}/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          mechanicId: user.id,
          location,
          timestamp: new Date()
        })
      });
    } catch (error) {
      console.error('Error broadcasting location:', error);
    }
  };

  const updateMechanicLocation = (mechanicId: string, location: Location, bookingId: string, status: string) => {
    setMechanicLocations(prev => {
      const existing = prev.find(m => m.mechanicId === mechanicId);
      const mechanicLocation: MechanicLocation = {
        mechanicId,
        mechanicName: existing?.mechanicName || 'Unknown Mechanic',
        location,
        bookingId,
        status: status as any
      };

      if (existing) {
        return prev.map(m => m.mechanicId === mechanicId ? mechanicLocation : m);
      } else {
        return [...prev, mechanicLocation];
      }
    });
  };

  const getMechanicLocation = (mechanicId: string): MechanicLocation | null => {
    return mechanicLocations.find(m => m.mechanicId === mechanicId) || null;
  };

  const value: LocationContextType = {
    currentLocation,
    mechanicLocations,
    isTracking,
    startTracking,
    stopTracking,
    updateMechanicLocation,
    getMechanicLocation,
    hasLocationPermission,
    locationError
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};