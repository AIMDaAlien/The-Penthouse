import { createContext, useContext, ReactNode } from 'react';
import { useServers } from '../hooks/useServers';

// Re-export the return type from the hook (adapt as needed if we add more)
type ServerContextType = ReturnType<typeof useServers>;

const ServerContext = createContext<ServerContextType | null>(null);

export function ServerProvider({ children }: { children: ReactNode }) {
  const serverState = useServers();

  return (
    <ServerContext.Provider value={serverState}>
      {children}
    </ServerContext.Provider>
  );
}

export const useServerContext = () => {
  const context = useContext(ServerContext);
  if (!context) {
    throw new Error('useServerContext must be used within ServerProvider');
  }
  return context;
};
