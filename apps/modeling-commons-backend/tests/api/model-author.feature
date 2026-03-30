Feature: Model Authors
  As a model owner
  I want to manage contributors and ownership
  So that I can collaborate on models with other users

  Scenario: List authors of a model
    Given an authenticated user
    And a public model "Authored Model" created by the current user
    When I list authors of the model "Authored Model"
    Then the response status should be 200
    And the response body should be an array

  Scenario: Add a contributor to a model
    Given an authenticated user "owner"
    And a public model "Collab Model" created by "owner"
    And an authenticated user "contributor"
    When "owner" adds "contributor" as a contributor to "Collab Model"
    Then the response status should be 201

  Scenario: Contributor appears in the author list
    Given an authenticated user "owner"
    And a public model "Team Model" created by "owner"
    And an authenticated user "contributor"
    And "owner" has added "contributor" as a contributor to "Team Model"
    When I list authors of the model "Team Model"
    Then the response status should be 200

  Scenario: Remove a contributor from a model
    Given an authenticated user "owner"
    And a public model "Shrinking Team" created by "owner"
    And an authenticated user "contributor"
    And "owner" has added "contributor" as a contributor to "Shrinking Team"
    When "owner" removes "contributor" from "Shrinking Team"
    Then the response status should be 204

  Scenario: Cannot remove the owner
    Given an authenticated user "owner"
    And a public model "Owner Model" created by "owner"
    When "owner" removes "owner" from "Owner Model"
    Then the response status should be 403

  Scenario: Transfer ownership to a contributor
    Given an authenticated user "owner"
    And a public model "Transfer Model" created by "owner"
    And an authenticated user "new-owner"
    And "owner" has added "new-owner" as a contributor to "Transfer Model"
    When "owner" transfers ownership of "Transfer Model" to "new-owner"
    Then the response status should be 204

  Scenario: Cannot transfer ownership to a non-author
    Given an authenticated user "owner"
    And a public model "No Transfer" created by "owner"
    And an authenticated user "outsider"
    When "owner" transfers ownership of "No Transfer" to "outsider"
    Then the response status should be 404

  Scenario: Non-owner cannot add contributors
    Given an authenticated user "owner"
    And a public model "Restricted Model" created by "owner"
    And an authenticated user "contributor"
    And "owner" has added "contributor" as a contributor to "Restricted Model"
    And an authenticated user "intruder"
    When "contributor" adds "intruder" as a contributor to "Restricted Model"
    Then the response status should be 403

  Scenario: List models by user
    Given an authenticated user "author"
    And a public model "Author's Model" created by "author"
    When I list models by user "author"
    Then the response status should be 200
    And the response body should have property "data" as an array
    And the response body property "data" should have length 1

  Scenario: Cannot add the same contributor twice
    Given an authenticated user "owner"
    And a public model "Dup Model" created by "owner"
    And an authenticated user "contributor"
    And "owner" has added "contributor" as a contributor to "Dup Model"
    When "owner" adds "contributor" as a contributor to "Dup Model"
    Then the response status should be 409
