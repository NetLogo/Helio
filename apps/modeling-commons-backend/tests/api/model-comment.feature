Feature: Model Comments
  As a user
  I want to comment and reply on models
  So that I can discuss models with their authors and other users

  Scenario: Posting a comment succeeds
    Given an authenticated user "owner"
    And a public model "Commentable" created by "owner"
    When "owner" comments "Nice model!" on "Commentable"
    Then the response status should be 201
    And the response body should have property "id"

  Scenario: Commenting requires authentication
    Given an authenticated user "owner"
    And a public model "Auth Required" created by "owner"
    When an anonymous viewer comments "Anonymous comment" on "Auth Required"
    Then the response status should be 401

  Scenario: Cannot comment on a private model owned by someone else
    Given an authenticated user "owner"
    And a private model "Secret" created by "owner"
    And an authenticated user "stranger"
    When "stranger" comments "Trying to peek" on "Secret"
    Then the response status should be 403

  Scenario: Replying with a parentId from a different model is rejected
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And a public model "Model B" created by "owner"
    And "owner" has commented "Root in A" on "Model A" as "rootA"
    When "owner" replies "Cross-model reply" to comment "rootA" on "Model B"
    Then the response status should be 400

  Scenario: A comment cannot be fetched through a different model's path
    Given an authenticated user "owner"
    And a public model "Model A" created by "owner"
    And a public model "Model B" created by "owner"
    And "owner" has commented "Root in A" on "Model A" as "rootA"
    When "owner" gets comment "rootA" on "Model B"
    Then the response status should be 404

  Scenario: A page of top-level comments embeds at most 2 replies per node
    Given an authenticated user "owner"
    And a public model "Popular" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "Root" on "Popular" as "root"
    And "commenter" has replied "First" to comment "root" as "r1"
    And "commenter" has replied "Second" to comment "root" as "r2"
    And "commenter" has replied "Third" to comment "root" as "r3"
    When "commenter" lists comments on "Popular"
    Then the response status should be 200
    And comment "root" should have replies count 3
    And comment "root" should have 2 embedded replies
    And comment "r1" should appear in the response
    And comment "r2" should appear in the response
    And comment "r3" should not appear in the response

  Scenario: Replies are embedded up to three levels deep, deeper nodes carry only a count
    Given an authenticated user "owner"
    And a public model "Threaded" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "Root comment" on "Threaded" as "root"
    And "commenter" has replied "Reply L1" to comment "root" as "l1"
    And "commenter" has replied "Reply L2" to comment "l1" as "l2"
    And "commenter" has replied "Reply L3" to comment "l2" as "l3"
    And "commenter" has replied "Reply L4" to comment "l3" as "l4"
    When "commenter" lists comments on "Threaded"
    Then the response status should be 200
    And comment "root" should appear in the response
    And comment "l1" should appear in the response
    And comment "l2" should appear in the response
    And comment "l3" should appear in the response
    And comment "l3" should have replies count 1
    And comment "l4" should not appear in the response

  Scenario: Getting a comment thread re-roots it and paginates its own replies
    Given an authenticated user "owner"
    And a public model "Thread Model" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "Root" on "Thread Model" as "root"
    And "commenter" has replied "Reply A" to comment "root" as "replyA"
    And "commenter" has replied "Reply B" to comment "root" as "replyB"
    And "commenter" has replied "Reply C" to comment "root" as "replyC"
    When "commenter" gets comment "root" on "Thread Model" with page 0 and limit 2
    Then the response status should be 200
    And the response body should have property "id"
    And comment "replyA" should appear in the response
    And comment "replyB" should appear in the response
    And comment "replyC" should not appear in the response
    When "commenter" gets comment "root" on "Thread Model" with page 1 and limit 2
    Then the response status should be 200
    And comment "replyC" should appear in the response
    And comment "replyA" should not appear in the response

  Scenario: Only the author can edit a comment
    Given an authenticated user "owner"
    And a public model "Editable" created by "owner"
    And "owner" has commented "Original text" on "Editable" as "mine"
    And an authenticated user "intruder"
    When "intruder" edits comment "mine" on "Editable" with content "Hijacked"
    Then the response status should be 403

  Scenario: The author can edit their own comment
    Given an authenticated user "owner"
    And a public model "Editable Own" created by "owner"
    And "owner" has commented "Original text" on "Editable Own" as "mine"
    When "owner" edits comment "mine" on "Editable Own" with content "Updated text"
    Then the response status should be 204
    When "owner" gets comment "mine" on "Editable Own"
    Then the response status should be 200
    And comment "mine" in the response should have property "content" equal to "Updated text"
    And comment "mine" in the response should have property "edited" equal to "true"

  Scenario: Deleting a comment with no replies leaves a tombstone
    Given an authenticated user "owner"
    And a public model "Deletable" created by "owner"
    And "owner" has commented "Delete me" on "Deletable" as "solo"
    When "owner" deletes comment "solo" on "Deletable"
    Then the response status should be 204
    When "owner" lists comments on "Deletable"
    Then comment "solo" should appear in the response
    And comment "solo" in the response should have property "deleted" equal to "true"
    And comment "solo" in the response should have property "content" equal to "[deleted]"

  Scenario: Deleting a comment with replies leaves a tombstone
    Given an authenticated user "owner"
    And a public model "Tombstone Model" created by "owner"
    And an authenticated user "replier"
    And "owner" has commented "Parent" on "Tombstone Model" as "parent"
    And "replier" has replied "A reply" to comment "parent" as "child"
    When "owner" deletes comment "parent" on "Tombstone Model"
    Then the response status should be 204
    When "owner" lists comments on "Tombstone Model"
    Then comment "parent" should appear in the response
    And comment "parent" in the response should have property "deleted" equal to "true"
    And comment "parent" in the response should have property "content" equal to "[deleted]"
    And comment "child" should appear in the response

  Scenario: An admin can delete another user's comment
    Given an authenticated user "owner"
    And a public model "Moderated" created by "owner"
    And "owner" has commented "Needs moderation" on "Moderated" as "flagged"
    And an authenticated admin user "admin"
    When "admin" deletes comment "flagged" on "Moderated"
    Then the response status should be 204

  Scenario: A random user cannot delete someone else's comment
    Given an authenticated user "owner"
    And a public model "Protected" created by "owner"
    And "owner" has commented "Mine only" on "Protected" as "protected-comment"
    And an authenticated user "rando"
    When "rando" deletes comment "protected-comment" on "Protected"
    Then the response status should be 403

  Scenario: Liking and unliking a comment is reflected and idempotent
    Given an authenticated user "owner"
    And a public model "Likeable Comments" created by "owner"
    And "owner" has commented "Like this" on "Likeable Comments" as "target"
    And an authenticated user "fan"
    When "fan" likes comment "target" on "Likeable Comments"
    Then the response status should be 204
    When "fan" gets comment "target" on "Likeable Comments"
    Then comment "target" in the response should have property "likes" equal to "1"
    And comment "target" in the response should have property "likedByMe" equal to "true"
    When "fan" likes comment "target" on "Likeable Comments"
    Then the response status should be 204
    When "fan" gets comment "target" on "Likeable Comments"
    Then comment "target" in the response should have property "likes" equal to "1"
    When "fan" unlikes comment "target" on "Likeable Comments"
    Then the response status should be 204
    When "fan" gets comment "target" on "Likeable Comments"
    Then comment "target" in the response should have property "likes" equal to "0"
    And comment "target" in the response should have property "likedByMe" equal to "false"
    When "fan" unlikes comment "target" on "Likeable Comments"
    Then the response status should be 204
    When "fan" gets comment "target" on "Likeable Comments"
    Then comment "target" in the response should have property "likes" equal to "0"

  Scenario: Commenting notifies other authors but never the commenter
    Given an authenticated user "owner"
    And a public model "Notify Model" created by "owner"
    And an authenticated user "contributor"
    And "owner" has added "contributor" as a contributor to "Notify Model"
    And an authenticated user "commenter"
    And mail delivery is captured
    When "commenter" comments "Great work!" on "Notify Model"
    Then the response status should be 201
    And mail should have been sent to 2 recipients
    And mail should have been sent to "owner"
    And mail should have been sent to "contributor"
    And mail should not have been sent to "commenter"

  Scenario: Commenting on your own model does not notify yourself
    Given an authenticated user "owner"
    And a public model "Solo Model" created by "owner"
    And mail delivery is captured
    When "owner" comments "Talking to myself" on "Solo Model"
    Then the response status should be 201
    And no mail should have been sent

  Scenario: Sibling parents at the same level are limited independently
    Given an authenticated user "owner"
    And a public model "Siblings" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "Root" on "Siblings" as "root"
    And "commenter" has replied "Branch A" to comment "root" as "a"
    And "commenter" has replied "Branch B" to comment "root" as "b"
    And "commenter" has replied 5 times to comment "a" as "a-child"
    And "commenter" has replied 1 times to comment "b" as "b-child"
    When "commenter" lists comments on "Siblings"
    Then the response status should be 200
    And comment "a" should have replies count 5
    And comment "a" should have 2 embedded replies
    And comment "b" should have replies count 1
    And comment "b" should have 1 embedded replies

  Scenario: Paging a re-rooted thread past its last reply still reports the total
    Given an authenticated user "owner"
    And a public model "Past End" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "Root" on "Past End" as "root"
    And "commenter" has replied 3 times to comment "root" as "reply"
    When "commenter" gets comment "root" on "Past End" with page 5 and limit 2
    Then the response status should be 200
    And comment "root" should have replies count 3
    And comment "root" should have 0 embedded replies

  Scenario: Embedded replies are ordered oldest first
    Given an authenticated user "owner"
    And a public model "Ordered" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "Root" on "Ordered" as "root"
    And "commenter" has replied "First" to comment "root" as "r1"
    And "commenter" has replied "Second" to comment "root" as "r2"
    When "commenter" lists comments on "Ordered"
    Then the response status should be 200
    And comment "root" embedded replies should be exactly "r1", "r2"

  Scenario: A nested reply carries the viewer's like state and its author
    Given an authenticated user "owner"
    And a public model "Nested Likes" created by "owner"
    And an authenticated user "commenter"
    And "commenter" has commented "Root" on "Nested Likes" as "root"
    And "commenter" has replied "Deep reply" to comment "root" as "deep"
    And an authenticated user "fan"
    When "fan" likes comment "deep" on "Nested Likes"
    Then the response status should be 204
    When "fan" lists comments on "Nested Likes"
    Then comment "deep" in the response should have property "likes" equal to "1"
    And comment "deep" in the response should have property "likedByMe" equal to "true"
    When an anonymous viewer lists comments on "Nested Likes"
    Then the response status should be 200
    And comment "deep" in the response should have property "likes" equal to "1"
    And comment "deep" should not report likedByMe

  Scenario: Comment lifecycle events are audited but likes are not
    Given an authenticated admin user "admin"
    And a public model "Audited Comments" created by "admin"
    When "admin" lists admin events with resourceType "model"
    Then the response body property "data" should have length 1
    And "admin" has commented "First" on "Audited Comments" as "audited"
    When "admin" lists admin events with resourceType "model"
    Then the response body property "data" should have length 2
    When "admin" lists admin events with type "model_comment.created"
    Then the response body property "data" should have length 1
    When "admin" edits comment "audited" on "Audited Comments" with content "Edited"
    Then the response status should be 204
    When "admin" lists admin events with resourceType "model"
    Then the response body property "data" should have length 3
    When "admin" likes comment "audited" on "Audited Comments"
    Then the response status should be 204
    When "admin" unlikes comment "audited" on "Audited Comments"
    Then the response status should be 204
    When "admin" lists admin events with resourceType "model"
    Then the response body property "data" should have length 3
    When "admin" deletes comment "audited" on "Audited Comments"
    Then the response status should be 204
    When "admin" lists admin events with resourceType "model"
    Then the response body property "data" should have length 4
