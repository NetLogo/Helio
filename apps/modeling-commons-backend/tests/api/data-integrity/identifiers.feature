@data-integrity
Feature: Identifier and file key conventions
  Ids are NanoID everywhere. Soft references are the dangerous ones: nothing
  enforces them at the schema level, so a rewrite that misses one leaves a
  dangling pointer that only shows up when something dereferences it.

  Scenario: Every primary key follows the id convention
    Then every id in every mapped table matches the id convention

  Scenario: Every file key follows the key convention
    Then every stored file key matches the key convention

  Scenario: Soft references carry no off-convention id
    Then no soft reference contains an off-convention id
