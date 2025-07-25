import axios from 'axios';

export interface WalkingDistanceParams {
  origin: {
    lat: number;
    lng: number;
  };
  destination: {
    lat: number;
    lng: number;
  };
}

export interface WalkingDistanceResult {
  distance: string;
  duration: string;
}

export async function getWalkingDistance({ origin, destination }: WalkingDistanceParams): Promise<WalkingDistanceResult> {
  try {
    const response = await axios.get('/api/walking-distance', {
      params: {
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        dest_lat: destination.lat,
        dest_lng: destination.lng,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching walking distance:', error);
    throw new Error('Failed to fetch walking distance');
  }
}