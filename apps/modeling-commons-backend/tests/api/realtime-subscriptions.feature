@realtime
Feature: Realtime stream subscriptions
  As a signed-in user holding an event stream
  I want to add and remove topics on it
  So that one stream follows every model and notification list the page shows

  @sanity
  Scenario: A stream first sends its own connection id
    Given an authenticated user "viewer"
    And "viewer" opens an event stream as "first"
    And "viewer" opens an event stream as "second"
    Then the first message on the "first" stream should be its connection message
    And the "first" and "second" streams should carry different connection ids

  @sanity
  Scenario: A model topic reaches the stream only after it is subscribed
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And a public model "Model B" created by "owner"
    And an authenticated user "reader"
    And "reader" opens an event stream as "s"
    When the realtime channel is notified of a comment on "Model A"
    And "reader" subscribes the "s" stream to model "Model B"
    Then the response status should be 204
    When the realtime channel is notified of a comment on "Model B"
    Then the "s" stream should carry 1 event for model "Model B" within 5 seconds
    And the "s" stream should carry no event for model "Model A"
    When "reader" subscribes the "s" stream to model "Model A"
    Then the response status should be 204
    When the realtime channel is notified of a comment on "Model A"
    Then the "s" stream should carry 1 event for model "Model A" within 5 seconds

  Scenario: A comment reaches a stream subscribed to its model
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And an authenticated user "commenter"
    And "owner" opens an event stream as "s"
    And "owner" subscribes the "s" stream to model "Model A"
    When "commenter" comments "Ping" on "Model A"
    Then the response status should be 201
    When the pending events have been dispatched
    Then the "s" stream should carry 1 "model_comment.created" event within 5 seconds

  Scenario: A model the caller cannot read answers 403 and one that does not exist answers 404
    Given an authenticated user "owner"
    And a private model "Secret Model" created by "owner"
    And an authenticated user "intruder"
    And "intruder" opens an event stream as "s"
    When "intruder" subscribes the "s" stream to model "Secret Model"
    Then the response status should be 403
    When the realtime channel is notified of a comment on "Secret Model"
    And "intruder" subscribes the "s" stream to a model that does not exist
    Then the response status should be 404
    And the "s" stream should carry no event for model "Secret Model"

  Scenario: A granted reader may subscribe to a private model
    Given an authenticated user "owner"
    And a private model "Shared Model" created by "owner"
    And an authenticated user "reader"
    And "owner" has granted "read" permission on "Shared Model" to "reader"
    And "reader" opens an event stream as "s"
    When "reader" subscribes the "s" stream to model "Shared Model"
    Then the response status should be 204

  Scenario: Another user's or an unknown connection id answers 404
    Given an authenticated user "alice"
    And a public model "Model A" created by "alice"
    And an authenticated user "bob"
    And "alice" opens an event stream as "alice"
    When "bob" subscribes the "alice" stream to model "Model A"
    Then the response status should be 404
    When "bob" subscribes an unknown connection to model "Model A"
    Then the response status should be 404

  Scenario: A stream carries no notification unless its user topic is subscribed
    Given an authenticated user "alice"
    And "alice" opens an event stream as "plain"
    And "alice" opens an event stream subscribed to their notifications as "subscribed"
    When the realtime channel is notified of a notification for "alice"
    Then the "subscribed" stream should carry 1 "user_notification.created" event within 5 seconds
    And the "plain" stream should carry no "user_notification.created" event

  Scenario: A user topic accepts only the caller's own id
    Given an authenticated user "alice"
    And an authenticated user "bob"
    And "alice" opens an event stream as "s"
    When "alice" subscribes the "s" stream to the user topic of "alice"
    Then the response status should be 204
    When "alice" subscribes the "s" stream to the user topic of "bob"
    Then the response status should be 403

  Scenario: A topic type no module registers answers 400
    Given an authenticated user "viewer"
    And "viewer" opens an event stream as "s"
    When "viewer" subscribes the "s" stream to a "project" topic
    Then the response status should be 400

  Scenario: Unsubscribing one model keeps the others
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And a public model "Model B" created by "owner"
    And "owner" opens an event stream as "s"
    And "owner" subscribes the "s" stream to model "Model A"
    And "owner" subscribes the "s" stream to model "Model B"
    When "owner" unsubscribes the "s" stream from model "Model A"
    Then the response status should be 204
    When the realtime channel is notified of a comment on "Model A"
    And the realtime channel is notified of a comment on "Model B"
    Then the "s" stream should carry 1 event for model "Model B" within 5 seconds
    And the "s" stream should carry no event for model "Model A"
