Feature: Model Additional Files
  As a model author
  I want to attach supplementary files to my model
  So that users can download datasets or assets alongside the model

  Scenario: Listing additional files for a model is publicly accessible on a public model
    Given an authenticated user "owner"
    And a public model "Open Data" created by "owner"
    When I list additional files for "Open Data"
    Then the response status should be 200
    And the response body should be an array

  Scenario: Uploading an additional file requires authentication
    Given an authenticated user "owner"
    And a public model "Locked Down" created by "owner"
    When an anonymous viewer uploads an additional file to "Locked Down"
    Then the response status should be 401

  Scenario: A non-author cannot upload additional files
    Given an authenticated user "owner"
    And a public model "Owned" created by "owner"
    And an authenticated user "stranger"
    When "stranger" uploads an additional file to "Owned"
    Then the response status should be 403

  Scenario: Owner uploads an additional file
    Given an authenticated user "owner"
    And a public model "With Attachments" created by "owner"
    When "owner" uploads an additional file to "With Attachments"
    Then the response status should be 201
    And the response body should have property "id"
    And the response body should have property "fileKey"
    And the response body should have property "downloadUrl"
    And the response body property "kind" should equal "additional"

  Scenario: Uploaded file appears in the listing
    Given an authenticated user "owner"
    And a public model "Listed" created by "owner"
    And "owner" has uploaded an additional file to "Listed"
    When I list additional files for "Listed"
    Then the response status should be 200
    And the response body should be an array
    And the response body should have length 1

  Scenario: Filter listing by tagged version number
    Given an authenticated user "owner"
    And a public model "Versioned" created by "owner"
    And "owner" has uploaded an additional file to "Versioned"
    When I list additional files for "Versioned" tagged at version 1
    Then the response status should be 200
    And the response body should be an array

  Scenario: Cannot access additional files on a private model owned by someone else
    Given an authenticated user "owner"
    And a private model "Secret Data" created by "owner"
    And an authenticated user "stranger"
    When "stranger" lists additional files for "Secret Data"
    Then the response status should be 403

  @smoke
  Scenario: Owner can delete an additional file
    Given an authenticated user "owner"
    And a public model "Removable" created by "owner"
    And "owner" has uploaded an additional file "att-1" to "Removable"
    When "owner" deletes additional file "att-1" from "Removable"
    Then the response status should be 204

  Scenario: Anonymous viewer cannot delete an additional file
    Given an authenticated user "owner"
    And a public model "Public Attachments" created by "owner"
    And "owner" has uploaded an additional file "att-anon" to "Public Attachments"
    When an anonymous viewer deletes additional file "att-anon" from "Public Attachments"
    Then the response status should be 401

  Scenario: Non-author cannot delete an additional file
    Given an authenticated user "owner"
    And a public model "Guarded Attachments" created by "owner"
    And "owner" has uploaded an additional file "att-guarded" to "Guarded Attachments"
    And an authenticated user "stranger"
    When "stranger" deletes additional file "att-guarded" from "Guarded Attachments"
    Then the response status should be 403
