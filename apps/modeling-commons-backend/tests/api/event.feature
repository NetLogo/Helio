Feature: Admin Events
  As an admin
  I want to view system events
  So that I can audit activity on the platform

  Scenario: Admin can list events
    Given an authenticated admin user "admin"
    And a public model "Audited Model" created by "admin"
    When "admin" lists admin events
    Then the response status should be 200
    And the response body should have property "data" as an array

  Scenario: Admin can filter events by type
    Given an authenticated admin user "admin"
    And a public model "Event Filter Model" created by "admin"
    When "admin" lists admin events with type "model.created"
    Then the response status should be 200
    And the response body should have property "data" as an array

  Scenario: Regular user cannot access admin events
    Given an authenticated user "regular"
    When "regular" lists admin events
    Then the response status should be 403

  Scenario: Unauthenticated user cannot access admin events
    When I send a GET request to "/api/v1/admin/events"
    Then the response status should be 401

  Scenario: Admin can filter events by resourceType
    Given an authenticated admin user "admin"
    And a public model "Resource Filter Model" created by "admin"
    When "admin" lists admin events with resourceType "model"
    Then the response status should be 200
    And the response body should have property "data" as an array

  Scenario: An event whose subscriber jobs completed reports each subscriber in the admin list
    Given an authenticated admin user "admin"
    And a public model "Dispatched Model" created by "admin"
    And "admin" comments "Dispatch me" on "Dispatched Model"
    When the pending events have been dispatched
    And "admin" lists admin events with type "model_comment.created"
    Then the response status should be 200
    And every listed event should report the subscribers "user-notifications, realtime"
    And every listed event should report dispatch state "completed" after 1 attempt

  Scenario: Admin can filter events to those whose dispatch is waiting to retry
    Given an authenticated admin user "admin"
    And handling events is rigged to fail once
    And a public model "Retrying Model" created by "admin"
    And "admin" comments "Retry me" on "Retrying Model"
    When one user-notifications job is waiting to retry
    And "admin" lists admin events with dispatchState "retry"
    Then the response status should be 200
    And the admin event list should contain 1 event in dispatch state "retry"
