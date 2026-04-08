import os
import joblib
import pandas as pd
import numpy as np
import logging
from datetime import datetime, timezone

# Load the model once on boot
MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "rf_collision_model.joblib")

_model = None
_model_classes = None

def load_model():
    global _model, _model_classes
    if _model is None:
        if os.path.exists(MODEL_PATH):
            _model = joblib.load(MODEL_PATH)
            _model_classes = list(_model.classes_)
            print(f"[ML SERVICE] Random Forest model loaded. Classes: {_model_classes}")
        else:
            print(f"[ML SERVICE] Warning: Model not found at {MODEL_PATH}")
            return False
    return True

def predict_ml_risk(physics_events):
    """
    Takes a list of CollisionEvent objects, computes ML features,
    and returns a modified dictionary structure containing both
    physics risk and ML risk outputs.
    """
    if not load_model():
        return format_fallback(physics_events)

    predictions = []
    
    # Batch process all features for speed
    features_list = []
    for ev in physics_events:
        alt1 = ev.sat1_position['alt']
        alt2 = ev.sat2_position['alt']
        alt_diff = abs(alt1 - alt2)
        
        avg_alt = (alt1 + alt2) / 2
        orbit_type = 0
        if 2000 < avg_alt < 35786:
            orbit_type = 1
        elif avg_alt >= 35786:
            orbit_type = 2
            
        tca_dt = datetime.fromisoformat(ev.time_of_closest_approach.replace('Z', '+00:00'))
        now = datetime.now(timezone.utc)
        tca_minutes = max(0, (tca_dt - now).total_seconds() / 60.0)
        
        features_list.append([
            ev.min_distance_km,
            ev.relative_velocity_km_s,
            alt_diff,
            tca_minutes,
            orbit_type
        ])
        
    if not features_list:
        return []
        
    df = pd.DataFrame(features_list, columns=["distance", "relative_velocity", "alt_diff", "tca_minutes", "orbit_type"])
    
    # Predict classes and probabilities
    preds = _model.predict(df)
    probs = _model.predict_proba(df)
    
    # Construct combined response
    for i, ev in enumerate(physics_events):
        ml_level = preds[i]
        
        # Calculate a 0-100 ML risk score
        # Using probability of HIGH (or MEDIUM if HIGH missing)
        ml_score = 0
        confidence = float(np.max(probs[i]))

        if "HIGH" in _model_classes:
            high_idx = _model_classes.index("HIGH")
            ml_score += probs[i][high_idx] * 100
        if "MEDIUM" in _model_classes:
            med_idx = _model_classes.index("MEDIUM")
            ml_score += probs[i][med_idx] * 30
            
        ml_score = min(100, round(ml_score, 1))
        
        # Fallback heuristic if dataset lacking
        if ml_level == "LOW" and ml_score > 40:
             ml_level = "MEDIUM"
        if ml_score > 80:
             ml_level = "HIGH"
        
        # AI Reasoning
        reasons = []
        if features_list[i][0] < 5:
            reasons.append("Close proximity predicted (< 5km)")
        if features_list[i][1] > 10:
            reasons.append("High relative closure rate (> 10 km/s)")
        if features_list[i][3] < 60:
            reasons.append("Imminent approach window (< 1hr)")
        if features_list[i][2] < 10:
            reasons.append("Coplanar or near-coplanar altitudes")
            
        if not reasons:
             if ml_level == "LOW":
                 reasons.append("Orbit geometry aligns with historical low-risk patterns")
             else:
                 reasons.append("Complex orbital interaction pattern detected")
        
        event_dict = ev.to_dict() if hasattr(ev, 'to_dict') else vars(ev)
        
        phys_score = event_dict.get("risk_score", 0)
        phys_level = event_dict.get("risk_level", "LOW")
        
        # Disagreement Badge Logic
        level_map = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "UNKNOWN": 0}
        disagreement = None
        
        if level_map.get(ml_level, 0) > level_map.get(phys_level, 0):
             disagreement = "Early Warning"
        elif level_map.get(ml_level, 0) < level_map.get(phys_level, 0):
             disagreement = "Low Confidence Physics Alert"
             
        # Logging AI Decision
        print(f"[ML_SERVICE] Decision for {event_dict.get('sat1_name')} vs {event_dict.get('sat2_name')} | ML: {ml_level} ({confidence:.2f} conf) | Phys: {phys_level} | Feats: {features_list[i]}")
        
        # Build the structured API response by appending to the original
        event_dict["physics_risk"] = {
            "score": phys_score,
            "level": phys_level
        }
        event_dict["ml_risk"] = {
            "score": ml_score,
            "level": ml_level,
            "confidence": round(confidence, 2),
            "reason": reasons,
            "disagreement": disagreement
        }
        event_dict["final_risk"] = ml_level if ml_score > phys_score else phys_level
        
        predictions.append(event_dict)
        
    return predictions

def format_fallback(events):
    """Fallback if model does not exist (e.g., training not run yet)"""
    res = []
    for ev in events:
        d = ev.to_dict() if hasattr(ev, 'to_dict') else vars(ev)
        d["physics_risk"] = {"score": d.get("risk_score", 0), "level": d.get("risk_level", "LOW")}
        d["ml_risk"] = {"score": 0, "level": "UNKNOWN"}
        d["final_risk"] = d.get("risk_level", "LOW")
        res.append(d)
    return res
