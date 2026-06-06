import { fireEvent, render } from '@testing-library/react-native';

import { DocumentsSection } from '../components/DocumentsSection';
import type { DocumentRow } from '../api/documents';

// Stub the utils the section imports directly — severs the transitive expo
// native-module chain (openDocument → api → expo-image-manipulator/-sharing).
jest.mock('../utils/openDocument', () => ({ openDocument: jest.fn(() => Promise.resolve()) }));
jest.mock('../utils/offlineCache', () => ({ localPathFor: jest.fn(() => 'file:///x') }));

type DocsState = {
  data?: DocumentRow[];
  isLoading: boolean;
  isError: boolean;
  refetch: jest.Mock;
};
let mockDocsState: DocsState;
const mockOpenSheet = jest.fn();

jest.mock('../hooks/useDocuments', () => ({
  useTripDocuments: () => mockDocsState,
  useDeleteDocument: () => ({ mutate: jest.fn() }),
}));

jest.mock('../hooks/useOfflineDocs', () => ({
  useOfflineDocs: () => ({
    downloadedIds: [],
    busyId: null,
    downloadDocument: jest.fn(),
    evictDocument: jest.fn(),
    downloadAll: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Child sheets/viewers pull in expo modules — stub them and re-export the
// SUGGESTED_CATEGORIES vocab the section imports.
jest.mock('../components/DocumentUploadSheet', () => {
  const react = jest.requireActual('react') as typeof import('react');
  const DocumentUploadSheet = react.forwardRef<{ open: () => void }>((_props, ref) => {
    react.useImperativeHandle(ref, () => ({ open: mockOpenSheet }));
    return null;
  });
  DocumentUploadSheet.displayName = 'DocumentUploadSheet';
  return {
    SUGGESTED_CATEGORIES: ['tickets', 'lodging', 'insurance', 'visa', 'esta', 'other'],
    DocumentUploadSheet,
  };
});
jest.mock('../components/DocumentViewer', () => ({ DocumentViewer: () => null }));

const doc = (id: string): DocumentRow =>
  ({
    id,
    trip_id: 't1',
    milestone_id: null,
    category: 'tickets',
    name: `Doc ${id}`,
    file_type: 'pdf',
    storage_path: `t1/${id}.pdf`,
    external_url: null,
    mime_type: 'application/pdf',
    size_bytes: 1024,
    uploaded_by: 'u1',
    uploaded_at: '2026-05-30T00:00:00Z',
  }) as unknown as DocumentRow;

function renderSection() {
  return render(
    <DocumentsSection tripId="t1" currentUserId="u1" isOwner uploaderName={() => 'Alice'} />,
  );
}

beforeEach(() => {
  mockOpenSheet.mockClear();
  mockDocsState = { data: [doc('a')], isLoading: false, isError: false, refetch: jest.fn() };
});

describe('DocumentsSection states', () => {
  it('renders the document list when documents exist', () => {
    const { getByText } = renderSection();
    expect(getByText('Doc a')).toBeTruthy();
  });

  it('shows the loading skeleton while documents load', () => {
    mockDocsState = { data: [], isLoading: true, isError: false, refetch: jest.fn() };
    const { getByTestId } = renderSection();
    expect(getByTestId('documents-loading')).toBeTruthy();
  });

  it('shows the error state and retries on press', () => {
    mockDocsState = { data: undefined, isLoading: false, isError: true, refetch: jest.fn() };
    const { getByTestId, getByText } = renderSection();
    expect(getByTestId('documents-error').props.accessibilityRole).toBe('alert');
    fireEvent.press(getByText('Retry'));
    expect(mockDocsState.refetch).toHaveBeenCalledTimes(1);
  });

  it('shows the empty state and opens the upload sheet on the action', () => {
    mockDocsState = { data: [], isLoading: false, isError: false, refetch: jest.fn() };
    const { getByTestId, getByText } = renderSection();
    expect(getByTestId('documents-empty')).toBeTruthy();
    fireEvent.press(getByText('Add a document'));
    expect(mockOpenSheet).toHaveBeenCalled();
  });
});
