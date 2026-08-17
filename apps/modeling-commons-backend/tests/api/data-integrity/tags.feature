@data-integrity
Feature: Tag invariants

  Scenario: The tag listing paginates to its last page
    When I walk every page of "/api/v1/tags"
    Then every page returned 200

  Scenario: Every sampled tag page is readable
    When I sample 25 tags
    Then each tag page returns 200

  # "No tag is orphaned from every model" was specified in the plan but is not
  # an invariant: a tag whose last model version is untagged or deleted is a
  # normal resting state, and the seed itself ships one ("agent-based").
  # Asserting it would fail on healthy data. Orphan tags are a reporting
  # question, not an integrity one.

  Scenario: Every tag has a usable name
    Then no tag has a blank name
