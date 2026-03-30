Feature: User Management
  As a user
  I want to manage user profiles
  So that I can view and update user information

  Scenario: List users returns paginated results
    Given an authenticated user
    When I send a GET request to "/api/v1/users"
    Then the response status should be 200
    And the response body should have property "data" as an array
    And the response body should have property "count"

  Scenario: Get user by ID
    Given an authenticated user
    When I get the current user's profile
    Then the response status should be 200
    And the response body should have property "id"
    And the response body should have property "email"

  Scenario: Update own profile
    Given an authenticated user
    When I update the current user with userKind "student"
    Then the response status should be 204

  Scenario: Update profile requires authentication
    When I send a PATCH request to "/api/v1/users/00000000-0000-0000-0000-000000000000" with body:
      | userKind | student |
    Then the response status should be 401

  Scenario: Delete own account
    Given an authenticated user
    When I delete the current user's account
    Then the response status should be 204

  Scenario: Cannot update another user's profile
    Given an authenticated user "alice"
    And an authenticated user "bob"
    When "alice" updates "bob" with userKind "teacher"
    Then the response status should be 403
