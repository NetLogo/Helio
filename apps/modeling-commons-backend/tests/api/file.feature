Feature: File Download Permissions
  As a user
  I want file downloads to be protected
  So that only authorized users can access files

  Scenario: Download file with valid signed URL succeeds
    Given an authenticated user "owner"
    And a public model "Test Model" created by "owner" with a file
    When I download the file for "Test Model" with a signed token
    Then the response status should be 200

  Scenario: Download file with expired signed URL returns 403
    Given an authenticated user "owner"
    And a public model "Test Model" created by "owner" with a file
    When I download the file for "Test Model" with an expired token
    Then the response status should be 403

  Scenario: Download file without token or auth returns 401
    Given an authenticated user "owner"
    And a public model "Test Model" created by "owner" with a file
    When I download the file for "Test Model" without auth
    Then the response status should be 401

  Scenario: Authenticated user can download file from accessible model
    Given an authenticated user "owner"
    And a public model "Open Model" created by "owner" with a file
    And an authenticated user "reader"
    When "reader" downloads the file for "Open Model" with auth
    Then the response status should be 200

  Scenario: Authenticated user cannot download file from private model without permission
    Given an authenticated user "owner"
    And a private model "Locked Model" created by "owner" with a file
    And an authenticated user "stranger"
    When "stranger" downloads the file for "Locked Model" with auth
    Then the response status should be 403
