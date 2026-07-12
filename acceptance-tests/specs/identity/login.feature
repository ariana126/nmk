@wip
Feature: User Login
  As a registered user
  I want to login into my account
  So that I can access authenticated features

  Background:
    Given the application is running
    And I register with the following details:
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |
      | password  | SecurePass123!   |

  Scenario: Successful Login
    When I log in with email "test@example.com" and password "SecurePass123!"
    Then the response status should be 200
    And the response body should contain an access token
    And the response body should contain a refresh token
    And I should see my profile with the following details:
      | id        | <present>        |
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |

  Scenario: Refreshing Token
    When I log in with email "test@example.com" and password "SecurePass123!"
    And I refresh my access token
    Then the response status should be 200
    And I should get a new access token
    And I should see my profile with the following details:
      | id        | <present>        |
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |

  Scenario: Invalid Email
    When I log in with email "not-existed-email@example.com" and password "SecurePass123!"
    Then the response status should be 401
    And the response should be a valid problem detail
    And the response body should contain an error indicating the credential is invalid

  Scenario: Invalid Password
    When I log in with email "test@example.com" and password "wrong-password"
    Then the response status should be 401
    And the response should be a valid problem detail
    And the response body should contain an error indicating the credential is invalid