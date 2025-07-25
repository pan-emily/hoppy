import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { filterAdultVenues } from '../../../utils/filterBars';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius = searchParams.get('radius') || '1000';

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Latitude and longitude are required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Places API key not configured' },
      { status: 500 }
    );
  }

  try {
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    const params = {
      location: `${lat},${lng}`,
      radius,
      type: 'bar',
      key: apiKey,
    };

    const response = await axios.get(placesUrl, { params });
    
    if (response.data.status !== 'OK') {
      throw new Error(`Google Places API error: ${response.data.status}`);
    }

    const bars = filterAdultVenues(response.data.results);

    return NextResponse.json({ bars });
  } catch (error) {
    console.error('Error fetching nearby bars:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nearby bars' },
      { status: 500 }
    );
  }
}