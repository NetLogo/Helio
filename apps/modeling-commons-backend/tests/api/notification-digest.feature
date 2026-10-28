Feature: Daily notification digest
  As a recipient of notification emails
  I want one daily email covering my pending notifications
  So that I hear about activity without one email per event

  Background:
    Given digest mail delivery is captured
    And an authenticated user "alice"
    And an authenticated user "bob"
    And an authenticated user "carol"

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

  Scenario: A digest run skips rows outside the window, without email, or in a category now off
    Given a "daily" notification for "alice" created 26 hours ago
    And a "daily" notification for "alice" created 2 minutes ago
    And a notification without email for "bob" created 2 hours ago
    And a "daily" notification for "carol" created 2 hours ago
    And "carol" turns off email for category "comment.on_your_model"
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 0 digests
    And "bob" should have received 0 digests
    And "carol" should have received 0 digests

  Scenario: A digest run sends only the in-window row when a recipient also has an old row
    Given a "daily" notification for "alice" created 3 hours ago
    And a "daily" notification for "alice" created 26 hours ago
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 1 digest
    And the notification for "alice" created 3 hours ago should be sent
    And the notification for "alice" created 26 hours ago should be unsent and unclaimed

  Scenario: A recipient with one daily and one off category gets one digest with only the daily row
    Given a "daily" notification in category "comment.on_your_model" for "alice" created 2 hours ago
    And a "off" notification in category "comment.reply_to_you" for "alice" created 3 hours ago
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 1 digest
    And the notification for "alice" created 2 hours ago should be sent
    And the notification for "alice" created 3 hours ago should be unsent and unclaimed

  Scenario: A failing digest recipient fails the run, and the retry reaches only that recipient
    Given a "daily" notification for "alice" created 2 hours ago
    And a "daily" notification for "bob" created 2 hours ago
    And digest mail delivery to "alice" fails once
    When the digest job runs
    Then the digest job should have failed
    And "alice" should have received 0 digests
    And "bob" should have received 1 digest
    When the digest job runs
    Then the digest job should have succeeded
    And "alice" should have received 1 digest
    And "bob" should have received 1 digest

  Scenario: A digest names a model only to recipients who can still view it
    Given a public model "Fading Model" created by "alice"
    And "alice" has granted "read" permission on "Fading Model" to "carol"
    And a "daily" notification for "alice" about "Fading Model" from "bob" created 2 hours ago
    And a "daily" notification for "bob" about "Fading Model" from "alice" created 2 hours ago
    And a "daily" notification for "carol" about "Fading Model" from "alice" created 2 hours ago
    When "alice" updates the model "Fading Model" with visibility "private"
    Then the response status should be 204
    When the digest job runs
    Then the digest job should have succeeded
    And the digest to "alice" should name "Fading Model"
    And the digest to "carol" should name "Fading Model"
    And the digest to "bob" should not name "Fading Model"
