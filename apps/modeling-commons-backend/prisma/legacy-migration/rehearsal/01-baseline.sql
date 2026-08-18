-- Legacy Rails schema subset (the tables initial-import.ts reads), seeded with the
-- "already migrated" snapshot.
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET search_path TO public;

CREATE TABLE people (
    id integer PRIMARY KEY,
    email_address varchar(255), first_name varchar(255), last_name varchar(255),
    password varchar(255), administrator boolean,
    created_at timestamp, updated_at timestamp,
    avatar_file_name text, avatar_content_type varchar(255),
    avatar_file_size integer, avatar_updated_at timestamp,
    salt varchar(255), registration_consent boolean DEFAULT false,
    sex varchar(255), birthdate date, country_name varchar(255),
    send_site_updates boolean DEFAULT true, send_model_updates boolean DEFAULT true,
    send_tag_updates boolean DEFAULT true,
    url varchar(255), biography text, show_email_address boolean DEFAULT false
);

CREATE TABLE nodes (
    id integer PRIMARY KEY, parent_id integer, name text NOT NULL,
    created_at timestamp, updated_at timestamp,
    visibility_id integer DEFAULT 1 NOT NULL, changeability_id integer DEFAULT 1 NOT NULL,
    group_id integer, wants_help boolean DEFAULT false NOT NULL
);

CREATE TABLE versions (
    id integer PRIMARY KEY, node_id integer NOT NULL, person_id integer NOT NULL,
    description text NOT NULL, contents text NOT NULL,
    created_at timestamp, updated_at timestamp
);

CREATE TABLE tags (
    id integer PRIMARY KEY, name varchar(255), person_id integer,
    created_at timestamp, updated_at timestamp
);

CREATE TABLE tagged_nodes (
    id integer PRIMARY KEY, node_id integer, tag_id integer,
    created_at timestamp, updated_at timestamp, person_id integer, comment text
);

CREATE TABLE attachments (
    id integer PRIMARY KEY, node_id integer NOT NULL, person_id integer NOT NULL,
    description varchar(255) NOT NULL, contents bytea NOT NULL,
    filename varchar(255) NOT NULL, content_type varchar(255) NOT NULL,
    created_at timestamp, updated_at timestamp
);

CREATE TABLE spam_warnings (
    id integer PRIMARY KEY, person_id integer, node_id integer,
    created_at timestamp, updated_at timestamp
);

-- initial-import.ts reads these in its last phase; empty is enough.
CREATE TABLE model_views (logged_at timestamp, ip_address text, node_id integer, person_id integer);
CREATE TABLE model_runs (logged_at timestamp, ip_address text, node_id integer, person_id integer);
CREATE TABLE model_downloads (logged_at timestamp, ip_address text, node_id integer, person_id integer);

INSERT INTO people (id, email_address, first_name, last_name, biography, url, birthdate, created_at, updated_at) VALUES
  (1, 'ada@example.com',   'Ada',   'Lovelace', 'Original bio.', 'https://ada.example', '1815-12-10', '2020-01-01 10:00:00', '2020-01-01 10:00:00'),
  (2, 'grace@example.com', 'Grace', 'Hopper',   NULL,            NULL,                  NULL,         '2020-01-02 10:00:00', '2020-01-02 10:00:00'),
  (3, 'alan@example.com',  'Alan',  'Turing',   NULL,            NULL,                  NULL,         '2020-01-03 10:00:00', '2020-01-03 10:00:00'),
  (4, 'spam@example.com',  'Spam',  'Bot',      NULL,            NULL,                  NULL,         '2020-01-04 10:00:00', '2020-01-04 10:00:00');

INSERT INTO nodes (id, name, created_at, updated_at, visibility_id) VALUES
  (10, 'Wolf Sheep Predation', '2020-02-01 10:00:00', '2020-02-01 10:00:00', 1),
  (11, 'Ant Colony',           '2020-02-02 10:00:00', '2020-02-02 10:00:00', 1),
  (12, 'Segregation',          '2020-02-03 10:00:00', '2020-02-03 10:00:00', 1),
  (13, 'Doomed Model',         '2020-02-04 10:00:00', '2020-02-04 10:00:00', 1);

INSERT INTO versions (id, node_id, person_id, description, contents, created_at, updated_at) VALUES
  (100, 10, 1, 'Initial upload', 'code@#$#@#$#@ui@#$#@#$#@wolf info@#$#@#$#@shapes@#$#@#$#@NetLogo 5.0.4', '2020-02-01 10:00:00', '2020-02-01 10:00:00'),
  (101, 11, 2, 'Initial upload', 'code@#$#@#$#@ui@#$#@#$#@ant info@#$#@#$#@shapes@#$#@#$#@NetLogo 6.1.0',  '2020-02-02 10:00:00', '2020-02-02 10:00:00'),
  (102, 12, 3, 'Initial upload', '<?xml version="1.0"?><model version="NetLogo 6.4.0"><info>seg info</info></model>', '2020-02-03 10:00:00', '2020-02-03 10:00:00'),
  (103, 13, 1, 'Initial upload', 'code@#$#@#$#@ui@#$#@#$#@doomed@#$#@#$#@shapes@#$#@#$#@NetLogo 5.0.4', '2020-02-04 10:00:00', '2020-02-04 10:00:00');

INSERT INTO tags (id, name, person_id, created_at, updated_at) VALUES
  (200, 'biology',  1, '2020-03-01 10:00:00', '2020-03-01 10:00:00'),
  (201, 'emergent', 1, '2020-03-02 10:00:00', '2020-03-02 10:00:00');

INSERT INTO tagged_nodes (id, node_id, tag_id, person_id, comment, created_at, updated_at) VALUES
  (300, 10, 200, 1, '', '2020-03-03 10:00:00', '2020-03-03 10:00:00'),
  (301, 11, 201, 2, '', '2020-03-04 10:00:00', '2020-03-04 10:00:00');

INSERT INTO attachments (id, node_id, person_id, description, contents, filename, content_type, created_at, updated_at) VALUES
  (400, 10, 1, 'Preview',   '\x89504e470d0a1a0a01', 'wolf-old.png',  'preview',   '2020-04-01 10:00:00', '2020-04-01 10:00:00'),
  (401, 10, 1, 'Preview v2','\x89504e470d0a1a0a02', 'wolf-new.png',  'preview',   '2020-04-02 10:00:00', '2020-04-02 10:00:00'),
  (402, 10, 1, 'Helper',    '\x6e6c73206f6c64',     'helper.nls',    'extension', '2020-04-03 10:00:00', '2020-04-03 10:00:00'),
  (403, 11, 2, 'Data',      '\x646174612d6f6c64',   'runs.csv',      'data',      '2020-04-04 10:00:00', '2020-04-04 10:00:00'),
  (404, 11, 2, 'Preview',   '\x89504e470d0a1a0a03', 'ant.png',       'preview',   '2020-04-05 10:00:00', '2020-04-05 10:00:00');
