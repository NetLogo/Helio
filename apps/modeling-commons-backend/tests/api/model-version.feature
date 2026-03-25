Feature: Model Versions
  As a model author
  I want to manage model versions
  So that I can track changes to my models over time

  Scenario: Create a version for a model
    Given an authenticated user
    And a public model "My Model" created by the current user
    When I create a version for "My Model" with title "Initial Version"
    Then the response status should be 201
    And the response body should have property "id"

  @pending
  Scenario: Create a second version finalizes the first
    Given an authenticated user
    And a public model "Evolving Model" created by the current user
    And a version "v1" for "Evolving Model" with title "First Draft"
    When I create a version for "Evolving Model" with title "Second Draft"
    Then the response status should be 201

  Scenario: List versions of a model with one version
    Given an authenticated user
    And a public model "Versioned Model" created by the current user
    And a version "v1" for "Versioned Model" with title "Release 1"
    When I list versions of the model "Versioned Model"
    Then the response status should be 200
    And the response body should have property "data" as an array
    And the response body property "data" should have length 1

  @pending
  Scenario: List versions returns multiple versions in order
    Given an authenticated user
    And a public model "Multi Version" created by the current user
    And a version "v1" for "Multi Version" with title "Alpha"
    And a version "v2" for "Multi Version" with title "Beta"
    When I list versions of the model "Multi Version"
    Then the response status should be 200
    And the response body property "data" should have length 2

  Scenario: Get a specific version by number
    Given an authenticated user
    And a public model "Specific Model" created by the current user
    And a version "v1" for "Specific Model" with title "The Version"
    When I get version 1 of the model "Specific Model"
    Then the response status should be 200
    And the response body property "title" should equal "The Version"

  Scenario: Update the current version title
    Given an authenticated user
    And a public model "Editable Model" created by the current user
    And a version "v1" for "Editable Model" with title "Old Title"
    When I update the current version of "Editable Model" with title "New Title"
    Then the response status should be 204

  Scenario: Update the current version description
    Given an authenticated user
    And a public model "Described Model" created by the current user
    And a version "v1" for "Described Model" with title "Some Title"
    When I update the current version of "Described Model" with description "A detailed description"
    Then the response status should be 204

  Scenario: Creating a version requires write permission
    Given an authenticated user "owner"
    And a private model "Locked Model" created by "owner"
    And an authenticated user "stranger"
    When "stranger" creates a version for "Locked Model" with title "Nope"
    Then the response status should be 403

  Scenario: Listing versions requires read access
    Given an authenticated user "owner"
    And a private model "Private Model" created by "owner"
    And an authenticated user "stranger"
    When "stranger" lists versions of the model "Private Model"
    Then the response status should be 403

  Scenario: Updating a version requires write access
    Given an authenticated user "owner"
    And a public model "Guarded Model" created by "owner"
    And a version "v1" for "Guarded Model" with title "Original"
    And an authenticated user "stranger"
    When "stranger" updates the current version of "Guarded Model" with title "Hacked"
    Then the response status should be 403

  Scenario: List versions of a model with no versions returns empty
    Given an authenticated user
    And a public model "Empty Model" created by the current user
    When I list versions of the model "Empty Model"
    Then the response status should be 200
    And the response body should have property "data" as an array
    And the response body property "data" should have length 0
