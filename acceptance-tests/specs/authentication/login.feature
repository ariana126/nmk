Feature: Login
  As a registered user
  I want to log in with my email and password
  So that I can get back into my account

  Background:
    Given Ariana already has an account

  Scenario: Successful login
    When he logs in
    Then he should be back in his account

  Scenario: Wrong password
    When he logs in with the wrong password
    Then the login should be rejected due to an incorrect email or password

  Scenario: Unknown email
    When Fateme logs in
    Then the login should be rejected due to an incorrect email or password

  Scenario Outline: Missing credentials
    When he logs in without providing his <data>
    Then the login should be rejected due to missing required data

    Examples:
      | data     |
      | email    |
      | password |

  Scenario Outline: Invalid email
    When he logs in with the email "<email>"
    Then the login should be rejected due to an invalid email

    Examples:
      | email              |
      | @example.com       |
      | ariana@            |
      | ariana example.com |

  Scenario: Logging out
    When he logs in
    And he logs out
    Then the site should no longer recognise him

  Scenario: Profile page is private
    When he tries to reach his profile without logging in
    Then he should be asked to log in first

  Scenario: Expired session
    When he logs in
    And he returns to his profile two hours later
    Then he should be asked to log in first
