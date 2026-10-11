-- ============================================================
-- Contract and documents of a reservation (rental contract, ID, licence…):
-- photos uploaded by the team, visible to admins only.
-- ============================================================
CREATE TABLE reservation_documents (
  id             serial PRIMARY KEY,
  reservation_id integer      NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  uploaded_by    integer      REFERENCES users (id) ON DELETE SET NULL,
  label          varchar(80)  NOT NULL DEFAULT '',
  width          integer      NOT NULL,
  height         integer      NOT NULL,
  small          bytea        NOT NULL,  -- 480 px: thumbnails
  large          bytea        NOT NULL,  -- 2200 px: readable when zoomed
  bytes          integer      NOT NULL,
  version        integer      NOT NULL DEFAULT 1, -- bumped on rotation
  created_at     timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX reservation_documents_res_idx ON reservation_documents (reservation_id, id);
