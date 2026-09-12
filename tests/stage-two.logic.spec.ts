import {
  evaluateGanapatiSubmission,
  statusForScore,
  AUTO_APPROVAL_THRESHOLD,
  MAX_SUBMISSION_SCORE,
} from "../src/lib/submission-verification";
import { test, expect } from "@playwright/test";
import {
  calculateDistanceKm,
  formatDistance,
  isValidCoordinates,
  withDistances,
  filterNearby,
  searchPandals,
  includeSelected,
} from "../src/lib/geo";
import {
  parseCoordinates,
  createGoogleMapsDirectionsUrl,
} from "../src/lib/maps-links";
import {
  normalizeIndianPhone,
  isValidIndianPhone,
  type EligibilityInput,
} from "../src/lib/submission-eligibility";
import {
  getPublicPandals,
  parseSubmissions,
} from "../src/lib/demo-submissions";
import { pandals } from "./fixtures/pandals";
import type { Submission } from "../src/lib/types";

const center = { lat: 21.1458, lng: 79.0882 };
const eligible: EligibilityInput = {
  mandalName: "Community Ganesh Mandal",
  coordinates: center,
  submitterName: "Meera Joshi",
  submitterRole: "Volunteer",
  contact: "98765 43210",
  publicAccess: true,
  ganapatiPhotoCount: 1,
  decorationPhotoCount: 1,
};

test("Haversine handles identity, symmetry, equator, dateline and antipodes", () => {
  expect(calculateDistanceKm(center, center)).toBe(0);
  expect(
    calculateDistanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }),
  ).toBeCloseTo(111.195, 3);
  expect(calculateDistanceKm(center, pandals[0].coordinates)).toBeCloseTo(
    calculateDistanceKm(pandals[0].coordinates, center),
    8,
  );
  expect(
    calculateDistanceKm({ lat: 0, lng: 179 }, { lat: 0, lng: -179 }),
  ).toBeCloseTo(222.39, 2);
  expect(
    calculateDistanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 }),
  ).toBeCloseTo(20015.114, 2);
  expect(calculateDistanceKm(center, { lat: NaN, lng: 79 })).toBeNaN();
  expect(isValidCoordinates({ lat: 91, lng: 79 })).toBe(false);
  expect(isValidCoordinates({ lat: 21, lng: Infinity })).toBe(false);
  expect(isValidCoordinates({ lat: "21", lng: 79 })).toBe(false);
});

test("nearby sorts without mutating fixtures, filters radii, and preserves explicit selection", () => {
  const sorted = withDistances(pandals, center);
  const distances = sorted.map((item) => item.distanceKm!);
  expect(distances).toEqual([...distances].sort((a, b) => a - b));
  expect(pandals.every((item) => item.distanceKm === undefined)).toBe(true);
  expect(filterNearby(sorted, 1, true).length).toBeLessThan(sorted.length);
  expect(filterNearby(pandals, 1, false)).toEqual(pandals);
  expect(filterNearby(sorted, "all", true)).toEqual(sorted);
  const explicit = sorted.at(-1)!;
  expect(includeSelected(filterNearby(sorted, 1, true), explicit)).toContain(
    explicit,
  );
  expect(includeSelected(sorted, explicit)).toHaveLength(sorted.length);
  expect(searchPandals(pandals, "  pRaTaP nAgAr ")).toHaveLength(1);
  expect(searchPandals(pandals, "no such locality")).toEqual([]);
  expect(formatDistance(0.85)).toBe("850 m away");
  expect(formatDistance(2.44)).toBe("2.4 km away");
  expect(formatDistance(0)).toBe("0 m away");
  expect(formatDistance()).toBe("");
  expect(formatDistance(NaN)).toBe("");
});

test("explicit coordinates parse without geocoding or short-link expansion", () => {
  for (const text of [
    "21.1458,79.0882",
    " 21.1458, 79.0882 ",
    "@21.1458,79.0882,15z",
    "https://www.google.com/maps/@21.1458,79.0882,15z",
    "https://maps.google.com/?q=21.1458%2C79.0882",
    "https://www.google.co.in/maps/search/?api=1&query=21.1458,79.0882",
  ])
    expect(parseCoordinates(text), text).toEqual(center);
  for (const text of [
    "",
    "Nagpur",
    "https://maps.app.goo.gl/abc",
    "https://www.google.com/maps?q=Nagpur",
    "https://google.com.evil.example/maps/@21.1458,79.0882",
    "91,79",
    "21,181",
    "21,79abc",
    "@21,79abc",
    "javascript:21,79",
    "https://www.google.com/maps/@21,79abc",
    "https://www.google.com/maps/%XX",
  ])
    expect(parseCoordinates(text), text).toBeNull();
  expect(parseCoordinates("-21.1,-79.2")).toEqual({ lat: -21.1, lng: -79.2 });
});

test("Indian phone normalization accepts sensible formatting without swallowing invalid input", () => {
  for (const phone of [
    "9876543210",
    "98765 43210",
    "+91 (98765) 43210",
    "919876543210",
    "00919876543210",
  ]) {
    expect(normalizeIndianPhone(phone)).toBe("+919876543210");
    expect(isValidIndianPhone(phone)).toBe(true);
  }
  for (const phone of [
    "1234567890",
    "987654321",
    "98765432100",
    "+1 9876543210",
    "abc9876543210",
    "++919876543210",
  ])
    expect(isValidIndianPhone(phone)).toBe(false);
});

test("all 64 criterion combinations use validated 2/2/2/2/2/1 weights and threshold seven", () => {
  expect(AUTO_APPROVAL_THRESHOLD).toBe(7);
  expect(MAX_SUBMISSION_SCORE).toBe(11);
  for (let mask = 0; mask < 64; mask++) {
    const input = {
      ...eligible,
      mandalName: mask & 1 ? eligible.mandalName : "a",
      coordinates: mask & 2 ? center : null,
      submitterName: mask & 4 ? eligible.submitterName : "",
      contact: mask & 8 ? eligible.contact : "123",
      decorationPhotoCount: mask & 16 ? 1 : 0,
      publicAccess: !!(mask & 32),
    };
    const result = evaluateGanapatiSubmission(input);
    const score =
      [1, 2, 4, 8, 16].filter((bit) => mask & bit).length * 2 +
      (mask & 32 ? 1 : 0);
    expect(result.totalScore).toBe(score);
    const expected =
      score >= 7
        ? input.publicAccess
          ? "approved"
          : "manual_review"
        : score >= 3
          ? "manual_review"
          : "rejected";
    expect(result.status, String(mask)).toBe(expected);
    expect(
      Object.values(result.criteria).reduce(
        (sum, item) => sum + item.points,
        0,
      ),
    ).toBe(score);
  }
  for (let score = 0; score <= 11; score++)
    expect(statusForScore(score)).toBe(
      score >= 7 ? "approved" : score >= 3 ? "manual_review" : "rejected",
    );
});
test("invalid roles, text-only location, partial photos and private access never earn their points", () => {
  expect(
    evaluateGanapatiSubmission({ ...eligible, submitterRole: "Visitor" })
      .criteria.submitter.points,
  ).toBe(0);
  expect(
    evaluateGanapatiSubmission({ ...eligible, coordinates: null }).criteria
      .location.points,
  ).toBe(0);
  expect(
    evaluateGanapatiSubmission({ ...eligible, ganapatiPhotoCount: 3 }).criteria
      .images.points,
  ).toBe(0);
  expect(
    evaluateGanapatiSubmission({ ...eligible, decorationPhotoCount: 0 })
      .criteria.images.points,
  ).toBe(0);
  expect(
    evaluateGanapatiSubmission({ ...eligible, publicAccess: false }),
  ).toMatchObject({ totalScore: 10, status: "manual_review" });
  expect(
    evaluateGanapatiSubmission({
      ...eligible,
      mandalName: "श्री गणेश मंडळ",
      submitterName: "मीरा जोशी",
    }),
  ).toMatchObject({ totalScore: 11, status: "approved" });
});

test("directions URL encodes only requested valid coordinates and needs no key", () => {
  const url = new URL(createGoogleMapsDirectionsUrl({ destination: center }));
  expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
  expect(url.searchParams.get("api")).toBe("1");
  expect(url.searchParams.get("destination")).toBe("21.1458,79.0882");
  expect(url.searchParams.has("origin")).toBe(false);
  expect(url.searchParams.has("key")).toBe(false);
  expect(
    new URL(
      createGoogleMapsDirectionsUrl({
        destination: center,
        origin: { lat: 20, lng: 78 },
      }),
    ).searchParams.get("origin"),
  ).toBe("20,78");
  expect(() =>
    createGoogleMapsDirectionsUrl({ destination: { lat: 999, lng: 0 } }),
  ).toThrow();
});

test("public discovery starts empty and accepts only approved public coordinates, including legacy migration", () => {
  expect(getPublicPandals([])).toEqual([]);
  const record: Submission = {
    id: "local-test",
    mandalName: eligible.mandalName,
    coordinates: center,
    locationText: "Nagpur",
    submitterName: "",
    submitterRole: "",
    contact: "",
    publicAccess: true,
    ganapatiImages: { names: [], count: 0 },
    decorationImages: { names: [], count: 0 },
    submittedAt: "2026-09-12T12:00:00.000Z",
    score: 5,
    verificationStatus: "manual_review",
    category: null,
  };
  expect(getPublicPandals([record])).toEqual([]);
  expect(
    getPublicPandals([{ ...record, verificationStatus: "rejected" }]),
  ).toEqual([]);
  const approved = {
    ...record,
    verificationStatus: "approved" as const,
    category: "featured" as const,
  };
  expect(getPublicPandals([approved]).at(-1)).toMatchObject({
    id: record.id,
    category: "featured",
  });
  expect(getPublicPandals([{ ...approved, publicAccess: false }])).toEqual([]);
  expect(getPublicPandals([{ ...approved, coordinates: null }])).toEqual([]);
  expect(
    parseSubmissions(
      JSON.stringify([record, record, { ...record, id: "bad" }]),
    ),
  ).toHaveLength(1);
  expect(parseSubmissions("not-json")).toEqual([]);
  expect(
    parseSubmissions(
      JSON.stringify([{ ...approved, coordinates: { lat: 91, lng: 0 } }]),
    ),
  ).toEqual([]);
  expect(
    parseSubmissions(JSON.stringify([{ ...approved, publicAccess: false }]))[0]
      .verificationStatus,
  ).toBe("manual_review");
  const legacy = {
    ...record,
    verificationStatus: undefined,
    category: undefined,
    status: "pending_review",
    adminCategory: null,
  };
  expect(parseSubmissions(JSON.stringify([legacy]))[0]).toMatchObject({
    score: 5,
    verificationStatus: "manual_review",
  });
});
