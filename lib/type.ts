import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  displayName: string;
  email: string;
  photoURL: string | null;
  fcmTokens?: string[];
  lastLogin?: Timestamp;
}

export interface Room {
  id: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt?: Timestamp;
}

export interface Attachment {
  url: string;
  name: string;
  type: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  createdAt?: Timestamp;
  readBy: string[];
  attachment?: Attachment;
}