document.addEventListener('DOMContentLoaded', function() {
    const siteUrlInput = document.getElementById('site-url');
    const loadBtn = document.getElementById('load-btn');
    const translateBtn = document.getElementById('translate-btn');
    const reloadBtn = document.getElementById('reload-btn');
    const websiteContent = document.getElementById('website-content');
    const loadingIndicator = document.getElementById('loading');

    let currentUrl = siteUrlInput.value;
    let isTranslated = false;

    // Load initial site
    loadSite(currentUrl, false);

    // Event listeners
    loadBtn.addEventListener('click', () => {
        currentUrl = siteUrlInput.value.trim();
        isTranslated = false;
        loadSite(currentUrl, false);
    });

    translateBtn.addEventListener('click', () => {
        isTranslated = !isTranslated;
        translateBtn.textContent = isTranslated ? 'Show Original' : 'Translate to French';
        loadSite(currentUrl, isTranslated);
    });

    reloadBtn.addEventListener('click', () => {
        loadSite(currentUrl, isTranslated);
    });

    // Function to load site content
    function loadSite(url, translate) {
        showLoading();
        
        // Encode URL and prepare proxy request
        const proxyUrl = `/proxy?url=${encodeURIComponent(url)}&translate=${translate}`;
        
        fetch(proxyUrl)
            .then(response => response.text())
            .then(html => {
                websiteContent.innerHTML = html;
                hideLoading();
                
                // Fix relative URLs in links, images, etc.
                fixRelativeUrls(url);
            })
            .catch(error => {
                console.error('Error:', error);
                websiteContent.innerHTML = `<div class="error">Failed to load the website. Please check the URL and try again.</div>`;
                hideLoading();
            });
    }

    // Helper function to show loading state
    function showLoading() {
        loadingIndicator.style.display = 'flex';
        websiteContent.innerHTML = '';
    }

    // Helper function to hide loading state
    function hideLoading() {
        loadingIndicator.style.display = 'none';
    }

    // Fix relative URLs in the fetched content
    function fixRelativeUrls(baseUrl) {
        const base = new URL(baseUrl);
        
        // Fix links
        document.querySelectorAll('a[href^="/"]').forEach(link => {
            const href = link.getAttribute('href');
            link.href = base.origin + href;
        });
        
        // Fix images
        document.querySelectorAll('img[src^="/"]').forEach(img => {
            const src = img.getAttribute('src');
            img.src = base.origin + src;
        });
        
        // Fix scripts and styles
        document.querySelectorAll('script[src^="/"], link[href^="/"][rel="stylesheet"]').forEach(el => {
            const attr = el.hasAttribute('src') ? 'src' : 'href';
            const value = el.getAttribute(attr);
            el.setAttribute(attr, base.origin + value);
        });
    }
});