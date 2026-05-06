import { createContext, useContext, useEffect, useRef, useState } from 'react';
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
});

export function AppBootstrapProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [publicData, setPublicData] = useState<PublicBootstrapState>(emptyPublicData);
  const [adminData, setAdminData] = useState<AdminBootstrapState>(emptyAdminData);
  const [publicLoading, setPublicLoading] = useState(true);
  const [adminLoading, setAdminLoading] = useState(false);
  const hasHydratedPublicCache = useRef(false);
  const hasHydratedAdminCache = useRef(false);

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
    setPublicLoading(true);
    try {
      const refreshed = await bootstrapService.refreshPublicData();
      setPublicData({
        ...refreshed.data,
        updatedAt: refreshed.updatedAt,
      });
    } finally {
      setPublicLoading(false);
    }
  };

  const refreshAdminData = async () => {
    setAdminLoading(true);
    try {
      const refreshed = await bootstrapService.refreshAdminData();
      setAdminData({
        ...refreshed.data,
        updatedAt: refreshed.updatedAt,
      });
    } finally {
      setAdminLoading(false);
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      await hydratePublicCache();
      await refreshPublicData();
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setAdminLoading(false);
      return;
    }

    const bootstrapAdmin = async () => {
      await hydrateAdminCache();
      await refreshAdminData();
    };

    bootstrapAdmin();
  }, [user?.role]);

  return (
    <AppBootstrapContext.Provider
      value={{
        publicData,
        adminData,
        publicLoading,
        adminLoading,
        refreshPublicData,
        refreshAdminData,
      }}
    >
      {children}
    </AppBootstrapContext.Provider>
  );
}

export const useAppBootstrap = () => useContext(AppBootstrapContext);
