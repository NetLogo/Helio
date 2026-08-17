@data-integrity
Feature: Collaborator invariants

  Scenario: Exactly one owner per model
    Then every model has exactly one owner

  Scenario: No duplicate collaborator rows
    Then no model has a duplicate collaborator for the same user

  Scenario: Every collaborator points at a live user and a live model
    Then every collaborator row references a live user and a live model
