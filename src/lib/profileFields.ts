// Questions asked during profile setup (src/ProfileSetup.tsx), modeled on the
// Tally intake form. Answers are saved by src/lib/profiles.ts: every answer is
// kept on the owner's private "users/{uid}" doc, and only fields marked
// `public: true` are copied to "publicProfiles/{uid}", which is what other
// organizations see on the About page (src/PartnerAbout.tsx).
//
// To add, remove, or reword a question, edit this list — the setup form and
// the About page both render from it.

import { UserType } from '../types';

export type ProfileAnswer = string | string[];
export type ProfileAnswers = Record<string, ProfileAnswer>;

export interface ProfileField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'url' | 'multiselect';
  public: boolean;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  /** Limit the question to one organization type; omit to ask everyone. */
  appliesTo?: UserType;
}

export const RESOURCE_CATEGORIES = [
  'Hygiene', 'Nonperishable Food', 'School Supplies', 'Hair Care',
  'Clothing', 'Technology', 'Art Supplies', 'Furniture',
];

export const PROFILE_FIELDS: ProfileField[] = [
  {
    key: 'about',
    label: 'About your organization',
    type: 'textarea',
    public: true,
    required: true,
    placeholder: 'Your mission and the community you serve...',
  },
  {
    key: 'location',
    label: 'City & State',
    type: 'text',
    public: true,
    required: true,
    placeholder: 'Cincinnati, OH',
  },
  {
    key: 'website',
    label: 'Website',
    type: 'url',
    public: true,
    placeholder: 'www.yourorganization.org',
  },
  {
    key: 'resourcesNeeded',
    label: 'Resources your students need',
    type: 'multiselect',
    public: true,
    options: RESOURCE_CATEGORIES,
    appliesTo: 'school',
  },
  {
    key: 'gradeLevels',
    label: 'Grade levels served',
    type: 'multiselect',
    public: true,
    options: ['Elementary', 'Middle School', 'High School'],
    appliesTo: 'school',
  },
  {
    key: 'studentsServed',
    label: 'Approximate number of students',
    type: 'text',
    public: true,
    placeholder: '1,200',
    appliesTo: 'school',
  },
  {
    key: 'resourcesProvided',
    label: 'Resources you can provide',
    type: 'multiselect',
    public: true,
    options: RESOURCE_CATEGORIES,
    appliesTo: 'community-partner',
  },
  {
    key: 'serviceArea',
    label: 'Area you serve',
    type: 'text',
    public: true,
    placeholder: 'Hamilton County and Northern Kentucky',
    appliesTo: 'community-partner',
  },
  {
    key: 'ein',
    label: '501(c)(3) EIN',
    type: 'text',
    public: false,
    placeholder: '12-3456789',
    appliesTo: 'community-partner',
  },
  {
    key: 'contactTitle',
    label: 'Your role / title',
    type: 'text',
    public: false,
    placeholder: 'Family Resource Coordinator',
  },
  {
    key: 'referralSource',
    label: 'How did you hear about Realize to Act?',
    type: 'text',
    public: false,
  },
];

export function fieldsFor(userType: UserType): ProfileField[] {
  return PROFILE_FIELDS.filter((field) => !field.appliesTo || field.appliesTo === userType);
}

export function isAnswered(answer: ProfileAnswer | undefined): boolean {
  return Array.isArray(answer) ? answer.length > 0 : !!answer?.trim();
}
