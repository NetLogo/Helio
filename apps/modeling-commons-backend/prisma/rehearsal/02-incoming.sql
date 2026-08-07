-- `incoming` is a byte-for-byte copy of the migrated snapshot, then a changelog
-- of everything that happened in the legacy app since the migration.
DROP SCHEMA IF EXISTS incoming CASCADE;
CREATE SCHEMA incoming;

CREATE TABLE incoming.people        (LIKE public.people        INCLUDING ALL);
CREATE TABLE incoming.nodes         (LIKE public.nodes         INCLUDING ALL);
CREATE TABLE incoming.versions      (LIKE public.versions      INCLUDING ALL);
CREATE TABLE incoming.tags          (LIKE public.tags          INCLUDING ALL);
CREATE TABLE incoming.tagged_nodes  (LIKE public.tagged_nodes  INCLUDING ALL);
CREATE TABLE incoming.attachments   (LIKE public.attachments   INCLUDING ALL);
CREATE TABLE incoming.spam_warnings (LIKE public.spam_warnings INCLUDING ALL);
CREATE TABLE incoming.model_views     (LIKE public.model_views     INCLUDING ALL);
CREATE TABLE incoming.model_runs      (LIKE public.model_runs      INCLUDING ALL);
CREATE TABLE incoming.model_downloads (LIKE public.model_downloads INCLUDING ALL);

INSERT INTO incoming.people        SELECT * FROM public.people;
INSERT INTO incoming.nodes         SELECT * FROM public.nodes;
INSERT INTO incoming.versions      SELECT * FROM public.versions;
INSERT INTO incoming.tags          SELECT * FROM public.tags;
INSERT INTO incoming.tagged_nodes  SELECT * FROM public.tagged_nodes;
INSERT INTO incoming.attachments   SELECT * FROM public.attachments;
INSERT INTO incoming.spam_warnings SELECT * FROM public.spam_warnings;

SET search_path TO incoming;

-- 1. a brand new person
INSERT INTO people (id, email_address, first_name, last_name, created_at, updated_at) VALUES
  (5, 'katherine@example.com', 'Katherine', 'Johnson', '2026-01-01 10:00:00', '2026-01-01 10:00:00');

-- 2. a new person reusing an already-migrated email; the newcomer must lose it
INSERT INTO people (id, email_address, first_name, last_name, created_at, updated_at) VALUES
  (6, 'ada@example.com', 'Ada', 'Impostor', '2026-01-02 10:00:00', '2026-01-02 10:00:00');

-- 3. a profile edit that maps onto User columns
UPDATE people SET biography = 'Rewritten bio.', url = 'https://ada.example/new',
                  updated_at = '2026-01-03 10:00:00' WHERE id = 1;

-- 4. a password reset: nothing archive.ts maps, so only updated_at moves
UPDATE people SET password = 'new-digest', updated_at = '2026-01-04 10:00:00' WHERE id = 2;

-- 5. a new model with a version, a preview and a tag
INSERT INTO nodes (id, name, created_at, updated_at, visibility_id) VALUES
  (14, 'Flocking', '2026-02-01 10:00:00', '2026-02-01 10:00:00', 1);
INSERT INTO versions (id, node_id, person_id, description, contents, created_at, updated_at) VALUES
  (104, 14, 5, 'Initial upload', 'code@#$#@#$#@ui@#$#@#$#@flock info@#$#@#$#@shapes@#$#@#$#@NetLogo 6.4.0', '2026-02-01 10:00:00', '2026-02-01 10:00:00');
INSERT INTO attachments (id, node_id, person_id, description, contents, filename, content_type, created_at, updated_at) VALUES
  (405, 14, 5, 'Preview', '\x89504e470d0a1a0a04', 'flocking.png', 'preview', '2026-02-01 10:00:00', '2026-02-01 10:00:00');

-- 6. a node with no versions: archive.ts skips these, so the patch must too
INSERT INTO nodes (id, name, created_at, updated_at, visibility_id) VALUES
  (15, 'Empty Draft', '2026-02-02 10:00:00', '2026-02-02 10:00:00', 1);

-- 7. a node with two spam warnings: excluded, as archive.ts excludes it
INSERT INTO nodes (id, name, created_at, updated_at, visibility_id) VALUES
  (16, 'Buy Cheap Pills', '2026-02-03 10:00:00', '2026-02-03 10:00:00', 1);
INSERT INTO versions (id, node_id, person_id, description, contents, created_at, updated_at) VALUES
  (105, 16, 4, 'Initial upload', 'code@#$#@#$#@ui@#$#@#$#@spam@#$#@#$#@shapes@#$#@#$#@NetLogo 5.0.4', '2026-02-03 10:00:00', '2026-02-03 10:00:00');
INSERT INTO spam_warnings (id, person_id, node_id, created_at, updated_at) VALUES
  (500, 1, 16, '2026-02-04 10:00:00', '2026-02-04 10:00:00'),
  (501, 2, 16, '2026-02-05 10:00:00', '2026-02-05 10:00:00');

-- 8. a new version on an already-migrated node, by a different author, whose
--    only preview is deleted in the same batch: the appended version must not
--    inherit a preview that no longer exists
DELETE FROM attachments WHERE id = 404;
-- 8. a new version on an already-migrated node, by a different author
INSERT INTO versions (id, node_id, person_id, description, contents, created_at, updated_at) VALUES
  (106, 11, 3, 'Tuned parameters', 'code@#$#@#$#@ui@#$#@#$#@ant info v2@#$#@#$#@shapes@#$#@#$#@NetLogo 6.2.0', '2026-03-01 10:00:00', '2026-03-01 10:00:00');
UPDATE nodes SET updated_at = '2026-03-01 10:00:00' WHERE id = 11;

-- 9 + 10 + 11. on node 10: one attachment added, one removed, and the winning
-- preview removed so the preview falls back to the older one
INSERT INTO attachments (id, node_id, person_id, description, contents, filename, content_type, created_at, updated_at) VALUES
  (406, 10, 1, 'Extra', '\x6e6c73206e6577', 'extra.nls', 'extension', '2026-03-02 10:00:00', '2026-03-02 10:00:00');
DELETE FROM attachments WHERE id IN (401, 402);

-- 12 + 13. node 12 renamed, made private, and given a tag
UPDATE nodes SET name = 'Schelling Segregation', visibility_id = 2,
                 updated_at = '2026-03-03 10:00:00' WHERE id = 12;
INSERT INTO tagged_nodes (id, node_id, tag_id, person_id, comment, created_at, updated_at) VALUES
  (302, 12, 200, 3, '', '2026-03-03 10:00:00', '2026-03-03 10:00:00');

-- 14. a node deleted outright, versions and all
DELETE FROM versions WHERE node_id = 13;
DELETE FROM nodes WHERE id = 13;

-- 15. a new tag whose name collides with an existing one once normalised
INSERT INTO tags (id, name, person_id, created_at, updated_at) VALUES
  (202, 'BIOLOGY', 3, '2026-03-04 10:00:00', '2026-03-04 10:00:00');
INSERT INTO tagged_nodes (id, node_id, tag_id, person_id, comment, created_at, updated_at) VALUES
  (303, 11, 202, 3, '', '2026-03-04 10:00:00', '2026-03-04 10:00:00');

-- 16. a genuinely new tag, used by the new model
INSERT INTO tags (id, name, person_id, created_at, updated_at) VALUES
  (203, 'chemistry', 5, '2026-03-05 10:00:00', '2026-03-05 10:00:00');
INSERT INTO tagged_nodes (id, node_id, tag_id, person_id, comment, created_at, updated_at) VALUES
  (304, 14, 203, 5, '', '2026-03-05 10:00:00', '2026-03-05 10:00:00');
