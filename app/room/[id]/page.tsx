"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type Room = { name: string; members: string[]; createdBy: string };
type Msg = {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  readBy: string[];
  createdAt?: { toDate: () => Date };
};
type RoomState = "loading" | "ready" | "notmember" | "missing";

function RoomContent() {
  const params = useParams<{ roomId?: string; id?: string }>();
  const roomId = (params.roomId ?? params.id ?? "") as string;
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [state, setState] = useState<RoomState>("loading");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [names, setNames] = useState<Record<string, string>>({});
  const [showPeople, setShowPeople] = useState(false);
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. Who is logged in?
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/login");
      else setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, [router]);

  // 2. Watch the room document (name, members)
  useEffect(() => {
    if (!user || !roomId) return;
    const unsub = onSnapshot(
      doc(db, "rooms", roomId),
      (snap) => {
        if (!snap.exists()) {
          setState("missing");
          return;
        }
        const data = snap.data() as Room;
        setRoom(data);
        setState(data.members.includes(user.uid) ? "ready" : "notmember");
      },
      (err) => {
        console.error("Room error:", err);
        setState("missing");
      }
    );
    return () => unsub();
  }, [user, roomId]);

  // 3. Watch messages (only once we are a member)
  useEffect(() => {
    if (state !== "ready") return;
    const q = query(
      collection(db, `rooms/${roomId}/messages`),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setMsgs(
          snap.docs.map((d) => ({
            id: d.id,
            ...d.data({ serverTimestamps: "estimate" }),
          })) as Msg[]
        );
      },
      (err) => console.error("Messages error:", err)
    );
    return () => unsub();
  }, [state, roomId]);

  // 4. Look up member names for the "People" panel
  const memberKey = room?.members.join(",") ?? "";
  useEffect(() => {
    if (!room) return;
    let cancelled = false;
    (async () => {
      const result: Record<string, string> = {};
      await Promise.all(
        room.members.map(async (uid) => {
          try {
            const s = await getDoc(doc(db, "users", uid));
            const d = s.data();
            result[uid] = d?.displayName || d?.email || uid.slice(0, 6);
          } catch {
            result[uid] = uid.slice(0, 6);
          }
        })
      );
      if (!cancelled) setNames(result);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberKey]);

  // 5. Auto-scroll and mark messages as read
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (!user || state !== "ready") return;
    msgs.forEach((m) => {
      if (!m.readBy?.includes(user.uid)) {
        updateDoc(doc(db, `rooms/${roomId}/messages/${m.id}`), {
          readBy: arrayUnion(user.uid),
        }).catch(() => {});
      }
    });
  }, [msgs, user, state, roomId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || !user) return;
    setText("");
    try {
      await addDoc(collection(db, `rooms/${roomId}/messages`), {
        text: t,
        senderId: user.uid,
        senderName: user.displayName || user.email?.split("@")[0] || "Someone",
        createdAt: serverTimestamp(),
        readBy: [user.uid],
      });
    } catch (err) {
      console.error(err);
      setNotice("Message failed to send.");
    }
  }

  async function joinThisRoom() {
    if (!user) return;
    try {
      await updateDoc(doc(db, "rooms", roomId), {
        members: arrayUnion(user.uid),
      });
    } catch (err) {
      console.error(err);
      setNotice("Could not join this room.");
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied!`);
    } catch {
      setNotice(`Copy failed. ${label}: ${value}`);
    }
  }

  // ---------- Screens ----------
  if (authLoading || state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-lg">Loading...</p>
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 p-6">
        <p className="text-gray-700 text-lg">This room doesn&apos;t exist or can&apos;t be opened.</p>
        <button onClick={() => router.push("/")} className="bg-indigo-600 text-white px-5 py-2 rounded-xl">
          Back to rooms
        </button>
      </div>
    );
  }

  if (state === "notmember") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 p-6">
        <h1 className="text-2xl font-bold text-gray-800">{room?.name}</h1>
        <p className="text-gray-600">Join this room to start chatting.</p>
        <button onClick={joinThisRoom} className="bg-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-700">
          Join room
        </button>
        {notice && <p className="text-red-600 text-sm">{notice}</p>}
        <button onClick={() => router.push("/")} className="text-sm underline text-gray-500">
          Not now
        </button>
      </div>
    );
  }

  const memberCount = room?.members.length ?? 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-2xl mx-auto h-screen flex flex-col p-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-2xl shadow px-4 py-3 mb-3 border border-indigo-100">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push("/")} className="text-indigo-600 font-semibold">
              ←
            </button>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-800 truncate">{room?.name}</h1>
              <p className="text-xs text-gray-500">
                {memberCount} member{memberCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPeople((v) => !v)}
            className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700"
          >
            {showPeople ? "Close" : "Room ID & members"}
          </button>
        </div>

        {/* Room ID bar (always visible) */}
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-2 mb-3">
          <span className="text-xs font-semibold text-indigo-700 shrink-0">Room ID:</span>
          <code className="flex-1 text-sm text-gray-800 break-all select-all">{roomId}</code>
          <button
            onClick={() => copy(roomId, "Room ID")}
            className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700 shrink-0"
          >
            Copy
          </button>
        </div>

        {/* Room ID + members panel */}
        {showPeople && (
          <div className="bg-white rounded-2xl shadow p-4 mb-3 border border-indigo-100 space-y-4">
            <div>
              <h2 className="font-semibold text-gray-800 mb-2">Room ID</h2>
              <p className="text-xs text-gray-500 mb-2">
                Share this ID. Anyone who pastes it under &quot;Join Room with ID&quot; can chat here.
              </p>
              <div className="flex gap-2 items-center">
                <code className="flex-1 bg-gray-100 text-gray-800 text-sm px-3 py-2 rounded-xl break-all">
                  {roomId}
                </code>
                <button
                  onClick={() => copy(roomId, "Room ID")}
                  className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-indigo-700"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-gray-800 mb-2">Members</h2>
              <ul className="space-y-1">
                {room?.members.map((uid) => (
                  <li key={uid} className="text-sm text-gray-700">
                    • {names[uid] ?? "..."}
                    {uid === user?.uid && " (you)"}
                    {uid === room.createdBy && " · creator"}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {notice && (
          <div className="mb-3 px-4 py-2 bg-indigo-100 text-indigo-800 rounded-xl text-sm text-center">
            {notice}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl shadow border border-indigo-100 p-4 space-y-2">
          {msgs.length === 0 && (
            <p className="text-center text-gray-400 mt-10">No messages yet. Say hello!</p>
          )}
          {msgs.map((m) => {
            const mine = m.senderId === user?.uid;
            const seenByOthers = (m.readBy?.length ?? 0) > 1;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                    mine ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {!mine && <div className="text-xs font-semibold text-indigo-700">{m.senderName}</div>}
                  <div className="break-words">{m.text}</div>
                  <div className="text-[10px] opacity-70 text-right mt-0.5">
                    {m.createdAt?.toDate?.().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {mine && (seenByOthers ? " ✓✓" : " ✓")}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={send} className="flex gap-2 mt-3">
          <input
            className="flex-1 border border-gray-300 bg-white p-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="bg-indigo-600 text-white px-6 rounded-xl font-semibold hover:bg-indigo-700">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <p className="text-gray-600 text-lg">Loading...</p>
        </div>
      }
    >
      <RoomContent />
    </Suspense>
  );
}