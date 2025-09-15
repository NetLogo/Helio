import { createContext, useContext, useState } from 'react';

export interface ToggleState {
  toggles: Record<string, boolean>;
  toggle: (key: string) => void;
  turnOn: (key: string) => void;
  turnOff: (key: string) => void;
  isOn: (key: string) => boolean;
}

export const ToggleContext = createContext<ToggleState | undefined>(undefined);

export function useToggle() {
  const context = useContext(ToggleContext);
  if (!context) {
    throw new Error('useToggle must be used within a ToggleProvider');
  }
  return context;
}

export default function ToggleStateProvider({
  children,
}: ToggleStateProviderProps) {
  const [toggles, setToggles] = useState<Record<string, boolean>>({});

  const turn = (key: string, on?: boolean) => {
    setToggles((prev) => ({
      ...prev,
      [key]: on ?? !prev[key],
    }));
  };
  const toggle = turn;
  const turnOn = (key: string) => turn(key, true);
  const turnOff = (key: string) => turn(key, false);
  const isOn = (key: string) => !!toggles[key];

  return (
    <ToggleContext.Provider value={{ toggles, toggle, turnOn, turnOff, isOn }}>
      {children}
    </ToggleContext.Provider>
  );
}

interface ToggleStateProviderProps {
  children: React.ReactNode;
}
