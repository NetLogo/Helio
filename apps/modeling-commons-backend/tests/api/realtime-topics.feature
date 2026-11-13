@realtime
Feature: Realtime stream topics
  As a signed-in user opening an event stream
  I want to name the topics it follows in its URL
  So that one stream follows every model and notification list the page shows

  @sanity
  Scenario: A stream carries only the topics in its URL
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And a public model "Model B" created by "owner"
    And an authenticated user "reader"
    And "reader" opens an event stream subscribed to model "Model B" as "s"
    When the realtime channel is notified of a comment on "Model A"
    And the realtime channel is notified of a comment on "Model B"
    Then the "s" stream should carry 1 event for model "Model B" within 5 seconds
    And the "s" stream should carry no event for model "Model A"

  Scenario: A comment reaches a stream subscribed to its model
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And an authenticated user "commenter"
    And "owner" opens an event stream subscribed to model "Model A" as "s"
    When "commenter" comments "Ping" on "Model A"
    Then the response status should be 201
    When the pending events have been dispatched
    Then the "s" stream should carry 1 "model_comment.created" event within 5 seconds

  Scenario: A model the caller cannot read answers 403 and one that does not exist answers 404
    Given an authenticated user "owner"
    And a private model "Secret Model" created by "owner"
    And an authenticated user "intruder"
    When "intruder" requests an event stream for model "Secret Model"
    Then the response status should be 403
    When "intruder" requests an event stream for a model that does not exist
    Then the response status should be 404

  Scenario: A granted reader may follow a private model
    Given an authenticated user "owner"
    And a private model "Shared Model" created by "owner"
    And an authenticated user "reader"
    And "owner" has granted "read" permission on "Shared Model" to "reader"
    When "reader" requests an event stream for model "Shared Model"
    Then the response status should be 200

  Scenario: A stream carries no notification unless its user topic is in the URL
    Given an authenticated user "alice"
    And a public model "Model A" created by "alice"
    And "alice" opens an event stream subscribed to model "Model A" as "plain"
    And "alice" opens an event stream subscribed to their notifications as "subscribed"
    When the realtime channel is notified of a notification for "alice"
    Then the "subscribed" stream should carry 1 "user_notification.created" event within 5 seconds
    And the "plain" stream should carry no "user_notification.created" event

  Scenario: A user topic accepts only the caller's own id
    Given an authenticated user "alice"
    And an authenticated user "bob"
    When "alice" requests an event stream for the user topic of "alice"
    Then the response status should be 200
    When "alice" requests an event stream for the user topic of "bob"
    Then the response status should be 403

  Scenario: A topic type no module registers answers 400
    Given an authenticated user "viewer"
    When "viewer" requests an event stream for a "project" topic
    Then the response status should be 400
