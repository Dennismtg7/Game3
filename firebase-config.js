// Firebase console → Project settings → General → Your apps → Web app → SDK setup and configuration
// Paste your project's config object below. This file is safe to commit publicly —
// these values identify your project, they are not secret keys. Access control is
// enforced by your Firestore security rules (see README.md), not by hiding this file.

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCx5kFZq3uoF-6lExGGZtZDIceztuDZ3bc",
  authDomain: "mtg7-caeea.firebaseapp.com",
  projectId: "mtg7-caeea",
  storageBucket: "mtg7-caeea.firebasestorage.app",
  messagingSenderId: "714152940805",
  appId: "1:714152940805:web:ec96a3e6967a2b881ed36c",
  measurementId: "G-ZC6T2LDQPX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
