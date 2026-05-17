export abstract class DomainException extends Error {
  protected constructor(
    message: string,
    public readonly errorCode: string,
  ) {
    super(message);
  }
}
