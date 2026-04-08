"""
Forge-X — AI-Based Autonomous Space Traffic Management System
Flask Application Factory

Entry point for the backend server.
Registers all API blueprints and configures CORS.
"""

from flask import Flask, jsonify
from flask_cors import CORS
from config import FLASK_HOST, FLASK_PORT, FLASK_DEBUG, CORS_ORIGINS

# Import route blueprints
from routes.satellite_routes import satellite_bp
from routes.position_routes import position_bp
from routes.collision_routes import collision_bp
from routes.risk_routes import risk_bp
from routes.dashboard_routes import dashboard_bp
from routes.ml_routes import ml_bp
from routes.feed_routes import feed_bp
from routes.resolver_routes import resolver_bp
from routes.forecast_routes import forecast_bp

def create_app():
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # CORS — allow frontend origins
    CORS(app, origins=CORS_ORIGINS)

    # Register blueprints
    app.register_blueprint(satellite_bp)
    app.register_blueprint(position_bp)
    app.register_blueprint(collision_bp)
    app.register_blueprint(risk_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(ml_bp)
    app.register_blueprint(feed_bp)
    app.register_blueprint(resolver_bp)
    app.register_blueprint(forecast_bp)

    # Health check
    @app.route("/api/health", methods=["GET"])
    def health():
        return jsonify({
            "status": "ok",
            "service": "Forge-X Space Traffic Management",
            "version": "1.0.0",
        })

    # API index
    @app.route("/api", methods=["GET"])
    def api_index():
        return jsonify({
            "service": "Forge-X API",
            "endpoints": {
                "health": "/api/health",
                "satellites": "/api/satellites?group=stations",
                "satellite_groups": "/api/satellites/groups",
                "fetch_satellites": "POST /api/satellites/fetch",
                "positions": "/api/positions?group=stations",
                "position_trail": "/api/positions/<norad_id>/trail",
                "position_timeseries": "/api/positions/timeseries?group=stations&hours=2&step=300",
                "collisions": "/api/collisions?group=stations",
                "collision_predict": "/api/collisions/predict?group=stations&hours=24",
                "risk": "/api/risk?group=stations",
                "ml_risk": "/api/ml-risk",
                "dashboard": "/api/dashboard?group=stations",
                "forecast": "/api/forecast?group=stations&step=120",
            },
        })

    return app


if __name__ == "__main__":
    app = create_app()
    print(f"""
╔══════════════════════════════════════════════════════╗
║           FORGE-X  Space Traffic Management          ║
║        AI-Based Satellite Collision Prediction        ║
╠══════════════════════════════════════════════════════╣
║  Server:  http://{FLASK_HOST}:{FLASK_PORT}                       ║
║  API:     http://localhost:{FLASK_PORT}/api                  ║
║  Health:  http://localhost:{FLASK_PORT}/api/health            ║
╚══════════════════════════════════════════════════════╝
    """)
    app.run(host=FLASK_HOST, port=FLASK_PORT, debug=FLASK_DEBUG)
