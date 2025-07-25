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

  return places.filter((place) => {
    const nameCheck = !excludedKeywords.some(keyword => 
      place.name.toLowerCase().includes(keyword)
    );
    
    const typeCheck = !place.types?.some(type => 
      type === 'night_club' && excludedKeywords.some(keyword => 
        place.name.toLowerCase().includes(keyword)
      )
    );
    
    return place.business_status === 'OPERATIONAL' && 
           place.rating && 
           place.rating >= 3.5 &&
           nameCheck &&
           typeCheck;
  });
}