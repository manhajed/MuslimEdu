<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\ApiController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\EnrollmentWorkflowController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\AcademicSetupController;
use App\Http\Controllers\AcademicCatalogController;
use App\Http\Controllers\AcademicStructureController;
use App\Http\Controllers\StudentIdentityController;
use App\Http\Controllers\AcademicCompletionController;
use App\Http\Controllers\AcademicGradeController;
use App\Http\Controllers\AcademicScheduleController;
use App\Http\Controllers\AcademicPolicyController;
use App\Http\Controllers\AcademicAnalyticsController;
use App\Http\Controllers\AcademicAuthorizationController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\TwoFactorController;
use App\Http\Controllers\AcademicCalendarController;
use App\Http\Controllers\AcademicCommunicationController;
use App\Http\Controllers\AcademicDocumentController;
use App\Http\Controllers\AcademicFacilitiesController;
use App\Http\Controllers\AcademicIntegrationController;
use App\Http\Controllers\AcademicLocaleController;
use App\Http\Controllers\AcademicPortalController;
use App\Http\Controllers\StudentPortalController;
use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AcademicStudentLifecycleController;
use App\Http\Controllers\AttendanceConfigController;
use App\Http\Controllers\CurriculumVersionController;
use App\Http\Controllers\OrgStructureController;
use App\Http\Controllers\BehaviorController;
use App\Http\Controllers\ExaminationController;
use App\Http\Controllers\MemorizationController;
use App\Http\Controllers\StudentProgressController;
use App\Http\Controllers\ReportExportController;
use App\Http\Controllers\SubjectLoadingController;
use App\Http\Controllers\AcademicCompletionEngineController;
use App\Http\Controllers\SuperAdminApiController;
use App\Http\Controllers\AlumniRegistrationApiController;
use App\Http\Controllers\DemoFeedbackController;
use App\Http\Controllers\SchoolRegistrationApiController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\StudentPreregistrationController;
use App\Http\Controllers\ScholarshipProgramController;
use App\Http\Controllers\ScholarshipApplicationController;
use App\Http\Controllers\ScholarshipController;
use App\Http\Controllers\ScholarshipDocumentController;
use App\Http\Controllers\ScholarshipTranslationController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/



Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Security hardening: 6 attempts per minute per IP. Without this, the
// login endpoint had no brute-force protection at all - unlimited
// password guesses against any account.
Route::post('/login', [ApiController::class, 'login'])->middleware('throttle:6,1');

// "Register Your School" self-service signup (LoginScreen's Get Started
// sheet). Public/no auth - there's no account yet to hold a token. Same
// throttle as /login, since it's another unauthenticated form that takes
// an email + password and could otherwise be hammered.
Route::post('/school_registration_submit', [SchoolRegistrationApiController::class, 'submit'])->middleware('throttle:6,1');

// "Create Alumni Account" self-service signup (LoginScreen's Get Started
// sheet's Alumni option). Public/no auth, same throttle rationale as above.
Route::post('/alumni_registration_submit', [AlumniRegistrationApiController::class, 'submit'])->middleware('throttle:6,1');

// Feeds the "pick your school" step of alumni registration (web + RN).
// Public/no auth - lightweight, non-sensitive fields only.
Route::post('/public_school_list', [AlumniRegistrationApiController::class, 'schools']);

// Walk-in Admission QR flow's public side (student-preregister.php,
// opened by scanning the QR admission-management.php shows). Public/no
// auth - the student doesn't have an account yet. Same throttle as
// /login and the two registration endpoints above, since this one also
// creates a login (email + password) and could otherwise be hammered.
Route::post('/public_preregistration_form_config', [StudentPreregistrationController::class, 'public_preregistration_form_config']);
Route::post('/public_student_preregistration_submit', [StudentPreregistrationController::class, 'public_student_preregistration_submit'])->middleware('throttle:6,1');

// "How's the demo?" card on the demo build's login screen. Public/no auth
// - submitted before signing in. Same throttle as the forms above, since
// it's another unauthenticated POST that could otherwise be hammered.
Route::post('/demo_feedback_submit', [DemoFeedbackController::class, 'submit'])->middleware('throttle:6,1');

// Meta calls these directly (no Sanctum token to send) - one fixed path,
// since there's only ever one Facebook App/Page for the whole platform.
// See MessengerWebhookController for the signature verification that
// actually gates trust here, not the URL being public.
// Named so MessengerIntegrationController can build the "paste this into
// Facebook" URL with route() instead of hardcoding a path prefix - route()
// picks up RouteServiceProvider's 'api' prefix and APP_URL on its own, so
// the displayed URL stays correct no matter where the app is mounted.
Route::get('/facebook_webhook', [\App\Http\Controllers\MessengerWebhookController::class, 'verify'])->name('messenger.webhook');
Route::post('/facebook_webhook', [\App\Http\Controllers\MessengerWebhookController::class, 'receive']);

Route::group(['middleware' => ['auth:sanctum']], function () {
    Route::post('/me', [ApiController::class, 'me']);
    Route::post('/messenger_connection_status', [\App\Http\Controllers\MessengerIntegrationController::class, 'connectionStatus']);
    Route::post('/messenger_connect_link', [\App\Http\Controllers\MessengerIntegrationController::class, 'connectLink']);
    Route::post('/messenger_disconnect', [\App\Http\Controllers\MessengerIntegrationController::class, 'disconnect']);

    // In-app notification centre. NotificationController, its three models
    // (Notification/NotificationPreference/DeviceToken) and their tables
    // all already existed, but these routes were never registered - so
    // every client call 404'd and both the web Notifications screen and
    // the RN inbox showed "Could not load notifications." Names match
    // exactly what the shipped clients already call: web dashboard.js's
    // fetchNotifications/markNotificationRead/markAllNotificationsRead/
    // fetchUnreadNotificationCount, and RN notificationService.ts's
    // documented endpoint list. Any authenticated role.
    Route::post('/notifications_list', [NotificationController::class, 'index']);
    Route::post('/notifications_unread_count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications_mark_read', [NotificationController::class, 'markRead']);
    Route::post('/notifications_mark_all_read', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications_delete', [NotificationController::class, 'destroy']);
    Route::post('/notifications_register_device', [NotificationController::class, 'registerDevice']);
    Route::post('/notifications_unregister_device', [NotificationController::class, 'unregisterDevice']);
    // No client calls these two yet - wired anyway so the controller's
    // per-category mute/quiet-hours support isn't another built-but-
    // unreachable feature like the six above turned out to be.
    Route::post('/notification_preferences', [NotificationController::class, 'preferences']);
    Route::post('/notification_preferences_save', [NotificationController::class, 'savePreferences']);

    Route::post('/logout-all', [ApiController::class, 'logoutAll']);
    Route::post('/user_details', [ApiController::class, 'userDetails']);
    Route::post('/routine', [ApiController::class, 'routine']);
    Route::post('/attendance', [ApiController::class, 'attendanceReport']);
    Route::post('/subjects', [ApiController::class, 'subjects']);
    Route::post('/syllabus_list', [ApiController::class, 'syllabus_list']);
    Route::post('/teacher_list', [ApiController::class, 'teacher_list']);
    Route::post('/book_list', [ApiController::class, 'book_list']);
    Route::post('/book_issue_list', [ApiController::class, 'book_issue_list']);
    Route::post('/exam_list', [ApiController::class, 'exam_list']);
    Route::post('/marks', [ApiController::class, 'marks']);
    Route::post('/profile_update', [ApiController::class, 'profile_update']);
    Route::post('/fee_list', [ApiController::class, 'fee_list']);

    // Widget announcements - any authenticated role, active cards only
    Route::post('/widget_announcements_list', [ApiController::class, 'widget_announcements_list']);

    // Fees - admin/accountant-facing (Cashier)
    Route::post('/admin_fee_list', [ApiController::class, 'admin_fee_list']);
    Route::post('/admin_fee_record_payment', [ApiController::class, 'admin_fee_record_payment']);
    Route::post('/admin_fee_create', [ApiController::class, 'admin_fee_create']);

    Route::post('/logout', [ApiController::class, 'logout']);
    Route::post('/account_delete', [ApiController::class, 'account_delete']);
    Route::post('/change_profile_photo', [ApiController::class, 'change_profile_photo']);

    // Orphan Management - child-facing
    Route::post('/orphan_profile', [ApiController::class, 'orphan_profile']);
    Route::post('/orphan_report_status', [ApiController::class, 'orphan_report_status']);
    Route::post('/orphan_report_submit', [ApiController::class, 'orphan_report_submit']);
    Route::post('/orphan_sponsorship', [ApiController::class, 'orphan_sponsorship']);

    // Orphan Management - admin-facing
    Route::post('/admin_children_list', [ApiController::class, 'admin_children_list']);
    Route::post('/admin_child_profile', [ApiController::class, 'admin_child_profile']);
    Route::post('/admin_child_orphan_profile_update', [ApiController::class, 'admin_child_orphan_profile_update']);
    Route::post('/admin_child_basic_profile_update', [ApiController::class, 'admin_child_basic_profile_update']);
    Route::post('/admin_orphan_report_list', [ApiController::class, 'admin_orphan_report_list']);
    Route::post('/admin_orphan_report_create', [ApiController::class, 'admin_orphan_report_create']);
    Route::post('/admin_orphan_report_delete', [ApiController::class, 'admin_orphan_report_delete']);
    Route::post('/admin_orphan_report_overview', [ApiController::class, 'admin_orphan_report_overview']);
    Route::post('/admin_sponsor_list', [ApiController::class, 'admin_sponsor_list']);
    Route::post('/admin_sponsor_store', [ApiController::class, 'admin_sponsor_store']);
    Route::post('/admin_sponsor_update', [ApiController::class, 'admin_sponsor_update']);
    Route::post('/admin_sponsor_delete', [ApiController::class, 'admin_sponsor_delete']);
    Route::post('/admin_sponsor_reset_password', [ApiController::class, 'admin_sponsor_reset_password']);
    Route::post('/admin_sponsorship_detail', [ApiController::class, 'admin_sponsorship_detail']);
    Route::post('/admin_sponsorship_assign', [ApiController::class, 'admin_sponsorship_assign']);
    Route::post('/admin_sponsorship_payment_store', [ApiController::class, 'admin_sponsorship_payment_store']);
    Route::post('/admin_sponsorship_payment_delete', [ApiController::class, 'admin_sponsorship_payment_delete']);

    // Dashboard overview & Tasks
    Route::post('/admin_dashboard_overview', [ApiController::class, 'admin_dashboard_overview']);
    Route::post('/admin_task_list', [ApiController::class, 'admin_task_list']);
    Route::post('/admin_task_store', [ApiController::class, 'admin_task_store']);
    Route::post('/admin_task_update', [ApiController::class, 'admin_task_update']);
    Route::post('/admin_task_complete', [ApiController::class, 'admin_task_complete']);
    Route::post('/admin_task_delete', [ApiController::class, 'admin_task_delete']);

    // Sponsor Portal - sponsor-facing
    Route::post('/sponsor_my_children', [ApiController::class, 'sponsor_my_children']);
    Route::post('/sponsor_child_reports', [ApiController::class, 'sponsor_child_reports']);
    Route::post('/sponsor_message_thread', [ApiController::class, 'sponsor_message_thread']);
    Route::post('/sponsor_message_send', [ApiController::class, 'sponsor_message_send']);

    // Sponsor Portal - child-facing
    Route::post('/orphan_sponsor_message_thread', [ApiController::class, 'orphan_sponsor_message_thread']);
    Route::post('/orphan_sponsor_message_send', [ApiController::class, 'orphan_sponsor_message_send']);

    // Admission - admin-facing
    Route::post('/admin_admission_single', [ApiController::class, 'admin_admission_single']);
    Route::post('/admin_teacher_admission_single', [ApiController::class, 'admin_teacher_admission_single']);
    Route::post('/admin_registrar_admission_single', [ApiController::class, 'admin_registrar_admission_single']);
    Route::post('/admin_registrar_list', [ApiController::class, 'admin_registrar_list']);
    Route::post('/admin_registrar_profile', [ApiController::class, 'admin_registrar_profile']);

    // Cashier (accountant) accounts - admin-facing
    Route::post('/admin_accountant_admission_single', [ApiController::class, 'admin_accountant_admission_single']);
    Route::post('/admin_accountant_list', [ApiController::class, 'admin_accountant_list']);
    Route::post('/admin_accountant_profile', [ApiController::class, 'admin_accountant_profile']);
    Route::post('/admin_accountant_profile_update', [ApiController::class, 'admin_accountant_profile_update']);
    Route::post('/admin_admission_bulk', [ApiController::class, 'admin_admission_bulk']);
    Route::post('/admin_admission_excel', [ApiController::class, 'admin_admission_excel']);
    Route::post('/admin_admission_word', [ApiController::class, 'admin_admission_word']);
    Route::post('/admin_set_school_code', [ApiController::class, 'admin_set_school_code']);

    // Walk-in Admission QR flow - admin-facing (admission-management.php
    // configures the form; preregistrations.php/registrar-dashboard review
    // the submissions it produces). See StudentPreregistrationController's
    // class docblock for how this connects to admission.php. Role checks
    // (admin for config, admin_or_registrar for the review queue) are
    // enforced inside each controller method, not here.
    Route::post('/admin_preregistration_config_get', [StudentPreregistrationController::class, 'admin_preregistration_config_get']);
    Route::post('/admin_preregistration_config_update', [StudentPreregistrationController::class, 'admin_preregistration_config_update']);
    Route::post('/admin_preregistration_list', [StudentPreregistrationController::class, 'admin_preregistration_list']);
    Route::post('/admin_preregistration_detail', [StudentPreregistrationController::class, 'admin_preregistration_detail']);
    Route::post('/admin_preregistration_reject', [StudentPreregistrationController::class, 'admin_preregistration_reject']);
    Route::post('/admin_preregistration_mark_admitted', [StudentPreregistrationController::class, 'admin_preregistration_mark_admitted']);
    Route::post('/admin_preregistration_delete', [StudentPreregistrationController::class, 'admin_preregistration_delete']);
 // Student & Staff Code Configuration (master spec §4.5, generalized to
 // cover staff too - all four routes take an optional target_type param,
 // 'student' or 'staff', defaulting to 'student'. The old, never-wired
 // StudentIdConfigApi routes (admin_student_id_config/_save,
 // admin_student_id_preview) are removed - see StudentNumberApi.php.
 Route::post('/admin_student_number_format_show', [ApiController::class, 'adminStudentNumberFormatShow']);
 Route::post('/admin_student_number_format_save', [ApiController::class, 'adminStudentNumberFormatSave']);
 Route::post('/admin_student_number_format_preview', [ApiController::class, 'adminStudentNumberFormatPreview']);
 Route::post('/admin_student_number_sequence_reset', [ApiController::class, 'adminStudentNumberSequenceReset']);

    // Student - attendance report/summary and progress summary. Implementations
    // already existed in Traits\StudentProgressApi and Traits\StudentAttendanceApi
    // but were never registered here, leaving StudentAttendanceScreen and
    // StudentProgressScreen calling dead endpoints.
    Route::post('/student_attendance_report', [ApiController::class, 'student_attendance_report']);
    Route::post('/student_attendance_summary', [ApiController::class, 'student_attendance_summary']);
    Route::post('/student_progress_summary', [ApiController::class, 'student_progress_summary']);

    // Reference data
    Route::post('/admin_class_list', [ApiController::class, 'admin_class_list']);
    Route::post('/admin_section_list', [ApiController::class, 'admin_section_list']);

    // Admin - class teacher assignment
    Route::post('/admin_class_teacher_list', [ApiController::class, 'admin_class_teacher_list']);
    Route::post('/admin_class_teacher_assign', [ApiController::class, 'admin_class_teacher_assign']);

    // Admin - subjects, teacher & schedule per class
    Route::post('/admin_class_subjects_list', [ApiController::class, 'admin_class_subjects_list']);
    Route::post('/admin_subject_create', [ApiController::class, 'admin_subject_create']);
    Route::post('/admin_class_subject_assign', [ApiController::class, 'admin_class_subject_assign']);
    Route::post('/admin_class_subject_remove', [ApiController::class, 'admin_class_subject_remove']);

    // Admin - Departments
    Route::post('/admin_departments_list', [ApiController::class, 'admin_departments_list']);
    Route::post('/admin_departments_create', [ApiController::class, 'admin_departments_create']);
    Route::post('/admin_departments_update', [ApiController::class, 'admin_departments_update']);
    Route::post('/admin_departments_delete', [ApiController::class, 'admin_departments_delete']);

    // Admin - Curricula
    Route::post('/admin_curricula_list', [ApiController::class, 'admin_curricula_list']);
    Route::post('/admin_curricula_create', [ApiController::class, 'admin_curricula_create']);
    Route::post('/admin_curricula_update', [ApiController::class, 'admin_curricula_update']);
    Route::post('/admin_curricula_delete', [ApiController::class, 'admin_curricula_delete']);

    // Admin - Curriculum versioning (§4.6). Prerequisites/co-requisites are
    // NOT duplicated here - that's already a subject-level feature, see
    // admin_subjects_catalog_create/update's prerequisite_subject_ids /
    // corequisite_subject_ids in AcademicCatalogController.
    Route::post('/admin_curriculum_version_list', [CurriculumVersionController::class, 'versionList']);
    Route::post('/admin_curriculum_version_save', [CurriculumVersionController::class, 'versionSave']);
    Route::post('/admin_curriculum_version_delete', [CurriculumVersionController::class, 'versionDelete']);
    Route::post('/admin_curriculum_competency_list', [CurriculumVersionController::class, 'competencyList']);
    Route::post('/admin_curriculum_competency_save', [CurriculumVersionController::class, 'competencySave']);
    Route::post('/admin_curriculum_competency_delete', [CurriculumVersionController::class, 'competencyDelete']);

    // Admin - §4.1 Org structure: faculties/colleges/institutes, streams/specializations.
    // Program<->Curriculum linking is NOT a separate route - it's program_id
    // on the existing admin_curricula_create/update above.
    Route::post('/admin_faculty_list', [OrgStructureController::class, 'facultyList']);
    Route::post('/admin_faculty_save', [OrgStructureController::class, 'facultySave']);
    Route::post('/admin_faculty_delete', [OrgStructureController::class, 'facultyDelete']);
    Route::post('/admin_stream_list', [OrgStructureController::class, 'streamList']);
    Route::post('/admin_stream_save', [OrgStructureController::class, 'streamSave']);
    Route::post('/admin_stream_delete', [OrgStructureController::class, 'streamDelete']);

    // M4 - Behavior & discipline module (genuinely new: no table, routes,
    // or screens existed before this).
    Route::post('/admin_behavior_category_list', [BehaviorController::class, 'categoryList']);
    Route::post('/admin_behavior_category_save', [BehaviorController::class, 'categorySave']);
    Route::post('/admin_behavior_category_delete', [BehaviorController::class, 'categoryDelete']);
    Route::post('/behavior_incident_list', [BehaviorController::class, 'incidentList']);
    Route::post('/behavior_incident_save', [BehaviorController::class, 'incidentSave']);
    Route::post('/behavior_incident_delete', [BehaviorController::class, 'incidentDelete']);
    Route::post('/behavior_incident_notify_parent', [BehaviorController::class, 'incidentNotifyParent']);

    // M4 - Dedicated examinations module. `examinations` /
    // `examination_results` tables and models already existed (see
    // Examination model's own docblock) but had no controller/routes at
    // all until now - this wires up what was already scaffolded rather
    // than redesigning it. Distinct from the legacy exam_list/exams table.
    Route::post('/examination_my_assignments', [ExaminationController::class, 'myAssignments']);
    Route::post('/examination_list', [ExaminationController::class, 'examinationList']);
    Route::post('/examination_save', [ExaminationController::class, 'examinationSave']);
    Route::post('/examination_publish', [ExaminationController::class, 'examinationPublish']);
    Route::post('/examination_delete', [ExaminationController::class, 'examinationDelete']);
    Route::post('/examination_results_list', [ExaminationController::class, 'resultsList']);
    Route::post('/examination_results_save', [ExaminationController::class, 'resultsSave']);
    Route::post('/examination_results_release', [ExaminationController::class, 'resultsRelease']);

    // M4 - Memorization progress tracking (genuinely new - confirmed via
    // search before writing anything, no memorization/hifz/quran table
    // existed anywhere in the codebase).
    Route::post('/memorization_record_list', [MemorizationController::class, 'list']);
    Route::post('/memorization_record_save', [MemorizationController::class, 'save']);
    Route::post('/memorization_record_delete', [MemorizationController::class, 'delete']);

    // M4 - Progress & risk indicators. Read-only aggregation across
    // attendance/grades/exams/behavior/memorization - see
    // StudentProgressController's docblock for the (disclosed, simple)
    // risk-scoring rule. NOTE: named teacher_student_progress_summary,
    // NOT student_progress_summary - that path already exists
    // (Traits/StudentProgressApi.php) as a student-facing, parameter-less,
    // attendance-only self-service endpoint for a different consumer
    // (the student's own portal). This is teacher/admin-facing and takes
    // a student_id - reusing the same path would have silently shadowed
    // the existing one.
    Route::post('/teacher_student_progress_summary', [StudentProgressController::class, 'summary']);

    // M4 - Report export. CSV only, not PDF - see ReportExportController's
    // docblock for why (no PHP toolchain here to install/verify a PDF
    // library against).
    Route::post('/report_student_progress_csv', [ReportExportController::class, 'studentProgressCsv']);
    Route::post('/report_class_progress_csv', [ReportExportController::class, 'classProgressCsv']);

    // Admin - Sections (full CRUD; admin_section_list above stays untouched)
    Route::post('/admin_sections_list', [ApiController::class, 'admin_sections_list']);
    Route::post('/admin_sections_create', [ApiController::class, 'admin_sections_create']);
    Route::post('/admin_sections_update', [ApiController::class, 'admin_sections_update']);
    Route::post('/admin_sections_delete', [ApiController::class, 'admin_sections_delete']);

    // Teacher - my classes (sections I'm the class teacher of)
    Route::post('/teacher_my_classes', [ApiController::class, 'teacher_my_classes']);
    Route::post('/teacher_class_students', [ApiController::class, 'teacher_class_students']);

    // Teacher - attendance
    Route::post('/teacher_attendance_classes', [ApiController::class, 'teacher_attendance_classes']);
    Route::post('/teacher_attendance_roster', [ApiController::class, 'teacher_attendance_roster']);
    Route::post('/teacher_attendance_submit', [ApiController::class, 'teacher_attendance_submit']);
    Route::post('/teacher_attendance_update', [ApiController::class, 'teacher_attendance_update']);
    Route::post('/teacher_attendance_history', [ApiController::class, 'teacher_attendance_history']);
    Route::post('/teacher_attendance_scan', [ApiController::class, 'teacher_attendance_scan']);
    Route::post('/teacher_attendance_statuses', [ApiController::class, 'teacher_attendance_statuses']);

    // Admin - attendance analytics & export
    Route::post('/admin_attendance_dashboard', [ApiController::class, 'admin_attendance_dashboard']);
    Route::post('/admin_attendance_export', [ApiController::class, 'admin_attendance_export']);
    Route::post('/admin_attendance_locks_list', [ApiController::class, 'admin_attendance_locks_list']);
    Route::post('/admin_attendance_unlock', [ApiController::class, 'admin_attendance_unlock']);

    // Teacher - grade entry (gradebook)
    Route::post('/teacher_gradebook_classes', [ApiController::class, 'teacher_gradebook_classes']);
    Route::post('/teacher_gradebook_roster', [ApiController::class, 'teacher_gradebook_roster']);
    Route::post('/teacher_gradebook_submit', [ApiController::class, 'teacher_gradebook_submit']);

    // Admin - gradebook review (read-only counterpart to teacher entry)
    Route::post('/admin_gradebook_exam_categories', [ApiController::class, 'admin_gradebook_exam_categories']);
    Route::post('/admin_gradebook_review', [ApiController::class, 'admin_gradebook_review']);

    // Admin - exam category management (Assessment Components, spec §4.11:
    // weighted components shared by Gradebook and Assessments)
    Route::post('/admin_gradebook_exam_category_create', [ApiController::class, 'admin_gradebook_exam_category_create']);
    Route::post('/admin_gradebook_exam_category_update', [ApiController::class, 'admin_gradebook_exam_category_update']);
    Route::post('/admin_gradebook_exam_category_delete', [ApiController::class, 'admin_gradebook_exam_category_delete']);

    // Teacher - announcements (section/subject-scoped posts)
    Route::post('/teacher_announcement_targets', [ApiController::class, 'teacher_announcement_targets']);
    Route::post('/teacher_announcement_list', [ApiController::class, 'teacher_announcement_list']);
    Route::post('/teacher_announcement_store', [ApiController::class, 'teacher_announcement_store']);
    Route::post('/teacher_announcement_delete', [ApiController::class, 'teacher_announcement_delete']);

    // Student - announcements (read-only, scoped to current section)
    Route::post('/student_announcement_list', [ApiController::class, 'student_announcement_list']);

    // Admin - announcement review (read-only counterpart to teacher posts)
    Route::post('/admin_announcement_review', [ApiController::class, 'admin_announcement_review']);

    // Teacher - lesson plans (draft/submit/edit, subject+section scoped)
    Route::post('/teacher_lesson_plan_targets', [ApiController::class, 'teacher_lesson_plan_targets']);
    Route::post('/teacher_lesson_plan_list', [ApiController::class, 'teacher_lesson_plan_list']);
    Route::post('/teacher_lesson_plan_store', [ApiController::class, 'teacher_lesson_plan_store']);
    Route::post('/teacher_lesson_plan_update', [ApiController::class, 'teacher_lesson_plan_update']);
    Route::post('/teacher_lesson_plan_delete', [ApiController::class, 'teacher_lesson_plan_delete']);

    // Admin - lesson plan review + approve/reject (read + decision, counterpart to teacher writes)
    Route::post('/admin_lesson_plan_review', [ApiController::class, 'admin_lesson_plan_review']);
    Route::post('/admin_lesson_plan_decide', [ApiController::class, 'admin_lesson_plan_decide']);

    // Teacher - assessments & assignments (definitions: draft/publish/edit, subject+section scoped)
    Route::post('/teacher_assessment_targets', [ApiController::class, 'teacher_assessment_targets']);
    Route::post('/teacher_assessment_list', [ApiController::class, 'teacher_assessment_list']);
    Route::post('/teacher_assessment_store', [ApiController::class, 'teacher_assessment_store']);
    Route::post('/teacher_assessment_update', [ApiController::class, 'teacher_assessment_update']);
    Route::post('/teacher_assessment_delete', [ApiController::class, 'teacher_assessment_delete']);

    // Teacher - assessment grading (submissions roster + grade/request-resubmission)
    Route::post('/teacher_assessment_submissions', [ApiController::class, 'teacher_assessment_submissions']);
    Route::post('/teacher_assessment_grade', [ApiController::class, 'teacher_assessment_grade']);

    // Teacher/Student/Admin - weighted grade calculation (§4.11 -> §5 wiring)
    Route::post('/teacher_assessment_grades', [ApiController::class, 'teacher_assessment_grades']);
    Route::post('/student_assessment_grades', [ApiController::class, 'student_assessment_grades']);
    Route::post('/admin_assessment_grades', [ApiController::class, 'admin_assessment_grades']);

    // Student - assessments (view assigned work, submit/resubmit work)
    Route::post('/student_assessment_list', [ApiController::class, 'student_assessment_list']);
    Route::post('/student_assessment_submit', [ApiController::class, 'student_assessment_submit']);

    // Admin - assessment review (read-only counterpart to teacher writes)
    Route::post('/admin_assessment_review', [ApiController::class, 'admin_assessment_review']);
    Route::post('/admin_assessment_submissions', [ApiController::class, 'admin_assessment_submissions']);

    // Teacher - materials library (standalone resources, separate from lesson-plan
    // attachments and assessment submissions — spec §5/§6, roadmap #4)
    Route::post('/teacher_material_targets', [ApiController::class, 'teacher_material_targets']);
    Route::post('/teacher_material_list', [ApiController::class, 'teacher_material_list']);
    Route::post('/teacher_material_store', [ApiController::class, 'teacher_material_store']);
    Route::post('/teacher_material_delete', [ApiController::class, 'teacher_material_delete']);

    // Student - materials library (read-only, scoped to current section)
    Route::post('/student_material_list', [ApiController::class, 'student_material_list']);

    // Admin - materials review (read-only counterpart to teacher writes)
    Route::post('/admin_material_review', [ApiController::class, 'admin_material_review']);

    // Teacher - monthly reports
    Route::post('/teacher_report_status', [ApiController::class, 'teacher_report_status']);
    Route::post('/teacher_report_submit', [ApiController::class, 'teacher_report_submit']);

    // Admin - view teacher monthly reports
    Route::post('/admin_teacher_spreadsheet_import', [ApiController::class, 'admin_teacher_spreadsheet_import']);
    Route::post('/admin_teacher_report_list', [ApiController::class, 'admin_teacher_report_list']);
    Route::post('/admin_teacher_report_overview', [ApiController::class, 'admin_teacher_report_overview']);
    Route::post('/admin_teacher_profile', [ApiController::class, 'admin_teacher_profile']);
    Route::post('/admin_teacher_profile_update', [ApiController::class, 'admin_teacher_profile_update']);
    Route::post('/admin_teacher_list', [ApiController::class, 'admin_teacher_list']);
    Route::post('/admin_own_profile_update', [ApiController::class, 'admin_own_profile_update']);
    // Any authenticated role's own profile (name, email, address, photo) -
    // used by the Menu screen's edit-profile entry point for every role.
    Route::post('/me_profile_update', [ApiController::class, 'me_profile_update']);
    Route::post('/admin_user_documents_list', [ApiController::class, 'admin_user_documents_list']);
    Route::post('/admin_user_document_upload', [ApiController::class, 'admin_user_document_upload']);
    Route::post('/admin_user_document_delete', [ApiController::class, 'admin_user_document_delete']);

    // Student - self-service document upload (orphan-school children uploading
    // their OWN files - ID, guardian consent, etc.). Reverse direction of the
    // admin_user_document_* routes above: the target user is always the
    // authenticated caller, never a client-supplied user_id.
    Route::post('/student_document_upload_list', [ApiController::class, 'student_document_upload_list']);
    Route::post('/student_document_upload_store', [ApiController::class, 'student_document_upload_store']);
    Route::post('/student_document_upload_delete', [ApiController::class, 'student_document_upload_delete']);

    // Chat / Messaging - same-school, any user to any user
    Route::post('/message_thread_list', [ApiController::class, 'message_thread_list']);
    Route::post('/message_thread_start', [ApiController::class, 'message_thread_start']);
    Route::post('/message_chat_list', [ApiController::class, 'message_chat_list']);
    Route::post('/message_chat_send', [ApiController::class, 'message_chat_send']);
    Route::post('/message_user_search', [ApiController::class, 'message_user_search']);

    // Posting system - feed, hearts, comments, reposts
    Route::post('/post_feed', [PostController::class, 'feed']);
    Route::post('/post_create', [PostController::class, 'store']);
    Route::post('/post_delete', [PostController::class, 'destroy']);
    Route::post('/post_update', [PostController::class, 'update']);
    Route::post('/post_like_toggle', [PostController::class, 'toggleLike']);
    Route::post('/post_comment_list', [PostController::class, 'commentList']);
    Route::post('/post_comment_create', [PostController::class, 'commentCreate']);
    Route::post('/post_comment_delete', [PostController::class, 'commentDelete']);
    Route::post('/post_repost', [PostController::class, 'repost']);
    Route::post('/post_comment_like_toggle', [PostController::class, 'commentLikeToggle']);
    Route::post('/profile_feed', [PostController::class, 'profileFeed']);

    // Class Management - Full CRUD (expanded class card feature)
    // Note: admin_classes_* (plural) - distinct from the existing
    // admin_class_list / admin_class_teacher_list routes above, which are
    // left untouched and still power the admission screen dropdowns.
    Route::post('/admin_classes_create', [ApiController::class, 'admin_classes_create']);
    Route::post('/admin_classes_list', [ApiController::class, 'admin_classes_list']);
    Route::post('/admin_classes_detail', [ApiController::class, 'admin_classes_detail']);
    Route::post('/admin_classes_update', [ApiController::class, 'admin_classes_update']);
    Route::post('/admin_classes_delete', [ApiController::class, 'admin_classes_delete']);
    Route::post('/admin_classes_archive', [ApiController::class, 'admin_classes_archive']);
    Route::post('/admin_classes_restore', [ApiController::class, 'admin_classes_restore']);
    Route::post('/admin_classes_duplicate', [ApiController::class, 'admin_classes_duplicate']);
    Route::post('/admin_classes_export', [ApiController::class, 'admin_classes_export']);
    Route::post('/admin_classes_reference_data', [ApiController::class, 'admin_classes_reference_data']);
    Route::post('/admin_academic_dashboard_stats', [ApiController::class, 'admin_academic_dashboard_stats']);

    // Section enrollment (admin-facing roster management - distinct from
    // teacher_class_students, which requires the requester to be the section's
    // class teacher)
    Route::post('/admin_section_students', [ApiController::class, 'admin_section_students']);
    Route::post('/admin_section_eligible_students', [ApiController::class, 'admin_section_eligible_students']);
    Route::post('/admin_section_add_students', [ApiController::class, 'admin_section_add_students']);
    Route::post('/admin_section_remove_student', [ApiController::class, 'admin_section_remove_student']);
    Route::post('/admin_section_transfer_student', [ApiController::class, 'admin_section_transfer_student']);

    // Class Information - read-only, any authenticated same-school user
    Route::post('/user_classes_detail', [ApiController::class, 'user_classes_detail']);
    Route::post('/student_classes_mine', [ApiController::class, 'student_classes_mine']);
    Route::post('/teacher_classes_mine', [ApiController::class, 'teacher_classes_mine']);

    // School features (Taqdim Assistant / Translation Service) - see
    // SchoolFeatureController's docblock and School::getFeatures().
    Route::post('/taqdim_overview', [\App\Http\Controllers\SchoolFeatureController::class, 'taqdimOverview']);
    Route::post('/translation_overview', [\App\Http\Controllers\SchoolFeatureController::class, 'translationOverview']);

    // Admin - Academic Setup Wizard (Phase 3: institution profile, academic year/terms)
    Route::post('/admin_school_setup_status', [AcademicSetupController::class, 'admin_school_setup_status']);
    Route::post('/admin_school_profile_update', [AcademicSetupController::class, 'admin_school_profile_update']);
    Route::post('/my_school_branding', [AcademicSetupController::class, 'my_school_branding']);
    Route::post('/admin_school_setup_complete', [AcademicSetupController::class, 'admin_school_setup_complete']);
    Route::post('/admin_sessions_list', [AcademicSetupController::class, 'admin_sessions_list']);
    Route::post('/admin_sessions_create', [AcademicSetupController::class, 'admin_sessions_create']);
    Route::post('/admin_sessions_update', [AcademicSetupController::class, 'admin_sessions_update']);
    Route::post('/admin_sessions_set_current', [AcademicSetupController::class, 'admin_sessions_set_current']);
    Route::post('/admin_sessions_delete', [AcademicSetupController::class, 'admin_sessions_delete']);
    Route::post('/admin_academic_terms_list', [AcademicSetupController::class, 'admin_academic_terms_list']);
    Route::post('/admin_academic_terms_create', [AcademicSetupController::class, 'admin_academic_terms_create']);
    Route::post('/admin_academic_terms_update', [AcademicSetupController::class, 'admin_academic_terms_update']);
    Route::post('/admin_academic_terms_set_current', [AcademicSetupController::class, 'admin_academic_terms_set_current']);
    Route::post('/admin_academic_terms_delete', [AcademicSetupController::class, 'admin_academic_terms_delete']);

    // Subscription / academic-status gating (endpoints already exist in
    // ApiController.php - see §12 of the spec; these two routes were the
    // only missing piece, per the "Not yet wired" note there)
    Route::post('/admin_subscription_status', [ApiController::class, 'admin_subscription_status']);
    Route::post('/student_academic_status', [ApiController::class, 'student_academic_status']);
    Route::post('/student_quarterly_report', [ApiController::class, 'student_quarterly_report']);

    // Self-serve subscription requests (SubscribeScreen.tsx) - browse the
    // active package catalog and submit a request; superadmin review
    // endpoints live in the superadmin group below.
    Route::post('/admin_subscription_packages', [ApiController::class, 'admin_subscription_packages']);
    Route::post('/admin_subscription_request_create', [ApiController::class, 'admin_subscription_request_create']);

    // Admin - Academic Catalog (Phase 4: Programs, Subject catalog, Grading Systems, Grade Scales)
    Route::post('/admin_programs_list', [AcademicCatalogController::class, 'admin_programs_list']);
    Route::post('/admin_programs_create', [AcademicCatalogController::class, 'admin_programs_create']);
    Route::post('/admin_programs_update', [AcademicCatalogController::class, 'admin_programs_update']);
    Route::post('/admin_programs_delete', [AcademicCatalogController::class, 'admin_programs_delete']);
    Route::post('/admin_subjects_catalog_list', [AcademicCatalogController::class, 'admin_subjects_catalog_list']);
    Route::post('/admin_subjects_catalog_create', [AcademicCatalogController::class, 'admin_subjects_catalog_create']);
    Route::post('/admin_subjects_catalog_update', [AcademicCatalogController::class, 'admin_subjects_catalog_update']);
    Route::post('/admin_subjects_catalog_delete', [AcademicCatalogController::class, 'admin_subjects_catalog_delete']);
    Route::post('/admin_grading_systems_list', [AcademicCatalogController::class, 'admin_grading_systems_list']);
    Route::post('/admin_grading_systems_create', [AcademicCatalogController::class, 'admin_grading_systems_create']);
    Route::post('/admin_grading_systems_update', [AcademicCatalogController::class, 'admin_grading_systems_update']);
    Route::post('/admin_grading_systems_delete', [AcademicCatalogController::class, 'admin_grading_systems_delete']);
    Route::post('/admin_grade_scales_list', [AcademicCatalogController::class, 'admin_grade_scales_list']);
    Route::post('/admin_grade_scales_create', [AcademicCatalogController::class, 'admin_grade_scales_create']);
    Route::post('/admin_grade_scales_new_version', [AcademicCatalogController::class, 'admin_grade_scales_new_version']);
    Route::post('/admin_grade_scales_update', [AcademicCatalogController::class, 'admin_grade_scales_update']);
    Route::post('/admin_grade_scales_delete', [AcademicCatalogController::class, 'admin_grade_scales_delete']);

    // Student - resolves marks against admin-configured grading systems
    // (spec 4.9/4.10), read-only. See Status 12's GPA blocker note.
    Route::post('/student_subject_grade_bands', [AcademicCatalogController::class, 'student_subject_grade_bands']);
    Route::post('/student_gpa_summary', [AcademicCatalogController::class, 'student_gpa_summary']);

    // Admin - Enrollment Workflow Management (spec 4.16) - stage config
    Route::post('/admin_enrollment_stages_list', [EnrollmentWorkflowController::class, 'admin_enrollment_stages_list']);
    Route::post('/admin_enrollment_stages_create', [EnrollmentWorkflowController::class, 'admin_enrollment_stages_create']);
    Route::post('/admin_enrollment_stages_update', [EnrollmentWorkflowController::class, 'admin_enrollment_stages_update']);
    Route::post('/admin_enrollment_stages_reorder', [EnrollmentWorkflowController::class, 'admin_enrollment_stages_reorder']);
    Route::post('/admin_enrollment_stages_delete', [EnrollmentWorkflowController::class, 'admin_enrollment_stages_delete']);

    // Admin - Enrollment Workflow Management (spec 4.16) - student progress & audit trail
    Route::post('/admin_enrollment_workflow_list', [EnrollmentWorkflowController::class, 'admin_enrollment_workflow_list']);
    Route::post('/admin_enrollment_workflow_start', [EnrollmentWorkflowController::class, 'admin_enrollment_workflow_start']);
    Route::post('/admin_enrollment_workflow_advance', [EnrollmentWorkflowController::class, 'admin_enrollment_workflow_advance']);
    Route::post('/admin_enrollment_workflow_withdraw', [EnrollmentWorkflowController::class, 'admin_enrollment_workflow_withdraw']);
    Route::post('/admin_enrollment_workflow_history', [EnrollmentWorkflowController::class, 'admin_enrollment_workflow_history']);
    Route::post('/admin_enrollment_workflow_place_in_section', [EnrollmentWorkflowController::class, 'admin_enrollment_workflow_place_in_section']);
    Route::post('/admin_enrollment_workflow_delete', [EnrollmentWorkflowController::class, 'admin_enrollment_workflow_delete']);
    Route::post('/admin_student_report_data', [ReportController::class, 'admin_student_report_data']);
    Route::post('/admin_enrollment_fee_types_list', [EnrollmentWorkflowController::class, 'admin_enrollment_fee_types_list']);
    Route::post('/admin_enrollment_fee_types_create', [EnrollmentWorkflowController::class, 'admin_enrollment_fee_types_create']);
    Route::post('/admin_enrollment_fee_types_update', [EnrollmentWorkflowController::class, 'admin_enrollment_fee_types_update']);
    Route::post('/admin_enrollment_fee_types_delete', [EnrollmentWorkflowController::class, 'admin_enrollment_fee_types_delete']);
    Route::post('/admin_enrollment_workflow_payments_list', [EnrollmentWorkflowController::class, 'admin_enrollment_workflow_payments_list']);
    Route::post('/admin_enrollment_workflow_payment_update', [EnrollmentWorkflowController::class, 'admin_enrollment_workflow_payment_update']);

    // Student-facing (fixes spec §12 "Blocker A" - was admin-only before this).
    Route::post('/student_enrollment_workflow_status', [EnrollmentWorkflowController::class, 'student_enrollment_workflow_status']);

    // Admin - Academic Structure Builder (spec §4.1) - Campuses/branches.
    // First §4.1 entity built; Faculties, grade levels, and buildings/rooms
    // are the natural next additions to AcademicStructureController.
    Route::post('/admin_campuses_list', [AcademicStructureController::class, 'admin_campuses_list']);
    Route::post('/admin_campuses_create', [AcademicStructureController::class, 'admin_campuses_create']);
    Route::post('/admin_campuses_update', [AcademicStructureController::class, 'admin_campuses_update']);
    Route::post('/admin_campuses_delete', [AcademicStructureController::class, 'admin_campuses_delete']);

    // Admin - Academic Structure Builder (spec §4.1) - Grade levels/year levels.
    Route::post('/admin_grade_levels_list', [AcademicStructureController::class, 'admin_grade_levels_list']);
    Route::post('/admin_grade_levels_create', [AcademicStructureController::class, 'admin_grade_levels_create']);
    Route::post('/admin_grade_levels_update', [AcademicStructureController::class, 'admin_grade_levels_update']);
    Route::post('/admin_grade_levels_delete', [AcademicStructureController::class, 'admin_grade_levels_delete']);
    Route::post('/admin_grade_levels_reorder', [AcademicStructureController::class, 'admin_grade_levels_reorder']);

    // Student Portal - official identity card, resolved from auth user only.
    // Six-phase completion release: catalog, enrollment, documents, permissions, integrations, QA.
    Route::post('/admin_completion_overview', [AcademicCompletionController::class, 'records']);
    Route::post('/admin_curriculum_requirements', [AcademicCompletionEngineController::class, 'requirements']);
    Route::post('/admin_enrollment_subject_loading', [SubjectLoadingController::class, 'adminSubjectLoadingList']);
    Route::post('/admin_academic_documents', [AcademicDocumentController::class, 'issued']);
    Route::post('/admin_permission_audit', [AcademicAuthorizationController::class, 'audit']);

    // §4.20 Real permissions CRUD
    Route::post('/admin_permission_catalog', [PermissionController::class, 'catalog']);
    Route::post('/admin_permission_list', [PermissionController::class, 'list']);
    Route::post('/admin_permission_save', [PermissionController::class, 'save']);
    Route::post('/admin_permission_delete', [PermissionController::class, 'delete']);
    Route::post('/admin_capability_flag_list', [PermissionController::class, 'capabilityList']);
    Route::post('/admin_capability_flag_save', [PermissionController::class, 'capabilitySave']);

    // M4 teacher/staff two-factor authentication + device sessions
    Route::post('/two_factor_status', [TwoFactorController::class, 'status']);
    Route::post('/two_factor_setup', [TwoFactorController::class, 'setup']);
    Route::post('/two_factor_confirm', [TwoFactorController::class, 'confirm']);
    Route::post('/two_factor_disable', [TwoFactorController::class, 'disable']);
    Route::post('/admin_two_factor_reset', [TwoFactorController::class, 'adminReset']);
    Route::post('/device_sessions_list', [TwoFactorController::class, 'deviceSessionsList']);
    Route::post('/device_sessions_revoke', [TwoFactorController::class, 'deviceSessionsRevoke']);
    Route::post('/admin_integrations_status', [AcademicIntegrationController::class, 'list']);
    Route::post('/admin_release_health', [AcademicCompletionController::class, 'releaseHealth']);

    Route::post('/student_identity', [StudentIdentityController::class, 'show']);

    // ------------------------------------------------------------------
    // P15 wiring: connects controllers/services built in earlier phases
    // to the endpoint names the RN app's service layer already calls.
    // Nothing below changes controller logic - route names only.
    // ------------------------------------------------------------------

    // Grade computation and release (P04)
    Route::post('/admin_grade_versions', [AcademicGradeController::class, 'versions']);
    Route::post('/admin_grade_calculate', [AcademicGradeController::class, 'calculate']);
    Route::post('/admin_grade_save', [AcademicGradeController::class, 'save']);
    Route::post('/admin_grade_submit', [AcademicGradeController::class, 'submit']);
    Route::post('/admin_grade_approve', [AcademicGradeController::class, 'approve']);
    Route::post('/admin_grade_list', [AcademicGradeController::class, 'list']);
    Route::post('/admin_grade_audit', [AcademicGradeController::class, 'audit']);

    // Scheduling / timetable conflict engine (P02)
    Route::post('/admin_schedule_list', [AcademicScheduleController::class, 'list']);
    Route::post('/admin_schedule_check_conflicts', [AcademicScheduleController::class, 'check']);
    Route::post('/admin_schedule_store', [AcademicScheduleController::class, 'store']);
    Route::post('/admin_schedule_update', [AcademicScheduleController::class, 'update']);
    Route::post('/admin_schedule_status', [AcademicScheduleController::class, 'status']);
    Route::post('/admin_schedule_audit', [AcademicScheduleController::class, 'audit']);
    Route::post('/admin_schedule_delete', [AcademicScheduleController::class, 'delete']);
    Route::post('/my_schedules', [AcademicScheduleController::class, 'mine']);

    // Promotion / retention policy engine (P05)
    Route::post('/admin_academic_policy_list', [AcademicPolicyController::class, 'policies']);
    Route::post('/admin_academic_policy_save', [AcademicPolicyController::class, 'policySave']);
    Route::post('/admin_academic_policy_evaluate', [AcademicPolicyController::class, 'evaluate']);
    Route::post('/admin_academic_policy_decision_save', [AcademicPolicyController::class, 'save']);
    Route::post('/admin_academic_policy_decision_approve', [AcademicPolicyController::class, 'approve']);
    Route::post('/admin_academic_policy_decision_list', [AcademicPolicyController::class, 'list']);
    Route::post('/admin_academic_policy_audit', [AcademicPolicyController::class, 'audit']);

    // Graduation / completion evaluation engine (P06)
    // No existing frontend caller was found for this controller; endpoint
    // names below follow the app's existing admin_<feature>_<action> style.
    Route::post('/admin_graduation_requirements', [AcademicCompletionEngineController::class, 'requirements']);
    Route::post('/admin_graduation_requirement_save', [AcademicCompletionEngineController::class, 'requirementSave']);
    Route::post('/admin_graduation_evaluate', [AcademicCompletionEngineController::class, 'evaluate']);
    Route::post('/admin_graduation_save', [AcademicCompletionEngineController::class, 'save']);
    Route::post('/admin_graduation_approve', [AcademicCompletionEngineController::class, 'approve']);
    Route::post('/admin_graduation_list', [AcademicCompletionEngineController::class, 'list']);
    Route::post('/admin_graduation_audit', [AcademicCompletionEngineController::class, 'audit']);

    // Analytics (P10)
    Route::post('/admin_academic_analytics_dashboard', [AcademicAnalyticsController::class, 'dashboard']);
    Route::post('/admin_academic_analytics_student', [AcademicAnalyticsController::class, 'student']);
    Route::post('/admin_academic_analytics_attendance_trend', [AcademicAnalyticsController::class, 'attendanceTrend']);

    // Authorization / school-scoping (P03)
    Route::post('/academic_my_scope', [AcademicAuthorizationController::class, 'myScope']);
    Route::post('/academic_authorize_student', [AcademicAuthorizationController::class, 'authorizeStudent']);
    Route::post('/admin_academic_access_audit', [AcademicAuthorizationController::class, 'audit']);

    // Academic calendar (P09)
    Route::post('/admin_calendar_events', [AcademicCalendarController::class, 'list']);
    Route::post('/admin_calendar_event_store', [AcademicCalendarController::class, 'store']);
    Route::post('/admin_calendar_event_update', [AcademicCalendarController::class, 'update']);
    Route::post('/admin_calendar_event_delete', [AcademicCalendarController::class, 'delete']);
    Route::post('/calendar_events_mine', [AcademicCalendarController::class, 'mine']);

    // Notifications and messaging (P12)
    Route::post('/academic_notifications', [AcademicCommunicationController::class, 'notifications']);
    Route::post('/academic_notification_read', [AcademicCommunicationController::class, 'read']);
    Route::post('/academic_message_threads', [AcademicCommunicationController::class, 'threads']);
    Route::post('/academic_message_thread_start', [AcademicCommunicationController::class, 'start']);
    Route::post('/academic_message_send', [AcademicCommunicationController::class, 'send']);
    Route::post('/academic_messages', [AcademicCommunicationController::class, 'messages']);

    // Documents and certificates (P07)
    Route::post('/admin_document_templates', [AcademicDocumentController::class, 'templates']);
    Route::post('/admin_document_template_save', [AcademicDocumentController::class, 'saveTemplate']);
    Route::post('/admin_document_template_approve', [AcademicDocumentController::class, 'approveTemplate']);
    Route::post('/admin_document_preview', [AcademicDocumentController::class, 'preview']);
    Route::post('/admin_document_issue', [AcademicDocumentController::class, 'issue']);
    Route::post('/admin_document_issued', [AcademicDocumentController::class, 'issued']);
    Route::post('/admin_document_audit', [AcademicDocumentController::class, 'audit']);

    // Facilities: buildings and rooms (P13-adjacent structure)
    Route::post('/admin_facilities_buildings', [AcademicFacilitiesController::class, 'buildings']);
    Route::post('/admin_facilities_building_store', [AcademicFacilitiesController::class, 'storeBuilding']);
    Route::post('/admin_facilities_building_update', [AcademicFacilitiesController::class, 'updateBuilding']);
    Route::post('/admin_facilities_building_delete', [AcademicFacilitiesController::class, 'deleteBuilding']);
    Route::post('/admin_facilities_rooms', [AcademicFacilitiesController::class, 'rooms']);
    Route::post('/admin_facilities_room_store', [AcademicFacilitiesController::class, 'storeRoom']);
    Route::post('/admin_facilities_room_update', [AcademicFacilitiesController::class, 'updateRoom']);
    Route::post('/admin_facilities_room_delete', [AcademicFacilitiesController::class, 'deleteRoom']);

    // Finance/library/device integrations (P13)
    Route::post('/admin_academic_integrations', [AcademicIntegrationController::class, 'list']);
    Route::post('/admin_academic_integration_save', [AcademicIntegrationController::class, 'save']);
    Route::post('/admin_academic_integration_sync', [AcademicIntegrationController::class, 'sync']);
    Route::post('/admin_academic_sync_runs', [AcademicIntegrationController::class, 'runs']);

    // Localization and translations (P09)
    Route::post('/academic_locale_bundle', [AcademicLocaleController::class, 'bundle']);
    Route::post('/admin_locale_preferences', [AcademicLocaleController::class, 'preferences']);
    Route::post('/admin_locale_list_save', [AcademicLocaleController::class, 'locales']);
    Route::post('/admin_translations_save', [AcademicLocaleController::class, 'translations']);

    // Superadmin, platform-wide (school_id = null) language list and
    // word-by-word translations - every school inherits these as defaults.
    // Backs the "Languages" card on the superadmin dashboard.
    Route::post('/superadmin_locale_list', [AcademicLocaleController::class, 'globalLocaleList']);
    Route::post('/superadmin_locale_list_save', [AcademicLocaleController::class, 'globalLocaleSave']);
    Route::post('/superadmin_translations', [AcademicLocaleController::class, 'globalTranslations']);
    Route::post('/superadmin_translations_save', [AcademicLocaleController::class, 'globalTranslationsSave']);

    // Portal completion (P11)
    Route::post('/student_portal_home', [AcademicPortalController::class, 'studentHome']);
    Route::post('/portal_document_show', [AcademicPortalController::class, 'document']);
    Route::post('/admin_portal_document_issue', [AcademicPortalController::class, 'issue']);
    Route::post('/portal_action_submit', [AcademicPortalController::class, 'submitAction']);
    Route::post('/admin_portal_actions', [AcademicPortalController::class, 'actions']);

    // M5 student portal - documents, services, settings (StudentPortalController).
    // home() deliberately NOT routed - it duplicates the already-live
    // student_portal_home above (AcademicPortalController::studentHome).
    Route::post('/student_document_list', [StudentPortalController::class, 'documentList']);
    Route::post('/student_document_request', [StudentPortalController::class, 'documentRequest']);
    Route::post('/student_document_cancel', [StudentPortalController::class, 'documentCancel']);
    Route::post('/admin_student_document_list', [StudentPortalController::class, 'adminDocumentList']);
    Route::post('/admin_student_document_issue', [StudentPortalController::class, 'adminDocumentIssue']);
    Route::post('/admin_student_document_reject', [StudentPortalController::class, 'adminDocumentReject']);

    // Scholarship & Taqdim Assistant - staff catalog management
    // (ScholarshipProgramController), gated on hasScholarshipAccess()
    // rather than any route-level middleware (see class doc comment).
    Route::post('/scholarship_provider_list', [ScholarshipProgramController::class, 'providerList']);
    Route::post('/scholarship_provider_create', [ScholarshipProgramController::class, 'providerCreate']);
    Route::post('/scholarship_provider_update', [ScholarshipProgramController::class, 'providerUpdate']);
    Route::post('/scholarship_provider_delete', [ScholarshipProgramController::class, 'providerDelete']);

    Route::post('/scholarship_program_list', [ScholarshipProgramController::class, 'programList']);
    Route::post('/scholarship_program_show', [ScholarshipProgramController::class, 'programShow']);
    Route::post('/scholarship_program_create', [ScholarshipProgramController::class, 'programCreate']);
    Route::post('/scholarship_program_update', [ScholarshipProgramController::class, 'programUpdate']);
    Route::post('/scholarship_program_set_status', [ScholarshipProgramController::class, 'programSetStatus']);
    Route::post('/scholarship_program_delete', [ScholarshipProgramController::class, 'programDelete']);

    Route::post('/scholarship_requirement_list', [ScholarshipProgramController::class, 'requirementList']);
    Route::post('/scholarship_requirement_create', [ScholarshipProgramController::class, 'requirementCreate']);
    Route::post('/scholarship_requirement_update', [ScholarshipProgramController::class, 'requirementUpdate']);
    Route::post('/scholarship_requirement_delete', [ScholarshipProgramController::class, 'requirementDelete']);

    Route::post('/scholarship_eligibility_rule_list', [ScholarshipProgramController::class, 'eligibilityRuleList']);
    Route::post('/scholarship_eligibility_rule_create', [ScholarshipProgramController::class, 'eligibilityRuleCreate']);
    Route::post('/scholarship_eligibility_rule_update', [ScholarshipProgramController::class, 'eligibilityRuleUpdate']);
    Route::post('/scholarship_eligibility_rule_delete', [ScholarshipProgramController::class, 'eligibilityRuleDelete']);

    Route::post('/scholarship_announcement_list', [ScholarshipProgramController::class, 'announcementList']);
    Route::post('/scholarship_announcement_create', [ScholarshipProgramController::class, 'announcementCreate']);
    Route::post('/scholarship_announcement_update', [ScholarshipProgramController::class, 'announcementUpdate']);
    Route::post('/scholarship_announcement_delete', [ScholarshipProgramController::class, 'announcementDelete']);
    Route::post('/scholarship_reports_summary', [ScholarshipProgramController::class, 'reportsSummary']);

    // Scholarship & Taqdim Assistant - the Taqdim (application) lifecycle
    // (ScholarshipApplicationController). Student endpoints gated by
    // requireRole($r,'student'); admin_* endpoints gated on
    // hasScholarshipAccess(), same as the catalog routes above.
    Route::post('/scholarship_application_start', [ScholarshipApplicationController::class, 'applicationStart']);
    Route::post('/scholarship_application_list', [ScholarshipApplicationController::class, 'applicationList']);
    Route::post('/scholarship_application_show', [ScholarshipApplicationController::class, 'applicationShow']);
    Route::post('/scholarship_application_checklist_update', [ScholarshipApplicationController::class, 'applicationChecklistUpdate']);
    Route::post('/scholarship_application_submit', [ScholarshipApplicationController::class, 'applicationSubmit']);
    Route::post('/scholarship_application_withdraw', [ScholarshipApplicationController::class, 'applicationWithdraw']);

    Route::post('/admin_scholarship_application_list', [ScholarshipApplicationController::class, 'adminApplicationList']);
    Route::post('/admin_scholarship_application_show', [ScholarshipApplicationController::class, 'adminApplicationShow']);
    Route::post('/admin_scholarship_application_assign', [ScholarshipApplicationController::class, 'adminApplicationAssign']);
    Route::post('/admin_scholarship_application_advance_status', [ScholarshipApplicationController::class, 'adminApplicationAdvanceStatus']);
    Route::post('/admin_scholarship_checklist_item_review', [ScholarshipApplicationController::class, 'adminChecklistItemReview']);

    // Scholarship & Taqdim Assistant - student browse/detail/eligibility
    // (ScholarshipController). Read-only, published programs only; gated
    // by requireRole($r,'student') like the application-lifecycle routes
    // above.
    Route::post('/scholarship_browse_list', [ScholarshipController::class, 'browseList']);
    Route::post('/scholarship_program_detail', [ScholarshipController::class, 'programDetail']);
    Route::post('/scholarship_eligibility_check', [ScholarshipController::class, 'eligibilityCheck']);
    Route::post('/scholarship_announcement_feed', [ScholarshipController::class, 'announcementFeed']);

    // Scholarship & Taqdim Assistant - document vault
    // (ScholarshipDocumentController). Student upload/list/delete gated by
    // requireRole($r,'student'); admin_* review routes gated on
    // hasScholarshipAccess(), same as the rest of this feature.
    Route::post('/scholarship_document_upload', [ScholarshipDocumentController::class, 'documentUpload']);
    Route::post('/scholarship_document_list', [ScholarshipDocumentController::class, 'documentList']);
    Route::post('/scholarship_document_delete', [ScholarshipDocumentController::class, 'documentDelete']);
    Route::post('/admin_scholarship_document_queue', [ScholarshipDocumentController::class, 'adminDocumentQueue']);
    Route::post('/admin_scholarship_document_review', [ScholarshipDocumentController::class, 'adminDocumentReview']);

    // Scholarship & Taqdim Assistant - Translation Services
    // (ScholarshipTranslationController). Student request/list/cancel
    // gated by requireRole($r,'student'); admin_* queue routes gated on
    // hasScholarshipTranslationAccess() specifically - a sub-permission
    // of hasScholarshipAccess() a SuperAdmin grants separately (see
    // add_scholarship_translation_access_to_users_table's migration
    // comment), not just general Taqdim staff access.
    Route::post('/scholarship_translation_request_create', [ScholarshipTranslationController::class, 'requestCreate']);
    Route::post('/scholarship_translation_request_list', [ScholarshipTranslationController::class, 'requestList']);
    Route::post('/scholarship_translation_request_cancel', [ScholarshipTranslationController::class, 'requestCancel']);
    Route::post('/admin_translation_request_list', [ScholarshipTranslationController::class, 'adminRequestList']);
    Route::post('/admin_translation_request_show', [ScholarshipTranslationController::class, 'adminRequestShow']);
    Route::post('/admin_translation_request_assign', [ScholarshipTranslationController::class, 'adminRequestAssign']);
    Route::post('/admin_translation_request_advance_status', [ScholarshipTranslationController::class, 'adminRequestAdvanceStatus']);
    Route::post('/admin_translation_request_upload', [ScholarshipTranslationController::class, 'adminRequestUpload']);

    // Alumni applications (admin review) - AlumniApplicationsScreen.tsx /
    // alumni-applications.js. Scoped to the calling admin's own school.
    Route::post('/admin_alumni_registration_list', [AlumniRegistrationApiController::class, 'list']);
    Route::post('/admin_alumni_registration_approve', [AlumniRegistrationApiController::class, 'approve']);
    Route::post('/admin_alumni_registration_reject', [AlumniRegistrationApiController::class, 'reject']);
    Route::post('/student_service_catalog', [StudentPortalController::class, 'serviceCatalog']);
    Route::post('/student_service_request_store', [StudentPortalController::class, 'serviceRequestStore']);
    Route::post('/student_service_request_cancel', [StudentPortalController::class, 'serviceRequestCancel']);
    Route::post('/admin_student_service_request_list', [StudentPortalController::class, 'adminServiceRequestList']);
    Route::post('/admin_student_service_request_update', [StudentPortalController::class, 'adminServiceRequestUpdate']);
    Route::post('/user_settings_show', [StudentPortalController::class, 'settingsShow']);
    Route::post('/user_settings_save', [StudentPortalController::class, 'settingsSave']);
    Route::post('/user_password_update', [StudentPortalController::class, 'passwordUpdate']);

    // M6 hardening - generic audit trail (App\Models\Concerns\Auditable).
    Route::post('/admin_audit_log_list', [AuditLogController::class, 'list']);

    // Student lifecycle management (P08)
    Route::post('/admin_student_lifecycle_change', [AcademicStudentLifecycleController::class, 'change']);
    Route::post('/admin_student_lifecycle_history', [AcademicStudentLifecycleController::class, 'history']);
    Route::post('/admin_student_import_preview', [AcademicStudentLifecycleController::class, 'importPreview']);
    Route::post('/admin_student_import_commit', [AcademicStudentLifecycleController::class, 'importCommit']);
    Route::post('/admin_student_import_batches', [AcademicStudentLifecycleController::class, 'batches']);

    // Subject Loading Engine (P01)
    Route::post('/admin_subject_loading_context', [SubjectLoadingController::class, 'adminSubjectLoadingContext']);
    Route::post('/admin_subject_loading_eligibility', [SubjectLoadingController::class, 'adminSubjectLoadingEligibility']);
    Route::post('/admin_subject_loading_store', [SubjectLoadingController::class, 'adminSubjectLoadingStore']);
    Route::post('/admin_subject_loading_submit', [SubjectLoadingController::class, 'adminSubjectLoadingSubmit']);
    Route::post('/admin_subject_loading_approve', [SubjectLoadingController::class, 'adminSubjectLoadingApprove']);
    Route::post('/admin_subject_loading_reject', [SubjectLoadingController::class, 'adminSubjectLoadingReject']);
    Route::post('/admin_subject_loading_cancel', [SubjectLoadingController::class, 'adminSubjectLoadingCancel']);
    Route::post('/admin_subject_loading_drop_item', [SubjectLoadingController::class, 'adminSubjectLoadingDropItem']);
    Route::post('/admin_subject_loading_list', [SubjectLoadingController::class, 'adminSubjectLoadingList']);
    Route::post('/admin_subject_loading_detail', [SubjectLoadingController::class, 'adminSubjectLoadingDetail']);
    Route::post('/admin_subject_loading_audit', [SubjectLoadingController::class, 'adminSubjectLoadingAudit']);
    Route::post('/admin_load_policy_list', [SubjectLoadingController::class, 'adminLoadPolicyList']);
    Route::post('/admin_load_policy_save', [SubjectLoadingController::class, 'adminLoadPolicySave']);
    Route::post('/admin_load_policy_delete', [SubjectLoadingController::class, 'adminLoadPolicyDelete']);

    // §4.13 Attendance configuration builder
    Route::post('/admin_attendance_status_list', [AttendanceConfigController::class, 'statusList']);
    Route::post('/admin_attendance_status_save', [AttendanceConfigController::class, 'statusSave']);
    Route::post('/admin_attendance_status_delete', [AttendanceConfigController::class, 'statusDelete']);
    Route::post('/admin_attendance_method_list', [AttendanceConfigController::class, 'methodList']);
    Route::post('/admin_attendance_method_save', [AttendanceConfigController::class, 'methodSave']);
    Route::post('/admin_attendance_method_delete', [AttendanceConfigController::class, 'methodDelete']);
    Route::post('/student_subject_load', [SubjectLoadingController::class, 'studentSubjectLoad']);
    Route::post('/teacher_subject_load_advisees', [SubjectLoadingController::class, 'teacherSubjectLoadAdvisees']);

    // Superadmin - dashboard, school management, per-school admins, API
    // locker (3rd-party keys + user session revoke), backend health, and
    // cross-school post/comment moderation. Gated at the route level by
    // role:superadmin (see EnsureRole + config/roles.php) - this used to
    // rely solely on each method calling requireSuperAdmin() itself, which
    // a missed call on any new method would silently bypass. The in-method
    // requireSuperAdmin() calls are left in place as defense-in-depth, not
    // removed - this middleware is the actually-enforced gate now.
    Route::middleware('role:superadmin')->group(function () {
    Route::post('/superadmin_dashboard_overview', [SuperAdminApiController::class, 'dashboardOverview']);

    // MuslimEdu's single, platform-wide Facebook Page (not per-school) -
    // credentials + webhook config, superadmin-only. See
    // MessengerIntegrationController and the public /facebook_webhook
    // routes above (Meta calls those directly, no auth needed there).
    Route::post('/messenger_settings_show', [\App\Http\Controllers\MessengerIntegrationController::class, 'adminShow']);
    Route::post('/messenger_settings_update', [\App\Http\Controllers\MessengerIntegrationController::class, 'adminUpdate']);
    // Connects the Page itself to this app's webhook - distinct from the
    // field toggles in Meta's App Dashboard, and required for any event
    // to actually be delivered. See the method's docblock.
    Route::post('/messenger_subscribe_page', [\App\Http\Controllers\MessengerIntegrationController::class, 'subscribePage']);

    // Platform-wide outgoing mail server (not per-school) - credentials
    // + a "send test email" check, superadmin-only. See
    // SmtpSettingController and SmtpConfigApplier (the latter is what
    // makes a save here actually change what the app's existing
    // Mail::to(...)->send(...) call sites use).
    Route::post('/smtp_settings_show', [\App\Http\Controllers\SmtpSettingController::class, 'adminShow']);
    Route::post('/smtp_settings_update', [\App\Http\Controllers\SmtpSettingController::class, 'adminUpdate']);
    Route::post('/smtp_test_email', [\App\Http\Controllers\SmtpSettingController::class, 'sendTestEmail']);

    Route::post('/superadmin_school_list', [SuperAdminApiController::class, 'schoolList']);
    Route::post('/superadmin_school_create', [SuperAdminApiController::class, 'schoolCreate']);
    Route::post('/superadmin_school_update', [SuperAdminApiController::class, 'schoolUpdate']);
    Route::post('/superadmin_school_set_status', [SuperAdminApiController::class, 'schoolSetStatus']);
    Route::post('/superadmin_school_features_get', [SuperAdminApiController::class, 'schoolFeaturesGet']);
    Route::post('/superadmin_school_features_update', [SuperAdminApiController::class, 'schoolFeaturesUpdate']);
    Route::post('/superadmin_school_features_resync', [SuperAdminApiController::class, 'schoolFeaturesResync']);
    Route::post('/superadmin_school_trash', [SuperAdminApiController::class, 'schoolTrash']);
    Route::post('/superadmin_school_restore', [SuperAdminApiController::class, 'schoolRestore']);
    Route::post('/superadmin_school_purge', [SuperAdminApiController::class, 'schoolPurge']);
    Route::post('/superadmin_trashed_schools', [SuperAdminApiController::class, 'trashedSchools']);

    // "Register Your School" self-service signup review queue (see
    // SchoolRegistrationApiController) - approving creates the real
    // School + admin User, same shape as superadmin_school_create above.
    Route::post('/superadmin_school_registration_list', [SchoolRegistrationApiController::class, 'list']);
    Route::post('/superadmin_school_registration_approve', [SchoolRegistrationApiController::class, 'approve']);
    Route::post('/superadmin_school_registration_reject', [SchoolRegistrationApiController::class, 'reject']);

    Route::post('/superadmin_school_admins', [SuperAdminApiController::class, 'schoolAdminList']);
    Route::post('/superadmin_admin_create', [SuperAdminApiController::class, 'adminCreate'])->middleware('throttle:expensive');
    Route::post('/superadmin_admin_delete', [SuperAdminApiController::class, 'adminDelete']);
    Route::post('/superadmin_admin_restore', [SuperAdminApiController::class, 'adminRestore']);
    Route::post('/superadmin_admin_purge', [SuperAdminApiController::class, 'adminPurge']);
    Route::post('/superadmin_trashed_admins', [SuperAdminApiController::class, 'trashedAdmins']);
    Route::post('/superadmin_admin_reset_password', [SuperAdminApiController::class, 'adminResetPassword'])->middleware('throttle:expensive');

    // Team & Staff - SuperAdmin's own internal platform team (role_id 13,
    // see SuperAdminApiController::PLATFORM_STAFF_ROLE_ID). Named
    // `superadmin_team_*` rather than `superadmin_staff_*` on purpose -
    // that name is already taken below by the per-school teacher/cashier/
    // registrar block. Gated on requireTeamManage() inside each method,
    // not the role:superadmin middleware alone, since a non-full_access
    // team member must not reach these either.
    Route::post('/superadmin_team_list', [SuperAdminApiController::class, 'teamList']);
    Route::post('/superadmin_team_profile', [SuperAdminApiController::class, 'teamProfile']);
    Route::post('/superadmin_team_create', [SuperAdminApiController::class, 'teamCreate'])->middleware('throttle:expensive');
    Route::post('/superadmin_team_update', [SuperAdminApiController::class, 'teamUpdate']);
    Route::post('/superadmin_team_status', [SuperAdminApiController::class, 'teamStatus']);
    Route::post('/superadmin_team_delete', [SuperAdminApiController::class, 'teamDelete'])->middleware('throttle:expensive');

    // Scholarship & Taqdim Assistant access - deliberately separate from
    // the superadmin_team_* group above. Those are gated on
    // requireTeamManage() (SuperAdmin OR full_access staff); these two are
    // gated on requireSuperAdmin() alone inside the controller, per the
    // "SuperAdmin must be the only role allowed to grant or remove this
    // access" requirement.
    Route::post('/superadmin_scholarship_access_list', [SuperAdminApiController::class, 'scholarshipAccessList']);
    Route::post('/superadmin_scholarship_access_update', [SuperAdminApiController::class, 'scholarshipAccessUpdate']);

    // Staff per school (cashier/registrar/teacher) - same account types a
    // school's own admin creates from their dashboard (see
    // ApiController::admin_accountant_admission_single /
    // admin_registrar_admission_single / admin_teacher_admission_single),
    // exposed here too so superadmin can set a school up or fix a locked-
    // out staff account without signing in as that school's admin. `role`
    // is one of: teacher, cashier, registrar (see STAFF_ROLES in the
    // controller).
    Route::post('/superadmin_school_staff', [SuperAdminApiController::class, 'schoolStaffList']);
    Route::post('/superadmin_staff_create', [SuperAdminApiController::class, 'staffCreate'])->middleware('throttle:expensive');
    Route::post('/superadmin_staff_delete', [SuperAdminApiController::class, 'staffDelete']);
    Route::post('/superadmin_staff_restore', [SuperAdminApiController::class, 'staffRestore']);
    Route::post('/superadmin_staff_purge', [SuperAdminApiController::class, 'staffPurge']);
    Route::post('/superadmin_trashed_staff', [SuperAdminApiController::class, 'trashedStaff']);
    Route::post('/superadmin_staff_reset_password', [SuperAdminApiController::class, 'staffResetPassword'])->middleware('throttle:expensive');

    // Subscription packages (plans) + per-school fee management. Setting a
    // school's subscription here is read by ApiController::admin_subscription_status
    // on the admin side, which gates Grading Systems / Exam Categories /
    // Gradebook Review on AdminDashboard.
    Route::post('/superadmin_package_list', [SuperAdminApiController::class, 'packageList']);
    Route::post('/superadmin_package_create', [SuperAdminApiController::class, 'packageCreate']);
    Route::post('/superadmin_package_update', [SuperAdminApiController::class, 'packageUpdate']);
    Route::post('/superadmin_package_set_status', [SuperAdminApiController::class, 'packageSetStatus']);

    Route::post('/superadmin_school_subscription', [SuperAdminApiController::class, 'schoolSubscription']);
    Route::post('/superadmin_school_subscription_set', [SuperAdminApiController::class, 'schoolSubscriptionSet']);

    // Review queue for admin-submitted subscription requests (see
    // admin_subscription_request_create above) - approving writes the same
    // Subscription row schoolSubscriptionSet does.
    Route::post('/superadmin_subscription_request_list', [SuperAdminApiController::class, 'subscriptionRequestList']);
    Route::post('/superadmin_subscription_request_approve', [SuperAdminApiController::class, 'subscriptionRequestApprove']);
    Route::post('/superadmin_subscription_request_reject', [SuperAdminApiController::class, 'subscriptionRequestReject']);

    Route::post('/superadmin_api_key_list', [SuperAdminApiController::class, 'apiKeyList']);
    Route::post('/superadmin_api_key_create', [SuperAdminApiController::class, 'apiKeyCreate']);
    Route::post('/superadmin_api_key_revoke', [SuperAdminApiController::class, 'apiKeyRevoke']);
    Route::post('/superadmin_user_sessions', [SuperAdminApiController::class, 'userSessionList']);
    Route::post('/superadmin_session_revoke', [SuperAdminApiController::class, 'userSessionRevoke']);
    Route::post('/superadmin_session_revoke_all', [SuperAdminApiController::class, 'userSessionRevokeAll']);

    Route::post('/superadmin_backend_health', [SuperAdminApiController::class, 'backendHealth']);

    Route::post('/superadmin_post_list', [SuperAdminApiController::class, 'postList']);
    Route::post('/superadmin_post_comments', [SuperAdminApiController::class, 'postComments']);
    Route::post('/superadmin_post_delete', [SuperAdminApiController::class, 'postDelete']);
    Route::post('/superadmin_comment_delete', [SuperAdminApiController::class, 'commentDelete']);

    Route::post('/superadmin_activity_log', [SuperAdminApiController::class, 'activityLog']);

    // Widget announcements - superadmin management (list includes
    // inactive; the any-role /widget_announcements_list above is
    // active-only and lives on ApiController).
    Route::post('/superadmin_widget_announcement_list', [SuperAdminApiController::class, 'widgetAnnouncementList']);
    Route::post('/superadmin_widget_announcement_create', [SuperAdminApiController::class, 'widgetAnnouncementCreate']);
    Route::post('/superadmin_widget_announcement_delete', [SuperAdminApiController::class, 'widgetAnnouncementDelete']);
    Route::post('/superadmin_widget_announcement_set_active', [SuperAdminApiController::class, 'widgetAnnouncementSetActive']);
    }); // end role:superadmin group
});

// Note: a duplicate, dead "academic/setup" REST group (AcademicSetupPhase6Controller)
// used to live here - unauthenticated, undiscovered missing-service 500,
// and a straight duplicate of AcademicSetupController above (which is what
// AcademicSetupWizardScreen.tsx actually calls). Removed rather than fixed.

// TEMP — run once to fix gradebooks.comment column (NOT NULL, no default
// on the live DB, even though the migration source says nullable — same
// live-vs-migration-file drift as the marks column fix above). Delete
// this route immediately after running it once.
Route::get('/run-comment-column-fix-4q9wz', function () {
    \Illuminate\Support\Facades\Schema::table('gradebooks', function ($table) {
        $table->text('comment')->nullable()->default(null)->change();
    });
    return 'gradebooks.comment column fixed to nullable.';
});
