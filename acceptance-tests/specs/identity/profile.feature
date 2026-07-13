@wip
Feature: User Profile
  As a registered user
  I want to see and update my profile
  So that I can keep my data accurate

  Background:
    Given the application is running
    And I register with the following details:
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |
      | password  | SecurePass123!   |
    And I log in with email "test@example.com" and password "SecurePass123!"

  Scenario: View Profile
    When I open my profile
    Then the response status should be 200
    And I should see my profile with the following details:
      | id        | <present>        |
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |

  Scenario: Update Name
    When I update my profile with the following details:
      | firstName | James  |
      | lastName  | Gordon |
    Then the response status should be 200
    And I should see my profile with the following details:
      | id        | <present>        |
      | firstName | James            |
      | lastName  | Gordon           |
      | email     | test@example.com |

  Scenario: Unauthenticated View
    When I log out
    And I open my profile
    Then the response status should be 401
    And the response should be a valid problem detail
    And the response body should contain an error indicating access is denied
    And I should not see the following details:
      | id        | <present>        |
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |

  Scenario: Unauthenticated Update
    When I log out
    And I update my profile with the following details:
      | firstName | James  |
      | lastName  | Gordon |
    Then the response status should be 401
    And the response should be a valid problem detail
    And the response body should contain an error indicating access is denied
    When I log in with email "test@example.com" and password "SecurePass123!"
    And I should see my profile with the following details:
      | id        | <present>        |
      | firstName | Ariana           |
      | lastName  | Maghsoudi        |
      | email     | test@example.com |