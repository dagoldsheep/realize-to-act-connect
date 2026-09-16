import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Check, Eye, Lock, X } from 'lucide-react';
import { cn } from './lib/utils';
import { User } from './types';
import { ProfileAnswers, ProfileField, fieldsFor, isAnswered } from './lib/profileFields';
import { saveProfileSetup, skipProfileSetup } from './lib/profiles';

interface ProfileSetupProps {
  user: User;
  /** 'onboarding' is the full-page step after signup; 'edit' is the modal opened from the Profile page. */
  variant: 'onboarding' | 'edit';
  onDone: (updates: Partial<User>) => void;
  onClose?: () => void;
}

const inputClass = "w-full px-4 py-2.5 rounded-[5px] border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary text-sm";

export default function ProfileSetup({ user, variant, onDone, onClose }: ProfileSetupProps) {
  const fields = fieldsFor(user.type);
  const [answers, setAnswers] = useState<ProfileAnswers>(user.profileAnswers ?? {});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const setAnswer = (key: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [key]: value }));
  };

  const toggleOption = (key: string, option: string) => {
    const current = Array.isArray(answers[key]) ? answers[key] as string[] : [];
    setAnswer(key, current.includes(option) ? current.filter(o => o !== option) : [...current, option]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = fields.filter(f => f.required && !isAnswered(answers[f.key]));
    if (missing.length > 0) {
      setError(`Please fill out: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    setError('');
    try {
      setIsSaving(true);
      await saveProfileSetup(user, answers);
      onDone({
        profileAnswers: answers,
        setupCompletedAt: new Date().toISOString(),
        ...(typeof answers.location === 'string' && { location: answers.location }),
      });
    } catch {
      setError('Something went wrong saving your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    try {
      setIsSaving(true);
      await skipProfileSetup(user.id);
      onDone({ setupSkippedAt: new Date().toISOString() });
    } catch {
      setError('Something went wrong. Please try again.');
      setIsSaving(false);
    }
  };

  const renderField = (field: ProfileField) => {
    const value = answers[field.key];
    if (field.type === 'multiselect') {
      const selected = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {field.options?.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(field.key, option)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-[5px] text-xs font-bold border transition-all",
                selected.includes(option)
                  ? "bg-brand-primary border-brand-primary text-white"
                  : "bg-white border-slate-200 text-slate-600 hover:border-brand-primary/30"
              )}
            >
              {selected.includes(option) && <Check size={12} />}
              {option}
            </button>
          ))}
        </div>
      );
    }
    if (field.type === 'textarea') {
      return (
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => setAnswer(field.key, e.target.value)}
          placeholder={field.placeholder}
          className={cn(inputClass, "min-h-[120px]")}
        />
      );
    }
    return (
      <input
        // Plain text so "midland.org" is accepted without https:// — PartnerAbout adds the scheme when linking.
        type="text"
        inputMode={field.type === 'url' ? 'url' : undefined}
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => setAnswer(field.key, e.target.value)}
        placeholder={field.placeholder}
        className={inputClass}
      />
    );
  };

  const form = (
    <form onSubmit={handleSave} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-[5px] text-red-600 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {fields.map(field => (
        <div key={field.key}>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-sm font-semibold text-slate-700">
              {field.label}{field.required && '*'}
            </label>
            <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
              {field.public ? <><Eye size={12} /> Shown on your About page</> : <><Lock size={12} /> Private</>}
            </span>
          </div>
          {renderField(field)}
        </div>
      ))}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
        {variant === 'onboarding' ? (
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSaving}
            className="flex-1 py-3 rounded-[5px] font-bold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Skip for now
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-[5px] font-bold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 py-3 bg-brand-primary hover:bg-brand-dark text-white rounded-[5px] font-bold text-sm transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : variant === 'onboarding' ? 'Finish Setup' : 'Save About Page'}
        </button>
      </div>
    </form>
  );

  if (variant === 'edit') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative bg-white rounded-[5px] shadow-2xl w-full max-w-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-brand-dark">Edit About Page</h3>
              <p className="text-xs text-slate-500">Public answers are shown to organizations you exchange requests with.</p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">{form}</div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex justify-center p-4 sm:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
        <span className="block font-bold text-brand-primary tracking-tight text-lg mb-8">Realize To Act</span>
        <div className="bg-white rounded-[5px] p-8 border border-slate-100">
          <h1 className="text-3xl font-bold text-brand-dark mb-2">Tell Us About {user.name}</h1>
          <p className="text-slate-500 mb-8">
            This sets up your About page, so {user.type === 'school' ? 'community partners' : 'schools'} reviewing your requests know who they're working with. You can edit it any time from your profile.
          </p>
          {form}
        </div>
      </motion.div>
    </div>
  );
}
