// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBvTMHtetETUsKJvJ0VC1NZyab2hJ6Uwxk",
  authDomain: "mtg7-geoengineer.firebaseapp.com",
  projectId: "mtg7-geoengineer",
  storageBucket: "mtg7-geoengineer.firebasestorage.app",
  messagingSenderId: "294544688999",
  appId: "1:294544688999:web:7ffe7711c97ba3287c11c2",
  measurementId: "G-49LX9JRSLH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);