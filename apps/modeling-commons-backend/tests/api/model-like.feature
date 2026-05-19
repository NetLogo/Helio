Feature: Model Likes
  As a user
  I want to like models
  So that I can keep track of the models I find useful

  Scenario: Anonymous viewer sees zero likes
    Given an authenticated user "owner"
    And a public model "Likeable" created by "owner"
    When I get the like summary for "Likeable"
    Then the response status should be 200
    And the like summary count should be 0
    And the response body should have property "likedByMe" equal to false

  Scenario: An authenticated user likes a model
    Given an authenticated user "owner"
    And a public model "Liked Model" created by "owner"
    And an authenticated user "fan"
    When "fan" likes "Liked Model"
    Then the response status should be 204

  Scenario: Liking a model is reflected in the summary
    Given an authenticated user "owner"
    And a public model "Famous Model" created by "owner"
    And an authenticated user "fan"
    And "fan" has liked "Famous Model"
    When "fan" gets the like summary for "Famous Model"
    Then the response status should be 200
    And the like summary count should be 1
    And the response body should have property "likedByMe" equal to true

  Scenario: Liking the same model twice does not double-count
    Given an authenticated user "owner"
    And a public model "Idempotent" created by "owner"
    And an authenticated user "fan"
    And "fan" has liked "Idempotent"
    When "fan" likes "Idempotent"
    Then the response status should be 204
    When "fan" gets the like summary for "Idempotent"
    And the like summary count should be 1

  Scenario: Unliking a model removes the like
    Given an authenticated user "owner"
    And a public model "Unlikeable" created by "owner"
    And an authenticated user "fan"
    And "fan" has liked "Unlikeable"
    When "fan" unlikes "Unlikeable"
    Then the response status should be 204
    When "fan" gets the like summary for "Unlikeable"
    And the like summary count should be 0
    And the response body should have property "likedByMe" equal to false

  Scenario: Liking requires authentication
    Given an authenticated user "owner"
    And a public model "Auth Required" created by "owner"
    When an anonymous viewer likes "Auth Required"
    Then the response status should be 401

  Scenario: Cannot like a private model owned by someone else
    Given an authenticated user "owner"
    And a private model "Secret" created by "owner"
    And an authenticated user "stranger"
    When "stranger" likes "Secret"
    Then the response status should be 403
