Feature: Sign Up
  As a new visitor
  I want to create an account
  So that I can be recognized as a registered user

  Background:
    Given Ariana doesn't have an account

  Scenario: Successful sign-up
    When he signs up
    Then he should be able to login
    And sees his profile

  Scenario: Already registered email
    Given Ariana already has an account
    When Fateme signs up with Ariana's email
    Then the sign-up should be rejected due to a duplicate email
    And Fateme should not be able to login with Ariana's email

  Scenario Outline: Weak password
    When he signs up with the password "<password>"
    Then the sign-up should be rejected due to a weak password
    And he should not be able to login

    Examples:
      | password    |
      | 123         |
      | aa          |
      | password    |
      | abcdefgh    |
      | 12345678    |
      | qwerty123   |

  Scenario Outline: Invalid email
    When he signs up with the email "<email>"
    Then the sign-up should be rejected due to an invalid email
    And he should not be able to login

    Examples:
      | email              |
      | @gmail.com         |
      | ariana@             |
      | ariana@domain      |
      | ariana@@gmail.com  |
      | ariana example.com |

  Scenario Outline: Missing data
    When he signs up without providing his <data>
    Then the sign-up should be rejected due to missing required data
    And he should not be able to login

    Examples:
      | data       |
      | email      |
      | password   |
      | first name |
      | last name  |