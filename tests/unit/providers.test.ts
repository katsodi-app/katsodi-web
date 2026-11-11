import { describe, expect, it } from 'vitest';
import { inspectSource } from '../../src/lib/providers';
import { roomSchema } from '../../src/lib/rooms';
import { messages } from '../../src/lib/i18n';
import { fandoms } from '../../src/lib/fandoms';
describe('source boundary', () => {
  it.each(['javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd', 'http://youtube.com', 'https://localhost', 'https://127.0.0.1/a', 'https://0x7f000001', 'https://[::1]', 'https://name:pass@youtube.com', 'https://example.local', 'https://youtube.com:444', 'not a url'])('rejects %s', input => expect(inspectSource(input)).toBeNull());
  it('recognises exact provider hosts without claiming playback', () => { const result = inspectSource('https://www.youtube.com/watch?v=test'); expect(result?.provider.id).toBe('youtube'); expect(result?.provider.capabilities.sync).toBe(false); expect(result?.provider.capabilities.embed).toBe(false); });
  it('does not trust a host containing a provider name', () => expect(inspectSource('https://youtube.com.evil.org')?.provider.id).toBe('external'));
  it('keeps unsupported public links as companion sources', () => expect(inspectSource('https://archive.org/details/test')?.provider.mode).toBe('companion'));
});
describe('room validation', () => {
  const base = { name: 'Movie night', description: '', format: 'video', visibility: 'private', url: '' };
  it('accepts a draft without a source', () => expect(roomSchema.safeParse(base).success).toBe(true));
  it('rejects short names, unsafe links and unrecognised access modes', () => {
    for (const change of [{ name: '  a  ' }, { url: 'javascript:alert(1)' }, { visibility: 'secret' }, { description: 'x'.repeat(501) }]) expect(roomSchema.safeParse({ ...base, ...change }).success).toBe(false);
  });
});
it('has matching RU and EN dictionary keys', () => expect(Object.keys(messages.ru).sort()).toEqual(Object.keys(messages.en).sort()));
it('provides 150 unique fandom IDs', () => { expect(fandoms).toHaveLength(150); expect(new Set(fandoms.map(f => f.id)).size).toBe(150); });
