// Variant B — Cyber/Bento modern (dark + lime + violet, data-dense bento grid)

// Paleta: oscuro carbón + dorado champán (lujo nocturno)
const VB = {
  bg:      '#0A0A0C',            // carbón profundo, casi negro
  surface: '#131316',            // surface base (tarjetas)
  surface2:'#1A1A1F',            // surface elevada
  surface3:'#22222A',            // chips / inputs
  border:  'rgba(255,255,255,0.05)',
  border2: 'rgba(255,255,255,0.10)',
  text:    '#F4F1EA',            // off-white cálido (no blanco puro)
  muted:   'rgba(244,241,234,0.52)',
  dim:     'rgba(244,241,234,0.32)',
  // acento PRIMARIO: dorado champán (antes "lime")
  lime:    '#E8C174',
  limeDim: 'rgba(232,193,116,0.14)',
  // acento SECUNDARIO: dorado cobrizo más cálido (antes "violet")
  violet:  '#C89B52',
  violetDim:'rgba(200,155,82,0.16)',
  // acentos de apoyo
  pink:    '#D97B6C',            // coral apagado para alertas
  cyan:    '#A9B5C9',             // gris-azul frío para contraste sutil
  success: '#9EC17A',             // verde oliva suave
};

// ── BottomNav (segmented, no center FAB) ───────────────────
function VBBottomNav({ current, onNav, t, safe = 24 }) {
  const tabs = [
    { id:'home', label:t.home, icon:Icon.home },
    { id:'schedule', label:t.schedule, icon:Icon.calendar },
    { id:'queue', label:t.queue, icon:Icon.queue },
    { id:'earnings', label:t.earnings, icon:Icon.chart },
    { id:'profile', label:t.profile, icon:Icon.user },
  ];
  return (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0,
      paddingBottom: safe, paddingTop: 10, paddingLeft: 12, paddingRight: 12,
      background:'linear-gradient(to top, rgba(10,10,12,0.98) 50%, rgba(10,10,12,0))',
      zIndex: 30,
    }}>
      <div style={{
        background: VB.surface,
        border:`1px solid ${VB.border2}`, borderRadius: 20,
        display:'flex', alignItems:'center', padding: 6,
        boxShadow:'0 10px 40px rgba(0,0,0,0.5)',
      }}>
        {tabs.map(tab => {
          const active = current === tab.id;
          return (
            <button key={tab.id} onClick={() => onNav(tab.id)} style={{
              flex: 1, background: active ? VB.surface3 : 'transparent',
              border:'none', cursor:'pointer', padding:'9px 0',
              borderRadius: 14,
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              color: active ? VB.lime : VB.muted,
              position:'relative',
              transition:'all 180ms',
            }}>
              {active && <div style={{ position:'absolute', top: 4, width: 20, height: 2, borderRadius: 2, background: VB.lime, boxShadow: `0 0 8px ${VB.lime}` }}/>}
              {tab.icon(active ? VB.lime : VB.muted, 20)}
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform:'uppercase' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function VBHeader({ t, lang, onToggleLang }) {
  return (
    <div style={{ padding:'12px 16px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background:`linear-gradient(135deg, ${VB.lime}, ${VB.violet})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: 16, fontWeight: 800, color:'#000',
        }}>C</div>
        <div>
          <div style={{ fontSize: 11, color: VB.muted, fontWeight: 600, letterSpacing: 0.3 }}>{t.goodMorning}</div>
          <div style={{ fontSize: 15, color: VB.text, fontWeight: 700, letterSpacing: -0.2 }}>Camila H.</div>
        </div>
      </div>
      <div style={{ display:'flex', gap: 8 }}>
        <button onClick={onToggleLang} style={{
          background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 10,
          padding:'7px 10px', color: VB.text, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, cursor:'pointer',
        }}>{lang === 'es' ? 'EN' : 'ES'}</button>
        <button style={{
          width: 36, height: 36, borderRadius: 10, background: VB.surface,
          border:`1px solid ${VB.border2}`, display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', position:'relative',
        }}>
          {Icon.bell(VB.text, 18)}
          <div style={{ position:'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 999, background: VB.pink }}/>
        </button>
      </div>
    </div>
  );
}

// ── HOME — Bento grid ──────────────────────────────────────
function VBHome({ t, lang, go }) {
  const serving = CLIENTS.find(c => c.status === 'serving');
  const todayTotal = CLIENTS.filter(c => c.status === 'done').reduce((s,c) => s + c.price + c.tip, 0);
  const doneCount = CLIENTS.filter(c => c.status === 'done').length;
  const upcoming = CLIENTS.filter(c => c.status === 'upcoming');
  const next = upcoming[0];

  const monoFont = '"JetBrains Mono", "SF Mono", Menlo, monospace';

  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ padding:'4px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
        {/* Hero: serving now (full width) */}
        <button onClick={() => go('queue')} style={{
          gridColumn:'1 / -1',
          background: `linear-gradient(135deg, ${VB.surface2} 0%, ${VB.surface} 100%)`,
          color: VB.text,
          border:`1px solid ${VB.lime}55`,
          borderRadius: 22, padding:'16px 18px', textAlign:'left', cursor:'pointer',
          position:'relative', overflow:'hidden',
          boxShadow:`inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px ${VB.lime}14`,
        }}>
          {/* soft glow */}
          <div style={{ position:'absolute', right:-40, top:-40, width:180, height:180, borderRadius:'50%', background:`radial-gradient(circle, ${VB.lime}22 0%, transparent 70%)` }}/>
          <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 12, position:'relative' }}>
            <div style={{ width:7, height:7, borderRadius:999, background: VB.lime, animation:'vbPulse 1.5s infinite', boxShadow:`0 0 10px ${VB.lime}` }}/>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1, color: VB.lime, fontFamily: monoFont }}>{t.liveNow} · {t.youAreServing.toUpperCase()}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 12, position:'relative' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: VB.lime, color:'#001018',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: 16, fontWeight: 800,
            }}>{serving.initials}</div>
            <div style={{ flex:1, minWidth: 0 }}>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.3, color: VB.text }}>{serving.name}</div>
              <div style={{ fontSize: 11, color: VB.muted, marginTop: 2, fontFamily: monoFont, letterSpacing: 0.3 }}>{serving.service.toUpperCase()} · {serving.time}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 800, color: VB.lime, background: VB.limeDim, padding:'6px 10px', borderRadius: 8, fontFamily: monoFont }}>
              {fmtK(serving.price)}
            </div>
          </div>
        </button>

        {/* Earnings tile */}
        <button onClick={() => go('earnings')} style={{
          background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 22,
          padding: 16, textAlign:'left', cursor:'pointer', position:'relative', overflow:'hidden',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: VB.muted, fontWeight: 700, letterSpacing: 0.8, fontFamily: monoFont }}>$ {lang==='es'?'HOY':'TODAY'}</div>
            <div style={{
              padding:'3px 6px', background: 'rgba(74,222,128,0.14)', color: VB.success,
              fontSize: 9, fontWeight: 700, borderRadius: 6, fontFamily: monoFont,
            }}>+18%</div>
          </div>
          <div style={{ fontSize: 26, color: VB.text, fontWeight: 700, letterSpacing: -0.8, lineHeight: 1 }}>
            {fmtK(todayTotal)}
          </div>
          {/* sparkline */}
          <svg viewBox="0 0 100 24" style={{ width:'100%', height: 22, marginTop: 12 }}>
            <path d="M0,18 L14,14 L28,16 L42,10 L56,12 L70,6 L85,8 L100,2" stroke={VB.lime} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            <path d="M0,18 L14,14 L28,16 L42,10 L56,12 L70,6 L85,8 L100,2 L100,24 L0,24 Z" fill={VB.lime} opacity="0.15"/>
          </svg>
        </button>

        {/* Clients served tile */}
        <button onClick={() => go('clients')} style={{
          background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 22,
          padding: 16, textAlign:'left', cursor:'pointer',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: VB.muted, fontWeight: 700, letterSpacing: 0.8, fontFamily: monoFont }}>{lang==='es'?'CLIENTES':'CLIENTS'}</div>
            <div style={{ fontSize: 10, color: VB.lime, fontWeight: 800, fontFamily: monoFont }}>{doneCount}/{CLIENTS.length}</div>
          </div>
          {/* dot matrix */}
          <div style={{ display:'flex', gap: 4, marginBottom: 10 }}>
            {CLIENTS.map((c, i) => (
              <div key={i} style={{
                flex: 1, height: 28, borderRadius: 6,
                background: c.status === 'done' ? VB.lime : c.status === 'serving' ? VB.violet : VB.surface3,
                boxShadow: c.status === 'serving' ? `0 0 10px ${VB.violet}88` : 'none',
                opacity: c.status === 'upcoming' ? 0.7 : 1,
              }}/>
            ))}
          </div>
          <div style={{ fontSize: 10, color: VB.muted, fontFamily: monoFont, letterSpacing: 0.5 }}>
            <span style={{ color: VB.lime }}>■</span> {lang==='es'?'atendido':'done'} <span style={{ color: VB.violet, marginLeft: 6 }}>■</span> {lang==='es'?'ahora':'live'}
          </div>
        </button>

        {/* Queue position tile */}
        <button onClick={() => go('queue')} style={{
          gridColumn:'1 / -1',
          background: VB.surface,
          border:`1px solid ${VB.border2}`,
          borderRadius: 22,
          padding: 16, textAlign:'left', cursor:'pointer', color: VB.text,
          position:'relative', overflow:'hidden',
        }}>
          {/* subtle grid bg */}
          <svg style={{ position:'absolute', inset:0, opacity:0.08, pointerEvents:'none' }} width="100%" height="100%">
            <defs><pattern id="vbHomeGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke={VB.lime} strokeWidth="0.5"/></pattern></defs>
            <rect width="100%" height="100%" fill="url(#vbHomeGrid)"/>
          </svg>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', position:'relative' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 4 }}>
                <div style={{ width:6, height:6, borderRadius:999, background: VB.lime, animation:'vbPulse 1.5s infinite' }}/>
                <div style={{ fontSize: 10, color: VB.lime, fontWeight: 800, letterSpacing: 0.9, fontFamily: monoFont }}>
                  {t.positionInQueue.toUpperCase()}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap: 8, marginTop: 6 }}>
                <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2.5, lineHeight: 1, color: VB.lime, fontFamily: monoFont, textShadow:`0 0 24px ${VB.lime}55` }}>3</div>
                <div style={{ fontSize: 14, color: VB.muted, fontWeight: 700, fontFamily: monoFont }}>/ {QUEUE.length}</div>
              </div>
              <div style={{ fontSize: 12, color: VB.muted, marginTop: 8, fontWeight: 600 }}>
                <span style={{ color: VB.text, fontFamily: monoFont, fontWeight: 700 }}>~35 {t.min}</span> · {next?.name}
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: VB.surface3, border:`1px solid ${VB.border2}`,
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {Icon.arrowRight(VB.lime, 20)}
            </div>
          </div>
        </button>

        {/* Next up mini-list */}
        <div style={{
          gridColumn:'1 / -1', background: VB.surface, border:`1px solid ${VB.border2}`,
          borderRadius: 22, padding: 14,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: VB.muted, fontWeight: 700, letterSpacing: 0.8, fontFamily: monoFont }}>
              {t.nextUp.toUpperCase()}
            </div>
            <button onClick={() => go('schedule')} style={{
              background:'transparent', border:'none', color: VB.lime, fontSize: 11, fontWeight: 700, cursor:'pointer', fontFamily: monoFont,
            }}>ALL →</button>
          </div>
          {upcoming.slice(0, 3).map(c => (
            <div key={c.id} style={{
              display:'flex', alignItems:'center', gap: 12,
              padding:'10px 0', borderTop:`1px solid ${VB.border}`,
            }}>
              <div style={{
                fontFamily: monoFont, fontSize: 13, color: VB.lime, fontWeight: 700,
                width: 48,
              }}>{c.time}</div>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: c.color, color:'#000', fontSize: 11, fontWeight: 700,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>{c.initials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: VB.text, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: VB.muted }}>{c.service}</div>
              </div>
              <div style={{ fontSize: 12, color: VB.text, fontWeight: 700, fontFamily: monoFont }}>{fmtK(c.price)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { VB, VBBottomNav, VBHeader, VBHome });
