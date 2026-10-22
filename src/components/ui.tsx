import { type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type SpotArt, SpotIllustration } from '@/components/illustrations';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { GoalStatus } from '@/lib/stats';

/** Scrollable, centered page column. `tabs` adds room for the native tab bar. */
export function Screen({ children, tabs = false }: PropsWithChildren<{ tabs?: boolean }>) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={tabs ? ['top'] : []} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.screen, { paddingBottom: Spacing.six + (tabs ? BottomTabInset : 0) }]}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }, style]}>
      {children}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="heading">{title}</ThemedText>
      {action}
    </View>
  );
}

export function Row({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.row, style]}>{children}</View>;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = 'primary', disabled, loading, small, style }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const color = isPrimary ? theme.onTint : variant === 'danger' ? theme.critical : variant === 'ghost' ? theme.tint : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        {
          backgroundColor: isPrimary
            ? pressed
              ? theme.tintPressed
              : theme.tint
            : variant === 'secondary'
              ? theme.backgroundSelected
              : 'transparent',
          opacity: disabled ? 0.5 : pressed && !isPrimary ? 0.7 : 1,
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <ThemedText type={small ? 'small' : 'smallBold'} style={{ color, fontWeight: 700 }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textMuted}
        style={[
          styles.input,
          { color: theme.text, backgroundColor: theme.background, borderColor: theme.border },
          style,
        ]}
        {...props}
      />
    </View>
  );
}

/** Segmented control for picking one of a few options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.backgroundSelected }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'} style={{ fontWeight: 700 }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}
      style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
      <View style={[styles.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: theme.tint }]} />
    </View>
  );
}

const STATUS: Record<GoalStatus, { icon: string; label: string; color: 'good' | 'warning' | 'critical' | 'textMuted' }> = {
  done: { icon: '✓', label: 'Done', color: 'good' },
  ahead: { icon: '▲', label: 'Ahead', color: 'good' },
  'on-track': { icon: '●', label: 'On track', color: 'good' },
  behind: { icon: '▼', label: 'Behind', color: 'warning' },
  overdue: { icon: '!', label: 'Overdue', color: 'critical' },
  'no-deadline': { icon: '○', label: 'No deadline', color: 'textMuted' },
};

/** Status is always icon + label; color only reinforces it. */
export function StatusBadge({ status }: { status: GoalStatus }) {
  const theme = useTheme();
  const s = STATUS[status];
  return (
    <View style={[styles.badge, { borderColor: theme.border }]}>
      <ThemedText type="caption" style={{ color: theme[s.color] }}>
        {s.icon}
      </ThemedText>
      <ThemedText type="caption">{s.label}</ThemedText>
    </View>
  );
}

export function Pill({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.tint }]}>
      <ThemedText type="caption" style={{ color: theme.onTint, fontWeight: 700 }}>
        {label}
      </ThemedText>
    </View>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card style={styles.stat}>
      <ThemedText type="caption" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="stat">{value}</ThemedText>
      {hint ? (
        <ThemedText type="caption" themeColor="textMuted">
          {hint}
        </ThemedText>
      ) : null}
    </Card>
  );
}

/** Empty-state message; `art` adds a small picture above it. */
export function Empty({ children, art }: PropsWithChildren<{ art?: SpotArt }>) {
  if (!art) {
    return (
      <ThemedText type="small" themeColor="textMuted" style={{ paddingVertical: Spacing.two }}>
        {children}
      </ThemedText>
    );
  }
  return (
    <View style={styles.emptyArt}>
      <SpotIllustration art={art} />
      <ThemedText type="small" themeColor="textMuted" style={{ textAlign: 'center', maxWidth: 360 }}>
        {children}
      </ThemedText>
    </View>
  );
}

export function Loading() {
  return <ActivityIndicator style={{ padding: Spacing.four }} />;
}

export function ErrorText({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : String((error as { message?: string }).message ?? error);
  return (
    <ThemedText type="small" themeColor="critical">
      {message}
    </ThemedText>
  );
}

/** Yes/no confirmation that works on web too (React Native's Alert is a no-op there). */
export function confirm(title: string, message: string, confirmLabel = 'Delete'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** Parses "72,5" or "72.5"; returns null for anything that isn't a positive-or-zero number. */
export function parseNumber(text: string): number | null {
  const value = Number(text.trim().replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(value) && value >= 0 ? value : null;
}

const styles = StyleSheet.create({
  screen: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    borderRadius: Radius.large,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: {
    minHeight: 32,
    paddingHorizontal: Spacing.two,
  },
  // Grows to share a Row's width but keeps its natural height in a column.
  field: {
    gap: Spacing.one,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  input: {
    width: '100%',
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two + Spacing.one,
    fontSize: 16,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: Radius.medium,
    padding: Spacing.half,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Radius.small + 2,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  pill: {
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  stat: {
    flex: 1,
    minWidth: 140,
    gap: Spacing.half,
  },
  emptyArt: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
});
