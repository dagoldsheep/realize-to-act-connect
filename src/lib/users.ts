// Reads the "users/{uid}" profile documents written by src/Auth.tsx on
// signup, so the rest of the app can resolve a Firebase Auth uid to the
// org profile (name, contact, availability, etc.) it needs to display and
// to key requests/chats by.

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { User, UserType } from '../types';

export async function getUserProfile(uid: string): Promise<Partial<User> & { userType?: UserType }> {
  const snapshot = await getDoc(doc(db, 'users', uid));
  if (!snapshot.exists()) return {};
  const data = snapshot.data();
  return {
    id: uid,
    name: data.orgName ?? data.contactName ?? 'Your Organization',
    type: data.userType,
    email: data.email,
    contactName: data.contactName,
    avatar: data.avatar,
    location: data.location,
    availability: data.availability,
    dropOffLocation: data.dropOffLocation,
    needDropOffAssistance: data.needDropOffAssistance,
    profileAnswers: data.profileAnswers,
    setupCompletedAt: data.setupCompletedAt,
    setupSkippedAt: data.setupSkippedAt,
  };
}
