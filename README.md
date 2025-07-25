# 🍻 HoppyHour

HoppyHour is a mobile-friendly Next.js app that helps users discover great bars nearby and plan the perfect night out.

## Features

### 🎯 Next Bar Discovery (Landing Page)
- **Auto-location detection**: Uses browser geolocation to find your location
- **Smart bar discovery**: Fetches nearby bars using Google Places API
- **AI-powered vibe classification**: Uses OpenAI to categorize bars into vibes:
  - 🍸 Fancy
  - 🍺 Dive
  - 😎 Chill
  - 🍷 Wine Bar
  - 💃 Dancey
  - 🏙️ Rooftop
- **Detailed bar cards**: Shows name, AI-generated description, rating, price, and walking distance
- **One-click maps**: Direct links to open bars in Google Maps

### 🗓️ Plan Your Night (Bar Crawl Planner)
- **Neighborhood-based planning**: Enter any neighborhood or area
- **Customizable preferences**: Choose number of stops (2-4) and preferred vibes
- **Strategic AI planning**: Generates optimal crawl order with timing and logistics
- **Smart recommendations**: Includes tips like "Put your name down at [busy bar], then hit a nearby spot while you wait"
- **Must-go bar option**: Include a specific bar you want to visit

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **APIs**: 
  - Google Places API (bar discovery)
  - Google Distance Matrix API (walking distances)
  - OpenAI GPT-4o (vibe classification & crawl planning)
- **Hosting**: Vercel-ready

## Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env.local` and add your API keys:
   ```
   GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
   GOOGLE_DISTANCE_MATRIX_API_KEY=your_google_distance_matrix_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Get API Keys**:
   - **Google APIs**: Enable Places API and Distance Matrix API in [Google Cloud Console](https://console.cloud.google.com/)
   - **OpenAI**: Get your API key from [OpenAI Platform](https://platform.openai.com/)

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── nearby-bars/route.ts    # Google Places API integration
│   │   ├── walking-distance/route.ts # Distance calculations
│   │   ├── vibe-recs/route.ts      # AI vibe classification
│   │   └── plan/route.ts           # Bar crawl planning
│   ├── plan/page.tsx               # Bar crawl planner page
│   └── page.tsx                    # Landing page with discovery
├── components/
│   └── BarVibeCard.tsx             # Bar recommendation card component
├── utils/
│   ├── fetchNearbyBars.ts          # API utility for nearby bars
│   └── getWalkingDistance.ts       # API utility for walking distances
└── types/
    └── index.ts                    # TypeScript type definitions
```

## API Endpoints

- **GET** `/api/nearby-bars` - Fetch bars near coordinates
- **GET** `/api/walking-distance` - Calculate walking distance/time
- **POST** `/api/vibe-recs` - Generate vibe-based recommendations
- **POST** `/api/plan` - Create bar crawl plan

## Usage

1. **Discovery**: Visit the home page and allow location access to see nearby bars categorized by vibe
2. **Planning**: Click "Plan Your Night Out" to create a custom bar crawl with AI-generated routing and timing

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
