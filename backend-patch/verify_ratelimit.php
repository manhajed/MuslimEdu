<?php
// Shows why the 'api' rate limiter was bucketing by IP for authenticated
// users, and that the fix buckets by user id instead. Standalone - stubs
// just enough of Illuminate\Http\Request to model the one thing that
// matters: at limiter time only the SANCTUM guard can resolve a bearer
// token, because throttle:api (an 'api' middleware-GROUP entry) runs
// before the auth:sanctum ROUTE middleware.

class FakeUser
{
    public function __construct(public int $id) {}
    public function getAuthIdentifier(): int { return $this->id; }
}

class FakeRequest
{
    public function __construct(
        private ?FakeUser $bearerUser,   // who the token identifies, if any
        private string $ip,
        private bool $hasSession = false // true only for cookie/session auth
    ) {}

    /** Mirrors Request::user($guard). Default guard is session-based. */
    public function user(?string $guard = null): ?FakeUser
    {
        if ($guard === 'sanctum') return $this->bearerUser;
        return $this->hasSession ? $this->bearerUser : null; // default guard
    }

    public function ip(): string { return $this->ip; }
}

/** The old key: optional($request->user())->id ?: $request->ip() */
function oldKey(FakeRequest $r): string
{
    $u = $r->user();
    return $u ? (string) $u->id : $r->ip();
}

/** The new key: RouteServiceProvider::rateLimitKey() */
function newKey(FakeRequest $r): string
{
    $u = $r->user() ?: $r->user('sanctum');
    return $u ? 'user:' . $u->getAuthIdentifier() : 'ip:' . $r->ip();
}

$fails = 0;
function check(string $name, $actual, $expected) {
    global $fails;
    $ok = $actual === $expected;
    if (! $ok) $fails++;
    printf("%s  %s%s\n", $ok ? 'PASS' : 'FAIL', $name,
        $ok ? '' : sprintf('  (got %s, want %s)', var_export($actual, true), var_export($expected, true)));
}

// Two DIFFERENT authenticated users behind one carrier-NAT IP - the exact
// mobile-network case in the bug report.
$alice = new FakeRequest(new FakeUser(11), '100.64.0.7');
$bob   = new FakeRequest(new FakeUser(22), '100.64.0.7');

// --- The bug ---
check('old: alice keys by IP, not her id', oldKey($alice), '100.64.0.7');
check('old: bob keys by the same IP',      oldKey($bob),   '100.64.0.7');
check('old: alice and bob SHARE a bucket', oldKey($alice) === oldKey($bob), true);

// --- The fix ---
check('new: alice keys by her user id', newKey($alice), 'user:11');
check('new: bob keys by his user id',   newKey($bob),   'user:22');
check('new: buckets are now separate',  newKey($alice) === newKey($bob), false);

// --- Unauthenticated traffic (login, register) still keys by IP ---
$guest = new FakeRequest(null, '100.64.0.7');
check('new: guest still keys by IP', newKey($guest), 'ip:100.64.0.7');

// --- Session-authenticated (default guard resolves) keeps working ---
$web = new FakeRequest(new FakeUser(33), '203.0.113.9', hasSession: true);
check('new: session user keys by id', newKey($web), 'user:33');

// --- Prefixes prevent a user id colliding with an IP-shaped key. Uses a
// session user because that is the only case where the old key ever
// emitted a bare id at all - with a bearer token it always fell to the IP.
$user12 = new FakeRequest(new FakeUser(12), '10.0.0.1', hasSession: true);
$ip12   = new FakeRequest(null, '12');
check('old: session user 12 vs IP "12" DID collide', oldKey($user12) === oldKey($ip12), true);
check('new: they no longer collide',                 newKey($user12) === newKey($ip12), false);

echo $fails === 0 ? "\nAll checks passed.\n" : "\n$fails FAILED\n";
exit($fails === 0 ? 0 : 1);
