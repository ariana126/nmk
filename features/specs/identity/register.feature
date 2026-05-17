Feature: User Registration
  As a visitor
  I want to create an account
  So that I can access the app

  Background:
    Given the application is running
    And no user with email "test@example.com" exists

  Scenario: Successful registration
    When I register with the following details:
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |
      | password  | SecurePass123!   |
    Then the response status should be 201
    And I should be able to log in with email "test@example.com" and password "SecurePass123!"
    And I should see my profile with the following details:
      | id        | <present>        |
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |

  Scenario: Registration with an email already in use
    Given a user with email "test@example.com" already exists
    When I register with the following details:
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |
      | password  | AnotherPass456!  |
    Then the response status should be 409
    And the response should be a valid problem detail
    And the response body should contain an error indicating the email is taken
    And I should not be able to log in with email "test@example.com" and password "AnotherPass456!"

  Scenario: Registration with missing required fields
    When I register with the following details:
      | firstName | Ariana |
    Then the response status should be 400
    And the response should be a valid problem detail
    And the response body should contain validation errors for:
      | lastName |
      | email    |
      | password |

  Scenario: Registration with an invalid email format
    When I register with the following details:
      | firstName | Ariana          |
      | lastName  | Maghsoudi       |
      | email     | not-an-email    |
      | password  | SecurePass123!  |
    Then the response status should be 400
    And the response should be a valid problem detail
    And the response body should contain validation errors for:
      | email |

  Scenario: Registration with a weak password
    When I register with the following details:
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |
      | password  | 123              |
    Then the response status should be 400
    And the response should be a valid problem detail
    And the response body should contain validation errors for:
      | password |
    And I should not be able to log in with email "test@example.com" and password "123"