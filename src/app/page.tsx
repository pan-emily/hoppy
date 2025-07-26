'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import BarVibeCard from '../components/BarVibeCard';
import { fetchNearbyBars } from '../utils/fetchNearbyBars';
import { getWalkingDistance } from '../utils/getWalkingDistance';
import { VibeRecommendation } from '../types';
import axios from 'axios';

export default function Home() {
  const [recommendations, setRecommendations] = useState<VibeRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initializeApp() {
      try {
        const position = await getCurrentLocation();
        setUserLocation(position);
        
        const bars = await fetchNearbyBars({
          lat: position.lat,
          lng: position.lng,
          radius: 1000,
        });

        if (bars.length === 0) {
          setError('No bars found nearby. Try a different location.');
          return;
        }

        const vibeResponse = await axios.post('/api/vibe-recs', { bars });
        const vibeRecommendations = vibeResponse.data.recommendations;

        const enrichedRecommendations = await Promise.all(
          vibeRecommendations.map(async (rec: VibeRecommendation) => {
            try {
              const walkingInfo = await getWalkingDistance({
                origin: position,
                destination: {
                  lat: rec.bar.geometry.location.lat,
                  lng: rec.bar.geometry.location.lng,
                },
              });
              
              return {
                ...rec,
                bar: {
                  ...rec.bar,
                  walkingDistance: walkingInfo.distance,
                  walkingTime: walkingInfo.duration,
                },
              };
            } catch (error) {
              console.error('Error getting walking distance:', error);
              return rec;
            }
          })
        );

        setRecommendations(enrichedRecommendations);
      } catch (err) {
        console.error('Error initializing app:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bar recommendations');
      } finally {
        setLoading(false);
      }
    }

    initializeApp();
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const handleScroll = () => {
      const items = carousel.querySelectorAll('[data-carousel-item]');
      const carouselRect = carousel.getBoundingClientRect();
      const carouselLeft = carouselRect.left;
      const carouselCenter = carouselLeft + carouselRect.width / 2;
      const scrollLeft = carousel.scrollLeft;
      
      let focusedIndex = -1;
      let bestCard = { index: 0, visibility: 0 };

      // First pass: try to find a card with 80%+ visibility (ideal case)
      items.forEach((item, index) => {
        const itemRect = item.getBoundingClientRect();
        const itemLeft = itemRect.left;
        const itemRight = itemRect.right;
        
        // Calculate visibility ratio
        const visibleLeft = Math.max(itemLeft, carouselLeft);
        const visibleRight = Math.min(itemRight, carouselLeft + carouselRect.width);
        const visibleWidth = Math.max(0, visibleRight - visibleLeft);
        const totalWidth = itemRect.width;
        const visibilityRatio = visibleWidth / totalWidth;
        
        // Track the most visible card as backup
        if (visibilityRatio > bestCard.visibility) {
          bestCard = { index, visibility: visibilityRatio };
        }
        
        // Prefer leftmost card with high visibility
        if (visibilityRatio >= 0.8 && focusedIndex === -1) {
          focusedIndex = index;
        }
      });

      // If no card has 80%+ visibility, use the most visible card
      if (focusedIndex === -1) {
        focusedIndex = bestCard.index;
      }

      // Apply styling based on whether each card is the focused one
      items.forEach((item, index) => {
        const isFocused = index === focusedIndex;
        const scale = isFocused ? 1.0 : 0.8;
        const opacity = isFocused ? 1 : 0.6;

        (item as HTMLElement).style.transform = `scale(${scale})`;
        (item as HTMLElement).style.opacity = opacity.toString();
      });
    };

    carousel.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial call

    return () => {
      carousel.removeEventListener('scroll', handleScroll);
    };
  }, [recommendations]);

  const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          reject(new Error('Failed to get your location. Please enable location access.'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        }
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Finding Great Bars Nearby</h2>
          <p className="text-gray-500">Getting your location and discovering the perfect spots...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🍺</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              🍻 HoppyHour
            </h1>
            <p className="text-gray-600 text-sm">
              Discover great bars nearby, sorted by vibe
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="pt-24 pb-32 h-screen flex flex-col">
        {recommendations.length > 0 ? (
          <>
            <div className="text-center mb-6 px-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">
                Your Personalized Bar Recommendations
              </h2>
              <p className="text-gray-500 text-sm">
                Swipe left to explore • {recommendations.length} bars found
              </p>
            </div>

            {/* Horizontal Carousel */}
            <div className="flex-1 relative px-4">
              <div 
                ref={carouselRef}
                className="h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              >
                <div className="flex h-full items-center gap-6 px-20" style={{ width: `${recommendations.length * 320 + 1000}px` }}>
                  {recommendations.map((recommendation, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 snap-center transition-all duration-300 ease-out"
                      style={{
                        width: '280px',
                        height: '500px',
                      }}
                      data-carousel-item
                    >
                      <BarVibeCard 
                        recommendation={recommendation} 
                        isCarousel={true}
                      />
                    </div>
                  ))}
                  {/* Invisible spacer to ensure last card can be centered */}
                  <div 
                    className="flex-shrink-0 snap-center"
                    style={{ width: '50vw', height: '1px' }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-center text-gray-600 px-4">
            <div>
              <div className="text-6xl mb-4">🔍</div>
              <p>No recommendations available at the moment.</p>
            </div>
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 p-4">
        <div className="text-center">
          <Link
            href="/plan"
            className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-full transition-colors shadow-lg"
          >
            🗓️ Plan Your Night Out
          </Link>
        </div>
        <div className="text-center mt-2 text-xs text-gray-500">
          Powered by Google Places and OpenAI
        </div>
      </div>
    </div>
  );
}
