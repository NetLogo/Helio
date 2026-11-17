Feature: Digest recipient selection
  As the digest job
  I want to page through exactly the recipients owed a daily digest
  So that every pending daily notification is emailed once and nothing else is

  Background:
    Given the digest window runs from 3 hours ago to 1 hour ago
    And an authenticated user "alice"
    And an authenticated user "bob"
    And an authenticated user "carol"
    And an authenticated user "dave"
    And an authenticated user "erin"

  Scenario: Only unsent notifications created within the window, bounds included, select a recipient
    Given a digest notification for "alice" in "comment.on_your_model" that is "unsent" at "window start"
    And a digest notification for "bob" in "comment.on_your_model" that is "unsent" at "window end"
    And a digest notification for "carol" in "comment.on_your_model" that is "sent" at "inside window"
    And a digest notification for "dave" in "comment.on_your_model" that is "unsent" at "before window"
    And a digest notification for "erin" in "comment.on_your_model" that is "unsent" at "after window"
    When digest recipients are listed with daily defaults "comment.on_your_model"
    Then the digest recipients should be "alice,bob" in id order

  Scenario: A stored daily preference selects a recipient, a stored off or immediate one excludes it, and a missing one falls back to the defaults
    Given the stored preference of "alice" for "comment.reply_to_you" is "daily" email
    And the stored preference of "dave" for "comment.on_your_model" is "off" email
    And the stored preference of "erin" for "comment.on_your_model" is "immediate" email
    And a digest notification for "alice" in "comment.reply_to_you" that is "unsent" at "inside window"
    And a digest notification for "bob" in "comment.on_your_model" that is "unsent" at "inside window"
    And a digest notification for "carol" in "comment.reply_to_you" that is "unsent" at "inside window"
    And a digest notification for "dave" in "comment.on_your_model" that is "unsent" at "inside window"
    And a digest notification for "erin" in "comment.on_your_model" that is "unsent" at "inside window"
    When digest recipients are listed with daily defaults "comment.on_your_model"
    Then the digest recipients should be "alice,bob" in id order

  Scenario: Recipients come back once each, ordered by id, cut by the limit and resumed strictly after the cursor
    Given a digest notification for "alice" in "comment.on_your_model" that is "unsent" at "window start"
    And a digest notification for "alice" in "comment.on_your_model" that is "unsent" at "inside window"
    And a digest notification for "bob" in "comment.on_your_model" that is "unsent" at "window start"
    And a digest notification for "bob" in "comment.on_your_model" that is "unsent" at "inside window"
    And a digest notification for "carol" in "comment.on_your_model" that is "unsent" at "window start"
    And a digest notification for "carol" in "comment.on_your_model" that is "unsent" at "inside window"
    When digest recipients are listed with daily defaults "comment.on_your_model"
    Then the digest recipients should be "alice,bob,carol" in id order
    When digest recipients are listed with daily defaults "comment.on_your_model" and limit 2
    Then the digest recipients should be the first 2 of "alice,bob,carol" in id order
    When digest recipients are listed with daily defaults "comment.on_your_model" after the middle recipient of "alice,bob,carol"
    Then the digest recipients should be the last of "alice,bob,carol" in id order
