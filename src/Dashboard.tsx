import React from 'react';
import { 
  Search, MessageSquare, Monitor, UserPlus, 
  Check, X, FileSignature, ArrowRight,
  BookOpen, Backpack, MapPin, Calendar, Pencil, Trash2,
  Utensils, Shirt, Book, Library, Laptop, Home, Palette, Package
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import { User, ConnectionRequest, Document, Chat, Connection, Organization } from './types';
import Tag from './components/Tag';
import { respondToRequest } from './lib/requests';
import { ensureChat } from './lib/chats';
import { connectOnApprovedRequest, listOrganizations, subscribeToConnections } from './lib/connections';
import { createDocument } from './lib/documents';

interface DashboardProps {
  user: User;
  onNavigate: (tab: string) => void;
  onNavigateToChat: (chatId: string) => void;
  actionsNeededRead: boolean;
  setActionsNeededRead: (read: boolean) => void;
  connections: ConnectionRequest[];
  setConnections: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  documents: Document[];
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  lastActionTime: string;
  updateLastAction: () => void;
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
}

export default function Dashboard({ 
  user, onNavigate, onNavigateToChat,
  actionsNeededRead, setActionsNeededRead,
  connections, setConnections,
  documents, setDocuments,
  lastActionTime, updateLastAction,
  setChats
}: DashboardProps) {
  const pendingConnections = connections.filter(c => c.status === 'pending' && c.type === 'received');
  const pendingDocs = documents.filter(d => d.status === 'pending');
  const [organizations, setOrganizations] = React.useState<Organization[]>([]);
  const [partnerConnections, setPartnerConnections] = React.useState<Connection[]>([]);

  React.useEffect(() => {
    listOrganizations(user.id).then(setOrganizations).catch(() => setOrganizations([]));
    return subscribeToConnections(user.id, setPartnerConnections);
  }, [user.id]);

  // Schools are matched with community partners and vice versa, skipping the
  // organizations they're already connected to.
  const connectedUids = partnerConnections.filter(c => c.status === 'accepted').map(c => c.partnerUid);
  const suggestedMatches = organizations
    .filter(org => org.type !== user.type && !connectedUids.includes(org.uid))
    .slice(0, 4);

  const handleApprove = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (connection) {
      await respondToRequest(id, 'approved', { uid: user.id, name: user.name, avatar: user.avatar || '' });
      await ensureChat(
        user.id,
        { name: user.name, title: user.contactName || '', avatar: user.avatar },
        connection.fromId,
        { name: connection.fromName, title: '', avatar: connection.fromAvatar }
      );
      // Organizations that exchange resources are automatically connected.
      // A failure here shouldn't undo or block the approval itself.
      await connectOnApprovedRequest(
        { uid: user.id, name: user.name, avatar: user.avatar, type: user.type },
        { uid: connection.fromId, name: connection.fromName, avatar: connection.fromAvatar },
        id
      ).catch(err => console.error('Auto-connect failed', err));
      updateLastAction();

      // Add to pending signatures — the documents subscription in App.tsx
      // pushes the new letter back into `documents`.
      await createDocument({
        ownerUid: user.id,
        partnerUid: connection.fromId,
        requestId: id,
        title: `Letter of Acknowledgement - ${connection.fromName}`,
        fromName: connection.fromName,
        toName: user.name,
        dueDate: 'Due in 7 days',
        itemDescription: `approved ${connection.quantity} ${connection.item}`,
      }).catch(err => console.error('Could not create acknowledgement letter', err));
    }
  };

  const handleReject = async (id: string) => {
    await respondToRequest(id, 'denied');
    updateLastAction();
  };

  const getSupplyIcon = (item: string) => {
    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('food') || lowerItem.includes('meal')) return <Utensils size={14} className="text-brand-primary" />;
    if (lowerItem.includes('backpack')) return <Backpack size={14} className="text-brand-primary" />;
    if (lowerItem.includes('clothing') || lowerItem.includes('shirt')) return <Shirt size={14} className="text-brand-primary" />;
    if (lowerItem.includes('book') || lowerItem.includes('textbook')) return <Book size={14} className="text-brand-primary" />;
    if (lowerItem.includes('library') || lowerItem.includes('school')) return <Library size={14} className="text-brand-primary" />;
    if (lowerItem.includes('tech') || lowerItem.includes('laptop') || lowerItem.includes('computer')) return <Laptop size={14} className="text-brand-primary" />;
    if (lowerItem.includes('furniture') || lowerItem.includes('chair') || lowerItem.includes('desk')) return <Home size={14} className="text-brand-primary" />;
    if (lowerItem.includes('art') || lowerItem.includes('paint') || lowerItem.includes('supply')) return <Palette size={14} className="text-brand-primary" />;
    return <Package size={14} className="text-brand-primary" />;
  };

  const quickLinks = [
    { id: 'search', label: 'Search Connection', icon: Search, color: 'text-brand-primary' },
    { id: 'message', label: 'Message Community Partner', icon: MessageSquare, color: 'text-brand-primary' },
    { id: 'approve', label: 'Approve Transfer', icon: Monitor, color: 'text-brand-primary' },
    { id: 'invite', label: 'Invite Partner', icon: UserPlus, color: 'text-brand-primary' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark mb-2">Welcome, {user.name}!</h1>
          <p className="text-slate-500">Here is an overview of your recent activity!</p>
        </div>
        <div className="text-sm text-slate-400">
          Last updated: {lastActionTime || '--'}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Actions Needed */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
            <h2 className="text-xl font-bold text-brand-dark mb-2">Actions Needed</h2>
            <p className="text-sm text-slate-500 mb-6">View and take action on current tasks and requests.</p>
            
            {pendingConnections.length > 0 ? (
              <div 
                onClick={() => setActionsNeededRead(true)}
                className={cn(
                  "p-6 rounded-[5px] border transition-all cursor-pointer",
                  actionsNeededRead 
                    ? "border-slate-100 bg-slate-50/50" 
                    : "border-brand-primary/20 bg-brand-secondary/10"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {!actionsNeededRead && <div className="w-2 h-2 rounded-full bg-brand-primary" />}
                    <span className={cn(
                      "font-bold transition-colors",
                      actionsNeededRead ? "text-slate-400" : "text-brand-dark"
                    )}>
                      {actionsNeededRead 
                        ? "No actions needed" 
                        : `Respond to your ${pendingConnections.length} new connection requests`
                      }
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">50 mins ago</span>
                </div>
                <p className={cn(
                  "text-sm ml-4 transition-colors",
                  actionsNeededRead ? "text-slate-400" : "text-slate-600"
                )}>
                  {actionsNeededRead 
                    ? "Your dashboard is up to date." 
                    : `${pendingConnections.map(c => c.fromName).join(' and ')} have taken interest in your organization`
                  }
                </p>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center border border-dashed border-slate-200 rounded-[5px] text-slate-400 text-sm">
                There are no current actions for you to take.
              </div>
            )}
          </section>

          {/* Suggested Matches */}
          <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-serif font-bold text-brand-dark mb-1">Suggested Matches</h2>
                <p className="text-sm text-slate-500">Based on your needs and location, these partners might be a good fit.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suggestedMatches.map((match) => (
                <div
                  key={match.uid}
                  onClick={() => onNavigate('search')}
                  className="p-4 rounded-[5px] border border-slate-100 hover:border-brand-primary/20 transition-all flex gap-4 bg-slate-50/30 cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-[5px] overflow-hidden flex-shrink-0 bg-brand-secondary/30 flex items-center justify-center">
                    {match.avatar ? (
                      <img src={match.avatar} alt={match.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-lg font-bold text-brand-primary">{match.name[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-brand-dark group-hover:text-brand-dark truncate">{match.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Tag label={match.type === 'school' ? 'School District' : 'Community Partner'} variant="category" size="sm" />
                      {match.location && (
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <MapPin size={12} className="text-brand-primary" />
                          {match.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {suggestedMatches.length === 0 && (
                <div className="col-span-full h-32 flex items-center justify-center border border-dashed border-slate-200 rounded-[5px] text-slate-400 text-sm">
                  No other organizations to suggest yet.
                </div>
              )}
            </div>
          </section>

          {/* Recent Connections Requests */}
          <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-brand-dark mb-1">Recent Connections Requests</h2>
                <p className="text-sm text-slate-500">View and manage all your community partner connections requests.</p>
              </div>
            </div>

            <div className="space-y-4">
              {pendingConnections.length > 0 ? (
                pendingConnections.map((conn) => (
                  <div key={conn.id} className="p-4 rounded-[5px] border border-slate-100 hover:border-brand-primary/20 transition-all flex flex-col sm:flex-row gap-4">
                    <div className="w-16 h-16 rounded-[5px] overflow-hidden flex-shrink-0 border border-slate-200">
                      <img src={conn.fromAvatar} alt={conn.fromName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                        <h3 className="font-bold text-brand-dark text-base">{conn.fromName}</h3>
                        <Tag label={conn.status} variant="status-pending" size="sm" />
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">{conn.description}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Tag label={`${conn.quantity} ${conn.item}`} variant="category" size="sm" />
                        <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                          <MapPin size={12} className="text-brand-primary" />
                          {conn.distance}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between sm:w-32">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{conn.timeAgo}</span>
                      <div className="flex gap-2 mt-2">
                        {conn.fromName !== 'Youth Empowerment Fund' && (
                          <>
                            <button 
                              onClick={() => handleApprove(conn.id)}
                              className="px-3 py-1.5 bg-brand-primary hover:bg-brand-dark text-white text-xs font-bold rounded-[5px] transition-all flex items-center gap-1 cursor-pointer shadow-none"
                              title="Approve request"
                            >
                              <Check size={14} />
                              <span>Approve</span>
                            </button>
                            <button 
                              onClick={() => handleReject(conn.id)}
                              className="px-2.5 py-1.5 border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 hover:bg-red-50/60 text-xs font-semibold rounded-[5px] transition-all cursor-pointer shadow-none"
                              title="Deny request"
                            >
                              <X size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-32 flex items-center justify-center border border-dashed border-slate-200 rounded-[5px] text-slate-400 text-sm">
                  There are no current connection requests.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Quick Links */}
          <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
            <h2 className="text-xl font-bold text-brand-dark mb-6">Quick Links</h2>
            <div className="grid grid-cols-2 gap-4">
              {quickLinks.map((link) => (
                <button 
                  key={link.id}
                  onClick={() => {
                    if (link.id === 'search') onNavigate('search');
                    else if (link.id === 'message') onNavigate('messages');
                    else if (link.id === 'approve') onNavigate('documents');
                    else if (link.id === 'invite') {
                      window.location.href = `mailto:?subject=Check out this tech platform&body=Hi, I'm using this platform to manage our community partnerships. You should check it out here: ${window.location.origin}`;
                    }
                  }}
                  className="flex flex-col items-center justify-center p-4 rounded-[5px] bg-slate-50 hover:bg-brand-secondary/30 transition-all group"
                >
                  <link.icon className={cn("mb-3 transition-transform group-hover:scale-110", link.color)} size={24} />
                  <span className="text-xs font-bold text-brand-dark text-center">{link.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Documents Awaiting Signature */}
          <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
            <div className="flex justify-between items-center mb-1 gap-4">
              <h2 className="text-xl font-bold text-brand-dark flex-1">Documents Awaiting Signature</h2>
              {pendingDocs.length > 3 && (
                <button 
                  onClick={() => onNavigate('documents')}
                  className="text-brand-primary text-sm font-bold hover:underline whitespace-nowrap flex-shrink-0"
                >
                  View More
                </button>
              )}
            </div>
            <p className="text-sm text-slate-500 mb-8">Indicate when you have received items from a community partner.</p>

            <div className="divide-y divide-slate-100">
              {pendingDocs.slice(0, 3).map((doc) => (
                <div key={doc.id} className="py-6 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold text-brand-dark pr-4">{doc.title}</h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap">{doc.timeAgo}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className={cn(
                      "flex items-center gap-2 text-xs font-bold",
                      (doc.dueDate ?? '').toLowerCase().includes('tomorrow') ? "text-red-500" : "text-brand-primary"
                    )}>
                      <Calendar size={14} className={cn(
                        (doc.dueDate ?? '').toLowerCase().includes('tomorrow') ? "text-red-500" : "text-brand-primary"
                      )} />
                      {doc.dueDate}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => onNavigate('documents')}
                        className="bg-brand-primary hover:bg-brand-dark text-white text-xs font-bold px-4 py-2 rounded-[5px] transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        Sign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
