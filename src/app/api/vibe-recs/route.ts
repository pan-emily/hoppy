import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Bar, VibeRecommendation } from '../../../types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const VIBES = ['fancy', 'dive', 'chill', 'wine bar', 'dancey', 'rooftop'];

export async function POST(request: NextRequest) {
  try {
    const { bars }: { bars: Bar[] } = await request.json();

    if (!bars || bars.length === 0) {
      return NextResponse.json(
        { error: 'No bars provided' },
        { status: 400 }
      );
    }

    const barList = bars.map((bar, index) => 
      `${index}. ${bar.name} - Rating: ${bar.rating || 'N/A'}, Price: ${bar.price_level ? '$'.repeat(bar.price_level) : 'N/A'}, Location: ${bar.vicinity}`
    ).join('\n');

    const prompt = `You are a local bar expert helping classify bars into different vibes. Here are the available vibes: ${VIBES.join(', ')}.

Here are nearby bars:
${barList}

For each vibe category (${VIBES.join(', ')}), select the ONE best matching bar from the list and provide a short, engaging description (1-2 sentences) that captures why this bar fits that vibe. If no bar clearly fits a vibe, you can skip that vibe.

IMPORTANT: Use the exact barIndex number shown in the list above (starting from 0).

Respond in JSON format like this:
{
  "recommendations": [
    {
      "vibe": "fancy",
      "barIndex": 0,
      "description": "An upscale cocktail lounge with craft drinks and elegant ambiance."
    }
  ]
}

Focus on unique characteristics that make each bar special for its vibe. Keep descriptions punchy and appealing.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that classifies bars into vibes and writes engaging descriptions."
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
    
    const vibeRecommendations: VibeRecommendation[] = result.recommendations
      .filter((rec: { vibe: string; barIndex: number; description: string }) => {
        return rec.barIndex >= 0 && rec.barIndex < bars.length;
      })
      .map((rec: { vibe: string; barIndex: number; description: string }) => ({
        vibe: rec.vibe,
        bar: {
          ...bars[rec.barIndex],
          vibe: rec.vibe,
          description: rec.description,
        }
      }));

    return NextResponse.json({ recommendations: vibeRecommendations });
  } catch (error) {
    console.error('Error generating vibe recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate vibe recommendations' },
      { status: 500 }
    );
  }
}