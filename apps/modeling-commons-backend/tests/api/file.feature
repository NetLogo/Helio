Feature: File Uploads
  As an authenticated user
  I want to upload avatar images
  So that my profile is personalised

  Scenario: Uploading an avatar requires authentication
    When an anonymous viewer uploads a PNG avatar
    Then the response status should be 401

  Scenario: Authenticated user uploads a PNG avatar
    Given an authenticated user
    When I upload a PNG avatar
    Then the response status should be 201
    And the response body should have property "url"

  Scenario: Upload rejects a disallowed mime type
    Given an authenticated user
    When I upload an avatar with mime "application/pdf"
    Then the response status should be 400
