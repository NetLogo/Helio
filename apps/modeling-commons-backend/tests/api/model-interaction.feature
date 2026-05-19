Feature: Model Interactions
  As the system
  I want to record views, runs, downloads, and shares of a model
  So that we can show engagement metrics

  Scenario: Anonymous user records a view
    Given an authenticated user "owner"
    And a public model "Viewable" created by "owner"
    When an anonymous viewer records a "view" interaction on "Viewable"
    Then the response status should be 204

  Scenario: Recording a run increments the run count
    Given an authenticated user "owner"
    And a public model "Runnable" created by "owner"
    And an authenticated user "viewer"
    When "viewer" records a "run" interaction on "Runnable"
    Then the response status should be 204
    When "viewer" gets the interactions summary for "Runnable"
    Then the response status should be 200
    And the interactions summary "runs" should be 1

  Scenario: Recording a download increments the download count
    Given an authenticated user "owner"
    And a public model "Downloadable" created by "owner"
    And an authenticated user "viewer"
    When "viewer" records a "download" interaction on "Downloadable"
    And "viewer" gets the interactions summary for "Downloadable"
    Then the interactions summary "downloads" should be 1

  Scenario: Interactions summary returns the full shape
    Given an authenticated user "owner"
    And a public model "Stats Model" created by "owner"
    When "owner" gets the interactions summary for "Stats Model"
    Then the response status should be 200
    And the response body should have property "likes"
    And the response body should have property "views"
    And the response body should have property "runs"
    And the response body should have property "downloads"
    And the response body should have property "shares"
    And the response body should have property "likedByMe"

  Scenario: Cannot record an interaction on a private model owned by someone else
    Given an authenticated user "owner"
    And a private model "Closed" created by "owner"
    And an authenticated user "outsider"
    When "outsider" records a "view" interaction on "Closed"
    Then the response status should be 403
