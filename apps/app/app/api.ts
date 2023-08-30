import { QueryClient } from '@tanstack/react-query';
import { tsRestFetchApi } from '@ts-rest/core';
import { create } from 'zustand/esm';
import { createJSONStorage, persist } from 'zustand/esm/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initQueryClient } from '@ts-rest/react-query';
import { contract, User, UserSessionId } from '@trail-mate/api-types';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import * as SecureStorage from 'expo-secure-store';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      cacheTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
});

type UserStoreState = {
  auth:
    | {
        status: 'unauthenticated' | 'verifying';
      }
    | {
        status: 'authenticated';
        user: User;
        accessToken: string;
        refreshToken: string;
        refreshTokenId: UserSessionId;
      };
  updateAuth: (state: UserStoreState['auth']) => void;
};

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      auth: {
        status: 'unauthenticated',
      },
      updateAuth: async (state: UserStoreState['auth']) => {
        set({ auth: state });
      },
    }),
    {
      name: 'user-storage',
      storage: {
        getItem: async (name) => {
          const value = await SecureStorage.getItemAsync(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name, value) => {
          await SecureStorage.setItemAsync(name, JSON.stringify(value));
        },
        removeItem: async (name) => {
          await SecureStorage.deleteItemAsync(name);
        },
      },
    }
  )
);

export const api = initQueryClient(contract, {
  baseUrl: 'http://10.0.0.186:3000',
  baseHeaders: {
    authorization: '',
  },
  api: async (args) => {
    const initialAuthState = useUserStore.getState().auth;

    const authorization =
      args.headers.authorization && args.headers.authorization.length > 0
        ? args.headers.authorization
        : initialAuthState.status === 'authenticated'
        ? `Bearer ${initialAuthState.accessToken}`
        : '';

    return await tsRestFetchApi({
      ...args,
      headers: {
        ...args.headers,
        authorization,
      },
    });
  },
});
