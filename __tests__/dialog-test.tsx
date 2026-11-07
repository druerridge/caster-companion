import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DialogProvider, useDialog } from '@/components/dialog/DialogProvider';

let api: ReturnType<typeof useDialog>;
function Probe() {
  api = useDialog();
  return <Text>probe</Text>;
}

const renderProvider = () =>
  render(
    <DialogProvider>
      <Probe />
    </DialogProvider>,
  );

describe('themed confirm dialog', () => {
  it('resolves true on confirm and closes', async () => {
    await renderProvider();
    let answer: Promise<boolean> | undefined;
    await act(async () => {
      answer = api.confirm({ title: 'Sure?', message: 'Really', confirmLabel: 'Yes' });
    });
    expect(screen.getByText('Really')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Yes'));
    await expect(answer).resolves.toBe(true);
    expect(screen.queryByText('Really')).toBeNull();
  });

  it('cancels an open question when a new one is asked', async () => {
    await renderProvider();
    let first: Promise<boolean> | undefined;
    await act(async () => {
      first = api.confirm({ title: 'First?' });
    });
    await act(async () => {
      void api.confirm({ title: 'Second?' });
    });
    await expect(first).resolves.toBe(false);
    expect(screen.getByText('Second?')).toBeTruthy();
  });

  it('throws a clear error outside the provider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(render(<Probe />)).rejects.toThrow(/DialogProvider/);
  });
});
