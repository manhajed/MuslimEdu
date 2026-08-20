import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronRight, CircleCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useOfflineQueue } from '../context/OfflineQueueContext';
import { COLORS, RADIUS, SHADOW } from '../theme/glass';
import { scanCachedDatasets } from '../utils/syncStatus';

/**
 * Compact dashboard entry point for SyncStatusScreen - "what's downloaded
 * for offline use, what's still waiting to upload" summarized in one tap
 * target instead of a full tile grid entry, since it's a status readout
 * more than a feature to configure.
 *
 * Plain white card - sits below SubscriptionStatusCard's dark/highlight
 * card as the less-actionable of the two status rows on AdminDashboard.
 */
export default function SyncStatusCard() {
  const navigation = useNavigation();
  const { token } = useAuth();
  const { t } = useLocale();
  const { isOnline, actions } = useOfflineQueue();
  const [datasetCount, setDatasetCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      scanCachedDatasets(token).then((d) => setDatasetCount(d.length));
    }, [token])
  );

  const hasPending = actions.length > 0;
  const statusColor = isOnline ? COLORS.emerald : COLORS.danger;
  const statusSoft = isOnline ? COLORS.emeraldSoft : 'rgba(239,68,68,0.1)';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => (navigation as any).navigate('SyncStatus')}>
      <View style={[styles.iconWrap, { backgroundColor: statusSoft }]}>
        <CircleCheck size={20} color={statusColor} strokeWidth={1.8} />
      </View>
      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {t('sync_status_card.title', 'Offline & Sync')}
          </Text>
          <View style={[styles.pill, { backgroundColor: statusSoft }]}>
            <View style={[styles.pillDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.pillText, { color: statusColor }]}>
              {isOnline ? t('sync_status.online', 'Online') : t('sync_status.offline', 'Offline')}
            </Text>
          </View>
        </View>
        <Text style={styles.subtitle} numberOfLines={1}>
          {t('sync_status_card.summary', '{cached} cached · {pending} pending upload')
            .replace('{cached}', String(datasetCount))
            .replace('{pending}', String(actions.length))}
        </Text>
      </View>
      {hasPending ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{actions.length}</Text>
        </View>
      ) : (
        <View style={styles.chevronWrap}>
          <ChevronRight size={16} color={COLORS.subtle} strokeWidth={2.5} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    ...SHADOW.level1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.ink, flexShrink: 1, letterSpacing: -0.2 },
  subtitle: { fontSize: 12.5, color: COLORS.subtle, marginTop: 3 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 10.5, fontWeight: '700' },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    marginLeft: 4,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    marginLeft: 4,
  },
  badgeText: { fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' },
});
