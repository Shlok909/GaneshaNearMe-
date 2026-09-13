// HTTP contract double for UI tests only. Real RLS/PostGIS tests live in supabase/tests.
import { randomUUID } from "node:crypto";
let tables, objects, faults;
export function resetData() {
  tables = { profiles: [], user_roles: [], pandal_submissions: [], pandals: [], saved_pandals: [] };
  objects = new Map(); faults = {};
}
export function addProfile(user) { tables.profiles.push({ id: user.id, full_name: user.user_metadata.full_name || "", created_at: user.created_at }); }
export function configureData(body, users) {
  if (body.adminEmail) { const id = users.get(body.adminEmail)?.user.id; if (id) tables.user_roles.push({ user_id: id, role: "admin" }); }
  if (body.faults) faults = { ...faults, ...body.faults };
}
export function seedData(pandals, owner) {
  tables.pandals = pandals.map(p => ({ id: p.id, source_submission_id: p.id, mandal_name: p.name, area: p.area,
    description: p.description, theme: p.theme, latitude: p.coordinates.lat, longitude: p.coordinates.lng,
    category: p.category || "community", ganapati_image_paths: [], pandal_image_paths: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }));
  tables.pandal_submissions = tables.pandals.map(p => ({ ...p, submitted_by: owner, public_access: true, location_text: p.area,
    submitter_name: "Test Organizer", submitter_role: "organizer", contact_phone: "9876543210", verification_score: 11, status: "approved", submitted_at: p.created_at }));
}
export function dataState() { return { tables, objects: [...objects].map(([name, file]) => ({ name, mime: file.mime, size: file.bytes.length })), faults }; }
const distance = (a, b) => {
  const rad = Math.PI / 180, dlat = (b.latitude - a.latitude) * rad, dlng = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dlng / 2) ** 2;
  return 6371008.8 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
function publish(s) {
  tables.pandals = tables.pandals.filter(p => p.id !== s.id);
  if (s.status === "approved" && s.public_access) {
    const fields = ["id", "mandal_name", "area", "latitude", "longitude", "theme", "description", "ganapati_image_paths", "pandal_image_paths", "category", "created_at", "updated_at"];
    tables.pandals.push({ ...Object.fromEntries(fields.map(k => [k, s[k]])), source_submission_id: s.id });
  } else tables.saved_pandals = tables.saved_pandals.filter(p => p.pandal_id !== s.id);
}
export async function handleData({ req, res, url, body, raw, user, send }) {
  const path = decodeURIComponent(url.pathname);
  if (!path.startsWith("/rest/v1/") && !path.startsWith("/storage/v1/")) return false;
  const error = (message, code = "42501", status = 403) => send(status, { message, code, error: message, statusCode: String(status) });
  const isAdmin = user && tables.user_roles.some(r => r.user_id === user.id);
  const readable = name => user && (isAdmin || name.startsWith(user.id + "/") || tables.pandals.some(p => [...p.ganapati_image_paths, ...p.pandal_image_paths].includes(name)));
  if (path.startsWith("/storage/v1/object/sign/pandal-images/") && req.method === "GET") {
    const name = path.split("/storage/v1/object/sign/pandal-images/")[1]; const file = objects.get(name);
    if (!file) { error("Not found", "404", 404); return true; }
    res.statusCode = 200; res.setHeader("Content-Type", file.mime); res.end(file.bytes); return true;
  }
  if (!user) { error("Sign in", "42501", 401); return true; }
  if (path.startsWith("/storage/v1/")) {
    if (path === "/storage/v1/object/list/pandal-images") {
      send(200, [...objects.keys()].filter(n => n.startsWith(body.prefix + "/") && readable(n)).map(n => ({ name: n.slice(body.prefix.length + 1), id: randomUUID() }))); return true;
    }
    if (path === "/storage/v1/object/sign/pandal-images") {
      if (faults.sign) { error("Unavailable", "503", 503); return true; }
      send(200, body.paths.map(name => readable(name) && objects.has(name)
        ? { path: name, signedURL: `/object/sign/pandal-images/${name}?token=test-${randomUUID()}`, error: null }
        : { path: name, signedURL: null, error: "Not found" })); return true;
    }
    if (path === "/storage/v1/object/pandal-images" && req.method === "DELETE") {
      for (const name of body.prefixes) { const s = tables.pandal_submissions.find(s => s.id === name.split("/")[1]); if (s?.submitted_by === user.id && s.status === "draft") objects.delete(name); }
      send(200, []); return true;
    }
    if (path.startsWith("/storage/v1/object/pandal-images/") && req.method === "POST") {
      const name = path.slice("/storage/v1/object/pandal-images/".length);
      const s = tables.pandal_submissions.find(s => s.id === name.split("/")[1]);
      if (!s || s.submitted_by !== user.id || s.status !== "draft") { error("Upload denied"); return true; }
      if (faults.upload && (!faults.uploadGroup || name.includes(`/${faults.uploadGroup}/`))) { error("Upload unavailable", "503", 503); return true; }
      const form = await new Response(raw, { headers: { "content-type": req.headers["content-type"] } }).formData();
      const file = [...form.values()].find(value => typeof value !== "string");
      if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5242880) { error("Invalid photo", "400", 400); return true; }
      if (objects.has(name)) { error("Duplicate", "409", 409); return true; }
      objects.set(name, { bytes: Buffer.from(await file.arrayBuffer()), mime: file.type });
      send(200, { Id: randomUUID(), Key: `pandal-images/${name}` }); return true;
    }
    error("Storage route not found", "404", 404); return true;
  }
  const table = path.slice("/rest/v1/".length);
  if (table.startsWith("rpc/")) {
    if (table === "rpc/can_access_admin") {
      if (faults.user_roles) { error("Unavailable", "503", 503); return true; }
      send(200, Boolean(isAdmin) && !faults.adminIdentity); return true;
    }
    if (table === "rpc/consume_route_request") {
      if (faults.routeLimit) { error("Unavailable", "503", 503); return true; }
      send(200, faults.routeRetryAfter || 0); return true;
    }
    if (table === "rpc/nearby_pandals") {
      if (faults.nearby) { error("Unavailable", "503", 503); return true; }
      send(200, tables.pandals.map(p => ({ ...p, distance_meters: distance(p, { latitude: body.p_latitude, longitude: body.p_longitude }) }))
        .filter(p => p.distance_meters <= body.p_radius_km * 1000).sort((a, b) => a.distance_meters - b.distance_meters)); return true;
    }
    const s = tables.pandal_submissions.find(s => s.id === body.p_submission_id);
    if (!s || (!isAdmin && s.submitted_by !== user.id)) { error("Not found"); return true; }
    if (table === "rpc/finalize_pandal_submission") {
      if (faults.finalize) { error("Unavailable", "503", 503); return true; }
      if (s.status === "draft") {
        s.ganapati_image_paths = [...objects.keys()].filter(n => n.startsWith(`${user.id}/${s.id}/ganapati/`));
        s.pandal_image_paths = [...objects.keys()].filter(n => n.startsWith(`${user.id}/${s.id}/pandal/`));
        if (!s.ganapati_image_paths.length || !s.pandal_image_paths.length) { error("Both photo groups required", "22023", 400); return true; }
        s.verification_score = (s.mandal_name.length >= 3 ? 2 : 0) + 2 + (s.submitter_name.length >= 2 && s.submitter_role ? 2 : 0) + (s.contact_phone ? 2 : 0) + 2 + Number(s.public_access);
        s.status = s.verification_score >= 7 ? "approved" : s.verification_score >= 3 ? "manual_review" : "rejected";
        s.possible_duplicate = tables.pandals.some(p => p.mandal_name === s.mandal_name && distance(p, s) < 100);
        if (s.possible_duplicate) s.status = "manual_review";
        s.category = s.status === "approved" ? "community" : null; s.submitted_at = new Date().toISOString(); publish(s);
      }
      send(200, [{ submission_id: s.id, submission_status: s.status, published: tables.pandals.some(p => p.id === s.id) }]); return true;
    }
    if (table === "rpc/review_pandal_submission") {
      if (!isAdmin) { error("Admin required"); return true; }
      s.status = body.p_decision === "reject" ? "rejected" : "approved";
      s.category = body.p_decision === "reject" ? null : body.p_decision;
      s.review_notes = body.p_notes; s.reviewed_by = user.id; s.reviewed_at = new Date().toISOString(); publish(s);
      send(204); return true;
    }
  }
  if (!tables[table]) { error("Unknown table", "404", 404); return true; }
  if (faults[table]) { error("Unavailable", "503", 503); return true; }
  const match = row => [...url.searchParams].every(([key, value]) => !value.startsWith("eq.") && !value.startsWith("neq.") || (value.startsWith("eq.") ? String(row[key]) === value.slice(3) : String(row[key]) !== value.slice(4)));
  const allowed = row => table === "pandals" || (table === "profiles" ? row.id === user.id || isAdmin : table === "user_roles" || table === "saved_pandals" ? row.user_id === user.id : row.submitted_by === user.id || isAdmin);
  let rows = tables[table].filter(row => allowed(row) && match(row));
  if (req.method === "POST") {
    if (table === "pandal_submissions") {
      if (body.submitted_by !== user.id || body.status || body.verification_score || body.category) { error("Draft only"); return true; }
      if (tables[table].some(row => row.id === body.id)) { error("Duplicate", "23505", 409); return true; }
      const row = { ...body, status: "draft", verification_score: 0, category: null, ganapati_image_paths: [], pandal_image_paths: [], created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      tables[table].push(row); rows = [row];
    } else if (table === "saved_pandals" && body.user_id === user.id && tables.pandals.some(p => p.id === body.pandal_id)) {
      if (tables[table].some(row => row.user_id === user.id && row.pandal_id === body.pandal_id)) { error("Duplicate", "23505", 409); return true; }
      tables[table].push(body); rows = [body];
    } else { error("Write denied"); return true; }
  } else if (req.method === "PATCH") {
    if (table !== "profiles") { error("Write denied"); return true; }
    rows.forEach(row => { if (row.id === user.id) row.full_name = body.full_name; });
  } else if (req.method === "DELETE") {
    if (table !== "saved_pandals") { error("Delete denied"); return true; }
    tables[table] = tables[table].filter(row => !rows.includes(row));
  }
  res.setHeader("Content-Range", `0-${Math.max(0, rows.length - 1)}/${rows.length}`);
  const from = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || 1000);
  rows = rows.slice(from, from + limit);
  if (req.headers.accept?.includes("vnd.pgrst.object")) send(rows.length === 1 ? 200 : 406, rows.length === 1 ? rows[0] : { code: "PGRST116", details: "The result contains 0 rows", message: "No rows" });
  else send(req.method === "POST" ? 201 : 200, rows);
  return true;
}
