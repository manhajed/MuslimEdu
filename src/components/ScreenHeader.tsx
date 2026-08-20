import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

/**
 * The "Apple-like" screen header: a lone circular back button on its own
 * row, then a big bold title (+ optional caption) below it - no bordered
 * header bar, no small inline title next to the back button. Reference:
 * SchoolRegistrationScreen's header/titleBlock/progressTrack.
 *
 * Meant for flat list/detail screens. Multi-step forms already have their
 * own established chrome (WizardShell) and are out of scope here.
 */
export default function ScreenHeader({
  title,
  caption,
  onBack,
  rightAction,
  ink = '#1C1C1E',
  subtle = '#8A9099',
  backBg = '#FFFFFF',
}: {
  title: string;
  caption?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  ink?: string;
  subtle?: string;
  backBg?: string;
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View>
      <View style={[styles.row, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: backBg }]}
          onPress={onBack ?? (() => navigation.goBack())}
          hitSlop={10}
        >
          <ChevronLeft size={22} color={ink} strokeWidth={2.1} />
        </TouchableOpacity>
        {rightAction ? <View style={styles.rightSlot}>{rightAction}</View> : null}
      </View>

      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: ink }]} numberOfLines={2}>
          {title}
        </Text>
        {caption ? <Text style={[styles.caption, { color: subtle }]}>{caption}</Text> : null}
      </View>
    </View>
  );
}

// A thin segmented progress bar - Apple onboarding-style step indicator,
// same visual as SchoolRegistrationScreen's progressTrack. Kept separate
// from ScreenHeader itself since only wizard-flavored flat screens need it.
export function HeaderProgressTrack({
  total,
  current,
  accent = '#1FAE64',
  track = '#E4E7EB',
}: {
  total: number;
  current: number;
  accent?: string;
  track?: string;
}) {
  return (
    <View style={styles.progressTrack}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[styles.progressSegment, { backgroundColor: i < current ? accent : track }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 4 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1F14',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  rightSlot: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  titleBlock: { paddingHorizontal: 20, marginTop: 10 },
  title: { fontSize: 26, fontWeight: '800' },
  caption: { fontSize: 14, marginTop: 6 },

  progressTrack: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 18, marginBottom: 4 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
});
