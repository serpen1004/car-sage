const axios = require('axios');

const API_KEY = 'AIzaSyAcXYTVEOpClYAoesGpAXHZFhs2bo1KPzE';  

async function getChatbotResponse(userInput) {
    try {
        const response = await axios.post('https://api.gemini.com/v1/chat', {
            input: userInput
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.response;  
    } catch (error) {
        console.error('Error getting chatbot response:', error);
        return 'Sorry, I am having trouble understanding you right now.';
    }
}

(async () => {
    const userInput = 'Hello! How are you today?';
    const botResponse = await getChatbotResponse(userInput);
    console.log('Bot:', botResponse);
})();
