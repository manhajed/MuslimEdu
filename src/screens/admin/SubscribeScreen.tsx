import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Check, ChevronLeft, Clock, Layers, Zap } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import {
  fetchAdminSubscriptionPackages,
  fetchAdminSubscriptionStatus,
  submitSubscriptionRequest,
  AdminSubscriptionPackage,
  AdminSubscriptionStatus,
} from '../../services/subscriptionService';
import { Skeleton } from '../../components/Skeleton';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GLASS, COLORS, RADIUS, SHADOW } from '../../theme/glass';
import GlassBackground from '../../components/glass/GlassBackground';

const EMERALD = COLORS.emerald;
const INK = COLORS.ink;
const SUBTLE = COLORS.subtle;
const HAIRLINE = COLORS.border;
const GLASS_SURFACE = GLASS.fillOnLight;
const GLASS_BORDER = GLASS.borderOnLight;
const AMBER = '#92400E';
const AMBER_SOFT = 'rgba(180,83,9,0.10)';

function ChevronLeftIcon({ color }: { color: string }) {
  return <ChevronLeft size={22} color={color} strokeWidth={2.4} />;
}

function intervalLabel(interval: AdminSubscriptionPackage['interval'], t: (k: string, f: string) => string) {
  switch (interval) {
    case 'monthly':
      return t('subscribe.interval_monthly', 'Monthly');
    case 'yearly':
      return t('subscribe.interval_yearly', 'Yearly');
    case 'life_time':
      return t('subscribe.interval_lifetime', 'One-time, lifetime');
    default:
      return t('subscribe.interval_days', 'Days');
  }
}

// "per month" / "per year" / "one-time" next to the price - distinct from
// intervalLabel's pill text (which names the billing cadence), this is the
// unit the price itself is quoted in.
function priceUnitLabel(interval: AdminSubscriptionPackage['interval'], t: (k: string, f: string) => string) {
  switch (interval) {
    case 'monthly':
      return t('subscribe.per_month', 'per month');
    case 'yearly':
      return t('subscribe.per_year', 'per year');
    case 'life_time':
      return t('subscribe.one_time', 'one-time');
    default:
      return t('subscribe.per_period', 'per period');
  }
}

/**
 * Admin self-serve: browse active plans and submit a subscribe request for
 * a superadmin to review (SuperAdminApiController::subscriptionRequestApprove
 * on the backend, SubscriptionRequestsScreen.tsx on the superadmin side).
 * There's no payment gateway - `paymentReference` is a free-text note the
 * superadmin manually verifies, same as this app's other offline-payment
 * flows.
 */
export default function SubscribeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { token } = useAuth();
  const { t } = useLocale();

  const [status, setStatus] = useState<AdminSubscriptionStatus | null>(null);
  const [packages, setPackages] = useState<AdminSubscriptionPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const [statusData, packagesData] = await Promise.all([
        fetchAdminSubscriptionStatus(token),
        fetchAdminSubscriptionPackages(token),
      ]);
      setStatus(statusData);
      setPackages(packagesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('subscribe.load_error', 'Failed to load subscription plans.'));
    }
  }, [token, t]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const handleSubmit = async () => {
    if (!token || !selectedId) return;
    setIsSubmitting(true);
    try {
      await submitSubscriptionRequest(token, {
        package_id: selectedId,
        payment_reference: paymentReference.trim() || undefined,
      });
      Alert.alert(
        t('subscribe.submitted_title', 'Request submitted'),
        t('subscribe.submitted_body', "We'll let you know once it's reviewed."),
      );
      navigation.goBack();
    } catch (err) {
      Alert.alert(
        t('subscribe.submit_error_title', "Couldn't submit request"),
        err instanceof Error ? err.message : t('common.try_again_full', 'Please try again.'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingRequest = status?.pending_request ?? null;

  return (
    <View style={styles.flex}>
      <GlassBackground variant="canvas" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <ChevronLeftIcon color={EMERALD} />
          <Text style={styles.backText}>{t('common.back', 'Back')}</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{t('subscribe.header_title', 'Subscribe')}</Text>
        </View>
        <View style={{ width: 72 }} />
      </View>

      {isLoading ? (
        <View style={styles.content}>
          <Skeleton width="100%" height={140} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton}>
            <Text style={styles.retryText}>{t('common.try_again', 'Try again')}</Text>
          </TouchableOpacity>
        </View>
      ) : pendingRequest ? (
        <View style={styles.content}>
          <View style={styles.pendingCard}>
            <View style={styles.pendingIconWrap}>
              <Clock size={24} color={AMBER} strokeWidth={1.8} />
            </View>
            <Text style={styles.pendingTitle}>{t('subscribe.pending_title', 'Request pending review')}</Text>
            <Text style={styles.pendingBody}>
              {t('subscribe.pending_body', 'You requested {package} on {date}. A superadmin will review it soon.')
                .replace('{package}', pendingRequest.package ?? '')
                .replace('{date}', new Date(pendingRequest.requested_at).toLocaleDateString())}
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={EMERALD} />}
        >
          <Text style={styles.sectionLabel}>{t('subscribe.choose_plan', 'Choose a plan')}</Text>

          {packages.length === 0 ? (
            <Text style={styles.emptyText}>
              {t('subscribe.no_packages', 'No plans are available right now. Check back later.')}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {packages.map((pkg) => {
                const isSelected = pkg.id === selectedId;
                const PlanIcon = /enterprise/i.test(pkg.name) || /enterprise/i.test(pkg.package_type) ? Zap : Layers;
                const limitText = pkg.student_limit
                  ? t('subscribe.includes_students', 'Includes up to {limit} students').replace('{limit}', pkg.student_limit)
                  : t('subscribe.includes_unlimited_students', 'Includes unlimited students');
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.packageCard, isSelected && styles.packageCardActive]}
                    activeOpacity={0.85}
                    onPress={() => setSelectedId(pkg.id)}
                  >
                    <View style={styles.packageHeaderRow}>
                      <View style={styles.packageIconWrap}>
                        <PlanIcon size={20} color="#FFFFFF" strokeWidth={1.8} />
                      </View>
                      <Text style={styles.packageName} numberOfLines={1}>
                        {pkg.name}
                      </Text>
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                      </View>
                    </View>

                    <View style={styles.packageDivider} />

                    <View style={styles.packageBody}>
                      <View style={styles.intervalPill}>
                        <View style={styles.intervalDot} />
                        <Text style={styles.intervalPillText}>{intervalLabel(pkg.interval, t)}</Text>
                      </View>

                      <View style={styles.priceRow}>
                        <Text style={styles.priceValue}>{pkg.price}</Text>
                        <Text style={styles.priceUnit}>{priceUnitLabel(pkg.interval, t)}</Text>
                      </View>

                      <Text style={styles.packageDesc}>
                        {limitText}
                        {pkg.description ? `. ${pkg.description}` : '.'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={styles.fieldLabel}>{t('subscribe.payment_reference_label', 'Payment note (optional)')}</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder={t('subscribe.payment_reference_placeholder', 'e.g. bank transfer ref, or "will pay in cash"')}
            placeholderTextColor={SUBTLE}
            value={paymentReference}
            onChangeText={setPaymentReference}
          />

          <TouchableOpacity
            style={[styles.submitButton, (!selectedId || isSubmitting) && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={!selectedId || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>{t('subscribe.submit_button', 'Submit Request')}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: GLASS_SURFACE,
    borderBottomWidth: 1,
    borderBottomColor: GLASS_BORDER,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 72 },
  backText: { color: EMERALD, fontSize: 16, fontWeight: '600', marginLeft: 2 },
  headerTitleWrap: { alignItems: 'center', flex: 1, paddingHorizontal: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: INK },

  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  errorText: { color: COLORS.danger, textAlign: 'center', marginBottom: 12 },
  retryButton: { backgroundColor: '#EEF0F2', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  retryText: { color: INK, fontWeight: '600' },

  sectionLabel: {
    fontSize: 12,
    color: SUBTLE,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  emptyText: { fontSize: 13.5, color: SUBTLE, textAlign: 'center', paddingVertical: 30 },

  // Icon-card radio pattern: header row (icon badge + title + checkbox) over
  // a divider, then a pill tag / big price / description body - selection
  // reads through the border alone (2px emerald vs 1px hairline), not a
  // background tint, so the card stays legible either way.
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: HAIRLINE,
    overflow: 'hidden',
    ...SHADOW.level1,
  },
  packageCardActive: { borderWidth: 2, borderColor: INK },
  packageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  // Solid black, same treatment as the now-black checkbox indicator, rather
  // than a bordered white square with a black glyph.
  packageIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageName: { fontSize: 16, fontWeight: '700', color: INK, flex: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: HAIRLINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: INK, borderColor: INK },
  packageDivider: { height: 1, backgroundColor: HAIRLINE },
  packageBody: { padding: 16 },
  intervalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 16,
  },
  intervalDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: EMERALD },
  intervalPillText: { fontSize: 12, fontWeight: '700', color: INK },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  priceValue: { fontSize: 30, fontWeight: '800', color: INK, letterSpacing: -0.5 },
  priceUnit: { fontSize: 14, color: SUBTLE, marginBottom: 4 },
  packageDesc: { fontSize: 13.5, color: SUBTLE, marginTop: 8, lineHeight: 20 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: INK, marginBottom: 8, marginTop: 20 },
  fieldInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: INK,
    borderWidth: 1,
    borderColor: HAIRLINE,
  },

  submitButton: {
    backgroundColor: EMERALD,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },

  pendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: HAIRLINE,
    padding: 24,
    alignItems: 'center',
  },
  pendingIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AMBER_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  pendingTitle: { fontSize: 16, fontWeight: '800', color: INK, textAlign: 'center' },
  pendingBody: { fontSize: 13.5, color: SUBTLE, textAlign: 'center', marginTop: 8, lineHeight: 19 },
});
