import { fireEvent, render } from '@testing-library/react-native';

import { AvatarSpritePicker } from '../components/AvatarSpritePicker';
import { CountryPicker } from '../components/CountryPicker';

jest.mock('expo-image', () => {
  const RN = jest.requireActual('react-native');
  return { Image: RN.View };
});

jest.mock('@assets/sprites/avatars/manifest', () => ({
  AVATAR_SPRITES: [
    { id: 'avatars/adventurer_1', source: 1, label: 'Adventurer Red' },
    { id: 'avatars/adventurer_2', source: 2, label: 'Adventurer Blue' },
  ],
}));

describe('AvatarSpritePicker', () => {
  it('renders one card per avatar with accessibility label', () => {
    const { getByLabelText } = render(
      <AvatarSpritePicker value="avatars/adventurer_1" onChange={() => {}} />,
    );
    expect(getByLabelText('Adventurer Red')).toBeTruthy();
    expect(getByLabelText('Adventurer Blue')).toBeTruthy();
  });

  it('calls onChange with the avatar id when pressed', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <AvatarSpritePicker value="avatars/adventurer_1" onChange={onChange} />,
    );
    fireEvent.press(getByLabelText('Adventurer Blue'));
    expect(onChange).toHaveBeenCalledWith('avatars/adventurer_2');
  });
});

describe('CountryPicker', () => {
  it('shows placeholder text when no country is selected', () => {
    const { getByText } = render(<CountryPicker value={null} onChange={() => {}} />);
    expect(getByText('Tap to pick')).toBeTruthy();
  });

  it('shows the selected country name and flag', () => {
    const { getByText } = render(<CountryPicker value="FR" onChange={() => {}} />);
    expect(getByText(/France/)).toBeTruthy();
  });

  it('renders the optional label and helper text', () => {
    const { getByText } = render(
      <CountryPicker
        value={null}
        onChange={() => {}}
        label="Home country"
        helperText="Used for currency"
      />,
    );
    expect(getByText('Home country')).toBeTruthy();
    expect(getByText('Used for currency')).toBeTruthy();
  });
});
