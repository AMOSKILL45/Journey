import { render } from '@testing-library/react-native';

import { PassportStamp } from '../components/PassportStamp';

describe('PassportStamp', () => {
  it('renders flag, label and date', () => {
    const { getByTestId, getByText } = render(
      <PassportStamp
        stamp={{
          milestone_id: 'm1',
          trip_id: 't1',
          label: 'Tokyo Tower',
          country: 'JP',
          at: '2026-06-04T10:00:00Z',
        }}
      />,
    );
    expect(getByTestId('stamp-m1')).toBeTruthy();
    expect(getByText('Tokyo Tower')).toBeTruthy();
    expect(getByText('🇯🇵')).toBeTruthy();
    expect(getByText('2026-06-04')).toBeTruthy();
  });
});
