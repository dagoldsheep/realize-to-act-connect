// Firestore-backed storage for the acknowledgement letters behind the
// "Documents Awaiting Signature" screen (src/Documents.tsx).
//
// A letter is created when a resource request is approved: the organization
// receiving the items signs it to confirm they arrived.
//
// Firestore schema — collection "documents":
//   participantUids:  [uidA, uidB]     both organizations, for querying
//   fromUid/fromName: string           organization providing the items
//   toUid/toName:     string           organization receiving them (the signer)
//   title:            string
//   itemDescription:  string           e.g. "approved 200 Biology Textbooks"
//   requestId:        string | null    the approved request this came from
//   status:           'pending' | 'signed' | 'rejected'
//   dueAt:            number           ms timestamp the signature is due by
//   signedAt:         Timestamp | null
//   signedBy:         string | null    name of the person who signed
//   rejectedReason:   string | null
//   rejectedDetails:  string | null
//   createdAt:        Timestamp (serverTimestamp)
//   updatedAt:        Timestamp (serverTimestamp)

import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Document } from '../types';

const DOCUMENTS_COLLECTION = 'documents';

/** How long an organization has to sign an acknowledgement letter. */
const SIGNATURE_WINDOW_DAYS = 7;

export interface NewAcknowledgementInput {
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  itemDescription: string;
  requestId?: string;
}

/** "Due tomorrow" / "Due in 5 days" / "Overdue", from a due timestamp. */
function dueLabel(dueAt: number): string {
  const days = Math.ceil((dueAt - Date.now()) / 86400000);
  if (days < 0) return 'Overdue';
  if (days <= 1) return 'Due tomorrow';
  return `Due in ${days} days`;
}

function timeAgoLabel(createdAtMs: number): string {
  const minutes = Math.floor((Date.now() - createdAtMs) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function toDocument(id: string, data: DocumentData): Document {
  const createdAtMs: number = data.createdAt?.toMillis?.() ?? Date.now();
  const signedAtMs: number | undefined = data.signedAt?.toMillis?.();
  return {
    id,
    title: data.title,
    fromUid: data.fromUid,
    fromName: data.fromName,
    toUid: data.toUid,
    toName: data.toName,
    status: data.status,
    dueDate: dueLabel(data.dueAt ?? createdAtMs),
    signedDate: signedAtMs ? new Date(signedAtMs).toLocaleDateString('en-GB').replace(/\//g, '-') : undefined,
    timeAgo: timeAgoLabel(createdAtMs),
    itemDescription: data.itemDescription,
    requestId: data.requestId ?? undefined,
    timestamp: createdAtMs,
  };
}

/** Subscribes to every acknowledgement letter the uid is part of, newest first. */
export function subscribeToDocuments(uid: string, onChange: (documents: Document[]) => void): Unsubscribe {
  const documentsQuery = query(collection(db, DOCUMENTS_COLLECTION), where('participantUids', 'array-contains', uid));
  return onSnapshot(
    documentsQuery,
    (snapshot) => {
      onChange(
        snapshot.docs
          .map((docSnap) => toDocument(docSnap.id, docSnap.data()))
          .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
      );
    },
    // e.g. permission-denied if the documents rules haven't been deployed yet.
    (err) => {
      console.error('Could not load documents', err);
      onChange([]);
    }
  );
}

/** Creates the acknowledgement letter for a newly approved request. */
export async function createAcknowledgement(input: NewAcknowledgementInput): Promise<string> {
  const ref = await addDoc(collection(db, DOCUMENTS_COLLECTION), {
    participantUids: [input.fromUid, input.toUid].sort(),
    fromUid: input.fromUid,
    fromName: input.fromName,
    toUid: input.toUid,
    toName: input.toName,
    title: `Letter of Acknowledgement - ${input.fromName}`,
    itemDescription: input.itemDescription,
    requestId: input.requestId ?? null,
    status: 'pending',
    dueAt: Date.now() + SIGNATURE_WINDOW_DAYS * 86400000,
    signedAt: null,
    signedBy: null,
    rejectedReason: null,
    rejectedDetails: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Marks a letter signed (only the receiving organization may, per firestore.rules). */
export async function signDocument(documentId: string, signedBy: string): Promise<void> {
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, documentId), {
    status: 'signed',
    signedBy,
    signedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Rejects a letter instead of signing it, keeping the reason for both sides. */
export async function rejectDocument(documentId: string, reason: string, details: string): Promise<void> {
  await updateDoc(doc(db, DOCUMENTS_COLLECTION, documentId), {
    status: 'rejected',
    rejectedReason: reason || null,
    rejectedDetails: details || null,
    updatedAt: serverTimestamp(),
  });
}
