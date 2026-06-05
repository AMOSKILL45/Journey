import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { supabase } from '@core/supabase/client';
import { fetchPublicProfile } from '@features/profile/api/publicProfile';
import { ProfileVisibilityToggle } from '@features/profile/components/ProfileVisibilityToggle';

jest.mock('@core/supabase/client', () => ({
  supabase: { rpc: jest.fn() },
}));

jest.mock('@core/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockedRpc = supabase.rpc as jest.Mock;

describe('fetchPublicProfile', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls the gated RPC and returns the first row (safe public subset)', async () => {
    mockedRpc.mockResolvedValue({
      data: [{ id: 'u1', display_name: 'Ana', bio: 'hi', countries_visited: ['FR'] }],
      error: null,
    });

    const profile = await fetchPublicProfile('u1');

    expect(mockedRpc).toHaveBeenCalledWith('get_public_profile', { p_user_id: 'u1' });
    expect(profile?.display_name).toBe('Ana');
    expect(profile?.bio).toBe('hi');
  });

  it('returns null when the profile is not public (RPC returns no rows)', async () => {
    mockedRpc.mockResolvedValue({ data: [], error: null });

    const profile = await fetchPublicProfile('u1');

    expect(profile).toBeNull();
  });

  it('returns null when the RPC returns null data', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: null });

    const profile = await fetchPublicProfile('u1');

    expect(profile).toBeNull();
  });

  it('throws when the RPC errors', async () => {
    mockedRpc.mockResolvedValue({ data: null, error: { message: 'rpc boom' } });

    await expect(fetchPublicProfile('u1')).rejects.toMatchObject({ message: 'rpc boom' });
  });
});

describe('ProfileVisibilityToggle', () => {
  it('opens a confirm dialog before going private -> public (no silent change)', () => {
    const onChange = jest.fn();
    const { getByLabelText, queryByText } = render(
      React.createElement(ProfileVisibilityToggle, { visibility: 'private', onChange }),
    );

    fireEvent.press(getByLabelText('social.profile.makePublic'));

    // The change is NOT applied yet — a confirm dialog asks first.
    expect(onChange).not.toHaveBeenCalled();
    expect(queryByText('social.visibility.confirmTitle')).toBeTruthy();
  });

  it('applies public after the confirm dialog is accepted', () => {
    const onChange = jest.fn();
    const { getByLabelText, getAllByText } = render(
      React.createElement(ProfileVisibilityToggle, { visibility: 'private', onChange }),
    );

    fireEvent.press(getByLabelText('social.profile.makePublic'));
    // The confirm button restates the intent ("Make my profile public"); the
    // switch row carries the same label, so press the dialog's (last) instance.
    const matches = getAllByText('social.profile.makePublic');
    fireEvent.press(matches[matches.length - 1]);

    expect(onChange).toHaveBeenCalledWith('public');
  });

  it('toggles public -> private immediately (tightening privacy needs no confirm)', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      React.createElement(ProfileVisibilityToggle, { visibility: 'public', onChange }),
    );

    fireEvent.press(getByLabelText('social.profile.makePublic'));

    expect(onChange).toHaveBeenCalledWith('private');
  });

  it('always shows the persistent what-is-visible explainer', () => {
    const { getByText } = render(
      React.createElement(ProfileVisibilityToggle, { visibility: 'private', onChange: jest.fn() }),
    );

    expect(getByText('social.profile.publicNote')).toBeTruthy();
  });

  it('shows the progressive gender/age sub-toggles only when public', () => {
    const priv = render(
      React.createElement(ProfileVisibilityToggle, { visibility: 'private', onChange: jest.fn() }),
    );
    expect(priv.queryByLabelText('social.profile.showGender')).toBeNull();
    expect(priv.queryByLabelText('social.profile.showAge')).toBeNull();

    const pub = render(
      React.createElement(ProfileVisibilityToggle, {
        visibility: 'public',
        showGender: false,
        showAge: false,
        onChange: jest.fn(),
        onChangeGender: jest.fn(),
      }),
    );
    expect(pub.getByLabelText('social.profile.showGender')).toBeTruthy();
    expect(pub.getByLabelText('social.profile.showAge')).toBeTruthy();
  });

  it('forwards gender sub-toggle changes', () => {
    const onChangeGender = jest.fn();
    const { getByLabelText } = render(
      React.createElement(ProfileVisibilityToggle, {
        visibility: 'public',
        showGender: false,
        onChange: jest.fn(),
        onChangeGender,
      }),
    );

    fireEvent.press(getByLabelText('social.profile.showGender'));

    expect(onChangeGender).toHaveBeenCalledWith(true);
  });
});
