import { render } from '@testing-library/react-native';

import { ReadinessCard } from '../components/ReadinessCard';

describe('ReadinessCard', () => {
  it('shows ready when everyone is done', () => {
    const { getByText } = render(
      <ReadinessCard ready readyX={3} readyN={3} lateNames={[]} hasItems />,
    );
    expect(getByText("Everyone's ready! 🎒")).toBeTruthy();
  });

  it('shows the empty state when there are no items', () => {
    const { getByText } = render(
      <ReadinessCard ready={false} readyX={0} readyN={0} lateNames={[]} hasItems={false} />,
    );
    expect(getByText('No checklist yet')).toBeTruthy();
  });
});
