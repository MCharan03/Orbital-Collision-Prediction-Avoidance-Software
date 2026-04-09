# 🌌 FORGE-X: Orbital Collision Prediction & Avoidance
**Comprehensive Feature Catalog & System Documentation**

Forge-X is an ultra-premium, full-stack WebGL and Machine Learning platform engineered to monitor, predict, and actively prevent satellite collisions in Low Earth Orbit (LEO) and beyond. 

Below is the complete, exhaustive list of every feature and system currently implemented in the project.

---

## 🛰️ 1. Real-Time Orbital Telemetry & Data Engine
* **USSPACECOM/CelesTrak Integration**: Fetches authentic, real-world satellite data using the standard OMM (Orbit Mean-Elements Message) JSON format.
* **Intelligent API Caching**: Features a strictly enforced 2-hour TTL (Time-to-Live) rate limiter that locally caches JSON data. This completely prevents IP blocks from CelesTrak while ensuring data is always fresh.
* **Dynamic Constellation Switching**: Supports instantly swapping the data feed between 13+ satellite groups, including Space Stations, Starlink, GPS Operational, Galileo, Weather, Earth Resources, Science, and Geo-Stationary orbits.

## 🧮 2. SGP4 Deep Space Physics & Propagation Engine
* **Mathematical SGP4 Modeling**: Translates raw satellite TLEs (Two-Line Elements) into precise X/Y/Z spatial coordinates, absolute velocity vectors, and altitude measurements.
* **$O(n^2)$ Conjunction Matrix Engine**: Computes the exact pairwise distance between hundreds of satellites dynamically, plotting their trajectories over a configurable 24-hour future window to find the absolute **Time of Closest Approach (TCA)**.
* **Intelligent Docking Filter**: Automatically identifies bolted/docked space station modules (e.g., ISS Zarya & Nauka sharing identical coordinates) and filters them out of the collision pipeline at $T=0$, completely eliminating 100% false-positive risk alerts.
* **Ghost Trajectory Prediction**: Generates arrays of trailing position-points representing the exact path an object took or is mathematically scheduled to take.

## 🧠 3. Dual-Risk Machine Learning Pipeline
* **Hybrid Verification Architecture**: Doesn't strictly rely on distance mathematics. It feeds the raw SGP4 physics calculations directly into a trained Random Forest classification model.
* **Deep Feature Engineering**: The ML model scores danger by correlating Minimum Distance (km), Relative Velocity (km/s), Altitude similarities, and TCA proximity.
* **Explainable AI (XAI)**: Generates human-readable "Reasoning Matrices" (e.g., `"Imminent approach window"`, `"High-speed intersecting planes"`) detailing exactly *why* the AI assigned a specific risk bracket.
* **Disagreement Detection**: Intelligently badges occurrences where the traditional Physics Engine and the AI Engine disagree on severity, assisting human operators in manual reviews.

## ⚡ 4. The Traffic Manager AI (Auto-Avoidance System)
* **Algorithmic Escape Navigation**: Instantly generates mathematical proposals for evasive maneuvers when a dangerous conjunction is flagged.
* **Multi-Vector Burn Solutions**: Recommends either **Prograde** (speeding up to pass early) or **Retrograde** (braking to pass late) orbital adjustments.
* **Trade-off Analytics**: Displays beautiful slider metrics weighing **Fuel Cost** (Delta-V applied) against **Risk Avoidance** (Distance mitigated) and **Flexibility** (Time until collision).
* **"Optimal" Tagging**: Highlights the single most efficient, lowest-fuel-cost maneuver out of the generated choices.
* **Real-Time Visual Override**: Allows the operator to click a maneuver and directly beam the hypothetical "escape trajectory" onto the 3D globe as a safe green line.

## 🌍 5. 3D WebGL Visualization Engine (React Three Fiber)
* **Interactive Deep Space Globe**: Smooth, damping orbit controls allowing operators to seamlessly spin, zoom, and pan around the Earth.
* **Cinematic Space Environment**: Rendered using high-end post-processing (Vignette, ACESFilmic Tone Mapping) and a 3-point lighting rig (Key/Fill/Rim lights). Employs procedural `DensityField` point-clouds and 6,000-deep star maps.
* **Dynamic Threat-Glow System**: Satellites visually react to their telemetry:
  * 🔴 **High Risk**: Satellites ignite into an intense, rapidly pulsating red glow.
  * 🟡 **Medium Risk**: Soft, gently pulsing yellow radiation.
  * 🟢 **Low Risk**: Smooth, steady green optical bloom.
  * ⚫ **Clean State**: Safe satellites remain dark (emoji textures only) to keep the UI uncrowded.
* **AI Processing Halos**: While the AI is evaluating avoidance maneuvers, a beautiful, slow-pulsing purple ring envelops the targeted satellites.

## 💎 6. Vision OS-Style User Interface (Glassmorphism)
* **Ultra-Premium Glass Aesthetics**: Utilizing deep background blurring (`backdrop-filter`), translucent borders, dynamic ambient color orbs, and Apple-grade cubic-bezier animation transitions.
* **Seamless Overlay Modals**: "Collision Intelligence Reports" and "Auto-Avoidance" sidebars float completely over the UI, creating a powerful layered depth.
* **Time-Warp Simulator**: An interactive glass trackpad that allows the operator to mechanically slide time forward up to 24 hours, watching the satellites physically drift across the globe to the point of impact.
* **Bug-Free Layering**: Features precision CSS Z-Index Portals and infinite-scroll capabilities to ensure native dropdowns and long maneuver lists are beautifully responsive without cutting through the UI.

---
*Generated by Antigravity AI Engine (Forge-X)*
