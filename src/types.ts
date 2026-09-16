export type UserType = 'school' | 'community-partner';

export interface AvailabilitySlot {
  day: string;
  slots: string[];
}

export interface User {
  id: string;
  name: string;
  type: UserType;
  email: string;
  avatar?: string;
  location?: string;
  contactName?: string;
  availability?: AvailabilitySlot[];
  dropOffLocation?: string;
  needDropOffAssistance?: boolean;
  profileAnswers?: Record<string, string | string[]>;
  setupCompletedAt?: string;
  setupSkippedAt?: string;
}

export interface ConnectionRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromAvatar: string;
  type: 'received' | 'sent';
  status: 'pending' | 'approved' | 'denied';
  item: string;
  quantity: number;
  distance: string;
  timeAgo: string;
  timestamp: number; // Added for sorting
  postedAt?: string;
  availableUntil?: string;
  description?: string;
  availability?: AvailabilitySlot[];
  isNew?: boolean;
}

export interface Document {
  id: string;
  title: string;
  fromName: string;
  toName: string;
  status: 'pending' | 'signed';
  dueDate?: string;
  signedDate?: string;
  timeAgo: string;
  itemDescription: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isSuggestedTime?: boolean;
  suggestedTimes?: string[];
  confirmedTime?: string;
  meetingNote?: string;
}

export interface Chat {
  id: string;
  participantName: string;
  participantTitle: string;
  participantAvatar?: string;
  participantUid?: string; // uid of the other participant, once backed by Firestore
  lastMessage?: string;
  timeAgo: string;
  lastMessageTimestamp?: number;
  unreadCount?: number;
  messages?: Message[];
  isRecentlyApproved?: boolean;
}
