'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { BarCrawl, PlanningPreferences } from '../../types';

export default function PlanPage() {
  // Get today's day of the week
  const getTodayDayOfWeek = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const [preferences, setPreferences] = useState<PlanningPreferences>({
    neighborhood: '',
    numberOfStops: 3,
    vibes: [],
    mustGoBar: '',
    startTime: '21:00', // Default to 9 PM
    endTime: '01:00',   // Default to 1 AM
    dayOfWeek: getTodayDayOfWeek(), // Default to today
    allowTransit: false, // Default to walking only
    vetoedBars: [], // Track vetoed bars across session
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

  const vetoBar = async (placeId: string) => {
    const updatedVetoedBars = [...(preferences.vetoedBars || []), placeId];
    
    setPreferences(prev => ({
      ...prev,
      vetoedBars: updatedVetoedBars
    }));

    // Recalculate route with updated vetoed bars
    await recalculateRoute(updatedVetoedBars);
  };

  const recalculateRoute = async (vetoedBars: string[]) => {
    setLoading(true);
    setError(null);

    try {
      const updatedPreferences = {
        ...preferences,
        vetoedBars: vetoedBars
      };
      
      const response = await axios.post('/api/plan', updatedPreferences);
      setCrawl(response.data.crawl);
    } catch (err) {
      console.error('Error recalculating bar crawl:', err);
      setError('Failed to recalculate route. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const exportToGoogleMaps = () => {
    if (!crawl) return;
    
    // Create waypoints for Google Maps URL
    const waypoints = crawl.stops
      .map(stop => `${stop.bar.name}, ${stop.bar.vicinity}`)
      .join('|');
    
    // Google Maps directions URL with multiple stops
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&waypoints=${encodeURIComponent(waypoints)}&travelmode=walking`;
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

  const getCommuteIcon = (method: string) => {
    const iconMap: { [key: string]: string } = {
      'walk': '🚶',
      'subway': '🚇',
      'bus': '🚌',
      'taxi': '🚕',
    };
    return iconMap[method.toLowerCase()] || '🚶';
  };

  const getVisitTypeStyle = (visitType?: string) => {
    switch(visitType) {
      case 'putNameDown':
        return 'border-l-4 border-l-blue-500';
      case 'return':
        return 'border-l-4 border-l-green-500';
      default:
        return 'border-l-4 border-l-purple-500';
    }
  };

  const getVisitTypeBadgeColor = (visitType?: string) => {
    switch(visitType) {
      case 'putNameDown':
        return 'bg-blue-600';
      case 'return':
        return 'bg-green-600';
      default:
        return 'bg-purple-600';
    }
  };

  const getVisitTypeLabel = (visitType?: string) => {
    switch(visitType) {
      case 'putNameDown':
        return <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">Put Name Down</span>;
      case 'return':
        return <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">Return Visit</span>;
      default:
        return null;
    }
  };

  // Utility function to count unique bars (currently unused but may be useful)
  // const getUniqueBarCount = () => {
  //   if (!crawl) return 0;
  //   const uniqueBars = new Set(crawl.stops.map(stop => stop.bar.place_id));
  //   return uniqueBars.size;
  // };

  const getWaitTimeStyle = (waitInfo: string) => {
    if (waitInfo.includes('Minimal wait') || waitInfo.includes('no wait')) {
      return 'bg-green-100 text-green-800';
    } else if (waitInfo.includes('moderate') || waitInfo.includes('busy')) {
      return 'bg-yellow-100 text-yellow-800';
    } else if (waitInfo.includes('Long waits') || waitInfo.includes('Very crowded')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
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
              {preferences.neighborhood} • {crawl.totalEstimatedTime} • {new Set(crawl.stops.map(stop => stop.bar.place_id)).size} unique bars
            </p>
          </header>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Overview</h2>
            <p className="text-gray-600 leading-relaxed">{crawl.overview}</p>
          </div>

          <div className="space-y-6">
            {crawl.stops.map((stop, index) => (
              <div key={index}>
                <div className={`bg-white rounded-lg shadow-md p-6 ${getVisitTypeStyle(stop.visitType)}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`text-white rounded-full w-8 h-8 flex items-center justify-center font-bold mr-4 ${getVisitTypeBadgeColor(stop.visitType)}`}>
                        {stop.visitType === 'putNameDown' ? '📝' : stop.visitType === 'return' ? '↩️' : stop.order}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-gray-900">{stop.bar.name}</h3>
                          {getVisitTypeLabel(stop.visitType)}
                        </div>
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

                  {/* Bar Photo */}
                  {stop.bar.photos && stop.bar.photos.length > 0 && (
                    <div className="mb-4">
                      <div className="aspect-video rounded-lg overflow-hidden bg-gray-100 mb-2">
                        <img
                          src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=600&photoreference=${stop.bar.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`}
                          alt={`${stop.bar.name} interior`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      {stop.bar.photos.length > 1 && (
                        <div className="flex gap-2 overflow-x-auto">
                          {stop.bar.photos.slice(1, 4).map((photo, index) => (
                            <div key={index} className="flex-shrink-0 w-16 h-12 rounded-md overflow-hidden bg-gray-100">
                              <img
                                src={`https://maps.googleapis.com/maps/api/place/photo?maxwidth=200&photoreference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY}`}
                                alt={`${stop.bar.name} view ${index + 2}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                          ))}
                          {stop.bar.photos.length > 4 && (
                            <div className="flex-shrink-0 w-16 h-12 rounded-md bg-gray-200 flex items-center justify-center">
                              <span className="text-xs text-gray-600 font-medium">+{stop.bar.photos.length - 4}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-gray-700 mb-4 leading-relaxed">{stop.reasoning}</p>

                  <div className="text-sm text-gray-500 mb-2">
                    📍 {stop.bar.vicinity}
                  </div>
                  
                  {stop.bar.waitInfo && stop.bar.waitInfo !== 'Wait info unavailable' && (
                    <div className={`text-sm mb-4 px-2 py-1 rounded-md inline-block ${getWaitTimeStyle(stop.bar.waitInfo)}`}>
                      ⏱️ {stop.bar.waitInfo}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => openBarInMaps(stop.bar.place_id)}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    >
                      Open in Google Maps
                    </button>
                    <button
                      onClick={() => vetoBar(stop.bar.place_id)}
                      className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      {loading ? '...' : '❌ Veto'}
                    </button>
                  </div>
                </div>

                {/* Commute Information */}
                {stop.commuteToNext && index < crawl.stops.length - 1 && (
                  <div className="flex items-center justify-center py-4">
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center max-w-md">
                      <div className="flex items-center justify-center mb-2">
                        {getCommuteIcon(stop.commuteToNext.method)}
                        <span className="ml-2 font-medium text-gray-700">
                          {stop.commuteToNext.duration} {stop.commuteToNext.method}
                        </span>
                      </div>
                      {stop.commuteToNext.instructions && (
                        <p className="text-sm text-gray-600 italic">
                          💡 {stop.commuteToNext.instructions}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center mt-8 space-y-4">
            <div className="flex justify-center gap-4">
              <button
                onClick={exportToGoogleMaps}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                🗺️ Export to Google Maps
              </button>
              <button
                onClick={() => setCrawl(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Plan Another Crawl
              </button>
            </div>
            
            {preferences.vetoedBars && preferences.vetoedBars.length > 0 && (
              <div className="text-sm text-gray-600">
                {preferences.vetoedBars.length} bar(s) vetoed this session
              </div>
            )}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            />
          </div>

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={preferences.allowTransit}
                onChange={(e) => setPreferences(prev => ({ ...prev, allowTransit: e.target.checked }))}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Allow public transit between bars
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Check this if your must-go bar is outside walking distance from the neighborhood
            </p>
          </div>

          <div>
            <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700 mb-2">
              Day of the Week
            </label>
            <select
              id="dayOfWeek"
              value={preferences.dayOfWeek}
              onChange={(e) => setPreferences(prev => ({ ...prev, dayOfWeek: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            >
              <option value="Monday">Monday</option>
              <option value="Tuesday">Tuesday</option>
              <option value="Wednesday">Wednesday</option>
              <option value="Thursday">Thursday</option>
              <option value="Friday">Friday</option>
              <option value="Saturday">Saturday</option>
              <option value="Sunday">Sunday</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <input
                type="time"
                id="startTime"
                value={preferences.startTime}
                onChange={(e) => setPreferences(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>
            
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <input
                type="time"
                id="endTime"
                value={preferences.endTime}
                onChange={(e) => setPreferences(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
              />
            </div>
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