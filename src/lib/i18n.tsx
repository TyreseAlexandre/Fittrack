import '@/lib/local-storage';

import { createContext, type PropsWithChildren, use, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import type { ISODate, Suggestion } from '@/lib/stats';
import { en, type Strings } from '@/lib/translations/en';
import { pt } from '@/lib/translations/pt';
import type { Exercise, Goal, MuscleGroup } from '@/lib/types';

export type Language = 'en' | 'pt';

export const LANGUAGES: { value: Language; label: string; name: string }[] = [
  { value: 'en', label: 'EN', name: 'English' },
  { value: 'pt', label: 'PT', name: 'Português' },
];

const DICTIONARIES: Record<Language, Strings> = { en, pt };
const STORAGE_KEY = 'fittrack.language';

function deviceLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return 'en-US';
  }
}

/** The saved choice, else the device language when we have it, else English. */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'pt') return saved;
  } catch {
    // Storage can be unavailable (private browsing); fall through to the device language.
  }
  return deviceLocale().toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

/** Dates and numbers follow the device's regional variant when it matches the chosen language. */
function localeFor(language: Language): string {
  const device = deviceLocale();
  if (device.toLowerCase().startsWith(language)) return device;
  return language === 'pt' ? 'pt-PT' : 'en-US';
}

function createI18n(language: Language, setLanguage: (language: Language) => void) {
  const t = DICTIONARIES[language];
  const locale = localeFor(language);
  const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  const formatNumber = (value: number) => numberFormat.format(value);
  const formatKg = (value: number) => `${formatNumber(value)} kg`;
  const formatDay = (date: ISODate, withYear = false) => {
    const [y, m, d] = date.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      ...(withYear ? { year: 'numeric' } : {}),
    });
  };
  /** Built-in exercises are stored in English; custom ones keep the name the user typed. */
  const exerciseName = (exercise: Pick<Exercise, 'name' | 'user_id'> | undefined) =>
    !exercise ? t.common.exercise : exercise.user_id === null ? (t.exerciseNames[exercise.name] ?? exercise.name) : exercise.name;
  const muscleGroup = (group: MuscleGroup) => t.muscleGroups[group];
  /** "60 kg × 9 reps", or "9 reps" for bodyweight moves. */
  const suggestionTarget = (s: Suggestion) => `${s.weightKg > 0 ? `${formatKg(s.weightKg)} × ` : ''}${t.workout.reps(s.reps)}`;
  const suggestionReason = ({ reason }: Suggestion) =>
    reason.type === 'add-weight'
      ? t.suggestion.addWeight(reason.minReps, formatNumber(reason.step))
      : reason.type === 'beat-weakest'
        ? t.suggestion.beatWeakest
        : t.suggestion.addRep;
  /** Titles are rebuilt from the goal itself so they follow the current language. */
  const goalTitle = (goal: Goal, exercise?: Exercise) =>
    goal.type === 'weight'
      ? t.goals.titles.weight(formatKg(goal.target_value))
      : goal.type === 'lift'
        ? t.goals.titles.lift(exercise ? exerciseName(exercise) : goal.title.split(':')[0], formatKg(goal.target_value))
        : t.goals.titles.consistency(goal.target_value);

  return {
    language,
    setLanguage,
    t,
    locale,
    formatNumber,
    formatKg,
    formatDay,
    exerciseName,
    muscleGroup,
    suggestionTarget,
    suggestionReason,
    goalTitle,
  };
}

export type I18n = ReturnType<typeof createI18n>;

const I18nContext = createContext<I18n>(createI18n('en', () => {}));

export function I18nProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const value = useMemo(
    () =>
      createI18n(language, (next) => {
        setLanguageState(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Not saved; the choice still applies until the app restarts.
        }
      }),
    [language],
  );

  useEffect(() => {
    if (Platform.OS === 'web') document.documentElement.lang = language;
  }, [language]);

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  return use(I18nContext);
}
