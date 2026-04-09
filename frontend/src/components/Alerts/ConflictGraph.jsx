import React from 'react';

export default function ConflictGraph({ primaryCollision, rejectedManeuvers }) {
  if (!rejectedManeuvers || rejectedManeuvers.length === 0) return null;

  // Gather unique conflict nodes
  const nodes = new Map();
  nodes.set('SAT1', { id: 'SAT1', label: primaryCollision.sat1_name, x: 50, y: 100, type: 'primary' });
  nodes.set('SAT2', { id: 'SAT2', label: primaryCollision.sat2_name, x: 250, y: 50, type: 'primary' });

  let conflictIdx = 0;
  const edges = [];
  
  // Base primary collision
  edges.push({ id: 'e_primary', source: 'SAT1', target: 'SAT2', type: 'collision' });

  rejectedManeuvers.forEach(rm => {
     if (rm.conflicts && rm.conflicts.length > 0) {
        rm.conflicts.forEach(c => {
           if (!nodes.has(c)) {
              // Add secondary node
              nodes.set(c, {
                 id: c,
                 label: c,
                 x: 200 + (Math.random() * 80 - 40),
                 y: 150 + (conflictIdx * 40),
                 type: 'secondary'
              });
              conflictIdx++;
           }
           // Edge from primary maneuvering sat (SAT1) to new conflict
           edges.push({
              id: `e_${rm.maneuver_details?.delta_v_m_s}_${c}`,
              source: 'SAT1',
              target: c,
              type: 'secondary',
              label: `${rm.maneuver_details?.burn_direction || ''} burn fail`
           });
        });
     }
  });

  const nodeArray = Array.from(nodes.values());

  return (
    <div className="conflict-graph-container" style={{
        marginTop: 16, padding: 12, borderRadius: 8, 
        background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8, fontWeight: 600 }}>N-BODY CONFLICT GRAPH</div>
      <svg width="100%" height={250} style={{ background: 'transparent' }}>
         <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
            </marker>
         </defs>

         {/* Edges */}
         {edges.map((e, i) => {
            const s = nodes.get(e.source);
            const t = nodes.get(e.target);
            if (!s || !t) return null;
            return (
               <g key={i}>
                 <line 
                   x1={s.x} y1={s.y} x2={t.x} y2={t.y} 
                   stroke={e.type === 'collision' ? '#ef4444' : '#f59e0b'} 
                   strokeWidth={e.type === 'collision' ? 2 : 1}
                   strokeDasharray={e.type === 'secondary' ? '4,4' : 'none'}
                   markerEnd={e.type === 'secondary' ? 'url(#arrowhead)' : 'none'}
                 />
                 {e.label && (
                    <text 
                       x={(s.x + t.x)/2} 
                       y={(s.y + t.y)/2 - 5}
                       fill="#cbd5e1"
                       fontSize="9"
                       textAnchor="middle"
                    >
                       {e.label}
                    </text>
                 )}
               </g>
            );
         })}

         {/* Nodes */}
         {nodeArray.map(n => (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
               <circle 
                  r={14} 
                  fill={n.type === 'primary' ? '#1e293b' : '#334155'}
                  stroke={n.type === 'primary' ? '#38bdf8' : '#ef4444'} 
                  strokeWidth={2} 
               />
               <text 
                  y={25} 
                  fill="#f1f5f9" 
                  fontSize={10} 
                  textAnchor="middle"
                  style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}
               >
                  {n.label.substring(0, 15)}
               </text>
               <text 
                  y={4} 
                  fill="#f1f5f9" 
                  fontSize={12} 
                  textAnchor="middle"
               >
                  {n.type === 'primary' ? '⚡' : '⚠'}
               </text>
            </g>
         ))}
      </svg>
    </div>
  );
}
