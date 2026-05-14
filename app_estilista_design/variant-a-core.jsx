// Variant A — Editorial premium (dark + lime accent, generous type, serif numerals)
// Uses CSS vars set on the container

const VA = {
  bg:      '#0A0A0A',
  surface: '#141414',
  surface2:'#1C1C1C',
  border:  'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.14)',
  text:    '#FFFFFF',
  muted:   'rgba(255,255,255,0.55)',
  dim:     'rgba(255,255,255,0.35)',
  lime:    '#C6FF3D',
  limeDim: 'rgba(198,255,61,0.12)',
  success: '#4ADE80',
  warn:    '#FBB040',
};

// ── BottomNav ──────────────────────────────────────────────
function VABottomNav({ current, onNav, t, safe = 24 }) {
  const tabs = [
    { id:'home', label:t.home, icon:Icon.home },
    { id:'schedule', label:t.schedule, icon:Icon.calendar },
    { id:'queue', label:t.queue, icon:Icon.queue, center:true },
    { id:'earnings', label:t.earnings, icon:Icon.chart },
    { id:'profile', label:t.profile, icon:Icon.user },
  ];
  return (
    <div style={{
      position:'absolute', bottom:0, left:0, right:0,
      paddingBottom: safe, paddingTop: 8,
      background:'linear-gradient(to top, rgba(10,10,10,0.96) 60%, rgba(10,10,10,0))',
      zIndex: 30,
    }}>
      <div style={{
        margin:'0 14px', background:'rgba(20,20,20,0.9)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        border:`1px solid ${VA.border}`, borderRadius: 100,
        display:'flex', alignItems:'center', justifyContent:'space-around',
        padding:'8px 10px', height: 64,
        boxShadow:'0 10px 40px rgba(0,0,0,0.4)',
      }}>
        {tabs.map(tab => {
          const active = current === tab.id;
          if (tab.center) {
            return (
              <button key={tab.id} onClick={() => onNav(tab.id)} style={{
                border:'none', padding:0, cursor:'pointer',
                width: 52, height: 52, borderRadius: '50%',
                background: VA.lime, color:'#000',
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow: active ? `0 0 0 6px ${VA.limeDim}, 0 8px 24px rgba(198,255,61,0.35)` : '0 4px 16px rgba(198,255,61,0.25)',
                transition:'all 200ms',
              }}>
                {tab.icon('#000', 24)}
              </button>
            );
          }
          return (
            <button key={tab.id} onClick={() => onNav(tab.id)} style={{
              background:'transparent', border:'none', cursor:'pointer', padding:'6px 10px',
              display:'flex', flexDirection:'column', alignItems:'center', gap:3,
              color: active ? VA.lime : VA.muted,
              transition:'color 200ms',
            }}>
              {tab.icon(active ? VA.lime : VA.muted, 22)}
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.2 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Header w/ greeting + bell ──────────────────────────────
function VAHeader({ t, lang, onToggleLang, subtitle }) {
  return (
    <div style={{ padding:'16px 24px 8px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
      <div>
        <div style={{ fontSize: 13, color: VA.muted, fontWeight: 500, letterSpacing: 0.3 }}>
          {subtitle || t.goodMorning + ' ☕'}
        </div>
        <div style={{ fontSize: 22, color: VA.text, fontWeight: 600, marginTop: 2, letterSpacing: -0.3 }}>
          Camila
        </div>
      </div>
      <div style={{ display:'flex', gap: 10 }}>
        <button onClick={onToggleLang} style={{
          background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 999,
          padding:'8px 12px', color: VA.text, fontSize: 12, fontWeight: 600, letterSpacing: 0.5,
          cursor:'pointer',
        }}>{lang === 'es' ? 'EN' : 'ES'}</button>
        <button style={{
          width: 42, height: 42, borderRadius: '50%',
          background: VA.surface, border:`1px solid ${VA.border}`,
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer', position:'relative',
        }}>
          {Icon.bell(VA.text, 20)}
          <div style={{ position:'absolute', top:10, right:11, width:8, height:8, borderRadius:999, background: VA.lime, boxShadow: `0 0 0 2px ${VA.surface}` }}/>
        </button>
      </div>
    </div>
  );
}

// ── HOME ────────────────────────────────────────────────────
function VAHome({ t, lang, go }) {
  const serving = CLIENTS.find(c => c.status === 'serving');
  const next = CLIENTS.filter(c => c.status === 'upcoming').slice(0, 3);
  const todayTotal = CLIENTS.filter(c => c.status === 'done').reduce((s,c) => s + c.price + c.tip, 0);
  const doneCount = CLIENTS.filter(c => c.status === 'done').length;

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Hero: "Serving now" card — the wow moment */}
      <div style={{ padding:'0 20px', marginTop: 8 }}>
        <div style={{
          background:`linear-gradient(135deg, ${VA.lime} 0%, #A8E82A 100%)`,
          borderRadius: 28, padding: '20px 22px', position:'relative', overflow:'hidden',
          boxShadow:'0 20px 60px rgba(198,255,61,0.25)',
        }}>
          {/* decorative rings */}
          <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', border:'1px solid rgba(0,0,0,0.1)' }}/>
          <div style={{ position:'absolute', top:-30, right:-30, width:140, height:140, borderRadius:'50%', border:'1px solid rgba(0,0,0,0.08)' }}/>

          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width:8, height:8, borderRadius:999, background:'#000' }}/>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color:'#000' }}>{t.liveNow} · {t.youAreServing}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, background:'#000', color: VA.lime,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: 20, fontWeight: 700, fontFamily:'"Instrument Serif", Georgia, serif',
            }}>{serving.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 22, fontWeight: 600, color:'#000', letterSpacing: -0.4 }}>{serving.name}</div>
              <div style={{ fontSize: 14, color:'rgba(0,0,0,0.6)', marginTop: 2 }}>{serving.service} · {serving.time}</div>
            </div>
          </div>
          <div style={{ height: 1, background:'rgba(0,0,0,0.1)', margin:'16px 0' }}/>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color:'rgba(0,0,0,0.55)', letterSpacing: 0.6 }}>{t.nextClient}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color:'#000', marginTop: 2 }}>{next[0]?.name} · {t.inMinutes} 25 {t.min}</div>
            </div>
            <button onClick={() => go('queue')} style={{
              background:'#000', color: VA.lime, border:'none', borderRadius: 999,
              padding:'10px 16px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, cursor:'pointer',
              display:'flex', alignItems:'center', gap: 6,
            }}>
              {t.queue.toUpperCase()}
              {Icon.arrowRight(VA.lime, 14)}
            </button>
          </div>
        </div>
      </div>

      {/* Stats row — editorial numerals */}
      <div style={{ padding:'20px 20px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
        <button onClick={() => go('earnings')} style={{
          background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 24,
          padding:'18px 18px 16px', textAlign:'left', cursor:'pointer',
        }}>
          <div style={{ fontSize: 11, color: VA.muted, fontWeight: 600, letterSpacing: 0.5 }}>{t.totalToday.toUpperCase()}</div>
          <div style={{
            fontFamily:'"Instrument Serif", Georgia, serif',
            fontSize: 40, fontWeight: 400, color: VA.text, letterSpacing: -1,
            lineHeight: 1, marginTop: 8, marginBottom: 10,
          }}>{fmtK(todayTotal)}</div>
          <div style={{ display:'flex', alignItems:'center', gap: 4, color: VA.success, fontSize: 12, fontWeight: 600 }}>
            {Icon.arrowUp(VA.success, 11)} 18% <span style={{ color: VA.muted, fontWeight: 500 }}>{t.vsYesterday}</span>
          </div>
        </button>
        <button onClick={() => go('clients')} style={{
          background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 24,
          padding:'18px 18px 16px', textAlign:'left', cursor:'pointer',
        }}>
          <div style={{ fontSize: 11, color: VA.muted, fontWeight: 600, letterSpacing: 0.5 }}>{t.clientsServed.toUpperCase()}</div>
          <div style={{
            fontFamily:'"Instrument Serif", Georgia, serif',
            fontSize: 40, fontWeight: 400, color: VA.text, letterSpacing: -1,
            lineHeight: 1, marginTop: 8, marginBottom: 10,
          }}>{doneCount}<span style={{ fontSize: 22, color: VA.muted }}>/{CLIENTS.length}</span></div>
          {/* mini progress */}
          <div style={{ height: 4, background:'rgba(255,255,255,0.06)', borderRadius: 999, overflow:'hidden' }}>
            <div style={{ width: `${(doneCount/CLIENTS.length)*100}%`, height:'100%', background: VA.lime }}/>
          </div>
        </button>
      </div>

      {/* Today's schedule preview */}
      <div style={{ padding:'24px 20px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 12 }}>
          <div style={{ fontSize: 18, color: VA.text, fontWeight: 600, letterSpacing: -0.3 }}>{t.yourDay}</div>
          <button onClick={() => go('schedule')} style={{
            background:'transparent', border:'none', color: VA.lime, fontSize: 13, fontWeight: 600, cursor:'pointer',
          }}>{t.viewAll} →</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
          {CLIENTS.slice(0, 4).map(c => (
            <div key={c.id} style={{
              display:'flex', alignItems:'center', gap: 14,
              background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 18,
              padding: 14,
            }}>
              <div style={{
                fontFamily:'"Instrument Serif", Georgia, serif',
                fontSize: 18, color: c.status === 'done' ? VA.dim : VA.text, fontWeight: 400,
                width: 52, letterSpacing: -0.3,
                textDecoration: c.status === 'done' ? 'line-through' : 'none',
              }}>{c.time}</div>
              <div style={{ width: 3, height: 32, borderRadius: 2, background: c.status === 'serving' ? VA.lime : c.status === 'done' ? 'rgba(255,255,255,0.2)' : c.color }}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: c.status === 'done' ? VA.muted : VA.text, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontSize: 12, color: VA.muted, marginTop: 1 }}>{c.service}</div>
              </div>
              {c.status === 'serving' && (
                <div style={{
                  padding:'5px 10px', background: VA.limeDim, border:`1px solid ${VA.lime}`,
                  borderRadius: 999, fontSize: 10, fontWeight: 700, color: VA.lime, letterSpacing: 0.8,
                }}>{t.liveNow}</div>
              )}
              {c.status === 'done' && (
                <div style={{
                  width: 24, height: 24, borderRadius:'50%', background:'rgba(255,255,255,0.06)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>{Icon.check(VA.muted, 14)}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { VA, VABottomNav, VAHeader, VAHome });
