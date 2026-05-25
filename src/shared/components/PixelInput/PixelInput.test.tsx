import { fireEvent, render } from '@testing-library/react-native';

import { PixelInput } from './PixelInput';

describe('PixelInput', () => {
  it('renders label', () => {
    const { getByText } = render(<PixelInput label="Email" />);
    expect(getByText(/Email/)).toBeTruthy();
  });

  it('renders required asterisk', () => {
    const { getByText } = render(<PixelInput label="Email" required />);
    expect(getByText('*')).toBeTruthy();
  });

  it('shows error text when provided', () => {
    const { getByText } = render(<PixelInput label="Email" errorText="Invalid" />);
    expect(getByText('Invalid')).toBeTruthy();
  });

  it('shows helper text when no error', () => {
    const { getByText } = render(<PixelInput label="Email" helperText="We never share" />);
    expect(getByText('We never share')).toBeTruthy();
  });

  it('calls onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByLabelText } = render(<PixelInput label="Email" onChangeText={onChangeText} />);
    fireEvent.changeText(getByLabelText('Email'), 'foo@bar.com');
    expect(onChangeText).toHaveBeenCalledWith('foo@bar.com');
  });
});
