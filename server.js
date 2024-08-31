const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = 'YOUR_API_KEY_HERE';

app.use(express.json());
app.use(express.static(path.join(__dirname, '/')));

app.post('/chat', async (req, res) => {
    try {
        const userInput = req.body.input;
        const response = await axios.post('https://api.gemini.com/v1/chat', {
            input: userInput
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ response: response.data.response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ response: 'Sorry, something went wrong.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
