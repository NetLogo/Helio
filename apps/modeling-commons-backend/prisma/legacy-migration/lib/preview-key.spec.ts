import { describe, expect, test } from 'vitest';
import { samePreviewObject } from './preview-key.ts';

const NANOID21_NONCE = 'abcdefghij0123456789A'; // createModelFromNode's newId()
const HASH_NONCE = 'fb60fd65-f24f-42c7-bb9f-9c794f021ae4'; // frozen storagePathHash output
const MODEL_A = 'model1model1model1mod';
const MODEL_B = 'model2model2model2mod';

function previewKey(modelId: string, nonce: string, filename = 'p.png') {
  return `files/public/uploads/models/${modelId}/preview-images/2020/07/01/${nonce}/${filename}`;
}

describe('samePreviewObject', () => {
  test('treats keys whose nonces differ only in shape as the same object', () => {
    const a = previewKey(MODEL_A, NANOID21_NONCE);
    const b = previewKey(MODEL_A, HASH_NONCE);
    expect(samePreviewObject(a, b)).toBe(true);
  });

  test('treats a live-app createStorageKey nonce (nanoid10) as the same object too', () => {
    const a = previewKey(MODEL_A, HASH_NONCE);
    const b = previewKey(MODEL_A, 'AbCdEfGhIj');
    expect(samePreviewObject(a, b)).toBe(true);
  });

  test('does not collapse a difference in model id', () => {
    const a = previewKey(MODEL_A, NANOID21_NONCE);
    const b = previewKey(MODEL_B, NANOID21_NONCE);
    expect(samePreviewObject(a, b)).toBe(false);
  });

  test('does not collapse a difference in the date partition', () => {
    const a = 'files/public/uploads/models/m/preview-images/2020/07/01/AbCdEfGhIj/p.png';
    const b = 'files/public/uploads/models/m/preview-images/2020/07/02/AbCdEfGhIj/p.png';
    expect(samePreviewObject(a, b)).toBe(false);
  });

  test('does not collapse a difference in filename', () => {
    const a = previewKey(MODEL_A, NANOID21_NONCE, 'first.png');
    const b = previewKey(MODEL_A, NANOID21_NONCE, 'second.png');
    expect(samePreviewObject(a, b)).toBe(false);
  });

  test('null on either side compares equal only when both are null', () => {
    expect(samePreviewObject(null, null)).toBe(true);
    expect(samePreviewObject(previewKey(MODEL_A, NANOID21_NONCE), null)).toBe(false);
    expect(samePreviewObject(null, previewKey(MODEL_A, NANOID21_NONCE))).toBe(false);
  });
});
