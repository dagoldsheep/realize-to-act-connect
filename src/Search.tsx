import React, { useEffect, useState } from 'react';
import { 
  Search as SearchIcon, MapPin, Plus, Check, Filter, ChevronDown, 
  Map as MapIcon, List, X, Clock, Calendar, MessageSquare,
  Utensils, Backpack, Shirt, Book, Library, Laptop, Home as HomeIcon, Palette, Package,
  UserPlus, School, Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { MOCK_SEARCH_USERS } from './mockData';
import { Connection, ConnectionRequest, Organization, User } from './types';
import { acceptConnection, listOrganizations, sendConnectionRequest } from './lib/connections';

interface SearchProps {
  connections: ConnectionRequest[];
  setConnections: React.Dispatch<React.SetStateAction<ConnectionRequest[]>>;
  user: User;
  partnerConnections: Connection[];
}

export default function Search({ connections, setConnections, user, partnerConnections }: SearchProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [connectingUid, setConnectingUid] = useState<string | null>(null);
  const [connectError, setConnectError] = useState('');

  useEffect(() => {
    listOrganizations(user.id).then(setOrganizations).catch(() => setOrganizations([]));
  }, [user.id]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [radius, setRadius] = useState(10);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [addedIds, setAddedIds] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'distance' | 'connected' | 'relevance'>('relevance');
  const [showCreateRequest, setShowCreateRequest] = useState(false);
  const [selectedPartnerForRequest, setSelectedPartnerForRequest] = useState<any>(null);
  const [isBroadcastRequest, setIsBroadcastRequest] = useState(false);
  const [sentIds, setSentIds] = useState<string[]>([]);

  // Form state for new request
  const [newRequestItem, setNewRequestItem] = useState('');
  const [newRequestOtherItem, setNewRequestOtherItem] = useState('');
  const [newRequestQuantity, setNewRequestQuantity] = useState('');
  const [newRequestDetails, setNewRequestDetails] = useState('');

  const getSupplyIcon = (item: string) => {
    const lowerItem = item.toLowerCase();
    if (lowerItem.includes('food') || lowerItem.includes('meal')) return <Utensils size={16} className="text-brand-primary" />;
    if (lowerItem.includes('backpack')) return <Backpack size={16} className="text-brand-primary" />;
    if (lowerItem.includes('clothing') || lowerItem.includes('shirt')) return <Shirt size={16} className="text-brand-primary" />;
    if (lowerItem.includes('book') || lowerItem.includes('textbook')) return <Book size={16} className="text-brand-primary" />;
    if (lowerItem.includes('library') || lowerItem.includes('school')) return <Library size={16} className="text-brand-primary" />;
    if (lowerItem.includes('tech') || lowerItem.includes('laptop') || lowerItem.includes('computer')) return <Laptop size={16} className="text-brand-primary" />;
    if (lowerItem.includes('furniture') || lowerItem.includes('chair') || lowerItem.includes('desk')) return <HomeIcon size={16} className="text-brand-primary" />;
    if (lowerItem.includes('art') || lowerItem.includes('paint') || lowerItem.includes('supply')) return <Palette size={16} className="text-brand-primary" />;
    return <Package size={16} className="text-brand-primary" />;
  };

  const connectionWith = (uid: string) => partnerConnections.find(c => c.partnerUid === uid);

  // Registered organizations can be connected with; "Connected" reflects an
  // accepted connection (sent from here, or made by approving a resource request).
  const allPartners = [
    ...organizations.map(org => ({
      id: org.uid,
      uid: org.uid,
      name: org.name,
      avatar: org.avatar,
      orgType: org.type,
      location: org.location,
      description: '',
      distance: '',
      distanceValue: 0,
      tags: [] as string[],
      isConnected: connectionWith(org.uid)?.status === 'accepted',
    })),
    ...MOCK_SEARCH_USERS.map(u => ({ ...u, isConnected: false }))
  ];

  const handleConnect = async (partner: any) => {
    const existing = connectionWith(partner.uid);
    setConnectingUid(partner.uid);
    setConnectError('');
    try {
      if (existing?.status === 'pending' && existing.direction === 'incoming') {
        await acceptConnection(existing.id);
      } else if (!existing) {
        await sendConnectionRequest(
          { uid: user.id, name: user.name, avatar: user.avatar, type: user.type },
          { uid: partner.uid, name: partner.name, avatar: partner.avatar, type: partner.orgType }
        );
      }
    } catch (err) {
      console.error('Connect failed', err);
      setConnectError(`Couldn't connect with ${partner.name}. Please try again.`);
    } finally {
      setConnectingUid(null);
    }
  };

  const renderConnectButton = (partner: any) => {
    const existing = connectionWith(partner.uid);
    const isIncoming = existing?.status === 'pending' && existing.direction === 'incoming';
    return (
      <button
        onClick={() => handleConnect(partner)}
        disabled={connectingUid === partner.uid || (!!existing && !isIncoming)}
        className={cn(
          "w-[140px] py-2.5 rounded-[5px] font-bold text-sm transition-all flex items-center justify-center gap-2",
          existing?.status === 'accepted'
            ? "bg-emerald-50 text-emerald-700 cursor-default"
            : existing && !isIncoming
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "border border-brand-primary text-brand-primary bg-white hover:bg-brand-secondary/20"
        )}
      >
        {existing?.status === 'accepted' ? (
          <><Check size={16} /> Connected</>
        ) : isIncoming ? (
          <><Check size={16} /> Accept</>
        ) : existing ? (
          'Pending'
        ) : (
          <><UserPlus size={16} /> Connect</>
        )}
      </button>
    );
  };

  const filteredPartners = allPartners.filter(partner => {
    const matchesSearch = partner.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         partner.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         partner.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = filterType === 'all' || partner.tags.some(tag => tag.toLowerCase().includes(filterType.toLowerCase()));
    const matchesRadius = partner.distanceValue <= radius;
    const isNotExpired = partner.availableUntil !== 'Expired';

    return matchesSearch && matchesType && matchesRadius && isNotExpired;
  }).sort((a, b) => {
    if (sortBy === 'relevance') {
      // Relevance: Connected first, then by distance
      if (a.isConnected !== b.isConnected) return a.isConnected ? -1 : 1;
      return a.distanceValue - b.distanceValue;
    }
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'distance') return a.distanceValue - b.distanceValue;
    if (sortBy === 'connected') {
      if (a.isConnected === b.isConnected) return a.name.localeCompare(b.name);
      return a.isConnected ? -1 : 1;
    }
    return 0;
  });

  const handleAddConnection = (partner: any) => {
    if (addedIds.includes(partner.id)) return;

    const newConnection: ConnectionRequest = {
      id: `new-conn-${Date.now()}`,
      fromId: partner.id,
      fromName: partner.name,
      fromAvatar: partner.avatar,
      type: 'received',
      status: 'approved',
      item: partner.tags[0],
      quantity: 0,
      distance: partner.distance,
      timeAgo: 'Just now',
      timestamp: Date.now(),
      description: partner.description,
      isNew: true,
      postedAt: partner.postedAt,
      availableUntil: partner.availableUntil
    };

    setConnections(prev => [newConnection, ...prev]);
    setAddedIds(prev => [...prev, partner.id]);
  };

  const handleOpenRequestModal = (partner: any) => {
    setSelectedPartnerForRequest(partner);
    setIsBroadcastRequest(false);
    setShowCreateRequest(true);
  };

  const handleOpenBroadcastModal = () => {
    setSelectedPartnerForRequest(null);
    setIsBroadcastRequest(true);
    setShowCreateRequest(true);
  };

  const handleSubmitRequest = () => {
    if (!newRequestItem || !newRequestQuantity) return;
    if (!isBroadcastRequest && !selectedPartnerForRequest) return;

    const finalItem = newRequestItem === 'other' ? newRequestOtherItem : newRequestItem;

    const newRequest: ConnectionRequest = {
      id: `sent-${Date.now()}`,
      fromId: 'user-1',
      fromName: isBroadcastRequest ? 'Broadcast Request (All Partners)' : selectedPartnerForRequest.name,
      fromAvatar: isBroadcastRequest 
        ? 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=150&h=150&fit=crop' 
        : selectedPartnerForRequest.avatar,
      type: 'sent',
      status: 'pending',
      item: finalItem,
      quantity: parseInt(newRequestQuantity),
      distance: isBroadcastRequest ? 'N/A' : selectedPartnerForRequest.distance,
      timeAgo: 'Just now',
      timestamp: Date.now(),
      description: newRequestDetails,
      postedAt: isBroadcastRequest ? 'Just now' : selectedPartnerForRequest.postedAt,
      availableUntil: isBroadcastRequest ? 'Indefinite' : selectedPartnerForRequest.availableUntil
    };

    setConnections(prev => [newRequest, ...prev]);
    if (isBroadcastRequest) {
      setSentIds(prev => [...prev, ...filteredPartners.map((p: any) => p.id)]);
    } else if (selectedPartnerForRequest) {
      setSentIds(prev => [...prev, selectedPartnerForRequest.id]);
    }
    setShowCreateRequest(false);
    
    // Reset form
    setNewRequestItem('');
    setNewRequestOtherItem('');
    setNewRequestQuantity('');
    setNewRequestDetails('');
    setSelectedPartnerForRequest(null);
    setIsBroadcastRequest(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-brand-dark mb-2">Search Community Partners</h1>
          <p className="text-slate-500">Discover new partners or manage your existing connections.</p>
        </div>
        <div className="flex p-1 bg-slate-100 rounded-[5px] w-fit">
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-bold transition-all",
              viewMode === 'list' ? "bg-white text-brand-primary" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <List size={18} />
            List
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-[5px] text-sm font-bold transition-all",
              viewMode === 'map' ? "bg-white text-brand-primary" : "text-slate-500 hover:text-slate-700"
            )}
          >
            <MapIcon size={18} />
            Map
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100 min-h-[600px] flex flex-col">
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search partners by name, description, or supplies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
            />
          </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowFilterModal(true)}
                  className="flex items-center gap-2 px-6 py-3.5 rounded-[5px] border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                >
                  <Filter size={18} className="text-brand-primary" />
                  Filter
                  {(filterType !== 'all' || radius !== 50) && (
                    <span className="w-2 h-2 bg-brand-primary rounded-full" />
                  )}
                </button>
                <div className="relative min-w-[160px]">
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full pl-4 pr-10 py-3.5 rounded-[5px] border border-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20 bg-white text-sm font-bold text-slate-700"
                  >
                    <option value="relevance">Sort: Relevance</option>
                    <option value="name">Sort: Name</option>
                    <option value="distance">Sort: Distance</option>
                    <option value="connected">Status: Connected</option>
                  </select>
                </div>
              </div>
        </div>

        {connectError && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-[5px] text-red-600 text-sm">
            {connectError}
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-brand-dark">Community Partners</h2>
          <button 
            onClick={handleOpenBroadcastModal}
            className="text-brand-primary font-bold text-sm hover:text-brand-dark transition-all underline underline-offset-4"
          >
            Send Request to All
          </button>
        </div>

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {viewMode === 'list' ? (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {filteredPartners.map((item: any) => {
                  const isAdded = item.isConnected || addedIds.includes(item.id);
                  
                  return (
                    <motion.div 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-[5px] border border-slate-100 hover:border-brand-primary/20 transition-all flex flex-col sm:flex-row gap-6 bg-white group shadow-none relative"
                    >
                      <div className="w-20 h-20 rounded-[5px] overflow-hidden flex-shrink-0 bg-brand-secondary/30 flex items-center justify-center">
                        {item.avatar ? (
                          <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-2xl font-bold text-brand-primary">{item.name[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-brand-dark text-lg truncate">{item.name}</h3>
                            {item.isConnected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-normal">
                                Connected
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                          {item.isConnected && item.tags.length > 0 ? `Providing ${item.tags.join(', ')}. ${item.description}` : item.description}
                        </p>
                        
                        <div className="flex flex-wrap gap-6 mb-0">
                          {item.uid ? (
                            <>
                              <div className="flex items-center gap-2 text-xs font-semibold text-black">
                                {item.orgType === 'school' ? <School size={16} className="text-brand-primary" /> : <Heart size={16} className="text-brand-primary" />}
                                {item.orgType === 'school' ? 'School District' : 'Community Partner'}
                              </div>
                              {item.location && (
                                <div className="flex items-center gap-2 text-xs font-semibold text-black">
                                  <MapPin size={14} className="text-brand-primary" />
                                  {item.location}
                                </div>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-xs font-semibold text-black">
                                {getSupplyIcon(item.tags[0])}
                                {item.quantity} {item.tags[0]}
                              </div>
                              <div className="flex items-center gap-2 text-xs font-semibold text-black">
                                <MapPin size={14} className="text-brand-primary" />
                                {item.distance}
                              </div>
                            </>
                          )}
                          {item.availableUntil && (
                            <div className="flex items-center gap-2 text-xs font-semibold text-black">
                              <Calendar size={14} className="text-brand-primary" />
                              Available for: {item.availableUntil}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end">
                        {item.postedAt ? (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {item.postedAt}
                          </span>
                        ) : <div />}

                        <div className="flex flex-col gap-2">
                          {item.uid && renderConnectButton(item)}
                          <button
                            onClick={() => handleOpenRequestModal(item)}
                            disabled={sentIds.includes(item.id)}
                            className={cn(
                              "w-[140px] py-2.5 rounded-[5px] font-bold text-sm transition-all",
                              sentIds.includes(item.id)
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "bg-brand-primary hover:bg-brand-dark text-white hover:scale-[1.02] active:scale-[0.98]"
                            )}
                          >
                            {sentIds.includes(item.id) ? 'Sent' : 'Send Request'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div 
                key="map"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative h-[600px] rounded-[5px] overflow-hidden border border-slate-100 bg-slate-50 flex items-center justify-center shadow-none"
                style={{ perspective: '1200px' }}
              >
                {/* 3D Map Container */}
                <motion.div 
                  className="relative w-[1200px] h-[1200px] bg-white rounded-full shadow-inner flex items-center justify-center"
                  style={{ 
                    transform: 'rotateX(60deg) rotateZ(-15deg)',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Grid Lines */}
                  <div className="absolute inset-0 rounded-full opacity-10" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                  
                  {/* Radius Circle */}
                  <div 
                    className="absolute rounded-full border-2 border-brand-primary/30 bg-brand-primary/5 transition-all duration-500"
                    style={{ 
                      width: `${(radius / 50) * 100}%`, 
                      height: `${(radius / 50) * 100}%`,
                      transform: 'translateZ(1px)'
                    }}
                  >
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {radius}mi
                    </div>
                  </div>

                  {/* User Location */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ transform: 'translateZ(20px)' }}>
                    <div className="w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                      <Home size={18} className="text-white" />
                    </div>
                  </div>

                  {/* Partner Markers */}
                  {filteredPartners.map((item: any, idx: number) => {
                    const name = item.name;
                    const avatar = item.avatar;
                    const distVal = item.distanceValue;

                    const angles = [45, 135, 225, 315, 90, 180, 270, 0];
                    const angle = angles[idx % angles.length];
                    const dist = (distVal / 50) * 500; // Scale to map size
                    const x = Math.cos(angle * Math.PI / 180) * dist;
                    const y = Math.sin(angle * Math.PI / 180) * dist;

                    return (
                      <motion.div
                        key={item.id}
                        className="absolute top-1/2 left-1/2"
                        style={{ 
                          transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) translateZ(30px)`,
                          transformStyle: 'preserve-3d'
                        }}
                      >
                        <div className="group relative">
                          {/* Marker Pin */}
                          <div 
                            className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-xl border-2 border-brand-primary cursor-pointer hover:scale-110 transition-transform"
                            style={{ transform: 'rotateX(-60deg) rotateY(15deg)' }}
                          >
                            <MapPin size={16} className="text-brand-primary" />
                          </div>
                          
                          {/* Marker Shadow */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-1 bg-black/10 rounded-full blur-[1px]" style={{ transform: 'translateZ(-29px)' }} />

                          {/* Marker Tooltip */}
                          <div 
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 bg-white rounded-[5px] shadow-2xl border border-slate-100 p-4 opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20"
                            style={{ transform: 'rotateX(-60deg) rotateY(15deg) translateY(-10px)' }}
                          >
                            <div className="flex gap-3 mb-3">
                              <img src={avatar} className="w-10 h-10 rounded-[5px] object-cover" referrerPolicy="no-referrer" />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-brand-dark truncate">{name}</p>
                                <p className="text-[10px] text-slate-500">{item.distance}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {item.tags.map((tag: string) => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-brand-secondary/20 text-brand-primary text-[9px] font-bold">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Map Controls */}
                <div className="absolute bottom-8 right-8 flex flex-col gap-3">
                  <div className="bg-white rounded-[5px] shadow-xl border border-slate-100 p-2 flex flex-col gap-2">
                    <button className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-[5px] text-slate-600 font-bold transition-colors">+</button>
                    <div className="h-px bg-slate-100 mx-2" />
                    <button className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-[5px] text-slate-600 font-bold transition-colors">-</button>
                  </div>
                </div>

                {/* Legend */}
                <div className="absolute top-8 left-8 bg-white/80 backdrop-blur-md rounded-[5px] shadow-lg border border-slate-100 p-4">
                  <h4 className="text-xs font-bold text-brand-dark mb-2">Map Legend</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-brand-primary rounded-full border-2 border-white shadow-sm" />
                      <span className="text-[10px] font-medium text-slate-600">Your Location</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-white rounded-full border-2 border-brand-primary shadow-sm" />
                      <span className="text-[10px] font-medium text-slate-600">Community Partner</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {filteredPartners.length === 0 && (
          <div className="h-64 flex flex-col items-center justify-center text-slate-400">
            <SearchIcon size={48} className="mb-4 opacity-20" />
            <p>No partners found matching your search.</p>
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowFilterModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-[5px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-brand-dark">Filter Partners</h3>
                <button onClick={() => setShowFilterModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                {/* Supply Type */}
                <div>
                  <label className="block text-sm font-bold text-brand-dark mb-4">Supply Category</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      'all', 'hygiene', 'food', 'education', 'hair care', 
                      'clothing', 'technology', 'art supplies', 'furniture'
                    ].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={cn(
                          "px-4 py-2.5 rounded-[5px] text-xs font-bold border transition-all capitalize",
                          filterType === type 
                            ? "bg-brand-primary border-brand-primary text-white shadow-none" 
                            : "bg-white border-slate-200 text-slate-600 hover:border-brand-primary/30"
                        )}
                      >
                        {type === 'all' ? 'All Supplies' : type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Radius */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-bold text-brand-dark">Search Radius</label>
                    <span className="text-sm font-bold text-brand-primary">{radius} miles</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="50" 
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-100 rounded-[5px] appearance-none cursor-pointer accent-brand-primary"
                  />
                  <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>1 mi</span>
                    <span>25 mi</span>
                    <span>50 mi</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 flex gap-4">
                <button 
                  onClick={() => {
                    setFilterType('all');
                    setRadius(50);
                  }}
                  className="flex-1 py-3 rounded-[5px] font-bold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                >
                  Reset All
                </button>
                <button 
                  onClick={() => setShowFilterModal(false)}
                  className="flex-1 py-3 bg-brand-primary hover:bg-brand-dark text-white rounded-[5px] font-bold text-sm transition-all"
                >
                  Apply Filters
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
                  <h3 className="text-xl font-bold text-brand-dark">Send Request</h3>
                  <p className="text-xs text-slate-500">
                    {isBroadcastRequest ? 'Broadcasting to all partners' : `Targeting ${selectedPartnerForRequest?.name}`}
                  </p>
                </div>
                <button onClick={() => setShowCreateRequest(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
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
                        <option value="other">Other</option>
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

                {newRequestItem === 'other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                  >
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Specify Other Item*</label>
                    <input 
                      type="text" 
                      placeholder="What item do you need?" 
                      value={newRequestOtherItem}
                      onChange={(e) => setNewRequestOtherItem(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm" 
                    />
                  </motion.div>
                )}

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
                <button onClick={() => setShowCreateRequest(false)} className="px-6 py-2.5 rounded-[5px] font-bold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all">Cancel</button>
                <button 
                  onClick={handleSubmitRequest}
                  className="px-6 py-2.5 bg-brand-primary hover:bg-brand-dark text-white rounded-[5px] font-bold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
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

// Helper component for map view
function Home({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
