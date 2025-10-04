import axios from 'axios';

export async function extractLatLngFromMapLinkUniversal(mapLink) {
  if (!mapLink || typeof mapLink !== 'string') {
    console.error("Invalid input: mapLink must be a non-empty string");
    return null;
  }

  let finalUrl = mapLink.trim();
  console.log("🔍 Processing URL:", finalUrl);

  try {
    // ✅ Handle shortened URLs with better redirect handling
    const isShortUrl = 
      finalUrl.includes('maps.app.goo.gl') ||
      finalUrl.includes('goo.gl') ||
      finalUrl.includes('bit.ly') ||
      finalUrl.includes('tinyurl.com') ||
      /^https?:\/\/[^\/]+\/[a-zA-Z0-9_-]+$/.test(finalUrl);

    if (isShortUrl) {
      try {
        const response = await axios.get(finalUrl, {
          maxRedirects: 10,
          timeout: 10000,
          validateStatus: () => true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        const redirectedUrl = response.request?.res?.responseUrl || 
                             response.config?.url || 
                             response.request?.path;
        
        if (redirectedUrl && redirectedUrl !== finalUrl) {
          finalUrl = redirectedUrl;
          console.log("✅ Expanded to:", finalUrl);
        }
      } catch (err) {
        console.warn("⚠️ Redirect failed, continuing with original URL:", err.message);
      }
    }

    // Helper function to validate coordinates
    const isValidCoord = (lat, lng) => {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const valid = !isNaN(latNum) && !isNaN(lngNum) && 
                   latNum >= -90 && latNum <= 90 && 
                   lngNum >= -180 && lngNum <= 180 &&
                   latNum !== 0 && lngNum !== 0; // Exclude 0,0
      return valid;
    };

    // Helper to extract and validate
    const tryExtract = (lat, lng, source = "") => {
      if (isValidCoord(lat, lng)) {
        const result = { 
          lat: parseFloat(parseFloat(lat).toFixed(7)), 
          lng: parseFloat(parseFloat(lng).toFixed(7)) 
        };
        console.log(`✅ Found coordinates (${source}):`, result);
        return result;
      }
      return null;
    };

    // Decode URL if it's encoded
    let decodedUrl = finalUrl;
    try {
      decodedUrl = decodeURIComponent(finalUrl);
    } catch (e) {
      decodedUrl = finalUrl;
    }

    // Parse URL using native URL API
    let parsedUrl, queryParams = {}, pathname = '', hash = '';
    try {
      parsedUrl = new URL(decodedUrl);
      queryParams = Object.fromEntries(parsedUrl.searchParams);
      pathname = parsedUrl.pathname;
      hash = parsedUrl.hash;
    } catch (e) {
      console.warn("URL parsing failed, using regex fallback");
      const urlMatch = decodedUrl.match(/^([^?#]+)(\?[^#]*)?(#.*)?$/);
      if (urlMatch) {
        pathname = urlMatch[1] || '';
        const queryString = urlMatch[2] || '';
        hash = urlMatch[3] || '';
        
        queryString.slice(1).split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key) queryParams[key] = value || '';
        });
      }
    }

    console.log("📍 Pathname:", pathname);
    console.log("📍 Query params:", queryParams);

    // ✅ NEW: Extract from Google Maps hex-encoded place ID (CRITICAL FIX!)
    // Pattern: 0x[hex]:[hex] which encodes lat/lng
    const hexMatch = decodedUrl.match(/[!\/]1s(0x[0-9a-f]+):(0x[0-9a-f]+)/i);
    if (hexMatch) {
      try {
        // These are actually hex-encoded coordinates
        // We need to fetch the actual page to get real coordinates
        console.log("🔍 Found hex place ID, fetching actual coordinates...");
        
        // Try to fetch the page and extract coordinates from meta tags or scripts
        try {
          const pageResponse = await axios.get(finalUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          const html = pageResponse.data;
          
          // Try to find coordinates in meta tags
          let metaMatch = html.match(/content="(-?\d+\.?\d*),\s*(-?\d+\.?\d*)"/);
          if (metaMatch) {
            const result = tryExtract(metaMatch[1], metaMatch[2], "Meta tag");
            if (result) return result;
          }
          
          // Try to find in APP_INITIALIZATION data
          metaMatch = html.match(/APP_INITIALIZATION[^{]*\{[^}]*\[null,null,(-?\d+\.?\d*),(-?\d+\.?\d*)\]/);
          if (metaMatch) {
            const result = tryExtract(metaMatch[1], metaMatch[2], "APP_INITIALIZATION");
            if (result) return result;
          }
          
          // Try to find any coordinate pattern in the HTML
          metaMatch = html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
          if (metaMatch) {
            const result = tryExtract(metaMatch[1], metaMatch[2], "HTML coordinate array");
            if (result) return result;
          }

          // Look for coordinates in window.APP_OPTIONS or similar
          metaMatch = html.match(/"(-?\d+\.\d{6,})"\s*,\s*"(-?\d+\.\d{6,})"/);
          if (metaMatch) {
            const result = tryExtract(metaMatch[1], metaMatch[2], "Quoted coordinates");
            if (result) return result;
          }
          
        } catch (fetchErr) {
          console.warn("⚠️ Could not fetch page for coordinate extraction:", fetchErr.message);
        }
      } catch (hexErr) {
        console.warn("⚠️ Hex decoding failed:", hexErr.message);
      }
    }

    // ✅ Pattern 1: Google Maps @lat,lng,zoom (most common)
    let match = decodedUrl.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,(\d+\.?\d*)z)?/);
    if (match) {
      const result = tryExtract(match[1], match[2], "Google @lat,lng");
      if (result) return result;
    }

    // ✅ Pattern 2: /place/name/@lat,lng
    match = pathname.match(/\/place\/[^\/]*\/@?(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (match) {
      const result = tryExtract(match[1], match[2], "Place with @lat,lng");
      if (result) return result;
    }

    // ✅ Pattern 3: Direct /lat,lng in path
    match = pathname.match(/\/(-?\d+\.?\d*),(-?\d+\.?\d*)(?:\/|$)/);
    if (match) {
      const result = tryExtract(match[1], match[2], "Path /lat,lng");
      if (result) return result;
    }

    // ✅ Pattern 4: Query param ?q=lat,lng
    if (queryParams.q) {
      match = queryParams.q.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (match) {
        const result = tryExtract(match[1], match[2], "Query ?q=lat,lng");
        if (result) return result;
      }
    }

    // ✅ Pattern 5: ?ll=lat,lng (Apple Maps, OSM)
    if (queryParams.ll) {
      match = queryParams.ll.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (match) {
        const result = tryExtract(match[1], match[2], "Query ?ll=lat,lng");
        if (result) return result;
      }
    }

    // ✅ Pattern 6: Separate lat/lon params
    if (queryParams.lat && queryParams.lon) {
      const result = tryExtract(queryParams.lat, queryParams.lon, "Query ?lat=&lon=");
      if (result) return result;
    }
    if (queryParams.lat && queryParams.lng) {
      const result = tryExtract(queryParams.lat, queryParams.lng, "Query ?lat=&lng=");
      if (result) return result;
    }
    if (queryParams.latitude && queryParams.longitude) {
      const result = tryExtract(queryParams.latitude, queryParams.longitude, "Query ?latitude=&longitude=");
      if (result) return result;
    }

    // ✅ Pattern 7: ?sll= or ?daddr= (Apple Maps)
    if (queryParams.sll) {
      match = queryParams.sll.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (match) {
        const result = tryExtract(match[1], match[2], "Apple Maps ?sll=");
        if (result) return result;
      }
    }
    if (queryParams.daddr) {
      match = queryParams.daddr.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (match) {
        const result = tryExtract(match[1], match[2], "Query ?daddr=");
        if (result) return result;
      }
    }

    // ✅ Pattern 8: OpenStreetMap ?mlat= &mlon=
    if (queryParams.mlat && queryParams.mlon) {
      const result = tryExtract(queryParams.mlat, queryParams.mlon, "OSM ?mlat=&mlon=");
      if (result) return result;
    }

    // ✅ Pattern 9: Bing Maps ?cp=lat~lng
    if (queryParams.cp) {
      match = queryParams.cp.match(/(-?\d+\.?\d*)~(-?\d+\.?\d*)/);
      if (match) {
        const result = tryExtract(match[1], match[2], "Bing ?cp=lat~lng");
        if (result) return result;
      }
    }

    // ✅ Pattern 10: ?center= or ?map=
    if (queryParams.center) {
      match = queryParams.center.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
      if (match) {
        const result = tryExtract(match[1], match[2], "Query ?center=");
        if (result) return result;
      }
    }
    if (queryParams.map) {
      match = queryParams.map.match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
      if (match) {
        const result = tryExtract(match[1], match[2], "Query ?map=");
        if (result) return result;
      }
    }

    // ✅ Pattern 11: Mapbox /lng,lat,zoom (note: reversed order!)
    if (decodedUrl.includes('mapbox')) {
      match = decodedUrl.match(/\/(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+\.?\d*)/);
      if (match) {
        const result = tryExtract(match[2], match[1], "Mapbox /lng,lat,zoom");
        if (result) return result;
      }
    }

    // ✅ Pattern 12: Hash fragment coordinates
    if (hash) {
      match = hash.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (match) {
        const result = tryExtract(match[1], match[2], "Hash fragment");
        if (result) return result;
      }
    }

    // ✅ Pattern 13: data parameter with embedded coordinates
    if (queryParams.data || pathname.includes('/data=')) {
      const dataStr = queryParams.data || pathname.split('/data=')[1];
      if (dataStr) {
        match = dataStr.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
        if (match) {
          const result = tryExtract(match[1], match[2], "Data parameter");
          if (result) return result;
        }
      }
    }

    // ✅ Pattern 14: Generic fallback - look for any lat,lng pattern
    match = decodedUrl.match(/[^\d](-?\d{1,3}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})[^\d]/);
    if (match) {
      const result = tryExtract(match[1], match[2], "Generic pattern");
      if (result) return result;
    }

    // ✅ Pattern 15: Very loose fallback
    match = decodedUrl.match(/(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/);
    if (match) {
      const result = tryExtract(match[1], match[2], "Loose pattern");
      if (result) return result;
    }

    console.error("❌ No valid coordinates found in URL");
    return null;

  } catch (err) {
    console.error("❌ Fatal error:", err.message, err.stack);
    return null;
  }
}

// Test function
export async function testExtraction(url) {
  console.log("\n" + "=".repeat(60));
  const result = await extractLatLngFromMapLinkUniversal(url);
  console.log("FINAL RESULT:", result);
  console.log("=".repeat(60) + "\n");
  return result;
}
