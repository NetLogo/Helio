Feature: Model Version Tags
  As a model author
  I want to tag model versions
  So that models are discoverable by topic

  Scenario: Add a tag to a model's current version
    Given an authenticated user
    And a public model "Tagged Model" created by the current user
    And a version "v1" for "Tagged Model" with title "Initial"
    When I add tag "ecology" to model "Tagged Model"
    Then the response status should be 201
    And the response body should have property "tagId"
    And the response body property "tagName" should equal "ecology"

  Scenario: Add multiple tags to a model
    Given an authenticated user
    And a public model "Multi Tag Model" created by the current user
    And a version "v1" for "Multi Tag Model" with title "Initial"
    When I add tag "simulation" to model "Multi Tag Model"
    Then the response status should be 201
    When I add tag "netlogo" to model "Multi Tag Model"
    Then the response status should be 201

  Scenario: Cannot add the same tag twice
    Given an authenticated user
    And a public model "Dup Tag Model" created by the current user
    And a version "v1" for "Dup Tag Model" with title "Initial"
    And tag "duplicate" has been added to model "Dup Tag Model"
    When I add tag "duplicate" to model "Dup Tag Model"
    Then the response status should be 409

  Scenario: Remove a tag from a model
    Given an authenticated user
    And a public model "Untagged Model" created by the current user
    And a version "v1" for "Untagged Model" with title "Initial"
    And tag "removable" has been added to model "Untagged Model"
    When I remove tag "removable" from model "Untagged Model"
    Then the response status should be 204

  Scenario: List tags for a specific version
    Given an authenticated user
    And a public model "Version Tags" created by the current user
    And a version "v1" for "Version Tags" with title "First"
    And tag "biology" has been added to model "Version Tags"
    When I list tags for version 1 of model "Version Tags"
    Then the response status should be 200
    And the response body should be an array

  Scenario: Tagging requires write permission
    Given an authenticated user "owner"
    And a private model "Protected Model" created by "owner"
    And a version "v1" for "Protected Model" with title "Secret"
    And an authenticated user "stranger"
    When "stranger" adds tag "hacked" to model "Protected Model"
    Then the response status should be 403

  Scenario: Adding a tag creates the tag if it does not exist
    Given an authenticated user
    And a public model "New Tag Model" created by the current user
    And a version "v1" for "New Tag Model" with title "Initial"
    When I add tag "brand-new-tag" to model "New Tag Model"
    Then the response status should be 201
    When I send a GET request to "/api/v1/tags?q=brand-new"
    Then the response status should be 200
