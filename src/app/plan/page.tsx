'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { BarCrawl, PlanningPreferences } from '../../types';

export default function PlanPage() {
  const [preferences, setPreferences] = useState<PlanningPreferences>({
    neighborhood: '',
    numberOfStops: 3,
    vibes: [],
    mustGoBar: '',
  });
  
  const [crawl, setCrawl] = useState<BarCrawl | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableVibes = ['fancy', 'dive', 'chill', 'wine bar', 'dancey', 'rooftop'];

  const handleVibeToggle = (vibe: string) => {
    setPreferences(prev => ({
      ...prev,
      vibes: prev.vibes.includes(vibe)
        ? prev.vibes.filter(v => v !== vibe)
        : [...prev.vibes, vibe]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!preferences.neighborhood.trim()) {
      setError('Please enter a neighborhood');
      return;
    }

    if (preferences.vibes.length === 0) {
      setError('Please select at least one vibe');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/plan', preferences);
      setCrawl(response.data.crawl);
    } catch (err) {
      console.error('Error planning bar crawl:', err);
      setError('Failed to plan your bar crawl. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openBarInMaps = (placeId: string) => {
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
    window.open(mapsUrl, '_blank');
  };

  const getVibeEmoji = (vibe: string) => {
    const emojiMap: { [key: string]: string } = {
      'fancy': '🍸',
      'dive': '🍺',
      'chill': '😎',
      'wine bar': '🍷',
      'dancey': '💃',
      'rooftop': '🏙️',
    };
    return emojiMap[vibe.toLowerCase()] || '🍻';
  };

  if (crawl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <header className="text-center mb-8">
            <Link href="/" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
              ← Back to Discovery
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🗓️ Your Bar Crawl Plan
            </h1>
            <p className="text-gray-600 text-lg">
              {preferences.neighborhood} • {crawl.totalEstimatedTime}
            </p>
          </header>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Overview</h2>
            <p className="text-gray-600 leading-relaxed">{crawl.overview}</p>
          </div>

          <div className="space-y-6">
            {crawl.stops.map((stop, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4">
                      {stop.order}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{stop.bar.name}</h3>
                      <p className="text-gray-600">{stop.estimatedTime}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {stop.bar.rating && (
                      <span className="text-sm text-gray-600">{stop.bar.rating}⭐</span>
                    )}
                    {stop.bar.price_level && (
                      <span className="text-sm text-gray-600">{'$'.repeat(stop.bar.price_level)}</span>
                    )}
                  </div>
                </div>

                <p className="text-gray-700 mb-4 leading-relaxed">{stop.reasoning}</p>

                <div className="text-sm text-gray-500 mb-4">
                  📍 {stop.bar.vicinity}
                </div>

                <button
                  onClick={() => openBarInMaps(stop.bar.place_id)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Open in Google Maps
                </button>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => setCrawl(null)}
              className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Plan Another Crawl
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <header className="text-center mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Back to Discovery
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🗓️ Plan Your Night Out
          </h1>
          <p className="text-gray-600 text-lg">
            Let AI create the perfect bar crawl for you
          </p>
        </header>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div>
            <label htmlFor="neighborhood" className="block text-sm font-medium text-gray-700 mb-2">
              Neighborhood
            </label>
            <input
              type="text"
              id="neighborhood"
              value={preferences.neighborhood}
              onChange={(e) => setPreferences(prev => ({ ...prev, neighborhood: e.target.value }))}
              placeholder="e.g., East Village, Brooklyn, Manhattan"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="numberOfStops" className="block text-sm font-medium text-gray-700 mb-2">
              Number of Stops
            </label>
            <select
              id="numberOfStops"
              value={preferences.numberOfStops}
              onChange={(e) => setPreferences(prev => ({ ...prev, numberOfStops: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value={2}>2 stops</option>
              <option value={3}>3 stops</option>
              <option value={4}>4 stops</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Preferred Vibes (select at least one)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {availableVibes.map((vibe) => (
                <button
                  key={vibe}
                  type="button"
                  onClick={() => handleVibeToggle(vibe)}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 transition-colors ${
                    preferences.vibes.includes(vibe)
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-purple-300'
                  }`}
                >
                  <span className="mr-2">{getVibeEmoji(vibe)}</span>
                  <span className="capitalize text-sm font-medium">{vibe}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="mustGoBar" className="block text-sm font-medium text-gray-700 mb-2">
              Must-Go Bar (optional)
            </label>
            <input
              type="text"
              id="mustGoBar"
              value={preferences.mustGoBar}
              onChange={(e) => setPreferences(prev => ({ ...prev, mustGoBar: e.target.value }))}
              placeholder="Name of a specific bar you want to include"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Planning Your Crawl...
              </span>
            ) : (
              'Create My Bar Crawl'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}