import type { JSX } from 'react';
import { createContext, useContext, useState } from 'react';

export type ToggleState = {
  toggles: Record<string, boolean>;
  toggle: (key: string) => void;
  turnOn: (key: string) => void;
  turnOff: (key: string) => void;
  isOn: (key: string) => boolean;
};

export const ToggleContext = createContext<ToggleState | undefined>(undefined);

export function useToggle(): ToggleState {
  const context = useContext(ToggleContext);
  if (!context) {
    throw new Error('useToggle must be used within a ToggleProvider');
  }
  return context;
}

export default function ToggleStateProvider({ children }: ToggleStateProviderProps): JSX.Element {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  const turn = (key: string, on?: boolean): void => {
    setToggles((prev) => ({
      ...prev,
      [key]: on ?? !(prev[key] ?? false),
    }));
  };
  const toggle = turn;
  const turnOn = (key: string): void => {
    turn(key, true);
  };
  const turnOff = (key: string): void => {
    turn(key, false);
  };
  const isOn = (key: string): boolean => Boolean(toggles[key]);

  return (
    <ToggleContext.Provider value={{ toggles, toggle, turnOn, turnOff, isOn }}>
      {children}
    </ToggleContext.Provider>
  );
}

type ToggleStateProviderProps = {
  children: React.ReactNode;
};
