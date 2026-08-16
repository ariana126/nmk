/** How the testing inbox endpoint renders one message from the outbox. */
export interface SentEmailView {
  to: string;
  subject: string;
  body: string;
  sentAt: string;
}
