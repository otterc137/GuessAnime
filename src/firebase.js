import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  // Fill in after creating a project at https://console.firebase.google.com
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

const hasConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId);
let app;
let db;

if (hasConfig) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (e) {
    console.error('Firebase init error:', e);
  }
}

export async function submitScore(name, score, correct, avatar) {
  if (!hasConfig || !db) return null;
  try {
    await addDoc(collection(db, 'leaderboard'), {
      name: name || 'Anonymous',
      score,
      correct,
      avatar: avatar || null,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.error('Error submitting score:', e);
  }
}

export async function getTopScores(count = 10) {
  if (!hasConfig || !db) return [];
  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (e) {
    console.error('Error fetching leaderboard:', e);
    return [];
  }
}
