@data-integrity
Feature: Interaction count invariants

  Scenario: Stored counts equal a fresh recomputation
    Then every model's stored interaction counts equal a recomputation from the log

  Scenario: No count is negative or null
    Then no model has a negative or null interaction count
