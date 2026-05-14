import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSegments } from 'expo-router';
import { bootstrapService, type AdminBootstrapData, type PublicBootstrapData } from '@/services/bootstrap.services';
import { useAuth } from './AuthContext';

type PublicBootstrapState = PublicBootstrapData & {
  updatedAt?: string;
};

type AdminBootstrapState = AdminBootstrapData & {
  updatedAt?: string;
};

type AppBootstrapContextValue = {
  publicData: PublicBootstrapState;
  adminData: AdminBootstrapState;
  publicLoading: boolean;
  adminLoading: boolean;
  refreshPublicData: () => Promise<void>;
  refreshAdminData: () => Promise<void>;
  primePublicData: (mode?: 'full' | 'shell') => Promise<void>;
};

const emptyPublicData: PublicBootstrapState = {
  categories: [],
  items: [],
  promos: [],
  banner: null,
};

const emptyAdminData: AdminBootstrapState = {
  categories: [],
  items: [],
  promos: [],
  banner: null,
};

const AppBootstrapContext = createContext<AppBootstrapContextValue>({
  publicData: emptyPublicData,
  adminData: emptyAdminData,
  publicLoading: true,
  adminLoading: false,
  refreshPublicData: async () => {},
  refreshAdminData: async () => {},
  primePublicData: async () => {},
});

export function AppBootstrapProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const segments = useSegments();
  const [publicData, setPublicData] = useState<PublicBootstrapState>(emptyPublicData);
  const [adminData, setAdminData] = useState<AdminBootstrapState>(emptyAdminData);
  const [publicLoading, setPublicLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const hasHydratedPublicCache = useRef(false);
  const hasHydratedAdminCache = useRef(false);
  const publicRequestId = useRef(0);
  const adminRequestId = useRef(0);
  const publicRefreshInFlight = useRef<Promise<void> | null>(null);
  const adminRefreshInFlight = useRef<Promise<void> | null>(null);
  const isAuthRoute = segments[0] === '(auth)';
  const isAdminRoute = segments[0] === '(admin)';

  const hydratePublicCache = async () => {
    if (hasHydratedPublicCache.current) {
      return;
    }

    hasHydratedPublicCache.current = true;
    const cached = await bootstrapService.readPublicCache();
    if (cached) {
      setPublicData({
        ...cached.data,
        updatedAt: cached.updatedAt,
      });
    }
  };

  const hydrateAdminCache = async () => {
    if (hasHydratedAdminCache.current) {
      return;
    }

    hasHydratedAdminCache.current = true;
    const cached = await bootstrapService.readAdminCache();
    if (cached) {
      setAdminData({
        ...cached.data,
        updatedAt: cached.updatedAt,
      });
    }
  };

  const refreshPublicData = async () => {
    if (publicRefreshInFlight.current) {
      return publicRefreshInFlight.current;
    }

    const requestId = ++publicRequestId.current;
    setPublicLoading(true);

    publicRefreshInFlight.current = (async () => {
      try {
        const refreshed = await bootstrapService.refreshPublicData();
        if (requestId !== publicRequestId.current) {
          return;
        }

        setPublicData({
          ...refreshed.data,
          updatedAt: refreshed.updatedAt,
        });
      } catch (error) {
        console.log('Public bootstrap failed:', error);
      } finally {
        if (requestId === publicRequestId.current) {
          setPublicLoading(false);
        }

        publicRefreshInFlight.current = null;
      }
    })();

    return publicRefreshInFlight.current;
  };

  const primePublicData = async (mode: 'full' | 'shell' = 'full') => {
    const requestId = ++publicRequestId.current;
    await hydratePublicCache();

    try {
      const refreshed =
        mode === 'shell'
          ? await bootstrapService.refreshPublicShellData()
          : await bootstrapService.refreshPublicData();

      if (requestId !== publicRequestId.current) {
        return;
      }

      setPublicData({
        ...refreshed.data,
        updatedAt: refreshed.updatedAt,
      });
    } catch (error) {
      console.log(`Public bootstrap prime failed (${mode}):`, error);
    }
  };

  const refreshAdminData = async () => {
    if (adminRefreshInFlight.current) {
      return adminRefreshInFlight.current;
    }

    const requestId = ++adminRequestId.current;
    setAdminLoading(true);

    adminRefreshInFlight.current = (async () => {
      try {
        const refreshed = await bootstrapService.refreshAdminData();
        if (requestId !== adminRequestId.current) {
          return;
        }

        setAdminData({
          ...refreshed.data,
          updatedAt: refreshed.updatedAt,
        });
      } catch (error) {
        console.log('Admin bootstrap failed:', error);
      } finally {
        if (requestId === adminRequestId.current) {
          setAdminLoading(false);
        }

        adminRefreshInFlight.current = null;
      }
    })();

    return adminRefreshInFlight.current;
  };

  useEffect(() => {
    if (isAuthRoute || isAdminRoute) {
      setPublicLoading(false);
      return;
    }

    const bootstrap = async () => {
      try {
        await hydratePublicCache();
        await refreshPublicData();
      } catch (error) {
        console.log('Initial public bootstrap failed:', error);
        setPublicLoading(false);
      }
    };

    bootstrap();
  }, [isAuthRoute, isAdminRoute]);

  useEffect(() => {
    if (isAuthRoute || user?.role !== 'admin') {
      setAdminLoading(false);
      return;
    }

    const bootstrapAdmin = async () => {
      try {
        await hydrateAdminCache();
        await refreshAdminData();
      } catch (error) {
        console.log('Initial admin bootstrap failed:', error);
        setAdminLoading(false);
      }
    };

    bootstrapAdmin();
  }, [isAuthRoute, user?.role]);

  return (
    <AppBootstrapContext.Provider
      value={{
        publicData,
        adminData,
        publicLoading,
        adminLoading,
        refreshPublicData,
        refreshAdminData,
        primePublicData,
      }}
    >
      {children}
    </AppBootstrapContext.Provider>
  );
}

export const useAppBootstrap = () => useContext(AppBootstrapContext);
