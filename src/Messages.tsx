import React, { useState } from 'react';
import { 
  Search, Plus, Send, Calendar, 
  MoreVertical, Check, Clock, MessageSquare,
  UserPlus, X, MapPin, SquarePen
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Chat, ConnectionRequest, User, Document } from './types';
import { sendMessage, subscribeToMessages } from './lib/chats';

interface MessagesProps {
  selectedChatId: string | null;
  setSelectedChatId: (id: string) => void;
  draftMessage: { text: string; isSuggestedTime?: boolean; suggestedTimes?: string[]; meetingNote?: string } | null;
  setDraftMessage: (msg: { text: string; isSuggestedTime?: boolean; suggestedTimes?: string[]; meetingNote?: string } | null) => void;
  connections: ConnectionRequest[];
  setConnections: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  user: User;
  setDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
}

export default function Messages({ 
  selectedChatId, 
  setSelectedChatId, 
  draftMessage, 
  setDraftMessage,
  connections,
  setConnections,
  user,
  setDocuments,
  chats,
  setChats
}: MessagesProps) {
  const [message, setMessage] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isSuggestedTimeDraft, setIsSuggestedTimeDraft] = useState(false);
  const [suggestedTimesDraft, setSuggestedTimesDraft] = useState<string[]>([]);
  const [meetingNoteDraft, setMeetingNoteDraft] = useState<string | null>(null);
  
  const [chatDrafts, setChatDrafts] = useState<Record<string, {
    message: string;
    isSuggestedTimeDraft: boolean;
    suggestedTimesDraft: string[];
    meetingNoteDraft: string | null;
  }>>({});
  
  const prevActiveChatIdRef = React.useRef<string | null>(null);
  const currentInputRef = React.useRef({ message, isSuggestedTimeDraft, suggestedTimesDraft, meetingNoteDraft });
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [connectionSearch, setConnectionSearch] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const approvedChatNames = connections
    .filter(c => c.status === 'approved')
    .map(c => c.fromName);

  const allApprovedChats = chats
    .filter(chat => approvedChatNames.includes(chat.participantName))
    .sort((a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0));

  const formatTitle = (title: string) => {
    return title.replace(/^(Mr\.|Mrs\.|Ms\.|Director|Coordinator|Dr\.)\s+/i, '');
  };

  const sidebarChats = allApprovedChats
    .filter(chat => (chat.messages && chat.messages.length > 0) || !!chat.lastMessage || chat.isRecentlyApproved)
    .filter(chat =>
      chat.participantName.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(sidebarSearch.toLowerCase()))
    );

  const activeChatId = selectedChatId || (sidebarChats.length > 0 ? sidebarChats[0].id : null);
  const activeChat = allApprovedChats.find(c => c.id === activeChatId);

  React.useEffect(() => {
    currentInputRef.current = { message, isSuggestedTimeDraft, suggestedTimesDraft, meetingNoteDraft };
  }, [message, isSuggestedTimeDraft, suggestedTimesDraft, meetingNoteDraft]);

  // Reset/Load input when switching chats
  React.useEffect(() => {
    // Save draft for the previous chat
    if (prevActiveChatIdRef.current && prevActiveChatIdRef.current !== activeChatId) {
      const prevId = prevActiveChatIdRef.current;
      const input = currentInputRef.current;
      setChatDrafts(prev => ({
        ...prev,
        [prevId]: { ...input }
      }));
    }

    // Load draft for the new chat
    if (activeChatId) {
      const draft = chatDrafts[activeChatId];
      if (draft) {
        setMessage(draft.message);
        setIsSuggestedTimeDraft(draft.isSuggestedTimeDraft);
        setSuggestedTimesDraft(draft.suggestedTimesDraft);
        setMeetingNoteDraft(draft.meetingNoteDraft);
      } else {
        setMessage('');
        setIsSuggestedTimeDraft(false);
        setSuggestedTimesDraft([]);
        setMeetingNoteDraft(null);
      }
    }

    prevActiveChatIdRef.current = activeChatId;
  }, [activeChatId]);

  React.useEffect(() => {
    if (draftMessage) {
      setMessage(draftMessage.text);
      setIsSuggestedTimeDraft(!!draftMessage.isSuggestedTime);
      setSuggestedTimesDraft(draftMessage.suggestedTimes || []);
      setMeetingNoteDraft(draftMessage.meetingNote || null);
      setDraftMessage(null);
    }
  }, [draftMessage, setDraftMessage]);

  // Stream the active chat's messages from Firestore. Only the open
  // conversation is subscribed (not every chat in the sidebar) to keep
  // reads proportional to what's actually being viewed.
  React.useEffect(() => {
    if (!activeChatId) return;
    const unsubscribe = subscribeToMessages(activeChatId, (messages) => {
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, messages } : c));
    });
    return unsubscribe;
  }, [activeChatId]);

  const approvedConnections = connections.filter(c =>
    c.status === 'approved' && 
    c.fromName.toLowerCase().includes(connectionSearch.toLowerCase())
  );

  const handleStartChat = (connectionName: string) => {
    const existingChat = chats.find(c => c.participantName === connectionName);
    if (existingChat) {
      setSelectedChatId(existingChat.id);
    }
    setShowNewMessageModal(false);
  };

  const handleSendMessage = () => {
    if (!message.trim() || !activeChat) return;

    // Persist to Firestore — the subscribeToMessages listener above pushes
    // the saved message (and the chat's updated lastMessage/timestamp via
    // the chats subscription in App.tsx) back into `chats` once written.
    sendMessage(activeChat.id, {
      senderId: user.id,
      text: message,
      isSuggestedTime: isSuggestedTimeDraft,
      suggestedTimes: suggestedTimesDraft,
      meetingNote: meetingNoteDraft || undefined
    });

    // Clear draft for this chat
    setChatDrafts(prev => {
      const newDrafts = { ...prev };
      delete newDrafts[activeChat.id];
      return newDrafts;
    });

    setMessage('');
    setIsSuggestedTimeDraft(false);
    setSuggestedTimesDraft([]);
    setMeetingNoteDraft(null);
  };

  return (
    <div className="h-[calc(100vh-8rem)] min-h-[750px] flex bg-white rounded-[5px] shadow-none border border-slate-100 overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar */}
      <div className="w-full max-w-[320px] border-r border-slate-100 flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-brand-dark mb-6">Your Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search your messages" 
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-[5px] border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <button 
              onClick={() => setShowNewMessageModal(true)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary hover:bg-brand-secondary/30 p-1.5 rounded-[5px] transition-all" 
              title="Create message with connections"
            >
              <SquarePen size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {sidebarChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={cn(
                "w-full p-6 text-left border-b border-slate-50 transition-all flex gap-4 relative",
                activeChatId === chat.id ? "bg-brand-secondary/20" : "hover:bg-slate-50"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-brand-secondary flex items-center justify-center text-brand-primary font-bold overflow-hidden">
                {chat.participantAvatar ? (
                  <img src={chat.participantAvatar} alt={chat.participantName} className="w-full h-full object-cover" />
                ) : (
                  chat.participantName[0]
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <h3 className="font-bold text-brand-dark truncate">{chat.participantName}</h3>
                  {chat.messages && chat.messages.length > 0 && (
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{chat.timeAgo}</span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-slate-600 truncate mb-0.5">
                  {formatTitle(chat.participantTitle)}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {chat.lastMessage || (chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].text : "No messages yet")}
                </p>
              </div>
              {chat.unreadCount && (
                <div className="absolute right-6 bottom-6 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  {chat.unreadCount}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChat ? (
          <>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-secondary flex items-center justify-center text-brand-primary font-bold overflow-hidden">
                  {activeChat.participantAvatar ? (
                    <img src={activeChat.participantAvatar} alt={activeChat.participantName} className="w-full h-full object-cover" />
                  ) : (
                    activeChat.participantName[0]
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-brand-dark text-lg">{activeChat.participantName}</h2>
                  <p className="text-xs text-slate-500">{formatTitle(activeChat.participantTitle)}</p>
                </div>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-[5px] transition-all"
                >
                  <MoreVertical size={20} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-[5px] border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                      <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <UserPlus size={16} />
                        View Profile
                      </button>
                      <button className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                        <Clock size={16} />
                        Mute Notifications
                      </button>
                      <div className="h-px bg-slate-100 my-1" />
                      <button className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <X size={16} />
                        Block Partner
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className={cn("flex-1 overflow-y-auto p-8", !activeChat.messages || activeChat.messages.length === 0 ? "flex items-center justify-center" : "space-y-6")}>
              {activeChat.messages && activeChat.messages.length > 0 ? (
                <>
                  {activeChat.timeAgo === '1 day ago' && (
                    <div className="flex justify-center mb-6">
                      <span className="text-[10px] font-bold text-slate-400 tracking-widest">
                        Yesterday 10:00 AM
                      </span>
                    </div>
                  )}
                  
                  {activeChat.messages.map((msg) => (
                    <div key={msg.id} className={cn("flex w-full mb-6", msg.senderId === 'user-1' ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[80%] rounded-[5px] p-6",
                        msg.senderId === 'user-1' ? "bg-white border border-slate-200" : "bg-slate-50"
                      )}>
                        <p className="text-sm text-slate-700 leading-relaxed mb-4">{msg.text}</p>
                        
                        {msg.isSuggestedTime && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <span className="text-xs font-bold text-brand-dark block mb-3">Suggested Drop-off:</span>
                            <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin cursor-grab active:cursor-grabbing">
                              <div className="flex gap-2 min-w-max pr-4">
                                {(msg.suggestedTimes && msg.suggestedTimes.length > 0) ? (
                                  msg.suggestedTimes.map((time, idx) => (
                                    <button 
                                      key={idx} 
                                      className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-[5px] text-xs font-bold border transition-all whitespace-nowrap",
                                        "bg-white text-slate-600 border-slate-200 hover:border-brand-primary hover:text-brand-primary hover:bg-brand-secondary/10"
                                      )}
                                    >
                                      {time}
                                    </button>
                                  ))
                                ) : (
                                  <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-600 border-slate-200 rounded-[5px] text-xs font-bold border hover:border-brand-primary hover:text-brand-primary hover:bg-brand-secondary/10 transition-all whitespace-nowrap">
                                    Mon, 03/10/26: 9:00 AM
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.confirmedTime && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <span className="text-xs font-bold text-brand-dark block mb-3">Confirmed Drop-off:</span>
                            <div className="flex">
                              <div className="flex items-center gap-2 px-4 py-2 bg-brand-secondary/20 text-brand-primary border border-brand-primary/20 rounded-[5px] text-xs font-bold transition-all whitespace-nowrap">
                                <Check size={14} className="text-brand-primary" />
                                {msg.confirmedTime}
                              </div>
                            </div>
                          </div>
                        )}

                        {msg.meetingNote && (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <span className="text-xs font-bold text-brand-dark block mb-3">Meeting Notes:</span>
                            <div className="p-3 bg-brand-secondary/10 border border-brand-primary/10 rounded-[5px]">
                              <p className="text-xs text-brand-dark font-medium leading-relaxed">
                                {msg.text.includes("East Wing Entrance") ? "Meet at the East Wing Entrance. Student leaders will be there to help unload." : 
                                 msg.text.includes("Main Entrance") ? "Meet at the Main Entrance. Staff members will be there to help unload." : 
                                 msg.meetingNote}
                              </p>
                            </div>
                          </div>
                        )}

                        <span className="text-[10px] text-slate-400 block mt-2">{msg.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <MessageSquare size={32} className="text-slate-200 mb-4" />
                  <span className="text-[10px] font-bold text-slate-400 tracking-widest">No Message Sent Yet</span>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100">
              {meetingNoteDraft && (
                <div className="mb-4 p-4 bg-brand-secondary/10 rounded-[5px] border border-brand-primary/10 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-brand-primary flex items-center gap-2">
                      <MapPin size={14} />
                      Meeting Note Attached
                    </span>
                    <button 
                      onClick={() => setMeetingNoteDraft(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="p-3 bg-white border border-brand-primary/10 rounded-[5px]">
                    <input 
                      type="text"
                      value={meetingNoteDraft}
                      onChange={(e) => setMeetingNoteDraft(e.target.value)}
                      className="w-full text-xs text-brand-dark font-medium leading-relaxed focus:outline-none bg-transparent"
                      placeholder="Edit meeting note..."
                    />
                  </div>
                </div>
              )}
              {isSuggestedTimeDraft && suggestedTimesDraft.length > 0 && (
                <div className="mb-4 p-4 bg-brand-secondary/10 rounded-[5px] border border-brand-primary/10 animate-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-brand-primary flex items-center gap-2">
                      <Calendar size={14} />
                      Suggested Drop-off Times Attached
                    </span>
                    <button 
                      onClick={() => {
                        setIsSuggestedTimeDraft(false);
                        setSuggestedTimesDraft([]);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTimesDraft.map((time, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => {
                          setSuggestedTimesDraft(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-white text-brand-primary rounded-[5px] text-[10px] font-bold border border-brand-primary/20 shadow-none hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all"
                        title="Remove this time"
                      >
                        {time}
                        <X size={12} className="opacity-50 group-hover:opacity-100" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <input 
                  type="text" 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your message here..."
                  className="flex-1 px-6 py-3.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
                <button 
                  onClick={handleSendMessage}
                  className="px-10 py-3.5 bg-brand-primary hover:bg-brand-dark text-white rounded-[5px] font-bold transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Send
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <MessageSquare size={48} className="mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
      {/* New Message Modal */}
      <AnimatePresence>
        {showNewMessageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewMessageModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[5px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-brand-dark">New Message</h3>
                <button onClick={() => setShowNewMessageModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search connections..." 
                    value={connectionSearch}
                    onChange={(e) => setConnectionSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-[5px] border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    autoFocus
                  />
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Approved Connections</p>
                  {approvedConnections.map((conn) => {
                    const chatForConn = chats.find(c => c.participantName === conn.fromName);
                    const displayName = conn.fromName;
                    const subText = chatForConn ? chatForConn.participantTitle : 'Contact Person';
                    
                    return (
                      <button
                        key={conn.id}
                        onClick={() => handleStartChat(conn.fromName)}
                        className="w-full flex items-center gap-3 p-3 rounded-[5px] hover:bg-slate-50 transition-all text-left"
                      >
                        <img src={conn.fromAvatar} alt={conn.fromName} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <p className="text-sm font-bold text-brand-dark">{displayName}</p>
                          <p className="text-[10px] text-slate-500">{subText}</p>
                        </div>
                      </button>
                    );
                  })}
                  {approvedConnections.length === 0 && (
                    <p className="text-center py-8 text-sm text-slate-400 italic">No connections found</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
