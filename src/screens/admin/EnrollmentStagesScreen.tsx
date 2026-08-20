import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronUp, ChevronDown, Flag, Milestone } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { useAcademicGlassTheme, AcademicGlassTheme } from '../teachers/academicGlassTheme';
import { RADIUS } from '../../theme/glass';
import GlassBackground from '../../components/glass/GlassBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { BentoGrid } from '../../components/glass/BentoGridCard';
import { Skeleton } from '../../components/Skeleton';
import { EmptyState } from '../../components/EmptyState';
import BottomNavBar from '../../components/BottomNavBar';
import {
  WorkflowStage,
  fetchEnrollmentStages,
  deleteEnrollmentStage,
  reorderEnrollmentStages,
} from '../../services/enrollmentWorkflowService';

/**
 * Admin: spec §4.16 Enrollment Workflow Management - the stage builder.
 * Configures the per-school ordered pipeline (e.g. Admission -> Cashier ->
 * ... -> Officially Enrolled) that EnrollmentStageFormScreen creates/edits
 * one stage of, and that the student-facing EnrollmentStatusScreen reads
 * (via student_enrollment_workflow_status) to render its stepper.
 *
 * Bento grid: each stage is a spatial tile (icon, order badge, reorder
 * arrows, approver/terminal tags) in a wrapping 2-column grid, same visual
 * language as BentoGridCard/BentoOptionGrid used elsewhere in this module -
 * replaces the earlier flat single-column row list.
 *
 * Reordering: no drag-and-drop library is present in this project, so
 * reordering is up/down arrows per tile. Each tap sends the FULL resulting
 * id order to admin_enrollment_stages_reorder in one call.
 */

function IconChevronUp({ color, disabled }: { color: string; disabled?: boolean }) {
  return <ChevronUp size={16} color={color} strokeWidth={2.2} opacity={disabled ? 0.3 : 1} />;
}
function IconChevronDown({ color, disabled }: { color: string; disabled?: boolean }) {
  return <ChevronDown size={16} color={color} strokeWidth={2.2} opacity={disabled ? 0.3 : 1} />;
}
function IconFlag({ color }: { color: string }) {
  return <Flag size={22} color={color} strokeWidth={2} />;
}
function IconMilestone({ color }: { color: string }) {
  return <Milestone size={22} color={color} strokeWidth={2} />;
}

function approverLabel(role: WorkflowStage['approver_role'], t: (key: string, fallback: string) => string): string | null {
  if (role === 'accountant') return t('enrollment_stages.approver_cashier', 'Cashier');
  if (role === 'registrar') return t('enrollment_stages.approver_registrar', 'Registrar');
  return null;
}

export default function EnrollmentStagesScreen() {
  const navigation = useNavigation();
  const theme = useAcademicGlassTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { token } = useAuth();
  const { t } = useLocale();

  const [stages, setStages] = useState<WorkflowStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reorderingId, setReorderingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const data = await fetchEnrollmentStages(token);
      setStages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('enrollment_stages.load_error', 'Failed to load stages.'));
    } finally {
      setLoading(false);
    }
  }, [token, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const move = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stages.length || !token) return;

    const reordered = [...stages];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setStages(reordered);
    setReorderingId(reordered[targetIndex].id);
    try {
      const saved = await reorderEnrollmentStages(token, reordered.map((s) => s.id));
      setStages(saved);
    } catch (err) {
      setStages(stages);
      Alert.alert(t('common.error', 'Error'), err instanceof Error ? err.message : t('enrollment_stages.reorder_error', 'Could not reorder stages.'));
    } finally {
      setReorderingId(null);
    }
  };

  const handleDelete = (stage: WorkflowStage) => {
    Alert.alert(
      t('enrollment_stages.delete_title', 'Delete Stage'),
      t('enrollment_stages.delete_message', 'Delete "{name}"? This can\'t be undone.').replace('{name}', stage.name),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('enrollment_stages.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            if (!token) return;
            try {
              await deleteEnrollmentStage(token, stage.id);
              load();
            } catch (err) {
              Alert.alert(t('common.error', 'Error'), err instanceof Error ? err.message : t('enrollment_stages.delete_error', 'Failed to delete stage.'));
            }
          },
        },
      ]
    );
  };

  const renderStage = (item: WorkflowStage, index: number) => {
    const isActive = item.status === 'active';
    const busy = reorderingId === item.id;
    const approver = approverLabel(item.approver_role, t);
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.tile}
        activeOpacity={0.85}
        onPress={() => (navigation as any).navigate('EnrollmentStageForm', { stageId: item.id })}
      >
        <View style={styles.tileTop}>
          <View style={[styles.iconWrap, item.is_terminal && { backgroundColor: theme.accent }]}>
            {item.is_terminal ? <IconFlag color={theme.onAccent} /> : <IconMilestone color={theme.accent} />}
          </View>
          <View style={styles.reorderCol}>
            <TouchableOpacity hitSlop={8} disabled={index === 0 || busy} onPress={() => move(index, -1)}>
              <IconChevronUp color={theme.textSecondary} disabled={index === 0 || busy} />
            </TouchableOpacity>
            <Text style={styles.orderNum}>{index + 1}</Text>
            <TouchableOpacity hitSlop={8} disabled={index === stages.length - 1 || busy} onPress={() => move(index, 1)}>
              <IconChevronDown color={theme.textSecondary} disabled={index === stages.length - 1 || busy} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.tagRow}>
          {item.code ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.code}</Text>
            </View>
          ) : null}
          {approver ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{approver}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tileFooter}>
          <Text
            style={[
              styles.statusBadgeText,
              { color: isActive ? theme.accent : theme.textSecondary, backgroundColor: isActive ? theme.accentSoft : theme.surfaceVariant },
            ]}
          >
            {item.status}
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={6}>
            <Text style={styles.deleteText}>{t('enrollment_stages.delete', 'Delete')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkeletonCard = (key: number) => (
    <View key={key} style={[styles.tile, { justifyContent: 'center' }]}>
      <Skeleton width={42} height={42} borderRadius={21} style={{ marginBottom: 12 }} baseColor={theme.skeletonBase} />
      <Skeleton width="70%" height={16} borderRadius={6} style={{ marginBottom: 8 }} baseColor={theme.skeletonBase} />
      <Skeleton width="45%" height={12} baseColor={theme.skeletonBase} />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title={t('enrollment_stages.title', 'Enrollment Stages')}
          ink={theme.textPrimary}
          subtle={theme.textSecondary}
          backBg={theme.surface}
        />
        <BentoGrid>{[0, 1, 2, 3].map(renderSkeletonCard)}</BentoGrid>
        <BottomNavBar />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GlassBackground variant="canvas" />
      <ScreenHeader
        title={t('enrollment_stages.title', 'Enrollment Stages')}
        caption={t('enrollment_stages.helper', 'Students move through these stages in order. Use the arrows on each tile to reorder.')}
        ink={theme.textPrimary}
        subtle={theme.textSecondary}
        backBg={theme.surface}
        rightAction={
          <TouchableOpacity style={styles.addButton} onPress={() => (navigation as any).navigate('EnrollmentStageForm')}>
            <Text style={styles.addButtonText}>{t('enrollment_stages.add', '+ Add')}</Text>
          </TouchableOpacity>
        }
      />

      <View style={styles.quickLinkRow}>
        <TouchableOpacity style={styles.quickLinkChip} onPress={() => (navigation as any).navigate('EnrollmentFeeTypes')}>
          <Text style={styles.quickLinkText}>{t('enrollment_stages.fees', 'Fees')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.quickLinkChip} onPress={() => (navigation as any).navigate('EnrollmentWorkflowList')}>
          <Text style={styles.quickLinkText}>{t('enrollment_stages.students', 'Students')}</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }}>
        {stages.length === 0 ? (
          <EmptyState
            icon="🧭"
            title={t('enrollment_stages.empty_title', 'No enrollment stages yet')}
            subtitle={t('enrollment_stages.empty_subtitle', 'Add your first stage (e.g. Admission) to start building the workflow.')}
            actionLabel={t('enrollment_stages.empty_action', 'Add Stage')}
            onAction={() => (navigation as any).navigate('EnrollmentStageForm')}
            colors={theme}
          />
        ) : (
          <BentoGrid>{stages.map(renderStage)}</BentoGrid>
        )}
      </ScrollView>
      <BottomNavBar />
    </View>
  );
}

const makeStyles = (theme: AcademicGlassTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    addButton: { backgroundColor: theme.accent, paddingHorizontal: 16, paddingVertical: 9, borderRadius: RADIUS.pill },
    addButtonText: { color: theme.onAccent, fontWeight: '700', fontSize: 14 },

    // Secondary nav as a slim chip row under the title, Apple Settings-
    // style quick links, instead of two more buttons crowded onto the
    // header row next to +Add.
    quickLinkRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 16 },
    quickLinkChip: { borderWidth: 1, borderColor: theme.borderStrong, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill },
    quickLinkText: { color: theme.textPrimary, fontWeight: '600', fontSize: 13 },

    errorBanner: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.dangerSoft,
      marginHorizontal: 16,
      marginTop: 12,
      padding: 12,
      borderRadius: RADIUS.md,
    },
    errorBannerText: { color: theme.danger, fontSize: 13, flex: 1, marginRight: 8 },
    retryText: { color: theme.danger, fontWeight: '700', fontSize: 13 },

    // Apple-card language: no hard border, a soft ambient shadow instead,
    // generous corner radius and padding so the tile reads as one solid
    // rounded slab rather than a boxed-in panel.
    tile: {
      width: '47%',
      minHeight: 184,
      backgroundColor: theme.surface,
      borderRadius: 24,
      padding: 18,
      shadowColor: '#0B1F14',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 3,
    },
    tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: theme.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    reorderCol: { alignItems: 'center' },
    orderNum: { fontSize: 11.5, fontWeight: '700', color: theme.textSecondary, marginVertical: 2 },
    name: { fontSize: 16, fontWeight: '800', color: theme.textPrimary, marginBottom: 10, letterSpacing: -0.2 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
    tag: { backgroundColor: theme.surfaceVariant, paddingHorizontal: 9, paddingVertical: 4, borderRadius: RADIUS.pill },
    tagText: { fontSize: 10.5, fontWeight: '600', color: theme.textSecondary },
    tileFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' },
    statusBadgeText: {
      fontSize: 10.5,
      fontWeight: '700',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: RADIUS.pill,
      overflow: 'hidden',
      textTransform: 'capitalize',
    },
    deleteText: { color: theme.danger, fontSize: 11.5, fontWeight: '600' },
  });
