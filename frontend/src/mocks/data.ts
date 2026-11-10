import {
  Agency,
  Booking,
  Category,
  Excursion,
  NotificationLog,
  Review,
  TripPackage,
  User,
} from '../types/models';

const now = Date.now();
const hour = 3600 * 1000;
const day = 24 * hour;

export const INITIAL_CATEGORIES: Category[] = [
  { id: 1, name: 'City tour', is_active: true },
  { id: 2, name: 'Nature & Hiking', is_active: true },
  { id: 3, name: 'History & Culture', is_active: true },
  { id: 4, name: 'Food & Drinks', is_active: true },
  { id: 5, name: 'Adventure', is_active: true },
  { id: 6, name: 'Multi-day trip', is_active: true },
];

export const INITIAL_USERS: User[] = [
  {
    id: 1,
    email: 'admin',
    full_name: 'Platform Admin',
    phone: '+77000000000',
    role: 'admin',
    is_blocked: false,
    created_at: new Date(now - 30 * day).toISOString(),
  },
  {
    id: 2,
    email: 'guide@tis.kz',
    full_name: 'Aidar Guide',
    phone: '+77011112233',
    role: 'guide',
    is_blocked: false,
    created_at: new Date(now - 25 * day).toISOString(),
  },
  {
    id: 3,
    email: 'manager@tis.kz',
    full_name: 'Madina Manager',
    phone: '+77022223344',
    role: 'agency_manager',
    is_blocked: false,
    created_at: new Date(now - 20 * day).toISOString(),
  },
  {
    id: 4,
    email: 'tourist@tis.kz',
    full_name: 'Timur Tourist',
    phone: '+77033334455',
    role: 'tourist',
    is_blocked: false,
    created_at: new Date(now - 15 * day).toISOString(),
  },
  {
    id: 5,
    email: 'nomad.agency@tis.kz',
    full_name: 'Yerlan Nomad',
    phone: '+77055556677',
    role: 'agency_manager',
    is_blocked: false,
    created_at: new Date(now - 5 * day).toISOString(),
  },
];

export const INITIAL_AGENCIES: Agency[] = [
  {
    id: 1,
    manager_user_id: 3,
    name: 'Steppe Explorers',
    description: 'Small local agency for canyon, mountain lake, and Silk Road trips across Kazakhstan.',
    city: 'Almaty',
    contact_email: 'info@steppe.kz',
    contact_phone: '+77272223344',
    verification_status: 'verified',
    created_at: new Date(now - 19 * day).toISOString(),
  },
  {
    id: 2,
    manager_user_id: 5,
    name: 'Silk Road Trails',
    description: 'Southern Kazakhstan cultural & archaeological excursions based in Turkestan.',
    city: 'Turkestan',
    contact_email: 'hello@silkroadtrails.kz',
    contact_phone: '+77253334455',
    verification_status: 'pending',
    created_at: new Date(now - 3 * day).toISOString(),
  },
];

export const INITIAL_EXCURSIONS: Excursion[] = [
  {
    id: 1,
    owner_user_id: 2,
    owner_name: 'Aidar Guide',
    category_id: 2,
    category_name: 'Nature & Hiking',
    title: 'Big Almaty Lake Alpine Hike',
    description:
      'A guided alpine hike to the turquoise Big Almaty Lake (2,511 m) in the Ile-Alatau National Park with panoramic viewpoints and picnic stops.',
    city: 'Almaty',
    meeting_point: 'First President Park Main Arch, Almaty',
    duration_minutes: 360,
    base_price_minor: 1500000, // 15,000 KZT
    status: 'published',
    avg_rating: 4.9,
    review_count: 14,
    image_url:
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
    stops: [
      {
        id: 101,
        excursion_id: 1,
        position: 1,
        title: 'First President Park Meet-up',
        description: 'Safety briefing, gear check, and transfer up the gorge.',
        duration_minutes: 30,
      },
      {
        id: 102,
        excursion_id: 1,
        position: 2,
        title: 'Ile-Alatau Eco-post & Pipeline Trail',
        description: 'Scenic ascent through Tien Shan spruce forest with photo stops.',
        duration_minutes: 150,
      },
      {
        id: 103,
        excursion_id: 1,
        position: 3,
        title: 'Big Almaty Lake Panorama Ridge',
        description: 'Mountain tea, picnic overlooking the glacier-fed turquoise lake.',
        duration_minutes: 120,
      },
    ],
    slots: [
      {
        id: 1001,
        excursion_id: 1,
        start_at: new Date(now + 2 * day).toISOString(),
        price_minor: 1500000,
        max_participants: 10,
        booked_seats: 10, // SOLD OUT (Lab04 FR-02 / UC-15 test slot)
        status: 'open',
      },
      {
        id: 1002,
        excursion_id: 1,
        start_at: new Date(now + 4 * day).toISOString(),
        price_minor: 1500000,
        max_participants: 10,
        booked_seats: 4,
        status: 'open',
      },
      {
        id: 1003,
        excursion_id: 1,
        start_at: new Date(now + 6 * day).toISOString(),
        price_minor: 1400000,
        max_participants: 12,
        booked_seats: 2,
        status: 'open',
      },
    ],
  },
  {
    id: 2,
    owner_user_id: 2,
    owner_name: 'Aidar Guide',
    category_id: 1,
    category_name: 'City tour',
    title: 'Old Almaty Heritage & Green Bazaar Walk',
    description:
      'Discover wooden architecture, Panfilov Park, Zenkov Cathedral, and taste local delicacies inside the famous Green Bazaar.',
    city: 'Almaty',
    meeting_point: 'Panfilov Park Eternal Flame Memorial',
    duration_minutes: 180,
    base_price_minor: 800000, // 8,000 KZT
    status: 'published',
    avg_rating: 4.8,
    review_count: 9,
    image_url:
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=900&q=80',
    stops: [
      {
        id: 201,
        excursion_id: 2,
        position: 1,
        title: '28 Panfilov Guardsmen Park',
        description: 'Stories of old Verny and tree-lined avenues.',
        duration_minutes: 45,
      },
      {
        id: 202,
        excursion_id: 2,
        position: 2,
        title: 'Ascension (Zenkov) Cathedral',
        description: 'Visit one of the tallest wooden churches in the world.',
        duration_minutes: 45,
      },
      {
        id: 203,
        excursion_id: 2,
        position: 3,
        title: 'Green Bazaar Tasting Tour',
        description: 'Kurt, dried fruits, baursaks, and local honey tasting.',
        duration_minutes: 90,
      },
    ],
    slots: [
      {
        id: 2001,
        excursion_id: 2,
        start_at: new Date(now + 18 * hour).toISOString(), // < 24h slot
        price_minor: 800000,
        max_participants: 15,
        booked_seats: 6,
        status: 'open',
      },
      {
        id: 2002,
        excursion_id: 2,
        start_at: new Date(now + 3 * day).toISOString(),
        price_minor: 800000,
        max_participants: 15,
        booked_seats: 3,
        status: 'open',
      },
    ],
  },
  {
    id: 3,
    owner_user_id: 3,
    owner_name: 'Madina Manager',
    agency_id: 1,
    agency_name: 'Steppe Explorers',
    category_id: 5,
    category_name: 'Adventure',
    title: 'Charyn Canyon — Valley of Castles Express',
    description:
      'Full-day excursion into the dramatic red sandstone formations of Charyn Canyon with riverside lunch and sunset viewpoint.',
    city: 'Almaty',
    meeting_point: 'Hotel Kazakhstan Main Entrance (Dostyk Ave 52)',
    duration_minutes: 720,
    base_price_minor: 2500000, // 25,000 KZT
    status: 'published',
    avg_rating: 4.95,
    review_count: 22,
    image_url:
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80',
    stops: [
      {
        id: 301,
        excursion_id: 3,
        position: 1,
        title: 'Morning Departure from Almaty',
        description: 'Comfortable A/C minibus along the Kuldzha tract.',
        duration_minutes: 180,
      },
      {
        id: 302,
        excursion_id: 3,
        position: 2,
        title: 'Valley of Castles Canyon Hike',
        description: 'Guided 3 km walk down between 12-million-year-old rock towers.',
        duration_minutes: 180,
      },
      {
        id: 303,
        excursion_id: 3,
        position: 3,
        title: 'Charyn River Eco-Park',
        description: 'Traditional lunch by the cold mountain river before return.',
        duration_minutes: 120,
      },
    ],
    slots: [
      {
        id: 3001,
        excursion_id: 3,
        start_at: new Date(now + 5 * day).toISOString(),
        price_minor: 2500000,
        max_participants: 12,
        booked_seats: 5,
        status: 'open',
      },
      {
        id: 3002,
        excursion_id: 3,
        start_at: new Date(now + 12 * day).toISOString(),
        price_minor: 2500000,
        max_participants: 12,
        booked_seats: 0,
        status: 'open',
      },
    ],
  },
  {
    id: 4,
    owner_user_id: 3,
    owner_name: 'Madina Manager',
    agency_id: 1,
    agency_name: 'Steppe Explorers',
    category_id: 3,
    category_name: 'History & Culture',
    title: 'Tamgaly Petroglyphs UNESCO Day Tour',
    description:
      'Explore Bronze Age rock carvings in the Tamgaly Gorge, a UNESCO World Heritage site northwest of Almaty.',
    city: 'Almaty',
    meeting_point: 'Baitursynov St 100 (Astana Square)',
    duration_minutes: 540,
    base_price_minor: 2200000, // 22,000 KZT
    status: 'published',
    avg_rating: 4.7,
    review_count: 6,
    image_url:
      'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=900&q=80',
    stops: [
      {
        id: 401,
        excursion_id: 4,
        position: 1,
        title: 'Steppe Drive to Tamgaly',
        description: 'Scenic drive across the Chu-Ili steppe.',
        duration_minutes: 150,
      },
      {
        id: 402,
        excursion_id: 4,
        position: 2,
        title: 'Sanctuary of Sun-Headed Deities',
        description: 'Guided walk across Groups I–V petroglyph galleries.',
        duration_minutes: 180,
      },
    ],
    slots: [
      {
        id: 4001,
        excursion_id: 4,
        start_at: new Date(now + 8 * day).toISOString(),
        price_minor: 2200000,
        max_participants: 14,
        booked_seats: 8,
        status: 'open',
      },
    ],
  },
];

export const INITIAL_TRIPS: TripPackage[] = [
  {
    id: 1,
    agency_id: 1,
    agency_name: 'Steppe Explorers',
    category_id: 6,
    category_name: 'Multi-day trip',
    title: 'Kolsai & Kaindy Lakes + Charyn 3-Day Expedition',
    description:
      'Our signature 3-day golden triangle tour across the Tien Shan lakes and canyons with family guesthouse stays and home-cooked Kazakh meals.',
    destination: 'Kolsai Lakes & Saty Village',
    departure_at: new Date(now + 9 * day).toISOString(),
    return_at: new Date(now + 11 * day).toISOString(),
    price_per_person_minor: 12000000, // 120,000 KZT
    total_seats: 16,
    booked_seats: 6,
    included_services:
      'Comfortable Sprinter transport, 2 nights guesthouse accommodation in Saty, 4x4 UAZ transfer to Kaindy, all national park fees, breakfasts & dinners, certified mountain guide.',
    status: 'published',
    avg_rating: 4.92,
    review_count: 18,
    image_url:
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=80',
    days: [
      {
        id: 1,
        trip_package_id: 1,
        day_number: 1,
        title: 'Almaty → Charyn Canyon → Saty Village',
        description:
          'Morning departure, hike through the Valley of Castles, evening check-in at a traditional guesthouse in Saty with bonfire dinner.',
      },
      {
        id: 2,
        trip_package_id: 1,
        day_number: 2,
        title: 'Kolsai-1 & Optional Trek to Kolsai-2',
        description:
          'Full day at the lower and middle Kolsai alpine lakes surrounded by spruce forests.',
      },
      {
        id: 3,
        trip_package_id: 1,
        day_number: 3,
        title: 'Sunken Forest of Lake Kaindy → Almaty',
        description:
          'Off-road UAZ ride to Lake Kaindy, views of submerged spruce trunks, lunch, and evening return to Almaty.',
      },
    ],
  },
  {
    id: 2,
    agency_id: 1,
    agency_name: 'Steppe Explorers',
    category_id: 6,
    category_name: 'Multi-day trip',
    title: 'Mangystau Bozzhyra & Underground Mosques 4-Day Safari',
    description:
      'Off-road 4x4 expedition across the surreal chalk cliffs of Ustyurt Plateau, Torysh Valley of Balls, and Shakpak-Ata.',
    destination: 'Aktau & Mangystau',
    departure_at: new Date(now + 16 * day).toISOString(),
    return_at: new Date(now + 19 * day).toISOString(),
    price_per_person_minor: 24500000, // 245,000 KZT
    total_seats: 12,
    booked_seats: 9,
    included_services:
      '4x4 Toyota Land Cruiser transport, camping gear & glamping yurt stay, 3 meals/day, experienced desert guide.',
    status: 'published',
    avg_rating: 5.0,
    review_count: 11,
    image_url:
      'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=900&q=80',
    days: [
      {
        id: 4,
        trip_package_id: 2,
        day_number: 1,
        title: 'Aktau → Torysh Valley of Balls → Kokala',
        description: 'Meet at Aktau airport, explore giant stone concretions and jurassic clays.',
      },
      {
        id: 5,
        trip_package_id: 2,
        day_number: 2,
        title: 'Sherkala Mountain & Airakty Castles',
        description: 'Hike around the lion-shaped mountain and camp beneath starry desert skies.',
      },
      {
        id: 6,
        trip_package_id: 2,
        day_number: 3,
        title: 'Bozzhyra Fangs Panorama',
        description: 'Upper and lower viewpoints of the iconic Bozzhyra white cliffs.',
      },
      {
        id: 7,
        trip_package_id: 2,
        day_number: 4,
        title: 'Kyzylkup Tiramisu Canyon → Aktau',
        description: 'Layered red-and-white hills and return to the Caspian Sea coast.',
      },
    ],
  },
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 501,
    reference_code: 'TIS-8F3K2A',
    tourist_id: 4,
    tourist_name: 'Timur Tourist',
    excursion_slot_id: 1002,
    offer_title: 'Big Almaty Lake Alpine Hike',
    offer_type: 'excursion',
    city_or_destination: 'Almaty',
    departure_at: new Date(now + 4 * day).toISOString(), // >= 24h (100% refundable)
    seats: 2,
    total_amount_minor: 3000000,
    contact_email: 'tourist@tis.kz',
    contact_phone: '+77033334455',
    special_requests: 'Vegetarian picnic option for 1 person, please.',
    status: 'confirmed',
    payment_status: 'paid',
    transaction_ref: 'MOCK-TX-90112',
    refunded_amount_minor: 0,
    created_at: new Date(now - 2 * day).toISOString(),
  },
  {
    id: 502,
    reference_code: 'TIS-4L9P1Q',
    tourist_id: 4,
    tourist_name: 'Timur Tourist',
    excursion_slot_id: 2001,
    offer_title: 'Old Almaty Heritage & Green Bazaar Walk',
    offer_type: 'excursion',
    city_or_destination: 'Almaty',
    departure_at: new Date(now + 18 * hour).toISOString(), // < 24h (BR-01 non-refundable demo!)
    seats: 1,
    total_amount_minor: 800000,
    contact_email: 'tourist@tis.kz',
    contact_phone: '+77033334455',
    status: 'confirmed',
    payment_status: 'paid',
    transaction_ref: 'MOCK-TX-90188',
    refunded_amount_minor: 0,
    created_at: new Date(now - 1 * day).toISOString(),
  },
  {
    id: 503,
    reference_code: 'TIS-7C2M9X',
    tourist_id: 4,
    tourist_name: 'Timur Tourist',
    excursion_slot_id: 3001,
    offer_title: 'Charyn Canyon — Valley of Castles Express',
    offer_type: 'excursion',
    city_or_destination: 'Almaty',
    departure_at: new Date(now - 5 * day).toISOString(), // Past completed booking (ready for review)
    seats: 2,
    total_amount_minor: 5000000,
    contact_email: 'tourist@tis.kz',
    contact_phone: '+77033334455',
    status: 'completed',
    payment_status: 'released_to_provider',
    transaction_ref: 'MOCK-TX-88420',
    refunded_amount_minor: 0,
    has_review: false,
    created_at: new Date(now - 8 * day).toISOString(),
  },
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 1,
    booking_id: 499,
    tourist_id: 4,
    tourist_name: 'Timur Tourist',
    excursion_id: 1,
    rating: 5,
    comment: 'Aidar knows every trail in Ile-Alatau! We reached the viewpoint before the clouds rolled in.',
    created_at: new Date(now - 10 * day).toISOString(),
  },
  {
    id: 2,
    booking_id: 498,
    tourist_id: 4,
    tourist_name: 'Aigerim S.',
    excursion_id: 3,
    rating: 5,
    comment: 'Well-organized minibus and plenty of time inside the Valley of Castles.',
    created_at: new Date(now - 7 * day).toISOString(),
  },
];

export const INITIAL_NOTIFICATIONS: NotificationLog[] = [
  {
    id: 1,
    booking_id: 501,
    recipient_email: 'tourist@tis.kz',
    type: 'booking_confirmed',
    subject: 'Booking Confirmed [TIS-8F3K2A] — Big Almaty Lake Alpine Hike',
    status: 'sent',
    attempts: 1,
    created_at: new Date(now - 2 * day).toISOString(),
  },
  {
    id: 2,
    booking_id: 502,
    recipient_email: 'tourist@tis.kz',
    type: 'booking_confirmed',
    subject: 'Booking Confirmed [TIS-4L9P1Q] — Old Almaty Heritage & Green Bazaar Walk',
    status: 'sent',
    attempts: 1,
    created_at: new Date(now - 1 * day).toISOString(),
  },
];
