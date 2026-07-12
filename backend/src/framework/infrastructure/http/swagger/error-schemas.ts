const TYPE_BASE_URL = 'https://my-api-doc.dev/problems';

export const ValidationErrorSchema = {
  properties: {
    type: {
      type: 'string',
      example: `${TYPE_BASE_URL}/validation-error`,
    },
    title: { type: 'string', example: 'Validation Error' },
    status: { type: 'number', example: 400 },
    detail: {
      type: 'string',
      example: 'One or more fields failed validation.',
    },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string', example: 'email' },
          message: { type: 'string', example: 'email must be an email' },
        },
      },
    },
  },
} as const;

export function domainErrorSchema(
  typeUri: string,
  title: string,
  status: number,
  detail?: string,
  extensionMembers?: Record<string, { type: string; example: unknown }>,
) {
  return {
    properties: {
      type: { type: 'string', example: `${TYPE_BASE_URL}/${typeUri}` },
      title: { type: 'string', example: title },
      status: { type: 'number', example: status },
      ...(detail !== undefined && {
        detail: { type: 'string', example: detail },
      }),
      ...extensionMembers,
    },
  };
}

export const EntityNotFoundSchema = domainErrorSchema(
  'entity-not-found',
  'Entity not found',
  404,
  'Entity not found with id 550e8400-e29b-41d4-a716-446655440000',
  {
    entityId: {
      type: 'string',
      example: '550e8400-e29b-41d4-a716-446655440000',
    },
  },
);

export const JwtUnauthorizedSchema = {
  properties: {
    type: { type: 'string', example: 'about:blank' },
    title: { type: 'string', example: 'Unauthorized' },
    status: { type: 'number', example: 401 },
  },
} as const;
