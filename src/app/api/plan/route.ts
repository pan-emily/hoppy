import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PlanningPreferences, BarCrawl } from '../../../types';
import axios from 'axios';
import { filterAdultVenues } from '../../../utils/filterBars';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const preferences: PlanningPreferences = await request.json();

    // First, get bars in the specified neighborhood
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json`;
    const geocodeParams = {
      address: preferences.neighborhood,
      key: process.env.GOOGLE_PLACES_API_KEY,
    };

    const geocodeResponse = await axios.get(geocodeUrl, { params: geocodeParams });
    
    if (geocodeResponse.data.status !== 'OK' || !geocodeResponse.data.results[0]) {
      throw new Error('Could not find the specified neighborhood');
    }

    const location = geocodeResponse.data.results[0].geometry.location;
    
    // Get nearby bars
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    const placesParams = {
      location: `${location.lat},${location.lng}`,
      radius: '1500',
      type: 'bar',
      key: process.env.GOOGLE_PLACES_API_KEY,
    };

    const placesResponse = await axios.get(placesUrl, { params: placesParams });
    
    if (placesResponse.data.status !== 'OK') {
      throw new Error('Failed to find bars in the area');
    }

    const bars = filterAdultVenues(placesResponse.data.results);

    const barList = bars.map((bar: { name: string; rating?: number; price_level?: number; vicinity: string }, index: number) => 
      `${index + 1}. ${bar.name} - Rating: ${bar.rating}, Price: ${bar.price_level ? '$'.repeat(bar.price_level) : 'N/A'}, Address: ${bar.vicinity}`
    ).join('\n');

    const prompt = `You are a local nightlife expert creating the perfect bar crawl. 

NEIGHBORHOOD: ${preferences.neighborhood}
NUMBER OF STOPS: ${preferences.numberOfStops}
PREFERRED VIBES: ${preferences.vibes.join(', ')}
${preferences.mustGoBar ? `MUST INCLUDE: ${preferences.mustGoBar}` : ''}

Available bars:
${barList}

Create an optimal bar crawl route with ${preferences.numberOfStops} stops. Consider:
- Walking distance between venues
- Crowd buildup timing (start quieter, build energy)
- Preferred vibes
- Strategic planning (e.g., "Put your name down at [busy bar], then hit a nearby spot while you wait")

${preferences.mustGoBar ? `IMPORTANT: You must include "${preferences.mustGoBar}" if it exists in the list.` : ''}

Respond in JSON format:
{
  "crawl": {
    "stops": [
      {
        "barIndex": 0,
        "order": 1,
        "reasoning": "Start here because...",
        "estimatedTime": "8:00-9:30 PM"
      }
    ],
    "totalEstimatedTime": "4-5 hours",
    "overview": "A strategic crawl that begins..."
  }
}

Make the reasoning engaging and strategic. Focus on timing, logistics, and vibe progression.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a local nightlife expert who creates strategic bar crawl plans."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    const result = JSON.parse(responseText);
    
    const crawl: BarCrawl = {
      stops: result.crawl.stops.map((stop: { barIndex: number; order: number; reasoning: string; estimatedTime: string }) => ({
        bar: bars[stop.barIndex],
        order: stop.order,
        reasoning: stop.reasoning,
        estimatedTime: stop.estimatedTime,
      })),
      totalEstimatedTime: result.crawl.totalEstimatedTime,
      overview: result.crawl.overview,
    };

    return NextResponse.json({ crawl });
  } catch (error) {
    console.error('Error generating bar crawl plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate bar crawl plan' },
      { status: 500 }
    );
  }
}