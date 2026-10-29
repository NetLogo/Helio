Feature: Background workers
  As an operator
  I want background workers to pick up audit events
  So that side-effects fire off the events table asynchronously

  @sanity
  Scenario: Event processor marks an unprocessed event as processed
    Given an authenticated user "actor"
    And an unprocessed event of type "test.event" exists for "actor"
    When the event processor queue is triggered
    Then the event should be marked processed within 10 seconds

  Scenario: A failing handler increments attempts and records the error instead of processing
    Given an authenticated user "actor"
    And an unprocessed event of type "test.event" exists for "actor"
    And handling that event is rigged to fail once
    When the event processor queue is triggered
    Then the event should have 1 attempt and a recorded error within 10 seconds
    And the event should still be unprocessed

  Scenario: An event at the retry ceiling is not picked up again
    Given an authenticated user "actor"
    And an unprocessed event of type "test.event" exists for "actor" with 5 prior attempts
    When the event processor queue is triggered
    Then the event should still have 5 attempts after 3 seconds
    And the event should still be unprocessed

  @sanity
  Scenario: Email sender sends a queued email and marks it sent
    Given an authenticated user "recipient"
    And a queued email to "recipient" exists
    When the email sender queue is triggered
    Then the queued email to "recipient" should be marked sent within 10 seconds

  Scenario: A failing email records its error and the other queued emails still go out
    Given an authenticated user "unreachable"
    And an authenticated user "reachable"
    And a queued email to "unreachable" exists
    And a queued email to "reachable" exists
    And sending email to "unreachable" is rigged to fail
    When the email sender queue is triggered
    Then the queued email to "unreachable" should have 1 attempt and a recorded error within 10 seconds
    And the queued email to "unreachable" should still be unsent
    And the queued email to "reachable" should be marked sent within 10 seconds

  Scenario: A queued email that failed is sent once after SMTP recovers
    Given an authenticated user "recipient"
    And a queued email to "recipient" exists
    And sending email to "recipient" is rigged to fail
    When the email sender queue is triggered
    Then the queued email to "recipient" should have 1 attempt and a recorded error within 10 seconds
    When sending email is restored
    And the queued email to "recipient" is due for retry
    And the email sender queue is triggered
    Then the queued email to "recipient" should be marked sent within 10 seconds
    When the email sender queue is triggered
    Then the queued email to "recipient" should keep its sent time and 1 attempt after 3 seconds

  Scenario: A queued email waiting out its retry delay is not picked up early
    Given an authenticated user "recipient"
    And a queued email to "recipient" exists that is not due for another hour
    When the email sender queue is triggered
    Then the queued email to "recipient" should still have 0 attempts after 3 seconds
    And the queued email to "recipient" should still be unsent

  Scenario: A queued email at the retry ceiling is not picked up again
    Given an authenticated user "recipient"
    And a queued email to "recipient" exists with 8 prior attempts
    When the email sender queue is triggered
    Then the queued email to "recipient" should still have 8 attempts after 3 seconds
    And the queued email to "recipient" should still be unsent
