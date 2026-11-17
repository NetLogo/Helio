Feature: Daily notification digest
  As a recipient of notification emails
  I want one daily email covering my pending notifications
  So that I hear about activity without one email per event

  Background:
    Given an authenticated user "alice"
    And an authenticated user "bob"
    And an authenticated user "carol"
    And a public model "Digest Model" created by "alice"

  @sanity
  Scenario: A digest run emails each daily recipient once, skips immediate categories, and a second run sends nothing
    Given a "daily" notification for "alice" created 2 hours ago
    And a "daily" notification for "alice" created 3 hours ago
    And a "daily" notification for "bob" created 1 hour ago
    And a "immediate" notification for "carol" created 4 hours ago
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 1 digest
    And "bob" should have received 1 digest
    And "carol" should have received 0 digests
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 1 digest
    And "bob" should have received 1 digest

  Scenario: A digest run skips notifications outside the window, without email, or in a category now off
    Given a "daily" notification for "alice" created 49 hours ago
    And a "daily" notification for "alice" created 2 minutes ago
    And a notification without email for "bob" created 2 hours ago
    And a "daily" notification for "carol" created 2 hours ago
    And "carol" turns off email for category "comment.on_your_model"
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 0 digests
    And "bob" should have received 0 digests
    And "carol" should have received 0 digests

  Scenario: A digest run sends only the in-window notification when a recipient also has an old notification
    Given a "daily" notification for "alice" created 3 hours ago
    And a "daily" notification for "alice" created 49 hours ago
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 1 digest
    And the notification for "alice" created 3 hours ago should be sent
    And the notification for "alice" created 49 hours ago should be unsent

  Scenario: A digest run still sends a notification left over from a missed daily run
    Given a "daily" notification for "alice" created 30 hours ago
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 1 digest
    And the notification for "alice" created 30 hours ago should be sent

  Scenario: A recipient with one daily and one off category gets one digest with only the daily notification
    Given a "daily" notification in category "comment.on_your_model" for "alice" created 2 hours ago
    And a "off" notification in category "comment.reply_to_you" for "alice" created 3 hours ago
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 1 digest
    And the notification for "alice" created 2 hours ago should be sent
    And the notification for "alice" created 3 hours ago should be unsent

  Scenario: A failing digest recipient does not stop the others, and the retried run sends each exactly one digest
    Given a "daily" notification for "alice" created 2 hours ago
    And a "daily" notification for "bob" created 2 hours ago
    And the daily digest job retries after 1 second
    And digest delivery to "alice" is rigged to fail once
    When the digest job runs
    Then the digest job should have completed on its second attempt
    And "alice" should have received 1 digest
    And "bob" should have received 1 digest

  @sanity
  Scenario: A second digest run on the same UTC day sends no second digest to a recipient
    Given a "daily" notification for "alice" created 2 hours ago
    When the digest job runs
    Then the digest job should have succeeded
    Given a "daily" notification for "alice" created 3 hours ago
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 1 digest
    And the notification for "alice" created 3 hours ago should be unsent

  Scenario: A digest names a model only to recipients who can still view it, and drops the line of a reply recipient who lost access
    Given a public model "Fading Model" created by "alice"
    And "alice" has granted "read" permission on "Fading Model" to "carol"
    And a "daily" notification for "alice" about "Fading Model" from "bob" created 2 hours ago
    And a "daily" notification in category "comment.reply_to_you" for "bob" about "Fading Model" from "alice" created 2 hours ago
    And a "daily" notification for "bob" created 3 hours ago
    And a "daily" notification for "carol" about "Fading Model" from "alice" created 2 hours ago
    When "alice" updates the model "Fading Model" with visibility "private"
    Then the response status should be 204
    When the digest job runs
    Then the digest job should have succeeded
    And the digest to "alice" should name "Fading Model"
    And the digest to "carol" should name "Fading Model"
    And the digest to "bob" should not name "Fading Model"
    And the notification for "bob" created 2 hours ago should be sent
