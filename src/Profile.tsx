import React, { useState } from 'react';
import { 
  User as UserIcon, MapPin, Mail, Edit3, 
  Users, MessageSquare, Activity, Bell, 
  Lock, Trash2, LogOut, Check, Plus, MailCheck, X
} from 'lucide-react';
import { cn } from './lib/utils';
import { User, ConnectionRequest } from './types';
import ProfileSetup from './ProfileSetup';

interface ProfileProps {
  user: User;
  onLogout: () => void;
  connections: ConnectionRequest[];
  onUpdateUser: (user: User) => void;
}

export default function Profile({ user, onLogout, connections, onUpdateUser }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState<string | null>(null);
  const [isEditingAboutPage, setIsEditingAboutPage] = useState(false);
  const [about, setAbout] = useState('');
  const [dropOffLocation, setDropOffLocation] = useState(user.dropOffLocation || '');
  const [allowAvailabilityView, setAllowAvailabilityView] = useState(true);
  const [availabilitySlots, setAvailabilitySlots] = useState(user.availability || []);
  const [needDropOffAssistance, setNeedDropOffAssistance] = useState(user.needDropOffAssistance || false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [teamMembers, setTeamMembers] = useState([
    { email: user.email, role: 'Owner', isPrimary: true, status: 'Active' },
    { email: 'admin@school.edu', role: 'Admin', isPrimary: false, status: 'Invited' }
  ]);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    weekly: true
  });

  const stats = [
    { label: 'Connection Requests', value: connections.filter(c => c.status === 'pending').length.toString(), icon: Users },
    { label: 'Sent Messages', value: '12', icon: MessageSquare }, // Mocked for now as we don't track total sent messages globally
    { label: 'Active Connections', value: connections.filter(c => c.status === 'approved').length.toString(), icon: Activity },
  ];

  const toggleSlot = (dayIndex: number, slot: string) => {
    if (!isEditing) return;
    setAvailabilitySlots(prev => prev.map((day, idx) => {
      if (idx === dayIndex) {
        const hasSlot = day.slots.includes(slot);
        return {
          ...day,
          slots: hasSlot ? day.slots.filter(s => s !== slot) : [...day.slots, slot].sort()
        };
      }
      return day;
    }));
  };

  const allPossibleSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
  ];

  const handleSaveProfile = () => {
    onUpdateUser({
      ...user,
      dropOffLocation,
      availability: availabilitySlots,
      needDropOffAssistance
    });
    setIsEditing(false);
  };

  const handleToggleRequest = () => {
    if (!isEditing || isSendingRequest) return;
    
    if (needDropOffAssistance) {
      // Cancel request
      setNeedDropOffAssistance(false);
    } else {
      // Send request
      setIsSendingRequest(true);
      setTimeout(() => {
        setIsSendingRequest(false);
        setNeedDropOffAssistance(true);
      }, 1500);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-brand-dark mb-2">Your Profile</h1>
        <p className="text-slate-500">Manage your account information and setting preferences.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column - Personal Info */}
        <div className="lg:col-span-5 space-y-8">
          <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-lg font-bold text-brand-dark">Personal Information</h2>
              <button 
                onClick={() => {
                  if (isEditing) {
                    handleSaveProfile();
                  } else {
                    setIsEditing(true);
                  }
                }}
                className="text-brand-primary font-bold text-sm hover:underline"
              >
                {isEditing ? 'Save Profile' : 'Edit Profile'}
              </button>
            </div>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-brand-secondary">
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brand-dark">{user.name}</h3>
                <div className="space-y-1 mt-2">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin size={16} className="text-brand-primary" />
                    {user.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <UserIcon size={16} className="text-brand-primary" />
                    {user.contactName}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Mail size={16} className="text-brand-primary" />
                    {user.email}
                  </div>
                  {user.type === 'school' && (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <MapPin size={16} className="text-brand-primary" />
                      <span className="font-medium">Drop-off:</span> {user.dropOffLocation || 'Not specified'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {user.type === 'school' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-brand-dark mb-2">Drop-off Location Specification</h4>
                    {isEditing ? (
                      <input 
                        type="text"
                        value={dropOffLocation}
                        onChange={(e) => setDropOffLocation(e.target.value)}
                        placeholder="e.g., Main Entrance, Reception Desk, Room 102..."
                        className="w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                      />
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-[5px] border border-slate-100">
                        <MapPin size={16} className="text-brand-primary" />
                        {dropOffLocation || 'No drop-off location specified.'}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">Specify where community partners should drop off donations in the building.</p>
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-sm font-bold text-brand-dark mb-2">About</h4>
                {isEditing ? (
                  <textarea 
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    placeholder="Add organization mission statement..."
                    className="w-full px-4 py-3 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 min-h-[100px]"
                  />
                ) : (
                  <p className="text-sm text-slate-400 italic">{about || 'No additional information listed.'}</p>
                )}
              </div>

              <div className="p-4 bg-brand-secondary/10 rounded-[5px] border border-brand-secondary/20 flex items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-brand-dark block">Your About Page</span>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {user.setupCompletedAt
                      ? 'What organizations see when they open your profile from a request.'
                      : "You haven't set up your About page yet."}
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingAboutPage(true)}
                  className="px-4 py-2 rounded-[5px] bg-brand-primary text-white text-xs font-bold hover:bg-brand-dark transition-all whitespace-nowrap"
                >
                  {user.setupCompletedAt ? 'Edit About Page' : 'Set Up'}
                </button>
              </div>

              <div>
                <h4 className="text-sm font-bold text-brand-dark mb-2">Drop-off Availability</h4>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  By indicating drop-off availability, it makes it easier to schedule times to meet with community partners to accept exchange resources.
                </p>
                
                <div className={cn(
                  "border border-slate-100 rounded-[5px] overflow-hidden transition-all duration-500",
                  needDropOffAssistance && "opacity-40 grayscale-[0.5] pointer-events-none scale-[0.98] origin-top"
                )}>
                  <div className="grid grid-cols-5 bg-slate-50 border-b border-slate-100">
                    {availabilitySlots.map(a => (
                      <div key={a.day} className="py-2 text-center text-[10px] font-bold text-slate-400">{a.day}</div>
                    ))}
                  </div>
                  <div className={cn(
                    "grid grid-cols-5 overflow-y-auto transition-all duration-500",
                    needDropOffAssistance ? "h-32" : "h-64"
                  )}>
                    {availabilitySlots.map((a, i) => (
                      <div key={i} className="border-r border-slate-50 last:border-0 p-1 space-y-1">
                        {allPossibleSlots.map(slot => {
                          const isSelected = a.slots.includes(slot);
                          return (
                            <div 
                              key={slot} 
                              onClick={() => !needDropOffAssistance && toggleSlot(i, slot)}
                              className={cn(
                                "h-10 rounded-[5px] flex items-center justify-center text-[10px] font-bold transition-all cursor-default",
                                isEditing 
                                  ? isSelected 
                                    ? "border border-slate-100 text-slate-400 bg-white" 
                                    : "border-2 border-dashed border-slate-200 text-slate-300 hover:border-brand-primary/30"
                                  : isSelected 
                                    ? "border border-slate-200 text-slate-700 bg-white hover:bg-slate-50" 
                                    : "bg-transparent"
                              )}
                            >
                              {isSelected ? slot : (isEditing && slot)}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                
                {isEditing && !needDropOffAssistance && (
                  <div className="mt-6">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setAllowAvailabilityView(!allowAvailabilityView)}
                        className={cn(
                          "w-5 h-5 rounded flex items-center justify-center transition-colors",
                          allowAvailabilityView ? "bg-brand-primary" : "border-2 border-slate-200 bg-white"
                        )}
                      >
                        {allowAvailabilityView && <Check size={14} className="text-white" />}
                      </button>
                      <span className="text-sm font-bold text-brand-dark">Allow your connections to view your availability</span>
                    </div>
                  </div>
                )}

                <div className="mt-8 pt-8 border-t border-slate-100">
                  <div className="p-4 bg-brand-secondary/10 rounded-[5px] border border-brand-secondary/20">
                    <div className="space-y-4">
                      <div>
                        <span className="text-sm font-bold text-brand-dark block">I need drop-off assistance</span>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Indicate if you are unable to drop off at all and need assistance from the <span className="text-brand-primary font-bold">Realize to Act team</span>. 
                          Request will be sent through the platform.
                        </p>
                      </div>
                      <div className="flex justify-start">
                        <button 
                          onClick={handleToggleRequest}
                          disabled={!isEditing || isSendingRequest}
                          className={cn(
                            "w-full py-2.5 rounded-[5px] font-bold text-xs transition-all flex items-center justify-center gap-2",
                            needDropOffAssistance 
                              ? isEditing 
                                ? "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100" 
                                : "bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default" 
                              : isEditing
                                ? "bg-brand-primary text-white hover:bg-brand-dark hover:scale-[1.02] active:scale-[0.98]"
                                : "bg-slate-100 text-slate-400 cursor-default opacity-70"
                          )}
                        >
                          {isSendingRequest ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending...
                            </>
                          ) : needDropOffAssistance ? (
                            isEditing ? (
                              "Cancel Request"
                            ) : (
                              <>
                                <Check size={14} />
                                Request Sent
                              </>
                            )
                          ) : (
                            "Send Request"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Right Column - Stats & Settings */}
        <div className="lg:col-span-7 space-y-8">
          <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
            <h2 className="text-lg font-bold text-brand-dark mb-2">Account Overview</h2>
            <p className="text-sm text-slate-500 mb-8">An overview of your account activity and engagement.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div key={stat.label} className="p-6 rounded-lg bg-brand-secondary/20 relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-bold text-brand-dark">
                        {stat.label}
                      </span>
                      <stat.icon size={18} className="text-brand-primary" />
                    </div>
                    <span className="text-3xl font-bold text-brand-dark">{stat.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-brand-dark">Team Management</h2>
                <p className="text-sm text-slate-500">Manage who can access and manage this account.</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-[5px] bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-secondary flex items-center justify-center text-brand-primary text-xs font-bold">
                      {member.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-brand-dark">{member.email}</p>
                      <p className="text-[10px] text-slate-500">{member.role} {member.isPrimary && '• Primary'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.status === 'Invited' && (
                      <div className="px-3 py-1 bg-slate-100 text-slate-400 text-[10px] font-bold rounded-full flex items-center gap-1.5 cursor-not-allowed opacity-70">
                        <MailCheck size={12} />
                        Awaiting response...
                      </div>
                    )}
                    {!member.isPrimary && (
                      <button 
                        onClick={() => setTeamMembers(prev => prev.filter((_, i) => i !== idx))}
                        className="p-1 text-red-500 hover:text-red-700 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input 
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Enter email address..."
                className="flex-1 px-4 py-2 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-sm"
              />
              <button 
                onClick={() => {
                  if (newMemberEmail && !teamMembers.find(m => m.email === newMemberEmail)) {
                    setTeamMembers(prev => [...prev, { email: newMemberEmail, role: 'Admin', isPrimary: false, status: 'Invited' }]);
                    setNewMemberEmail('');
                  }
                }}
                className="px-4 py-2 bg-brand-primary text-white rounded-[5px] font-bold text-sm hover:bg-brand-dark transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          </section>

          <section className="bg-white rounded-[5px] p-8 shadow-none border border-slate-100">
            <h2 className="text-lg font-bold text-brand-dark mb-8">Account Settings</h2>
            
            <div className="space-y-2">
              <button 
                onClick={() => setShowSettingsModal('notifications')}
                className="w-full flex items-center justify-between p-4 rounded-[5px] hover:bg-slate-50 transition-all text-left"
              >
                <span className="text-sm font-medium text-slate-700">Notification Preferences</span>
                <Bell size={18} className="text-slate-400" />
              </button>
              <button 
                onClick={() => setShowSettingsModal('password')}
                className="w-full flex items-center justify-between p-4 rounded-[5px] hover:bg-slate-50 transition-all text-left"
              >
                <span className="text-sm font-medium text-slate-700">Change Password</span>
                <Lock size={18} className="text-slate-400" />
              </button>
              <button 
                onClick={() => setShowSettingsModal('delete')}
                className="w-full flex items-center justify-between p-4 rounded-[5px] hover:bg-red-50 transition-all text-left group"
              >
                <span className="text-sm font-medium text-red-500">Delete Account</span>
                <Trash2 size={18} className="text-red-400 group-hover:text-red-500" />
              </button>
              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-between p-4 rounded-[5px] hover:bg-slate-50 transition-all text-left"
              >
                <span className="text-sm font-bold text-brand-dark">Log out</span>
                <LogOut size={18} className="text-brand-primary" />
              </button>
            </div>
          </section>
        </div>
      </div>

      {isEditingAboutPage && (
        <ProfileSetup
          user={user}
          variant="edit"
          onDone={(updates) => {
            onUpdateUser({ ...user, ...updates });
            setIsEditingAboutPage(false);
          }}
          onClose={() => setIsEditingAboutPage(false)}
        />
      )}

      {/* Settings Modals */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowSettingsModal(null)}
          />
          <div className="relative bg-white rounded-[5px] w-full max-w-md p-8 animate-in zoom-in duration-200">
            {showSettingsModal === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-brand-dark">Notification Preferences</h3>
                <div className="space-y-4">
                  {[
                    { id: 'email', label: 'Email Notifications', subtext: 'Receive updates via your email address' },
                    { id: 'push', label: 'Push Notifications', subtext: 'Receive real-time alerts on your device' },
                    { id: 'sms', label: 'SMS Alerts', subtext: 'Receive text messages for updates on recent chats' },
                    { id: 'weekly', label: 'Weekly Reports', subtext: 'Get a summary of your weekly activity' }
                  ].map(pref => (
                    <div key={pref.label} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-700 block">{pref.label}</span>
                        <span className="text-xs text-slate-500">{pref.subtext}</span>
                      </div>
                      <div 
                        onClick={() => setNotifications(prev => ({ ...prev, [pref.id]: !prev[pref.id as keyof typeof notifications] }))}
                        className={cn(
                          "w-10 h-5 rounded-full relative cursor-pointer transition-colors",
                          notifications[pref.id as keyof typeof notifications] ? "bg-brand-primary" : "bg-slate-200"
                        )}
                      >
                        <div className={cn(
                          "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all",
                          notifications[pref.id as keyof typeof notifications] ? "right-0.5" : "left-0.5"
                        )} />
                      </div>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => setShowSettingsModal(null)}
                  className="w-full py-3 bg-brand-primary text-white rounded-[5px] font-bold hover:bg-brand-dark transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Save Preferences
                </button>
              </div>
            )}

            {showSettingsModal === 'password' && (
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-brand-dark">Change Password</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Current Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20" />
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettingsModal(null)}
                  className="w-full py-3 bg-brand-primary text-white rounded-[5px] font-bold hover:bg-brand-dark transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Update Password
                </button>
              </div>
            )}

            {showSettingsModal === 'delete' && (
              <div className="space-y-6">
                <div className="flex items-center justify-center mx-auto">
                  <Trash2 className="text-red-600" size={48} />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-brand-dark">Delete Account</h3>
                  <p className="text-sm text-slate-500 mt-2">Are you sure you want to delete your account? This action cannot be undone.</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowSettingsModal(null)}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-[5px] font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      setShowSettingsModal(null);
                      onLogout();
                    }}
                    className="flex-1 py-3 bg-red-500 text-white rounded-[5px] font-bold hover:bg-red-600 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
