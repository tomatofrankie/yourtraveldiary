import { WeatherData } from '../types';

// Weather code to condition mapping (WMO codes)
const weatherCodeToCondition: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear sky', icon: '☀️' },
  1: { condition: 'Mainly clear', icon: '🌤️' },
  2: { condition: 'Partly cloudy', icon: '⛅' },
  3: { condition: 'Overcast', icon: '☁️' },
  45: { condition: 'Fog', icon: '🌫️' },
  48: { condition: 'Rime fog', icon: '🌫️' },
  51: { condition: 'Light drizzle', icon: '🌧️' },
  53: { condition: 'Moderate drizzle', icon: '🌧️' },
  55: { condition: 'Dense drizzle', icon: '🌧️' },
  56: { condition: 'Freezing drizzle', icon: '🌨️' },
  57: { condition: 'Freezing drizzle', icon: '🌨️' },
  61: { condition: 'Slight rain', icon: '🌧️' },
  63: { condition: 'Moderate rain', icon: '🌧️' },
  65: { condition: 'Heavy rain', icon: '🌧️' },
  66: { condition: 'Freezing rain', icon: '🌨️' },
  67: { condition: 'Freezing rain', icon: '🌨️' },
  71: { condition: 'Slight snow', icon: '❄️' },
  73: { condition: 'Moderate snow', icon: '❄️' },
  75: { condition: 'Heavy snow', icon: '❄️' },
  77: { condition: 'Snow grains', icon: '❄️' },
  80: { condition: 'Slight showers', icon: '🌦️' },
  81: { condition: 'Moderate showers', icon: '🌦️' },
  82: { condition: 'Violent showers', icon: '🌧️' },
  85: { condition: 'Slight snow showers', icon: '🌨️' },
  86: { condition: 'Heavy snow showers', icon: '🌨️' },
  95: { condition: 'Thunderstorm', icon: '⛈️' },
  96: { condition: 'Thunderstorm with hail', icon: '⛈️' },
  99: { condition: 'Thunderstorm with hail', icon: '⛈️' },
};

// Geocoding API to get coordinates from location name
async function getCoordinates(location: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return {
        lat: data.results[0].latitude,
        lon: data.results[0].longitude,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Cache for coordinates to avoid repeated geocoding
const coordsCache: Record<string, { lat: number; lon: number }> = {};

// Cache for weather data to avoid repeated API calls
const weatherCache: Record<string, { data: WeatherData; timestamp: number }> = {};
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function getWeatherForDate(location: string, date: string): Promise<WeatherData> {
  const cacheKey = `${location}_${date}`;
  
  // Check cache first
  const cached = weatherCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Get coordinates for the location
    let coords = coordsCache[location];
    if (!coords) {
      const result = await getCoordinates(location);
      if (result) {
        coords = result;
        coordsCache[location] = coords;
      }
    }

    if (!coords) {
      // Fallback to mock data if geocoding fails
      return getFallbackWeather(date);
    }

    // Determine if we need forecast or historical data
    const today = new Date();
    const targetDate = new Date(date);
    const daysDiff = Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let weatherData: WeatherData;

    if (daysDiff >= 0 && daysDiff <= 16) {
      // Future date within forecast range (0-16 days)
      weatherData = await getForecastWeather(coords.lat, coords.lon, date);
    } else if (daysDiff < 0) {
      // Past date - use historical data
      weatherData = await getHistoricalWeather(coords.lat, coords.lon, date);
    } else {
      // Too far in future - use seasonal averages or fallback
      weatherData = getFallbackWeather(date);
    }

    // Cache the result
    weatherCache[cacheKey] = { data: weatherData, timestamp: Date.now() };
    
    return weatherData;
  } catch (error) {
    console.error('Weather API error:', error);
    return getFallbackWeather(date);
  }
}

async function getForecastWeather(lat: number, lon: number, date: string): Promise<WeatherData> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${date}&end_date=${date}`
    );
    const data = await response.json();

    if (data.daily && data.daily.time && data.daily.time.length > 0) {
      const weatherCode = data.daily.weathercode[0] ?? 0;
      const tempMax = Math.round(data.daily.temperature_2m_max[0] ?? 20);
      const tempMin = Math.round(data.daily.temperature_2m_min[0] ?? 15);
      
      const conditionInfo = weatherCodeToCondition[weatherCode] || { condition: 'Unknown', icon: '🌡️' };

      return {
        date,
        tempMin,
        tempMax,
        condition: conditionInfo.condition,
        icon: conditionInfo.icon,
        suggestion: getClothingSuggestion(tempMin, conditionInfo.condition),
      };
    }
    
    return getFallbackWeather(date);
  } catch (error) {
    console.error('Forecast API error:', error);
    return getFallbackWeather(date);
  }
}

async function getHistoricalWeather(lat: number, lon: number, date: string): Promise<WeatherData> {
  try {
    const response = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto&start_date=${date}&end_date=${date}`
    );
    const data = await response.json();

    if (data.daily && data.daily.time && data.daily.time.length > 0) {
      const weatherCode = data.daily.weathercode[0] ?? 0;
      const tempMax = Math.round(data.daily.temperature_2m_max[0] ?? 20);
      const tempMin = Math.round(data.daily.temperature_2m_min[0] ?? 15);
      
      const conditionInfo = weatherCodeToCondition[weatherCode] || { condition: 'Unknown', icon: '🌡️' };

      return {
        date,
        tempMin,
        tempMax,
        condition: conditionInfo.condition,
        icon: conditionInfo.icon,
        suggestion: getClothingSuggestion(tempMin, conditionInfo.condition),
      };
    }
    
    return getFallbackWeather(date);
  } catch (error) {
    console.error('Historical API error:', error);
    return getFallbackWeather(date);
  }
}

function getFallbackWeather(date: string): WeatherData {
  // Generate somewhat realistic fallback based on month
  const month = new Date(date).getMonth();
  
  // Northern hemisphere seasonal temps (simplified)
  let baseTemp: number;
  if (month >= 5 && month <= 8) {
    baseTemp = 25; // Summer
  } else if (month >= 11 || month <= 1) {
    baseTemp = 5; // Winter
  } else {
    baseTemp = 15; // Spring/Fall
  }

  const tempMin = baseTemp + Math.floor(Math.random() * 5) - 5;
  const tempMax = tempMin + Math.floor(Math.random() * 8) + 2;
  
  return {
    date,
    tempMin,
    tempMax,
    condition: 'Forecast unavailable',
    icon: '🌡️',
    suggestion: getClothingSuggestion(tempMin, 'unknown'),
  };
}

export function getClothingSuggestion(temp: number, condition: string): string {
  const lowerCondition = condition.toLowerCase();
  
  // Rain-related suggestions
  if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle') || lowerCondition.includes('shower')) {
    return 'Bring an umbrella and waterproof jacket. Non-slip shoes recommended.';
  }
  
  // Snow-related suggestions
  if (lowerCondition.includes('snow') || lowerCondition.includes('freezing')) {
    return 'Warm winter coat, gloves, hat, and waterproof boots essential.';
  }
  
  // Thunderstorm
  if (lowerCondition.includes('thunder')) {
    return 'Rain gear essential. Consider indoor activities if possible.';
  }
  
  // Fog
  if (lowerCondition.includes('fog')) {
    return 'Wear visible colors. Drive carefully with headlights on.';
  }
  
  // Temperature-based suggestions
  if (temp < 0) {
    return 'Heavy winter coat, thermal layers, gloves, hat, scarf essential.';
  } else if (temp < 10) {
    return 'Warm jacket, layered clothing, long pants recommended.';
  } else if (temp < 20) {
    return 'Light jacket or cardigan, comfortable layers.';
  } else if (temp < 28) {
    return 'Light clothing, breathable fabrics. Sunglasses helpful.';
  } else {
    return 'Light summer clothes, sunscreen, hat, stay hydrated!';
  }
}
