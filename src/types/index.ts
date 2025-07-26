export interface Bar {
  place_id: string;
  name: string;
  rating?: number;
  price_level?: number;
  vicinity: string;
  waitInfo?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    open_now?: boolean;
  };
  photos?: Array<{
    photo_reference: string;
  }>;
}

export interface BarWithVibe extends Bar {
  vibe: string;
  description: string;
  walkingDistance?: string;
  walkingTime?: string;
}

export interface VibeRecommendation {
  vibe: string;
  bar: BarWithVibe;
}

export interface CrawlStop {
  bar: Bar;
  order: number;
  reasoning: string;
  estimatedTime: string;
  visitType?: 'full' | 'putNameDown' | 'return'; // Type of visit
  commuteToNext?: {
    method: 'walk' | 'subway' | 'bus' | 'taxi';
    duration: string;
    instructions?: string; // e.g., "Put your name down first", "Take L train 2 stops"
  };
}

export interface BarCrawl {
  stops: CrawlStop[];
  totalEstimatedTime: string;
  overview: string;
}

export interface PlanningPreferences {
  neighborhood: string;
  numberOfStops: number;
  vibes: string[];
  mustGoBar?: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: string;
  allowTransit?: boolean;
  vetoedBars?: string[]; // Array of place_ids that user has vetoed
}