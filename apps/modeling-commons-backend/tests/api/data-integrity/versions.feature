@data-integrity
Feature: Model version invariants

  Scenario: Every sampled version is readable
    When I sample 25 model versions
    Then each version returns 200

  Scenario: Every version file key resolves to a stored object
    When I sample 25 model versions
    Then each version's netlogo file key resolves to a stored object

  Scenario: Change summaries are absent or a string, never malformed
    Then every version's changeSummary is null or a non-empty string

  Scenario: Version numbers per model are contiguous from 1
    Then every model's version numbers run from 1 with no gaps
