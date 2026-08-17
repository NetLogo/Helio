@data-integrity
Feature: Model invariants
  Assertions that hold at any point in the system's life, not statements about
  any particular migration. Read-only: HTTP GET plus Prisma reads.

  Scenario: The model listing paginates to its last page
    When I walk every page of "/api/v1/models"
    Then every page returned 200

  Scenario: Every sampled public model returns a fully populated response
    When I sample 25 public models
    Then each one returns 200 with every required field populated

  Scenario: No model has zero versions
    Then every model has at least one version

  Scenario: Stored latest version matches the highest version number
    Then every model's latestVersionNumber equals the maximum of its version numbers

  Scenario: Soft-deleted models are absent from public listings and detail routes
    Then no soft-deleted model appears in the model listing
    And every soft-deleted model's detail route refuses anonymous access
