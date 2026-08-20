import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronRight, CircleCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLocale } from '../context/LocaleContext';
import { useOfflineQueue } from '../context/OfflineQueueContext';
import { useAcademicGlassTheme, AcademicGlassTheme } from '../screens/teachers/academicGlassTheme';
import { RADIUS } from '../theme/glass';
import { scanCachedDatasets } from '../utils/syncStatus';

/**
 * Compact dashboard entry point for SyncStatusScreen - "what's downloaded
 * for offline use, what's still waiting to upload" summarized in one tap
 * target instead of a full tile grid entry, since it's a status readout
 * more than a feature to configure. Same icon-square + title + status-pill
 * + subtitle shape as its sibling SubscriptionStatusCard, rather than a
 * bare color dot standing in for both the icon and the status.
 */
export default function SyncStatusCard() {
  const navigation = useNavigation();
  const theme = useAcademicGlassTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
  const statusColor = isOnline ? STATUS_GREEN : STATUS_RED;
  const statusGradient = isOnline ? (['#1FAE64', '#0F7A3D'] as const) : (['#F87171', '#B91C1C'] as const);

  return (
    <TouchableOpacity
      style={styles.cardShadow}
      activeOpacity={0.88}
      onPress={() => (navigation as any).navigate('SyncStatus')}
    >
      <LinearGradient colors={GRADIENT_BLACK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <LinearGradient colors={statusGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconWrap}>
          <CircleCheck size={20} color="#FFFFFF" strokeWidth={2} />
        </LinearGradient>
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {t('sync_status_card.title', 'Offline & Sync')}
            </Text>
            {/* Translucent white pill (not theme.successSoft/dangerSoft's
                pastel fill) so it reads as its own chip against the card's
                own black, not a lighter patch sitting oddly on top of it. */}
            <View style={styles.pill}>
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
            <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

// Kept local and fixed-dark, same as the dashboard's other black cards
// (the hero greeting, the school identity card before its own redesign) -
// this row is deliberately always black regardless of light/dark theme,
// not derived from theme.surface/theme.border. A faint diagonal lift (not
// flat #111214) is what makes the "modern" card read as a surface with
// depth instead of a solid-fill rectangle.
const GRADIENT_BLACK = ['#1A1C1F', '#0A0B0C'] as const;
const STATUS_GREEN = '#34D399';
const STATUS_RED = '#F87171';

const makeStyles = (theme: AcademicGlassTheme) =>
  StyleSheet.create({
    cardShadow: {
      borderRadius: RADIUS.lg,
      marginHorizontal: 16,
      marginBottom: 12,
      ...theme.elevation2,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      padding: 16,
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
    title: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flexShrink: 1, letterSpacing: -0.2 },
    subtitle: { fontSize: 12.5, color: 'rgba(255,255,255,0.55)', marginTop: 3 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 9,
      paddingVertical: 3,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    pillDot: { width: 6, height: 6, borderRadius: 3 },
    pillText: { fontSize: 10.5, fontWeight: '700' },
    chevronWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
      marginLeft: 4,
    },
    badge: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: STATUS_RED,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 7,
      marginLeft: 4,
    },
    badgeText: { fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' },
  });
