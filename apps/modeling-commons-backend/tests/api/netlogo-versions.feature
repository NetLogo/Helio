Feature: NetLogo Versions
  As a user composing a model
  I want to look up available NetLogo runtime versions
  So that I can pin a model to a specific runtime

  Scenario: Anonymous access returns an array
    When I send a GET request to "/api/v1/netlogo-versions"
    Then the response status should be 200
    And the response body should be an array

  Scenario: Filtering by prefix returns an array
    When I send a GET request to "/api/v1/netlogo-versions?prefix=6"
    Then the response status should be 200
    And the response body should be an array

  Scenario: Empty prefix is accepted
    When I send a GET request to "/api/v1/netlogo-versions?prefix="
    Then the response status should be 200
    And the response body should be an array

  Scenario: Excessively long prefix is rejected
    When I send a GET request to "/api/v1/netlogo-versions?prefix=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    Then the response status should be 400
