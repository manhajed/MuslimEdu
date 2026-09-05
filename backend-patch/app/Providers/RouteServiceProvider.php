<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to the "home" route for your application.
     *
     * This is used by Laravel authentication to redirect users after login.
     *
     * @var string
     */
    public const HOME = '/';

    /**
     * The controller namespace for the application.
     *
     * When present, controller route declarations will automatically be prefixed with this namespace.
     *
     * @var string|null
     */
    // protected $namespace = 'App\\Http\\Controllers';

    /**
     * Define your route model bindings, pattern filters, etc.
     *
     * @return void
     */
    public function boot()
    {
        $this->configureRateLimiting();

        $this->routes(function () {
            Route::prefix('api')
                ->middleware('api')
                ->namespace($this->namespace)
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->namespace($this->namespace)
                ->group(base_path('routes/web.php'));



            if (DB::connection()->getDatabaseName() != 'db_name') {
                if (Schema::hasTable('addons')) {
                    if (addon_status('hr_management') == 1) {
                        Route::middleware('web')
                            ->namespace($this->namespace)
                            ->group(base_path('routes/Addon/hrmanagement.php'));
                    }

                    if (addon_status('online_live_class') == 1) {

                        Route::middleware('web')
                            ->namespace($this->namespace)
                            ->group(base_path('routes/Addon/zoomliveclass.php'));
                    }

                    if (addon_status('payment_gateways') == 1) {
                        Route::middleware('web')
                            ->namespace($this->namespace)
                            ->group(base_path('routes/Addon/paymentgateways.php'));
                    }

                    if(addon_status('online_courses') == 1) {
                        Route::middleware('web')
                            ->namespace($this->namespace)
                            ->group(base_path('routes/Addon/onlineCourse.php'));
                    }

                    if (addon_status('inventory_manager') == 1) {
                        Route::middleware('web')
                            ->namespace($this->namespace)
                            ->group(base_path('routes/Addon/inventory_manager.php'));
                    }
                    
                    if (addon_status('transport') == 1) {
                        Route::middleware('web')
                            ->namespace($this->namespace)
                            ->group(base_path('routes/Addon/transport.php'));
                    }

                    if (addon_status('alumni_manager') == 1) {
                        Route::middleware('web')
                            ->namespace($this->namespace)
                            ->group(base_path('routes/Addon/alumni_manager.php'));
                    }
                    if (addon_status('sms_center') == 1) {
                        Route::middleware('web')
                            ->namespace($this->namespace)
                            ->group(base_path('routes/Addon/sms_manager.php'));
                    }
                    if (addon_status('assignments') == 1) {
                        Route::middleware('web')
                        ->namespace($this->namespace)
                        ->group(base_path('routes/Addon/assignment-routes.php'));
                    }
                }
            }
        });
    }

    /**
     * The bucket key for a rate limiter: the authenticated user when we can
     * identify one, otherwise the caller's IP.
     *
     * Resolving the user here is NOT redundant with $request->user().
     * 'throttle:api' lives in the 'api' middleware GROUP (see Http/Kernel),
     * which runs before the 'auth:sanctum' ROUTE middleware that
     * routes/api.php's main group applies. At limiter time the bearer token
     * has therefore not been resolved yet and $request->user() - which asks
     * the default (session) guard - is null for every token request. So
     * `optional($request->user())->id ?: $request->ip()` silently keyed
     * EVERY request by IP, authenticated or not, and the per-user bucket
     * these limiters are documented to provide never existed: every user
     * behind one NAT egress shared a single bucket. On mobile carriers,
     * where CGNAT puts thousands of subscribers on one IPv4, that meant
     * strangers' traffic exhausting a user's limit - persistent 429s that
     * no amount of client-side request reduction could fix.
     *
     * Asking the sanctum guard explicitly reads the bearer token regardless
     * of middleware order. The resolved user is cached on the request, so
     * the later auth:sanctum pass does not repeat the lookup.
     *
     * The user:/ip: prefixes keep the two key spaces from ever colliding
     * (a user with id 12 and an IP literally named "12").
     */
    protected function rateLimitKey(Request $request): string
    {
        $user = $request->user() ?: $request->user('sanctum');

        return $user ? 'user:' . $user->getAuthIdentifier() : 'ip:' . $request->ip();
    }

    /**
     * Configure the rate limiters for the application.
     *
     * @return void
     */
    protected function configureRateLimiting()
    {
        // Keyed per-user (falling back to IP only when unauthenticated),
        // so this is never a shared/global bucket - one user's traffic
        // can never eat into another's, and the limit below scales
        // horizontally with the number of users, not against them.
        // Raised from 60 - a school's admin/teacher/student dashboards
        // are a traditional multi-page app (see routes/api.php's '/me'
        // comment), so a handful of API calls per page load across a
        // few page navigations could add up past 60/min during entirely
        // normal use.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($this->rateLimitKey($request));
        });

        // Stricter limit for the highest-value abuse targets (superadmin
        // account creation / password reset) - the blanket 'api' limit
        // above applies to every route regardless of how sensitive it
        // is; this is a second, tighter limit applied only to those
        // specific routes in routes/api.php via ->middleware('throttle:expensive').
        RateLimiter::for('expensive', function (Request $request) {
            return Limit::perMinute(10)->by($this->rateLimitKey($request));
        });

        // '/me' - the session-check call guardDashboard() (bukal/
        // dashboard.js) fires on every single admin-*/student-*/teacher-*
        // page load in the web app. It's a cheap, read-only "is my token
        // still valid" check, not a sensitive action, so it needs far
        // more headroom than the blanket 'api' limit above or normal
        // navigation (clicking through several pages, multiple tabs)
        // false-positives into a 429 that reads like a login failure -
        // see routes/api.php's '/me' registration for where this is applied.
        RateLimiter::for('session_check', function (Request $request) {
            return Limit::perMinute(600)->by($this->rateLimitKey($request));
        });
    }
}
