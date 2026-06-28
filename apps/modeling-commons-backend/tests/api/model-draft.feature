Feature: Model Drafts
  As an authenticated user
  I want to create and edit model drafts
  So that I can prepare a model before publishing

  Scenario: Create an empty draft
    Given an authenticated user
    When I create an empty draft
    Then the response status should be 201
    And the response body should have property "id"

  Scenario: Drafts require authentication
    When I send a POST request to "/api/v1/model-drafts" with JSON body:
      """
      {}
      """
    Then the response status should be 401

  Scenario: Patch a draft with metadata
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "My Draft" and visibility "private"
    Then the response status should be 204

  Scenario: Read back a draft after patching it
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "Readable Draft" and visibility "public"
    And I get the draft
    Then the response status should be 200
    And the response body property "id" should not be empty
    And the draft response should have data title equal to "Readable Draft"

  Scenario: List drafts for the current user
    Given an authenticated user
    And an empty draft
    When I list my drafts
    Then the response status should be 200
    And the response body should have property "data" as an array
    And the response body property "data" should have length 1

  Scenario: Another user cannot read my draft
    Given an authenticated user "owner"
    And "owner" creates an empty draft
    And an authenticated user "stranger"
    When "stranger" gets the draft owned by "owner"
    Then the response status should be 403

  Scenario: Abandon a draft
    Given an authenticated user
    And an empty draft
    When I abandon the draft
    Then the response status should be 204

  Scenario: Cannot publish a draft without a primary file
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "No File Draft" and visibility "public"
    And I publish the draft
    Then the response status should be 409

  Scenario: Publishing a complete draft creates a model
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "Complete Draft" and visibility "public"
    And I upload a primary file to the draft
    And I publish the draft
    Then the response status should be 201
    And the response body should have property "modelId"
    And the response body should have property "versionNumber"

  Scenario: Uploading a primary file with a valid NetLogo extension succeeds
    Given an authenticated user
    And an empty draft
    When I upload a primary file named "model.nlogox" to the draft
    Then the response status should be 201
    And the response body property "role" should equal "primary"

  Scenario: Uploading a non-NetLogo primary file is rejected
    Given an authenticated user
    And an empty draft
    When I upload a primary file named "notes.txt" to the draft
    Then the response status should be 400

  Scenario: Uploading a denied executable as a primary file is rejected
    Given an authenticated user
    And an empty draft
    When I upload a denied primary file to the draft
    Then the response status should be 400

  Scenario: Uploading an oversized primary file is rejected
    Given an authenticated user
    And an empty draft
    When I upload an oversized primary file to the draft
    Then the response status should be 413

  Scenario: Publishing a draft with tags creates and links them to the version
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "Tagged Publish" visibility "public" and tags "ecology, simulation"
    And I upload a primary file to the draft
    And I publish the draft
    Then the response status should be 201
    When I fetch the card for the published model
    Then the response status should be 200
    And the card latest version tags should include "ecology"
    And the card latest version tags should include "simulation"

  Scenario: Publishing a draft with a usecase-prefixed tag links it to the version
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "Usecase Tagged Publish" visibility "public" and tags "usecase:teaching"
    And I upload a primary file to the draft
    And I publish the draft
    Then the response status should be 201
    When I fetch the card for the published model
    Then the response status should be 200
    And the card latest version tags should include "usecase:teaching"

  Scenario: A staged preview image is used on publish and exposed as a public unsigned URL
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "Staged Preview Publish" and visibility "public"
    And I upload a primary file to the draft
    And I upload a preview image to the draft
    And I publish the draft
    Then the response status should be 201
    When I fetch the card for the published model
    Then the response status should be 200
    And the card preview image url should be public and unsigned

  Scenario: Uploading a preview image returns a public unsigned URL
    Given an authenticated user
    And an empty draft
    When I upload a preview image to the draft
    Then the response status should be 201
    And the response body should have property "previewImageUrl"
    And the response body property "previewImageUrl" should contain "files/public/"
    And the response body property "previewImageUrl" should not contain "X-Amz-Signature"

  Scenario: A draft seeded from a model with a preview keeps it public and unsigned
    Given an authenticated user
    And an empty draft
    When I patch the draft with title "Seeded Preview Model" and visibility "public"
    And I upload a primary file to the draft
    And I upload a preview image to the draft
    And I publish the draft
    Then the response status should be 201
    When I seed a new draft from the published model
    And I get the draft
    Then the response status should be 200
    And the response body property "previewImageUrl" should contain "files/public/"
    And the response body property "previewImageUrl" should not contain "X-Amz-Signature"

  @smoke
  Scenario: Publishing a draft seeded from an existing model creates a new version
    Given an authenticated user
    And a public model "Editable Model" created by the current user
    And a draft seeded from the model "Editable Model"
    When I patch the draft with title "Editable Model v2" and visibility "public"
    And I upload a primary file to the draft
    And I publish the draft
    Then the response status should be 201
    And the response body should have property "modelId"
    And the response body property "versionNumber" should equal "2"

  # H-1: cross-user draft hijack. POST /v1/model-drafts with a victim's
  # modelId must be refused at create time (requireWritableModel /
  # resolveModelDraft).
  @security
  Scenario: A user cannot start a draft targeting another user's model
    Given an authenticated user "victim"
    And a public model "Victim Model" created by "victim"
    And an authenticated user "attacker"
    When "attacker" creates a draft targeting the model "Victim Model"
    Then the response status should not be 201
    And the response status should not be 200

  @pending
  Scenario: Per user per model there is at most one draft
    Given an authenticated user
    And a public model "Single Draft Model" created by the current user
    And a draft seeded from the model "Single Draft Model"
    When I create a draft targeting the model "Single Draft Model"
    Then the response status should not be 201

  Scenario: Per user per model drafts are purged on publish
    Given an authenticated user
    And a public model "Purge On Publish Model" created by the current user
    And a draft seeded from the model "Purge On Publish Model"
    When I patch the draft with title "Purge On Publish v2" and visibility "public"
    And I publish the draft
    Then the response status should be 200
    And no drafts targeting the model "Purge On Publish Model" remain for the current user

  Scenario: Soft-deleting a model hard-deletes its drafts
    Given an authenticated user
    And a public model "Cascade Delete Model" created by the current user
    And a draft seeded from the model "Cascade Delete Model"
    When I delete the model "Cascade Delete Model"
    Then the response status should be 204
    And the database should have 0 draft rows referencing the model "Cascade Delete Model"
    And no drafts targeting the model "Cascade Delete Model" remain for the current user

  Scenario: Soft-deleting a model leaves drafts for other models intact
    Given an authenticated user
    And a public model "Targeted Delete Model" created by the current user
    And a public model "Bystander Model" created by the current user
    And a draft seeded from the model "Targeted Delete Model"
    And a draft seeded from the model "Bystander Model"
    And an empty draft
    When I delete the model "Targeted Delete Model"
    Then the response status should be 204
    And the database should have 0 draft rows referencing the model "Targeted Delete Model"
    And the database should have 1 draft row referencing the model "Bystander Model"
    When I list my drafts
    Then the response body property "data" should have length 2

  Scenario: Publishing a draft with only metadata changes patches the current version
    Given an authenticated user
    And a public model "Metadata Only Model" created by the current user
    And a draft seeded from the model "Metadata Only Model"
    When I patch the draft with title "Metadata Only Model Renamed" and visibility "public"
    And I publish the draft
    Then the response status should be 200
    And the response body property "versionNumber" should equal "1"

  Scenario: Publishing a draft with a new NetLogo file creates a new version
    Given an authenticated user
    And a public model "NetLogo File Change Model" created by the current user
    And a draft seeded from the model "NetLogo File Change Model"
    When I upload a primary file to the draft
    And I publish the draft
    Then the response status should be 201
    And the response body property "versionNumber" should equal "2"

  Scenario: Uploading an additional file to a seeded draft keeps the same version
    Given an authenticated user
    And a public model "Attachment Edit Model" created by the current user
    And a draft seeded from the model "Attachment Edit Model"
    When I upload an additional file to the draft
    And I publish the draft
    Then the response status should be 200
    And the response body property "versionNumber" should equal "1"
    And the model "Attachment Edit Model" latest version number should be 1

  Scenario: Uploading a model file to a seeded draft creates a new version
    Given an authenticated user
    And a public model "Model File Edit Model" created by the current user
    And a draft seeded from the model "Model File Edit Model"
    When I upload a model file to the draft
    And I publish the draft
    Then the response status should be 201
    And the response body property "versionNumber" should equal "2"
    And the model "Model File Edit Model" latest version number should be 2

  Scenario: Model files carry forward to each new version
    Given an authenticated user
    And a public model "Carry Forward Model" created by the current user
    And a draft seeded from the model "Carry Forward Model"
    When I upload a model file to the draft
    And I publish the draft
    Then the response status should be 201
    And the response body property "versionNumber" should equal "2"
    And a draft seeded from the model "Carry Forward Model"
    When I upload a primary file to the draft
    And I publish the draft
    Then the response status should be 201
    And the response body property "versionNumber" should equal "3"
    When I list the additional files for model "Carry Forward Model" version 3
    Then the response status should be 200
    And the additional files response should contain 1 files of kind "model" tagged at version 3
    And the additional files response should contain 0 files of kind "additional"

  Scenario: Additional files are single-source and never duplicated across versions
    Given an authenticated user
    And a public model "Single Source Model" created by the current user
    And the current user has uploaded an additional file to "Single Source Model"
    And a draft seeded from the model "Single Source Model"
    When I upload a model file to the draft
    And I publish the draft
    Then the response status should be 201
    And the response body property "versionNumber" should equal "2"
    When I list all additional files for model "Single Source Model"
    Then the response status should be 200
    And the additional files response should contain 1 files of kind "additional" tagged at version 1
    And the additional files response should contain 0 files of kind "additional" tagged at version 2
    And the additional files response should contain 1 files of kind "model" tagged at version 2

  Scenario: A new additional file added during a version bump attaches to the new version
    Given an authenticated user
    And a public model "Bump With Additional Model" created by the current user
    And a draft seeded from the model "Bump With Additional Model"
    When I upload a model file to the draft
    And I upload an additional file to the draft
    And I publish the draft
    Then the response status should be 201
    And the response body property "versionNumber" should equal "2"
    When I list all additional files for model "Bump With Additional Model"
    Then the response status should be 200
    And the additional files response should contain 1 files of kind "additional" tagged at version 2
    And the additional files response should contain 1 files of kind "model" tagged at version 2
