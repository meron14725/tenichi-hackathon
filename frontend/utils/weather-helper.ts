import { WeatherForecastDay } from '@/api/weatherApi';

/**
 * Maps weather conditions to MaterialCommunityIcons names.
 */
export function getWeatherIcon(condition: string): string {
  const c = condition.toLowerCase();
  if (c.includes('sunny') || c.includes('clear') || c.includes('晴')) return 'weather-sunny';
  if (c.includes('cloud') || c.includes('曇')) return 'weather-cloudy';
  if (c.includes('rain') || c.includes('雨')) return 'weather-rainy';
  if (c.includes('snow') || c.includes('雪')) return 'weather-snowy';
  return 'weather-partly-cloudy';
}

/**
 * Returns a short advice string based on weather data.
 */
export function getWeatherAdvice(weather: WeatherForecastDay): string {
  if (weather.chance_of_rain >= 50) return `雨が降るので傘が必要です！`;
  if (weather.chance_of_rain >= 30) return `雨の可能性があります。折り畳み傘をお忘れなく。`;
  if (weather.avg_temp_c <= 10) return `寒くなりそうです。暖かい服装で出かけましょう。`;
  if (weather.avg_temp_c >= 30) return `暑くなりそうです。熱中症に注意しましょう。`;
  return `お出かけ日和です！`;
}
