[Immersive content redacted for brevity.]

const fetch = require('node-fetch');
const cheerio = require('cheerio'); // Biblioteca leve de scraping

// Função para buscar o conteúdo de uma URL
async function fetchPage(url) {
    try {
        const response = await fetch(url, {
            headers: {
                // User-Agent é crucial para evitar bloqueios de bots
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 10000 // Timeout de 10 segundos
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status} ${response.statusText}`);
        }

        return response.text();
    } catch (error) {
        throw new Error(`Falha na requisição para ${url}: ${error.message}`);
    }
}

// Função para extrair nome e imagem
function extractProductInfo(html, baseUrl) {
    const $ = cheerio.load(html);
    let name = '';
    let imageUrl = '';

    // 1. Tentar Meta Tags Open Graph (padrão para compartilhamento social/e-commerce)
    name = $('meta[property="og:title"]').attr('content') || $('title').text();
    imageUrl = $('meta[property="og:image"]').attr('content');

    // 2. Tentar Meta Tags de Schema.org (Google/SEO)
    if (!name) {
        name = $('meta[name="twitter:title"]').attr('content');
    }
    if (!imageUrl) {
        imageUrl = $('meta[name="twitter:image"]').attr('content');
    }

    // 3. Tentar elementos HTML comuns (h1, img principal)
    if (!name) {
        // Encontra o H1 mais proeminente ou o título do produto
        name = $('h1').first().text().trim() || $('[itemprop="name"]').first().text().trim();
    }

    if (!imageUrl) {
        // Procura por tags de imagem comuns de produto
        const imgTag = $('img[itemprop="image"], img.product-main-image, img#main-image').first();
        if (imgTag.length) {
            imageUrl = imgTag.attr('src') || imgTag.attr('data-src');
        }
    }
    
    // Converte URL relativa para absoluta (necessário em muitos sites)
    if (imageUrl && imageUrl.startsWith('/')) {
        const { URL } = require('url');
        try {
            imageUrl = new URL(imageUrl, baseUrl).href;
        } catch (e) {
            // Ignora se a URL relativa for inválida
        }
    }

    return {
        name: name ? name.trim().replace(/\s+/g, ' ') : null,
        imageUrl: imageUrl || null
    };
}

// Handler principal da Netlify Function
exports.handler = async (event, context) => {
    // 1. Verificar o método (deve ser POST)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Método não permitido. Use POST." }),
        };
    }

    // 2. Processar o corpo da requisição (JSON)
    const data = JSON.parse(event.body);
    const url = data.url;

    if (!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "URL não fornecida no corpo da requisição." }),
        };
    }

    // 3. Executar Web Scraping
    try {
        const html = await fetchPage(url);
        const productInfo = extractProductInfo(html, url);

        if (!productInfo.name && !productInfo.imageUrl) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: "Não foi possível extrair informações relevantes do produto." }),
            };
        }

        // 4. Retornar dados com sucesso
        return {
            statusCode: 200,
            body: JSON.stringify(productInfo),
        };

    } catch (error) {
        console.error("Erro na Netlify Function:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Falha na requisição ao site: ${error.message}` }),
        };
    }
};
