import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Switch,
} from 'react-native';
import { Check, Building2, Sparkles } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useLocale } from '../../context/LocaleContext';
import GlassBackground from '../../components/glass/GlassBackground';
import GlassCard from '../../components/glass/GlassCard';
import { WizardStepHeader } from '../../components/wizard/WizardKit';
import { BRAND, RADIUS } from '../../theme/glass';
import { Box } from '../../components/ui/box';
import { VStack } from '../../components/ui/vstack';
import { HStack } from '../../components/ui/hstack';
import { Heading } from '../../components/ui/heading';
import { Text } from '../../components/ui/text';
import { Button, ButtonText, ButtonSpinner } from '../../components/ui/button';
import { Input, InputField } from '../../components/ui/input';
import { FormControl, FormControlLabel, FormControlLabelText } from '../../components/ui/form-control';
import {
  fetchSetupStatus,
  saveInstitutionProfile,
  completeSetup,
  createAcademicYear,
  InstitutionType,
  ProgramDuration,
  SetupStatus,
} from '../../services/academicSetupService';
import { updateOwnProfile } from '../../services/userProfileService';
import {
  GRADING_SYSTEM_TYPES,
  GradingSystemType,
  createGradingSystem,
} from '../../services/adminAcademicCatalogService';
import { createEnrollmentStage } from '../../services/enrollmentWorkflowService';

const EMERALD = BRAND.emerald;

const GRADING_TYPE_QUICK_PICKS: GradingSystemType[] = GRADING_SYSTEM_TYPES.filter((gt) =>
  ['percentage', 'letter', 'gpa', 'pass_fail'].includes(gt),
);
const GRADING_TYPE_LABELS: Partial<Record<GradingSystemType, string>> = {
  percentage: 'Percentage',
  letter: 'Letter Grade',
  gpa: 'GPA',
  pass_fail: 'Pass / Fail',
};

// Orphan schools have no academic subsystem or enrollment pipeline (confirmed
// throughout this codebase - dashboards already hide all academic tiles and
// the enrollment gate already excludes orphan students), so the grading and
// enrollment onboarding steps are skipped entirely for them, not just hidden.
//
// Institution type itself is picked once, during SchoolRegistrationScreen -
// re-asking it here duplicated that choice, so this wizard only re-surfaces
// the markaz-only program-duration sub-choice (as its own step) rather than
// the full type picker.
function buildStepLabels(institutionType: InstitutionType | null) {
  const base: { key: string; label: string }[] = [];
  if (institutionType === 'markaz') {
    base.push({ key: 'program_duration', label: 'Program' });
  }
  base.push(
    { key: 'profile', label: 'Profile' },
    { key: 'admin_info', label: 'Your Info' },
    { key: 'academic_year', label: 'Academic Year' },
  );
  if (institutionType !== 'orphanage') {
    base.push({ key: 'grading', label: 'Grading' }, { key: 'enrollment', label: 'Enrollment' });
  }
  return base;
}

const PROGRAM_DURATION_LABELS: Record<ProgramDuration, string> = {
  one_year: 'One Year',
  three_year: 'Three Years',
};

function CheckIcon() {
  return <Check color="#fff" size={16} strokeWidth={3} />;
}

function BuildingIcon() {
  return <Building2 color={EMERALD} size={26} strokeWidth={1.8} />;
}

function SparkleIcon({ size = 40 }: { size?: number }) {
  return <Sparkles color={EMERALD} size={size} strokeWidth={1.6} />;
}

// Bento-style selectable tile - replaces a vertical list of radio rows with
// a 2-column grid of big, tappable cards. Kept as a plain StyleSheet
// component (not rebuilt on gluestack's Pressable) - it's a specific
// selection-tile pattern with no direct gluestack equivalent among the
// components pulled into this app, and the actual redesign target here is
// the form fields and actions, not this tile grid.
function OptionTile({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.tile, selected && styles.tileSelected]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.tileCheck, selected && styles.tileCheckSelected]}>
        {selected ? <CheckIcon /> : null}
      </View>
      <Text className={`text-sm font-bold mt-2.5 ${selected ? 'text-primary' : 'text-foreground'}`} numberOfLines={2}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/**
 * A labeled text field for this wizard - FormControl + Input/InputField
 * wired up the same way across every step, so each step's field block is
 * just a few of these instead of repeating the label/input pairing.
 */
function WizardField({
  label,
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType,
  autoCapitalize,
  multiline,
  className,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
  autoCapitalize?: 'none' | 'characters';
  multiline?: boolean;
  className?: string;
}) {
  return (
    <FormControl className={className}>
      <FormControlLabel>
        <FormControlLabelText className="text-muted-foreground text-xs font-semibold">
          {label}
        </FormControlLabelText>
      </FormControlLabel>
      <Input className={`h-11 rounded-xl bg-background ${!editable ? 'opacity-60' : ''} ${multiline ? 'h-16 items-start py-2' : ''}`}>
        <InputField
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          className="text-foreground"
        />
      </Input>
    </FormControl>
  );
}

/**
 * First thing a brand-new school's admin sees, in place of the dashboard
 * card grid - three quick steps (institution type, institution profile,
 * first academic year) before the app becomes usable.
 *
 * Gated the same way SchoolCodeSetupScreen is: AdminDashboard renders this
 * whenever `user.academic_setup_completed === false`. Existing/legacy
 * schools are backfilled on the backend (setup_completed_at set on
 * migration) so this never appears for them.
 */
export default function AcademicSetupWizardScreen() {
  const { token, user, updateUser } = useAuth();
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step: institution
  const [institutionType, setInstitutionType] = useState<InstitutionType | null>(null);
  // Markaz-only sub-choice - see PROGRAM_DURATION_LABELS.
  const [programDuration, setProgramDuration] = useState<ProgramDuration | null>(null);
  // Step: profile
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  // Step: admin_info
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  // Step: academic_year
  const [yearTitle, setYearTitle] = useState('');
  // Step: grading (skipped for orphanage)
  const [gradingName, setGradingName] = useState('');
  const [gradingType, setGradingType] = useState<GradingSystemType>('percentage');
  // Step: enrollment (skipped for orphanage)
  const [stageName, setStageName] = useState('');
  const [stageCode, setStageCode] = useState('');
  const [stageInstructions, setStageInstructions] = useState('');
  const [stageIsTerminal, setStageIsTerminal] = useState(true);

  const STEP_LABELS = useMemo(() => buildStepLabels(institutionType), [institutionType]);
  const isLastStep = step === STEP_LABELS.length - 1;
  const stepKey = STEP_LABELS[step]?.key;

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await fetchSetupStatus(token);
      setStatus(data);
      setInstitutionType(data.school.institution_type);
      setProgramDuration(data.school.program_duration);
      setName(data.school.name ?? '');
      setNameAr(data.school.name_ar ?? '');
      setAddress(data.school.address ?? '');
      setPhone(data.school.phone ?? '');
      setAdminName(user?.name ?? '');
      setAdminPhone(user?.phone ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('academic_setup_wizard.load_error', 'Could not load setup status.'));
    } finally {
      setLoading(false);
    }
  }, [token, t, user]);

  useEffect(() => {
    load();
  }, [load]);

  const finishUp = async () => {
    const school = await completeSetup(token!);
    updateUser({
      academic_setup_completed: true,
      institution_type: school.institution_type ?? undefined,
    });
  };

  const advance = async () => {
    if (isLastStep) {
      await finishUp();
    } else {
      setStep((s) => s + 1);
    }
  };

  const goNext = async () => {
    if (!token) return;
    setError(null);

    if (stepKey === 'program_duration') {
      if (!programDuration) {
        setError(t('academic_setup_wizard.choose_program_duration', 'Choose a program duration to continue.'));
        return;
      }
      setSubmitting(true);
      try {
        await saveInstitutionProfile(token, { program_duration: programDuration });
        await advance();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('academic_setup_wizard.save_type_error', 'Could not save program duration.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (stepKey === 'profile') {
      if (!name.trim()) {
        setError(t('academic_setup_wizard.name_required', 'Institution name is required.'));
        return;
      }
      setSubmitting(true);
      try {
        await saveInstitutionProfile(token, {
          name: name.trim(),
          name_ar: nameAr.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
        });
        await advance();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('academic_setup_wizard.save_profile_error', 'Could not save institution profile.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (stepKey === 'admin_info') {
      if (!adminName.trim()) {
        setError(t('academic_setup_wizard.admin_name_required', 'Your name is required.'));
        return;
      }
      setSubmitting(true);
      try {
        const updated = await updateOwnProfile(token, {
          name: adminName.trim(),
          phone: adminPhone.trim() || null,
        });
        updateUser({ name: updated.name, phone: updated.phone });
        await advance();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('academic_setup_wizard.save_admin_info_error', 'Could not save your info.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (stepKey === 'academic_year') {
      if (!yearTitle.trim()) {
        setError(t('academic_setup_wizard.year_title_required', 'Enter a title for your first academic year (e.g. "2026-2027").'));
        return;
      }
      setSubmitting(true);
      try {
        await createAcademicYear(token, yearTitle.trim(), true);
        await advance();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('academic_setup_wizard.finish_error', 'Could not finish setup.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (stepKey === 'grading') {
      if (!gradingName.trim()) {
        setError(t('academic_setup_wizard.grading_name_required', 'Name your grading system to continue.'));
        return;
      }
      setSubmitting(true);
      try {
        await createGradingSystem(token, {
          name: gradingName.trim(),
          type: gradingType,
          status: 'active',
        });
        await advance();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('academic_setup_wizard.grading_error', 'Could not save the grading system.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (stepKey === 'enrollment') {
      if (!stageName.trim()) {
        setError(t('academic_setup_wizard.stage_name_required', 'Name your first enrollment stage to continue.'));
        return;
      }
      setSubmitting(true);
      try {
        await createEnrollmentStage(token, {
          name: stageName.trim(),
          code: stageCode.trim() || null,
          student_instructions: stageInstructions.trim() || null,
          is_terminal: stageIsTerminal,
          status: 'active',
        });
        await advance();
      } catch (err) {
        setError(err instanceof Error ? err.message : t('academic_setup_wizard.stage_error', 'Could not save the enrollment stage.'));
      } finally {
        setSubmitting(false);
      }
    }
  };

  const goBack = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  if (loading || !status) {
    return (
      <View style={styles.flex}>
        <GlassBackground variant="canvas" />
        <View style={styles.centerLoading}>
          <ActivityIndicator color={EMERALD} size="large" />
        </View>
      </View>
    );
  }

  // One-time orientation before the stepper itself - the wizard used to
  // appear cold the instant a newly-approved admin's first login landed on
  // AdminDashboard, no framing at all. Local-only state (not persisted) -
  // it only needs to survive this single mount, not a relaunch, since
  // dismissing it just reveals step 0 of the same already-loaded wizard.
  if (showWelcome) {
    return (
      <View style={styles.flex}>
        <GlassBackground variant="canvas" />
        <VStack className="flex-1 items-center justify-center px-7" space="md">
          <Box className="w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-1">
            <SparkleIcon />
          </Box>
          <Heading size="2xl" className="text-foreground text-center">
            {t('academic_setup_wizard.welcome_title', 'Welcome to MuslimEdu!')}
          </Heading>
          <Text className="text-muted-foreground text-center leading-6">
            {t(
              'academic_setup_wizard.welcome_body',
              '{school} has been approved. Let’s get it set up - just a few quick steps before your Admin, Teacher, and Student portals go live.',
            ).replace('{school}', status.school.name || t('academic_setup_wizard.welcome_school_fallback', 'Your school'))}
          </Text>

          <GlassCard surface="light" radius={RADIUS.lg} style={styles.welcomePreviewCard}>
            <VStack space="sm">
              {STEP_LABELS.map((step_, i) => (
                <HStack key={step_.key} space="md" className="items-center py-1">
                  <Box className="w-6 h-6 rounded-full bg-primary/10 items-center justify-center">
                    <Text className="text-xs font-extrabold text-primary">{i + 1}</Text>
                  </Box>
                  <Text className="text-foreground font-semibold">{t(`academic_setup_wizard.step_${step_.key}`, step_.label)}</Text>
                </HStack>
              ))}
            </VStack>
          </GlassCard>

          <Button size="lg" className="w-full rounded-xl" onPress={() => setShowWelcome(false)}>
            <ButtonText>{t('academic_setup_wizard.get_started', 'Get Started')}</ButtonText>
          </Button>
        </VStack>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <GlassBackground variant="canvas" />
      <KeyboardAvoidingView style={styles.flexInner} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.content}>
          <HStack space="md" className="items-center mb-4 px-5">
            <Box className="w-14 h-14 rounded-2xl bg-primary/10 items-center justify-center">
              <BuildingIcon />
            </Box>
            <VStack className="flex-1">
              <Heading size="lg" className="text-foreground">
                {t('academic_setup_wizard.title', 'Set up your school')}
              </Heading>
              <Text size="sm" className="text-muted-foreground mt-0.5 leading-5">
                {t('academic_setup_wizard.subtitle', 'A few quick steps before your Admin, Teacher, and Student portals go live.')}
              </Text>
            </VStack>
          </HStack>

          <WizardStepHeader
            step={step + 1}
            labels={STEP_LABELS.map((step_) => t(`academic_setup_wizard.step_${step_.key}`, step_.label))}
          />

          <GlassCard surface="light" radius={RADIUS.lg} style={styles.stepCard} contentStyle={styles.stepCardContent}>
            <ScrollView
              contentContainerStyle={styles.stepScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {stepKey === 'program_duration' && (
                <VStack>
                  <Heading size="md" className="text-foreground mb-1.5">
                    {t('academic_setup_wizard.program_duration_heading', 'Program duration')}
                  </Heading>
                  <Text size="sm" className="text-muted-foreground mb-3.5 leading-5">
                    {t('academic_setup_wizard.program_duration_hint', 'How long is your Markaz program?')}
                  </Text>
                  <View style={styles.tileGrid}>
                    {status.program_durations.map((duration) => (
                      <OptionTile
                        key={duration}
                        label={t(`academic_setup_wizard.program_duration_${duration}`, PROGRAM_DURATION_LABELS[duration])}
                        selected={programDuration === duration}
                        onPress={() => setProgramDuration(duration)}
                      />
                    ))}
                  </View>
                </VStack>
              )}

              {stepKey === 'profile' && (
                <VStack>
                  <Heading size="md" className="text-foreground mb-3">
                    {t('academic_setup_wizard.profile_heading', 'Institution profile')}
                  </Heading>
                  <HStack space="md">
                    <WizardField
                      className="flex-1"
                      label={t('academic_setup_wizard.name_label', 'Name')}
                      value={name}
                      onChangeText={setName}
                      placeholder={t('academic_setup_wizard.name_placeholder', 'Institution name')}
                    />
                    <WizardField
                      className="flex-1"
                      label={t('academic_setup_wizard.name_ar_label', 'Arabic name (optional)')}
                      value={nameAr}
                      onChangeText={setNameAr}
                      placeholder="الاسم بالعربية"
                    />
                  </HStack>
                  <HStack space="md" className="mt-3">
                    <WizardField
                      className="flex-1"
                      label={t('academic_setup_wizard.address_label', 'Address (optional)')}
                      value={address}
                      onChangeText={setAddress}
                      placeholder={t('academic_setup_wizard.address_placeholder', 'Address')}
                    />
                    <WizardField
                      className="flex-1"
                      label={t('academic_setup_wizard.phone_label', 'Phone (optional)')}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder={t('academic_setup_wizard.phone_placeholder', 'Phone number')}
                      keyboardType="phone-pad"
                    />
                  </HStack>
                </VStack>
              )}

              {stepKey === 'admin_info' && (
                <VStack>
                  <Heading size="md" className="text-foreground mb-1.5">
                    {t('academic_setup_wizard.admin_info_heading', 'Your info')}
                  </Heading>
                  <Text size="sm" className="text-muted-foreground mb-3.5 leading-5">
                    {t('academic_setup_wizard.admin_info_hint', 'A quick confirmation of your own contact details as the school admin.')}
                  </Text>
                  <HStack space="md">
                    <WizardField
                      className="flex-1"
                      label={t('academic_setup_wizard.admin_name_label', 'Your name')}
                      value={adminName}
                      onChangeText={setAdminName}
                      placeholder={t('academic_setup_wizard.admin_name_placeholder', 'Your name')}
                    />
                    <WizardField
                      className="flex-1"
                      label={t('academic_setup_wizard.admin_phone_label', 'Phone (optional)')}
                      value={adminPhone}
                      onChangeText={setAdminPhone}
                      placeholder={t('academic_setup_wizard.admin_phone_placeholder', 'Your phone number')}
                      keyboardType="phone-pad"
                    />
                  </HStack>
                  <WizardField
                    className="mt-3"
                    label={t('academic_setup_wizard.admin_email_label', 'Email')}
                    value={user?.email ?? ''}
                    editable={false}
                  />
                </VStack>
              )}

              {stepKey === 'academic_year' && (
                <VStack>
                  <Heading size="md" className="text-foreground mb-1.5">
                    {t('academic_setup_wizard.year_heading', 'Your first academic year')}
                  </Heading>
                  <Text size="sm" className="text-muted-foreground mb-3.5 leading-5">
                    {t('academic_setup_wizard.year_hint', 'You can add more academic years and terms later from Academic Setup in the admin menu.')}
                  </Text>
                  <WizardField
                    label={t('academic_setup_wizard.year_title_label', 'Academic year title')}
                    value={yearTitle}
                    onChangeText={setYearTitle}
                    placeholder="e.g. 2026-2027"
                  />
                </VStack>
              )}

              {stepKey === 'grading' && (
                <VStack>
                  <Heading size="md" className="text-foreground mb-1.5">
                    {t('academic_setup_wizard.grading_heading', 'Your first grading system')}
                  </Heading>
                  <Text size="sm" className="text-muted-foreground mb-3.5 leading-5">
                    {t('academic_setup_wizard.grading_hint', 'You can add more grading systems and build out grade scales later from Academic Setup.')}
                  </Text>
                  <WizardField
                    label={t('academic_setup_wizard.grading_name_label', 'Name')}
                    value={gradingName}
                    onChangeText={setGradingName}
                    placeholder={t('academic_setup_wizard.grading_name_placeholder', 'e.g. Standard Grading')}
                  />
                  <Text size="xs" className="text-muted-foreground font-semibold mt-3.5 mb-2">
                    {t('academic_setup_wizard.grading_type_label', 'Type')}
                  </Text>
                  <View style={styles.tileGrid}>
                    {GRADING_TYPE_QUICK_PICKS.map((gt) => (
                      <OptionTile
                        key={gt}
                        label={t(`academic_setup_wizard.grading_type_${gt}`, GRADING_TYPE_LABELS[gt] ?? gt)}
                        selected={gradingType === gt}
                        onPress={() => setGradingType(gt)}
                      />
                    ))}
                  </View>
                </VStack>
              )}

              {stepKey === 'enrollment' && (
                <VStack>
                  <Heading size="md" className="text-foreground mb-1.5">
                    {t('academic_setup_wizard.enrollment_heading', 'Your first enrollment stage')}
                  </Heading>
                  <Text size="sm" className="text-muted-foreground mb-3.5 leading-5">
                    {t('academic_setup_wizard.enrollment_hint', 'You can build out a full multi-stage pipeline later from Enrollment in the admin menu.')}
                  </Text>
                  <HStack space="md">
                    <WizardField
                      className="flex-[2]"
                      label={t('academic_setup_wizard.stage_name_label', 'Stage name')}
                      value={stageName}
                      onChangeText={setStageName}
                      placeholder={t('academic_setup_wizard.stage_name_placeholder', 'e.g. Admission')}
                    />
                    <WizardField
                      className="flex-1"
                      label={t('academic_setup_wizard.stage_code_label', 'Code (optional)')}
                      value={stageCode}
                      onChangeText={setStageCode}
                      placeholder={t('academic_setup_wizard.stage_code_placeholder', 'e.g. ADMISSION')}
                      autoCapitalize="characters"
                    />
                  </HStack>
                  <WizardField
                    className="mt-3"
                    label={t('academic_setup_wizard.stage_instructions_label', "What should the student do? (optional)")}
                    value={stageInstructions}
                    onChangeText={setStageInstructions}
                    placeholder={t('academic_setup_wizard.stage_instructions_placeholder', 'Shown to the student at this stage')}
                    multiline
                  />
                  <HStack className="items-center mt-4 py-1" space="md">
                    <VStack className="flex-1">
                      <Text className="text-foreground font-semibold mb-0.5">
                        {t('academic_setup_wizard.stage_final_label', 'Final stage')}
                      </Text>
                      <Text size="sm" className="text-muted-foreground leading-5">
                        {t('academic_setup_wizard.stage_final_hint', "Reaching this stage marks the student's enrollment as complete. A new school usually starts with just one.")}
                      </Text>
                    </VStack>
                    <Switch value={stageIsTerminal} onValueChange={setStageIsTerminal} trackColor={{ true: EMERALD }} />
                  </HStack>
                </VStack>
              )}
            </ScrollView>
          </GlassCard>

          {error ? (
            <Text className="text-destructive text-sm text-center px-5 mb-3">{error}</Text>
          ) : null}

          <HStack space="sm" className="px-5 pb-1">
            {step > 0 ? (
              <Button variant="outline" className="flex-1 rounded-xl" onPress={goBack} disabled={submitting}>
                <ButtonText>{t('common.back', 'Back')}</ButtonText>
              </Button>
            ) : null}
            <Button className="flex-[2] rounded-xl" onPress={goNext} disabled={submitting}>
              {submitting ? <ButtonSpinner color="white" /> : null}
              <ButtonText>
                {isLastStep ? t('academic_setup_wizard.finish_setup', 'Finish Setup') : t('academic_setup_wizard.continue', 'Continue')}
              </ButtonText>
            </Button>
          </HStack>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#EFF7F1' },
  flexInner: { flex: 1 },
  centerLoading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // flex (not flexGrow) - the header, stepper and action buttons stay put
  // as a fixed frame; only the step card's own content scrolls (see
  // stepCard/stepScroll below). No horizontal padding here anymore - the
  // step card goes edge-to-edge; every other row gets its own horizontal
  // padding instead of inheriting one blanket inset.
  content: { flex: 1, paddingTop: 56 },

  // flex:1 - the step card fills whatever vertical space is left between
  // the stepper above and the action buttons below.
  //
  // Its content scrolls rather than being clipped: most steps do fit, but
  // some don't - picking Markaz reveals an extra "Program duration" section,
  // and a short screen squeezes the taller steps regardless. The card used
  // to center its content with no ScrollView, so anything too tall
  // overflowed and got cut off at BOTH ends (the heading above and the last
  // options below simply disappeared). stepScroll keeps that centered look
  // while content still fits, and scrolls once it doesn't.
  stepCard: { flex: 1, marginBottom: 16 },
  // flex:1 so the ScrollView inside the card gets a bounded height - without
  // it the card's inner wrapper sizes to content and nothing ever scrolls.
  stepCardContent: { flex: 1 },
  stepScroll: { flexGrow: 1, justifyContent: 'center' },

  // Bento grid: big, self-contained selectable tiles (2 per row) instead
  // of a vertical list of plain radio rows - fewer, taller rows means the
  // same set of options takes less total height while looking "bigger".
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  tile: {
    width: '48%',
    minHeight: 76,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 14,
    justifyContent: 'space-between',
  },
  tileSelected: { borderColor: EMERALD, backgroundColor: 'rgba(31,174,100,0.14)' },
  tileCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  // BRAND.emeraldDeep, not EMERALD - white check icon on raw emerald
  // (#1FAE64) measures 2.88:1, below WCAG AA; deep emerald measures 5.42:1.
  tileCheckSelected: { borderColor: BRAND.emeraldDeep, backgroundColor: BRAND.emeraldDeep },

  welcomePreviewCard: { width: '100%' },
});
