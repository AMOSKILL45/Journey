import { render, screen } from '@testing-library/react-native';

import { LifeReminderRow } from '../components/LifeReminderRow';

describe('LifeReminderRow', () => {
  it('shows the custom title when type is custom', () => {
    render(<LifeReminderRow type="custom" title="Visa expires" targetDate="2026-08-01" />);
    expect(screen.getByText('Visa expires')).toBeTruthy();
  });
  it('shows the i18n label for an auto type', () => {
    render(<LifeReminderRow type="passport_expiry" title={null} targetDate="2026-12-01" />);
    expect(screen.getByText(/passport/i)).toBeTruthy();
  });
});
