import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Auth from './Auth';
import Layout from './Layout';
import Dashboard from './Dashboard';
import Requests from './Requests';
import Documents from './Documents';
import Messages from './Messages';
import Profile from './Profile';
import Search from './Search';
import PartnerAbout, { PartnerSummary } from './PartnerAbout';
import ProfileSetup from './ProfileSetup';
import { User, UserType, ConnectionRequest, Chat, Document, Connection } from './types';
import { MOCK_DOCUMENTS as INITIAL_DOCUMENTS } from './mockData';
import { auth } from './lib/firebase';
import { DEFAULT_AVAILABILITY, getUserProfile } from './lib/users';
import { subscribeToRequests } from './lib/requests';
import { subscribeToChats } from './lib/chats';
import { subscribeToConnections } from './lib/connections';

/** Drops keys whose value is undefined so they don't blank out earlier defaults when spread. */
function definedOnly<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Partial<T>;
}

// Builds the in-app User object for a signed-in Firebase uid from their own
// Firestore "users/{uid}" profile (plus locally cached setup state). Missing
// fields stay empty — the UI shows placeholders for them — so no one is ever
// shown another organization's details as if they were their own. The sample
// MOCK_USER data is used only by the demo logins on the sign-in screen.
async function loadUser(uid: string, fallbackType: UserType): Promise<User> {
  const profile = await getUserProfile(uid);
  const localCompleted = typeof window !== 'undefined' ? localStorage.getItem(`setupCompleted_${uid}`) : null;
  const localSkipped = typeof window !== 'undefined' ? localStorage.getItem(`setupSkipped_${uid}`) : null;
  const localAnswers = typeof window !== 'undefined' ? localStorage.getItem(`profileAnswers_${uid}`) : null;
  const localLocation = typeof window !== 'undefined' ? localStorage.getItem(`location_${uid}`) : null;

  let parsedAnswers = profile.profileAnswers;
  if (!parsedAnswers && localAnswers) {
    try {
      parsedAnswers = JSON.parse(localAnswers);
    } catch (e) {}
  }

  const effectiveType = profile.type ?? fallbackType;
  const isDemo = uid.startsWith('demo-') || uid === 'user-1';
  const demoName = effectiveType === 'community-partner' ? 'Hope Feeling Foundation' : MOCK_USER.name;

  return {
    // Demo logins intentionally show a sample organization; real accounts
    // only ever show their own data, with placeholders where it's missing.
    ...(isDemo ? MOCK_USER : {}),
    ...definedOnly(profile),
    id: uid,
    name: profile.name || (isDemo ? demoName : 'Your Organization'),
    email: profile.email || (isDemo ? MOCK_USER.email : ''),
    type: effectiveType,
    availability: profile.availability ?? (isDemo ? MOCK_USER.availability : DEFAULT_AVAILABILITY),
    location: profile.location || localLocation || (isDemo ? MOCK_USER.location : undefined),
    setupCompletedAt: profile.setupCompletedAt || localCompleted || undefined,
    setupSkippedAt: profile.setupSkippedAt || localSkipped || undefined,
    profileAnswers: parsedAnswers,
  };
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [actionsNeededRead, setActionsNeededRead] = useState(false);
  const [connections, setConnections] = useState<ConnectionRequest[]>([]);
  const [documents, setDocuments] = useState(INITIAL_DOCUMENTS);
  const [chats, setChats] = useState<Chat[]>([]);
  // Organization-to-organization connections; `connections` above holds resource requests.
  const [partnerConnections, setPartnerConnections] = useState<Connection[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState<{ text: string; isSuggestedTime?: boolean; suggestedTimes?: string[]; meetingNote?: string } | null>(null);
  const [lastActionTime, setLastActionTime] = useState<string>('');
  const [viewingPartner, setViewingPartner] = useState<PartnerSummary | null>(null);
  const [tabBeforePartner, setTabBeforePartner] = useState('dashboard');

  const updateLastAction = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    setLastActionTime(`Today at ${displayHours}:${displayMinutes} ${ampm}`);
  };

  // Restore the session on refresh: Firebase Auth persists the sign-in
  // client-side, so if there's still a valid uid we just re-load its profile
  // instead of bouncing back to the login screen.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const loadedUser = await loadUser(firebaseUser.uid, 'community-partner');
        setUser(loadedUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  // Once we know who's signed in, subscribe to their requests and chats so
  // "sent"/"received" messages and requests are read live from Firestore
  // instead of the static mock arrays.
  useEffect(() => {
    if (!user) {
      setConnections([]);
      setChats([]);
      setPartnerConnections([]);
      return;
    }
    const unsubscribeRequests = subscribeToRequests(user.id, setConnections);
    const unsubscribeChats = subscribeToChats(user.id, setChats);
    const unsubscribeConnections = subscribeToConnections(user.id, setPartnerConnections);
    return () => {
      unsubscribeRequests();
      unsubscribeChats();
      unsubscribeConnections();
    };
  }, [user?.id]);

  const handleLogin = async (type: UserType, uid: string) => {
    const loadedUser = await loadUser(uid, type);
    setUser(loadedUser);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
    setActiveTab('dashboard');
    setSelectedChatId(null);
  };

  const navigateToChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setActiveTab('messages');
  };

  // Opens a school/community partner's About page, remembering where the
  // user came from so "Back" returns there.
  const viewPartner = (partner: PartnerSummary) => {
    if (activeTab !== 'about') setTabBeforePartner(activeTab);
    setViewingPartner(partner);
    setActiveTab('about');
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.1,
              }}
              className="w-4 h-4 rounded-full bg-brand-primary"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // Prompt for About page details once, right after signup (or on the first
  // login after this step was added). Skipping is remembered too.
  if (!user.setupCompletedAt && !user.setupSkippedAt) {
    return (
      <ProfileSetup
        user={user}
        variant="onboarding"
        onDone={(updates) => setUser({ ...user, ...updates })}
      />
    );
  }

  return (
    <Layout 
      user={user} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      onLogout={handleLogout}
      actionsNeededRead={actionsNeededRead}
      setActionsNeededRead={setActionsNeededRead}
    >
      {activeTab === 'dashboard' && (
        <Dashboard 
          user={user} 
          onNavigate={setActiveTab} 
          onNavigateToChat={navigateToChat}
          actionsNeededRead={actionsNeededRead}
          setActionsNeededRead={setActionsNeededRead}
          connections={connections}
          setConnections={setConnections}
          documents={documents}
          setDocuments={setDocuments}
          lastActionTime={lastActionTime}
          updateLastAction={updateLastAction}
          setChats={setChats}
          onViewPartner={viewPartner}
          partnerConnections={partnerConnections}
        />
      )}
      {activeTab === 'requests' && (
        <Requests 
          connections={connections} 
          setConnections={setConnections} 
          user={user}
          onViewPartner={viewPartner}
          partnerConnections={partnerConnections}
        />
      )}
      {activeTab === 'about' && viewingPartner && (
        <PartnerAbout
          partner={viewingPartner}
          user={user}
          connections={connections}
          onBack={() => setActiveTab(tabBeforePartner)}
        />
      )}
      {activeTab === 'messages' && (
        <Messages 
          selectedChatId={selectedChatId} 
          setSelectedChatId={setSelectedChatId} 
          draftMessage={draftMessage}
          setDraftMessage={setDraftMessage}
          connections={connections}
          setConnections={setConnections}
          user={user}
          setDocuments={setDocuments}
          chats={chats}
          setChats={setChats}
        />
      )}
      {activeTab === 'documents' && (
        <Documents 
          documents={documents}
          setDocuments={setDocuments}
          updateLastAction={updateLastAction}
        />
      )}
      {activeTab === 'search' && (
        <Search 
          connections={connections}
          setConnections={setConnections}
          user={user}
          partnerConnections={partnerConnections}
        />
      )}
      {activeTab === 'profile' && (
        <Profile 
          user={user} 
          onLogout={handleLogout} 
          connections={connections}
          onUpdateUser={handleUpdateUser}
        />
      )}
    </Layout>
  );
}
