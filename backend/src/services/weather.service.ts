import axios from 'axios';

/**
 * Weather Service using Open-Meteo API
 * Open-Meteo is a free, open-source weather API with no API key required
 * Documentation: https://open-meteo.com/
 */

interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    conditions: string;
    weatherCode: number;
    // ── Added for Crop Map: sunlight / water-balance ──
    solarRadiation?: number;  // shortwave radiation, W/m²
    et0?: number;             // reference evapotranspiration, mm/day
    tempMin?: number;
    rainfallProbability?: number;
    sunrise?: string;         // ISO local time, today
    sunset?: string;
  };
  forecast: Array<{
    day: string;
    temp: number;
    tempMin?: number;
    rainfall: number;
    rainfallProbability?: number;
    windMax?: number;
    et0?: number;
    solarRadiation?: number;
    weatherCode: number;
    sunrise?: string;
    sunset?: string;
  }>;
  location: {
    latitude: number;
    longitude: number;
    city?: string;
  };
}

class WeatherService {
  private baseUrl = 'https://api.open-meteo.com/v1';

  /**
   * Get weather description from WMO weather code
   * https://open-meteo.com/en/docs
   */
  private getWeatherDescription(code: number): string {
    const weatherCodes: { [key: number]: string } = {
      0: 'Clear Sky',
      1: 'Mainly Clear',
      2: 'Partly Cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing Rime Fog',
      51: 'Light Drizzle',
      53: 'Moderate Drizzle',
      55: 'Dense Drizzle',
      61: 'Slight Rain',
      63: 'Moderate Rain',
      65: 'Heavy Rain',
      71: 'Slight Snow',
      73: 'Moderate Snow',
      75: 'Heavy Snow',
      77: 'Snow Grains',
      80: 'Slight Rain Showers',
      81: 'Moderate Rain Showers',
      82: 'Violent Rain Showers',
      85: 'Slight Snow Showers',
      86: 'Heavy Snow Showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with Slight Hail',
      99: 'Thunderstorm with Heavy Hail',
    };
    return weatherCodes[code] || 'Unknown';
  }

  /**
   * Get day name from date string
   */
  private getDayName(dateString: string): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const date = new Date(dateString);
    return days[date.getDay()];
  }

  /**
   * Get weather data for a location
   * @param latitude - Latitude of the location
   * @param longitude - Longitude of the location
   * @returns Weather data including current conditions and 7-day forecast
   */
  async getWeather(latitude: number, longitude: number): Promise<WeatherData> {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          latitude,
          longitude,
          current: 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,shortwave_radiation,et0_fao_evapotranspiration',
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code,et0_fao_evapotranspiration,shortwave_radiation_sum,sunrise,sunset',
          timezone: 'auto',
          forecast_days: 7,
        },
      });

      const data = response.data;

      // Parse current weather
      const current = {
        temperature: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        conditions: this.getWeatherDescription(data.current.weather_code),
        solarRadiation: data.current.shortwave_radiation,
        et0: data.current.et0_fao_evapotranspiration,
        tempMin: data.daily?.temperature_2m_min?.[0],
        rainfallProbability: data.daily?.precipitation_probability_max?.[0],
        sunrise: data.daily?.sunrise?.[0],
        sunset: data.daily?.sunset?.[0],
      };

      // Parse 7-day forecast
      const forecast = data.daily.time.map((date: string, index: number) => ({
        day: this.getDayName(date),
        temp: Math.round(data.daily.temperature_2m_max[index]),
        tempMin: data.daily.temperature_2m_min[index],
        rainfall: Math.round(data.daily.precipitation_sum[index]),
        rainfallProbability: data.daily.precipitation_probability_max?.[index],
        windMax: data.daily.wind_speed_10m_max?.[index],
        et0: data.daily.et0_fao_evapotranspiration?.[index],
        solarRadiation: data.daily.shortwave_radiation_sum?.[index],
        weatherCode: data.daily.weather_code[index],
        sunrise: data.daily.sunrise?.[index],
        sunset: data.daily.sunset?.[index],
      }));

      // Perform reverse geocoding to get city name using Nominatim (OpenStreetMap)
      let cityName: string | undefined;
      try {
        const geoResponse = await axios.get('https://nominatim.openstreetmap.org/reverse', {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
            zoom: 10,
          },
          headers: {
            'User-Agent': 'FarmConnect-App/1.0',
          },
        });

        if (geoResponse.data && geoResponse.data.address) {
          // Try to get city, town, village, or county
          cityName = geoResponse.data.address.city || 
                     geoResponse.data.address.town || 
                     geoResponse.data.address.village ||
                     geoResponse.data.address.county ||
                     geoResponse.data.address.state;
        }
      } catch (geoError) {
        console.error('Reverse geocoding error:', geoError);
        // Continue without city name if geocoding fails
      }

      return {
        current,
        forecast,
        location: {
          latitude,
          longitude,
          city: cityName,
        },
      };
    } catch (error) {
      console.error('Weather API error:', error);
      throw new Error('Failed to fetch weather data');
    }
  }

  /**
   * Get weather for a city by name (requires geocoding first)
   * @param city - City name
   * @returns Weather data
   */
  async getWeatherByCity(city: string): Promise<WeatherData> {
    try {
      // Use Open-Meteo's geocoding API
      const geoResponse = await axios.get('https://geocoding-api.open-meteo.com/v1/search', {
        params: {
          name: city,
          count: 1,
          language: 'en',
          format: 'json',
        },
      });

      if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
        throw new Error('City not found');
      }

      const location = geoResponse.data.results[0];
      const weatherData = await this.getWeather(location.latitude, location.longitude);

      return {
        ...weatherData,
        location: {
          ...weatherData.location,
          city: location.name,
        },
      };
    } catch (error) {
      console.error('Weather by city error:', error);
      throw new Error('Failed to fetch weather data for city');
    }
  }

  /**
   * Get default weather (fallback to a default location if user location not available)
   * Default: New Delhi, India
   */
  async getDefaultWeather(): Promise<WeatherData> {
    // Default to New Delhi, India coordinates
    const weatherData = await this.getWeather(28.6139, 77.2090);
    return {
      ...weatherData,
      location: {
        ...weatherData.location,
        city: weatherData.location.city || 'New Delhi',
      },
    };
  }
}

export const weatherService = new WeatherService();
