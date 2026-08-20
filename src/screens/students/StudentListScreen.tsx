import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import KeyboardAwareModal from '../../components/KeyboardAwareModal';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Check, ChevronRight, Funnel, Plus, Search, X } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import { fetchStudents, StudentSummary, ChildStatus } from '../../services/adminService';
import { Skeleton, SkeletonCircle } from '../../components/Skeleton';
import UserAvatar from '../../components/UserAvatar';
import { ChildActionModal, ChildProfileSheet } from '../../components/ChildProfileSheet';

import { COLORS, RADIUS, SHADOW } from '../../theme/glass';
import GlassBackground from '../../components/glass/GlassBackground';
import ScreenHeader from '../../components/ScreenHeader';
import { isOrphanSchoolUser } from '../../utils/orphanSchool';
import { Box } from '../../components/ui/box';
import { HStack } from '../../components/ui/hstack';
import { VStack } from '../../components/ui/vstack';
import { Text as GSText } from '../../components/ui/text';
const EMERALD = COLORS.emerald;
const EMERALD_SOFT = COLORS.emeraldSoft;
const INK = COLORS.ink;
const SUBTLE = COLORS.subtle;
const HAIRLINE = COLORS.border;
const CANVAS = COLORS.canvas;
const DANGER = COLORS.danger;
const DANGER_SOFT = 'rgba(239,68,68,0.12)';
const AMBER = '#D97706';
const AMBER_SOFT = 'rgba(217,119,6,0.12)';

const STATUS_COLORS: Record<ChildStatus, { dot: string; chipBg: string; chipText: string; label: string }> = {
  active: { dot: EMERALD, chipBg: EMERALD_SOFT, chipText: EMERALD, label: 'Active' },
  pending: { dot: AMBER, chipBg: AMBER_SOFT, chipText: AMBER, label: 'Pending' },
  inactive: { dot: DANGER, chipBg: DANGER_SOFT, chipText: DANGER, label: 'Inactive' },
};

// Deterministic color per class/section name - same section always gets
// the same color across the list (and across screens, teacher list uses
// the same palette+hash), rather than a random assignment on every render.
const SECTION_PALETTE = ['#0A84FF', '#8B5CF6', '#FF6B81', '#0EA5E9', '#D4A64A', '#FF9F0A'];
function colorForKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return SECTION_PALETTE[hash % SECTION_PALETTE.length];
}

function formatJoined(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// --- Inline stroke icons, matching the app's existing SVG icon style ---
function IconPlus({ color }: { color: string }) {
  return <Plus size={19} color={color} strokeWidth={2.4} />;
}
function IconChevronRight({ color }: { color: string }) {
  return <ChevronRight size={20} color={color} strokeWidth={2.2} />;
}
function IconSearch({ color }: { color: string }) {
  return <Search size={18} color={color} strokeWidth={2} />;
}
function IconFilter({ color }: { color: string }) {
  return <Funnel size={18} color={color} strokeWidth={2} />;
}
function IconClose({ color }: { color: string }) {
  return <X size={18} color={color} strokeWidth={2.2} />;
}
function IconCheck({ color }: { color: string }) {
  return <Check size={14} color={color} strokeWidth={3} />;
}
// --- Filter sheet -----------------------------------------------------
type FilterValue = 'all' | ChildStatus;

function FilterSheet({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value: FilterValue;
  onSelect: (v: FilterValue) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const options: { key: FilterValue; label: string }[] = [
    { key: 'all', label: t('student_list.filter_all', 'All children') },
    { key: 'active', label: t('student_list.filter_active', 'Active') },
    { key: 'pending', label: t('student_list.filter_pending', 'Pending') },
    { key: 'inactive', label: t('student_list.filter_inactive', 'Inactive') },
  ];

  return (
    <KeyboardAwareModal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <TouchableOpacity style={styles.sheetBackdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeaderRow}>
            <Text style={styles.sheetTitle}>{t('student_list.filter_title', 'Filter')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.sheetCloseBtn}>
              <IconClose color={SUBTLE} />
            </TouchableOpacity>
          </View>
          {options.map((opt) => {
            const selected = value === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={styles.filterOptionRow}
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(opt.key);
                  onClose();
                }}
              >
                <Text style={[styles.filterOptionText, selected && styles.filterOptionTextSelected]}>
                  {opt.label}
                </Text>
                {selected ? (
                  <View style={styles.filterCheckCircle}>
                    <IconCheck color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={styles.filterEmptyCircle} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </KeyboardAwareModal>
  );
}

/**
 * Admin's Children directory: search, status filter, and a tap-through
 * bottom sheet with the full child profile. There's no separate "orphans
 * only" mode - orphan status is set per-school (school_type), not per-child,
 * so an orphanage admin's list is already all orphan children. The title
 * adapts based on the logged-in admin's school.
 */
export default function StudentListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { token, user } = useAuth();
  const { t } = useLocale();

  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialSearch = (route.params as { initialSearch?: string } | undefined)?.initialSearch ?? '';
  const [query, setQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<FilterValue>('all');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<StudentSummary | null>(null);
  const [actionChild, setActionChild] = useState<StudentSummary | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setError(null);
    try {
      const data = await fetchStudents(token);
      setStudents(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('student_list.load_error', 'Failed to load students.'));
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().finally(() => setIsLoading(false));
    }, [load]),
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  };

  const isOrphanSchool = isOrphanSchoolUser(user);
  const title = isOrphanSchool
    ? t('student_list.title_children', 'Children')
    : t('student_list.title_students', 'Students');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const matchesQuery = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || (s.status ?? 'active') === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [students, query, statusFilter]);

  const isFilterActive = statusFilter !== 'all';

  const handleChildAction = (action: 'profile' | 'documents' | 'report') => {
    const child = actionChild;
    setActionChild(null);
    if (!child) return;

    if (action === 'profile') {
      setSelectedChild(child);
      return;
    }
    if (action === 'documents') {
      (navigation as any).navigate('AdminUserDocuments', {
        userId: child.id,
        userName: child.name,
      });
      return;
    }
    // action === 'report'
    (navigation as any).navigate('AdminChildReportDetail', {
      studentId: child.id,
      studentName: child.name,
    });
  };

  const listHeader = (
    <>
      <ScreenHeader
        title={title}
        caption={t('student_list.search_caption', 'Search and manage every {title}.').replace('{title}', title.toLowerCase())}
        rightAction={
          <>
            <TouchableOpacity style={styles.addBtn} onPress={() => (navigation as any).navigate('Admission')} hitSlop={8}>
              <IconPlus color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterBtn, isFilterActive && styles.filterBtnActive]}
              onPress={() => setFilterSheetOpen(true)}
              hitSlop={8}
            >
              <IconFilter color={isFilterActive ? '#FFFFFF' : EMERALD} />
            </TouchableOpacity>
          </>
        }
      />

      <View style={styles.searchWrap}>
        <IconSearch color={SUBTLE} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('student_list.search_placeholder', 'Search {title}...').replace('{title}', title.toLowerCase())}
          placeholderTextColor={SUBTLE}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>
    </>
  );

  return (
    <View style={styles.flex}>
      <GlassBackground variant="canvas" />

      {isLoading ? (
        <View style={styles.flex1}>
          {listHeader}
          <View style={styles.listContent}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Box key={i} className="flex-row items-center bg-background rounded-xl border border-border p-3 mb-2">
                <SkeletonCircle size={44} style={{ marginRight: 12 }} />
                <View style={styles.cardBody}>
                  <Skeleton width="55%" height={14} style={{ marginBottom: 6 }} />
                  <Skeleton width="75%" height={11} />
                </View>
              </Box>
            ))}
          </View>
        </View>
      ) : error ? (
        <View style={styles.flex1}>
          {listHeader}
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={load} style={styles.retryButton}>
              <Text style={styles.retryText}>{t('common.try_again', 'Try again')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.flex1}>
          {listHeader}
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {students.length === 0
                ? t('student_list.empty_none', 'No {title} found.').replace('{title}', title.toLowerCase())
                : t('student_list.empty_no_matches', 'No matches for your search.')}
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={EMERALD} />
          }
          renderItem={({ item }) => {
            const status = item.status ?? 'active';
            const joined = formatJoined(item.joined_date);
            // Was three separate colored chips - collapsed into the single
            // plain subtitle line the reference card uses, with the
            // unplaced-section warning as the only part that keeps its own
            // color (everything else reads as one calm meta line).
            const sectionText = item.section_name
              ? [item.class_name, item.section_name].filter(Boolean).join(' - ') +
                (item.room_number ? ` · ${t('student_list.room', 'Room')} ${item.room_number}` : '')
              : null;
            // Orphan schools have no class/section model at all - see
            // isOrphanSchoolUser's doc comment - so the warning would fire
            // for every single child there and mean nothing.
            const showUnplacedWarning = !sectionText && !isOrphanSchool;
            const sectionKey = item.section_name ?? item.class_name ?? null;
            const accentColor = sectionKey ? colorForKey(sectionKey) : AMBER;
            return (
              <TouchableOpacity activeOpacity={0.75} onPress={() => setActionChild(item)}>
                <HStack
                  space="md"
                  className="items-center rounded-xl border p-3 mb-2"
                  style={{
                    backgroundColor: `${accentColor}14`,
                    borderColor: `${accentColor}33`,
                    borderLeftWidth: 3,
                    borderLeftColor: accentColor,
                  }}
                >
                  <UserAvatar
                    name={item.name}
                    photo={item.photo}
                    size={40}
                    ringColor={HAIRLINE}
                    dotColor={STATUS_COLORS[status].dot}
                  />
                  <VStack className="flex-1">
                    <GSText className="text-foreground text-[15px] font-bold" numberOfLines={1}>
                      {item.name}
                    </GSText>
                    <GSText className="text-muted-foreground text-xs mt-0.5" numberOfLines={1}>
                      {item.email}
                    </GSText>
                    {sectionText || showUnplacedWarning || joined ? (
                      <GSText className="text-xs mt-1" numberOfLines={1}>
                        {sectionText ? (
                          <GSText className="font-semibold" style={{ color: accentColor }}>{sectionText}</GSText>
                        ) : showUnplacedWarning ? (
                          <GSText className="text-amber-600 font-semibold">
                            {t('student_list.not_enrolled', 'Not placed in a section')}
                          </GSText>
                        ) : null}
                        {joined ? (
                          <GSText className="text-muted-foreground">
                            {(sectionText || showUnplacedWarning) ? ' · ' : ''}
                            {t('student_list.joined', 'Joined {date}').replace('{date}', joined)}
                          </GSText>
                        ) : null}
                      </GSText>
                    ) : null}
                  </VStack>
                  <IconChevronRight color="#C4C9CF" />
                </HStack>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <FilterSheet
        visible={filterSheetOpen}
        value={statusFilter}
        onSelect={setStatusFilter}
        onClose={() => setFilterSheetOpen(false)}
      />

      <ChildActionModal
        visible={!!actionChild}
        child={actionChild}
        onClose={() => setActionChild(null)}
        onSelect={handleChildAction}
      />

      <ChildProfileSheet
        visible={!!selectedChild}
        studentId={selectedChild?.id ?? null}
        fallback={selectedChild}
        onClose={() => setSelectedChild(null)}
        canEdit
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: 'transparent' },
  flex1: { flex: 1 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EMERALD,
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: EMERALD_SOFT,
  },
  filterBtnActive: { backgroundColor: EMERALD },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    height: 46,
    gap: 10,
    ...SHADOW.level1,
  },
  searchInput: { flex: 1, fontSize: 15, color: INK, padding: 0 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  errorText: { color: DANGER, textAlign: 'center', marginBottom: 12 },
  retryButton: { backgroundColor: '#F2F2F7', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  retryText: { color: INK, fontWeight: '600' },
  emptyText: { color: SUBTLE, fontSize: 15, textAlign: 'center' },
  listContent: { paddingHorizontal: 12, paddingBottom: 40 },

  cardBody: { flex: 1, marginLeft: 12 },

  // --- Sheets (filter + profile) ---
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(17,20,23,0.4)', justifyContent: 'flex-end' },
  sheetBackdropTouch: { flex: 1 },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DADDE1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },

  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingHorizontal: 20,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: INK },
  sheetCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CANVAS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  filterOptionText: { fontSize: 15.5, color: INK, fontWeight: '500' },
  filterOptionTextSelected: { color: EMERALD, fontWeight: '700' },
  filterCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterEmptyCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#D8DBDF',
  },

  actionSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingHorizontal: 20,
  },
  actionSheetTitle: { fontSize: 16, fontWeight: '700', color: INK, marginLeft: 10, flexShrink: 1 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    gap: 12,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    backgroundColor: EMERALD_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: 15, fontWeight: '700', color: INK },
  actionDesc: { fontSize: 12, color: SUBTLE, marginTop: 2 },

  profileSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '85%',
    minHeight: 260,
  },
  profileScrollContent: { paddingHorizontal: 22, paddingBottom: 36, paddingTop: 4 },
  profileCloseBtn: {
    alignSelf: 'flex-end',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: CANVAS,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  profileLoadingWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  profileHeaderCol: { alignItems: 'center', marginBottom: 18 },
  profileName: { fontSize: 19, fontWeight: '800', color: INK, marginTop: 12 },
  profileErrorText: { color: DANGER, fontSize: 12.5, textAlign: 'center', marginBottom: 12 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
    gap: 6,
  },
  statusChipDot: { width: 7, height: 7, borderRadius: 3.5 },
  statusChipText: { fontSize: 12, fontWeight: '700' },

  profileSection: {
    borderTopWidth: 1,
    borderTopColor: HAIRLINE,
    paddingTop: 14,
    marginTop: 4,
  },
  profileSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: SUBTLE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: CANVAS,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoLabel: { fontSize: 11.5, color: SUBTLE, fontWeight: '600' },
  infoValue: { fontSize: 14.5, color: INK, fontWeight: '600', marginTop: 1 },
  profileNoteText: { fontSize: 13.5, color: INK, lineHeight: 19 },
});
