const { JSDOM } = require('jsdom');
const axios = require('axios'); // Usando axios, mais robusto para headers
const { URL } = require('url'); // Necessário para resolver URLs relativas

/**
 * Função para buscar o HTML da página com headers robustos.
 * @param {string} url - URL do produto.
 * @returns {Promise<string>} - HTML da página.
 */
async function fetchPage(url) {
    try {
        const response = await axios.get(url, {
            // Configuração dos headers para simular um navegador real (crucial para Mercado Livre, Pichau, etc.)
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
                'Connection': 'keep-alive'
            },
            timeout: 15000 // Aumenta o timeout para 15 segundos
        });

        if (response.status === 403) {
             throw new Error(`Erro HTTP: 403 Forbidden. O site bloqueou a requisição.`);
        }
        
        // Axios retorna a resposta no objeto 'data'
        return response.data; 
    } catch (error) {
        let errorMessage = error.message;
        if (error.response) {
             errorMessage = `Erro HTTP: ${error.response.status} ${error.response.statusText}. O site bloqueou a requisição.`;
        }
        throw new Error(`Falha na requisição para ${url}: ${errorMessage}`);
    }
}

/**
 * Função para extrair o título e a imagem de uma URL.
 */
function extractInfo(url, html) {
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    let title = '';
    let imageUrl = '';

    // 1. Tentar Meta Tags Open Graph (mais confiável em e-commerce)
    title = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.querySelector('title')?.textContent;
    imageUrl = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');

    // 2. Tentar Tags de Schema.org ou H1
    if (!title) {
        title = doc.querySelector('[itemprop="name"]')?.textContent || doc.querySelector('h1')?.textContent || 'Nome não encontrado';
    }
    if (!imageUrl) {
        imageUrl = doc.querySelector('[itemprop="image"]')?.getAttribute('src') || doc.querySelector('img.main-product-image')?.getAttribute('src');
    }

    // 3. Limpeza e Resolução de URL
    if (imageUrl && imageUrl.startsWith('/')) {
        try {
            imageUrl = new URL(imageUrl, url).href;
        } catch (e) {
            // Ignora erro de URL
        }
    }
    
    // Limpeza final do título
    if (title) {
        title = title.trim().replace(/\|.*| -.*| \{.*|\s-\s.*/, '').trim();
    }

    return { name: title || 'Nome não encontrado', imageUrl: imageUrl || '' };
}


/**
 * Handler principal da Netlify Function.
 */
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido. Use POST." }) };
    }

    try {
        const body = JSON.parse(event.body);
        const url = body.url;

        if (!url) {
            return { statusCode: 400, body: JSON.stringify({ error: "URL do produto não fornecida." }) };
        }

        const html = await fetchPage(url);
        const info = extractInfo(url, html);

        return {
            statusCode: 200,
            body: JSON.stringify(info),
        };

    } catch (e) {
        console.error("Erro fatal no scraping:", e.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Falha na requisição ao site: ${e.message}` }),
        };
    }
};
```eof

### Próximos Passos Finais:

1.  **Atualize `scrape.js`:** Substitua o conteúdo do seu arquivo `netlify/functions/scrape.js` pelo código acima.
2.  **Verifique as Dependências (Axios):** Você precisa adicionar o `axios` ao seu `package.json` na **raiz** do seu projeto:

    ```json:Package Dependencies:package.json
[Immersive content redacted for brevity.]
```eof

3.  **Commit e Push:** Faça o commit dessas alterações (`scrape.js` e `package.json` atualizado) e o push para o seu repositório Git.

Esta versão é a mais otimizada que podemos criar sem o uso de proxies pagos. Se a Pichau ou o Mercado Livre continuarem a bloquear (erro `403`), será necessário preencher o nome e a URL da imagem manualmente. Tente com um link menos agressivo primeiro para confirmar que o web scraping está funcionan
