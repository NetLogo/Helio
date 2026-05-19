Feature: Background workers
  As an operator
  I want background workers to pick up audit events
  So that side-effects fire off the events table asynchronously

  Scenario: Event processor marks an unprocessed event as processed
    Given an authenticated user "actor"
    And an unprocessed event of type "test.event" exists for "actor"
    When the event processor queue is triggered
    Then the event should be marked processed within 10 seconds
