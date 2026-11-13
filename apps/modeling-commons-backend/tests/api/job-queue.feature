@job-queue
Feature: Job queue
  As the platform
  I want jobs sent inside a transaction to exist only when it commits
  So that background work never runs for writes that rolled back

  @sanity
  Scenario: A job sent inside a committed transaction exists
    When a probe job is sent inside a transaction that commits
    Then the probe job should exist

  @sanity
  Scenario: A job sent inside a rolled back transaction does not exist
    When a probe job is sent inside a transaction that rolls back
    Then the probe job should not exist

  Scenario: A job sent outside a transaction exists
    When a probe job is sent outside a transaction
    Then the probe job should exist

  @sanity
  Scenario: An api-role boss creates the queues it sends to and sends plain and transactional jobs
    Given the send-email queue does not exist
    When an api-role boss sends one email job plainly and one inside a committed transaction
    Then both api-role email jobs should exist

  Scenario: An api-role boss starts before any worker has installed pg-boss
    Given a pg-boss schema that has never been installed
    When an api-role boss starts on it and sends a probe email job
    Then the probe email job should exist in that schema

  @sanity
  Scenario: An event published inside a committed transaction creates one job per subscriber
    When a probe event is published inside a transaction that commits
    Then each probe subscriber queue should hold 1 job for that publish

  @sanity
  Scenario: An event published inside a rolled back transaction creates no job
    When a probe event is published inside a transaction that rolls back
    Then each probe subscriber queue should hold 0 jobs for that publish

  Scenario: An event nobody subscribes to is published without a job and without an error
    When an event nobody subscribes to is published inside a transaction that commits
    Then the publish should have created no job

  Scenario: An api-role boss registers every configured subscription
    Given the pg-boss subscription table is empty
    When an api-role boss starts and registers the subscriptions
    Then every configured subscription should exist

  Scenario: A comment creates one job in each subscriber queue
    Given an authenticated user "owner"
    And a public model "Fan-out Model" created by "owner"
    When "owner" comments "Fan out" on "Fan-out Model"
    Then the response status should be 201
    And the comment event should have one job in each subscriber queue
