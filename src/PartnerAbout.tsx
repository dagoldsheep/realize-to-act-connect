import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Globe, Heart, MapPin, Package, School, X } from 'lucide-react';
import { ConnectionRequest, User } from './types';
import { respondToRequest, cancelRequest } from './lib/requests';
import { ensureChat } from './lib/chats';
import { connectOnApprovedRequest } from './lib/connections';
import { getPublicProfile, PublicProfile } from './lib/profiles';
import { PROFILE_FIELDS, isAnswered } from './lib/profileFields';

export interface PartnerSummary {
  uid: string;
  name: string;
  avatar?: string;
}

interface PartnerAboutProps {
  partner: PartnerSummary;
  user: User;
  connections: ConnectionRequest[];
  onBack: () => void;
}

// Fields rendered in the header rather than the details list.
const HEADER_FIELDS = ['about', 'location', 'website'];

export default function PartnerAbout({ partner, user, connections, onBack }: PartnerAboutProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getPublicProfile(partner.uid)
      .then(result => { if (!cancelled) setProfile(result); })
      .catch(() => { if (!cancelled) setProfile(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [partner.uid]);

  const pendingWithPartner = connections.filter(c => c.fromId === partner.uid && c.status === 'pending');
  const received = pendingWithPartner.filter(c => c.type === 'received');
  const sent = pendingWithPartner.filter(c => c.type === 'sent');

  const handleApprove = async (conn: ConnectionRequest) => {
    await respondToRequest(conn.id, 'approved', { uid: user.id, name: user.name, avatar: user.avatar || '' });
    await ensureChat(
      user.id,
      { name: user.name, title: user.contactName || '', avatar: user.avatar },
      conn.fromId,
      { name: conn.fromName, title: '', avatar: conn.fromAvatar }
    );
    // Organizations that exchange resources are automatically connected.
    // A failure here shouldn't undo or block the approval itself.
    await connectOnApprovedRequest(
      { uid: user.id, name: user.name, avatar: user.avatar, type: user.type },
      { uid: conn.fromId, name: conn.fromName, avatar: conn.fromAvatar },
      conn.id
    ).catch(err => console.error('Auto-connect failed', err));
  };

  const name = profile?.name ?? partner.name;
  const avatar = profile?.avatar ?? partner.avatar;
  const answers = profile?.answers ?? {};
  const detailFields = PROFILE_FIELDS.filter(f => f.public && !HEADER_FIELDS.includes(f.key) && isAnswered(answers[f.key]));
  const website = typeof answers.website === 'string' ? answers.website : '';

  const renderRequest = (conn: ConnectionRequest) => (
    <div key={conn.id} className="p-6 rounded-[5px] border border-slate-100 bg-slate-50/50">
      <div className="flex justify-between items-start gap-4 mb-4">
        <span className="flex items-center gap-1.5 text-sm text-black font-semibold">
          <Package size={16} className="text-brand-primary" />
          {conn.quantity} {conn.item}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-black text-[10px] font-medium opacity-50">Pending</span>
      </div>
      {conn.description && <p className="text-sm text-slate-500 mb-6">{conn.description}</p>}
      <div className="flex gap-3">
        {conn.type === 'received' ? (
          <>
            <button
              onClick={() => handleApprove(conn)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] bg-brand-primary text-white text-sm font-bold hover:bg-brand-dark transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Check size={18} />
              Approve
            </button>
            <button
              onClick={() => respondToRequest(conn.id, 'denied')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[5px] border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <X size={18} />
              Deny
            </button>
          </>
        ) : (
          <button
            onClick={() => cancelRequest(conn.id)}
            className="flex-1 py-2.5 rounded-[5px] border border-red-100 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition-all"
          >
            Cancel Request
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-bold text-brand-primary hover:underline">
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <section className="lg:col-span-7 bg-white rounded-[5px] p-8 border border-slate-100">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-brand-secondary bg-brand-secondary/30 flex items-center justify-center flex-shrink-0">
              {avatar ? (
                <img src={avatar} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-3xl font-bold text-brand-primary">{name[0]}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-brand-dark">{name}</h1>
              <div className="space-y-1 mt-2">
                {profile && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {profile.userType === 'school' ? <School size={16} className="text-brand-primary" /> : <Heart size={16} className="text-brand-primary" />}
                    {profile.userType === 'school' ? 'School District' : 'Community Partner'}
                  </div>
                )}
                {typeof answers.location === 'string' && (
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <MapPin size={16} className="text-brand-primary" />
                    {answers.location}
                  </div>
                )}
                {website && (
                  <a
                    href={/^https?:\/\//.test(website) ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-brand-primary hover:underline truncate"
                  >
                    <Globe size={16} />
                    {website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : !profile ? (
            <p className="text-sm text-slate-400 italic">{name} hasn't filled out their About page yet.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-sm font-bold text-brand-dark mb-2">About</h2>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {typeof answers.about === 'string' ? answers.about : 'No additional information listed.'}
                </p>
              </div>
              {detailFields.map(field => {
                const answer = answers[field.key];
                return (
                  <div key={field.key}>
                    <h2 className="text-sm font-bold text-brand-dark mb-2">{field.label}</h2>
                    {Array.isArray(answer) ? (
                      <div className="flex flex-wrap gap-2">
                        {answer.map(option => (
                          <span key={option} className="px-3 py-1 rounded-full bg-brand-secondary/20 text-brand-primary text-xs font-bold">{option}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">{answer}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="lg:col-span-5 bg-white rounded-[5px] p-8 border border-slate-100 h-fit">
          <h2 className="text-lg font-bold text-brand-dark mb-2">Pending Requests</h2>
          <p className="text-sm text-slate-500 mb-6">Requests between you and {name}.</p>
          <div className="space-y-4">
            {received.map(renderRequest)}
            {sent.map(renderRequest)}
            {pendingWithPartner.length === 0 && (
              <div className="h-32 flex items-center justify-center border border-dashed border-slate-200 rounded-[5px] text-slate-400 text-sm">
                No pending requests with {name}.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
