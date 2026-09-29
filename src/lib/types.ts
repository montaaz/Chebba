export type Role = "client" | "admin";
export type Kind = "rental" | "transfer";
export type Status = "pending" | "confirmed" | "ongoing" | "completed" | "cancelled";

export type User = {
  id: number;
  role: Role;
  full_name: string;
  email: string;
  phone: string;
};

export type Settings = {
  currency: string;
  price_per_km: number;
  transfer_base_fee: number;
  transfer_min_price: number;
  round_trip_discount_pct: number;
  night_surcharge_pct: number;
  night_start_hour: number;
  night_end_hour: number;
  max_transfer_km: number;
  min_lead_hours: number;
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
};

export type Car = {
  id: number;
  slug: string;
  make: string;
  model: string;
  trim_level: string;
  model_year: number;
  seats: number;
  luggage: number;
  transmission: "automatic" | "manual";
  fuel: "petrol" | "diesel" | "hybrid" | "electric";
  image: string;
  units: number;
  for_rental: boolean;
  for_transfer: boolean;
  price_per_day: number;
  price_per_km: number | null;
  is_active: boolean;
  sort_order: number;
};

export type Place = {
  id: number;
  name: string;
  kind: "airport" | "agency" | "city" | "hotel" | "port";
  lat: number;
  lng: number;
  is_active: boolean;
  sort_order: number;
};

export type Point = { label: string; lat: number; lng: number };

export type Route = { km: number; minutes: number; polyline: string };

export type PriceLine = { label: string; amount: number };

export type Price = {
  unitPrice: number;
  quantity: number;
  fees: number;
  total: number;
  lines: PriceLine[];
};

export type Reservation = {
  id: number;
  reference: string;
  user_id: number;
  car_id: number;
  kind: Kind;
  status: Status;
  start_at: Date;
  end_at: Date;
  pickup_label: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_label: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  distance_km: number;
  duration_min: number;
  route_polyline: string;
  round_trip: boolean;
  passengers: number;
  unit_price: number;
  quantity: number;
  fees: number;
  total_price: number;
  currency: string;
  customer_name: string;
  customer_phone: string;
  note: string;
  admin_note: string;
  created_at: Date;
  car_name: string;
};
