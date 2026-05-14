// Variant B — Schedule, Earnings, Queue, Clients, Profile
const MONO = '"JetBrains Mono", "SF Mono", Menlo, monospace';

function VBSchedule({ t, lang }) {
  const [day, setDay] = React.useState(2);
  const dates = [17, 18, 19, 20, 21, 22, 23];
  const appts = useAppts();
  const [editing, setEditing] = React.useState(null);
  const doneCount = appts.filter(a => a.status === 'done').length;

  return (
    <div style={{ paddingBottom: 110 }}>
      {editing && <ApptModal appt={editing} onClose={() => setEditing(null)} t={t} lang={lang} theme={VB}/>}

      {/* compact day strip */}
      <div style={{ padding:'4px 12px 0' }}>
        <div style={{
          background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 16,
          padding: 6, display:'flex', gap: 4,
        }}>
          {t.days.map((d, i) => {
            const active = i === day;
            return (
              <button key={i} onClick={() => setDay(i)} style={{
                flex: 1, padding:'8px 0', borderRadius: 11,
                background: active ? VB.lime : 'transparent',
                color: active ? '#000' : VB.muted,
                border:'none', cursor:'pointer',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, fontFamily: MONO }}>{d.toUpperCase()}</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2, letterSpacing: -0.3 }}>{dates[i]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* header stats + CTA */}
      <div style={{ padding:'12px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8 }}>
        <div style={{ background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 9, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.5 }}>APPTS</div>
          <div style={{ fontSize: 22, color: VB.text, fontWeight: 700, letterSpacing: -0.6, marginTop: 2 }}>{appts.length}</div>
        </div>
        <div style={{ background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 14, padding: 12 }}>
          <div style={{ fontSize: 9, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.5 }}>DONE</div>
          <div style={{ fontSize: 22, color: VB.lime, fontWeight: 700, letterSpacing: -0.6, marginTop: 2 }}>{doneCount}</div>
        </div>
        <button onClick={() => setEditing({ _new: true })} style={{
          background: VB.lime, border:'none', borderRadius: 14, padding: 12, cursor:'pointer',
          display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'flex-start', color:'#000',
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, fontFamily: MONO, letterSpacing: 0.5 }}>+ NEW</div>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.3, marginTop: 2 }}>{t.addAppt}</div>
        </button>
      </div>

      {/* timeline */}
      <div style={{ padding:'14px 12px 0', position:'relative' }}>
        {appts.map((c) => (
          <div key={c.id} style={{ display:'flex', gap: 10, marginBottom: 8, position:'relative' }}>
            <div style={{ width: 44, flexShrink: 0, paddingTop: 10 }}>
              <div style={{ fontSize: 11, color: VB.muted, fontWeight: 700, fontFamily: MONO, textDecoration: c.status==='cancelled'?'line-through':'none' }}>{c.time}</div>
            </div>
            <div style={{ width: 2, background: VB.border2, position:'relative', marginRight: 4 }}>
              <div style={{
                position:'absolute', left: -4, top: 10, width: 10, height: 10, borderRadius: 999,
                background: c.status === 'serving' ? VB.lime : c.status === 'done' ? VB.success : c.status === 'cancelled' ? '#FF6B6B' : c.color,
                border: `2px solid ${VB.bg}`,
                boxShadow: c.status === 'serving' ? `0 0 10px ${VB.lime}` : 'none',
              }}/>
            </div>
            <button onClick={() => setEditing(c)} style={{
              flex: 1, textAlign:'left', padding: 0, border:'none', background:'transparent', cursor:'pointer',
            }}>
              <div style={{
                background: c.status === 'serving' ? VB.lime : VB.surface,
                color: c.status === 'serving' ? '#000' : VB.text,
                border: c.status === 'serving' ? 'none' : `1px solid ${c.status==='cancelled'?'rgba(255,107,107,0.3)':VB.border2}`,
                borderRadius: 14, padding: 12,
                opacity: c.status === 'done' || c.status === 'cancelled' ? 0.55 : 1,
                position:'relative',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: -0.2, textDecoration: c.status==='cancelled'?'line-through':'none' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: c.status === 'serving' ? 'rgba(0,0,0,0.6)' : VB.muted, marginTop: 1, fontFamily: MONO }}>
                      {c.service.toUpperCase()} · 45min
                    </div>
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, fontFamily: MONO,
                    color: c.status === 'serving' ? '#000' : VB.text,
                  }}>{fmtK(c.price)}</div>
                </div>
                {c.status === 'serving' && (
                  <div style={{ marginTop: 8, display:'flex', alignItems:'center', gap: 5 }}>
                    <div style={{ width:6, height:6, borderRadius:999, background:'#000', animation:'vbPulse 1.5s infinite' }}/>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, fontFamily: MONO }}>● LIVE · 12 MIN IN</span>
                  </div>
                )}
                {c.status === 'cancelled' && (
                  <div style={{ marginTop: 8, fontSize: 9, fontWeight: 800, letterSpacing: 1, fontFamily: MONO, color:'#FF6B6B' }}>
                    ✕ {lang==='es'?'CANCELADA':'CANCELLED'}
                  </div>
                )}
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function VBEarnings({ t, lang }) {
  const [period, setPeriod] = React.useState('day');
  const todayTotal = CLIENTS.filter(c => c.status === 'done').reduce((s,c) => s + c.price, 0);
  const todayTips = CLIENTS.filter(c => c.status === 'done').reduce((s,c) => s + c.tip, 0);
  const weekServices = WEEK_EARNINGS.reduce((s,d)=> s+d.v, 0) * 1000;
  const weekTips = Math.round(weekServices * 0.11);
  const monthServices = weekServices * 4.2;
  const monthTips = Math.round(monthServices * 0.11);
  const maxBar = Math.max(...WEEK_EARNINGS.map(d => d.v));
  const done = CLIENTS.filter(c => c.status === 'done');

  const periodData = {
    day:   { total: todayTotal + todayTips, services: todayTotal, tips: todayTips, clients: done.length, delta: 18.4, label: t.todayEarnings, wow: lang==='es'?'vs AYER':'vs YDAY' },
    week:  { total: weekServices + weekTips, services: weekServices, tips: weekTips, clients: 28, delta: 12.0, label: t.thisWeek, wow: 'WoW' },
    month: { total: monthServices + monthTips, services: monthServices, tips: monthTips, clients: 118, delta: 24.6, label: lang==='es'?'Este mes':'This month', wow: 'MoM' },
  };
  const p = periodData[period];

  const MONTH_BARS = [
    { l:'W1', v: 2800 }, { l:'W2', v: 3200 }, { l:'W3', v: 2950 }, { l:'W4', v: 3440 },
  ];
  const maxMonth = Math.max(...MONTH_BARS.map(d=>d.v));

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* Period segmented control */}
      <div style={{ padding:'4px 12px 0' }}>
        <div style={{
          display:'flex', gap: 4, padding: 4, borderRadius: 10,
          background: VB.surface, border:`1px solid ${VB.border2}`,
        }}>
          {[
            {id:'day', label: lang==='es'?'DÍA':'DAY'},
            {id:'week', label: lang==='es'?'SEMANA':'WEEK'},
            {id:'month', label: lang==='es'?'MES':'MONTH'},
          ].map(f => {
            const active = period === f.id;
            return (
              <button key={f.id} onClick={() => setPeriod(f.id)} style={{
                flex: 1, padding:'8px 10px', borderRadius: 7,
                background: active ? VB.lime : 'transparent',
                color: active ? '#000' : VB.muted,
                border:'none', cursor:'pointer',
                fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: 0.8,
                transition:'all 0.2s',
              }}>{f.label}</button>
            );
          })}
        </div>
      </div>

      {/* hero tile with gradient */}
      <div style={{ padding:'10px 12px 0' }}>
        <div style={{
          borderRadius: 22, padding:'18px 18px 16px', position:'relative', overflow:'hidden',
          background:`linear-gradient(135deg, ${VB.lime} 0%, ${VB.violet} 100%)`,
          color:'#000',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, fontFamily: MONO }}>$ {p.label.toUpperCase()}</div>
            <div style={{ padding:'3px 7px', background:'#000', color: VB.lime, fontSize: 10, fontWeight: 800, borderRadius: 6, fontFamily: MONO }}>+{p.delta.toFixed(1)}%</div>
          </div>
          <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, marginTop: 8, lineHeight: 1 }}>
            {fmtCOP(p.total)}
          </div>
          <div style={{ display:'flex', gap: 16, marginTop: 14, paddingTop: 14, borderTop:'1px solid rgba(0,0,0,0.15)' }}>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.65, fontFamily: MONO, letterSpacing: 0.8 }}>SERVICES</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{fmtK(p.services)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.65, fontFamily: MONO, letterSpacing: 0.8 }}>TIPS</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{fmtK(p.tips)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.65, fontFamily: MONO, letterSpacing: 0.8 }}>CLIENTS</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>{p.clients}</div>
            </div>
          </div>
        </div>
      </div>

      {/* chart bento */}
      <div style={{ padding:'8px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
        <div style={{
          gridColumn:'1 / -1',
          background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 18, padding: 14,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.8 }}>
                {period === 'day' ? (lang==='es'?'POR HORA':'BY HOUR') : period === 'week' ? t.thisWeek.toUpperCase() : (lang==='es'?'POR SEMANA':'BY WEEK')}
              </div>
              <div style={{ fontSize: 24, color: VB.text, fontWeight: 700, letterSpacing: -0.8, marginTop: 2 }}>{fmtK(p.total)}</div>
            </div>
            <div style={{ fontSize: 10, color: VB.success, fontWeight: 700, fontFamily: MONO }}>▲ {p.delta.toFixed(0)}% {p.wow}</div>
          </div>

          {period === 'day' && (
            <div style={{ display:'flex', alignItems:'flex-end', gap: 3, height: 90 }}>
              {[ {l:'9',v:120},{l:'10',v:45},{l:'11',v:280},{l:'12',v:0},{l:'13',v:60},{l:'14',v:0},{l:'15',v:35},{l:'16',v:180},{l:'17',v:0} ].map((d,i) => {
                const active = d.v > 0;
                const h = Math.max(4, (d.v / 280) * 100);
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
                    <div style={{
                      width:'100%', height:`${h}%`,
                      background: active ? `linear-gradient(to top, ${VB.violet}, ${VB.lime})` : VB.surface3,
                      borderRadius: 4,
                      boxShadow: active && d.v >= 180 ? `0 0 10px ${VB.lime}` : 'none',
                    }}/>
                    <div style={{ fontSize: 9, fontFamily: MONO, fontWeight: 700, color: active ? VB.lime : VB.muted }}>{d.l}</div>
                  </div>
                );
              })}
            </div>
          )}
          {period === 'week' && (
            <div style={{ display:'flex', alignItems:'flex-end', gap: 4, height: 90 }}>
              {WEEK_EARNINGS.map((d, i) => {
                const isToday = i === 4;
                return (
                  <div key={i} style={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
                    <div style={{
                      width:'100%', height: `${(d.v/maxBar)*100}%`,
                      background: isToday ? `linear-gradient(to top, ${VB.violet}, ${VB.lime})` : VB.surface3,
                      borderRadius: 5, boxShadow: isToday ? `0 0 12px ${VB.lime}` : 'none',
                    }}/>
                    <div style={{ fontSize: 9, fontFamily: MONO, fontWeight: 700, color: isToday ? VB.lime : VB.muted }}>
                      {t.days[i].slice(0,1)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {period === 'month' && (
            <div style={{ display:'flex', alignItems:'flex-end', gap: 8, height: 90 }}>
              {MONTH_BARS.map((d, i) => {
                const isCur = i === MONTH_BARS.length - 1;
                return (
                  <div key={i} style={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 6 }}>
                    <div style={{
                      width:'100%', height: `${(d.v/maxMonth)*100}%`,
                      background: isCur ? `linear-gradient(to top, ${VB.violet}, ${VB.lime})` : VB.surface3,
                      borderRadius: 5, boxShadow: isCur ? `0 0 12px ${VB.lime}` : 'none',
                    }}/>
                    <div style={{ fontSize: 9, fontFamily: MONO, fontWeight: 700, color: isCur ? VB.lime : VB.muted }}>{d.l}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 18, padding: 14 }}>
          <div style={{ fontSize: 10, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.8 }}>AVG/CLIENT</div>
          <div style={{ fontSize: 20, color: VB.text, fontWeight: 700, letterSpacing: -0.5, marginTop: 4 }}>{fmtK(p.clients ? Math.round(p.total/p.clients) : 0)}</div>
          <div style={{ fontSize: 10, color: VB.muted, marginTop: 2, fontFamily: MONO }}>per visit</div>
        </div>
        <div style={{ background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 18, padding: 14 }}>
          <div style={{ fontSize: 10, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.8 }}>TOP SVC</div>
          <div style={{ fontSize: 15, color: VB.violet, fontWeight: 700, letterSpacing: -0.3, marginTop: 4 }}>Balayage</div>
          <div style={{ fontSize: 10, color: VB.muted, marginTop: 2, fontFamily: MONO }}>{period==='day'?'3':period==='week'?'12':'48'} x {fmtK(280000)}</div>
        </div>

        {/* Service breakdown */}
        <div style={{
          gridColumn:'1 / -1',
          background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 18, padding: 14,
        }}>
          <div style={{ fontSize: 10, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.8, marginBottom: 10 }}>SERVICE MIX</div>
          {[
            { label:'Balayage', pct: 42, color: VB.violet },
            { label:'Corte + color', pct: 28, color: VB.lime },
            { label:'Barba + corte', pct: 18, color: VB.pink },
            { label:'Otros', pct: 12, color: VB.cyan },
          ].map(s => (
            <div key={s.label} style={{ marginBottom: 8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: VB.text, fontWeight: 600 }}>{s.label}</span>
                <span style={{ color: VB.muted, fontFamily: MONO, fontWeight: 700 }}>{s.pct}%</span>
              </div>
              <div style={{ height: 5, background: VB.surface3, borderRadius: 999, overflow:'hidden' }}>
                <div style={{ width:`${s.pct}%`, height:'100%', background: s.color }}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VBQueueCard({ q, t, lang, cardWidth }) {
  const myIndex = q.clients.findIndex(c => c.isMe);
  const myPos = myIndex >= 0 ? myIndex : 0;
  const enrolled = q.active;

  // "Now" baseline so ETAs become real HH:MM
  const now = new Date();
  const baseMs = now.getTime();
  const fmtHM = (minsFromNow) => {
    const d = new Date(baseMs + minsFromNow * 60000);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  };
  const myTurnAt = enrolled ? fmtHM(q.eta) : null;
  const nowLabel = fmtHM(0);

  // next client AFTER me
  const remaining = enrolled ? q.clients.slice(myIndex + 1) : q.clients;

  return (
    <div style={{
      flex:`0 0 ${cardWidth}px`, width: cardWidth,
      scrollSnapAlign:'center',
      paddingRight: 6,
    }}>
      {/* Hero card */}
      <div style={{
        background: VB.surface,
        border:`1px solid ${enrolled ? q.color+'60' : VB.border2}`,
        borderRadius: 22,
        padding:'16px 16px 18px', position:'relative', overflow:'hidden',
        boxShadow: enrolled ? `0 0 0 1px ${q.color}14, 0 12px 40px rgba(0,0,0,0.5)` : 'none',
      }}>
        {/* subtle color wash top */}
        {enrolled && (
          <div style={{
            position:'absolute', inset:'0 0 auto 0', height: 120,
            background:`radial-gradient(ellipse at top, ${q.color}1f, transparent 70%)`,
            pointerEvents:'none',
          }}/>
        )}

        {/* header row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative' }}>
          <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
            <div style={{ width:8, height:8, borderRadius:999, background: q.color, animation: enrolled ? 'vbPulse 1.5s infinite' : 'none', opacity: enrolled ? 1 : 0.3 }}/>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, color: q.color, fontFamily: MONO }}>{q.label.toUpperCase()}</span>
          </div>
          <div style={{
            fontSize: 9, color: VB.muted, fontFamily: MONO, fontWeight: 700, letterSpacing: 0.6,
            padding:'3px 7px', borderRadius: 999, border:`1px solid ${VB.border2}`,
          }}>#{myPos + 1} / {q.clients.length}</div>
        </div>

        {enrolled ? (
          <>
            {/* MAIN: countdown + exact time */}
            <div style={{ marginTop: 22, position:'relative', textAlign:'center' }}>
              <div style={{ fontSize: 10, color: VB.muted, fontFamily: MONO, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>
                {q.eta === 0
                  ? (lang==='es' ? 'ES TU TURNO' : 'YOUR TURN')
                  : (lang==='es' ? 'TU TURNO A LAS' : 'YOUR TURN AT')}
              </div>
              {q.eta === 0 ? (
                <div style={{
                  fontSize: 56, fontWeight: 800, color: q.color,
                  letterSpacing: -2, lineHeight: 1, fontFamily: MONO,
                  textShadow:`0 0 30px ${q.color}55`,
                }}>AHORA</div>
              ) : (
                <>
                  <div style={{
                    fontSize: 64, fontWeight: 800, color: q.color,
                    letterSpacing: -3, lineHeight: 1, fontFamily: MONO,
                    textShadow:`0 0 30px ${q.color}55`,
                  }}>{myTurnAt}</div>
                  <div style={{
                    marginTop: 8, display:'inline-flex', alignItems:'baseline', gap: 6,
                    padding:'6px 14px', borderRadius: 999, background: q.color+'14', border:`1px solid ${q.color}40`,
                  }}>
                    <span style={{ fontSize: 11, color: VB.muted, fontFamily: MONO, letterSpacing: 0.8 }}>EN</span>
                    <span style={{ fontSize: 18, color: q.color, fontWeight: 800, fontFamily: MONO, letterSpacing: -0.3 }}>
                      {q.eta} {lang==='es'?'min':'m'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Stats row */}
            <div style={{ display:'flex', gap: 8, marginTop: 20, position:'relative' }}>
              <div style={{ flex: 1, background: VB.surface2, borderRadius: 12, padding:'10px 12px', border:`1px solid ${VB.border}` }}>
                <div style={{ fontSize: 9, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.8 }}>{lang==='es'?'AHORA':'NOW'}</div>
                <div style={{ fontSize: 15, color: VB.text, fontWeight: 700, fontFamily: MONO, marginTop: 3 }}>
                  {nowLabel}
                </div>
              </div>
              <div style={{ flex: 1, background: VB.surface2, borderRadius: 12, padding:'10px 12px', border:`1px solid ${VB.border}` }}>
                <div style={{ fontSize: 9, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.8 }}>{lang==='es'?'DESPU\u00c9S DE TI':'AFTER YOU'}</div>
                <div style={{ fontSize: 15, color: VB.text, fontWeight: 700, fontFamily: MONO, marginTop: 3 }}>
                  {remaining.length}
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div style={{ display:'flex', gap: 8, marginTop: 10, position:'relative' }}>
              <button style={{
                flex: 1, background:'transparent', border:`1px solid ${VB.border2}`, borderRadius: 12,
                padding:'10px 0', color: VB.text, fontSize: 11, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.5,
                cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap: 6,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                {lang==='es' ? 'PAUSAR' : 'PAUSE'}
              </button>
              <button style={{
                flex: 1, background: q.color, border:'none', borderRadius: 12,
                padding:'10px 0', color:'#1A1208', fontSize: 11, fontWeight: 800, fontFamily: MONO, letterSpacing: 0.5,
                cursor:'pointer',
              }}>{lang==='es' ? 'LISTA' : 'READY'}</button>
            </div>
          </>
        ) : (
          <div style={{ position:'relative', textAlign:'center', padding:'36px 8px 22px' }}>
            <div style={{ fontSize: 44, color: q.color, fontWeight: 800, letterSpacing: -2, opacity: 0.35, fontFamily: MONO }}>— —</div>
            <div style={{ fontSize: 11, color: VB.muted, fontFamily: MONO, fontWeight: 700, letterSpacing: 0.8, marginTop: 10 }}>
              {lang==='es' ? 'NO INSCRITO EN ESTE SERVICIO' : 'NOT ENROLLED'}
            </div>
            <button style={{
              marginTop: 16, background: q.color, color:'#1A1208', border:'none',
              borderRadius: 12, padding:'11px 20px', fontSize: 11, fontWeight: 800, letterSpacing: 0.8,
              fontFamily: MONO, cursor:'pointer',
            }}>+ {lang==='es' ? 'INSCRIBIRSE' : 'ENROLL'}</button>
          </div>
        )}
      </div>

      {/* Timeline inside card */}
      {enrolled && (
        <div style={{ marginTop: 16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 1 }}>
              {lang==='es' ? 'L\u00cdNEA DE TIEMPO' : 'TIMELINE'}
            </div>
            <div style={{ fontSize: 10, color: VB.muted, fontFamily: MONO, letterSpacing: 0.5 }}>
              {nowLabel} <span style={{ color: VB.dim }}>→</span> {fmtHM(q.clients[q.clients.length-1].eta + 20)}
            </div>
          </div>
          <div style={{ position:'relative', marginLeft: 44 }}>
            <div style={{ position:'absolute', left: -22, top: 18, bottom: 18, width: 2, background: VB.border2 }}/>
            {q.clients.map((cli, i) => {
              const isMe = cli.isMe;
              const isServing = cli.status === 'serving';
              const timeLbl = isServing ? nowLabel : fmtHM(cli.eta);
              return (
                <div key={cli.id} style={{ position:'relative', marginBottom: 8 }}>
                  {/* time chip on rail */}
                  <div style={{
                    position:'absolute', left: -58, top: 14,
                    fontSize: 11, fontFamily: MONO, fontWeight: 700,
                    color: isMe ? q.color : isServing ? VB.text : VB.muted,
                    letterSpacing: -0.2,
                  }}>{timeLbl}</div>
                  {/* dot */}
                  <div style={{
                    position:'absolute', left: -28, top: 18,
                    width: 12, height: 12, borderRadius: 999,
                    background: isMe ? q.color : isServing ? VB.violet : VB.surface3,
                    border:`2px solid ${VB.bg}`,
                    boxShadow: isMe ? `0 0 10px ${q.color}` : isServing ? `0 0 10px ${VB.violet}` : 'none',
                  }}/>
                  <div style={{
                    background: isMe ? q.color : VB.surface,
                    color: isMe ? '#1A1208' : VB.text,
                    border: isMe ? 'none' : `1px solid ${VB.border2}`,
                    borderRadius: 12, padding:'10px 12px',
                    display:'flex', alignItems:'center', gap: 10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: -0.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                        {isMe ? (lang==='es' ? 'TU TURNO' : 'YOUR TURN') : cli.name.replace('Tú — ', '')}
                      </div>
                      <div style={{ fontSize: 10, color: isMe ? 'rgba(26,18,8,0.65)' : VB.muted, marginTop: 2, fontFamily: MONO, letterSpacing: 0.3 }}>
                        {(isMe ? (lang==='es' ? 'estilista · tú' : 'stylist · you') : cli.service).toUpperCase()}
                      </div>
                    </div>
                    {isServing ? (
                      <div style={{
                        fontSize: 9, fontWeight: 800, color: q.color, fontFamily: MONO, letterSpacing: 1,
                        padding:'3px 6px', borderRadius: 999, background: q.color+'1a', border:`1px solid ${q.color}55`,
                      }}>● EN VIVO</div>
                    ) : (
                      <div style={{ fontSize: 11, fontWeight: 700, fontFamily: MONO, color: isMe ? '#1A1208' : VB.muted }}>
                        {cli.eta === 0 ? '·' : `+${cli.eta}m`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function VBQueue({ t, lang }) {
  const scrollRef = React.useRef(null);
  const [activeIdx, setActiveIdx] = React.useState(
    Math.max(0, QUEUES.findIndex(q => q.active))
  );

  // card width = screen inner width (~366) minus small peek so next card peeks
  const cardWidth = 330;
  const sidePad = (366 - cardWidth) / 2; // centers first card

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / cardWidth);
    if (idx !== activeIdx) setActiveIdx(Math.max(0, Math.min(QUEUES.length - 1, idx)));
  };

  const goTo = (i) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * cardWidth, behavior:'smooth' });
  };

  React.useEffect(() => {
    // start centered on current active
    const el = scrollRef.current;
    if (el) el.scrollLeft = activeIdx * cardWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* header chip row - service indicator pills */}
      <div style={{
        padding:'4px 18px 10px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ fontSize: 10, color: VB.muted, fontFamily: MONO, fontWeight: 700, letterSpacing: 0.8 }}>
          {lang==='es' ? 'DESLIZA ENTRE SERVICIOS' : 'SWIPE BETWEEN SERVICES'}
        </div>
        <div style={{ fontSize: 10, color: VB.muted, fontFamily: MONO, fontWeight: 700 }}>
          {String(activeIdx+1).padStart(2,'0')} / {String(QUEUES.length).padStart(2,'0')}
        </div>
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        style={{
          display:'flex',
          overflowX:'auto',
          scrollSnapType:'x mandatory',
          WebkitOverflowScrolling:'touch',
          scrollbarWidth:'none',
          paddingLeft: sidePad,
          paddingRight: sidePad,
          gap: 0,
        }}
      >
        {QUEUES.map((qq, i) => (
          <VBQueueCard key={qq.id} q={qq} t={t} lang={lang} cardWidth={cardWidth}/>
        ))}
      </div>

      {/* Dot indicators + service labels */}
      <div style={{ padding:'14px 18px 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 8, marginBottom: 10 }}>
          {QUEUES.map((qq, i) => {
            const active = i === activeIdx;
            return (
              <button key={qq.id} onClick={() => goTo(i)} style={{
                width: active ? 24 : 7, height: 7, borderRadius: 999,
                background: active ? qq.color : VB.surface3,
                border:'none', padding: 0, cursor:'pointer',
                transition:'all 0.25s',
                boxShadow: active && qq.active ? `0 0 8px ${qq.color}` : 'none',
              }}/>
            );
          })}
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 6, flexWrap:'wrap' }}>
          {QUEUES.map((qq, i) => {
            const active = i === activeIdx;
            const enrolled = qq.active;
            const myI = qq.clients.findIndex(c => c.isMe);
            return (
              <button key={qq.id} onClick={() => goTo(i)} style={{
                background: active ? qq.color : VB.surface,
                color: active ? '#000' : enrolled ? VB.text : VB.muted,
                border: active ? 'none' : `1px solid ${VB.border2}`,
                borderRadius: 8, padding:'6px 10px',
                fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                cursor:'pointer', display:'flex', alignItems:'center', gap: 5,
                opacity: enrolled || active ? 1 : 0.55,
              }}>
                {qq.label.toUpperCase()}
                {enrolled && (
                  <span style={{
                    fontSize: 9, fontWeight: 800,
                    padding:'1px 4px', borderRadius: 3,
                    background: active ? 'rgba(0,0,0,0.15)' : VB.surface3,
                  }}>#{myI + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function VBClients({ t, lang }) {
  const [filter, setFilter] = React.useState('all');
  const filtered = filter === 'all' ? CLIENTS :
    filter === 'done' ? CLIENTS.filter(c => c.status === 'done') :
    CLIENTS.filter(c => c.status !== 'done');

  return (
    <div style={{ paddingBottom: 110 }}>
      {/* search */}
      <div style={{ padding:'4px 12px 0' }}>
        <div style={{
          display:'flex', alignItems:'center', gap: 10,
          background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 14,
          padding:'10px 14px',
        }}>
          {Icon.search(VB.muted, 16)}
          <input placeholder={t.searchClients} style={{
            flex: 1, background:'transparent', border:'none', outline:'none',
            color: VB.text, fontSize: 13, fontFamily:'inherit',
          }}/>
          <div style={{ fontSize: 10, color: VB.muted, fontFamily: MONO, padding:'2px 6px', background: VB.surface3, borderRadius: 4 }}>⌘K</div>
        </div>
      </div>

      {/* segmented */}
      <div style={{ padding:'10px 12px 0' }}>
        <div style={{ display:'flex', background: VB.surface, borderRadius: 12, padding: 4, border:`1px solid ${VB.border2}` }}>
          {[
            {id:'all', label: lang==='es'?'Todos':'All', n: CLIENTS.length},
            {id:'done', label: t.servedToday, n: CLIENTS.filter(c=>c.status==='done').length},
            {id:'upcoming', label: t.upcoming, n: CLIENTS.filter(c=>c.status!=='done').length},
          ].map(f => {
            const active = filter === f.id;
            return (
              <button key={f.id} onClick={() => setFilter(f.id)} style={{
                flex: 1, padding:'8px 0', borderRadius: 9,
                background: active ? VB.lime : 'transparent',
                color: active ? '#000' : VB.muted,
                border:'none', fontSize: 11, fontWeight: 700, cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap: 5,
              }}>
                {f.label}
                <span style={{ fontSize: 9, padding:'1px 5px', borderRadius: 4, fontFamily: MONO, background: active ? 'rgba(0,0,0,0.15)' : VB.surface3 }}>{f.n}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* cards */}
      <div style={{ padding:'12px 12px 0', display:'flex', flexDirection:'column', gap: 8 }}>
        {filtered.map(c => (
          <div key={c.id} style={{
            background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 16,
            padding: 12, display:'flex', gap: 12,
          }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12,
              background:`linear-gradient(135deg, ${c.color}, ${c.color}88)`,
              color:'#000', fontSize: 13, fontWeight: 800,
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink: 0,
            }}>{c.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6, flexWrap:'wrap' }}>
                <span style={{ fontSize: 13, color: VB.text, fontWeight: 700, letterSpacing: -0.2 }}>{c.name}</span>
                <span style={{
                  padding:'1px 6px', borderRadius: 4,
                  background: c.tag === 'loyal' ? VB.limeDim : VB.violetDim,
                  color: c.tag === 'loyal' ? VB.lime : VB.violet,
                  fontSize: 8, fontWeight: 800, letterSpacing: 0.5, fontFamily: MONO,
                }}>{(c.tag==='loyal'?t.loyal:t.new).toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 11, color: VB.muted, marginTop: 2, fontFamily: MONO }}>{c.service.toUpperCase()}</div>
              <div style={{ display:'flex', alignItems:'center', gap: 10, marginTop: 6 }}>
                <div style={{ display:'flex', gap: 1 }}>
                  {[1,2,3,4,5].map(i => Icon.star(i <= c.rating ? VB.lime : VB.border2, i <= c.rating, 10))}
                </div>
                <span style={{ fontSize: 10, color: VB.muted, fontFamily: MONO }}>{c.visits}×</span>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize: 14, color: VB.text, fontWeight: 700, fontFamily: MONO, letterSpacing: -0.3 }}>{fmtK(c.price)}</div>
              {c.status === 'serving' && <div style={{ fontSize: 9, color: VB.lime, fontWeight: 800, marginTop: 4, fontFamily: MONO }}>● LIVE</div>}
              {c.status === 'done' && <div style={{ fontSize: 9, color: VB.success, fontWeight: 800, marginTop: 4, fontFamily: MONO }}>✓ DONE</div>}
              {c.status === 'upcoming' && <div style={{ fontSize: 9, color: VB.muted, fontWeight: 700, marginTop: 4, fontFamily: MONO }}>{c.time}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VBProfile({ t, lang }) {
  return (
    <div style={{ paddingBottom: 110 }}>
      <div style={{ padding:'4px 12px 0' }}>
        {/* identity card */}
        <div style={{
          background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 22, padding: 18,
          position:'relative', overflow:'hidden',
        }}>
          <div style={{
            position:'absolute', inset: 0,
            background:`radial-gradient(circle at top right, ${VB.violetDim}, transparent 60%)`,
          }}/>
          <div style={{ position:'relative', display:'flex', gap: 14, alignItems:'center' }}>
            <div style={{
              width: 72, height: 72, borderRadius: 18,
              background:`linear-gradient(135deg, ${VB.lime}, ${VB.violet})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize: 28, fontWeight: 800, color:'#000',
            }}>CH</div>
            <div>
              <div style={{ fontSize: 18, color: VB.text, fontWeight: 800, letterSpacing: -0.3 }}>Camila Herrera</div>
              <div style={{ fontSize: 11, color: VB.muted, fontFamily: MONO, marginTop: 2 }}>@camila.cuts · {t.stylist.toUpperCase()}</div>
              <div style={{ display:'flex', gap: 6, marginTop: 6 }}>
                <span style={{ padding:'2px 8px', background: VB.limeDim, color: VB.lime, borderRadius: 999, fontSize: 9, fontWeight: 800, fontFamily: MONO, letterSpacing: 0.5 }}>PLATINUM ✦</span>
                <span style={{ padding:'2px 8px', background: VB.violetDim, color: VB.violet, borderRadius: 999, fontSize: 9, fontWeight: 800, fontFamily: MONO, letterSpacing: 0.5 }}>PRO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* stats grid */}
      <div style={{ padding:'8px 12px 0', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8 }}>
        {[
          { label:'MONTH', val:'$8.4M', c: VB.lime },
          { label:'RATING', val:'4.9★', c: VB.violet },
          { label:'CLIENTS', val:'142', c: VB.pink },
        ].map(s => (
          <div key={s.label} style={{ background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 16, padding: 12 }}>
            <div style={{ fontSize: 9, color: VB.muted, fontWeight: 700, fontFamily: MONO, letterSpacing: 0.8 }}>{s.label}</div>
            <div style={{ fontSize: 18, color: s.c, fontWeight: 800, letterSpacing: -0.4, marginTop: 4, fontFamily: MONO }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* menu */}
      <div style={{ padding:'8px 12px 0' }}>
        <div style={{ background: VB.surface, border:`1px solid ${VB.border2}`, borderRadius: 16, overflow:'hidden' }}>
          {[
            { label: t.settings, icon:'⚙' },
            { label: lang==='es'?'Disponibilidad':'Availability', icon:'◷' },
            { label: lang==='es'?'Servicios':'Services', icon:'✂' },
            { label: t.help, icon:'?' },
          ].map((item, i, arr) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', padding:'12px 14px',
              borderBottom: i < arr.length - 1 ? `1px solid ${VB.border}` : 'none',
              cursor:'pointer',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: VB.surface3,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: 14, color: VB.lime, marginRight: 12, fontFamily: MONO,
              }}>{item.icon}</div>
              <div style={{ flex: 1, fontSize: 13, color: VB.text, fontWeight: 600 }}>{item.label}</div>
              <div style={{ color: VB.dim }}>→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { VBSchedule, VBEarnings, VBQueue, VBClients, VBProfile, MONO });
