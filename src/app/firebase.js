// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCYNc8Y6Je-fUWTwntzlpQ0hrbFaxTQPrg",
  authDomain: "agendita-3dbca.firebaseapp.com",
  projectId: "agendita-3dbca",
  storageBucket: "agendita-3dbca.firebasestorage.app",
  messagingSenderId: "1060386092944",
  appId: "1:1060386092944:web:9f73bce59379630beaa515",
  measurementId: "G-G2ZDGS1L97"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { db, auth, storage };