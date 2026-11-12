import { signJWT } from 'better-auth/crypto';
import { describe, it, expect } from 'vitest';
import env from '#src/config/env.ts';
import notificationsConfig from '#src/config/notifications.ts';
import {
  readUnsubscribeToken,
  signUnsubscribeToken,
} from '#src/modules/user-notification/core/unsubscribe-token.domain.ts';

const onYourModel = 'comment.on_your_model';
const replyToYou = 'comment.reply_to_you';
const purpose = notificationsConfig.unsubscribeTokenPurpose;

function tamper(token: string): string {
  const last = token.at(-1) === 'A' ? 'B' : 'A';
  return `${token.slice(0, -1)}${last}`;
}

describe('unsubscribe token', () => {
  it('reads back the user and categories it was signed for, deduped and sorted', async () => {
    const token = await signUnsubscribeToken({
      userId: 'user-a',
      categories: [replyToYou, onYourModel, replyToYou],
    });

    expect(await readUnsubscribeToken(token)).toEqual({
      userId: 'user-a',
      categories: [onYourModel, replyToYou],
    });
  });

  it('refuses a token whose signature was altered', async () => {
    const token = await signUnsubscribeToken({ userId: 'user-a', categories: [onYourModel] });

    expect(await readUnsubscribeToken(tamper(token))).toBeUndefined();
  });

  it('refuses a token signed with another secret', async () => {
    const token = await signJWT(
      { sub: 'user-a', aud: purpose, categories: [onYourModel] },
      'another-server-secret-long-enough',
    );

    expect(await readUnsubscribeToken(token)).toBeUndefined();
  });

  it('refuses a token signed for another purpose', async () => {
    const token = await signJWT(
      { sub: 'user-a', aud: 'other', categories: [onYourModel] },
      env.auth.secret,
    );

    expect(await readUnsubscribeToken(token)).toBeUndefined();
  });

  it('refuses an expired token', async () => {
    const token = await signJWT(
      { sub: 'user-a', aud: purpose, categories: [onYourModel] },
      env.auth.secret,
      -10,
    );

    expect(await readUnsubscribeToken(token)).toBeUndefined();
  });

  it('refuses malformed tokens', async () => {
    const token = await signUnsubscribeToken({ userId: 'user-a', categories: [onYourModel] });

    for (const malformed of ['', '.', 'abc', `${token}.extra`, token.replaceAll('.', '')]) {
      expect(await readUnsubscribeToken(malformed)).toBeUndefined();
    }
  });

  it('keeps the known categories of a token that also names a retired one', async () => {
    const token = await signJWT(
      { sub: 'user-a', aud: purpose, categories: [onYourModel, 'retired'] },
      env.auth.secret,
    );

    expect(await readUnsubscribeToken(token)).toEqual({
      userId: 'user-a',
      categories: [onYourModel],
    });
  });

  it('refuses a correctly signed token whose claims are not a known shape', async () => {
    const claims = { sub: 'user-a', aud: purpose, categories: [onYourModel] };
    const unknownCategory = await signJWT({ ...claims, categories: ['retired'] }, env.auth.secret);
    const noCategories = await signJWT({ ...claims, categories: [] }, env.auth.secret);
    const noUser = await signJWT({ ...claims, sub: '' }, env.auth.secret);
    const badCategories = await signJWT({ ...claims, categories: 'all' }, env.auth.secret);

    for (const token of [unknownCategory, noCategories, noUser, badCategories]) {
      expect(await readUnsubscribeToken(token)).toBeUndefined();
    }
  });
});
