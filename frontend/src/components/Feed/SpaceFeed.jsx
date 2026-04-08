import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchSpaceFeed } from '../../utils/api';

export default function SpaceFeed() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await fetchSpaceFeed();
        if (data.status === 'success') {
          setArticles(data.articles || []);
        } else {
          setError(data.message || 'Failed to fetch news');
        }
      } catch (err) {
        setError('Connection error');
      } finally {
        setLoading(false);
      }
    };
    loadNews();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--color-primary-light)' }}>
        <div className="loader-orbit" style={{ width: 60, height: 60, borderWidth: 1 }}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, color: 'var(--color-danger)', textAlign: 'center' }}>
        <h2>Signal Interrupted</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-feed-container">
      <div className="feed-header">
        <h1>Space Intelligence Feed</h1>
        <p>Global aerospace events, launches, and AI insights</p>
      </div>

      <div className="feed-grid">
        {articles.map((article, idx) => (
          <motion.div 
            key={article.id || idx} 
            className="feed-card shadow-glass"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => window.open(article.url, '_blank')}
          >
            {article.image_url && (
              <div className="feed-card-image" style={{ backgroundImage: `url(${article.image_url})` }}>
                <div className="feed-source-badge">{article.news_site}</div>
              </div>
            )}
            <div className="feed-card-content">
              <h3 className="feed-card-title">{article.title}</h3>
              <p className="feed-card-summary">{article.summary?.substring(0, 120)}...</p>
              
              {article.ai_summary && (
                <div className="ai-insight-box">
                  <div className="ai-insight-header">
                    <span className="icon">✨</span> AI INSIGHT
                  </div>
                  <p>{article.ai_summary}</p>
                </div>
              )}
              
              <div className="feed-card-footer">
                <span className="date">{new Date(article.published_at).toLocaleDateString()}</span>
                <span className="read-more">Read Source →</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
