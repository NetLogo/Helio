Feature: Tag Management
  As a user
  I want to browse and search tags
  So that I can discover models by topic

  Scenario: List tags returns paginated results
    Given a tag "ecology" exists
    When I send a GET request to "/api/v1/tags"
    Then the response status should be 200
    And the response body should have property "data" as an array

  Scenario: Search tags by prefix
    Given a tag "biology" exists
    And a tag "biochemistry" exists
    When I send a GET request to "/api/v1/tags?q=bio"
    Then the response status should be 200
    And the response body should have property "data" as an array

  Scenario: Get a tag by name
    Given a tag "physics" exists
    When I get the tag "physics"
    Then the response status should be 200
    And the response body property "name" should equal "physics"

  Scenario: Get a non-existent tag returns 404
    When I send a GET request to "/api/v1/tags/nonexistent-tag-xyz"
    Then the response status should be 404
