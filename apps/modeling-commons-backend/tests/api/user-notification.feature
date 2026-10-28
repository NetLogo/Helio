Feature: Notification Preferences and Feed
  As a signed-in user
  I want to read and change my notification preferences and read my in-app feed
  So that I control what I get notified about and can catch up on it in the app

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
    And category "comment.on_your_model" should have email "off"
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

  Scenario Outline: Each email mode is stored and read back
    Given an authenticated user "chooser"
    When "chooser" sets email to "<mode>" for category "comment.reply_to_you"
    Then the response status should be 204
    When "chooser" gets their notification preferences
    Then the response status should be 200
    And category "comment.reply_to_you" should have email "<mode>"

    Examples:
      | mode      |
      | immediate |
      | daily     |
      | off       |

  Scenario: A boolean email value is rejected and writes nothing
    Given an authenticated user "legacy"
    And "legacy" gets their notification preferences
    When "legacy" sets email to the boolean true for category "comment.on_your_model"
    Then the response status should be 400
    When "legacy" gets their notification preferences
    Then the response status should be 200
    And every category should be unchanged from before

  Scenario: An unknown email mode is rejected and writes nothing
    Given an authenticated user "weekly"
    And "weekly" gets their notification preferences
    When "weekly" sets email to "weekly" for category "comment.on_your_model"
    Then the response status should be 400
    When "weekly" gets their notification preferences
    Then the response status should be 200
    And every category should be unchanged from before

  Scenario: The daily digest is a mode, not a category
    Given an authenticated user "digester"
    When "digester" sets email to "daily" for category "general.daily_digest"
    Then the response status should be 400
    And the response body property "message" should equal "Unknown notification category: general.daily_digest"

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

  Scenario: Commenting notifies other authors but never the commenter
    Given an authenticated user "owner"
    And a public model "Notify Model" created by "owner"
    And an authenticated user "contributor"
    And "owner" has added "contributor" as a contributor to "Notify Model"
    And an authenticated user "commenter"
    And mail delivery is captured
    When "commenter" comments "Great work!" on "Notify Model"
    Then the response status should be 201
    When the event processor queue is triggered
    Then mail should have been sent to 2 recipients
    And mail should have been sent to "owner"
    And mail should have been sent to "contributor"
    And mail should not have been sent to "commenter"

  Scenario: Commenting on your own model does not notify yourself
    Given an authenticated user "owner"
    And a public model "Solo Model" created by "owner"
    And mail delivery is captured
    When "owner" comments "Talking to myself" on "Solo Model"
    Then the response status should be 201
    When the event processor queue is triggered
    Then no mail should have been sent

  Scenario: A comment lands in the recipient's in-app feed
    Given an authenticated user "owner"
    And a public model "Feed Model" created by "owner"
    And an authenticated user "commenter"
    When "commenter" comments "Nice model!" on "Feed Model"
    Then the response status should be 201
    When the comment notification has been delivered
    And "owner" lists their notifications
    Then the response status should be 200
    And the notification feed should contain 1 notification
    And the notification feed should report 1 unread
    And the first feed notification should have category "comment.on_your_model"
    And the first feed notification should be unread
    And the first feed notification should link its actor to "commenter"
    And the first feed notification should target the model it was left on

  Scenario: Marking a notification read clears it from the unread count
    Given an authenticated user "owner"
    And a public model "Read Model" created by "owner"
    And an authenticated user "commenter"
    When "commenter" comments "Ping" on "Read Model"
    Then the response status should be 201
    When the comment notification has been delivered
    And "owner" lists their notifications
    And "owner" marks the first feed notification read
    Then the response status should be 204
    When "owner" lists their notifications
    Then the notification feed should report 0 unread
    And the first feed notification should be read

  Scenario: A user cannot mark another user's notification read
    Given an authenticated user "owner"
    And a public model "Guarded Model" created by "owner"
    And an authenticated user "commenter"
    When "commenter" comments "Hello" on "Guarded Model"
    Then the response status should be 201
    When the comment notification has been delivered
    And "owner" lists their notifications
    And "commenter" marks the first feed notification read
    Then the response status should be 404
    When "owner" lists their notifications
    Then the notification feed should report 1 unread

  Scenario: A category muted in-app is delivered by email but stays out of the feed
    Given an authenticated user "owner"
    And a public model "Quiet Model" created by "owner"
    And "owner" mutes the in-app channel for category "comment.on_your_model"
    And an authenticated user "commenter"
    And mail delivery is captured
    When "commenter" comments "Still emailed" on "Quiet Model"
    Then the response status should be 201
    When the event processor queue is triggered
    Then mail should have been sent to 1 recipients
    When "owner" lists their notifications
    Then the response status should be 200
    And the notification feed should contain 0 notifications

  Scenario: A new comment nudges the event processor instead of waiting for the cron
    Given an authenticated user "owner"
    And a public model "Nudge Model" created by "owner"
    And an authenticated user "commenter"
    And the event queue nudge is captured
    When "commenter" comments "No cron, please" on "Nudge Model"
    Then the response status should be 201
    And the event queue should have been nudged
    When the comment notification arrives within 20 seconds
    And "owner" lists their notifications
    Then the response status should be 200
    And the notification feed should contain 1 notification

  Scenario: Reading the notification feed requires authentication
    When an anonymous viewer lists notifications
    Then the response status should be 401

  Scenario: A recipient who opted out of the category receives nothing
    Given an authenticated user "owner"
    And a public model "Muted Model" created by "owner"
    And "owner" opts out of category "comment.on_your_model"
    And an authenticated user "commenter"
    And mail delivery is captured
    When "commenter" comments "Anyone home?" on "Muted Model"
    Then the response status should be 201
    When the event processor queue is triggered
    Then no mail should have been sent

  Scenario: A recipient on the daily email mode gets no immediate email
    Given an authenticated user "owner"
    And a public model "Daily Model" created by "owner"
    And "owner" sets email to "daily" for category "comment.on_your_model"
    And an authenticated user "commenter"
    And mail delivery is captured
    When "commenter" comments "Save it for later" on "Daily Model"
    Then the response status should be 201
    When the event processor queue is triggered
    Then no mail should have been sent

  Scenario: Switching a daily category to immediate emails its pending notifications in one summary
    Given an authenticated user "owner"
    And a public model "Flush Model" created by "owner"
    And "owner" sets email to "daily" for category "comment.on_your_model"
    And an authenticated user "commenter"
    And mail delivery is captured
    When "commenter" comments "Held for the digest" on "Flush Model"
    And the event processor queue is triggered
    And "commenter" comments "Still holding" on "Flush Model"
    And the event processor queue is triggered
    Then no mail should have been sent
    When "owner" sets email to "immediate" for category "comment.on_your_model"
    Then the response status should be 204
    And one notification summary should be emailed to "owner"
    And the notification summary should list "commenter commented on Flush Model" once

  Scenario: Switching an off category to daily emails what was missed in one summary
    Given an authenticated user "owner"
    And a public model "Missed Model" created by "owner"
    And "owner" turns off email for category "comment.on_your_model"
    And an authenticated user "commenter"
    And mail delivery is captured
    When "commenter" comments "You missed this" on "Missed Model"
    And the event processor queue is triggered
    Then no mail should have been sent
    When "owner" sets email to "daily" for category "comment.on_your_model"
    Then the response status should be 204
    And one notification summary should be emailed to "owner"

  Scenario: Saving the same email mode again sends nothing
    Given an authenticated user "owner"
    And a public model "Same Model" created by "owner"
    And "owner" sets email to "daily" for category "comment.on_your_model"
    And an authenticated user "commenter"
    And mail delivery is captured
    When "commenter" comments "Still daily" on "Same Model"
    And the event processor queue is triggered
    Then no mail should have been sent
    When "owner" sets email to "daily" for category "comment.on_your_model"
    Then the response status should be 204
    And no notification summary should be emailed

  Scenario: Switching to immediate never emails notifications older than the flush window
    Given an authenticated user "owner"
    And a public model "Stale Model" created by "owner"
    And "owner" sets email to "daily" for category "comment.on_your_model"
    And an authenticated user "commenter"
    And mail delivery is captured
    When "commenter" comments "Long ago" on "Stale Model"
    And the event processor queue is triggered
    Then no mail should have been sent
    Given the notifications of "owner" are older than the flush window
    When "owner" sets email to "immediate" for category "comment.on_your_model"
    Then the response status should be 204
    And no notification summary should be emailed
