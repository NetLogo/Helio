-- Mirrors stripNetlogoVersionPrefix in src/shared/utils/netlogo-file.ts; rewritten rows no longer match, so a rerun changes nothing.
UPDATE "ModelVersion"
SET "netlogoVersion" = NULLIF(regexp_replace("netlogoVersion", '^NetLogo\s*(3D)?\s*', '', 'i'), '')
WHERE "netlogoVersion" ~* '^NetLogo';
