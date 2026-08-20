import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { ChevronRight, Clock, CreditCard } from 'lucide-react-native';
import { useLocale } from '../context/LocaleContext';
import { AdminSubscriptionStatus } from '../services/subscriptionService';
import { COLORS, RADIUS } from '../theme/glass';

/**
 * Read-only summary of this school's platform subscription - package,
 * expiration, days remaining/overdue - plus, while there's no active plan,
 * a way for the admin to actually do something about it: submit a
 * self-serve request (see SubscribeScreen) instead of just waiting for the
 * superadmin to notice. Set by the superadmin from SuperAdminSchoolSubscription,
 * or by approving a request from SubscriptionRequestsScreen.
 *
 * Dark/highlight card (same gradient-black treatment as the dashboard's
 * other black cards) - leads the AdminDashboard status stack, with
 * SyncStatusCard as the plainer white card beneath it.
 */
export default function SubscriptionStatusCard({
  status,
  loadFailed = false,
  onRetry,
  onSubscribePress,
  onDetailsPress,
}: {
  status: AdminSubscriptionStatus | null;
  // True once the fetch has actually errored (endpoint missing/500/network) -
  // distinct from still loading, which stays quiet rather than flash a
  // misleading "No subscription" before the real answer arrives.
  loadFailed?: boolean;
  onRetry?: () => void;
  // Navigates to SubscribeScreen - only used to make the card tappable
  // while there's no active plan and no request already pending.
  onSubscribePress?: () => void;
  // Navigates to SubscriptionDetailsScreen - makes the card tappable while
  // there IS an active plan, so an admin can see days remaining, renew, or
  // browse other packages instead of the card being inert once subscribed.
  onDetailsPress?: () => void;
}) {
  const { t } = useLocale();

  if (loadFailed) {
    return (
      <TouchableOpacity style={styles.cardShadow} activeOpacity={onRetry ? 0.88 : 1} onPress={onRetry} disabled={!onRetry}>
        <LinearGradient colors={GRADIENT_BLACK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            <CreditCard size={20} color="#FFFFFF" strokeWidth={1.8} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.title}>{t('subscription_card.load_failed_title', 'Subscription status unavailable')}</Text>
            <Text style={styles.subtitle}>
              {t('subscription_card.load_failed_subtitle', 'Tap to try again.')}
            </Text>
          </View>
          {onRetry ? (
            <View style={styles.chevronWrap}>
              <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
            </View>
          ) : null}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  // Still loading - stay quiet rather than flash something misleading.
  if (!status) return null;

  if (status.pending_request) {
    const requestedDate = new Date(status.pending_request.requested_at).toLocaleDateString();
    return (
      <View style={styles.cardShadow}>
        <LinearGradient colors={GRADIENT_BLACK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <LinearGradient colors={AMBER_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconWrap}>
            <Clock size={20} color="#FFFFFF" strokeWidth={1.8} />
          </LinearGradient>
          <View style={styles.textWrap}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {status.pending_request.package ?? t('subscription_card.no_package', 'Subscription')}
              </Text>
              <View style={styles.pill}>
                <View style={[styles.pillDot, { backgroundColor: AMBER }]} />
                <Text style={[styles.pillText, { color: AMBER }]}>
                  {t('subscription_card.status_pending', 'Pending review')}
                </Text>
              </View>
            </View>
            <Text style={styles.subtitle} numberOfLines={1}>
              {t('subscription_card.pending_since', 'Requested {date}').replace('{date}', requestedDate)}
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const expireDate = status.expire_date != null ? Number(status.expire_date) : null;
  const isLifetime = expireDate === 0;

  let pillLabel: string;
  let pillTone: 'active' | 'expired' | 'none';
  if (status.reason === 'no_subscription') {
    pillLabel = t('subscription_card.status_none', 'No subscription');
    pillTone = 'none';
  } else if (status.active) {
    pillLabel = t('subscription_card.status_active', 'Active');
    pillTone = 'active';
  } else {
    pillLabel = t('subscription_card.status_expired', 'Expired');
    pillTone = 'expired';
  }

  let expiryLine: string | null = null;
  if (status.reason !== 'no_subscription' && expireDate != null) {
    if (isLifetime) {
      expiryLine = t('subscription_card.never_expires', 'Never expires');
    } else {
      const expiryDate = new Date(expireDate * 1000);
      const daysDiff = Math.round((expireDate * 1000 - Date.now()) / 86400000);
      const formatted = expiryDate.toLocaleDateString();
      if (status.active) {
        expiryLine =
          daysDiff <= 0
            ? t('subscription_card.expires_today', 'Expires today · {date}').replace('{date}', formatted)
            : t('subscription_card.expires_in_days', 'Renews in {days} days · {date}')
                .replace('{days}', String(daysDiff))
                .replace('{date}', formatted);
      } else {
        const overdueDays = Math.max(1, -daysDiff);
        expiryLine = t('subscription_card.expired_days_ago', 'Expired {days} days ago · {date}')
          .replace('{days}', String(overdueDays))
          .replace('{date}', formatted);
      }
    }
  }

  const showSubscribeCta = !status.active && !!onSubscribePress;
  const showDetailsCta = status.active && !!onDetailsPress;
  const isTappable = showSubscribeCta || showDetailsCta;
  const Container = isTappable ? TouchableOpacity : View;
  const iconGradient = pillTone === 'active' ? EMERALD_GRADIENT : pillTone === 'expired' ? DANGER_GRADIENT : GRAY_GRADIENT;

  return (
    <Container
      style={styles.cardShadow}
      {...(isTappable ? { activeOpacity: 0.88, onPress: showDetailsCta ? onDetailsPress : onSubscribePress } : {})}
    >
      <LinearGradient colors={GRADIENT_BLACK} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <LinearGradient colors={iconGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconWrap}>
          <CreditCard size={20} color="#FFFFFF" strokeWidth={1.8} />
        </LinearGradient>
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {status.package ?? t('subscription_card.no_package', 'Subscription')}
            </Text>
            <View style={styles.pill}>
              <View style={[styles.pillDot, { backgroundColor: DOT_COLORS[pillTone] }]} />
              <Text style={[styles.pillText, { color: DOT_COLORS[pillTone] }]}>{pillLabel}</Text>
            </View>
          </View>
          <Text style={styles.subtitle} numberOfLines={1}>
            {expiryLine ??
              (showSubscribeCta
                ? t('subscription_card.tap_to_subscribe', 'Tap to choose a plan')
                : t('subscription_card.contact_owner', 'Contact your account owner to activate a plan.'))}
          </Text>
        </View>
        {isTappable ? (
          <View style={styles.chevronWrap}>
            <ChevronRight size={16} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
          </View>
        ) : null}
      </LinearGradient>
    </Container>
  );
}

// Same diagonal-lift black as SyncStatusCard, so the two dashboard status
// cards read as one family before this one was singled out as the "leading"
// highlighted card.
const GRADIENT_BLACK = ['#1A1C1F', '#0A0B0C'] as const;
const AMBER = '#F59E0B';
const AMBER_GRADIENT = ['#F59E0B', '#B45309'] as const;
const EMERALD_GRADIENT = [COLORS.emerald, '#0F7A3D'] as const;
const DANGER_GRADIENT = ['#F87171', '#B91C1C'] as const;
const GRAY_GRADIENT = ['#9CA3AF', '#6B7280'] as const;

const styles = StyleSheet.create({
  cardShadow: {
    borderRadius: RADIUS.lg,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#0B3D2E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
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
});

const DOT_COLORS: Record<'active' | 'expired' | 'none', string> = {
  active: '#34D399',
  expired: '#F87171',
  none: 'rgba(255,255,255,0.6)',
};
