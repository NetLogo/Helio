Feature: Model Permissions
  As a model owner
  I want to manage access permissions
  So that I can control who can read, write, or administer my models

  Scenario: Grant read permission to another user
    Given an authenticated user "owner"
    And a private model "Shared Model" created by "owner"
    And an authenticated user "reader"
    When "owner" grants "read" permission on "Shared Model" to "reader"
    Then the response status should be 201

  Scenario: User with read permission can access a private model
    Given an authenticated user "owner"
    And a private model "Readable Model" created by "owner"
    And an authenticated user "reader"
    And "owner" has granted "read" permission on "Readable Model" to "reader"
    When "reader" gets the model "Readable Model"
    Then the response status should be 200

  Scenario: User with write permission can update a model
    Given an authenticated user "owner"
    And a public model "Writable Model" created by "owner"
    And an authenticated user "writer"
    And "owner" has granted "write" permission on "Writable Model" to "writer"
    When "writer" updates the model "Writable Model" with visibility "private"
    Then the response status should be 204

  Scenario: User with read permission cannot update a model
    Given an authenticated user "owner"
    And a public model "Read Only Model" created by "owner"
    And an authenticated user "reader"
    And "owner" has granted "read" permission on "Read Only Model" to "reader"
    When "reader" updates the model "Read Only Model" with visibility "private"
    Then the response status should be 403

  Scenario: List permissions on a model
    Given an authenticated user "owner"
    And a private model "Listed Model" created by "owner"
    And an authenticated user "collaborator"
    And "owner" has granted "write" permission on "Listed Model" to "collaborator"
    When "owner" lists permissions on "Listed Model"
    Then the response status should be 200
    And the response body should be an array

  Scenario: Revoke permission
    Given an authenticated user "owner"
    And a private model "Revoke Model" created by "owner"
    And an authenticated user "former"
    And "owner" has granted "read" permission on "Revoke Model" to "former"
    When "owner" revokes permission on "Revoke Model" from "former"
    Then the response status should be 204

  Scenario: Revoked user can no longer access a private model
    Given an authenticated user "owner"
    And a private model "Locked Out Model" created by "owner"
    And an authenticated user "former"
    And "owner" has granted "read" permission on "Locked Out Model" to "former"
    And "owner" has revoked permission on "Locked Out Model" from "former"
    When "former" gets the model "Locked Out Model"
    Then the response status should be 403

  Scenario: Non-admin cannot grant permissions
    Given an authenticated user "owner"
    And a public model "Locked Model" created by "owner"
    And an authenticated user "intruder"
    When "intruder" grants "write" permission on "Locked Model" to "intruder"
    Then the response status should be 403

  Scenario: Cannot grant duplicate permission
    Given an authenticated user "owner"
    And a private model "Dup Perm Model" created by "owner"
    And an authenticated user "grantee"
    And "owner" has granted "read" permission on "Dup Perm Model" to "grantee"
    When "owner" grants "read" permission on "Dup Perm Model" to "grantee"
    Then the response status should be 409

  Scenario: Grant admin permission allows managing permissions
    Given an authenticated user "owner"
    And a private model "Delegated Model" created by "owner"
    And an authenticated user "delegate"
    And "owner" has granted "admin" permission on "Delegated Model" to "delegate"
    And an authenticated user "third"
    When "delegate" grants "read" permission on "Delegated Model" to "third"
    Then the response status should be 201
