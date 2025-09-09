import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationSelector from './SelectLocation';
import { useBooking } from './../context/BookingContext';
import { useAuth } from './../context/AuthContext';
import { toast } from 'react-hot-toast';

const ServiceBooking: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [location, setLocation] = useState({ lat: 0, lon: 0 });
  const [form, setForm] = useState({
    name: '',
    mobile: '',
    brand: '',
    model: '',
    serviceType: '',
    date: '',
    slot: '',
    bikeNumber: '',
    address: '',
    description: '',
  });
  const [savedAddresses, setSavedAddresses] = useState<{ address: string; lat: number; lon: number }[]>([]);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show, setShow] = useState(false);

  // Fetch saved addresses from backend only if user is authenticated
  useEffect(() => {
    const fetchSavedAddresses = async () => {
      // Only fetch if user is authenticated
      if (!user) {
        setSavedAddresses([]);
        return;
      }

      setIsLoadingAddresses(true);
      try {
        const response = await fetch('https://backend-3lsi.onrender.com/api/customers', {
          method: 'GET',
          credentials: 'include',
        });
        if (!response.ok) {
          throw new Error('Failed to fetch saved addresses');
        }
        const data = await response.json();
        setSavedAddresses(data.savedAddresses || []);
      } catch (error) {
        console.error('Error fetching saved addresses:', error);
        toast.error('Failed to load saved addresses.');
      } finally {
        setIsLoadingAddresses(false);
      }
    };
    fetchSavedAddresses();
  }, [user]); // Add user as dependency

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Unable to get current location.');
        }
      );
    }
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleGetLocation = async () => {
    setShow(!show);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
            );
            const data = await response.json();
            const fullAddress = data.display_name || `${latitude}, ${longitude}`;
            setForm((prev) => ({ ...prev, address: fullAddress }));
            setLocation({ lat: latitude, lon: longitude });
          } catch (error) {
            toast.error('Failed to fetch address.');
            console.error(error);
          }
        },
        (error) => {
          toast.error('Location access denied.');
          console.error(error);
        }
      );
    } else {
      toast.error('Geolocation not supported.');
    }
  };

  const handleSavedAddressSelect = (address: string, lat: number, lon: number) => {
    setForm((prev) => ({ ...prev, address }));
    setLocation({ lat, lon });
    setShowSavedAddresses(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('https://backend-3lsi.onrender.com/api/bookings/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ...form, lat: location.lat, lon: location.lon }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server responded with:', errorData);
        toast.error(errorData.message || 'Booking failed');
        throw new Error(errorData.message || 'Booking failed');
      }

      const bookingData = await response.json();
      toast.success('Booking submitted! Waiting for garage to accept.');

      // Wait for animation (2 seconds) before redirecting
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/dashboard/customer');
      }, 2000);
    } catch (err: any) {
      console.error('Booking error:', err);
      toast.error(err.message || 'Failed to place booking.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 dark:bg-gray-900 p-4 transition">
      {/* Submission Animation */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-t-green-600 border-gray-200 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 dark:text-white shadow-xl rounded-2xl p-6 w-full max-w-md transition"
      >
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-6 text-center">Book Your Bike Service</h2>

        {/* Input Fields */}
        {[
          { label: 'Full Name', name: 'name', type: 'text', placeholder: 'e.g. Rajesh Kumar' },
          { label: 'Mobile Number', name: 'mobile', type: 'tel', placeholder: 'e.g. 9876543210', pattern: '[0-9]{10}', maxLength: 10 },
          { label: 'Brand Name', name: 'brand', type: 'text', placeholder: 'e.g. Honda, Yamaha' },
          { label: 'Model', name: 'model', type: 'text', placeholder: 'e.g. Splendor Plus' },
          { label: 'Bike Number', name: 'bikeNumber', type: 'text', placeholder: 'e.g. MH12 AB 1234' },
        ].map((field) => (
          <div className="mb-4" key={field.name}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
            <input
              type={field.type}
              name={field.name}
              value={form[field.name as keyof typeof form]}
              onChange={handleChange}
              placeholder={field.placeholder}
              pattern={field.pattern}
              maxLength={field.maxLength}
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500"
              required
            />
          </div>
        ))}

        {/* Service Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Service Type</label>
          <select
            name="serviceType"
            value={form.serviceType}
            onChange={handleChange}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500"
            required
          >
            <option value="">Select</option>
            <option value="doorstep">Doorstep Service</option>
            <option value="garage">Garage Dropoff</option>
            <option value="emergency">Emergency Service</option>
          </select>
        </div>

        {/* Date and Slot */}
        {form.serviceType !== 'emergency' && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Slot</label>
              <select
                name="slot"
                value={form.slot}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Select Slot</option>
                <option value="morning">Morning (9 AM - 12 PM)</option>
                <option value="afternoon">Afternoon (1 PM - 4 PM)</option>
                <option value="evening">Evening (5 PM - 8 PM)</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 mt-1 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </>
        )}

        {/* Address */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
          <div className="flex gap-2 flex-wrap mb-2">
            <button
              type="button"
              onClick={handleGetLocation}
              className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700 text-sm"
            >
              Use My Current Location
            </button>
            <button
              type="button"
              onClick={() => setShowSavedAddresses(!showSavedAddresses)}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              Choose from Saved
            </button>
          </div>

          {showSavedAddresses && (
            <div className="bg-gray-100 dark:bg-gray-700 rounded p-2 space-y-1 mb-2">
              {isLoadingAddresses ? (
                <div className="text-center text-gray-500 dark:text-gray-400">Loading addresses...</div>
              ) : savedAddresses.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400">No saved addresses</div>
              ) : (
                savedAddresses.map((addr, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSavedAddressSelect(addr.address, addr.lat, addr.lon)}
                    className="block w-full text-left hover:text-green-600 text-sm dark:text-white"
                  >
                    {addr.address}
                  </button>
                ))
              )}
            </div>
          )}

          {show && (
            <LocationSelector
              onLocationSelect={(lat, lng) => {
                setForm((prev) => ({
                  ...prev,
                  address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`,
                }));
                setLocation({ lat, lon: lng });
              }}
            />
          )}

          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            rows={3}
            placeholder="Enter address or wait for location detection"
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
            required
          />
        </div>

        {/* Issue Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issue Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Describe the issue with your bike (e.g. engine noise, oil leak)"
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg px-3 py-2 focus:ring-green-500 focus:border-green-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-6 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
        >
          Confirm Booking
        </button>
      </form>
    </div> 
  );
};

export default ServiceBooking;