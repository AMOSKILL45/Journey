import { render } from '@testing-library/react-native';
import { type ComponentProps } from 'react';

import type { DocumentRow } from '../api/documents';
import { DocumentCard } from '../components/DocumentCard';

const baseDoc = {
  id: 'd1',
  trip_id: 't1',
  milestone_id: null,
  category: 'tickets',
  name: 'Flight LAX → JFK',
  file_type: 'pdf',
  storage_path: 't1/x.pdf',
  external_url: null,
  mime_type: 'application/pdf',
  size_bytes: 1024,
  uploaded_by: 'u1',
  uploaded_at: '2026-05-30T00:00:00Z',
} as unknown as DocumentRow;

function renderCard(overrides: Partial<ComponentProps<typeof DocumentCard>> = {}) {
  return render(
    <DocumentCard
      doc={baseDoc}
      uploaderName="Alice"
      isOffline={false}
      isBusy={false}
      canManage={false}
      onOpen={jest.fn()}
      onToggleOffline={jest.fn()}
      onDelete={jest.fn()}
      {...overrides}
    />,
  );
}

describe('DocumentCard', () => {
  it('renders the document name and uploader', () => {
    const { getByText } = renderCard();
    expect(getByText('Flight LAX → JFK')).toBeTruthy();
    expect(getByText(/Alice/)).toBeTruthy();
  });

  it('shows the offline badge when downloaded', () => {
    const { getByTestId } = renderCard({ isOffline: true });
    expect(getByTestId('document-offline-badge')).toBeTruthy();
  });

  it('hides the offline badge when not downloaded', () => {
    const { queryByTestId } = renderCard({ isOffline: false });
    expect(queryByTestId('document-offline-badge')).toBeNull();
  });
});
