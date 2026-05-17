import { HttpException } from '@nestjs/common';

const TYPE_BASE_URL: string = 'https://my-api-doc.dev/problems';
const BLANK_TYPE: string = 'about:blank';

export class ProblemDetail {
  constructor(
    public readonly typeUri: string,
    public readonly title: string,
    public readonly status: number,
    public readonly detail?: string,
    public readonly instance?: string,
    public readonly extensionMembers?: Record<string, unknown>,
  ) {}

  public static forUnknownError(): ProblemDetail {
    return new ProblemDetail(BLANK_TYPE, 'Internal Server Error', 500);
  }

  public static fromHttpException(exception: HttpException): ProblemDetail {
    return new ProblemDetail(
      BLANK_TYPE,
      exception.message,
      exception.getStatus(),
    );
  }

  public asResponseBody(): Record<string, unknown> {
    return {
      type:
        BLANK_TYPE !== this.typeUri
          ? `${TYPE_BASE_URL}/${this.typeUri}`
          : BLANK_TYPE,
      title: this.title,
      status: this.status,
      ...(undefined !== this.detail && { detail: this.detail }),
      ...(undefined !== this.instance && { instance: this.instance }),
      ...(undefined !== this.extensionMembers && { ...this.extensionMembers }),
    };
  }
}
