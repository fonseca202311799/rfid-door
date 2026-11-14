import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseFirestore } from "../../../lib/firebase-admin";

const collectionName = () => process.env.FIRESTORE_DEVICE_STATUS_COLLECTION || "deviceStatus";
const onlineWindowMs = 90_000;
const cacheDurationMs = 15_000;
let cachedStatus: {
  deviceId: unknown;
  doorOpen: boolean;
  wifiRssi: number | null;
  ipAddress: string | null;
  lastSeen: string | null;
  online: boolean;
} | null | undefined;
let cachedAt = 0;

function hasValidApiKey(request: Request): boolean {
  const expected = process.env.ESP32_API_KEY;
  const received = request.headers.get("x-device-api-key");
  if (!expected || !received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function GET() {
  if (cachedStatus !== undefined && Date.now() - cachedAt < cacheDurationMs) {
    return NextResponse.json({ status: cachedStatus });
  }

  try {
    const snapshot = await getFirebaseFirestore()
      .collection(collectionName())
      .doc(process.env.DEFAULT_DEVICE_ID || "esp32-door-01")
      .get();

    if (!snapshot.exists) {
      cachedStatus = null;
      cachedAt = Date.now();
      return NextResponse.json({ status: null });
    }

    const data = snapshot.data() || {};
    const lastSeen = data.lastSeen instanceof Timestamp ? data.lastSeen.toDate() : null;
    cachedStatus = {
      deviceId: data.deviceId,
      doorOpen: data.doorOpen === true,
      wifiRssi: typeof data.wifiRssi === "number" ? data.wifiRssi : null,
      ipAddress: typeof data.ipAddress === "string" ? data.ipAddress : null,
      lastSeen: lastSeen?.toISOString() ?? null,
      online: lastSeen ? Date.now() - lastSeen.getTime() <= onlineWindowMs : false,
    };
    cachedAt = Date.now();
    return NextResponse.json({ status: cachedStatus });
  } catch (error) {
    console.error("Unable to read device status from Firestore.", error);
    return NextResponse.json({ error: "Device status is not available." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!hasValidApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized device." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const deviceId = typeof payload.deviceId === "string" ? payload.deviceId.trim() : "";
  const ipAddress = typeof payload.ipAddress === "string" ? payload.ipAddress.trim() : "";
  const wifiRssi = typeof payload.wifiRssi === "number" ? payload.wifiRssi : null;

  if (!deviceId || deviceId.length > 64 || typeof payload.doorOpen !== "boolean" ||
      (wifiRssi !== null && (wifiRssi < -120 || wifiRssi > 0))) {
    return NextResponse.json({ error: "Device status fields are invalid." }, { status: 400 });
  }

  try {
    await getFirebaseFirestore().collection(collectionName()).doc(deviceId).set({
      deviceId,
      doorOpen: payload.doorOpen,
      wifiRssi,
      ipAddress: ipAddress.slice(0, 64),
      lastSeen: FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Unable to write device status to Firestore.", error);
    return NextResponse.json({ error: "Device status could not be saved." }, { status: 503 });
  }
}
