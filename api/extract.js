import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(request, response) {
  // Set CORS headers to give permission for any website to call this function
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // The browser sends an OPTIONS request first to check permissions.
  // We need to respond with a 200 OK status to let it proceed.
  if (request.method === 'OPTIONS') {
    return response.status(200).end();
  }

  // Now, handle the actual POST request
  if (request.method === 'POST') {
    const { emailText } = request.body;

    if (!emailText) {
      return response.status(400).json({ error: "No email text provided." });
    }

    try {
      // Call the AI model
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const prompt = `From the following email text, extract the client's name, the proposed meeting date and time, and the subject of the meeting. Respond with only a valid JSON object. For example: {"clientName": "John Doe", "dateTime": "2025-07-10T14:00:00Z", "subject": "Initial Consultation"}. Email Text: "${emailText}"`;
      
      const result = await model.generateContent(prompt);
      const aiResponse = await result.response;
      const text = aiResponse.text();
      
      // Send the AI's answer back
      return response.status(200).json({ aiResponse: text });

    } catch (error) {
      // If the AI call fails, log the error and send a server error response
      console.error("AI call failed:", error);
      return response.status(500).json({ error: "Failed to call the AI model." });
    }
  } 
  
  // If the request is not OPTIONS or POST, reject it.
  else {
    return response.status(405).json({ error: "Method Not Allowed" });
  }
}
