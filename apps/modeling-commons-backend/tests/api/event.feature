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
