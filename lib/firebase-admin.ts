import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin";

let firestore: Firestore | undefined;

export function getFirebaseFirestore(): Firestore {
  if (firestore) return firestore;

  let credentials: ServiceAccount;
  const credentialsPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const credentialsJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  try {
    if (credentialsPath) {
      credentials = JSON.parse(
        readFileSync(resolve(process.cwd(), credentialsPath), "utf8"),
      ) as ServiceAccount;
    } else if (credentialsJson) {
      credentials = JSON.parse(credentialsJson) as ServiceAccount;
    } else {
      throw new Error("No Firebase service-account configuration was provided.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("No Firebase")) {
      throw error;
    }
    throw new Error("Firebase service-account configuration is not valid.", { cause: error });
  }

  const app = getApps()[0] ?? initializeApp({
    credential: cert(credentials),
  });

  firestore = getFirestore(app);
  return firestore;
}

