Feature: Background workers
  As an operator
  I want background workers to hand published events to their subscribers and send queued email
  So that side-effects run asynchronously

  @sanity
  Scenario: A committed event is handled by the user-notifications subscriber
    Given an authenticated user "actor"
    And events of type "test.event" are published to the user-notifications queue
    And an event of type "test.event" is recorded for "actor"
    Then the user-notifications job of that event should complete within 10 seconds

  Scenario: A failing handler leaves the user-notifications job waiting to retry
    Given an authenticated user "actor"
    And events of type "test.event" are published to the user-notifications queue
    And handling events is rigged to fail once
    And an event of type "test.event" is recorded for "actor"
    Then the user-notifications job of that event should wait to retry after 1 attempt within 10 seconds

  Scenario: A user-notifications job that keeps failing reaches the dead-letter queue
    Given an authenticated user "actor"
    And events of type "test.event" are published to the user-notifications queue
    And handling events is rigged to always fail
    And an event of type "test.event" is recorded for "actor"
    When a user-notifications job for that event is sent with a retry limit of 1 and a retry delay of 1 second
    Then a copy of the user-notifications job should reach the dead-letter queue within 10 seconds

  Scenario: A comment signals its model and the notified author on the realtime channel
    Given an authenticated user "owner"
    And a public model "Signal Model" created by "owner"
    And an authenticated user "commenter"
    And the realtime channel is listened to
    When "commenter" comments "Ping" on "Signal Model"
    Then the response status should be 201
    And the realtime channel should carry "model_comment.created" for model "Signal Model" once within 5 seconds
    And the realtime channel should carry "user_notification.created" for user "owner" once within 5 seconds
    And the realtime channel should carry nothing for user "commenter"

  @sanity
  Scenario: A queued email is sent by the send-email worker
    Given an authenticated user "recipient"
    And email sending is recorded
    When an email to "recipient" is queued
    Then the email job to "recipient" should complete within 10 seconds
    And exactly 1 email should have been sent to "recipient"

  Scenario: A failing email waits to retry and the other queued emails still go out
    Given an authenticated user "unreachable"
    And an authenticated user "reachable"
    And sending email to "unreachable" is rigged to fail
    When an email to "unreachable" is queued
    And an email to "reachable" is queued
    Then the email job to "unreachable" should wait to retry after 1 attempt within 10 seconds
    And the email job to "reachable" should complete within 10 seconds
    And no email should have been sent to "unreachable"
    And exactly 1 email should have been sent to "reachable"

  Scenario: A failed email is sent once when its retry succeeds
    Given an authenticated user "recipient"
    And sending email to "recipient" is rigged to fail once
    When an email to "recipient" is sent with a retry delay of 1 second
    Then the email job to "recipient" should complete within 10 seconds
    And the email job to "recipient" should have been retried 1 time
    And exactly 1 email should have been sent to "recipient"

  Scenario: An email waiting to retry is not sent again before its retry delay
    Given an authenticated user "recipient"
    And sending email to "recipient" is rigged to fail
    When an email to "recipient" is queued
    Then the email job to "recipient" should wait to retry after 1 attempt within 10 seconds
    And the email job to "recipient" should stay waiting to retry with 1 attempt for 3 seconds

  Scenario: An email that keeps failing reaches the dead-letter queue
    Given an authenticated user "recipient"
    And sending email to "recipient" is rigged to fail
    When an email to "recipient" is sent with a retry limit of 1 and a retry delay of 1 second
    Then a copy of the email job to "recipient" should reach the dead-letter queue within 10 seconds
    And no email should have been sent to "recipient"

  @sanity
  Scenario: Concurrent pollers send each queued email exactly once
    Given an authenticated user "recipient"
    And email sending is recorded
    When 6 emails to "recipient" are queued
    Then every email job to "recipient" should complete within 10 seconds
    And each of the 6 emails to "recipient" should have been sent exactly once
