const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));
app.use('/images', express.static(path.join(__dirname, 'images')));

const carImages = {
  'engine': '/images/engine.jpg',
  'transmission': '/images/transmission.jpg',
  'brake': '/images/brake.jpg',
  'suspension': '/images/suspension.jpg',
  'steering': '/images/steering.jpg',
};

// Load car data from a JSON file
const carData = JSON.parse(fs.readFileSync('carData.json', 'utf8'));

// File path for storing analytics data
const ANALYTICS_FILE = 'analytics_data.json';

// Load existing analytics data or initialize an empty array
let analyticsData = [];
try {
    analyticsData = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8'));
} catch (error) {
    console.log('No existing analytics file found. Starting with empty data.');
}

app.post('/chat', async (req, res) => {
    try {
        const userInput = req.body.input;
        const carSpecificPrompt = `You are an AI assistant specialized in all aspects of cars, including makes, models, technical specifications, maintenance, history, and current trends. Please provide information about cars in response to the following query: "${userInput}". If your response involves explaining a specific car part, please mention the part name clearly so that an appropriate image can be displayed. Use the following additional information about cars to enhance your response: ${JSON.stringify(carData)}`;
        
        const result = await model.generateContent(carSpecificPrompt);
        const response = result.response.text();

        const imageSuggestions = Object.keys(carImages).filter(part => 
            response.toLowerCase().includes(part.toLowerCase())
        );

        logAnalyticsEvent('chat_interaction', { input: userInput, responseLength: response.length, imagesShown: imageSuggestions.length });

        res.json({ 
            response: response, 
            images: imageSuggestions.map(part => carImages[part])
        });
    } catch (error) {
        console.error('Error:', error);
        logAnalyticsEvent('chat_error', { error: error.message });
        res.status(500).json({ response: 'Sorry, something went wrong.' });
    }
});

app.post('/compare-cars', (req, res) => {
    const { car1, car2 } = req.body;
    
    const car1Data = carData.find(car => car.model.toLowerCase() === car1.toLowerCase());
    const car2Data = carData.find(car => car.model.toLowerCase() === car2.toLowerCase());

    if (!car1Data || !car2Data) {
        logAnalyticsEvent('car_comparison_error', { car1, car2, error: 'One or both car models not found' });
        return res.status(400).json({ error: 'One or both car models not found' });
    }

    const comparison = {
        car1: car1Data,
        car2: car2Data,
        differences: {}
    };

    for (const key in car1Data) {
        if (car1Data[key] !== car2Data[key]) {
            comparison.differences[key] = {
                car1: car1Data[key],
                car2: car2Data[key]
            };
        }
    }

    logAnalyticsEvent('car_comparison', { car1: car1Data.model, car2: car2Data.model, differencesCount: Object.keys(comparison.differences).length });
    res.json(comparison);
});

app.post('/track-event', (req, res) => {
    const { eventName, eventProperties } = req.body;
    logAnalyticsEvent(eventName, eventProperties);
    res.sendStatus(200);
});

function logAnalyticsEvent(eventName, eventProperties) {
    const event = {
        timestamp: new Date().toISOString(),
        eventName,
        eventProperties
    };
    analyticsData.push(event);
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analyticsData, null, 2));
    console.log('Analytics event logged:', event);
}

app.get('/analytics', (req, res) => {
    res.sendFile(path.join(__dirname, 'analytics.html'));
});

app.get('/analytics-data', (req, res) => {
    res.json(analyticsData);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
