import axios from "axios";

export async function getAddressFromCoordinates(lat:string, lng:string) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;

  try {
    const response = await axios.get(url);
    return response.data.display_name || "Address not found";
  } catch (error:any) {
    console.error("Error fetching address:", error.message);
    return "Error fetching address";
  }
}
