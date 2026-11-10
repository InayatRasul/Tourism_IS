export type UserRole = 'tourist' | 'guide' | 'agency_manager' | 'admin';

export interface User {
  id: number;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  is_blocked?: boolean;
  created_at: string;
}

export interface Agency {
  id: number;
  manager_user_id: number;
  name: string;
  description: string;
  city: string;
  contact_email: string;
  contact_phone: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  is_active: boolean;
}

export interface ItineraryStop {
  id: number;
  excursion_id: number;
  position: number;
  title: string;
  description: string;
  duration_minutes?: number;
}

export interface ExcursionSlot {
  id: number;
  excursion_id: number;
  start_at: string;
  price_minor: number;
  max_participants: number;
  booked_seats: number;
  status: 'open' | 'cancelled';
}

export interface Excursion {
  id: number;
  owner_user_id: number;
  owner_name: string;
  agency_id?: number;
  agency_name?: string;
  category_id: number;
  category_name: string;
  title: string;
  description: string;
  city: string;
  meeting_point: string;
  duration_minutes: number;
  base_price_minor: number;
  status: 'draft' | 'published' | 'archived';
  avg_rating: number;
  review_count: number;
  image_url: string;
  stops: ItineraryStop[];
  slots: ExcursionSlot[];
}

export interface TripDay {
  id: number;
  trip_package_id: number;
  day_number: number;
  title: string;
  description: string;
}

export interface TripPackage {
  id: number;
  agency_id: number;
  agency_name: string;
  category_id: number;
  category_name: string;
  title: string;
  description: string;
  destination: string;
  departure_at: string;
  return_at: string;
  price_per_person_minor: number;
  total_seats: number;
  booked_seats: number;
  included_services: string;
  status: 'draft' | 'published' | 'cancelled' | 'archived';
  avg_rating: number;
  review_count: number;
  image_url: string;
  days: TripDay[];
}

export type BookingStatus =
  | 'confirmed'
  | 'cancelled_by_tourist'
  | 'cancelled_by_provider'
  | 'completed';

export type PaymentStatus = 'paid' | 'refunded' | 'released_to_provider';

export interface Booking {
  id: number;
  reference_code: string;
  tourist_id: number;
  tourist_name: string;
  excursion_slot_id?: number;
  trip_package_id?: number;
  offer_title: string;
  offer_type: 'excursion' | 'trip';
  city_or_destination: string;
  departure_at: string;
  seats: number;
  total_amount_minor: number;
  contact_email: string;
  contact_phone: string;
  special_requests?: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  transaction_ref: string;
  refunded_amount_minor: number;
  has_review?: boolean;
  created_at: string;
  cancelled_at?: string;
}

export interface Review {
  id: number;
  booking_id: number;
  tourist_id: number;
  tourist_name: string;
  excursion_id?: number;
  trip_package_id?: number;
  rating: number;
  comment: string;
  created_at: string;
}

export interface NotificationLog {
  id: number;
  booking_id?: number;
  recipient_email: string;
  type:
    | 'booking_confirmed'
    | 'slot_rescheduled'
    | 'booking_cancelled_by_tourist'
    | 'cancelled_by_provider'
    | 'provider_new_booking';
  subject: string;
  status: 'pending' | 'sent' | 'failed';
  attempts: number;
  created_at: string;
}
