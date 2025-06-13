const express = require('express');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { translate } = require('@vitalets/google-translate-api');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Keep a browser instance running
let browser;
(async () => {
    browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage'
        ]
    });
    console.log('Puppeteer browser launched');
})();

// Proxy route
app.get('/proxy', async (req, res) => {
    let page;
    try {
        const targetUrl = req.query.url || 'https://www.cmegroup.com';
        const shouldTranslate = req.query.translate === 'true';

        // Validate URL
        if (!targetUrl.startsWith('http')) {
            return res.status(400).send('Invalid URL - must start with http:// or https://');
        }

        console.log(`Processing URL: ${targetUrl}`);

        // Launch Puppeteer page
        page = await browser.newPage();
        
        // Set realistic headers
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Set viewport
        await page.setViewport({ width: 1366, height: 768 });

        // Enable request interception to block unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            // Block images, fonts, and stylesheets to speed up loading
            if (['image', 'font', 'stylesheet'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Navigate to page with network idle detection
        await page.goto(targetUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Get fully rendered HTML
        let html = await page.content();

        if (shouldTranslate) {
            console.log('Starting translation...');
            // Parse HTML and translate text content
            const $ = cheerio.load(html);
            const textElements = $('h1, h2, h3, h4, h5, h6, p, span:not(:has(*)), a, li, td, th, caption, label, button, figcaption');

            // Batch translation to improve performance
            const batchSize = 5;
            for (let i = 0; i < textElements.length; i += batchSize) {
                const batch = textElements.slice(i, i + batchSize);
                const translationPromises = batch.map(async (el) => {
                    const $el = $(el);
                    const text = $el.text().trim();
                    
                    if (text && text.length < 500) { // Skip empty and very long texts
                        try {
                            const translated = await translate(text, { to: 'fr' });
                            $el.text(translated.text);
                        } catch (err) {
                            console.error(`Translation error for text: ${text}`, err);
                        }
                    }
                });

                await Promise.all(translationPromises);
            }

            html = $.html();
            console.log('Translation completed');
        }

        res.send(html);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).send(`Error processing the website: ${error.message}`);
    } finally {
        if (page) {
            await page.close();
        }
    }
});

// Graceful shutdown
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit();
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Try accessing: http://localhost:${PORT}/?url=https://www.cmegroup.com`);
});
