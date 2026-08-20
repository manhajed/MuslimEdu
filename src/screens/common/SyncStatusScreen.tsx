import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, CircleCheck, Download, Upload } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useOfflineQueue } from '../../context/OfflineQueueContext';
import { useAcademicGlassTheme, AcademicGlassTheme } from '../teachers/academicGlassTheme';
import { RADIUS } from '../../theme/glass';
import GlassBackground from '../../components/glass/GlassBackground';
import BottomNavBar from '../../components/BottomNavBar';
import { scanCachedDatasets, formatBytes, CachedDataset } from '../../utils/syncStatus';
import { QueuedAction, QueuedActionKind } from '../../services/offlineQueue';

/**
 * "What's downloaded (cached offline) vs what's still waiting to upload" -
 * reads real AsyncStorage cache keys (scanCachedDatasets) for the download
 * side and the existing offline outbox (useOfflineQueue) for the upload
 * side, rather than tracking a separate parallel log. Reachable from both
 * AdminDashboard and TeacherDashboard, since both roles' data flows feed
 * into the same underlying caches/queue.
 *
 * Monochrome list - every row is a plain surface card with a black glyph,
 * no per-category tint. Wayfinding by color was dropped in favor of a
 * flatter, single-ink look.
 */

const ACTION_LABELS: Record<QueuedActionKind, string> = {
  orphan_report_submit: 'Orphan Report',
  teacher_orphan_report_submit: 'Teacher Orphan Report',
  attendance_submit: 'Attendance Submission',
  attendance_scan: 'QR Attendance Scan',
  examination_save: 'Examination',
  examination_results_save: 'Examination Grades',
  admin_document_issue: 'Document Issued',
  admin_document_reject: 'Document Rejected',
};

const ICON_INK = '#111827';

function IconChevronLeft({ color }: { color: string }) {
  return <ChevronLeft size={22} color={color} strokeWidth={2.4} />;
}
function IconDownload({ color }: { color: string }) {
  return <Download size={18} color={color} strokeWidth={2} />;
}
function IconUpload({ color }: { color: string }) {
  return <Upload size={18} color={color} strokeWidth={2} />;
}
function IconCheck({ color }: { color: string }) {
  return <CircleCheck size={20} color={color} strokeWidth={2} />;
}

function formatWhen(ms: number, t: (k: string, f: string) => string): string {
  const diffMin = Math.round((Date.now() - ms) / 60000);
  if (diffMin < 1) return t('sync_status.just_now', 'just now');
  if (diffMin < 60) return t('sync_status.minutes_ago', '{n}m ago').replace('{n}', String(diffMin));
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return t('sync_status.hours_ago', '{n}h ago').replace('{n}', String(diffHr));
  return new Date(ms).toLocaleDateString();
}

export default function SyncStatusScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const theme = useAcademicGlassTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { token } = useAuth();
  const { t } = useLocale();
  const { isOnline, isFlushing, actions, flushNow } = useOfflineQueue();

  const [datasets, setDatasets] = useState<CachedDataset[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setDatasets(await scanCachedDatasets(token));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const pendingByKind = useMemo(() => {
    const groups = new Map<QueuedActionKind, QueuedAction[]>();
    actions.forEach((a) => {
      const list = groups.get(a.kind) ?? [];
      list.push(a);
      groups.set(a.kind, list);
    });
    return Array.from(groups.entries());
  }, [actions]);

  const totalBytes = datasets.reduce((sum, d) => sum + d.bytes, 0);

  return (
    <View style={styles.container}>
      <GlassBackground variant="canvas" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10} style={styles.backButton}>
          <IconChevronLeft color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, styles.headerTitleFlex]}>{t('sync_status.title', 'Offline & Sync')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.connectionBanner}>
        <View style={[styles.connectionDot, { backgroundColor: ICON_INK }]} />
        <Text style={styles.connectionText}>
          {isOnline ? t('sync_status.online', 'Online') : t('sync_status.offline', 'Offline')}
        </Text>
        {actions.length > 0 ? (
          <TouchableOpacity style={styles.syncNowBtn} onPress={() => flushNow()} disabled={isFlushing || !isOnline}>
            {isFlushing ? <ActivityIndicator size="small" color={theme.onAccent} /> : <Text style={styles.syncNowText}>{t('sync_status.sync_now', 'Sync Now')}</Text>}
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>{t('sync_status.downloaded', 'Downloaded (available offline)')}</Text>
        <Text style={styles.sectionHelper}>
          {t('sync_status.downloaded_helper', 'Data saved on this device so key screens still work without a connection.')}
        </Text>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: 16 }} />
        ) : datasets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('sync_status.nothing_cached', 'Nothing cached yet - open a few screens while online to build up an offline cache.')}</Text>
          </View>
        ) : (
          <>
            <View style={{ gap: 10 }}>
              {datasets.map((d) => {
                return (
                  <View key={d.key} style={styles.itemCard}>
                    <View style={styles.itemIconWrap}>
                      <IconDownload color={ICON_INK} />
                    </View>
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{d.label}</Text>
                      <Text style={styles.itemMeta}>
                        {d.count > 1
                          ? t('sync_status.snapshots', '{count} snapshots · {size}').replace('{count}', String(d.count)).replace('{size}', formatBytes(d.bytes))
                          : formatBytes(d.bytes)}
                      </Text>
                    </View>
                    <IconCheck color={ICON_INK} />
                  </View>
                );
              })}
            </View>
            <Text style={styles.totalText}>
              {t('sync_status.total_cached', 'Total cached: {size}').replace('{size}', formatBytes(totalBytes))}
            </Text>
          </>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('sync_status.pending_upload', 'Waiting to Upload')}</Text>
        <Text style={styles.sectionHelper}>
          {t('sync_status.pending_helper', "Actions taken offline - they'll sync automatically the moment you're back online.")}
        </Text>

        {pendingByKind.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{t('sync_status.all_synced', 'Everything is synced - nothing waiting to upload.')}</Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {pendingByKind.map(([kind, list]) => {
              const hasError = list.some((a) => a.lastError);
              return (
                <View key={kind} style={styles.itemCard}>
                  <View style={styles.itemIconWrap}>
                    <IconUpload color={ICON_INK} />
                  </View>
                  <View style={styles.itemTextWrap}>
                    <Text style={styles.itemTitle} numberOfLines={1}>{ACTION_LABELS[kind] ?? kind}</Text>
                    <Text style={styles.itemMeta}>
                      {t('sync_status.pending_count', '{count} pending · oldest {when}')
                        .replace('{count}', String(list.length))
                        .replace('{when}', formatWhen(Math.min(...list.map((a) => a.createdAt)), t))}
                    </Text>
                    {hasError ? (
                      <Text style={styles.errorText} numberOfLines={2}>
                        {list.find((a) => a.lastError)?.lastError}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <BottomNavBar />
    </View>
  );
}

const makeStyles = (theme: AcademicGlassTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
    headerTitleFlex: { flex: 1, marginLeft: 8 },
    backButton: { width: 32 },
    headerSpacer: { width: 32 },

    // Fully-rounded pill, not just a rounded rectangle - the app's own
    // "state" affordance elsewhere (status pills on SubscriptionStatusCard,
    // badges) is always a true pill; this banner is the same idea scaled up.
    // No tinted fill (monochrome pass) - a hairline border keeps it legible
    // as its own row on the canvas background.
    connectionBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 16,
      marginTop: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: RADIUS.pill,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    connectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    connectionText: { fontSize: 14, fontWeight: '700', flex: 1, color: ICON_INK },
    syncNowBtn: { backgroundColor: theme.accent, borderRadius: RADIUS.pill, paddingHorizontal: 14, paddingVertical: 7, minWidth: 80, alignItems: 'center' },
    syncNowText: { fontSize: 12, fontWeight: '700', color: theme.onAccent },

    content: { padding: 16, paddingBottom: 40 },
    // Uppercase, letter-spaced eyebrow - the same section-header convention
    // as every other grouped list in the app (e.g. the admin menu's PEOPLE /
    // ACADEMICS labels), instead of this screen's own plain bold caption.
    sectionLabel: {
      fontSize: 12.5,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 4,
    },
    sectionHelper: { fontSize: 12.5, color: theme.textSecondary, lineHeight: 18, marginBottom: 12 },

    emptyCard: {
      backgroundColor: theme.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
    },
    emptyText: { fontSize: 12.5, color: theme.textSecondary, lineHeight: 18 },

    // Plain surface row (no per-category tint/border) - the icon square's
    // own color is the only wayfinding now, not the whole card.
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
    },
    itemIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemTextWrap: { flex: 1 },
    itemTitle: { fontSize: 14.5, fontWeight: '700', color: theme.textPrimary },
    itemMeta: { fontSize: 12, color: theme.textSecondary, marginTop: 2 },
    errorText: { fontSize: 11, color: theme.danger, marginTop: 3 },
    totalText: { fontSize: 12, color: theme.textMuted, textAlign: 'right', marginTop: 8 },
  });
