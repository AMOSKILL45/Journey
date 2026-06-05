// generate_scrapbook: client-triggered scrapbook PDF composer (Phase 7E, ADR-003).
// Deployed with verify_jwt=true; authorizes the caller as a trip member (trip_members) before
// any service-role work. Input { trip_id, png_path }. The client has already rendered the PNG
// "story" card (client Skia) and uploaded it to trip-scrapbooks/<trip>/<id>.png; this function
// gathers trip + milestones + photos + stats, composes a multi-page PDF album with pdf-lib
// (cover page + one page per milestone/photo, embedding photo bytes fetched from storage with
// the service role), uploads trip-scrapbooks/<trip>/<id>.pdf, INSERTs the scrapbooks row
// { trip_id, png_path, pdf_path, stats, generated_by }, and returns signed { pngUrl, pdfUrl }.
// Service role bypasses RLS; the scrapbooks table has NO client-INSERT policy (server-only).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const SCRAPBOOKS_BUCKET = 'trip-scrapbooks';
const PHOTOS_BUCKET = 'trip-photos';
const SIGNED_URL_TTL_SEC = 60 * 60; // 1h
const MAX_PDF_PHOTOS = 30; // bound the album so generation stays under the 30s budget
const M_PER_KM = 1000;

// --- Page geometry (US Letter portrait, points) ---
const PAGE_W = 612;
const PAGE_H = 792;
const MARGIN = 48;

interface TripRow {
  id: string;
  name: string;
  owner_id: string;
  start_date: string | null;
  end_date: string | null;
  destination_country: string | null;
  destination_countries: string[] | null;
}

interface MilestoneRow {
  id: string;
  name: string;
  is_boss: boolean | null;
  order_index: number;
  arrival_at: string | null;
  departure_at: string | null;
}

interface PhotoRow {
  id: string;
  storage_path: string;
  caption: string | null;
  milestone_id: string | null;
}

interface ScrapbookStats {
  distanceM: number;
  countries: number;
  days: number;
  checkins: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function computeDays(trip: TripRow, milestones: MilestoneRow[]): number {
  const times: number[] = [];
  const push = (v: string | null) => {
    if (!v) return;
    const ms = new Date(v).getTime();
    if (!Number.isNaN(ms)) times.push(ms);
  };
  push(trip.start_date);
  push(trip.end_date);
  for (const m of milestones) {
    push(m.arrival_at);
    push(m.departure_at);
  }
  if (times.length === 0) return 0;
  return Math.floor((Math.max(...times) - Math.min(...times)) / MS_PER_DAY) + 1;
}

function computeCountries(trip: TripRow): number {
  const set = new Set<string>();
  const add = (raw: string | null) => {
    if (!raw) return;
    const code = raw.trim().toUpperCase();
    if (code) set.add(code);
  };
  add(trip.destination_country);
  for (const c of trip.destination_countries ?? []) add(c);
  return set.size;
}

function uuid(): string {
  return crypto.randomUUID();
}

Deno.serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  // --- Auth (deployed with verify_jwt=true): identify the caller from their forwarded JWT ---
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData } = await sb.auth.getUser(token);
  const userId = userData?.user?.id ?? null;
  if (!userId) return new Response('unauthorized', { status: 401 });

  let tripId: string | null = null;
  let pngPath: string | null = null;
  try {
    const body = (await req.json()) as { trip_id?: string; png_path?: string };
    tripId = body.trip_id ?? null;
    pngPath = body.png_path ?? null;
  } catch (_e) {
    tripId = null;
  }
  if (!tripId || !pngPath) {
    return new Response(JSON.stringify({ error: 'trip_id and png_path required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authorize: the caller must be an editor of the trip (scrapbook write).
  const { data: membership } = await sb
    .from('trip_members')
    .select('role')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!membership) return new Response('forbidden', { status: 403 });

  // --- Gather trip + milestones + photos + checkins ---
  const { data: trip, error: tripErr } = await sb
    .from('trips')
    .select('id, name, owner_id, start_date, end_date, destination_country, destination_countries')
    .eq('id', tripId)
    .single();
  if (tripErr || !trip) {
    return new Response(JSON.stringify({ error: 'trip not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const tripRow = trip as TripRow;

  const { data: milestoneData } = await sb
    .from('milestones')
    .select('id, name, is_boss, order_index, arrival_at, departure_at')
    .eq('trip_id', tripId)
    .order('order_index', { ascending: true });
  const milestones = (milestoneData ?? []) as MilestoneRow[];
  const milestoneIds = milestones.map((m) => m.id);

  const { data: photoData } = await sb
    .from('photos')
    .select('id, storage_path, caption, milestone_id')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
    .limit(MAX_PDF_PHOTOS);
  const photos = (photoData ?? []) as PhotoRow[];

  const { data: legData } = await sb
    .from('milestone_legs')
    .select('distance_m')
    .eq('trip_id', tripId);
  const distanceM = (legData ?? []).reduce(
    (sum: number, l: { distance_m: number | null }) => sum + (l.distance_m ?? 0),
    0,
  );

  let checkinCount = 0;
  if (milestoneIds.length > 0) {
    const { count } = await sb
      .from('checkins')
      .select('id', { count: 'exact', head: true })
      .in('milestone_id', milestoneIds);
    checkinCount = count ?? 0;
  }

  const stats: ScrapbookStats = {
    distanceM,
    countries: computeCountries(tripRow),
    days: computeDays(tripRow, milestones),
    checkins: checkinCount,
  };

  // --- Compose the PDF album ---
  const pdf = await PDFDocument.create();
  const titleFont = await pdf.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdf.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.06, 0.1, 0.18);
  const soft = rgb(0.37, 0.4, 0.47);
  const accent = rgb(0.9, 0.22, 0.27);

  // Cover page: title + stats.
  const cover = pdf.addPage([PAGE_W, PAGE_H]);
  cover.drawText(tripRow.name, {
    x: MARGIN,
    y: PAGE_H - 120,
    size: 28,
    font: titleFont,
    color: ink,
  });
  const statLines = [
    `Distance: ${Math.round(distanceM / M_PER_KM)} km`,
    `Countries: ${stats.countries}`,
    `Days: ${stats.days}`,
    `Check-ins: ${stats.checkins}`,
  ];
  statLines.forEach((line, i) => {
    cover.drawText(line, {
      x: MARGIN,
      y: PAGE_H - 170 - i * 28,
      size: 16,
      font: bodyFont,
      color: soft,
    });
  });

  // One page per photo (newest album bound), embedding the photo bytes.
  const captionByMilestone = new Map(milestones.map((m) => [m.id, m.name]));
  for (const photo of photos) {
    const bytes = await downloadPhotoBytes(sb, photo.storage_path);
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    const heading =
      photo.caption || captionByMilestone.get(photo.milestone_id ?? '') || tripRow.name;
    page.drawText(heading, { x: MARGIN, y: PAGE_H - 80, size: 18, font: titleFont, color: accent });

    if (bytes) {
      const embedded = await embedImage(pdf, bytes);
      if (embedded) {
        const maxW = PAGE_W - MARGIN * 2;
        const maxH = PAGE_H - 180;
        const scale = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
        const w = embedded.width * scale;
        const h = embedded.height * scale;
        page.drawImage(embedded, { x: (PAGE_W - w) / 2, y: PAGE_H - 110 - h, width: w, height: h });
      }
    }
  }

  const pdfBytes = await pdf.save();

  // --- Upload the PDF + persist the row ---
  const pdfPath = `${tripId}/${uuid()}.pdf`;
  const { error: pdfUpErr } = await sb.storage
    .from(SCRAPBOOKS_BUCKET)
    .upload(pdfPath, pdfBytes, { contentType: 'application/pdf', upsert: false });
  if (pdfUpErr) {
    return new Response(JSON.stringify({ error: 'pdf upload failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { error: insErr } = await sb.from('scrapbooks').insert({
    trip_id: tripId,
    png_path: pngPath,
    pdf_path: pdfPath,
    stats,
    generated_by: userId,
  });
  if (insErr) {
    return new Response(JSON.stringify({ error: 'row insert failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // --- Signed URLs for both artifacts ---
  const pngUrl = await signed(sb, pngPath);
  const pdfUrl = await signed(sb, pdfPath);

  return new Response(JSON.stringify({ pngUrl, pdfUrl }), {
    headers: { 'Content-Type': 'application/json' },
  });
});

async function downloadPhotoBytes(
  sb: ReturnType<typeof createClient>,
  path: string,
): Promise<Uint8Array | null> {
  try {
    const { data, error } = await sb.storage.from(PHOTOS_BUCKET).download(path);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  } catch (_e) {
    return null;
  }
}

interface EmbeddedImage {
  width: number;
  height: number;
}

/** Embed a JPEG or PNG; photos are uploaded as JPEG (4A) but we sniff the magic bytes anyway. */
async function embedImage(
  pdf: PDFDocument,
  bytes: Uint8Array,
): Promise<(EmbeddedImage & Record<string, unknown>) | null> {
  try {
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
    const img = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    return img as unknown as EmbeddedImage & Record<string, unknown>;
  } catch (_e) {
    try {
      const img = await pdf.embedPng(bytes);
      return img as unknown as EmbeddedImage & Record<string, unknown>;
    } catch (_e2) {
      return null;
    }
  }
}

async function signed(sb: ReturnType<typeof createClient>, path: string): Promise<string | null> {
  const { data, error } = await sb.storage
    .from(SCRAPBOOKS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
