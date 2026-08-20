import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Award, ChevronLeft } from 'lucide-react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import {
  fetchStudentQuarterlyReport,
  QuarterlyReportResponse,
  QuarterlySubjectRow,
} from '../../services/studentAcademicService';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import { BRAND, COLORS, RADIUS, SHADOW } from '../../theme/glass';

const EMERALD = COLORS.emerald;
const INK = COLORS.ink;
const SUBTLE = COLORS.subtle;
const HAIRLINE = COLORS.border;
const CANVAS = COLORS.canvas;
const WHITE = '#FFFFFF';
const FAINT = 'rgba(255,255,255,0.72)';
const HERO_GLASS_BG = 'rgba(255,255,255,0.16)';
const HERO_GLASS_BORDER = 'rgba(255,255,255,0.28)';
const AMBER = '#92400E';
const AMBER_SOFT = 'rgba(217,158,26,0.16)';

// Same parallax hero technique as PrayerTimesDetailScreen / the student and
// teacher list screens: a separate gradient Animated layer sits behind the
// scroll content, travels at half speed and fades out, while the header +
// hero stat row (inside the scroll content) scrolls away at normal speed
// and a rounded canvas body panel rides up over it.
const HERO_HEIGHT = 210;
const PARALLAX_FACTOR = 0.5;

// Deterministic per-subject accent, same hash+palette idea as the student
// list's per-section coloring - each subject always reads the same color.
const SUBJECT_PALETTE = ['#0A84FF', '#8B5CF6', '#FF6B81', '#0EA5E9', '#D4A64A', '#FF9F0A', '#34C759', '#5E5CE6'];
function colorForSubject(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length];
}

function ChevronLeftIcon({ color }: { color: string }) {
  return <ChevronLeft size={20} color={color} strokeWidth={2.4} />;
}

function SubjectReportCard({ subject }: { subject: QuarterlySubjectRow }) {
  const accent = colorForSubject(subject.subject_name ?? String(subject.subject_id));
  const quarters: Array<{ label: string; value: number | null }> = [
    { label: 'Q1', value: subject.q1 },
    { label: 'Q2', value: subject.q2 },
    { label: 'Q3', value: subject.q3 },
    { label: 'Q4', value: subject.q4 },
  ];
  return (
    <View style={[styles.subjectCard, { borderLeftColor: accent }]}>
      <View style={styles.subjectHeaderRow}>
        <Text style={styles.subjectName} numberOfLines={1}>
          {subject.subject_name ?? '—'}
        </Text>
        <View style={[styles.avgPill, { backgroundColor: `${accent}1A` }]}>
          <Text style={[styles.avgPillText, { color: accent }]}>
            {subject.avg != null ? subject.avg.toFixed(1) : '—'}
          </Text>
        </View>
      </View>
      <View style={styles.quarterRow}>
        {quarters.map((q) => (
          <View key={q.label} style={styles.quarterCell}>
            <Text style={styles.quarterCellLabel}>{q.label}</Text>
            <Text style={[styles.quarterCellValue, q.value == null && styles.quarterCellValueEmpty]}>
              {q.value ?? '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Student's own quarterly report card - general average, an Honors badge
 * when their average lands in a band the school's Quarterly grading
 * system flagged honors_eligible (see GradingSystemWizardScreen), and a
 * per-subject Q1-Q4 breakdown pulled from whatever exam categories the
 * admin tagged as quarters (AdminExamCategoriesScreen / TeacherGradebook).
 */
export default function StudentQuarterlyReportScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { token } = useAuth();
  const { t } = useLocale();

  const [report, setReport] = useState<QuarterlyReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;
  const [heroHeight, setHeroHeight] = useState(HERO_HEIGHT);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await fetchStudentQuarterlyReport(token);
      setReport(data);
    } catch (err) {
      // A bare "Request failed (5xx)" reads as a broken app to a student -
      // the underlying cause is server-side (no message body on that
      // response), so this is worded as "try again" rather than implying
      // something they did was wrong.
      setError(
        t(
          'student_quarterly_report.load_error',
          "Couldn't load your report right now. Pull to refresh or try again in a moment.",
        ),
      );
    }
  }, [token, t]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load]),
  );

  const hasSubjects = (report?.subjects?.length ?? 0) > 0;

  const bgTranslateY = scrollY.interpolate({
    inputRange: [0, heroHeight],
    outputRange: [0, -heroHeight * PARALLAX_FACTOR],
    extrapolate: 'clamp',
  });
  const bgOpacity = scrollY.interpolate({
    inputRange: [0, heroHeight * 0.6, heroHeight],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.flex}>
      <Animated.View
        style={[
          styles.bgLayer,
          { height: heroHeight, opacity: bgOpacity, transform: [{ translateY: bgTranslateY }] },
        ]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[BRAND.emerald, BRAND.emeraldDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollFlex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
        })}
        scrollEventThrottle={16}
      >
        <View
          onLayout={(e) => {
            const measured = e.nativeEvent.layout.height;
            if (Math.abs(measured - heroHeight) > 1) setHeroHeight(measured);
          }}
        >
          <View style={[styles.headerRow, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
              <ChevronLeftIcon color={WHITE} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {t('student_quarterly_report.header_title', 'Quarterly Report')}
            </Text>
          </View>

          <View style={styles.heroContent}>
            {isLoading ? (
              <View style={styles.heroCenter}>
                <Skeleton width={120} height={40} baseColor={HERO_GLASS_BG} />
              </View>
            ) : (
              <View style={styles.heroCenter}>
                <Text style={styles.heroAvgLabel}>
                  {t('student_quarterly_report.general_average', 'General Average')}
                </Text>
                <Text style={styles.heroAvgValue}>
                  {report?.general_average != null ? report.general_average.toFixed(2) : '—'}
                </Text>
                <View style={styles.heroMetaRow}>
                  {report?.session_id != null ? (
                    <Text style={styles.heroSessionText}>
                      {t('student_quarterly_report.session', 'SY {id}').replace('{id}', String(report.session_id))}
                    </Text>
                  ) : null}
                  {report?.honors.eligible ? (
                    <View style={styles.honorsBadge}>
                      <Award size={13} color={AMBER} strokeWidth={2.2} />
                      <Text style={styles.honorsBadgeText}>
                        {report.honors.label ?? t('student_quarterly_report.with_honors', 'With Honors')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {isLoading ? (
            <>
              <Skeleton width="100%" height={78} style={{ marginBottom: 10 }} />
              <Skeleton width="100%" height={78} style={{ marginBottom: 10 }} />
              <Skeleton width="100%" height={78} />
            </>
          ) : error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={load} style={styles.retryButton}>
                <Text style={styles.retryText}>{t('common.try_again', 'Try again')}</Text>
              </TouchableOpacity>
            </View>
          ) : hasSubjects ? (
            <>
              <Text style={styles.sectionLabel}>{t('student_quarterly_report.subjects', 'Subjects')}</Text>
              {report!.subjects.map((s) => (
                <SubjectReportCard key={s.subject_id} subject={s} />
              ))}
            </>
          ) : (
            <EmptyState
              icon="📊"
              title={t('student_quarterly_report.empty_title', 'No quarterly grades yet')}
              subtitle={t(
                'student_quarterly_report.empty_subtitle',
                "Once your teachers enter Q1-Q4 grades, they'll show up here.",
              )}
              colors={{
                accent: EMERALD,
                accentSoft: COLORS.emeraldSoft,
                textPrimary: INK,
                textSecondary: SUBTLE,
              }}
            />
          )}
        </View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: CANVAS },

  bgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
    zIndex: 0,
    elevation: 0,
  },
  scrollFlex: { flex: 1, zIndex: 1, elevation: 1 },
  scrollContent: { paddingBottom: 40 },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginBottom: 8 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: HERO_GLASS_BG,
    borderWidth: 1,
    borderColor: HERO_GLASS_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: WHITE, letterSpacing: -0.3 },

  heroContent: { paddingHorizontal: 20, paddingBottom: 30, minHeight: 60 },
  heroCenter: { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  heroAvgLabel: { color: FAINT, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroAvgValue: { color: WHITE, fontSize: 46, fontWeight: '800', letterSpacing: 0.5, marginTop: 6 },
  heroMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  heroSessionText: { color: FAINT, fontSize: 12.5, fontWeight: '600' },
  honorsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AMBER_SOFT,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  honorsBadgeText: { fontSize: 12, fontWeight: '800', color: AMBER },

  body: {
    backgroundColor: CANVAS,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 24,
    marginTop: 4,
    minHeight: 300,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SUBTLE,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 10,
    ...SHADOW.level1,
  },
  subjectHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  subjectName: { flex: 1, fontSize: 15, fontWeight: '700', color: INK, marginRight: 10 },
  avgPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  avgPillText: { fontSize: 13, fontWeight: '800' },

  quarterRow: { flexDirection: 'row' },
  quarterCell: { flex: 1, alignItems: 'center' },
  quarterCellLabel: { fontSize: 10, fontWeight: '700', color: SUBTLE, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  quarterCellValue: { fontSize: 14.5, fontWeight: '700', color: INK },
  quarterCellValueEmpty: { color: SUBTLE, fontWeight: '600' },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: HAIRLINE,
    padding: 24,
    alignItems: 'center',
  },
  errorText: { color: COLORS.danger, textAlign: 'center', marginBottom: 12, fontSize: 13.5, lineHeight: 19 },
  retryButton: { backgroundColor: '#EEF0F2', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  retryText: { color: INK, fontWeight: '600' },
});
