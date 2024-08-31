const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY; // Ensure this is set in your environment variables

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));
app.use('/images', express.static(path.join(__dirname, 'images'))); // Serve images from an 'images' directory

const carImages = {
  'engine': '/images/engine.jpg',
  'transmission': '/images/transmission.jpg',
  'brake': '/images/brake.jpg',
  'suspension': '/images/suspension.jpg',
  'steering': '/images/steering.jpg',
  // Add more image mappings as needed
};

app.post('/chat', async (req, res) => {
    try {
        const userInput = req.body.input;
        const carSpecificPrompt = `You are an AI assistant specialized in all aspects of cars, including makes, models, technical specifications, maintenance, history, and current trends. Please provide information about cars in response to the following query: "${userInput}". If your response involves explaining a specific car part, please mention the part name clearly so that an appropriate image can be displayed.`;
        
        const result = await model.generateContent(carSpecificPrompt);
        const response = result.response.text();

        // Check if any car part mentioned in the response has a corresponding image
        const imageSuggestions = Object.keys(carImages).filter(part => 
            response.toLowerCase().includes(part.toLowerCase())
        );

        res.json({ 
            response: response, 
            images: imageSuggestions.map(part => carImages[part])
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ response: 'Sorry, something went wrong.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});