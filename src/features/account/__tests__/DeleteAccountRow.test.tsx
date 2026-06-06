import { fireEvent, render } from '@testing-library/react-native';

import en from '@core/i18n/locales/en.json';

const mockMutate = jest.fn();
const mockReset = jest.fn();
// `mock`-prefixed so the jest.mock factory may close over it (jest forbids non-mock identifiers).
let mockHookState = { mutate: mockMutate, reset: mockReset, isPending: false, isError: false };

jest.mock('../hooks/useDeleteAccount', () => ({
  useDeleteAccount: () => mockHookState,
}));

import { DeleteAccountRow } from '../components/DeleteAccountRow';

const ENTRY = en.account.delete.entry; // "Delete my account"
const CTA = en.account.delete.confirmCta; // "Delete forever"
const CANCEL = en.account.delete.cancel; // "Keep my account"

function openDialog() {
  const utils = render(<DeleteAccountRow />);
  fireEvent.press(utils.getByLabelText(ENTRY));
  return utils;
}

describe('DeleteAccountRow', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockReset.mockClear();
    mockHookState = { mutate: mockMutate, reset: mockReset, isPending: false, isError: false };
  });

  it('does not call delete when the magic word has not been typed', () => {
    const { getByLabelText } = openDialog();
    // CTA is present but disabled — pressing it must be a no-op.
    const cta = getByLabelText(CTA);
    expect(cta.props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(cta);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('does not enable delete for the wrong word', () => {
    const { getByLabelText } = openDialog();
    fireEvent.changeText(getByLabelText(en.account.delete.confirmLabel), 'NOPE');
    expect(getByLabelText(CTA).props.accessibilityState).toMatchObject({ disabled: true });
    fireEvent.press(getByLabelText(CTA));
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('enables and fires delete once the exact word is typed (case-insensitive)', () => {
    const { getByLabelText } = openDialog();
    fireEvent.changeText(getByLabelText(en.account.delete.confirmLabel), 'delete');
    const cta = getByLabelText(CTA);
    expect(cta.props.accessibilityState).toMatchObject({ disabled: false });
    fireEvent.press(cta);
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('shows the error message when the mutation has errored', () => {
    mockHookState = { ...mockHookState, isError: true };
    const { getByText } = openDialog();
    expect(getByText(en.account.delete.error)).toBeTruthy();
  });

  it('renders a cancel control', () => {
    const { getByLabelText } = openDialog();
    expect(getByLabelText(CANCEL)).toBeTruthy();
  });
});
