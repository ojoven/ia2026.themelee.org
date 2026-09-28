CREATE TABLE IF NOT EXISTS onboarding_responses (
  id bigserial PRIMARY KEY,
  client_id text NOT NULL UNIQUE,
  name text,
  role text NOT NULL,
  tools text[] NOT NULL DEFAULT '{}',
  level text NOT NULL,
  topics text[] NOT NULL DEFAULT '{}',
  question text,
  persona text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE onboarding_responses ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE onboarding_responses ALTER COLUMN persona DROP NOT NULL;

CREATE TABLE IF NOT EXISTS live_polls (
  id bigserial PRIMARY KEY,
  topic text,
  question text NOT NULL,
  options text[] NOT NULL,
  multi boolean NOT NULL DEFAULT false,
  max_choices smallint,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_votes (
  poll_id text NOT NULL,
  client_id text NOT NULL,
  choices smallint[] NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, client_id)
);

CREATE TABLE IF NOT EXISTS live_state (
  id smallint PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
