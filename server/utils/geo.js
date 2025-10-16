export function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of earth in km
    const dLat = (lat2-lat1) * Math.PI/180;
    const dLon = (lon2-lon1) * Math.PI/180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  

  import axios from "axios";
  
  // utils/getAddressFromCoordinates.js


export async function getAddressFromCoordinates(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "MechieeApp/1.0 (contact@mechiee.com)" // 👈 Required by Nominatim
      }
    });
    return response.data.display_name || "Address not found";
  } catch (error) {
    console.error("Error fetching address:", error.message);
    return "Error fetching address";
  }
}
