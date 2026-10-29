Feature: Notification janitor
  As an operator
  I want stale notification rows purged
  So that the ledger stays bounded and the feed drops models that are gone

  Background:
    Given an authenticated user "alice"
    And a public model "live" created by "alice"
    And a public model "archived" created by "alice"
    And the model "archived" has been deleted

  Scenario: A janitor run removes rows on a gone model and keeps rows on a live one
    Given a notification for "alice" on model "live" created 1 day ago
    And a notification for "alice" on model "archived" created 1 day ago
    And a notification for "alice" on a missing model created 1 day ago
    And a notification for "alice" without a target created 1 day ago
    When the notification janitor runs
    Then the notification for "alice" on model "live" created 1 day ago should remain
    And the notification for "alice" without a target created 1 day ago should remain
    And the notification for "alice" on model "archived" created 1 day ago should be gone
    And the notification for "alice" on a missing model created 1 day ago should be gone

  Scenario: A janitor run removes rows past the retention period and keeps younger ones
    Given a notification for "alice" on model "live" created 89 days ago
    And a notification for "alice" on model "live" created 91 days ago
    When the notification janitor runs
    Then the notification for "alice" on model "live" created 89 days ago should remain
    And the notification for "alice" on model "live" created 91 days ago should be gone

  Scenario: A janitor run removes long-sent and long-failed queued emails and keeps recent or pending ones
    Given a queued email "sent-31" sent 31 days ago
    And a queued email "sent-29" sent 29 days ago
    And a queued email "capped-91" that hit the attempt cap 91 days ago
    And a queued email "capped-89" that hit the attempt cap 89 days ago
    And a queued email "retrying-91" that last failed 91 days ago below the attempt cap
    And a queued email "pending-91" created 91 days ago and never tried
    When the notification janitor runs
    Then the queued email "sent-31" should be gone
    And the queued email "capped-91" should be gone
    And the queued email "sent-29" should remain
    And the queued email "capped-89" should remain
    And the queued email "retrying-91" should remain
    And the queued email "pending-91" should remain
