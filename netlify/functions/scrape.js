const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');
const { URL } = require('url'); // Necessário para resolver URLs relativas

/**
 * Função para extrair o título e a imagem de uma URL.
 * @param {string} url - URL do produto.
 * @param {string} html - HTML da página.
 * @returns {{name: string, imageUrl: string}}
 */
function extractInfo(url, html) {
    // 1. Configura o DOM para análise
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    let title = '';
    let imageUrl = '';

    // Tenta encontrar o título a partir de várias tags meta comuns
    const metaTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                      doc.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ||
                      doc.querySelector('title')?.textContent;
    
    if (metaTitle) {
        // Limpeza básica do título (remove nome da loja ou caracteres extras)
        title = metaTitle.trim().replace(/\|.*| -.*| \{.*|\s-\s.*/, '').trim();
    }

    // 2. Tenta encontrar a imagem a partir de tags meta comuns
    const metaImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
                      doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content');
    
    if (metaImage) {
        imageUrl = metaImage;
    } else {
        // Fallback: tenta encontrar uma imagem grande com base no schema.org ou classe comum
        const schemaImage = doc.querySelector('img[itemprop="image"]') || doc.querySelector('.main-product-image');
        if (schemaImage) {
            imageUrl = schemaImage.getAttribute('src') || schemaImage.getAttribute('data-src');
        }
    }

    // 3. Limpeza Final e Resolução de URL
    // Converte URL relativa para absoluta, se necessário
    if (imageUrl && imageUrl.startsWith('/')) {
        try {
            // Usa o construtor URL para resolver a URL relativa com base na URL de origem
            imageUrl = new URL(imageUrl, url).href;
        } catch (e) {
            // Se a resolução falhar, usa a URL relativa
        }
    }
    
    // Se o title ainda estiver vazio, tenta o H1 mais proeminente
    if (!title) {
        title = doc.querySelector('h1')?.textContent || '';
    }


    return { name: title ? title.trim() : 'Nome não encontrado', imageUrl: imageUrl || '' };
}


/**
 * Função handler da Netlify Function.
 * @param {object} event - Objeto de evento da requisição.
 */
exports.handler = async (event) => {
    // 1. Verificar o método (deve ser POST)
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Método não permitido. Use POST." }),
        };
    }

    try {
        const body = JSON.parse(event.body);
        const url = body.url;

        if (!url) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "URL do produto não fornecida." }),
            };
        }

        // --- 2. Requisição ao Site Alvo (com User-Agent para evitar bloqueio) ---
        const response = await fetch(url, {
            headers: {
                // Simula um navegador Chrome padrão para evitar o bloqueio 403 Forbidden
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
            },
        });

        if (!response.ok) {
            // Se o site bloquear com 403 (Forbidden), retorna erro específico
            return {
                statusCode: 500, // Retorna 500 para indicar falha do lado do servidor (função)
                body: JSON.stringify({ error: `Falha na requisição ao site: Erro HTTP: ${response.status} ${response.statusText}. O site pode estar bloqueando web scraping.` }),
            };
        }

        const html = await response.text();

        // --- 3. Extração das Informações ---
        const info = extractInfo(url, html);

        // Retorna o JSON com as informações extraídas
        return {
            statusCode: 200,
            body: JSON.stringify(info),
        };

    } catch (e) {
        console.error("Erro fatal no scraping:", e);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Erro interno do servidor ao processar o scraping.", details: e.message }),
        };
    }
};
