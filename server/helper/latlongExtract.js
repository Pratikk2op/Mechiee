import axios from 'axios';
import url from 'url';
import querystring from 'querystring';
export async function extractLatLngFromMapLinkUniversal(mapLink) {
    if (!mapLink) return null;
  
    let finalUrl = mapLink;
  
    // ✅ Handle short Google Maps links
    if (mapLink.includes('maps.app.goo.gl')) {
      try {
        const response = await axios.head(mapLink, { maxRedirects: 0, validateStatus: null });
        if (response.headers.location) {
          finalUrl = response.headers.location;
          console.log("🔗 Short URL expanded to:", finalUrl);
        }
      } catch (err) {
        console.error("Short URL resolution failed:", err.message);
        // Fallback to original
      }
    }
  
    // ✅ Try all patterns on final URL
    // 1. @lat,lng
    let match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  
    // 2. /lat,lng in path
    match = finalUrl.match(/\/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  
    // 3. ?q=lat,lng
    const parsedUrl = url.parse(finalUrl);
    const queryParams = querystring.parse(parsedUrl.query);
    if (queryParams.q) {
      const qMatch = queryParams.q.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }
  
    // 4. Loose: any float pair
    match = finalUrl.match(/(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
  
    return null;
  }