import { RefreshToken } from './refresh-token.entity';

describe('RefreshToken', () => {
  it('should create a refresh token with required fields', () => {
    const token = new RefreshToken();
    token.tokenHash = 'abc123hash';
    token.family = 'family-uuid';
    token.expiresAt = new Date('2026-04-01');

    expect(token.tokenHash).toBe('abc123hash');
    expect(token.family).toBe('family-uuid');
    expect(token.expiresAt).toEqual(new Date('2026-04-01'));
    expect(token.createdAt).toBeInstanceOf(Date);
    expect(token.usedAt).toBeNull();
    expect(token.revokedAt).toBeNull();
  });

  it('should have isValid computed property', () => {
    const token = new RefreshToken();
    token.expiresAt = new Date(Date.now() + 86400000);
    token.usedAt = null;
    token.revokedAt = null;

    expect(token.isValid).toBe(true);
  });

  it('should be invalid when expired', () => {
    const token = new RefreshToken();
    token.expiresAt = new Date(Date.now() - 86400000);
    token.usedAt = null;
    token.revokedAt = null;

    expect(token.isValid).toBe(false);
  });

  it('should be invalid when used', () => {
    const token = new RefreshToken();
    token.expiresAt = new Date(Date.now() + 86400000);
    token.usedAt = new Date();
    token.revokedAt = null;

    expect(token.isValid).toBe(false);
  });

  it('should be invalid when revoked', () => {
    const token = new RefreshToken();
    token.expiresAt = new Date(Date.now() + 86400000);
    token.usedAt = null;
    token.revokedAt = new Date();

    expect(token.isValid).toBe(false);
  });
});
