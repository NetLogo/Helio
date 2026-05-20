# Frontend package vulnerability audit — apps/modeling-commons-frontend

`yarn audit` (workspace-wide) surfaced 60+ advisories. After filtering for CVSS ≥ 7.0 AND a realistic exploit path against this specific app, only the items below remain. Most of the workspace advisories live in dev tooling, the `docs` package's sitemap generator, or build-time code that never sees attacker input — those are intentionally excluded.

The frontend's direct deps that pulled the listed vulnerable packages are noted in **via**.

## fast-xml-parser ≥5.0.0 <5.3.5 — entity-encoding bypass (XSS in parsed XML)
**Severity:** critical (CVSS 9.3, CVE-2026-25896, GHSA-m7jm-9gc2-mpf2)
**Location:** `@repo/template > fast-xml-parser@5.2.5`, also pulled transitively via `docs > @nuxtjs/sitemap > fast-xml-parser`
**Description:** `@nuxtjs/sitemap@7.4.7` is a *direct* frontend dependency. It parses external XML (e.g. third-party sitemaps configured under `sitemap.sources`). The current `nuxt.config.ts` doesn't declare external sources, so the only attacker-controlled XML in this app is whatever the build step fetches — currently none. But the vulnerability is one config line away: adding any external sitemap source while pinned to the current version exposes a DOCTYPE entity-encoding bypass that yields stored XSS in the rendered sitemap.
**Workarounds:**
- Option A — Add `"resolutions": { "fast-xml-parser": "^5.3.5" }` (or 5.5.6 to also cover CVE-2026-26278 / CVE-2026-33036) to the root `package.json` and re-yarn.
- Option B — Bump `@nuxtjs/sitemap` to whichever version ships with a patched fast-xml-parser, when available.
**Recommended:** Option A — yarn resolutions is a one-line change and patches the workspace immediately; revisit when @nuxtjs/sitemap upgrades.

## fast-xml-parser ≥5.0.0 <5.5.6 — DoS via entity expansion + numeric-entity bypass
**Severity:** high (CVSS 7.5, CVE-2026-26278, CVE-2026-33036)
**Location:** same as above
**Description:** Sibling advisories to the critical XSS finding above. Both let an attacker freeze the Nitro process while fast-xml-parser expands entities. Same conditional applicability (only fires on attacker-controllable XML input to the sitemap module, which the app doesn't currently configure).
**Workarounds:**
- Option A — Same yarn resolution as the XSS fix (5.5.6 covers both DoS advisories and the XSS one).
**Recommended:** Option A.

## devalue <5.3.2 — DoS via memory exhaustion in `devalue.parse`
**Severity:** high (CVSS 7.5, GHSA-5cqg-9p4j-mgxf, GHSA-2vjf-4qj7-4v7p)
**Location:** Nuxt's payload serialization — `@repo/nuxt-core > nuxt > nitro > devalue` and `@repo/nuxt-core > nuxt > devalue`
**Description:** Nuxt uses `devalue.parse` to deserialize the SSR payload that is sent to the client and to deserialize island/server-payload responses on the server. Both directions are within the trust boundary normally (server → its own client), but `devalue.parse` is also invoked when reading payload chunks under `/_payload.json` and `/__nuxt_island/*`. An attacker can POST a hand-crafted payload directly to those routes and exhaust server memory before Vue ever sees the result.
**Workarounds:**
- Option A — Pin `devalue` via `"resolutions": { "devalue": "^5.3.2" }`.
- Option B — Block `/_payload.json`/`/__nuxt_island/` from external access at the proxy.
**Recommended:** Option A — proxy-level filtering is brittle (Nuxt may rename the routes); the upstream patch caps parse depth and is the durable fix.

## node-forge <1.3.2 — basicConstraints bypass, signature forgery, DoS
**Severity:** high (CVSS 7.4–8.6, GHSA-2r2c-g63r-vccr, GHSA-cfm4-qjh2-4765, GHSA-x4jg-mjrx-434g)
**Location:** `@repo/nuxt-content-assets > node-forge` (transitively via the asset signing path)
**Description:** Multiple high-severity advisories: basicConstraints bypass (chain validation), Ed25519 missing `S > L` check (signature forgery), modInverse infinite loop (DoS), RSA-PKCS extra-ASN.1-field signature forgery. `node-forge` is used inside `@repo/nuxt-content-assets` for asset integrity hashing; it doesn't validate user certs in this app, so the signature-forgery angles are not exploitable here. The modInverse DoS could be reached if an attacker can supply a crafted RSA key to the asset pipeline; that's not the case under any current code path.
**Workarounds:**
- Option A — Pin `node-forge` via yarn resolutions to ≥1.3.2.
- Option B — Replace `@repo/nuxt-content-assets`'s integrity-hashing implementation with `crypto.subtle`/Node's built-in `crypto` to drop the dep.
**Recommended:** Option A — `node-forge` is one resolutions line; rip-and-replace is overkill for a build-time dep.

## Excluded from this report (with reason)

For completeness, advisories surfaced by yarn audit that were filtered out:

- **tar @ docs > … (8.2 / 8.8)** — `docs` is a sibling app/package (not the frontend). The frontend does not depend on `docs`.
- **lodash @ docs > … (8.1 _.template injection)** — same: dev-only path in `docs`, no exploit reaches this app.
- **@isaacs/brace-expansion (uncontrolled resource consumption)** — used in glob-matching at build time only; no untrusted glob input at runtime.
- **Tens of < 7.0 advisories** (regex DoS in `nanoid`, prototype-pollution patterns, dev-only `vitest` chain, etc.) — excluded by the CVSS ≥ 7.0 floor.

## Suggested `resolutions` patch

```json
{
  "resolutions": {
    "fast-xml-parser": "^5.5.6",
    "devalue": "^5.3.2",
    "node-forge": "^1.3.2"
  }
}
```

This covers every item above and is safe to merge as-is — the patched versions are SemVer-compatible.
