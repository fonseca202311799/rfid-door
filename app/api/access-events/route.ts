import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirebaseFirestore } from "../../../lib/firebase-admin";

const collectionName = () => process.env.FIRESTORE_ACCESS_EVENTS_COLLECTION || "accessEvents";

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
  try {
    const snapshot = await getFirebaseFirestore()
      .collection(collectionName())
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();

    const events = snapshot.docs.map((document) => {
      const data = document.data();
      const timestamp = data.timestamp instanceof Timestamp
        ? data.timestamp.toDate().toISOString()
        : null;

      return {
        id: document.id,
        uid: data.uid,
        granted: data.granted,
        deviceId: data.deviceId,
        reason: data.reason,
        timestamp,
      };
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error("Unable to read access events from Firestore.", error);
    return NextResponse.json(
      { error: "Access events are not available." },
      { status: 503 },
    );
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
  const uid = typeof payload.uid === "string" ? payload.uid.trim() : "";
  const deviceId = typeof payload.deviceId === "string" ? payload.deviceId.trim() : "";
  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";

  if (!uid || uid.length > 64 || typeof payload.granted !== "boolean" || !deviceId || deviceId.length > 64) {
    return NextResponse.json(
      { error: "uid, granted, and deviceId are required and must be valid." },
      { status: 400 },
    );
  }

  try {
    const document = await getFirebaseFirestore().collection(collectionName()).add({
      uid,
      granted: payload.granted,
      deviceId,
      reason: reason.slice(0, 200),
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: document.id }, { status: 201 });
  } catch (error) {
    console.error("Unable to write access event to Firestore.", error);
    return NextResponse.json(
      { error: "Access event could not be saved." },
      { status: 503 },
    );
  }
}

