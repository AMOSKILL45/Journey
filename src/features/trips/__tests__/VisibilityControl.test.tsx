import { fireEvent, render } from '@testing-library/react-native';

import { VisibilityControl } from '@features/trips/components/VisibilityControl';

describe('VisibilityControl', () => {
  it('shows the copy-link action only when not private', () => {
    const onChange = jest.fn();
    const priv = render(
      <VisibilityControl visibility="private" shareToken="t1" onChange={onChange} />,
    );
    expect(priv.queryByLabelText('social.visibility.copyLink')).toBeNull();

    const pub = render(
      <VisibilityControl visibility="public_view" shareToken="t1" onChange={onChange} />,
    );
    expect(pub.getByLabelText('social.visibility.copyLink')).toBeTruthy();
  });

  it('renders a segment per visibility level with the open_to_join chip disabled', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <VisibilityControl visibility="private" shareToken="t1" onChange={onChange} />,
    );
    expect(getByLabelText('social.visibility.private')).toBeTruthy();
    expect(getByLabelText('social.visibility.unlisted')).toBeTruthy();
    expect(getByLabelText('social.visibility.publicView')).toBeTruthy();

    const openToJoin = getByLabelText('social.visibility.openToJoinSoon');
    expect(openToJoin.props.accessibilityState?.disabled).toBe(true);
  });

  it('applies a same-level (already non-private) switch immediately, no confirm dialog', () => {
    const onChange = jest.fn();
    const { getByLabelText, queryByText } = render(
      <VisibilityControl visibility="unlisted" shareToken="t1" onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('social.visibility.publicView'));
    expect(onChange).toHaveBeenCalledWith('public_view');
    // The confirm dialog title (seeded copy) must not be present for a non-private source.
    expect(queryByText('Make this trip viewable?')).toBeNull();
  });

  it('does NOT apply immediately when going private -> public — it confirms first', () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = render(
      <VisibilityControl visibility="private" shareToken="t1" onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('social.visibility.publicView'));
    // The change is deferred behind the confirm dialog (seeded title copy is shown).
    expect(onChange).not.toHaveBeenCalled();
    expect(getByText('Make this trip viewable?')).toBeTruthy();
    // Confirming applies it.
    fireEvent.press(getByText('Done'));
    expect(onChange).toHaveBeenCalledWith('public_view');
  });

  it('selecting private from a public state applies immediately (no confirm to go private)', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <VisibilityControl visibility="public_view" shareToken="t1" onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('social.visibility.private'));
    expect(onChange).toHaveBeenCalledWith('private');
  });

  it('does not re-fire onChange when the active segment is pressed again', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <VisibilityControl visibility="unlisted" shareToken="t1" onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('social.visibility.unlisted'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
