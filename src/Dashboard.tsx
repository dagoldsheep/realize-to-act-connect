import React from 'react';
import { 
  Search, MessageSquare, Monitor, UserPlus, 
  Check, X, FileSignature, ArrowRight,
  BookOpen, Backpack, MapPin, Calendar, Pencil, Trash2,
  Utensils, Shirt, Book, Library, Laptop, Home, Palette, Package
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import { MOCK_CONNECTIONS, MOCK_DOCUMENTS, MOCK_SUGGESTED_MATCHES } from './mockData';
import { User, ConnectionRequest, Document, Chat } from './types';
import { respondToRequest } from './lib/requests';
import { ensureChat } from './lib/chats';
import { PartnerSummary } from './PartnerAbout';

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
  onViewPartner: (partner: PartnerSummary) => void;
}

export default function Dashboard({ 
  user, onNavigate, onNavigateToChat,
  actionsNeededRead, setActionsNeededRead,
  connections, setConnections,
  documents, setDocuments,
  lastActionTime, updateLastAction,
  setChats, onViewPartner
}: DashboardProps) {
  const pendingConnections = connections.filter(c => c.status === 'pending' && c.type === 'received');
  const pendingDocs = documents.filter(d => d.status === 'pending');

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
      updateLastAction();

      // Add to pending signatures
      const newDoc: Document = {
        id: `doc-${Date.now()}`,
        title: `Letter of Acknowledgement - ${connection.fromName}`,
        fromName: connection.fromName,
        toName: user.name,
        status: 'pending',
        dueDate: 'Due in 7 days',
        timeAgo: 'Just now',
        itemDescription: `approved ${connection.quantity} ${connection.item}`,
      };
      setDocuments(prev => [newDoc, ...prev]);
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
                <h2 className="text-xl font-bold text-brand-dark mb-1">Suggested Matches</h2>
                <p className="text-sm text-slate-500">Based on your needs and location, these partners might be a good fit.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {MOCK_SUGGESTED_MATCHES.map((match) => (
                <div 
                  key={match.id} 
                  onClick={() => onNavigate('search')}
                  className="p-4 rounded-[5px] border border-slate-100 hover:border-brand-primary/20 transition-all flex gap-4 bg-slate-50/30 cursor-pointer group"
                >
                  <img src={match.avatar} alt={match.name} className="w-12 h-12 rounded-[5px] object-cover" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-brand-dark truncate transition-colors">{match.name}</h3>
                    <p className="text-[10px] text-slate-500 mb-2 truncate">{match.description}</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-3">
                        <span className="text-xs font-semibold text-black flex items-center gap-1.5">
                          {getSupplyIcon(match.item || '')}
                          {match.quantity} {match.item}
                        </span>
                        <span className="text-xs font-semibold text-black flex items-center gap-1.5">
                          <MapPin size={14} className="text-brand-primary" />
                          {match.distance}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                    <button
                      onClick={() => onViewPartner({ uid: conn.fromId, name: conn.fromName, avatar: conn.fromAvatar })}
                      className="w-16 h-16 rounded-[5px] overflow-hidden flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <img src={conn.fromAvatar} alt={conn.fromName} className="w-full h-full object-cover" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <button
                          onClick={() => onViewPartner({ uid: conn.fromId, name: conn.fromName, avatar: conn.fromAvatar })}
                          className="font-bold text-brand-dark text-left hover:text-brand-primary hover:underline"
                        >
                          {conn.fromName}
                        </button>
                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-black text-[10px] font-medium opacity-50">Pending</span>
                      </div>
                      <p className="text-sm text-slate-500 line-clamp-2 mb-3">{conn.description}</p>
                      <div className="flex flex-wrap gap-4 text-xs font-semibold text-black">
                        <span className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-brand-secondary/30 flex items-center justify-center text-brand-primary">
                            {conn.item.toLowerCase().includes('textbook') || conn.item.toLowerCase().includes('notebook') ? (
                              <BookOpen size={12} />
                            ) : conn.item.toLowerCase().includes('backpack') ? (
                              <Backpack size={12} />
                            ) : conn.item.toLowerCase().includes('art supplies') ? (
                              <Pencil size={12} />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                            )}
                          </div>
                          {conn.quantity} {conn.item}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-brand-secondary/30 flex items-center justify-center text-brand-primary">
                            <MapPin size={12} />
                          </div>
                          {conn.distance}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between sm:w-32">
                      <span className="text-xs text-slate-400 whitespace-nowrap">{conn.timeAgo}</span>
                      <div className="flex gap-2">
                        {conn.fromName !== 'Youth Empowerment Fund' && (
                          <>
                            <button 
                              onClick={() => handleApprove(conn.id)}
                              className="p-2 hover:bg-green-50 text-green-600 rounded-[5px] transition-colors"
                            >
                              <Check size={20} />
                            </button>
                            <button 
                              onClick={() => handleReject(conn.id)}
                              className="p-2 hover:bg-red-50 text-red-600 rounded-[5px] transition-colors"
                            >
                              <X size={20} />
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
                      doc.dueDate.toLowerCase().includes('tomorrow') ? "text-red-500" : "text-brand-primary"
                    )}>
                      <Calendar size={14} className={cn(
                        doc.dueDate.toLowerCase().includes('tomorrow') ? "text-red-500" : "text-brand-primary"
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
