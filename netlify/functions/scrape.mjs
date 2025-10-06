import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export async function handler(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Método não permitido. Use POST." }),
        };
    }

    const data = JSON.parse(event.body);
    const url = data.url;

    if (!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "URL não fornecida no corpo da requisição." }),
        };
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            }
        });

        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

        const html = await response.text();
        const $ = cheerio.load(html);

        const name =
            $('meta[property="og:title"]').attr('content') ||
            $('title').text() ||
            $('h1').first().text().trim();

        const imageUrl =
            $('meta[property="og:image"]').attr('content') ||
            $('img[itemprop="image"]').attr('src') ||
            $('img').first().attr('src');

        return {
            statusCode: 200,
            body: JSON.stringify({ name, imageUrl }),
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Falha na requisição ao site: ${error.message}` }),
        };
    }
}
