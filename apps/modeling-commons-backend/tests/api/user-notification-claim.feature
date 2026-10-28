Feature: Notification email claims
  As the notification sender
  I want each unsent email row to be held by one caller at a time
  So that no notification is emailed twice

  Background:
    Given an authenticated user "recipient"

  Scenario: Only unsent, unclaimed or expired rows are claimed
    Given an unsent notification "idle" for "recipient"
    And an unsent notification "expired" for "recipient" claimed just over the lease ago
    And an unsent notification "held" for "recipient" claimed just under the lease ago
    And a sent notification "done" for "recipient"
    When the notifications "idle,expired,held,done" are claimed
    Then the claimed notifications should be "expired,idle"
    And the claimed notifications should share the claim time stored on each row

  Scenario: A stale claim cannot mark sent or release a row claimed again since
    Given an unsent notification "row" for "recipient"
    And the notification "row" has been claimed as "first"
    And the claim on "row" has outlived the lease
    And the notification "row" has been claimed as "second"
    When the notification "row" is marked sent under claim "first"
    And the claim "first" on "row" is released
    Then the notification "row" should be unsent and held by claim "second"
    When the notification "row" is marked sent under claim "second"
    Then the notification "row" should be sent and unclaimed

  Scenario: A released row can be claimed again at once
    Given an unsent notification "row" for "recipient"
    And the notification "row" has been claimed as "first"
    When the claim "first" on "row" is released
    And the notifications "row" are claimed
    Then the claimed notifications should be "row"
