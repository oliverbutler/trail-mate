import { Slot } from 'expo-router';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { api, asyncStoragePersister, queryClient, useUserStore } from './api';

import '../global.css';
import { useCallback, useEffect } from 'react';

export default function HomeLayout() {
  const { auth, updateAuth } = useUserStore();

  /**
   * If we think we're logged in, try to verify that we are.
   */
  const syncPerceivedAuthState = useCallback(async () => {
    if (auth.status !== 'authenticated') return;

    const refresh = await api.auth.refreshToken.mutation({
      body: {
        refreshToken: auth.refreshToken,
        refreshTokenId: auth.refreshTokenId,
      },
    });

    if (refresh.status !== 200) {
      updateAuth({
        status: 'unauthenticated',
      });
      return;
    }

    const me = await api.auth.getMe.query({
      headers: { authorization: refresh.body.accessToken },
    });

    if (me.status !== 200) {
      updateAuth({
        status: 'unauthenticated',
      });
      return;
    }

    updateAuth({
      status: 'authenticated',
      accessToken: refresh.body.accessToken,
      refreshToken: refresh.body.refreshToken,
      refreshTokenId: refresh.body.refreshTokenId,
      user: me.body,
    });
  }, []);

  useEffect(() => {
    void syncPerceivedAuthState();
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <Slot />
    </PersistQueryClientProvider>
  );
}
