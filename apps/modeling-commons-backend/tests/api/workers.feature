Feature: Background workers
  As an operator
  I want background workers to pick up audit events
  So that side-effects fire off the events table asynchronously

  Scenario: Event processor marks an unprocessed event as processed
    Given an authenticated user "actor"
    And an unprocessed event of type "test.event" exists for "actor"
    When the event processor queue is triggered
    Then the event should be marked processed within 10 seconds

  Scenario: A failing dispatch increments attempts and records the error instead of processing
    Given an authenticated user "actor"
    And an unprocessed event of type "test.event" exists for "actor"
    And dispatching that event is rigged to fail once
    When the event processor queue is triggered
    Then the event should have 1 attempt and a recorded error within 10 seconds
    And the event should still be unprocessed

  Scenario: An event at the retry ceiling is not picked up again
    Given an authenticated user "actor"
    And an unprocessed event of type "test.event" exists for "actor" with 5 prior attempts
    When the event processor queue is triggered
    Then the event should still have 5 attempts after 3 seconds
    And the event should still be unprocessed
