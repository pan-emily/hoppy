import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const originLat = searchParams.get('origin_lat');
  const originLng = searchParams.get('origin_lng');
  const destLat = searchParams.get('dest_lat');
  const destLng = searchParams.get('dest_lng');

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json(
      { error: 'Origin and destination coordinates are required' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_DISTANCE_MATRIX_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Google Distance Matrix API key not configured' },
      { status: 500 }
    );
  }

  try {
    const distanceUrl = `https://maps.googleapis.com/maps/api/distancematrix/json`;
    const params = {
      origins: `${originLat},${originLng}`,
      destinations: `${destLat},${destLng}`,
      mode: 'walking',
      key: apiKey,
    };

    const response = await axios.get(distanceUrl, { params });
    
    if (response.data.status !== 'OK') {
      throw new Error(`Google Distance Matrix API error: ${response.data.status}`);
    }

    const element = response.data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      throw new Error('Unable to calculate walking distance');
    }

    return NextResponse.json({
      distance: element.distance.text,
      duration: element.duration.text,
    });
  } catch (error) {
    console.error('Error fetching walking distance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch walking distance' },
      { status: 500 }
    );
  }
}