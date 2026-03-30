Feature: Model Management
  As a user
  I want to manage models
  So that I can create, view, update, and delete models

  Scenario: Create a model
    Given an authenticated user
    When I create a model with title "Wolf Sheep Predation"
    Then the response status should be 201
    And the response body should have property "id"

  Scenario: Create a model requires authentication
    When I send a POST request to "/api/v1/models" with JSON body:
      """
      { "title": "Unauthorized Model" }
      """
    Then the response status should be 401

  Scenario: Get a public model
    Given an authenticated user
    And a public model "Ants" created by the current user
    When I get the model "Ants"
    Then the response status should be 200
    And the response body should have property "id"

  Scenario: List public models
    Given an authenticated user
    And a public model "Model A" created by the current user
    And a public model "Model B" created by the current user
    When I send a GET request to "/api/v1/models"
    Then the response status should be 200
    And the response body should have property "data" as an array

  Scenario: Update a model's visibility
    Given an authenticated user
    And a public model "My Model" created by the current user
    When I update the model "My Model" with visibility "private"
    Then the response status should be 204

  Scenario: Delete a model
    Given an authenticated user
    And a public model "To Delete" created by the current user
    When I delete the model "To Delete"
    Then the response status should be 204

  Scenario: Cannot access a private model without permission
    Given an authenticated user "owner"
    And a private model "Secret Model" created by "owner"
    And an authenticated user "stranger"
    When "stranger" gets the model "Secret Model"
    Then the response status should be 403

  Scenario: Search models by keyword
    Given an authenticated user
    And a public model "Climate Change Sim" created by the current user
    When I send a GET request to "/api/v1/models?keyword=Climate"
    Then the response status should be 200
    And the response body should have property "data" as an array

  Scenario: Create a forked model
    Given an authenticated user
    And a public model "Original" created by the current user
    When I fork the model "Original" with title "My Fork"
    Then the response status should be 201
    And the response body should have property "id"
