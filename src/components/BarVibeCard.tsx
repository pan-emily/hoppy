'use client';

import { BarWithVibe } from '../types';

interface BarVibeCardProps {
  recommendation: {
    vibe: string;
    bar: BarWithVibe;
  };
  isCarousel?: boolean;
}

export default function BarVibeCard({ recommendation, isCarousel = false }: BarVibeCardProps) {
  const { vibe, bar } = recommendation;

  const handleOpenInMaps = () => {
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${bar.place_id}`;
    window.open(mapsUrl, '_blank');
  };

  const getPriceDisplay = (priceLevel?: number) => {
    if (!priceLevel) return 'Price not available';
    return '$'.repeat(priceLevel);
  };

  const getRatingDisplay = (rating?: number) => {
    if (!rating) return 'No rating';
    return `${rating}⭐`;
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

  const getPhotoUrl = (photoReference: string, maxWidth: number = 400) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY;
    if (!apiKey) return null;
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
  };

  if (isCarousel) {
    return (
      <div className="h-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden relative transform transition-all duration-300 hover:scale-105 hover:shadow-2xl">
        {/* Background Hero Image */}
        {bar.photos && bar.photos.length > 0 && (
          <div className="absolute inset-0">
            <img
              src={getPhotoUrl(bar.photos[0].photo_reference, 800) || ''}
              alt={`${bar.name} atmosphere`}
              className="w-full h-full object-cover transition-all duration-500"
              loading="lazy"
            />
            {/* Enhanced gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10"></div>
            {/* Subtle vignette effect */}
            <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent to-black/20"></div>
          </div>
        )}
        
        {/* Content Overlay */}
        <div className="relative h-full flex flex-col justify-between p-6 text-white">
          {/* Top Section - Vibe Badge */}
          <div className="flex justify-between items-start">
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
              <div className="flex items-center">
                <span className="text-2xl mr-2">{getVibeEmoji(vibe)}</span>
                <span className="font-semibold capitalize text-sm">{vibe}</span>
              </div>
            </div>
            
            {/* Rating Badge */}
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 border border-white/30">
              <span className="text-sm font-medium">{getRatingDisplay(bar.rating)}</span>
            </div>
          </div>

          {/* Additional Photos Gallery */}
          {bar.photos && bar.photos.length > 1 && (
            <div className="mt-4">
              <div className="flex gap-2 mb-2">
                {bar.photos.slice(1, 5).map((photo, index) => {
                  const photoUrl = getPhotoUrl(photo.photo_reference, 300);
                  if (!photoUrl) return null;
                  return (
                    <div key={index} className="flex-1 h-16 rounded-lg overflow-hidden border-2 border-white/30 bg-white/10 backdrop-blur-sm">
                      <img
                        src={photoUrl}
                        alt={`${bar.name} vibe ${index + 2}`}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        loading="lazy"
                      />
                    </div>
                  );
                })}
              </div>
              {bar.photos.length > 1 && (
                <div className="text-center">
                  <span className="text-xs text-white/70 bg-white/10 backdrop-blur-sm rounded-full px-2 py-1">
                    📸 {bar.photos.length} photos • Tap to explore
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Bottom Section - Bar Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-bold mb-2 leading-tight">{bar.name}</h3>
              <p className="text-white/90 text-sm leading-relaxed line-clamp-3">
                {bar.description}
              </p>
            </div>

            {/* Info Row */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 border border-white/30">
                  {getPriceDisplay(bar.price_level)}
                </span>
                {bar.walkingTime && (
                  <span className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 border border-white/30">
                    🚶 {bar.walkingTime}
                  </span>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="text-white/80 text-xs">
              📍 {bar.vicinity}
            </div>

            {/* Action Button */}
            <button
              onClick={handleOpenInMaps}
              className="w-full bg-white/20 backdrop-blur-sm hover:bg-white/30 border border-white/30 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              🗺️ Open in Maps
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Original vertical card layout for non-carousel use
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200">
      <div className="flex items-center mb-3">
        <span className="text-2xl mr-2">{getVibeEmoji(vibe)}</span>
        <h3 className="text-lg font-semibold text-gray-800 capitalize">
          {vibe} Vibe
        </h3>
      </div>
      
      <h4 className="text-xl font-bold text-gray-900 mb-2">{bar.name}</h4>
      
      {bar.photos && bar.photos.length > 0 && (
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-2 mb-2">
            {bar.photos.slice(0, 6).map((photo, index) => {
              const photoUrl = getPhotoUrl(photo.photo_reference, 400);
              if (!photoUrl) return null;
              return (
                <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={photoUrl}
                    alt={`${bar.name} vibe ${index + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>
          {bar.photos.length > 6 && (
            <div className="text-center">
              <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-1">
                📸 {bar.photos.length} photos available
              </span>
            </div>
          )}
        </div>
      )}
      
      <p className="text-gray-600 mb-4 text-sm leading-relaxed">
        {bar.description}
      </p>
      
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center">
          <span className="font-medium text-gray-700">Rating:</span>
          <span className="ml-1 text-gray-600">{getRatingDisplay(bar.rating)}</span>
        </div>
        
        <div className="flex items-center">
          <span className="font-medium text-gray-700">Price:</span>
          <span className="ml-1 text-gray-600">{getPriceDisplay(bar.price_level)}</span>
        </div>
        
        {bar.walkingTime && (
          <div className="flex items-center">
            <span className="font-medium text-gray-700">Walk:</span>
            <span className="ml-1 text-gray-600">{bar.walkingTime}</span>
          </div>
        )}
      </div>
      
      <div className="text-xs text-gray-500 mb-4">
        📍 {bar.vicinity}
      </div>
      
      <button
        onClick={handleOpenInMaps}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Open in Google Maps
      </button>
    </div>
  );
}