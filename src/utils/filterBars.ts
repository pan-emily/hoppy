interface Place {
  business_status: string;
  rating?: number;
  name: string;
  types?: string[];
  vicinity: string;
  price_level?: number;
  place_id: string;
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

export function filterAdultVenues(places: Place[]): Place[] {
  const excludedKeywords = [
    'strip', 'adult', 'gentlemen', 'topless', 'exotic', 'lingerie', 'massage parlor', 
    'escort', 'xxx', 'nude', 'dancers', 'cabaret'
  ];

  const restaurantTypes = [
    'restaurant', 'meal_takeaway', 'meal_delivery', 'food', 'cafe', 'bakery'
  ];

  return places.filter((place) => {
    const nameCheck = !excludedKeywords.some(keyword => 
      place.name.toLowerCase().includes(keyword)
    );
    
    const typeCheck = !place.types?.some(type => 
      type === 'night_club' && excludedKeywords.some(keyword => 
        place.name.toLowerCase().includes(keyword)
      )
    );

    // Filter out restaurants unless they explicitly have bar types too
    const hasBarType = place.types?.some(type => 
      ['bar', 'liquor_store', 'night_club'].includes(type)
    );
    
    const isRestaurant = place.types?.some(type => 
      restaurantTypes.includes(type)
    );

    // Allow if it has bar type, or if it's not a restaurant
    const venueTypeCheck = hasBarType || !isRestaurant;
    
    return place.business_status === 'OPERATIONAL' && 
           place.rating && 
           place.rating >= 3.5 &&
           nameCheck &&
           typeCheck &&
           venueTypeCheck;
  });
}