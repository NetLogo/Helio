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

  @smoke
  Scenario: Resolving an unknown legacy model id returns 404
    When I send a GET request to "/api/v1/legacy/models/999999/resolve"
    Then the response status should be 404

  Scenario: Resolving a legacy id with an invalid value is rejected
    When I send a GET request to "/api/v1/legacy/models/0/resolve"
    Then the response status should be 400

  Scenario: Random public model returns id and title when public models exist
    Given an authenticated user "owner"
    And a public model "Random Candidate" created by "owner"
    When I send a GET request to "/api/v1/models/random"
    Then the response status should be 200
    And the response body should have property "id"
    And the response body should have property "title"

  Scenario: Search by authorId returns only models authored by that user
    Given an authenticated user "alice"
    And a public model "Alice One" created by "alice"
    And a public model "Alice Two" created by "alice"
    And an authenticated user "bob"
    And a public model "Bob One" created by "bob"
    When "alice" searches models filtered by author "alice"
    Then the response status should be 200
    And the response body property "data" should have length 2

  Scenario: Search by keyword matches version title
    Given an authenticated user "owner"
    And a public model "Distinct Keyword Marker" created by "owner"
    And a public model "Other Model" created by "owner"
    When "owner" sends a GET request to "/api/v1/models?keyword=Distinct"
    Then the response status should be 200
    And the response body property "data" should have length 1

  Scenario: Search supports sortBy=recent with order=asc
    Given an authenticated user "owner"
    And a public model "First" created by "owner"
    And a public model "Second" created by "owner"
    When "owner" sends a GET request to "/api/v1/models?sortBy=recent&order=asc"
    Then the response status should be 200
    And the response body should have property "data" as an array

  Scenario: Search by future fromDate returns no models
    Given an authenticated user "owner"
    And a public model "Past Model" created by "owner"
    When "owner" sends a GET request to "/api/v1/models?fromDate=2999-01-01"
    Then the response status should be 200
    And the response body property "data" should have length 0

  Scenario: Search sortBy=views orders models by view count descending
    Given an authenticated user "owner"
    And a public model "Most Viewed" created by "owner"
    And a public model "Mid Viewed" created by "owner"
    And a public model "Least Viewed" created by "owner"
    And an authenticated user "viewer1"
    And an authenticated user "viewer2"
    And an authenticated user "viewer3"
    When "viewer1" records a "view" interaction on "Most Viewed"
    And "viewer2" records a "view" interaction on "Most Viewed"
    And "viewer3" records a "view" interaction on "Most Viewed"
    And "viewer1" records a "view" interaction on "Mid Viewed"
    And "viewer2" records a "view" interaction on "Mid Viewed"
    And "viewer1" records a "view" interaction on "Least Viewed"
    And "owner" sends a GET request to "/api/v1/models?sortBy=views&order=desc"
    Then the response status should be 200
    And the known models "Most Viewed", "Mid Viewed", "Least Viewed" appear in that relative order in the search results

  Scenario: Search sortBy=runs orders models by run count descending
    Given an authenticated user "owner"
    And a public model "High Runs" created by "owner"
    And a public model "Low Runs" created by "owner"
    And an authenticated user "runner"
    When "runner" records a "run" interaction on "High Runs"
    And "runner" records a "run" interaction on "High Runs"
    And "runner" records a "run" interaction on "Low Runs"
    And "owner" sends a GET request to "/api/v1/models?sortBy=runs&order=desc"
    Then the response status should be 200
    And the known models "High Runs", "Low Runs" appear in that relative order in the search results
