import { defineParameterType } from '@cucumber/cucumber';
import { actorCalled, actorInTheSpotlight } from '@serenity-js/core';
import { SignUpField } from '../screenplay/registration/sign-up-details';

defineParameterType({
  name: 'actor',
  regexp: /[A-Z][a-z]+/,
  transformer: (name: string) => actorCalled(name),
});

/**
 * The *name* of an actor, without summoning them.
 *
 * actorCalled() moves the spotlight, so using {actor} for the possessive in
 * "Fateme signs up with Ariana's email" would leave Ariana in the spotlight and the
 * following Then step would read her (empty) last response instead of Fateme's.
 */
defineParameterType({
  name: 'actorName',
  regexp: /[A-Z][a-z]+/,
  transformer: (name: string) => name,
  useForSnippets: false,
  preferForRegexpMatch: false,
});

defineParameterType({
  name: 'pronoun',
  regexp: /he|she|they/,
  transformer: () => actorInTheSpotlight(),
  useForSnippets: false,
});

const fieldNames: Record<string, SignUpField> = {
  email: 'email',
  password: 'password',
  'first name': 'firstName',
  'last name': 'lastName',
};

defineParameterType({
  name: 'field',
  regexp: /email|password|first name|last name/,
  transformer: (field: string) => fieldNames[field],
});
