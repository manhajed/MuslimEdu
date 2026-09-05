<?php
// Standalone check of School::getFeatures()'s new academic-scoping rule.
// Mirrors the method body exactly (no Laravel needed) so the truth table
// can be verified before this ships - a wrong gate either hands out paid
// features or strips a school's academic system.

const TOGGLEABLE_FEATURES = ['taqdim', 'translation'];
const ACADEMIC_FEATURES = [
    'classesSections', 'classSchedule', 'enrollment', 'academicSetup',
    'gradingSystems', 'programsSubjects', 'academicFacilities',
    'attendanceConfig', 'attendance', 'quranTracker',
];

function getFeatures(array $packageFeatures, array $overrides): array
{
    $academicScoped = count(array_intersect(ACADEMIC_FEATURES, $packageFeatures)) > 0;

    $features = [];
    foreach (TOGGLEABLE_FEATURES as $key) {
        $features[$key] = array_key_exists($key, $overrides)
            ? (bool) $overrides[$key]
            : in_array($key, $packageFeatures, true);
    }
    foreach (ACADEMIC_FEATURES as $key) {
        if (array_key_exists($key, $overrides)) {
            $features[$key] = (bool) $overrides[$key];
            continue;
        }
        $features[$key] = $academicScoped ? in_array($key, $packageFeatures, true) : true;
    }
    return $features;
}

$fails = 0;
function check(string $name, $actual, $expected) {
    global $fails;
    $ok = $actual === $expected;
    if (! $ok) { $fails++; }
    printf("%s  %s%s\n", $ok ? 'PASS' : 'FAIL', $name,
        $ok ? '' : sprintf("  (got %s, want %s)", var_export($actual, true), var_export($expected, true)));
}

// --- 1. No subscription at all: today's behaviour must be unchanged ---
$f = getFeatures([], []);
check('no sub: academics all on', array_sum(array_map(fn($k) => (int) $f[$k], ACADEMIC_FEATURES)), 10);
check('no sub: taqdim off', $f['taqdim'], false);
check('no sub: translation off', $f['translation'], false);

// --- 2. THE REGRESSION GUARD. A package listing the legacy client-side
// key 'grading_systems' must NOT scope academics, or every school on such
// a package loses the other nine. ---
$f = getFeatures(['grading_systems'], []);
check('legacy grading_systems: academics all still on',
    array_sum(array_map(fn($k) => (int) $f[$k], ACADEMIC_FEATURES)), 10);
$f = getFeatures(['grading_systems', 'exam_categories', 'gradebook_review'], []);
check('all three legacy keys: academics all still on',
    array_sum(array_map(fn($k) => (int) $f[$k], ACADEMIC_FEATURES)), 10);

// --- 3. Package grants taqdim only ---
$f = getFeatures(['taqdim'], []);
check('grants taqdim: taqdim on', $f['taqdim'], true);
check('grants taqdim: translation off', $f['translation'], false);
check('grants taqdim: academics untouched',
    array_sum(array_map(fn($k) => (int) $f[$k], ACADEMIC_FEATURES)), 10);

// --- 4. Package names an academic key -> scoping kicks in for that package ---
$f = getFeatures(['taqdim', 'classesSections', 'attendance'], []);
check('scoped: taqdim on', $f['taqdim'], true);
check('scoped: classesSections on', $f['classesSections'], true);
check('scoped: attendance on', $f['attendance'], true);
check('scoped: gradingSystems off', $f['gradingSystems'], false);
check('scoped: quranTracker off', $f['quranTracker'], false);
check('scoped: exactly 2 academics on',
    array_sum(array_map(fn($k) => (int) $f[$k], ACADEMIC_FEATURES)), 2);

// --- 5. Manual override always wins, both directions ---
$f = getFeatures([], ['taqdim' => true]);
check('override on beats empty package', $f['taqdim'], true);
$f = getFeatures(['taqdim'], ['taqdim' => false]);
check('override off beats granting package', $f['taqdim'], false);
$f = getFeatures([], ['classesSections' => false]);
check('override off hides an academic', $f['classesSections'], false);
$f = getFeatures(['classesSections'], ['quranTracker' => true]);
check('override on restores a scoped-out academic', $f['quranTracker'], true);
check('scoped-out academic without override stays off', $f['attendance'], false);

// --- 6. Expired subscription is passed as [] by packageGrantedFeatures() ---
$f = getFeatures([], []);
check('expired sub: taqdim off', $f['taqdim'], false);
check('expired sub: academics all on',
    array_sum(array_map(fn($k) => (int) $f[$k], ACADEMIC_FEATURES)), 10);

echo $fails === 0 ? "\nAll checks passed.\n" : "\n$fails FAILED\n";
exit($fails === 0 ? 0 : 1);
