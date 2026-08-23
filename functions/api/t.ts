// Anonymous traffic beacon: page path + same-origin referrer path only.
// No cookies, no IPs stored, no identifiers — see /about.

interface Env {
  TRAFFIC?: AnalyticsEngineDataset;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const body = (await request.json()) as { to?: unknown; from?: unknown };
    const to = typeof body.to === 'string' ? body.to.slice(0, 180) : '';
    const from = typeof body.from === 'string' ? body.from.slice(0, 180) : '';
    if (to.startsWith('/')) {
      env.TRAFFIC?.writeDataPoint({
        blobs: [to, from.startsWith('/') ? from : ''],
        doubles: [1],
        indexes: [to.slice(0, 90)],
      });
    }
  } catch {
    // beacons are best-effort
  }
  return new Response(null, { status: 204 });
};
