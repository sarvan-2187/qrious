from fastapi import APIRouter, HTTPException, Query
from database import get_db
from typing import Optional, List
from models.news import QuantumNewsArticleOut
from services.arxiv_fetcher import sync_all_news

router = APIRouter(prefix="/api/news", tags=["News"])

@router.post("/quantum/sync")
async def force_sync_news():
    """
    Triggers an immediate live sync across all external feeds (arXiv, Qiskit, Phys.org)
    and updates MongoDB cache with fresh content.
    """
    try:
        stats = await sync_all_news(force=True)
        return {"message": "Quantum news synced successfully", "stats": stats}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync news: {str(e)}")

@router.get("/quantum", response_model=List[QuantumNewsArticleOut])
async def get_quantum_news(
    category: Optional[str] = Query(None, description="Filter by category: hardware, software, research, breakthrough"),
    limit: int = Query(50, ge=1, le=100),
    force_refresh: bool = Query(False, description="Trigger live external sync before returning")
):
    """
    Retrieves quantum news articles directly from MongoDB.
    If force_refresh is True, triggers a live fetch from external sources first.
    """
    if force_refresh:
        try:
            await sync_all_news(force=True)
        except Exception as e:
            print(f"[News Router Error] Force refresh failed: {e}")
            
    db = get_db()
    if db is None:
        raise HTTPException(status_code=500, detail="Database not connected")
        
    query = {}
    if category:
        query["category"] = category.lower()
        
    cursor = db.quantum_news.find(query).sort("published_at", -1).limit(limit)
    articles = await cursor.to_list(length=limit)
    
    # Ensure fallback image_url if doc in Mongo is missing it
    fallback_images = {
        "hardware": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop",
        "software": "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
        "breakthrough": "https://images.unsplash.com/photo-1507668077129-56e32842fceb?q=80&w=1200&auto=format&fit=crop",
        "research": "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?q=80&w=1200&auto=format&fit=crop"
    }

    result = []
    for doc in articles:
        doc["id"] = str(doc.pop("_id"))
        if not doc.get("image_url"):
            cat = doc.get("category", "research").lower()
            doc["image_url"] = fallback_images.get(cat, fallback_images["research"])
        result.append(doc)
        
    return result
