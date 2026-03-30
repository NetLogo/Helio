Feature: Authentication
  As a user
  I want to sign up and sign in
  So that I can access protected resources

  Scenario: Sign up with valid credentials
    When I sign up with name "Alice" email "alice@test.local" and password "StrongPass1!"
    Then the response status should be 200
    And the response body should have property "user"

  Scenario: Sign up with weak password
    When I sign up with name "Weak" email "weak@test.local" and password "short"
    Then the signup should be rejected

  Scenario: Sign in with valid credentials
    Given a verified user with email "bob@test.local" and password "StrongPass1!"
    When I sign in with email "bob@test.local" and password "StrongPass1!"
    Then the response status should be 200
    And the response should include a session cookie

  Scenario: Sign in with wrong password
    Given a verified user with email "carol@test.local" and password "StrongPass1!"
    When I sign in with email "carol@test.local" and password "WrongPass1!"
    Then the signin should be rejected
