import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';

type Draft = Partial<Record<string, string>>;
const DraftContext = createContext<{ details: Draft; setDetails: Dispatch<SetStateAction<Draft>> } | null>(null);

/** In-memory only: never persists passwords or verification tokens to browser storage. */
export function RegistrationDraftProvider({ children }: { children: ReactNode }) {
  const [details, setDetails] = useState<Draft>({});
  return <DraftContext.Provider value={{ details, setDetails }}>{children}</DraftContext.Provider>;
}

export function useRegistrationDraft() {
  const draft = useContext(DraftContext);
  if (!draft) throw new Error('Registration draft provider is missing');
  return draft;
}