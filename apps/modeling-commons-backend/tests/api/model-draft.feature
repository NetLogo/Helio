Feature: Model Drafts
  As an authenticated user
  I want to create and edit model drafts
  So that I can prepare a model before publishing

  Scenario: Create an empty draft
    Given an authenticated user
    When I create an empty draft
    Then the response status should be 201
    And the response body should have property "id"

  Scenario: Drafts require authentication
    When I send a POST request to "/api/v1/model-drafts" with JSON body:
      """
      {}
      """
    Then the response status should be 401

  Scenario: Patch a draft with metadata
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "My Draft" and visibility "private"
    Then the response status should be 204

  Scenario: Read back a draft after patching it
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "Readable Draft" and visibility "public"
    And I get the draft
    Then the response status should be 200
    And the response body property "id" should not be empty
    And the draft response should have data title equal to "Readable Draft"

  Scenario: List drafts for the current user
    Given an authenticated user
    And an empty draft
    When I list my drafts
    Then the response status should be 200
    And the response body should have property "data" as an array
    And the response body property "data" should have length 1

  Scenario: Another user cannot read my draft
    Given an authenticated user "owner"
    And "owner" creates an empty draft
    And an authenticated user "stranger"
    When "stranger" gets the draft owned by "owner"
    Then the response status should be 403

  Scenario: Abandon a draft
    Given an authenticated user
    And an empty draft
    When I abandon the draft
    Then the response status should be 204

  Scenario: Cannot publish a draft without a primary file
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "No File Draft" and visibility "public"
    And I publish the draft
    Then the response status should be 409

  Scenario: Publishing a complete draft creates a model
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "Complete Draft" and visibility "public"
    And I upload a primary file to the draft
    And I publish the draft
    Then the response status should be 201
    And the response body should have property "modelId"
    And the response body should have property "versionNumber"

  @smoke
  Scenario: Publishing a draft seeded from an existing model creates a new version
    Given an authenticated user
    And a public model "Editable Model" created by the current user
    And a draft seeded from the model "Editable Model"
    When I patch the draft with title "Editable Model v2" and visibility "public"
    And I publish the draft
    Then the response status should be 201
    And the response body should have property "modelId"
    And the response body property "versionNumber" should equal "2"
