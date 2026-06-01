import { render, screen } from '@testing-library/react-native';

import { PixelAvatar } from '../PixelAvatar';

describe('PixelAvatar', () => {
  it('exposes the traveler label for screen readers', () => {
    render(<PixelAvatar spriteId="avatars/adventurer_1" color="#E63946" label="Amos" />);
    expect(screen.getByLabelText('Amos')).toBeTruthy();
  });

  it('renders even when the sprite id is unknown (falls back)', () => {
    render(<PixelAvatar spriteId="avatars/does_not_exist" label="Ghost" />);
    expect(screen.getByLabelText('Ghost')).toBeTruthy();
  });
});
