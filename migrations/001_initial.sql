CREATE TABLE IF NOT EXISTS notices (
  id char(32) PRIMARY KEY,
  source_key text NOT NULL UNIQUE,
  title text NOT NULL,
  organization text NOT NULL,
  prefecture text,
  categories text[] NOT NULL,
  search_text text NOT NULL,
  published_at timestamptz,
  api_retrieved_at timestamptz,
  first_collected_at timestamptz NOT NULL DEFAULT now(),
  last_collected_at timestamptz NOT NULL DEFAULT now(),
  has_documents boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS notices_published_idx ON notices (published_at DESC NULLS LAST, id);
CREATE INDEX IF NOT EXISTS notices_prefecture_idx ON notices (prefecture);
CREATE INDEX IF NOT EXISTS notices_categories_idx ON notices USING gin (categories);
CREATE INDEX IF NOT EXISTS notices_document_idx ON notices (has_documents) WHERE has_documents = true;

CREATE TABLE IF NOT EXISTS sync_runs (
  id uuid PRIMARY KEY,
  started_at timestamptz NOT NULL,
  finished_at timestamptz,
  status text NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  data jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS sync_runs_started_idx ON sync_runs (started_at DESC);
CREATE TABLE IF NOT EXISTS sync_leases (
  name text PRIMARY KEY,
  owner uuid NOT NULL,
  expires_at timestamptz NOT NULL
);
