import React, { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';
import { attachWorkspacePersistence, detachWorkspacePersistence, useAppStore } from '@/store';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      useAppStore.getState().setCurrentView('home');
      setCheckingAuth(false);
      return;
    }

    let transition = 0;
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      const currentTransition = ++transition;
      setCheckingAuth(true);
      void (async () => {
        if (nextUser) {
          await attachWorkspacePersistence(nextUser.uid);
          useAppStore.getState().setCurrentView('home');
        } else {
          detachWorkspacePersistence();
          useAppStore.getState().setCurrentView('home');
        }
        if (currentTransition === transition) setCheckingAuth(false);
      })();
    });
    return () => {
      transition += 1;
      unsubscribe();
    };
  }, []);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-center shadow-sm">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-600" />
          <p className="text-sm font-semibold text-slate-800">Checking your session</p>
          <p className="mt-1 text-xs text-slate-500">Preparing your private data studio.</p>
        </div>
      </div>
    );
  }

  // The product opens directly into the data studio. Firebase still hydrates
  // any signed-in workspace in the background when a session is available.
  return <>{children}</>;
}

