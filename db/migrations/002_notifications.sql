-- ============================================================
-- Notifications shown in the site (bell + list).
-- audience 'client' → belongs to one user (user_id)
-- audience 'admin'  → shared by the whole team (user_id is NULL)
-- ============================================================
CREATE TABLE notifications (
  id             serial PRIMARY KEY,
  audience       varchar(8)   NOT NULL CHECK (audience IN ('client', 'admin')),
  user_id        integer      REFERENCES users (id) ON DELETE CASCADE,
  reservation_id integer      REFERENCES reservations (id) ON DELETE CASCADE,
  kind           varchar(24)  NOT NULL,
  title          varchar(120) NOT NULL,
  body           varchar(300) NOT NULL DEFAULT '',
  read_at        timestamptz,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT notifications_owner CHECK ((audience = 'client') = (user_id IS NOT NULL))
);
-- a client's list, newest first
CREATE INDEX notifications_user_idx ON notifications (user_id, id DESC) WHERE audience = 'client';
-- the team's list, newest first
CREATE INDEX notifications_admin_idx ON notifications (id DESC) WHERE audience = 'admin';
-- the unread badge is counted on every page: these stay tiny because read rows drop out
CREATE INDEX notifications_user_unread_idx ON notifications (user_id) WHERE audience = 'client' AND read_at IS NULL;
CREATE INDEX notifications_admin_unread_idx ON notifications (id) WHERE audience = 'admin' AND read_at IS NULL;
-- clean-up of old rows
CREATE INDEX notifications_created_idx ON notifications (created_at);
