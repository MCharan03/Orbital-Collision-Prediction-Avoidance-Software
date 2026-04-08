import requests
from flask import Blueprint, jsonify

feed_bp = Blueprint("feed", __name__)

SPACEFLIGHT_NEWS_API = "https://api.spaceflightnewsapi.net/v4/articles/"

@feed_bp.route("/api/space-feed", methods=["GET"])
def get_space_feed():
    try:
        response = requests.get(SPACEFLIGHT_NEWS_API, params={"limit": 15})
        response.raise_for_status()
        data = response.json()
        articles = data.get("results", [])
        
        # Add a simulated AI summary to each article to fit the AI branding
        for article in articles:
            # We'll use the summary to generate a short bullet point "AI Insight"
            summary_length = len(article.get("summary", ""))
            if summary_length > 100:
                article["ai_summary"] = "Critical payload. Orbital trajectory requires monitoring." if "launch" in article.get("title", "").lower() else "Routine spaceflight operations update. No anomalies detected."
            else:
                article["ai_summary"] = "General industry update."
                
        return jsonify({
            "status": "success",
            "articles": articles
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "articles": []
        }), 500
