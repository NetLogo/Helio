Feature: Health Check
  As a client
  I want to verify the API is running
  So that I can confirm the service is available

  Scenario: Health endpoint reports the service is up
    When I send a GET request to "/api/health"
    Then the response status should be 200
    And the response body property "status" should equal "ok"
