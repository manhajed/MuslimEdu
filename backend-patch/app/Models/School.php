<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class School extends Model
{
    use HasFactory, Auditable, SoftDeletes;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'title', 'email', 'phone', 'address', 'description', 'school_info', 'status', 'school_currency',
        'currency_position', 'school_type',
        // --- Institution Profile (Phase 3 - Academic Setup Wizard) ---
        'name_ar', 'logo_path', 'seal_path', 'timezone', 'default_language',
        'secondary_language', 'calendar_type', 'working_days', 'school_hours_start',
        'school_hours_end', 'academic_year_structure', 'setup_completed_at',
        'academic_system_version',
        // program_duration and id_card_background_path were missing here
        // while their columns, their validation rules and their
        // schoolPayload() entries all existed. admin_school_profile_update()
        // built both into its $data array and Eloquent then dropped them on
        // mass-assignment, so picking a program duration or uploading an ID
        // card background returned "saved" and silently persisted nothing.
        'program_duration', 'id_card_background_path',
        // --- ID card identity (2026_08_29_000000 migration) ---
        'address_ar', 'sec_reg', 'sec_reg_ar', 'id_card_theme',
        // --- Self-registration gate (2026_09_06_000000 migration) ---
        // See SchoolRegistrationApiController::submit()/approve()/reject().
        'registration_status', 'rejection_reason',
        // school_code intentionally stays out of $fillable - it's set once
        // via admin_set_school_code() using direct attribute assignment,
        // and that route re-checks it's empty before allowing a write, so
        // it stays effectively locked. Do not add it here.
    ];

    protected $casts = [
        'working_days' => 'array',
        'setup_completed_at' => 'datetime',
    ];

    // Every value the `school_type` enum column accepts (see
    // 2026_09_04_110000_widen_school_type_enum.php) and the public
    // registration wizard's institutionTypes() can submit - kept here so
    // SuperAdmin create/update validation and the school list's type
    // labels never drift out of sync with the actual DB constraint.
    public const SCHOOL_TYPES = ['regular', 'orphanage', 'mahad', 'madrasa', 'markaz', 'online_class'];

    // Values `registration_status` can hold. Every school predating
    // self-registration gating defaults to 'approved' (see the migration) -
    // only a row created by SchoolRegistrationApiController::submit() ever
    // starts at 'pending' or later moves to 'rejected'.
    public const REGISTRATION_STATUSES = ['pending', 'approved', 'rejected'];

    // Optional feature keys a school can offer on top of the regular
    // academic system - off by default, turned on only if the school's
    // subscription package grants them (see getFeatures() below), with a
    // per-school manual override on top of that. Kept as a class const
    // (not config) since both the web dashboard's toggle UI and
    // requireFeatureAccess() gates need the exact same list.
    public const TOGGLEABLE_FEATURES = ['taqdim', 'translation'];

    // Academic/core dashboard sections. On by default for every school,
    // since these predate per-school toggling and every existing school
    // already relies on all of them today. A package CAN now scope them
    // (see getFeatures()), but only by naming at least one of these keys
    // explicitly - a package that names none restricts none, so a package
    // change can still never silently hide one of these from a school
    // that already has it. Keys match the admin-dashboard.js menu item
    // `key` they gate.
    public const ACADEMIC_FEATURES = [
        'classesSections', 'classSchedule', 'enrollment', 'academicSetup',
        'gradingSystems', 'programsSubjects', 'academicFacilities',
        'attendanceConfig', 'attendance', 'quranTracker',
    ];

    /** Every feature key requireFeatureAccess()/the SuperAdmin toggle endpoints accept. */
    public static function allFeatureKeys(): array
    {
        return array_merge(self::TOGGLEABLE_FEATURES, self::ACADEMIC_FEATURES);
    }

    /**
     * The feature keys the school's active subscription package grants,
     * or [] when there is no active subscription. Read live so a
     * package/subscription change takes effect immediately.
     *
     * NOTE the package's `features` array is free-form (packageCreate()
     * validates it as 'nullable|array', nothing more) and carries TWO
     * separate vocabularies:
     *   - this class's keys ('taqdim', 'classesSections', ...), matched here;
     *   - 'grading_systems'/'exam_categories'/'gradebook_review', which
     *     gate three admin-dashboard tiles client-side only
     *     (SUBSCRIPTION_FEATURE_KEYS / AdminDashboard.isFeatureLocked).
     * They are deliberately NOT aliased onto each other. 'grading_systems'
     * looks like it should mean 'gradingSystems', but treating it that way
     * would make every package that already lists it - the subscription
     * editor has offered it for a long time - suddenly scope academics
     * (below) and strip the other nine from those schools.
     */
    private function packageGrantedFeatures(): array
    {
        $subscription = Subscription::where('school_id', $this->id)->latest('id')->first();
        if (! $subscription || ! ($subscription->expire_date == '0' || $subscription->expire_date > time())) {
            return [];
        }
        $package = Package::find($subscription->package_id);
        return json_decode($package->features ?? '[]', true) ?: [];
    }

    /**
     * A school's *effective* features, with any per-school manual override
     * applied on top of whatever the subscription says. Computed live on
     * every call rather than cached on the school row, so a
     * package/subscription/override change is reflected immediately with
     * nothing to keep in sync.
     *
     * TOGGLEABLE_FEATURES are granted only by the package - off by default.
     *
     * ACADEMIC_FEATURES are opt-in-restricted, the same rule
     * AdminDashboard.isFeatureLocked() already applies to its three keys: a
     * package that names NO academic feature restricts none of them, so
     * every school on a package that predates academic scoping keeps
     * everything it has today. Only once a package names at least one
     * academic key does it narrow that school to just the ones it names.
     * That asymmetry is deliberate - turning an academic feature off takes
     * away something the school already relies on, so it has to be an
     * explicit choice on the package, never a side effect of one.
     */
    public function getFeatures(): array
    {
        $packageFeatures = $this->packageGrantedFeatures();
        $overrides = $this->getFeatureOverrides();
        $academicScoped = count(array_intersect(self::ACADEMIC_FEATURES, $packageFeatures)) > 0;

        $features = [];
        foreach (self::TOGGLEABLE_FEATURES as $key) {
            $features[$key] = array_key_exists($key, $overrides)
                ? (bool) $overrides[$key]
                : in_array($key, $packageFeatures, true);
        }
        foreach (self::ACADEMIC_FEATURES as $key) {
            if (array_key_exists($key, $overrides)) {
                $features[$key] = (bool) $overrides[$key];
                continue;
            }
            $features[$key] = $academicScoped ? in_array($key, $packageFeatures, true) : true;
        }
        return $features;
    }

    /** Only the keys a SuperAdmin explicitly flipped - see the migration's docblock. */
    public function getFeatureOverrides(): array
    {
        return json_decode($this->feature_overrides ?? '', true) ?: [];
    }

    /** Flip one feature on/off regardless of what the subscription grants. */
    public function setFeatureOverride(string $key, bool $enabled): void
    {
        $overrides = $this->getFeatureOverrides();
        $overrides[$key] = $enabled;
        $this->feature_overrides = json_encode($overrides);
        $this->save();
    }

    /** "Resync from subscription" - drop the override, go back to whatever the package grants. */
    public function clearFeatureOverride(string $key): void
    {
        $overrides = $this->getFeatureOverrides();
        unset($overrides[$key]);
        $this->feature_overrides = json_encode($overrides);
        $this->save();
    }

    public function clearAllFeatureOverrides(): void
    {
        $this->feature_overrides = json_encode([]);
        $this->save();
    }

    /** True once a SuperAdmin has approved this school (or it predates self-registration gating). */
    public function isRegistrationApproved(): bool
    {
        return ($this->registration_status ?? 'approved') === 'approved';
    }
}
