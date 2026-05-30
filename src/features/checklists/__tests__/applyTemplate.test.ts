import { resolveTemplateLabel } from '../utils/applyTemplate';

describe('resolveTemplateLabel', () => {
  const t = (key: string) =>
    key === 'checklists.templates.x.items.a' ? 'Resolved A' : `[missing ${key}]`;

  it('uses i18n_key when present', () => {
    expect(
      resolveTemplateLabel({ i18n_key: 'checklists.templates.x.items.a', label: null } as never, t),
    ).toBe('Resolved A');
  });

  it('falls back to raw label (community templates)', () => {
    expect(resolveTemplateLabel({ i18n_key: null, label: 'Raw label' } as never, t)).toBe(
      'Raw label',
    );
  });
});
