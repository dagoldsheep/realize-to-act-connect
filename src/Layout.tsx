import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Users, MessageSquare, 
  FileText, Bell, Menu, X, LogOut, User as UserIcon, Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, timeAgo } from './lib/utils';
import { Connection, ConnectionRequest, User } from './types';
import { subscribeToConnections } from './lib/connections';

interface LayoutProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  actionsNeededRead: boolean;
  setActionsNeededRead: (read: boolean) => void;
  connections: ConnectionRequest[];
  children: React.ReactNode;
}

export default function Layout({
  user, activeTab, setActiveTab, onLogout,
  actionsNeededRead, setActionsNeededRead,
  connections,
  children
}: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [partnerConnections, setPartnerConnections] = useState<Connection[]>([]);

  useEffect(() => subscribeToConnections(user.id, setPartnerConnections), [user.id]);

  // Built from live requests and connections rather than a fixed list.
  const notifications = [
    ...partnerConnections
      .filter(c => c.status === 'pending' && c.direction === 'incoming')
      .map(c => ({
        id: `conn-${c.id}`,
        title: 'New Connection Request',
        text: `${c.partnerName} wants to connect`,
        timestamp: c.timestamp,
        tab: 'requests',
      })),
    ...connections
      .filter(c => c.type === 'received' && c.status === 'pending')
      .map(c => ({
        id: `req-${c.id}`,
        title: 'New Resource Request',
        text: `${c.fromName} requested ${c.quantity} ${c.item}`,
        timestamp: c.timestamp,
        tab: 'requests',
      })),
    ...connections
      .filter(c => c.type === 'sent' && c.status === 'approved')
      .map(c => ({
        id: `approved-${c.id}`,
        title: 'Request Approved',
        text: `${c.fromName} approved your request for ${c.quantity} ${c.item}`,
        timestamp: c.timestamp,
        tab: 'messages',
      })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'search', label: 'Search', icon: Search },
    { id: 'requests', label: 'Requests', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto w-full h-full flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-[5px] transition-colors"
            >
              <Menu size={20} className="text-brand-dark" />
            </button>
            <span className="font-bold text-brand-dark uppercase tracking-wider text-sm">Menu</span>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors relative"
            >
              <Bell size={20} className="text-brand-primary" />
              {!actionsNeededRead && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-primary rounded-full border-2 border-white" />
              )}
            </button>
            <button 
              onClick={() => {
                if (activeTab === 'profile') {
                  setActiveTab('dashboard');
                } else {
                  setActiveTab('profile');
                }
              }}
              className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 hover:ring-2 hover:ring-brand-primary/20 transition-all bg-brand-secondary/30 flex items-center justify-center"
            >
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xs font-bold text-brand-primary">{user.name[0]}</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ x: isSidebarOpen ? 0 : -300 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="fixed top-0 left-0 bottom-0 w-64 bg-white shadow-none border-r border-slate-100 z-50 flex flex-col"
        >
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <a 
              href="https://www.realizetoact.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-bold text-brand-primary tracking-tight text-sm hover:underline"
            >
              Realize To Act
            </a>
            <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-[5px] font-bold transition-all",
                  activeTab === item.id 
                    ? "bg-brand-secondary text-brand-primary" 
                    : "text-brand-dark hover:bg-slate-50"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-[5px] font-bold text-brand-dark hover:bg-slate-50 transition-all"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </motion.aside>

        {/* Notifications Sidebar */}
        <AnimatePresence>
          {isNotificationsOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setIsNotificationsOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
              />
              <motion.aside
                initial={{ x: 400 }}
                animate={{ x: 0 }}
                exit={{ x: 400 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white shadow-none border-l border-slate-100 z-50 flex flex-col"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-brand-dark">Your Notifications</h3>
                  <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <p className="text-sm text-slate-500 mb-6">Keep track of your latest activity</p>

                  {notifications.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => {
                        setActionsNeededRead(true);
                        setActiveTab(note.tab);
                        setIsNotificationsOpen(false);
                      }}
                      className={cn(
                        "p-4 rounded-[5px] border cursor-pointer transition-all",
                        actionsNeededRead
                          ? "border-slate-100 bg-white"
                          : "border-brand-primary/20 bg-brand-secondary/30"
                      )}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-bold text-brand-dark flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                          {note.title}
                        </span>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(note.timestamp)}</span>
                      </div>
                      <p className="text-sm text-slate-600">{note.text}</p>
                    </div>
                  ))}

                  {notifications.length === 0 && (
                    <div className="h-32 flex items-center justify-center border border-dashed border-slate-200 rounded-[5px] text-slate-400 text-sm">
                      You have no notifications yet.
                    </div>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 px-4 py-12 lg:px-8 lg:py-16 overflow-y-auto max-w-[1400px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
