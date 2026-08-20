import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Globe, ChevronLeft, Languages } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useLocale, RTL_LOCALES } from '../context/LocaleContext';
import { saveUserSettings } from '../services/studentPortalService';
import { COLORS, RADIUS, SHADOW } from '../theme/glass';

const EMERALD = COLORS.emerald;
const EMERALD_SOFT = COLORS.emeraldSoft;
const INK = COLORS.ink;
const BORDER = COLORS.border;

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
];

function GlobeIcon({ color = '#FFFFFF', size = 17 }: { color?: string; size?: number }) {
  return <Globe color={color} size={size} strokeWidth={1.8} />;
}
function BackIcon({ color = INK, size = 22 }: { color?: string; size?: number }) {
  return <ChevronLeft color={color} size={size} strokeWidth={2.4} />;
}
function LanguagesIcon({ color = EMERALD, size = 40 }: { color?: string; size?: number }) {
  return <Languages color={color} size={size} strokeWidth={1.6} />;
}

/**
 * Quick language switch - English/Arabic today, matching the two
 * languages AccountSettingsScreen's fuller language picker always offers
 * (see LANGUAGE_LABELS there). Self-contained like CurrencyBalanceButton:
 * owns its own modal state, so any screen just drops in
 * <LanguageSwitcherButton /> with no wiring.
 *
 * Two looks: 'icon' (default) is the small solid-emerald circle used on
 * the feed header, next to the currency pill. 'pill' is the white
 * globe+code pill (e.g. "EN") used on the login screen's top bar - same
 * pill language as CurrencyBalanceButton, just showing the active locale
 * instead of a balance.
 *
 * The picker itself is a full-screen page (radio rows + a pinned Confirm
 * button), not a small popup dialog - picking a language is not a quick
 * toggle among many trivial choices, closer to a real settings pick.
 * Still a plain RN <Modal> rather than a navigator route: this button is
 * dropped into screens on both sides of the auth boundary (guest login,
 * authenticated feed), and a Modal covers both without needing a route
 * registered in every stack.
 *
 * Persists the same way AccountSettingsScreen's save does (best-effort -
 * a failed save still flips the in-session locale via refresh(), it just
 * won't survive a relaunch) and shows the same "restart required" prompt
 * when the pick flips RTL-ness, since I18nManager only takes full visual
 * effect on the next app launch (see LocaleContext.tsx).
 */
export default function LanguageSwitcherButton({
  style,
  variant = 'icon',
}: {
  style?: object;
  variant?: 'icon' | 'pill';
}) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { locale, isRTL, refresh } = useLocale();
  const [visible, setVisible] = useState(false);
  const [pendingCode, setPendingCode] = useState(locale);
  const [saving, setSaving] = useState(false);

  const open = () => {
    setPendingCode(locale);
    setVisible(true);
  };

  const confirm = async () => {
    if (pendingCode === locale || saving) {
      setVisible(false);
      return;
    }
    setSaving(true);
    const wasRTL = isRTL;
    try {
      if (token) await saveUserSettings(token, { language: pendingCode }).catch(() => {});
      await refresh(pendingCode);
      setVisible(false);
      if (RTL_LOCALES.has(pendingCode) !== wasRTL) {
        Alert.alert('Restart required', 'Restart the app for the right-to-left layout to fully apply.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {variant === 'pill' ? (
        <TouchableOpacity style={[styles.pill, style]} activeOpacity={0.85} onPress={open}>
          <GlobeIcon color={INK} size={18} />
          <Text style={styles.pillText}>{locale.toUpperCase()}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.btn, style]} activeOpacity={0.85} onPress={open}>
          <GlobeIcon />
        </TouchableOpacity>
      )}

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <View style={[styles.screen, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setVisible(false)} hitSlop={10} disabled={saving}>
              <BackIcon />
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Choose Language</Text>

          <View style={styles.heroWrap}>
            <View style={styles.heroCircle}>
              <LanguagesIcon />
            </View>
          </View>

          <View style={styles.list}>
            {LANGUAGE_OPTIONS.map((opt) => {
              const selected = opt.code === pendingCode;
              return (
                <TouchableOpacity
                  key={opt.code}
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => setPendingCode(opt.code)}
                  disabled={saving}
                >
                  <Text style={[styles.rowLabel, selected && styles.rowLabelActive]}>{opt.label}</Text>
                  <View style={[styles.radio, selected && styles.radioActive]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, { marginBottom: Math.max(insets.bottom, 20) }, saving && styles.confirmBtnDisabled]}
            onPress={confirm}
            activeOpacity={0.88}
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.confirmText}>Confirm</Text>}
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: EMERALD,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOW.level1,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...SHADOW.level1,
  },
  pillText: { fontSize: 14, fontWeight: '800', color: INK, letterSpacing: 0.3 },

  screen: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  backBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  title: { fontSize: 24, fontWeight: '800', color: INK, textAlign: 'center', marginTop: 8 },

  heroWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 32 },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: EMERALD_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },

  list: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  rowLabel: { fontSize: 16, color: INK, fontWeight: '500' },
  rowLabelActive: { fontWeight: '700' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: EMERALD },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: EMERALD },

  confirmBtn: {
    backgroundColor: EMERALD,
    borderRadius: RADIUS.pill,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
