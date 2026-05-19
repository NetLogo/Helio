Feature: Security Regressions
  These scenarios pin down audited vulnerabilities so reverts of the fix
  are caught by CI. Scenarios tagged @security-todo capture present-day
  (still-insecure) behaviour and must be tightened when the fix lands.

  # C-1: AdminJS panel auth gate. The hook in src/server/plugins/auth.ts
  # gates /admin behind admin auth only when env.isProduction. In test
  # the gate is OFF, so the route is reachable. Once the gate becomes
  # unconditional, the @security-todo scenario flips to require 401/403.
  @security
  Scenario: AdminJS root path is wired through Fastify
    When an anonymous viewer sends a GET request to "/admin"
    Then the response status should not be 404

  @security @security-todo
  Scenario: AdminJS panel is reachable without authentication in non-production
    # @security-todo: should return 401 once the AdminJS gate is widened beyond production.
    When an anonymous viewer sends a GET request to "/admin/resources/User"
    Then the response status should be 200

  # C-2: /v1/dev/fill-in. The route was removed entirely. Asserting it
  # is no longer wired is a regression guard against re-introduction.
  @security
  Scenario: The unauthenticated /v1/dev/fill-in route is gone
    When an anonymous viewer sends a GET request to "/api/v1/dev/fill-in"
    Then the response status should be 404
    When an anonymous viewer sends a POST request to "/api/v1/dev/fill-in"
    Then the response status should be 404

  # H-4: systemRole field is not in updateUserRequestDtoSchema, but the schema
  # does not set additionalProperties: false, so Fastify lets the field through.
  # The service layer rejects the elevation attempt with ForbiddenException (403).
  # This regression test pins the service-layer guard and verifies the field
  # was not silently written to the user record.
  @security
  Scenario: A regular user cannot self-elevate systemRole via PATCH /v1/users/:id
    Given an authenticated user
    When the current user PATCHes their own profile with JSON body:
      """
      {"systemRole": "admin"}
      """
    Then the response status should be 403
    When the current user fetches their own profile
    Then the response status should be 200
    And the response body property "systemRole" should equal "user"

  # H-7: softDelete revokes Better Auth sessions. After DELETE /v1/users/:id
  # the previously-issued cookie must no longer authenticate.
  @security
  Scenario: Soft-deleting a user invalidates their existing session cookie
    Given an authenticated user
    When I delete the current user's account
    Then the response status should be 204
    When the current user fetches "/api/v1/users/whoami" with their old cookie
    Then the response status should be 401

  # H-19: Swagger gate. Swagger is disabled entirely in production and
  # the same preHandler in auth.ts gates /api-docs behind admin auth in
  # production. In non-production the docs are open by design (dev tool).
  @security @security-todo
  Scenario: Swagger docs are reachable without auth in non-production
    # TODO: tighten: even in dev, /api-docs should require an authenticated
    # admin once we ship the unconditional gate.
    When an anonymous viewer sends a GET request to "/api-docs/auth/openapi.json"
    Then the response status should not be 401

  # H-23: avatar magic-byte verification. Declaring image/png but
  # sending an SVG body must be rejected by resolveFile.
  @security
  Scenario: Avatar upload rejects MIME spoofing (svg body sent as image/png)
    Given an authenticated user
    When I upload an avatar declared "image/png" with an SVG payload
    Then the response status should be 400

  # H-24: additional-files have no MIME allowlist. Today the route
  # accepts text/html and application/javascript bodies; resolveFile maps
  # them to application/octet-stream on storage but the request succeeds.
  @security @security-todo
  Scenario Outline: Additional-file upload still accepts script-like MIME types
    # TODO: tighten: once an allowlist lands, these uploads should 400.
    Given an authenticated user "owner"
    And a public model "Attach Sim" created by "owner"
    When "owner" uploads an additional file declared "<mime>" with body "<body>" to "Attach Sim"
    Then the response status should be 201

    Examples:
      | mime                   | body                            |
      | text/html              | <html><script>alert(1)</script> |
      | application/javascript | alert(1);                       |

  # H-2: cross-model additional-file delete blocked by resolveModelResource.
  # Owner of model B trying to delete a file that belongs to model A via
  # /v1/models/{B}/additional-files/{F} must 404.
  @security
  Scenario: Deleting an additional file from a different model returns 404
    Given an authenticated user "alice"
    And a public model "Model A" created by "alice"
    And "alice" has uploaded an additional file "fileA" to "Model A"
    And an authenticated user "bob"
    And a public model "Model B" created by "bob"
    When "bob" deletes additional file "fileA" using the modelId of "Model B"
    Then the response status should be 404
