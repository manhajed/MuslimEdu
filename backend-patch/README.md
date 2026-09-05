# backend-patch

Changes to the **Laravel API**, which is not part of this repository — it
lives on the server (manhaje.com) and is not in version control anywhere.
These files are kept here so the change is reviewable and not lost; they
are not loaded by anything in this repo.

## app/Models/School.php

Patched copy of the live `app/Models/School.php`. Deploy by overwriting
that path under the Laravel root (the directory containing `artisan`) —
**not** the `xeros` web root.

`getFeatures()` now scopes `ACADEMIC_FEATURES` to the school's active
subscription package, where before they were hardcoded on and only a
manual override could turn one off. The rule is opt-in: a package that
names no academic key restricts nothing, so every existing school keeps
what it has; only a package that names at least one academic key narrows
that school to the keys it names. Manual overrides still win either way.

Two vocabularies share the package `features` array and are deliberately
**not** aliased onto each other:

- `grading_systems` / `exam_categories` / `gradebook_review` — gate three
  admin-dashboard tiles client-side (`SUBSCRIPTION_FEATURE_KEYS`).
- `gradingSystems` / `classesSections` / … — `School::ACADEMIC_FEATURES`.

Treating `grading_systems` as `gradingSystems` would make every package
that already lists it scope academics and strip the other nine features
from those schools. See the docblock in the file.

## verify_features.php

Standalone truth table for the new rule — no Laravel required:

```
php verify_features.php
```

21 checks, including regression guards that a package carrying the legacy
keys leaves all ten academic features on. Do not deploy this to the web
root.

## Still outstanding

Nothing can put `taqdim` / `translation` / academic keys into a package's
`features` array yet. That array is editable only from the React Native
superadmin app (`src/screens/superadmin/SubscriptionPackagesScreen.tsx`),
which offers just the three legacy keys — there is no package editor on
the web at all. Until one exists this change is correct but dormant, and
per-school manual overrides remain the only way to switch a feature on.

## app/Providers/RouteServiceProvider.php

Fixes the persistent 429 ("The server returned an error (429)") that survived
reducing client-side polling.

`throttle:api` is an entry in the **`api` middleware group** (`Http/Kernel`),
which runs *before* the `auth:sanctum` **route** middleware that
`routes/api.php`'s main group applies. So when the limiter evaluated

```php
Limit::perMinute(120)->by(optional($request->user())->id ?: $request->ip())
```

the bearer token had not been resolved yet — `$request->user()` asks the
default (session) guard and returns null for a token request. Every
authenticated call therefore keyed by **IP**, and the per-user bucket the
comment promises never existed.

That is fine on a home connection and severe on mobile: carrier-grade NAT
puts thousands of subscribers behind one IPv4, so strangers on the same
carrier were consuming the 120/min bucket. No client-side change could fix
it, which is why reducing the chat poll rate did not help.

The fix adds `rateLimitKey()`, which asks the sanctum guard explicitly
(`$request->user('sanctum')`) so the token resolves regardless of middleware
order, and prefixes the key `user:` / `ip:` so the two key spaces cannot
collide. All three limiters (`api`, `expensive`, `session_check`) use it.

Deploy to `app/Providers/RouteServiceProvider.php`. Then clear the cached
config/routes, or the old closure keeps serving:

```
php artisan optimize:clear
```

`verify_ratelimit.php` contrasts the old and new key for two different users
behind one NAT IP and asserts the fix separates them. 10/10 pass.
