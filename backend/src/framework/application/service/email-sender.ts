import { Email } from '@framework/domain';

/**
 * A single outbound email, expressed in terms the application understands.
 * Nothing here names a transport: how it is delivered is an infrastructure
 * concern, chosen behind {@link EmailSender}.
 */
export class EmailMessage {
  constructor(
    public readonly recipient: Email,
    public readonly subject: string,
    public readonly body: string,
  ) {}
}

/**
 * The port for "deliver this message". Implementations live in the
 * infrastructure layer and are bound by the module that needs them.
 */
export abstract class EmailSender {
  abstract send(message: EmailMessage): Promise<void>;
}
