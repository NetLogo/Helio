Feature: Notification Preferences
  As a signed-in user
  I want to read and change my notification preferences
  So that I control what I get notified about

  Scenario: A user with no stored preferences sees the catalog defaults
    Given an authenticated user "reader"
    When "reader" gets their notification preferences
    Then the response status should be 200
    And the notification preferences response should list every known category

  Scenario: Overriding one category leaves the others on their defaults
    Given an authenticated user "editor"
    And "editor" gets their notification preferences
    When "editor" turns off email for category "comment.on_your_model"
    Then the response status should be 204
    When "editor" gets their notification preferences
    Then the response status should be 200
    And category "comment.on_your_model" should have email false
    And category "comment.on_your_model" should have the same inApp value as before
    And every other category should be unchanged from before

  Scenario: Updating an unknown category is rejected and writes nothing
    Given an authenticated user "confused"
    And "confused" gets their notification preferences
    When "confused" turns off email for category "comment.mentions_you"
    Then the response status should be 400
    When "confused" gets their notification preferences
    Then the response status should be 200
    And every category should be unchanged from before

  Scenario: Reading preferences requires authentication
    When an anonymous viewer gets notification preferences
    Then the response status should be 401

  Scenario: Updating preferences requires authentication
    When an anonymous viewer updates notification preferences
    Then the response status should be 401

  Scenario: A user cannot change another user's preferences
    Given an authenticated user "alice"
    And an authenticated user "bob"
    And "bob" gets their notification preferences
    When "alice" turns off email for category "comment.on_your_model"
    Then the response status should be 204
    When "bob" gets their notification preferences
    Then the response status should be 200
    And every category should be unchanged from before
