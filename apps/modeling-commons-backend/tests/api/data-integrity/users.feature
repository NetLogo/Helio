@data-integrity
Feature: User invariants

  Scenario: Every sampled user has a resolvable profile
    When I sample 25 users
    Then each user profile returns 200

  Scenario: Avatar images are null or resolve
    When I sample 25 users
    Then each user's image is null or resolves

  Scenario: Models-by-user totals match the database
    When I sample 10 users
    Then each user's models route returns 200 with a total matching the database

  Scenario: Soft-deleted users are not exposed
    Then no soft-deleted user appears in the user listing
