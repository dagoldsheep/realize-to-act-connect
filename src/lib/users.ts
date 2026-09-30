// Reads the "users/{uid}" profile documents written by src/Auth.tsx on
// signup, so the rest of the app can resolve a Firebase Auth uid to the
// org profile (name, contact, availability, etc.) it needs to display and
// to key requests/chats by.

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AvailabilitySlot, User, UserType } from '../types';

/** Empty weekday grid used until an organization picks its own drop-off times. */
export const DEFAULT_AVAILABILITY: AvailabilitySlot[] = [
  { day: 'MON', slots: [] },
  { day: 'TUES', slots: [] },
  { day: 'WED', slots: [] },
  { day: 'THURS', slots: [] },
  { day: 'FRI', slots: [] },
];

export async function getUserProfile(uid: string): Promise<Partial<User> & { userType?: UserType }> {
  try {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) return {};
    const data = snapshot.data();
    return {
      id: uid,
      name: data.orgName ?? data.contactName ?? 'Your Organization',
      type: data.userType,
      email: data.email,
      contactName: data.contactName,
      contactRole: data.contactRole,
      phone: data.phone,
      about: data.about,
      state: data.state,
      avatar: data.avatar,
      location: data.location,
      availability: data.availability,
      dropOffLocation: data.dropOffLocation,
      dropOffDetails: data.dropOffDetails,
      needDropOffAssistance: data.needDropOffAssistance,
      teamEmails: data.teamEmails,
      allowAvailabilityView: data.allowAvailabilityView,
      profileAnswers: data.profileAnswers,
      setupCompletedAt: data.setupCompletedAt,
      setupSkippedAt: data.setupSkippedAt,
    };
  } catch (err) {
    console.warn('Could not load user profile from Firestore:', err);
    return {};
  }
}
