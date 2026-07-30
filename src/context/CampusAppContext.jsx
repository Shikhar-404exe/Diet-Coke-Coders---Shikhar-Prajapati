import { createContext, useContext } from 'react';

const CampusAppContext = createContext(null);

export function CampusAppProvider({ value, children }) {
  return (
    <CampusAppContext.Provider value={value}>
      {children}
    </CampusAppContext.Provider>
  );
}

export function useCampusApp() {
  const ctx = useContext(CampusAppContext);
  if (!ctx) throw new Error('useCampusApp must be used within CampusAppProvider');
  return ctx;
}
