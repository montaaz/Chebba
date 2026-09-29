-- The admin reservations screen opens on "upcoming": active reservations ordered by
-- departure, paged by (start_at, id). This partial index serves it directly.
CREATE INDEX reservations_active_start_idx ON reservations (start_at, id)
  WHERE status IN ('pending', 'confirmed', 'ongoing');
