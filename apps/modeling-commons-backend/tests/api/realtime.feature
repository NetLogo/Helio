@realtime
Feature: Realtime event streams
  As a signed-in user
  I want an event stream that tells me when my notifications or a model's comments change
  So that the page refetches without polling

  @sanity
  Scenario: The notification stream needs a session
    When an anonymous viewer opens the notification stream
    Then the response status should be 401

  Scenario: A model stream answers like the comments route for a caller who cannot read the model
    Given an authenticated user "owner"
    And a private model "Secret Model" created by "owner"
    And an authenticated user "intruder"
    When "intruder" opens the stream of model "Secret Model" and lists its comments
    Then both answers should have the same status, and it should not be 200

  Scenario: A stream is closed at its lifetime cap and a reconnect re-checks read permission
    Given event streams are capped at 1000 milliseconds
    And an authenticated user "owner"
    And a private model "Shared Model" created by "owner"
    And an authenticated user "reader"
    And "owner" has granted "read" permission on "Shared Model" to "reader"
    And "reader" opens the stream of model "Shared Model" as "s"
    And "owner" has revoked permission on "Shared Model" from "reader"
    Then the "s" stream should end with the closing retry hint within 5 seconds
    When "reader" opens the stream of model "Shared Model" and lists its comments
    Then both answers should have the same status, and it should not be 200

  @sanity
  Scenario: An open stream sends stream headers and its opening frames at once
    Given an authenticated user "viewer"
    When "viewer" opens the notification stream from an allowed origin as "viewer"
    Then the "viewer" stream should answer 200 as an uncompressed, unbuffered event stream
    And the "viewer" stream should allow that origin with credentials
    And the "viewer" stream should carry no connection header
    And the "viewer" stream should start with the retry delay and an open comment

  @sanity
  Scenario: A comment signals its model stream once and no other model stream
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And a public model "Model B" created by "owner"
    And an authenticated user "commenter"
    And "commenter" opens the stream of model "Model A" as "a"
    And "commenter" opens the stream of model "Model B" as "b"
    When "commenter" comments "Ping" on "Model A"
    Then the response status should be 201
    When the pending events have been dispatched
    Then the "a" stream should carry 1 "comments" event within 5 seconds
    And the "b" stream should carry no "comments" event

  Scenario: A rolled back comment signals nothing
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And "owner" opens the stream of model "Model A" as "a"
    When a comment by "owner" on "Model A" is written in a transaction that rolls back
    And "owner" comments "Kept" on "Model A"
    Then the response status should be 201
    When the pending events have been dispatched
    Then the "a" stream should carry 1 "comments" event within 5 seconds

  Scenario: A delivered notification signals the recipient's stream only
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And an authenticated user "commenter"
    And "owner" opens the notification stream as "owner"
    And "commenter" opens the notification stream as "commenter"
    When "commenter" comments "Ping" on "Model A"
    Then the response status should be 201
    When the pending events have been dispatched
    Then the "owner" stream should carry 1 "notifications" event within 5 seconds
    And the "commenter" stream should carry no "notifications" event

  Scenario: A NOTIFY on a channel reaches exactly the streams of that model or user
    Given an authenticated user "alice"
    And an authenticated user "bob"
    And a public model "Model A" created by "alice"
    And a public model "Model B" created by "alice"
    And "alice" opens the stream of model "Model A" as "alice-a"
    And "bob" opens the stream of model "Model A" as "bob-a"
    And "bob" opens the stream of model "Model B" as "bob-b"
    When the model channel is notified with the id of "Model A"
    Then the "alice-a" stream should carry 1 "comments" event within 5 seconds
    And the "bob-a" stream should carry 1 "comments" event within 5 seconds
    And the "bob-b" stream should carry no "comments" event
    When the user channel is notified with the id of "bob"
    Then the "bob-a" stream should carry 1 "notifications" event within 5 seconds
    And the "bob-b" stream should carry 1 "notifications" event within 5 seconds
    And the "alice-a" stream should carry no "notifications" event

  Scenario: A dropped listener connection reconnects, listens again and sends one resync
    Given an authenticated user "alice"
    And a public model "Model A" created by "alice"
    And "alice" opens the notification stream as "n"
    And "alice" opens the stream of model "Model A" as "m"
    When the realtime listener's database connection is terminated
    Then the "n" stream should carry 1 "resync" event within 10 seconds
    And the "m" stream should carry 1 "resync" event within 10 seconds
    When the model channel is notified with the id of "Model A"
    Then the "m" stream should carry 1 "comments" event within 5 seconds

  Scenario: An sse-role process serves only the event streams and health, and holds a listener
    Given the realtime listener connections are counted
    When an "sse" role process is started
    Then the role process should answer 401 for "/api/v1/events"
    And the role process should answer 200 for "/api/health"
    And the role process should answer 404 for "/api/v1/models"
    And the role process should have logged that workers are disabled
    And the role process should hold 1 realtime listener connection within 5 seconds

  Scenario: An api-role process serves no event stream and holds no listener
    Given the realtime listener connections are counted
    When an "api" role process is started
    Then the role process should answer 404 for "/api/v1/events"
    And the role process should answer 200 for "/api/v1/models"
    And the role process should hold 0 realtime listener connections

  Scenario: A worker-role process serves no event stream and holds no listener
    Given the realtime listener connections are counted
    When an "worker" role process is started
    Then the role process should answer 404 for "/api/v1/events"
    And the role process should hold 0 realtime listener connections
