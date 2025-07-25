import axios from 'axios';
import { Bar } from '../types';

export interface FetchNearbyBarsParams {
  lat: number;
  lng: number;
  radius?: number;
}

export async function fetchNearbyBars({ lat, lng, radius = 1000 }: FetchNearbyBarsParams): Promise<Bar[]> {
  try {
    const response = await axios.get('/api/nearby-bars', {
      params: {
        lat,
        lng,
        radius,
      },
    });

    return response.data.bars || [];
  } catch (error) {
    console.error('Error fetching nearby bars:', error);
    throw new Error('Failed to fetch nearby bars');
  }
}