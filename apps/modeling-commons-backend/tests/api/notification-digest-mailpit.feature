@mailpit
Feature: Daily notification digest over SMTP
  As a recipient of notification emails
  I want the daily digest to reach a real mailbox
  So that the rendered email, not only the send call, is checked

  Scenario: A digest run delivers one email that merges a model's comments into one line
    Given Mailpit is reachable
    And an authenticated user "alice"
    And an authenticated user "bob"
    And an authenticated user "carol"
    And a public model "Pond" created by "alice"
    And Mailpit holds no messages to "alice"
    And a "daily" notification for "alice" about "Pond" from "bob" created 2 hours ago
    And a "daily" notification for "alice" about "Pond" from "carol" created 3 hours ago
    When the digest job runs
    Then the digest job should have succeeded
    And Mailpit should hold exactly 1 message to "alice"
    And the Mailpit message to "alice" should have the digest subject
    And the Mailpit message to "alice" should say "bob" and "carol" commented on "Pond"
