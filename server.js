const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { translate } = require('@vitalets/google-translate-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Proxy route
app.get('/proxy', async (req, res) => {
    try {
        const targetUrl = req.query.url || 'https://www.cmegroup.com';
        const shouldTranslate = req.query.translate === 'true';

        // Fetch the target website
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        let html = response.data;

        if (shouldTranslate) {
            // Parse HTML and translate text content
            const $ = cheerio.load(html);
            const textElements = $('h1, h2, h3, h4, h5, h6, p, span, a, li, td, th, caption, label, button, figcaption');

            // Translate each element sequentially to avoid rate limiting
            for (let i = 0; i < textElements.length; i++) {
                const el = textElements[i];
                const text = $(el).text().trim();
                
                if (text) {
                    try {
                        const translated = await translate(text, { to: 'fr' });
                        $(el).text(translated.text);
                    } catch (err) {
                        console.error(`Translation error for text: ${text}`, err);
                    }
                }
            }

            html = $.html();
        }

        res.send(html);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send('Error fetching or translating the website');
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Try accessing: http://localhost:${PORT}/?url=https://www.cmegroup.com`);
});