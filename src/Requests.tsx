import React, { useState } from 'react';
import { 
  Plus, Check, X, MapPin, Package,
  Utensils, Shirt, Book, Library, Laptop, Home, Palette, Backpack,
  ChevronDown, Calendar, Clock, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { Connection, ConnectionRequest, User } from './types';
import { createRequest, respondToRequest, cancelRequest } from './lib/requests';
import { ensureChat } from './lib/chats';
import { PartnerSummary } from './PartnerAbout';
import { acceptConnection, connectOnApprovedRequest, removeConnection } from './lib/connections';

interface RequestsProps {
  connections: ConnectionRequest[];
  setConnections: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  user: User;
  onViewPartner: (partner: PartnerSummary) => void;
  partnerConnections: Connection[];
}

export default function Requests({ connections, setConnections, user, onViewPartner, partnerConnections }: RequestsProps) {
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>('received');
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  
  // Form state for new request
  const [requestTarget, setRequestTarget] = useState<'everyone' | 'specific'>('everyone');
  const [newRequestPartner, setNewRequestPartner] = useState('');
  const [newRequestItem, setNewRequestItem] = useState('');
  const [newRequestQuantity, setNewRequestQuantity] = useState('');
  const [newRequestDetails, setNewRequestDetails] = useState('');

  const handleApprove = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    // Passing the current user as the "claim" attributes a broadcast
    // request (toUid == null) to whoever accepted it, so it stops showing
    // up as pending for every other partner. The Firestore onSnapshot
    // listener in App.tsx pushes the update back down into `connections`.
    await respondToRequest(id, 'approved', { uid: user.id, name: user.name, avatar: user.avatar || '' });

    // Open up a chat thread with the other party now that the request is approved.
    if (connection) {
      await ensureChat(
        user.id,
        { name: user.name, title: user.contactName || '', avatar: user.avatar },
        connection.fromId,
        { name: connection.fromName, title: '', avatar: connection.fromAvatar }
      );
      // Organizations that exchange resources are automatically connected.
      await connectOnApprovedRequest(
        { uid: user.id, name: user.name, avatar: user.avatar, type: user.type },
        { uid: connection.fromId, name: connection.fromName, avatar: connection.fromAvatar },
        id
      );
    }
  };

  const handleDeny = async (id: string) => {
    const connection = connections.find(c => c.id === id);
    if (connection?.type === 'sent') {
      await cancelRequest(id);
    } else {
      await respondToRequest(id, 'denied');
    }
  };

  const handleSubmitRequest = async () => {
    if (requestTarget === 'specific' && !newRequestPartner) return;
    if (!newRequestItem || !newRequestQuantity) return;

    const partner = requestTarget === 'specific'
      ? connections.find(c => c.fromName === newRequestPartner)
      : null;

    await createRequest({
      fromUid: user.id,
      fromName: user.name,
      fromAvatar: user.avatar || '',
      toUid: requestTarget === 'specific' ? (partner?.fromId ?? null) : null,
      toName: requestTarget === 'specific' ? newRequestPartner : null,
      toAvatar: requestTarget === 'specific' ? partner?.fromAvatar ?? null : null,
      item: newRequestItem,
      quantity: parseInt(newRequestQuantity),
      distance: partner?.distance,
      description: newRequestDetails,
      availability: partner?.availability
    });

    setShowCreateRequest(false);
    setActiveTab('sent');

    // Reset form
    setNewRequestPartner('');
    setNewRequestItem('');
    setNewRequestQuantity('');
    setNewRequestDetails('');
    setRequestTarget('everyone');
  };

  const getSupplyIcon = (item: string) => {
    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('food') || lowerItem.includes('meal')) return <Utensils size={16} className="text-brand-primary" />;
    if (lowerItem.includes('backpack')) return <Backpack size={16} className="text-brand-primary" />;
    if (lowerItem.includes('clothing') || lowerItem.includes('shirt')) return <Shirt size={16} className="text-brand-primary" />;
    if (lowerItem.includes('book') || lowerItem.includes('textbook')) return <Book size={16} className="text-brand-primary" />;
    if (lowerItem.includes('library') || lowerItem.includes('school')) return <Library size={16} className="text-brand-primary" />;
    if (lowerItem.includes('tech') || lowerItem.includes('laptop') || lowerItem.includes('computer')) return <Laptop size={16} className="text-brand-primary" />;
    if (lowerItem.includes('furniture') || lowerItem.includes('chair') || lowerItem.includes('desk')) return <Home size={16} className="text-brand-primary" />;
    if (lowerItem.includes('art') || lowerItem.includes('paint') || lowerItem.includes('supply')) return <Palette size={16} className="text-brand-primary" />;
    return <Package size={16} className="text-brand-primary" />;
  };

  const filteredRequests = connections.filter(c => {
    const matchesTab = activeTab === 'received' ? c.type === 'received' : c.type === 'sent';
    return matchesTab && c.status === 'pending';
  });

  const pendingConnectionRequests = partnerConnections.filter(c =>
    c.status === 'pending' && c.direction === (activeTab === 'received' ? 'incoming' : 'outgoing')
  );

  const receivedCount = connections.filter(c => c.type === 'received' && c.status === 'pending').length
    + partnerConnections.filter(c => c.status === 'pending' && c.direction === 'incoming').length;
  const sentCount = connections.filter(c => c.type === 'sent' && c.status === 'pending').length
    + partnerConnections.filter(c => c.status === 'pending' && c.direction === 'outgoing').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark mb-2">Requests Management</h1>
          <p className="text-slate-500">View and manage all your incoming and outgoing requests.</p>
        </div>
      </header>

      <div className="bg-white rounded-[5px] p-8 border border-slate-100 shadow-none">
        <div className="flex p-1 bg-slate-100 rounded-[5px] mb-8 w-full">
          <button
            onClick={() => setActiveTab('received')}
            className={cn(
              "flex-1 py-2.5 rounded-[5px] text-sm font-bold transition-all",
              activeTab === 'received' ? "bg-white text-brand-primary" : "text-slate-500"
            )}
          >
            Received ({receivedCount})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={cn(
              "flex-1 py-2.5 rounded-[5px] text-sm font-bold transition-all",
              activeTab === 'sent' ? "bg-white text-brand-primary" : "text-slate-500"
            )}
          >
            Sent ({sentCount})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingConnectionRequests.map((conn) => (
            <div key={conn.id} className="p-6 rounded-[5px] border border-slate-100 bg-slate-50/50 shadow-none hover:border-brand-primary/20 transition-all flex flex-col">
              <div className="flex gap-4 mb-6 flex-1">
                <div className="w-16 h-16 rounded-[5px] overflow-hidden flex-shrink-0 bg-brand-secondary/30 flex items-center justify-center">
                  {conn.partnerAvatar ? (
                    <img src={conn.partnerAvatar} alt={conn.partnerName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-brand-primary">{conn.partnerName[0]}</span>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-brand-dark">{conn.partnerName}</h3>
                    <span className="px-2 py-0.5 rounded-full bg-brand-secondary/30 text-brand-primary text-[10px] font-medium">Connection Request</span>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <UserPlus size={14} className="text-brand-primary" />
                    {conn.direction === 'incoming'
                      ? `${conn.partnerName} wants to connect with you.`
                      : `Waiting for ${conn.partnerName} to accept.`}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                {conn.direction === 'incoming' ? (
                  <>
                    <button
                      onClick={() => acceptConnection(conn.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] bg-brand-primary text-white text-sm font-bold hover:bg-brand-dark transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Check size={18} />
                      Accept
                    </button>
                    <button
                      onClick={() => removeConnection(conn.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <X size={18} />
                      Ignore
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => removeConnection(conn.id)}
                    className="flex-1 py-2.5 rounded-[5px] border border-red-100 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-all"
                  >
                    Withdraw Request
                  </button>
                )}
              </div>
            </div>
          ))}

          {filteredRequests.map((conn) => (
            <div key={conn.id} className="p-6 rounded-[5px] border border-slate-100 bg-slate-50/50 shadow-none hover:border-brand-primary/20 transition-all">
              <div className="flex gap-4 mb-6">
                {/* Broadcast requests you sent have no single partner to show (fromId is 'everyone'). */}
                {conn.fromId === 'everyone' ? (
                  <img src={conn.fromAvatar} alt={conn.fromName} className="w-16 h-16 rounded-[5px] object-cover" />
                ) : (
                  <button onClick={() => onViewPartner({ uid: conn.fromId, name: conn.fromName, avatar: conn.fromAvatar })} className="flex-shrink-0">
                    <img src={conn.fromAvatar} alt={conn.fromName} className="w-16 h-16 rounded-[5px] object-cover hover:opacity-80 transition-opacity" />
                  </button>
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      {conn.fromId === 'everyone' ? (
                        <h3 className="font-bold text-brand-dark">{conn.fromName}</h3>
                      ) : (
                        <button onClick={() => onViewPartner({ uid: conn.fromId, name: conn.fromName, avatar: conn.fromAvatar })} className="font-bold text-brand-dark text-left hover:text-brand-primary hover:underline">
                          {conn.fromName}
                        </button>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-black text-[10px] font-medium opacity-50">Pending</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-3">
                    <span className="flex items-center gap-1.5 text-xs text-black font-semibold">
                      {getSupplyIcon(conn.item)}
                      {conn.quantity} {conn.item}
                    </span>
                    {conn.distance !== 'N/A' && (
                      <span className="flex items-center gap-1.5 text-xs text-black font-semibold">
                        <MapPin size={14} className="text-brand-primary" />
                        {conn.distance}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {conn.description && (
                <p className="text-sm text-slate-500 mb-6 line-clamp-2">{conn.description}</p>
              )}

              <div className="flex gap-3">
                {conn.type === 'received' ? (
                  <>
                    <button 
                      onClick={() => handleApprove(conn.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] bg-brand-primary text-white text-sm font-bold hover:bg-brand-dark transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Check size={18} />
                      Approve
                    </button>
                    <button 
                      onClick={() => handleDeny(conn.id)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <X size={18} />
                      Deny
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => handleDeny(conn.id)}
                    className="flex-1 py-2.5 rounded-[5px] border border-red-100 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-all"
                  >
                    Cancel Request
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {filteredRequests.length === 0 && pendingConnectionRequests.length === 0 && (
            <div className="col-span-full h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-[5px] text-slate-400">
              <Package size={48} className="mb-4 opacity-20" />
              <p>No current {activeTab} requests.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Request Modal */}
      <AnimatePresence>
        {showCreateRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateRequest(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[5px] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-brand-dark">Create a Request</h3>
                  <p className="text-xs text-slate-500">Broadcast to everyone or target a specific partner</p>
                </div>
                <button onClick={() => setShowCreateRequest(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Request Target</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setRequestTarget('everyone')}
                      className={cn(
                        "py-3 rounded-[5px] text-sm font-bold border transition-all",
                        requestTarget === 'everyone' 
                          ? "bg-brand-primary border-brand-primary text-white" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-brand-primary/30"
                      )}
                    >
                      Broadcast to Everyone
                    </button>
                    <button
                      onClick={() => setRequestTarget('specific')}
                      className={cn(
                        "py-3 rounded-[5px] text-sm font-bold border transition-all",
                        requestTarget === 'specific' 
                          ? "bg-brand-primary border-brand-primary text-white" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-brand-primary/30"
                      )}
                    >
                      Specific Organization
                    </button>
                  </div>
                </div>

                {requestTarget === 'specific' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Community Partner Name*</label>
                    <div className="relative">
                      <select 
                        value={newRequestPartner}
                        onChange={(e) => setNewRequestPartner(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm"
                      >
                        <option value="">Select a community partner...</option>
                        {connections.filter(c => c.status === 'approved').map(conn => (
                          <option key={conn.id} value={conn.fromName}>{conn.fromName}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Item Needed*</label>
                    <div className="relative">
                      <select 
                        value={newRequestItem}
                        onChange={(e) => setNewRequestItem(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm"
                      >
                        <option value="">Select an item type...</option>
                        <option value="hygiene">Hygiene</option>
                        <option value="nonperishable food">Nonperishable Food</option>
                        <option value="school supplies">School Supplies</option>
                        <option value="hair care">Hair Care</option>
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Quantity*</label>
                    <input 
                      type="number" 
                      placeholder="100" 
                      value={newRequestQuantity}
                      onChange={(e) => setNewRequestQuantity(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Additional Details</label>
                  <textarea 
                    placeholder="Specify other important details here..." 
                    value={newRequestDetails}
                    onChange={(e) => setNewRequestDetails(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 min-h-[120px] text-sm" 
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end gap-4">
                <button onClick={() => setShowCreateRequest(false)} className="px-6 py-2.5 rounded-[5px] font-bold text-sm text-slate-600 hover:bg-slate-100 transition-all">Cancel</button>
                <button 
                  onClick={handleSubmitRequest}
                  className="px-6 py-2.5 bg-brand-primary hover:bg-brand-dark text-white rounded-[5px] font-bold text-sm transition-all shadow-none hover:scale-[1.02] active:scale-[0.98]"
                >
                  Submit Request
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
