'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function google() {
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/');
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <main className="max-w-sm mx-auto mt-20 p-6 border rounded-lg space-y-3">
      <h1 className="text-2xl font-bold">{mode === 'login' ? 'Log in' : 'Sign up'}</h1>

      <form onSubmit={submit} className="space-y-3">
        {mode === 'signup' && (
          <input
            className="w-full border p-2 rounded"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        )}
        <input
          className="w-full border p-2 rounded"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border p-2 rounded"
          type="password"
          placeholder="Password (6+ chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <button className="w-full bg-blue-600 text-white p-2 rounded">
          {mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      <button onClick={google} className="w-full border p-2 rounded">
        Continue with Google
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        className="text-sm underline"
        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
      >
        {mode === 'login' ? 'Need an account? Sign up' : 'Have an account? Log in'}
      </button>
    </main>
  );
}