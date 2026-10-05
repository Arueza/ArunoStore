"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type Panels = {
  /** Id of the one open panel, or null when all are shut. */
  open: string | null;
  /** Opens this panel, or closes it if it is already the open one. */
  toggle: (id: string) => void;
  /** Shuts whichever panel is open. */
  close: () => void;
};

const PanelContext = createContext<Panels>({
  open: null,
  toggle: () => {},
  close: () => {},
});

/**
 * Keeps the header's panels to one at a time.
 *
 * The search field, the cart and the account menu each own their own open state,
 * which is smaller than threading one boolean set through every component — but
 * on its own it lets a visitor open the cart and the search field at the same
 * time, stacking two dimmed backdrops. One open panel is what Cottonink does, so
 * this is where that gets decided, in one place, without any panel knowing about
 * any other.
 *
 * A panel that needs to know whether *it* is the open one reads `open === id`.
 */
export function PanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setOpen((current) => (current === id ? null : id));
  }, []);

  const close = useCallback(() => setOpen(null), []);

  const value = useMemo(() => ({ open, toggle, close }), [open, toggle, close]);

  return (
    <PanelContext.Provider value={value}>{children}</PanelContext.Provider>
  );
}

export const usePanels = () => useContext(PanelContext);