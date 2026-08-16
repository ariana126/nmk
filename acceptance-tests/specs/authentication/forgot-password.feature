Feature: Forgot Password
  As a registered user who has forgotten his password
  I want to set a new one from a link I am sent
  So that I can regain access to my account

  Background:
    Given Ariana already has an account

  Scenario: Successful password reset
    When he requests a password reset
    And he sets a new password using the reset link he was sent
    Then he should be able to login with his new password
    And he should not be able to login with his old password

  Scenario: Unknown email
    When Fateme requests a password reset
    Then the password reset request should be rejected due to an unknown email

  Scenario: Expired reset link
    Given Ariana requested a password reset
    When he sets a new password two hours later
    Then the password reset should be rejected due to an expired link
    And he should still be able to login with his old password

  Scenario: Reset link used twice
    Given Ariana already reset his password
    When he sets another password using the same reset link
    Then the password reset should be rejected due to an already used link
    And he should still be able to login with his new password

  Scenario Outline: Weak new password
    Given Ariana requested a password reset
    When he sets the new password "<password>" using the reset link he was sent
    Then the password reset should be rejected due to a weak password
    And he should still be able to login with his old password

    Examples:
      | password |
      | 123      |
      | password |
      | abcdefgh |
