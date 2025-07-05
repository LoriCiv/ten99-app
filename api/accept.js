import admin from 'firebase-admin';

// --- Initialize Firebase Admin ---
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const firestore = admin.firestore();
// --- End of Firebase Init ---

export default async function handler(request, response) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method === 'POST') {
    const { appointmentId } = request.body;

    if (!appointmentId) {
      return response.status(400).json({ error: "appointmentId is required." });
    }

    try {
      const pendingDocRef = firestore.collection('pendingAppointments').doc(appointmentId);
      const pendingDoc = await pendingDocRef.get();

      if (!pendingDoc.exists) {
        return response.status(404).json({ error: "Pending appointment not found." });
      }

      const appointmentData = pendingDoc.data();

      // Move data to the new collection
      await firestore.collection('confirmedAppointments').doc(appointmentId).set(appointmentData);

      // Delete the original document
      await pendingDocRef.delete();

      return response.status(200).json({ message: `Successfully accepted and moved appointment ${appointmentId}` });

    } catch (error) {
      console.error("Error accepting appointment:", error);
      return response.status(500).json({ error: "Internal server error." });
    }
  } else {
    return response.status(405).json({ error: "Method Not Allowed" });
  }
}
