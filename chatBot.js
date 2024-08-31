const { GoogleGenerativeAI } = require("@google/generative-ai");

// Set up the Gemini API key
const API_KEY = 'AIzaSyAcXYTVEOpClYAoesGpAXHZFhs2bo1KPzE';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(API_KEY);

async function getChatbotResponse(userInput) {
    try {
        // Get the model
        const model = await genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Generate content based on user input
        const result = await model.generateContent(userInput);
        
        return result.response.text();  
    } catch (error) {
        console.error('Error getting chatbot response:', error);
        return 'Sorry, I am having trouble understanding you right now.';
    }
}

(async () => {
    const userInput = 'Hello!';
    const botResponse = await getChatbotResponse(userInput);
    console.log('Bot:', botResponse);
})();
