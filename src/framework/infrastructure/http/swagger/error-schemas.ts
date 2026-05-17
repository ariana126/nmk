export const ValidationErrorSchema = {
  properties: {
    statusCode: { type: 'number', example: 400 },
    message: {
      type: 'array',
      items: { type: 'string' },
      example: ['email must be an email'],
    },
    error: { type: 'string', example: 'Bad Request' },
  },
} as const;

export function domainErrorSchema(
  statusCode: number,
  errorCode: string,
  message: string,
) {
  return {
    properties: {
      statusCode: { type: 'number', example: statusCode },
      errorCode: { type: 'string', example: errorCode },
      message: { type: 'string', example: message },
    },
  };
}
