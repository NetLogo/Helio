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
    And the response body property "message" should equal "Validation error"

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
    When "commenter" comments "Great work!" on "Notify Model"
    Then the response status should be 201
    When the pending events have been dispatched
    Then mail should have been sent to 2 recipients
    And mail should have been sent to "owner"
    And mail should have been sent to "contributor"
    And mail should not have been sent to "commenter"

  Scenario: Commenting on your own model does not notify yourself
    Given an authenticated user "owner"
    And a public model "Solo Model" created by "owner"
    When "owner" comments "Talking to myself" on "Solo Model"
    Then the response status should be 201
    When the pending events have been dispatched
    Then no mail should have been sent

  @sanity
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
    When "commenter" comments "Still emailed" on "Quiet Model"
    Then the response status should be 201
    When the pending events have been dispatched
    Then mail should have been sent to 1 recipients
    When "owner" lists their notifications
    Then the response status should be 200
    And the notification feed should contain 0 notifications

  @sanity
  Scenario: A notification muted in-app at delivery stays hidden after in-app is turned back on
    Given an authenticated user "owner"
    And a public model "Muted Model" created by "owner"
    And "owner" mutes the in-app channel for category "comment.on_your_model"
    And an authenticated user "commenter"
    When "commenter" comments "Quietly" on "Muted Model"
    Then the response status should be 201
    When the comment notification has been delivered
    Then the ledger should hold 1 in-app suppressed notification for "owner"
    When "owner" lists their notifications
    Then the notification feed should contain 0 notifications
    And the notification feed should report 0 unread
    When "owner" unmutes the in-app channel for category "comment.on_your_model"
    And "owner" lists their notifications
    Then the notification feed should contain 0 notifications
    And the notification feed should report 0 unread

  Scenario: Reading the notification feed requires authentication
    When an anonymous viewer lists notifications
    Then the response status should be 401

  Scenario: A recipient who opted out of the category receives nothing
    Given an authenticated user "owner"
    And a public model "Muted Model" created by "owner"
    And "owner" opts out of category "comment.on_your_model"
    And an authenticated user "commenter"
    When "commenter" comments "Anyone home?" on "Muted Model"
    Then the response status should be 201
    When the pending events have been dispatched
    Then no mail should have been sent

  Scenario: A recipient on the daily email mode gets no immediate email
    Given an authenticated user "owner"
    And a public model "Daily Model" created by "owner"
    And "owner" sets email to "daily" for category "comment.on_your_model"
    And an authenticated user "commenter"
    When "commenter" comments "Save it for later" on "Daily Model"
    Then the response status should be 201
    When the pending events have been dispatched
    Then no mail should have been sent

  Scenario: Switching a daily category to immediate emails its pending notifications in one summary
    Given an authenticated user "owner"
    And a public model "Flush Model" created by "owner"
    And "owner" sets email to "daily" for category "comment.on_your_model"
    And an authenticated user "commenter"
    When "commenter" comments "Held for the digest" on "Flush Model"
    And the pending events have been dispatched
    And "commenter" comments "Still holding" on "Flush Model"
    And the pending events have been dispatched
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
    When "commenter" comments "You missed this" on "Missed Model"
    And the pending events have been dispatched
    Then no mail should have been sent
    When "owner" sets email to "daily" for category "comment.on_your_model"
    Then the response status should be 204
    And one notification summary should be emailed to "owner"

  Scenario: Saving the same email mode again sends nothing
    Given an authenticated user "owner"
    And a public model "Same Model" created by "owner"
    And "owner" sets email to "daily" for category "comment.on_your_model"
    And an authenticated user "commenter"
    When "commenter" comments "Still daily" on "Same Model"
    And the pending events have been dispatched
    Then no mail should have been sent
    When "owner" sets email to "daily" for category "comment.on_your_model"
    Then the response status should be 204
    And no notification summary should be emailed

  Scenario: Switching to immediate never emails notifications older than the flush window
    Given an authenticated user "owner"
    And a public model "Stale Model" created by "owner"
    And "owner" sets email to "daily" for category "comment.on_your_model"
    And an authenticated user "commenter"
    When "commenter" comments "Long ago" on "Stale Model"
    And the pending events have been dispatched
    Then no mail should have been sent
    Given the notifications of "owner" are older than the flush window
    When "owner" sets email to "immediate" for category "comment.on_your_model"
    Then the response status should be 204
    And no notification summary should be emailed

  Scenario: Recording an existing ledger row keeps its transaction usable
    Given an authenticated user "ledger"
    And a ledger notification already exists for "ledger"
    When the same ledger notification is recorded again followed by another write in one transaction
    Then the transaction should commit both writes on the one existing ledger row
    And the ledger row should keep the payload it was recorded with

  Scenario: The feed names the actor and the model as they are now, not as they were at delivery
    Given an authenticated user "owner"
    And a public model "Original Title" created by "owner"
    And an authenticated user "commenter"
    When "commenter" comments "Nice model!" on "Original Title"
    Then the response status should be 201
    When the comment notification has been delivered
    And "commenter" renames themselves to "Renamed Commenter"
    And "owner" updates the current version of "Original Title" with title "Renamed Title"
    And "owner" lists their notifications
    Then the response status should be 200
    And the first feed notification should have title "Renamed Commenter commented on your model"
    And the first feed notification should link its actor to "commenter"
    And the first feed notification should target a model named "Renamed Title"

  Scenario: The feed keeps the excerpt the comment had when it was delivered
    Given an authenticated user "owner"
    And a public model "Excerpt Model" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "First thoughts" on "Excerpt Model" as "thought"
    When the comment notification has been delivered
    And "commenter" edits comment "thought" on "Excerpt Model" with content "Second thoughts"
    Then the response status should be 204
    When "owner" lists their notifications
    Then the response status should be 200
    And the first feed notification should have body "First thoughts"

  Scenario: The feed never names a model the recipient can no longer read
    Given an authenticated user "owner"
    And a public model "Vanishing Model" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "Hello there" on "Vanishing Model" as "question"
    And "owner" has replied "Thanks" to comment "question" as "answer"
    When the comment notification has been delivered
    And "owner" updates the model "Vanishing Model" with visibility "private"
    Then the response status should be 204
    When "commenter" lists their notifications
    Then the response status should be 200
    And the notification feed should contain 1 notification
    And the first feed notification should have category "comment.reply_to_you"
    And the first feed notification should have title "owner replied to your comment"
    And no field of the notification feed should contain "Vanishing Model"
    And no field of the notification feed should contain "Thanks"

  Scenario: The feed stops quoting a comment once it is deleted
    Given an authenticated user "owner"
    And a public model "Retracted Model" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "Regrettable words" on "Retracted Model" as "regret"
    When the comment notification has been delivered
    And "commenter" deletes comment "regret" on "Retracted Model"
    Then the response status should be 204
    When the pending events have been dispatched
    And "owner" lists their notifications
    Then the response status should be 200
    And the notification feed should contain 1 notification
    And the first feed notification should have body ""
    And no field of the notification feed should contain "Regrettable words"

  Scenario: The one-click unsubscribe in a comment email turns off that category for that recipient only
    Given an authenticated user "owner"
    And a public model "Unsubscribe Model" created by "owner"
    And an authenticated user "contributor"
    And "owner" has added "contributor" as a contributor to "Unsubscribe Model"
    And an authenticated user "commenter"
    When "commenter" comments "Great work!" on "Unsubscribe Model"
    Then the response status should be 201
    When the pending events have been dispatched
    Then the email to "owner" should carry a one-click unsubscribe for category "comment.on_your_model"
    When "owner" gets their notification preferences
    And "contributor" gets their notification preferences
    And the mail client of "owner" posts its one-click unsubscribe
    Then the response status should be 204
    When the mail client of "owner" posts its one-click unsubscribe
    Then the response status should be 204
    When "contributor" gets their notification preferences
    Then every category should be unchanged from before
    When "owner" gets their notification preferences
    Then category "comment.on_your_model" should have email "off"
    And every category other than "comment.on_your_model" should be unchanged from before

  Scenario: A tampered unsubscribe token is refused and changes nothing
    Given an authenticated user "owner"
    And "owner" gets their notification preferences
    When a mail client posts a one-click unsubscribe for "owner" whose category was tampered to "comment.on_your_model"
    Then the response status should be 400
    When a mail client posts a one-click unsubscribe with a malformed token
    Then the response status should be 400
    When "owner" gets their notification preferences
    Then every category should be unchanged from before

  @mailpit
  Scenario: The comment email shows a readable model with its title and preview image
    Given Mailpit is reachable
    And an authenticated user "owner"
    And a public model "Pictured Model" created by "owner"
    And the model "Pictured Model" has a public preview image
    And an authenticated user "commenter"
    And Mailpit holds no messages to "owner"
    When "commenter" comments "Lovely picture" on "Pictured Model"
    Then the response status should be 201
    When the pending events have been dispatched
    And the email sender has sent the queued emails to "owner"
    Then Mailpit should hold exactly 1 message to "owner"
    And the Mailpit message to "owner" should show "Pictured Model" with its preview image

  @mailpit
  Scenario: The reply email never names a model the recipient can no longer read
    Given Mailpit is reachable
    And an authenticated user "owner"
    And a public model "Hidden Model" created by "owner"
    And the model "Hidden Model" has a public preview image
    And an authenticated user "commenter"
    And "commenter" has commented "Hello there" on "Hidden Model" as "question"
    And the comment notification has been delivered
    And "owner" updates the model "Hidden Model" with visibility "private"
    And Mailpit holds no messages to "commenter"
    When "owner" has replied "Thanks" to comment "question" as "answer"
    And the pending events have been dispatched
    And the email sender has sent the queued emails to "commenter"
    Then Mailpit should hold exactly 1 message to "commenter"
    And the Mailpit message to "commenter" should not mention "Hidden Model"
    And the Mailpit message to "commenter" should not show the preview image of "Hidden Model"
