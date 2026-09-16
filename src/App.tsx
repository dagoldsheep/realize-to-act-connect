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
import { User, UserType, ConnectionRequest, Chat, Document, Connection } from './types';
import { MOCK_USER, MOCK_DOCUMENTS as INITIAL_DOCUMENTS } from './mockData';
import { auth } from './lib/firebase';
import { getUserProfile } from './lib/users';
import { subscribeToRequests } from './lib/requests';
import { subscribeToChats } from './lib/chats';
import { subscribeToConnections } from './lib/connections';

// Builds the in-app User object for a signed-in Firebase uid, layering the
// Firestore "users/{uid}" profile (org name, availability, etc.) on top of
// sane defaults so the UI has something to render even for a brand-new,
// mostly-empty profile.
async function loadUser(uid: string, fallbackType: UserType): Promise<User> {
  const profile = await getUserProfile(uid);
  return {
    ...MOCK_USER,
    ...profile,
    id: uid,
    type: profile.type ?? fallbackType,
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
        />
      )}
      {activeTab === 'requests' && (
        <Requests 
          connections={connections} 
          setConnections={setConnections} 
          user={user}
          partnerConnections={partnerConnections}
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
