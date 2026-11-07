import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

import { ThemedDialog, type ConfirmOptions } from './ThemedDialog';

interface DialogApi {
  /** Ask a yes/no question in the app's style. Resolves true if confirmed. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogApi | null>(null);

/** Hosts the single themed dialog for the app; mount once at the root. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const settle = useCallback((ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOptions(null);
  }, []);

  const confirm = useCallback((next: ConfirmOptions) => {
    // A new question supersedes one still open: the old one counts as cancelled.
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  return (
    <DialogContext.Provider value={{ confirm }}>
      {children}
      <ThemedDialog
        visible={options !== null}
        title={options?.title ?? ''}
        {...(options ?? {})}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) throw new Error('useDialog must be used inside <DialogProvider>');
  return api;
}
