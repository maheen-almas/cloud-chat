"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";

type RoomItem = { id: string; name: string; memberCount: number };

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [roomName, setRoomName] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      else setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // Live list of rooms I belong to
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "rooms"),
      where("members", "array-contains", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name as string,
          memberCount: (d.data().members as string[])?.length ?? 1,
        }));
        setRooms(list);
      },
      (err) => {
        console.error("Error loading rooms:", err);
        setMessage("Could not load your rooms. Please refresh.");
      }
    );
    return () => unsub();
  }, [user]);

  // Create a room, then go straight into it
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !user || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const ref = await addDoc(collection(db, "rooms"), {
        name: roomName.trim(),
        members: [user.uid],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      setRoomName("");
      router.push(`/room/${ref.id}`);
    } catch (err) {
      console.error("Error creating room:", err);
      setMessage("Failed to create room. Please try again.");
      setBusy(false);
    }
  };

  // Join using a Room ID, then go into the room
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInput.trim() || !user || busy) return;
    setBusy(true);
    setMessage("");
    const id = joinInput.trim();
    try {
      await updateDoc(doc(db, "rooms", id), { members: arrayUnion(user.uid) });
      setJoinInput("");
      router.push(`/room/${id}`);
    } catch (err) {
      console.error("Error joining room:", err);
      setMessage("Could not join. Check the Room ID and try again.");
      setBusy(false);
    }
  };

  const copyRoomId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(""), 2000);
    } catch {
      setMessage(`Copy failed. Room ID: ${id}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-700">Cloud Chat</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium hidden sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-red-100 text-red-800 rounded-xl text-center font-medium">
            {message}
          </div>
        )}

        {/* Create Room */}
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 border border-indigo-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Room</h2>
          <form onSubmit={handleCreateRoom} className="flex gap-3">
            <input
              type="text"
              placeholder="Enter room name..."
              className="flex-1 border border-gray-300 p-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              Create
            </button>
          </form>
        </div>

        {/* Join Room */}
        <div className="bg-white p-6 rounded-2xl shadow-lg mb-6 border border-indigo-100">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Join Room with ID</h2>
          <p className="text-sm text-gray-500 mb-4">
            Paste the Room ID your friend shared with you.
          </p>
          <form onSubmit={handleJoinRoom} className="flex gap-3">
            <input
              type="text"
              placeholder="Paste Room ID here..."
              className="flex-1 border border-gray-300 p-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={joinInput}
              onChange={(e) => setJoinInput(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
            >
              Join
            </button>
          </form>
        </div>

        {/* Rooms List */}
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-indigo-100">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Your Rooms</h2>
          {rooms.length === 0 ? (
            <p className="text-gray-500">No rooms yet. Create or join one!</p>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl"
                >
                  <Link href={`/room/${room.id}`} className="block hover:opacity-80 transition">
                    <h3 className="font-semibold text-lg text-indigo-800">{room.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {room.memberCount} member{room.memberCount === 1 ? "" : "s"}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-gray-500 shrink-0">Room ID:</span>
                    <code className="flex-1 bg-white border border-indigo-100 text-gray-800 text-xs px-2 py-1 rounded-lg break-all">
                      {room.id}
                    </code>
                    <button
                      onClick={() => copyRoomId(room.id)}
                      className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 shrink-0"
                    >
                      {copiedId === room.id ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}