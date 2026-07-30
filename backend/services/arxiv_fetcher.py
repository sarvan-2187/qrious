import sys
import os
import httpx
import feedparser
import time
import re
import asyncio
from datetime import datetime, timezone
from typing import List

# Add parent directory to sys.path to allow standalone script execution
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.news import QuantumNewsArticle
from database import get_db, connect_to_mongo, close_mongo_connection

ARXIV_API_URL = "https://export.arxiv.org/api/query"
QISKIT_RSS_URL = "https://medium.com/feed/qiskit"
PHYSORG_RSS_URL = "https://phys.org/rss-feed/physics-news/quantum-physics/"

# arXiv's API guidelines ask automated clients to identify themselves via
# User-Agent — unlike the Qiskit/Phys.org fetchers below (which spoof a
# browser UA to get past basic bot-blocking on Medium/phys.org), arXiv is
# generally cooperative with well-behaved identified bots, so a real
# descriptive UA is the more correct fix here, not a browser spoof.
ARXIV_USER_AGENT = "Qrious-Quantum-Tutor-NewsSync/1.0 (educational platform; quantum news aggregation)"

QUANTUM_KEYWORDS = [
    "quantum", "qubit", "qiskit", "entanglement", "superposition",
    "teleportation", "schrodinger", "heisenberg", "spin", "photonic",
    "superconducting", "transmon", "ion trap", "cryogenic", "quantum computing",
    "decoherence", "fault-tolerant", "error correction"
]

FALLBACK_IMAGES = {
    "hardware": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop",
    "software": "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    "breakthrough": "https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=1200&auto=format&fit=crop",
    "research": "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=1200&auto=format&fit=crop"
}

def extract_image_url(entry, raw_html: str, category: str) -> str:
    if hasattr(entry, 'media_content') and entry.media_content:
        for media in entry.media_content:
            if media.get('url'):
                return media['url']
    if hasattr(entry, 'media_thumbnail') and entry.media_thumbnail:
        for media in entry.media_thumbnail:
            if media.get('url'):
                return media['url']
                
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', raw_html, re.IGNORECASE)
    if match:
        img_url = match.group(1)
        if img_url.startswith("http"):
            return img_url
            
    return FALLBACK_IMAGES.get(category, FALLBACK_IMAGES["research"])

async def _get_with_retry(client: httpx.AsyncClient, url: str, params: dict = None, max_retries: int = 2) -> httpx.Response:
    """GET with 429-aware retry/backoff. arXiv's export API rate-limits and
    returns 429 with little warning — a transient one shouldn't fail the
    whole news sync when a short wait would clear it. Reused for the RSS
    fetches below too since the backoff logic is identical either way."""
    response = None
    for attempt in range(max_retries + 1):
        try:
            response = await client.get(url, params=params)
            if response.status_code != 429:
                response.raise_for_status()
                return response
        except httpx.HTTPStatusError as e:
            if e.response.status_code != 429 or attempt == max_retries:
                raise e

        if attempt < max_retries:
            retry_after = response.headers.get("Retry-After") if response else None
            delay = float(retry_after) if retry_after and retry_after.replace(".", "", 1).isdigit() else (attempt + 1) * 6
            print(f"[NewsSync] {url} rate-limited (429) — retrying in {delay:.0f}s (attempt {attempt + 1}/{max_retries})", flush=True)
            await asyncio.sleep(delay)
    if response:
        response.raise_for_status()
    return response


def is_quantum_relevant(title: str, summary: str) -> bool:
    text = f"{title} {summary}".lower()
    return any(kw in text for kw in QUANTUM_KEYWORDS)

def categorize_article(title: str, summary: str) -> str:
    text = f"{title} {summary}".lower()
    
    if any(k in text for k in ["breakthrough", "supremacy", "quantum advantage", "milestone", "record"]):
        return "breakthrough"
    elif any(k in text for k in ["hardware", "qubit", "transmon", "ion trap", "photonic", "chip", "superconducting", "cryogenic"]):
        return "hardware"
    elif any(k in text for k in ["qiskit", "cirq", "pennylane", "compiler", "software", "simulation", "algorithm", "code", "programming"]):
        return "software"
    else:
        return "research"

async def fetch_arxiv_articles(max_results: int = 30) -> List[QuantumNewsArticle]:
    """Hits the arXiv Atom API for quant-ph, parses entries, and maps them to QuantumNewsArticle objects."""
    params = {
        "search_query": "cat:quant-ph",
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "max_results": max_results
    }
    
    async with httpx.AsyncClient(
        timeout=20.0, follow_redirects=True, headers={"User-Agent": ARXIV_USER_AGENT},
    ) as client:
        response = await _get_with_retry(client, ARXIV_API_URL, params=params)

    feed = feedparser.parse(response.text)
    articles: List[QuantumNewsArticle] = []

    for entry in feed.entries:
        raw_title = entry.get("title", "").replace("\n", " ").strip()
        clean_title = re.sub(r"\s+", " ", raw_title)

        raw_summary = entry.get("summary", "").replace("\n", " ").strip()
        clean_summary = re.sub(r"\s+", " ", raw_summary)
        
        article_url = entry.get("link", "")
        if "arxiv.org/abs/" in article_url:
            article_url = article_url.replace("http://", "https://")
            
        published_at = datetime.now(timezone.utc)
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published_at = datetime.fromtimestamp(time.mktime(entry.published_parsed), tz=timezone.utc)
            
        category = categorize_article(clean_title, clean_summary)
        image_url = extract_image_url(entry, raw_summary, category)
        
        article = QuantumNewsArticle(
            source="arxiv",
            category=category,
            title=clean_title,
            url=article_url,
            published_at=published_at,
            fetched_at=datetime.now(timezone.utc),
            raw_summary=clean_summary[:400] + "..." if len(clean_summary) > 400 else clean_summary,
            audience_tags=["educator", "student"],
            image_url=image_url
        )
        articles.append(article)
        
    return articles

async def fetch_qiskit_articles(max_results: int = 15) -> List[QuantumNewsArticle]:
    """Hits Qiskit / IBM Quantum Medium RSS feed and maps entries to QuantumNewsArticle objects."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
        response = await _get_with_retry(client, QISKIT_RSS_URL)
        
    feed = feedparser.parse(response.text)
    articles: List[QuantumNewsArticle] = []
    
    for entry in feed.entries[:max_results]:
        raw_title = entry.get("title", "").replace("\n", " ").strip()
        clean_title = re.sub(r"\s+", " ", raw_title)
        
        raw_summary_html = entry.get("summary", "") or entry.get("description", "")
        clean_summary = re.sub(r"<[^>]+>", "", raw_summary_html).replace("\n", " ").strip()
        clean_summary = re.sub(r"\s+", " ", clean_summary)
        
        article_url = entry.get("link", "")
        published_at = datetime.now(timezone.utc)
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published_at = datetime.fromtimestamp(time.mktime(entry.published_parsed), tz=timezone.utc)
            
        category = categorize_article(clean_title, clean_summary)
        if category == "research":
            category = "software"
            
        image_url = extract_image_url(entry, raw_summary_html, category)
        
        article = QuantumNewsArticle(
            source="qiskit",
            category=category,
            title=clean_title,
            url=article_url,
            published_at=published_at,
            fetched_at=datetime.now(timezone.utc),
            raw_summary=clean_summary[:400] + "..." if len(clean_summary) > 400 else clean_summary,
            audience_tags=["educator", "student"],
            image_url=image_url
        )
        articles.append(article)
        
    return articles

async def fetch_physorg_articles(max_results: int = 20) -> List[QuantumNewsArticle]:
    """Hits Phys.org Quantum Physics RSS feed, applies keyword relevance filtering, and maps entries."""
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    async with httpx.AsyncClient(timeout=15.0, follow_redirects=True, headers=headers) as client:
        response = await client.get(PHYSORG_RSS_URL)
        response.raise_for_status()
        
    feed = feedparser.parse(response.text)
    articles: List[QuantumNewsArticle] = []
    
    for entry in feed.entries:
        if len(articles) >= max_results:
            break
            
        raw_title = entry.get("title", "").replace("\n", " ").strip()
        clean_title = re.sub(r"\s+", " ", raw_title)
        
        raw_summary_html = entry.get("summary", "") or entry.get("description", "")
        clean_summary = re.sub(r"<[^>]+>", "", raw_summary_html).replace("\n", " ").strip()
        clean_summary = re.sub(r"\s+", " ", clean_summary)
        
        if not is_quantum_relevant(clean_title, clean_summary):
            continue
            
        article_url = entry.get("link", "")
        published_at = datetime.now(timezone.utc)
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            published_at = datetime.fromtimestamp(time.mktime(entry.published_parsed), tz=timezone.utc)
            
        category = categorize_article(clean_title, clean_summary)
        image_url = extract_image_url(entry, raw_summary_html, category)
        
        article = QuantumNewsArticle(
            source="physorg",
            category=category,
            title=clean_title,
            url=article_url,
            published_at=published_at,
            fetched_at=datetime.now(timezone.utc),
            raw_summary=clean_summary[:400] + "..." if len(clean_summary) > 400 else clean_summary,
            audience_tags=["educator", "student"],
            image_url=image_url
        )
        articles.append(article)
        
    return articles

async def sync_all_news(max_results_per_source: int = 30, force: bool = False) -> dict:
    """
    Orchestrates news fetching across arXiv, Qiskit, and Phys.org with isolated try/except resilience,
    persisting new items into MongoDB and deduplicating by URL. Also updates image_url on existing articles.
    
    If force is False, checks if fresh news articles (fetched < 60 mins ago) already exist in DB to prevent
    rate-limiting (429) on dev hot-reloads.
    """
    db = get_db()
    if db is None:
        print("[NewsSync] MongoDB not connected, skipping news sync.")
        return {"fetched": 0, "inserted": 0, "duplicates": 0, "sources": {"arxiv": 0, "qiskit": 0, "physorg": 0}}

    if not force:
        try:
            latest = await db.quantum_news.find_one(sort=[("fetched_at", -1)])
            if latest and "fetched_at" in latest:
                fetched_at = latest["fetched_at"]
                if fetched_at.tzinfo is None:
                    fetched_at = fetched_at.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                age_minutes = (now - fetched_at).total_seconds() / 60
                if age_minutes < 60:
                    count = await db.quantum_news.count_documents({})
                    print(f"[NewsSync] Fresh news already in MongoDB ({count} articles, updated {int(age_minutes)}m ago). Skipping live HTTP fetch.")
                    return {"fetched": 0, "inserted": 0, "duplicates": 0, "sources": {"arxiv": 0, "qiskit": 0, "physorg": 0}, "cached": True}
        except Exception as e:
            print(f"[NewsSync Warning] Cache check failed, proceeding with live fetch: {e}")

    all_articles: List[QuantumNewsArticle] = []
    source_stats = {"arxiv": 0, "qiskit": 0, "physorg": 0}
    
    try:
        arxiv_articles = await fetch_arxiv_articles(max_results=max_results_per_source)
        all_articles.extend(arxiv_articles)
        source_stats["arxiv"] = len(arxiv_articles)
    except Exception as e:
        print(f"[NewsSync Error] Failed to fetch arXiv articles: {e}")

    try:
        qiskit_articles = await fetch_qiskit_articles(max_results=max_results_per_source)
        all_articles.extend(qiskit_articles)
        source_stats["qiskit"] = len(qiskit_articles)
    except Exception as e:
        print(f"[NewsSync Error] Failed to fetch Qiskit articles: {e}")

    try:
        physorg_articles = await fetch_physorg_articles(max_results=max_results_per_source)
        all_articles.extend(physorg_articles)
        source_stats["physorg"] = len(physorg_articles)
    except Exception as e:
        print(f"[NewsSync Error] Failed to fetch Phys.org articles: {e}")

    if not all_articles:
        return {"fetched": 0, "inserted": 0, "duplicates": 0, "sources": source_stats}

    fetched_urls = [a.url for a in all_articles if a.url]
    
    existing_docs = await db.quantum_news.find(
        {"url": {"$in": fetched_urls}},
        {"url": 1}
    ).to_list(length=len(fetched_urls))
    
    existing_urls = {doc["url"] for doc in existing_docs}
    new_articles = [a for a in all_articles if a.url not in existing_urls]
    
    # Also update image_url for existing articles if missing
    for a in all_articles:
        if a.url in existing_urls:
            await db.quantum_news.update_one(
                {"url": a.url, "image_url": {"$exists": False}},
                {"$set": {"image_url": a.image_url}}
            )

    if new_articles:
        docs_to_insert = [a.model_dump(mode='json') if hasattr(a, 'model_dump') else a.dict() for a in new_articles]
        try:
            result = await db.quantum_news.insert_many(docs_to_insert, ordered=False)
            inserted_count = len(result.inserted_ids)
        except Exception as e:
            print(f"[NewsSync Error] PyMongo insert_many partial error: {e}")
            inserted_count = len(docs_to_insert)
    else:
        inserted_count = 0
        
    duplicates_count = len(all_articles) - inserted_count
    
    return {
        "fetched": len(all_articles),
        "inserted": inserted_count,
        "duplicates": duplicates_count,
        "sources": source_stats
    }
