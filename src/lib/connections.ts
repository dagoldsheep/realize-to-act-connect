// Firestore-backed LinkedIn-style connections between organizations.
// Two organizations become connected either by one sending a connection
// request from the Search page and the other accepting it (Requests page), or
// automatically when a resource request between them is approved.
//
// Firestore schema — collection "connections":
//   connections/{pairId}      pairId = the two uids sorted and joined with "_"
//     participantUids: [uidA, uidB]    sorted, so it matches pairId
//     participants:    { [uid]: { name, avatar, userType } }
//     requesterUid:    string          who sent the connection request
//     recipientUid:    string          who has to accept it
//     status:          'pending' | 'accepted'
//     source:          'search' | 'request'
//     requestId:       string | null   the approved resource request, when source == 'request'
//     createdAt:       Timestamp (serverTimestamp)
//     updatedAt:       Timestamp (serverTimestamp)
//
// Declining, withdrawing, and removing a connection all delete the document.
// "Incoming" vs "outgoing" is not stored, derived per-viewer from requesterUid.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Connection, Organization, UserType } from '../types';

const CONNECTIONS_COLLECTION = 'connections';

export interface ConnectionParty {
  uid: string;
  name: string;
  avatar?: string;
  type?: UserType;
}

/** Deterministic connection id for a pair of organizations. */
export function getConnectionId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}

function toConnection(id: string, data: DocumentData, viewerUid: string): Connection {
  const partnerUid: string = data.participantUids.find((uid: string) => uid !== viewerUid);
  const partner = data.participants?.[partnerUid] ?? {};
  return {
    id,
    partnerUid,
    partnerName: partner.name ?? 'Unknown',
    partnerAvatar: partner.avatar ?? undefined,
    partnerType: partner.userType ?? undefined,
    status: data.status,
    direction: data.requesterUid === viewerUid ? 'outgoing' : 'incoming',
    source: data.source,
    timestamp: data.updatedAt?.toMillis?.() ?? Date.now(),
  };
}

function participantInfo(party: ConnectionParty) {
  return { name: party.name, avatar: party.avatar ?? null, userType: party.type ?? null };
}

/** Subscribes to every connection (pending or accepted) the uid is part of. */
export function subscribeToConnections(uid: string, onChange: (connections: Connection[]) => void): Unsubscribe {
  const connectionsQuery = query(collection(db, CONNECTIONS_COLLECTION), where('participantUids', 'array-contains', uid));
  return onSnapshot(
    connectionsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((docSnap) => toConnection(docSnap.id, docSnap.data(), uid))
          .sort((a, b) => b.timestamp - a.timestamp)
      );
    },
    // e.g. permission-denied if the connections rules haven't been deployed yet.
    (err) => {
      console.error('Could not load connections', err);
      onChange([]);
    }
  );
}

/**
 * Sends a connection request from `from` to `to`. If `to` already sent one to
 * `from`, this accepts it instead; if they're already connected it does nothing.
 */
export async function sendConnectionRequest(from: ConnectionParty, to: ConnectionParty): Promise<void> {
  const ref = doc(db, CONNECTIONS_COLLECTION, getConnectionId(from.uid, to.uid));
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data();
    if (data.status === 'pending' && data.recipientUid === from.uid) {
      await acceptConnection(ref.id);
    }
    return;
  }
  await setDoc(ref, {
    participantUids: [from.uid, to.uid].sort(),
    participants: { [from.uid]: participantInfo(from), [to.uid]: participantInfo(to) },
    requesterUid: from.uid,
    recipientUid: to.uid,
    status: 'pending',
    source: 'search',
    requestId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Accepts a pending connection request (only the recipient may, per firestore.rules). */
export async function acceptConnection(connectionId: string): Promise<void> {
  await updateDoc(doc(db, CONNECTIONS_COLLECTION, connectionId), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
}

/** Declines an incoming request, withdraws an outgoing one, or removes an existing connection. */
export async function removeConnection(connectionId: string): Promise<void> {
  await deleteDoc(doc(db, CONNECTIONS_COLLECTION, connectionId));
}

/**
 * Connects the two organizations on an approved resource request. Call after
 * the request has been marked approved — firestore.rules checks that it is.
 */
export async function connectOnApprovedRequest(approver: ConnectionParty, requester: ConnectionParty, requestId: string): Promise<void> {
  const ref = doc(db, CONNECTIONS_COLLECTION, getConnectionId(approver.uid, requester.uid));
  const existing = await getDoc(ref);
  if (existing.exists()) {
    if (existing.data().status !== 'accepted') {
      await updateDoc(ref, { status: 'accepted', source: 'request', requestId, updatedAt: serverTimestamp() });
    }
    return;
  }
  await setDoc(ref, {
    participantUids: [approver.uid, requester.uid].sort(),
    participants: { [approver.uid]: participantInfo(approver), [requester.uid]: participantInfo(requester) },
    requesterUid: requester.uid,
    recipientUid: approver.uid,
    status: 'accepted',
    source: 'request',
    requestId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Lists every registered organization except `excludeUid`, for the Search page. */
export async function listOrganizations(excludeUid: string): Promise<Organization[]> {
  const snapshot = await getDocs(collection(db, 'users'));
  return snapshot.docs
    .filter((docSnap) => docSnap.id !== excludeUid)
    .map((docSnap) => {
      const data = docSnap.data();
      return {
        uid: docSnap.id,
        name: data.orgName ?? data.contactName ?? 'Unnamed Organization',
        type: data.userType,
        avatar: data.avatar ?? undefined,
        location: data.location ?? undefined,
      };
    });
}
