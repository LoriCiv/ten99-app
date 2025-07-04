import { GoogleGenerativeAI } from "@google/generative-ai";
import { kv } from "@vercel/kv"; // Import the Vercel KV library

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
      const aiResponse = await result.response;
      const text = aiResponse.text();
      
      // 2. Save the result to the database
      const appointmentId = `appt:${Date.now()}`; // Create a unique ID for the appointment
      await kv.set(appointmentId, text); // Save the AI's response using the ID

      // 3. Send the AI's answer and the new ID back
      return response.status(200).json({ 
        message: "Successfully extracted and saved appointment.",
        appointmentId: appointmentId,
        aiResponse: text 
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
