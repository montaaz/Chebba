-- ============================================================
-- Vehicle photos (up to 10 per vehicle, enforced by the app).
-- The image bytes live in the database so the site works the same on
-- a server with a disk and on serverless hosting (Vercel) without one.
-- Two pre-compressed WebP sizes are stored; listings never read the bytes.
-- ============================================================
CREATE TABLE car_photos (
  id         serial PRIMARY KEY,
  car_id     integer     NOT NULL REFERENCES cars (id) ON DELETE CASCADE,
  position   smallint    NOT NULL DEFAULT 0,
  width      integer     NOT NULL,
  height     integer     NOT NULL,
  small      bytea       NOT NULL,  -- 720 px wide: cards, thumbnails, showroom on phones
  large      bytea       NOT NULL,  -- 1600 px wide: showroom on desktop, full-screen viewer
  bytes      integer     NOT NULL,
  version    integer     NOT NULL DEFAULT 1, -- bumped on replace: new URL, so caches refresh
  created_at timestamptz NOT NULL DEFAULT now()
);
-- every read lists one car's photos in display order
CREATE INDEX car_photos_car_idx ON car_photos (car_id, position, id);
