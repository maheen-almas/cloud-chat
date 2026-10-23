'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const AuthCtx = createContext<{ user: User | null; loading: boolean }>({
  user: null,
  loading: true,
});
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        // Save a public profile so other users can find this person by email
        await setDoc(
          doc(db, 'users', u.uid),
          {
            displayName: u.displayName ?? u.email?.split('@')[0],
            email: u.email?.toLowerCase(),
            photoURL: u.photoURL ?? null,
            lastLogin: serverTimestamp(),
          },
          { merge: true }
        );
      }
    });
  }, []);

  return <AuthCtx.Provider value={{ user, loading }}>{children}</AuthCtx.Provider>;
}