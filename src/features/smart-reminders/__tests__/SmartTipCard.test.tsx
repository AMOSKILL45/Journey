import { fireEvent, render, screen } from '@testing-library/react-native';

import { SmartTipCard } from '../components/SmartTipCard';

describe('SmartTipCard', () => {
  it('renders the i18n title for the requirement', () => {
    render(
      <SmartTipCard
        requirementId="us_esta"
        status="pending"
        onDone={jest.fn()}
        onSnooze={jest.fn()}
        onDismiss={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText(/ESTA required/i)).toBeTruthy();
  });

  it('fires onDone when the Done action is pressed', () => {
    const onDone = jest.fn();
    render(
      <SmartTipCard
        requirementId="us_esta"
        status="pending"
        onDone={onDone}
        onSnooze={jest.fn()}
        onDismiss={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('smarttip-done'));
    expect(onDone).toHaveBeenCalled();
  });
});
