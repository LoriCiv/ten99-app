import { GoogleGenerativeAI } from "@google/generative-ai";
import admin from 'firebase-admin'; // Import the Firebase Admin library

// --- Initialize Firebase Admin ---
// Decode the base64 service account key from the environment variable
const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString('utf-8'));

// Initialize Firebase only if it hasn't been already
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}
const firestore = admin.firestore();
// --- End of Firebase Init ---


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(request, response) {
  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  if (request.method === 'POST') {
    const { emailText } = request.body;

    if (!emailText) {
      return response.status(400).json({ error: "No email text provided." });
    }

    try {
      // 1. Call the AI model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `From the following email text, extract the client's name, the proposed meeting date and time, and the subject of the meeting. Respond with only a valid JSON object. For example: {"clientName": "John Doe", "dateTime": "2025-07-10T14:00:00Z", "subject": "Initial Consultation"}. Email Text: "${emailText}"`;
      
      const result = await model.generateContent(prompt);
      const aiResponseText = result.response.text();
      
      // Clean up the AI's response to make sure it's valid JSON
      const cleanedJsonString = aiResponseText.replace(/```json\n|\n```/g, '');
      const appointmentData = JSON.parse(cleanedJsonString);

      // 2. Save the structured data to Firestore
      const docRef = await firestore.collection('pendingAppointments').add({
        ...appointmentData,
        status: 'pending', // Add a status field
        createdAt: admin.firestore.FieldValue.serverTimestamp() // Add a timestamp
      });

      // 3. Send a success response
      return response.status(200).json({ 
        message: "Successfully saved appointment to Firestore.",
        appointmentId: docRef.id, // The new document ID from Firestore
        data: appointmentData
      });

    } catch (error) {
      console.error("An error occurred:", error);
      return response.status(500).json({ error: "An internal server error occurred." });
    }
  } 
  
  else {
    return response.status(405).json({ error: "Method Not Allowed" });
  }
}
