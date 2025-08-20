import requests
from bs4 import BeautifulSoup

def scrape_product(url: str):
    """
    Faz scraping de uma página de produto.
    Retorna título, preço e descrição (quando possível).
    """
    headers = {"User-Agent": "Mozilla/5.0"}
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Título
    title = soup.find("h1")
    if not title:
        title = soup.find("title")
    title = title.get_text(strip=True) if title else "Título não encontrado"

    # Preço (tentando algumas classes comuns)
    price = None
    for selector in ["span.price", "span[class*=price]", ".a-price-whole", ".product-price"]:
        el = soup.select_one(selector)
        if el:
            price = el.get_text(strip=True)
            break
    if not price:
        price = "Preço não encontrado"

    # Descrição
    description = None
    for selector in ["div.description", "meta[name=description]", "p"]:
        el = soup.select_one(selector)
        if el:
            description = el.get("content", None) or el.get_text(strip=True)
            break
    if not description:
        description = "Descrição não encontrada"

    return {
        "title": title,
        "price": price,
        "description": description,
        "url": url,
    }
