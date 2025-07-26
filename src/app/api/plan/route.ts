import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { PlanningPreferences, BarCrawl } from '../../../types';
import axios from 'axios';
import { filterAdultVenues } from '../../../utils/filterBars';

interface GooglePlacesBar {
  place_id: string;
  name: string;
  rating?: number;
  price_level?: number;
  vicinity: string;
  business_status: string;
  formatted_address?: string;
  types?: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
  }>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getDayOfWeekPatterns(dayOfWeek?: string): string {
  switch(dayOfWeek) {
    case 'Monday':
    case 'Tuesday':
    case 'Wednesday':
    case 'Thursday':
      return 'Weeknights are generally quieter. Dive bars and casual spots will be less crowded. Fancy cocktail places may close earlier (12-1 AM). Great for intimate conversations and trying places that are usually packed.';
    case 'Friday':
      return 'Friday nights are busy but not peak weekend crazy. Happy hour crowds (5-7 PM) at upscale places, then steady energy all night. Most places stay open late. Good balance of energy without Saturday madness.';
    case 'Saturday':
      return 'Peak party night! Expect waits everywhere after 8 PM. Fancy places get slammed 8-11 PM. Dive bars fill up 10 PM+. Use strategic timing and reservations. Energy builds throughout the night until 2-3 AM.';
    case 'Sunday':
      return 'Sunday Funday but mellower vibe. Many bars close early (12-1 AM). Perfect for day drinking, rooftops, and wine bars. Avoid late-night dance spots. Focus on chill, conversation-friendly venues.';
    default:
      return 'Consider typical crowd patterns for the day of the week.';
  }
}

async function getBarWaitTimeFromReviews(placeId: string): Promise<string> {
  try {
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json`;
    const detailsParams = {
      place_id: placeId,
      fields: 'reviews',
      key: process.env.GOOGLE_PLACES_API_KEY,
    };

    const detailsResponse = await axios.get(detailsUrl, { params: detailsParams });
    
    if (detailsResponse.data.status === 'OK' && detailsResponse.data.result.reviews) {
      const reviews = detailsResponse.data.result.reviews;
      
      // Analyze reviews for wait time mentions
      const waitMentions = reviews.filter((review: { text: string }) => {
        const text = review.text.toLowerCase();
        return text.includes('wait') || text.includes('line') || text.includes('busy') || 
               text.includes('crowded') || text.includes('packed') || text.includes('full') ||
               text.includes('minutes') || text.includes('hour');
      });

      if (waitMentions.length > 0) {
        // Extract specific wait time information
        const recentWaitMention = waitMentions[0].text;
        
        if (recentWaitMention.includes('no wait') || recentWaitMention.includes("didn't wait")) {
          return 'Minimal wait expected';
        } else if (recentWaitMention.includes('long wait') || recentWaitMention.includes('hour')) {
          return 'Long waits reported';
        } else if (recentWaitMention.includes('busy') || recentWaitMention.includes('crowded')) {
          return 'Gets busy - moderate waits';
        } else if (recentWaitMention.includes('packed') || recentWaitMention.includes('full')) {
          return 'Very crowded - expect waits';
        }
      }
    }
  } catch (error) {
    console.error(`Error getting reviews for place ${placeId}:`, error);
  }
  
  return 'Wait info unavailable';
}

function filterByNeighborhood(bars: GooglePlacesBar[], requestedNeighborhood: string): GooglePlacesBar[] {
  const neighborhood = requestedNeighborhood.toLowerCase();
  
  // Define neighborhood exclusions - bars to filter out if they're clearly not in the requested area
  const neighborhoodFilters: { [key: string]: string[] } = {
    'east village': ['bryant park', 'midtown', 'times square', 'central park', 'upper east', 'upper west', 'chelsea', 'flatiron'],
    'west village': ['bryant park', 'midtown', 'times square', 'central park', 'upper east', 'upper west', 'east village'],
    'soho': ['bryant park', 'midtown', 'times square', 'central park', 'upper east', 'upper west'],
    'lower east side': ['bryant park', 'midtown', 'times square', 'central park', 'upper east', 'upper west', 'chelsea'],
    'brooklyn': ['manhattan', 'bryant park', 'midtown', 'times square'],
    'williamsburg': ['manhattan', 'bryant park', 'midtown', 'times square'],
  };
  
  const excludeKeywords = neighborhoodFilters[neighborhood] || [];
  
  return bars.filter(bar => {
    const address = (bar.vicinity || '').toLowerCase();
    const name = bar.name.toLowerCase();
    
    // Filter out bars that have excluded keywords in their address or name
    const shouldExclude = excludeKeywords.some(keyword => 
      address.includes(keyword) || name.includes(keyword)
    );
    
    if (shouldExclude) {
      console.log(`Filtered out ${bar.name} - not in ${requestedNeighborhood} (found in ${address})`);
    }
    
    return !shouldExclude;
  });
}

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
    
    console.log('Geocode API response:', geocodeResponse.data);
    
    if (geocodeResponse.data.status !== 'OK' || !geocodeResponse.data.results[0]) {
      console.error('Geocoding failed:', {
        status: geocodeResponse.data.status,
        error_message: geocodeResponse.data.error_message,
        neighborhood: preferences.neighborhood
      });
      throw new Error(`Could not find the specified neighborhood: ${geocodeResponse.data.error_message || geocodeResponse.data.status}`);
    }

    const location = geocodeResponse.data.results[0].geometry.location;
    
    // Determine search radius based on transit preference and must-go bar
    let searchRadius = '800'; // Tighter neighborhood focus (0.5 miles)
    if (preferences.allowTransit && preferences.mustGoBar) {
      searchRadius = '2000'; // Expanded but still reasonable for transit
    }

    // Get nearby bars with reviews for wait time analysis
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
    const placesParams = {
      location: `${location.lat},${location.lng}`,
      radius: searchRadius,
      type: 'bar',
      key: process.env.GOOGLE_PLACES_API_KEY,
    };

    const placesResponse = await axios.get(placesUrl, { params: placesParams });
    
    if (placesResponse.data.status !== 'OK') {
      throw new Error('Failed to find bars in the area');
    }

    const allBars = placesResponse.data.results;
    
    // Filter bars but preserve the must-go bar if specified
    let bars = filterAdultVenues(allBars);
    
    // Additional neighborhood filtering to ensure bars are actually in the requested area
    // But preserve must-go bars even if they're outside the neighborhood
    let mustGoBarFromFiltered = null;
    if (preferences.mustGoBar) {
      const mustGoBarName = preferences.mustGoBar.toLowerCase().trim();
      mustGoBarFromFiltered = bars.find(bar => {
        const barName = bar.name.toLowerCase();
        return barName.includes(mustGoBarName) || mustGoBarName.includes(barName);
      });
    }
    
    const barsBeforeNeighborhoodFilter = bars.length;
    bars = filterByNeighborhood(bars, preferences.neighborhood);
    console.log(`Neighborhood filtering: ${barsBeforeNeighborhoodFilter} → ${bars.length} bars (filtered out ${barsBeforeNeighborhoodFilter - bars.length} bars not in ${preferences.neighborhood})`);
    
    // Re-add the must-go bar if it was filtered out by neighborhood filtering
    if (mustGoBarFromFiltered && !bars.some(bar => bar.place_id === mustGoBarFromFiltered.place_id)) {
      bars.push(mustGoBarFromFiltered);
      console.log(`Re-added must-go bar "${mustGoBarFromFiltered.name}" despite being outside ${preferences.neighborhood}`);
    }

    // Filter out vetoed bars (but preserve must-go bar)
    if (preferences.vetoedBars && preferences.vetoedBars.length > 0) {
      const barsBeforeVetoFilter = bars.length;
      bars = bars.filter(bar => {
        // Keep the bar if it's not vetoed OR if it's the must-go bar
        const isVetoed = preferences.vetoedBars!.includes(bar.place_id);
        const isMustGo = preferences.mustGoBar && 
          bar.name.toLowerCase().includes(preferences.mustGoBar.toLowerCase());
        
        if (isVetoed && !isMustGo) {
          console.log(`Filtered out vetoed bar: ${bar.name}`);
          return false;
        }
        return true;
      });
      console.log(`Veto filtering: ${barsBeforeVetoFilter} → ${bars.length} bars (removed ${barsBeforeVetoFilter - bars.length} vetoed bars)`);
    }
    
    // If we have a must-go bar, ensure it's in the final list
    if (preferences.mustGoBar) {
      const mustGoBarName = preferences.mustGoBar.toLowerCase().trim();
      console.log(`Looking for must-go bar: "${mustGoBarName}"`);
      
      // Check if must-go bar is already in filtered list
      const mustGoBarExists = bars.some(bar => {
        const barName = bar.name.toLowerCase();
        return barName.includes(mustGoBarName) || mustGoBarName.includes(barName);
      });
      
      console.log(`Must-go bar exists in filtered list: ${mustGoBarExists}`);
      
      if (!mustGoBarExists) {
        // Find the must-go bar in the original unfiltered list
        const mustGoBarFromOriginal = allBars.find((bar: GooglePlacesBar) => {
          const barName = bar.name.toLowerCase();
          return barName.includes(mustGoBarName) || mustGoBarName.includes(barName);
        });
        
        if (mustGoBarFromOriginal) {
          bars.push(mustGoBarFromOriginal);
          console.log(`Added must-go bar "${mustGoBarFromOriginal.name}" back to the list`);
        } else {
          console.log(`Could not find must-go bar "${preferences.mustGoBar}" in nearby search`);
          console.log('Available bars:', allBars.map((b: GooglePlacesBar) => b.name));
          
          // Fallback: Try direct text search for the must-go bar
          try {
            console.log(`Attempting text search for "${preferences.mustGoBar}"`);
            const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
            const textSearchParams = {
              query: `${preferences.mustGoBar} bar ${preferences.neighborhood}`,
              key: process.env.GOOGLE_PLACES_API_KEY,
            };
            
            const textSearchResponse = await axios.get(textSearchUrl, { params: textSearchParams });
            
            if (textSearchResponse.data.status === 'OK' && textSearchResponse.data.results.length > 0) {
              const foundBar = textSearchResponse.data.results[0];
              
              // Ensure the bar has required fields, use fallbacks if missing
              const completeBar = {
                ...foundBar,
                vicinity: foundBar.vicinity || foundBar.formatted_address || 'Address not available',
                rating: foundBar.rating || 4.0, // Default rating if missing
                business_status: foundBar.business_status || 'OPERATIONAL'
              };
              
              bars.push(completeBar);
              console.log(`Found must-go bar via text search: "${completeBar.name}" at ${completeBar.vicinity}`);
            } else {
              console.log(`Text search also failed for "${preferences.mustGoBar}"`);
            }
          } catch (error) {
            console.error('Text search error:', error);
          }
        }
      }
    }

    // Get wait time information from reviews for key bars
    const barsWithWaitInfo = await Promise.all(
      bars.map(async (bar: GooglePlacesBar, index: number) => {
        // Only fetch reviews for a subset to avoid API limits
        let waitInfo = 'Wait info unavailable';
        if (index < 10) { // Limit to first 10 bars to manage API costs
          waitInfo = await getBarWaitTimeFromReviews(bar.place_id);
        }
        return { ...bar, waitInfo };
      })
    );

    const barList = barsWithWaitInfo.map((bar: GooglePlacesBar & { waitInfo: string }, index: number) => 
      `${index}. ${bar.name} - Rating: ${bar.rating}, Price: ${bar.price_level ? '$'.repeat(bar.price_level) : 'N/A'}, Address: ${bar.vicinity}, Wait Times: ${bar.waitInfo}`
    ).join('\n');
    
    console.log('Final bar list sent to AI:');
    console.log(barList);
    console.log('Must-go bar requested:', preferences.mustGoBar);
    
    // Find the must-go bar index
    let mustGoBarIndex = -1;
    if (preferences.mustGoBar) {
      const mustGoName = preferences.mustGoBar.toLowerCase();
      mustGoBarIndex = bars.findIndex(bar => 
        bar.name.toLowerCase().includes(mustGoName) || mustGoName.includes(bar.name.toLowerCase())
      );
      console.log(`Must-go bar "${preferences.mustGoBar}" found at index: ${mustGoBarIndex}`);
    }

    const formatTime = (time: string) => {
      if (!time) return 'not specified';
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${minutes} ${ampm}`;
    };

    const prompt = `You are a local nightlife expert creating the perfect strategic bar crawl. 

NEIGHBORHOOD: ${preferences.neighborhood}
NUMBER OF STOPS: ${preferences.numberOfStops}
PREFERRED VIBES: ${preferences.vibes.join(', ')}
DAY OF WEEK: ${preferences.dayOfWeek || 'Not specified'}
START TIME: ${preferences.startTime ? formatTime(preferences.startTime) : 'not specified'}
END TIME: ${preferences.endTime ? formatTime(preferences.endTime) : 'not specified'}
TRANSIT ALLOWED: ${preferences.allowTransit ? 'Yes - can use subway/bus between bars' : 'No - walking only'}
${preferences.mustGoBar ? `MUST INCLUDE: ${preferences.mustGoBar}` : ''}

Available bars:
${barList}

IMPORTANT RULES:
- Use the exact barIndex number shown in the list above (starting from 0)
- You can use the same barIndex multiple times for strategic "put name down and return" scenarios
- COUNTING RULE: A bar with "putNameDown" + "return" visits counts as 1 unique bar, not 2
- Target ${preferences.numberOfStops} UNIQUE bars total (so if you use put-name-down strategy, you'll have more stops but same number of unique venues)
- CRITICAL: If using put-name-down strategy, there MUST be at least one different bar visit between "putNameDown" and "return" to the same bar
- NEVER have consecutive stops at the same bar (e.g., don't do: Bar A putNameDown → Bar A return immediately)

Create an optimal bar crawl route with ${preferences.numberOfStops} stops that fits within the specified timeframe. Use STRATEGIC PLANNING:

STRATEGIC CONSIDERATIONS:
- **Day-of-Week Patterns**: ${getDayOfWeekPatterns(preferences.dayOfWeek)}
- **Wait Times & Reservations**: Only use put-name-down strategy for genuinely exclusive bars (like Double Chicken Please, PDT) where you literally can't get in without it. Regular bars you just walk into
- **Peak Hours & Energy Timing**: Start with cocktail bars/wine bars (7-8 PM), hit lively spots mid-crawl (9-10 PM), END with dancey/club venues (11 PM+) when energy peaks
- **Wait Time Strategy**: Prioritize bars with minimal waits for LATER stops. People are more patient early in the night but want quick access later when tired/drunk
- **Closing Times**: Most bars close 2-4 AM, but some close earlier on weeknights. Plan accordingly and save late-night spots for last
- **Transportation**: ${preferences.allowTransit ? 'You can use subway/bus for longer distances. Factor in 15-20 min transit time between distant bars. Walking is still preferred for nearby venues.' : 'Walking only - keep all venues within reasonable walking distance (10-15 min max).'}
- **Route Optimization**: If a bar is far from others (different neighborhood/borough), visit it FIRST or LAST to minimize backtracking. Don't put distant bars in the middle of the route.
- **Geographic Clustering**: Group nearby bars together and minimize travel time between stops. If must-go bar is in different area, structure route around it.
- **Energy Progression**: START MELLOW and BUILD TO PEAK ENERGY. Begin with cocktail bars/wine bars, progress to lively bars, END with dancey/clubby venues
- **Must-Go Bar Placement**: ${preferences.mustGoBar ? `"${preferences.mustGoBar}" should be placed strategically based on its expected wait times and peak hours, NOT automatically at the end` : 'N/A'}

STRATEGIC SCENARIOS TO CONSIDER:
1. "Start at [wine bar/cocktail lounge] for sophisticated early drinks and conversation"
2. "Hit [rooftop] during golden hour (7-8 PM), then move to ground level as energy builds"  
3. "Progress from [chill bar] to [lively sports bar] to [dancey/club venue] for escalating energy"
4. "Begin with quiet conversation spots, build to party atmosphere, END at the most energetic venue"
5. "Early: wine/cocktails → Mid: beer/casual → Late: dancing/clubs"
6. IF genuinely exclusive: "Put name down at [Double Chicken Please/PDT], visit [nearby casual bar], return when ready"
${preferences.allowTransit ? '7. "Start in Brooklyn at [distant must-go bar], then take subway to Manhattan for remaining clustered stops"' : ''}
${preferences.allowTransit ? '8. "Do Manhattan bars first, then end the night at [distant Brooklyn bar] to avoid backtracking"' : ''}

TIME ALLOCATION STRATEGY:
- Distribute time based on bar type and expected crowds, not just evenly
- Account for travel time between venues ${preferences.allowTransit ? '(5-10 min walking, 15-20 min transit)' : '(5-15 min walking)'}
- Build in buffer time for potential waits
- Consider ordering efficiency at each stop

${preferences.mustGoBar ? `
⚠️ ABSOLUTE REQUIREMENT - MUST-GO BAR: "${preferences.mustGoBar}" MUST BE INCLUDED. THIS IS NON-NEGOTIABLE.

STEPS TO INCLUDE MUST-GO BAR:
1. Find "${preferences.mustGoBar}" in the bar list above (it's at index ${mustGoBarIndex})
2. Use barIndex ${mustGoBarIndex} for "${preferences.mustGoBar}" 
3. Since most bars have "$" or "$$" price level, use "full" visitType (not putNameDown)
4. ROUTE OPTIMIZATION: Check if "${preferences.mustGoBar}" is far from other bars. If so, visit it FIRST or LAST to minimize travel time
5. Include it as one of your ${preferences.numberOfStops} stops with realistic commute times
6. Mention "${preferences.mustGoBar}" specifically in your reasoning

FAILURE TO INCLUDE "${preferences.mustGoBar}" WILL RESULT IN PLAN REJECTION.

Example for distant must-go bar: If "${preferences.mustGoBar}" is in Brooklyn and others in Manhattan:
- Stop 1: "${preferences.mustGoBar}" at barIndex ${mustGoBarIndex} (full) - Start in Brooklyn
- Commute: "30-35 min subway to Manhattan"
- Stop 2: Manhattan bar (full)
- Stop 3: Another Manhattan bar (full) - Stay in same area` : ''}

Respond in JSON format:
{
  "crawl": {
    "stops": [
      {
        "barIndex": 5,
        "order": 1,
        "visitType": "putNameDown",
        "reasoning": "Start by putting your name down at the popular spot to secure your place...",
        "estimatedTime": "7:00-7:15 PM",
        "commuteToNext": {
          "method": "walk",
          "duration": "5 min",
          "instructions": "Name is down, now kill time at nearby bar"
        }
      },
      {
        "barIndex": 2,
        "order": 2,
        "visitType": "full",
        "reasoning": "Perfect spot to wait while your name moves up the list...",
        "estimatedTime": "7:15-8:30 PM",
        "commuteToNext": {
          "method": "walk",
          "duration": "5 min",
          "instructions": "Time to return for your reserved spot"
        }
      },
      {
        "barIndex": 5,
        "order": 3,
        "visitType": "return",
        "reasoning": "Now return to enjoy the full experience without the wait...",
        "estimatedTime": "8:30-10:00 PM"
      }
    ],
    "totalEstimatedTime": "3 hours",
    "overview": "A strategic crawl that uses the put-name-down strategy..."
  }
}

VISIT TYPES - Use these to create realistic flow:
- "putNameDown": Quick 10-15 min visit just to get on the waitlist
- "full": Normal bar visit for drinks and atmosphere  
- "return": Come back to the bar where you put your name down

PUT-NAME-DOWN STRATEGY - USE ONLY FOR GENUINELY EXCLUSIVE BARS:

WHEN TO USE (very rare - only for bars you literally can't get into):
- World-famous speakeasies: Double Chicken Please, Please Don't Tell (PDT), Employees Only
- Impossible-to-get-into places: Death & Co on Saturday night, Attaboy when it's packed
- Bars known for 2+ hour waits or requiring reservations to get in at all
- Celebrity chef cocktail bars that are genuinely exclusive

WHEN NOT TO USE (99% of bars):
- Regular neighborhood bars (Skinny Dennis, Connolly's, Pianos)
- Hotel bars (The Evelyn, Frederick Hotel)
- Sports bars, dive bars, brewery taprooms
- Any bar where you can normally just walk in
- Weeknight plans (most places aren't that busy)

DEFAULT: Use "full" visitType for almost all bars. Most bars you just walk into and get drinks normally.

ASSESSMENT: Look at the bars in this list - are any of them genuinely exclusive world-famous places that require reservations? If not, use "full" for all stops.

VENUE FOCUS & ENERGY PROGRESSION:
- Prioritize actual BARS over restaurants that happen to serve drinks
- EARLY STOPS: wine bars, cocktail lounges, chill dive bars, rooftops (conversation-friendly)
- MIDDLE STOPS: beer bars, sports bars, lively neighborhood spots (moderate energy)
- FINAL STOPS: dancey bars, clubs, venues with DJs, late-night party spots (high energy)
- Avoid: restaurants, cafes, hotels (unless they have notable bar scenes)

ENERGY LEVELS BY BAR TYPE:
- LOW ENERGY (start here): Wine bars, cocktail lounges, quiet dive bars, chill spots
- MEDIUM ENERGY (middle): Sports bars, beer halls, neighborhood hangouts, fancy bars
- HIGH ENERGY (end here): Dance floors, DJ venues, clubs, late-night party bars, dancey spots

VIBE ENERGY MAPPING:
- LOW ENERGY START: "wine bar", "chill", quiet "dive" bars
- MEDIUM ENERGY MIDDLE: "fancy", "rooftop", lively bars  
- HIGH ENERGY END: "dancey", club-like venues, late-night spots

PROGRESSION RULE: Order bars from lowest to highest energy. Save "dancey" vibes for the FINAL stop when possible.

WAIT TIME OPTIMIZATION:
- EARLY stops: Can handle "Long waits reported" or "Very crowded" bars - people are fresh and patient
- LATE stops: Prioritize "Minimal wait expected" or "Wait info unavailable" bars - avoid waits when energy is flagging
- If a bar shows "Gets busy - moderate waits", place it in early-to-middle timing, not final stops

COMMUTE TIME ACCURACY: For each stop (except the last), include "commuteToNext" with:
- method: "walk", "subway", "bus", or "taxi"
- duration: REALISTIC travel time based on actual distance and method
- instructions: special actions like "Put your name down first", "Take L train 2 stops", "Walk while exploring the area"

REALISTIC COMMUTE TIMES:
- Walking 2-3 blocks: "5-8 min walk"
- Walking 5-10 blocks: "12-15 min walk"  
- Same neighborhood subway: "15-20 min subway"
- Manhattan to Brooklyn: "25-35 min subway"
- Brooklyn to Manhattan: "30-40 min subway"
- Cross-borough (Brooklyn to Brooklyn): "20-30 min"

ASSESS ACTUAL DISTANCES: Look at the addresses to estimate realistic travel times. Don't guess - consider if it's really a 5 min walk or actually a 25 min subway ride.

Focus on STRATEGIC REASONING that shows real nightlife expertise. Mention specific tactical decisions about timing, waits, and flow.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a local nightlife expert and strategic bar crawl planner. You understand wait times, peak hours, reservation systems, and tactical timing. You create sophisticated plans that leverage real-world bar dynamics, not just proximity."
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

    // Clean the response text to extract JSON from markdown code blocks
    let cleanedResponse = responseText.trim();
    
    // Remove markdown code block markers if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    const result = JSON.parse(cleanedResponse);
    
    console.log('AI response:', result);
    console.log('Available bars count:', bars.length);
    
    // Debug: Log the mapping between AI indices and actual bars
    const barUsage = new Map(); // Track barIndex -> visitTypes
    result.crawl.stops.forEach((stop: { barIndex: number; order: number; reasoning: string; estimatedTime: string; visitType?: string }) => {
      if (stop.barIndex >= 0 && stop.barIndex < bars.length) {
        const barName = bars[stop.barIndex].name;
        const visitType = stop.visitType || 'full';
        console.log(`AI wants bar index ${stop.barIndex}: ${barName} (${visitType})`);
        
        // Check if AI's reasoning mentions the correct bar name
        const reasoningLower = stop.reasoning.toLowerCase();
        const barNameLower = barName.toLowerCase();
        const barNameMentioned = reasoningLower.includes(barNameLower) || 
                                barNameLower.includes(reasoningLower.split(' ')[0]); // Check first word
        
        if (!barNameMentioned && preferences.mustGoBar) {
          const mustGoLower = preferences.mustGoBar.toLowerCase();
          const mentionsMustGo = reasoningLower.includes(mustGoLower);
          if (mentionsMustGo && !barNameLower.includes(mustGoLower)) {
            console.error(`🚨 MISMATCH: AI reasoning mentions "${preferences.mustGoBar}" but selected "${barName}" at index ${stop.barIndex}`);
          }
        }
        
        if (!barUsage.has(stop.barIndex)) {
          barUsage.set(stop.barIndex, []);
        }
        barUsage.get(stop.barIndex).push(visitType);
      } else {
        console.log(`AI wants invalid bar index ${stop.barIndex}`);
      }
    });
    
    // Validate bar usage patterns
    barUsage.forEach((visitTypes, barIndex) => {
      const barName = bars[barIndex].name;
      
      if (visitTypes.length > 1) {
        // Same bar used multiple times - check if it's a valid pattern
        const hasNameDown = visitTypes.includes('putNameDown');
        const hasReturn = visitTypes.includes('return');
        // const hasFull = visitTypes.includes('full'); // Removed unused variable
        
        if (hasNameDown && hasReturn) {
          console.log(`✅ Valid pattern: ${barName} uses put-name-down strategy`);
        } else if (visitTypes.every((type: string) => type === 'full')) {
          console.warn(`⚠️  WARNING: ${barName} appears multiple times with 'full' visits - this seems unintentional`);
        } else {
          console.log(`📝 Pattern for ${barName}: ${visitTypes.join(', ')}`);
        }
      }
    });
    
    // Check for consecutive visits to the same bar (invalid pattern)
    for (let i = 0; i < result.crawl.stops.length - 1; i++) {
      const currentStop = result.crawl.stops[i];
      const nextStop = result.crawl.stops[i + 1];
      
      if (currentStop.barIndex === nextStop.barIndex) {
        console.error(`🚨 INVALID PATTERN: Consecutive visits to same bar at index ${currentStop.barIndex}`);
        console.error(`Stop ${i + 1}: ${currentStop.visitType || 'full'} → Stop ${i + 2}: ${nextStop.visitType || 'full'}`);
        throw new Error(`Invalid bar crawl plan: Cannot have consecutive visits to the same bar. There must be at least one different bar between put-name-down and return visits.`);
      }
    }
    
    // Check if all stops use the same bar with same visit type (indicates AI confusion)
    const uniqueFullVisits = new Set();
    result.crawl.stops.forEach((stop: { barIndex: number; visitType?: string }) => {
      if (stop.visitType === 'full' || !stop.visitType) {
        uniqueFullVisits.add(stop.barIndex);
      }
    });
    
    if (uniqueFullVisits.size === 1 && result.crawl.stops.length > 2) {
      console.error('ERROR: AI selected the same bar for all full visits. This indicates confusion.');
    }
    
    // Count unique bars (considering put-name-down strategy)
    const uniqueBars = new Set();
    barUsage.forEach((visitTypes, barIndex) => {
      uniqueBars.add(barIndex);
    });
    
    console.log(`📊 Bar count analysis:`);
    console.log(`- Total stops: ${result.crawl.stops.length}`);
    console.log(`- Unique bars: ${uniqueBars.size}`);
    console.log(`- Requested bars: ${preferences.numberOfStops}`);
    
    if (uniqueBars.size !== preferences.numberOfStops) {
      console.error(`🚨 CRITICAL ERROR: AI created ${uniqueBars.size} unique bars but ${preferences.numberOfStops} were requested`);
      throw new Error(`Invalid bar crawl plan: Expected ${preferences.numberOfStops} unique bars but got ${uniqueBars.size}. Each unique bar should count as one stop, even if using put-name-down strategy.`);
    }
    
    // Check if must-go bar is actually included
    if (preferences.mustGoBar) {
      const mustGoFound = Array.from(uniqueBars as Set<number>).some((barIndex: number) => {
        const barName = barsWithWaitInfo[barIndex].name.toLowerCase();
        const mustGoName = preferences.mustGoBar!.toLowerCase();
        return barName.includes(mustGoName) || mustGoName.includes(barName);
      });
      
      if (!mustGoFound) {
        console.error(`🚨 CRITICAL ERROR: Must-go bar "${preferences.mustGoBar}" was not included in the final plan!`);
        throw new Error(`AI failed to include required bar "${preferences.mustGoBar}" in the plan`);
      } else {
        console.log(`✅ Must-go bar "${preferences.mustGoBar}" is included in the plan`);
      }
    }
    
    // Validate commute times for realism
    result.crawl.stops.forEach((stop: { commuteToNext?: { method: string; duration: string } }, index: number) => {
      if (stop.commuteToNext && index < result.crawl.stops.length - 1) {
        const duration = stop.commuteToNext.duration;
        const method = stop.commuteToNext.method;
        
        // Check for unrealistic times
        if (method === 'walk' && duration.includes('25') || duration.includes('30')) {
          console.warn(`⚠️  Unrealistic walking time: ${duration} - should probably be subway`);
        }
        if (method === 'subway' && duration.includes('5 min')) {
          console.warn(`⚠️  Unrealistic subway time: ${duration} - too short for subway`);
        }
        
        console.log(`🚶 Commute ${index + 1}: ${duration} ${method}`);
      }
    });
    
    const crawl: BarCrawl = {
      stops: result.crawl.stops
        .filter((stop: { barIndex: number; order: number; reasoning: string; estimatedTime: string; visitType?: string; commuteToNext?: { method: string; duration: string; instructions?: string } }) => {
          const isValid = stop.barIndex >= 0 && stop.barIndex < bars.length;
          if (!isValid) {
            console.warn(`Invalid barIndex ${stop.barIndex}, skipping stop`);
          }
          return isValid;
        })
        .map((stop: { barIndex: number; order: number; reasoning: string; estimatedTime: string; visitType?: string; commuteToNext?: { method: string; duration: string; instructions?: string } }) => ({
          bar: {
            ...barsWithWaitInfo[stop.barIndex],
            waitInfo: barsWithWaitInfo[stop.barIndex]?.waitInfo || 'Wait info unavailable'
          },
          order: stop.order,
          reasoning: stop.reasoning,
          estimatedTime: stop.estimatedTime,
          visitType: stop.visitType || 'full',
          commuteToNext: stop.commuteToNext,
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