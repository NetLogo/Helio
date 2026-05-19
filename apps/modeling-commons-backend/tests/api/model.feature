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
    When I send a POST request to "/api/v1/model-drafts" with JSON body:
      """
      {}
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

  Scenario: Unlisted models do not appear in search results
    Given an authenticated user "owner"
    And an unlisted model "Hidden Gem" created by "owner"
    When "owner" sends a GET request to "/api/v1/models"
    Then the response status should be 200
    And the response body property "data" should have length 0

  Scenario: Private models do not appear in search for non-owners
    Given an authenticated user "owner"
    And a private model "Secret Stuff" created by "owner"
    And an authenticated user "stranger"
    When "stranger" sends a GET request to "/api/v1/models"
    Then the response status should be 200
    And the response body property "data" should have length 0

  Scenario: Private models appear in search for the owner when publicOnly=false
    Given an authenticated user "owner"
    And a private model "My Secret" created by "owner"
    When "owner" sends a GET request to "/api/v1/models?publicOnly=false"
    Then the response status should be 200
    And the response body property "data" should have length 1

  Scenario: Permissions action map for anonymous viewer on public model
    Given an authenticated user "owner"
    And a public model "Open Model" created by "owner"
    When an anonymous viewer gets permissions for model "Open Model"
    Then the response status should be 200
    And the response permissions action "canView" should be true
    And the response permissions action "canFork" should be false
    And the response permissions action "canEdit" should be false
    And the response permissions action "canDelete" should be false

  Scenario: Permissions action map for the owner
    Given an authenticated user "owner"
    And a public model "Owned Model" created by "owner"
    When "owner" gets permissions for model "Owned Model"
    Then the response status should be 200
    And the response permissions action "canView" should be true
    And the response permissions action "canEdit" should be true
    And the response permissions action "canManageAuthors" should be true
    And the response permissions action "canDelete" should be true

  Scenario: Permissions action map for a non-author authenticated viewer on public model
    Given an authenticated user "owner"
    And a public model "Visible Model" created by "owner"
    And an authenticated user "stranger"
    When "stranger" gets permissions for model "Visible Model"
    Then the response status should be 200
    And the response permissions action "canView" should be true
    And the response permissions action "canFork" should be true
    And the response permissions action "canComment" should be true
    And the response permissions action "canLike" should be true
    And the response permissions action "canEdit" should be false
    And the response permissions action "canDelete" should be false
