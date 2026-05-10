-- Discovery specialization tags per profession lane (replaces legacy hair_discovery_focus).

ALTER TABLE "professional_professions" ADD COLUMN IF NOT EXISTS "discovery_categories" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "professional_professions" DROP COLUMN IF EXISTS "hair_discovery_focus";

DROP TYPE IF EXISTS "HairDiscoveryFocus";
