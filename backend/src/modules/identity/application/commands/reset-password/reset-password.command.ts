export class ResetPasswordCommand {
  constructor(
    public readonly secret: string,
    public readonly newPassword: string,
  ) {}
}
