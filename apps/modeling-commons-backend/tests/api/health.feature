Feature: Health Check
  As a client
  I want to verify the API is running
  So that I can confirm the service is available

  Scenario: Test endpoint returns success
    When I send a GET request to "/api/v1/test"
    Then the response status should be 200
    And the response body property "success" should equal "true"
    And the response body should have property "data"
