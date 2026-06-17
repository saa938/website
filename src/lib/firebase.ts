import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";

const isDevelopment = process.env.NODE_ENV === "development";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // Keep the auth domain aligned with the local app origin when emulators are on.
  authDomain: isDevelopment
    ? "localhost"
    : process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

if (isDevelopment) {
  connectFirestoreEmulator(db, "localhost", 8080);

  if (!auth.emulatorConfig) {
    connectAuthEmulator(auth, "http://localhost:9099", {
      disableWarnings: true,
    });
  }
}

if (process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost') {
  connectStorageEmulator(storage, '127.0.0.1', 9199);
}

export { db, auth, storage };
export default app;
