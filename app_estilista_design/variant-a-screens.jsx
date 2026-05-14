// Variant A — remaining screens: Schedule, Earnings, Queue, Clients, Profile

// ── SCHEDULE ───────────────────────────────────────────────
function VASchedule({ t, lang }) {
  const [day, setDay] = React.useState(2);
  const days = t.days;
  const dates = [17, 18, 19, 20, 21, 22, 23];
  const appts = useAppts();
  const [editing, setEditing] = React.useState(null);

  return (
    <div style={{ paddingBottom: 120 }}>
      {editing && <ApptModal appt={editing} onClose={() => setEditing(null)} t={t} lang={lang} theme={VA}/>}

      {/* Day strip */}
      <div style={{ padding:'8px 20px 0' }}>
        <div style={{ display:'flex', gap: 8, overflowX:'auto' }}>
          {days.map((d, i) => {
            const active = i === day;
            return (
              <button key={i} onClick={() => setDay(i)} style={{
                flex:'0 0 auto', width: 52, padding:'10px 0',
                borderRadius: 16, border:`1px solid ${active ? VA.lime : VA.border}`,
                background: active ? VA.lime : VA.surface, color: active ? '#000' : VA.text,
                cursor:'pointer',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, opacity: active ? 0.7 : 0.5 }}>{d.toUpperCase()}</div>
                <div style={{
                  fontFamily:'"Instrument Serif", Georgia, serif',
                  fontSize: 22, fontWeight: 400, marginTop: 2, letterSpacing: -0.5,
                }}>{dates[i]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Day header */}
      <div style={{ padding:'24px 20px 12px', display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
        <div>
          <div style={{
            fontFamily:'"Instrument Serif", Georgia, serif',
            fontSize: 34, color: VA.text, fontWeight: 400, letterSpacing: -0.8, lineHeight: 1,
          }}>{t.today}</div>
          <div style={{ fontSize: 13, color: VA.muted, marginTop: 4 }}>{appts.length} {t.todayCount}</div>
        </div>
        <button onClick={() => setEditing({ _new: true })} style={{
          background: VA.lime, color:'#000', border:'none', borderRadius: 999,
          padding:'10px 14px', fontSize: 12, fontWeight: 700, letterSpacing: 0.3, cursor:'pointer',
          display:'flex', alignItems:'center', gap: 6,
        }}>
          {Icon.plus('#000', 14)} {t.addAppt}
        </button>
      </div>

      {/* Empty state */}
      {appts.length === 0 && (
        <div style={{ padding:'40px 20px', textAlign:'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.3 }}>◔</div>
          <div style={{ fontSize: 14, color: VA.muted, marginBottom: 14 }}>
            {lang==='es'?'No hay citas. Empieza creando una.':'No bookings yet. Create one.'}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div style={{ padding:'8px 20px 0' }}>
        {appts.map((c) => (
          <div key={c.id} style={{ display:'flex', gap: 14, marginBottom: 12 }}>
            <div style={{ width: 56, flexShrink: 0, paddingTop: 14 }}>
              <div style={{
                fontFamily:'"Instrument Serif", Georgia, serif',
                fontSize: 18, color: VA.text, fontWeight: 400,
                textDecoration: c.status === 'cancelled' ? 'line-through' : 'none',
                opacity: c.status === 'cancelled' ? 0.4 : 1,
              }}>{c.time}</div>
              <div style={{ fontSize: 11, color: VA.muted, marginTop: 2 }}>45 min</div>
            </div>
            <button onClick={() => setEditing(c)} style={{
              flex: 1, minWidth: 0, textAlign:'left', padding: 0, border:'none',
              background:'transparent', cursor:'pointer',
            }}>
              <div style={{
                background: c.status === 'serving' ? VA.lime : c.status === 'cancelled' ? 'transparent' : VA.surface,
                color: c.status === 'serving' ? '#000' : VA.text,
                border: c.status === 'serving' ? 'none' : `1px solid ${c.status === 'cancelled' ? 'rgba(255,107,107,0.3)' : VA.border}`,
                borderRadius: 20, padding: 16, position:'relative', overflow:'hidden',
                opacity: c.status === 'cancelled' ? 0.5 : 1,
              }}>
                {c.status === 'serving' && (
                  <div style={{ position:'absolute', top:14, right:14, display:'flex', alignItems:'center', gap: 5 }}>
                    <div style={{ width:6, height:6, borderRadius:999, background:'#000', animation:'vaBlink 1.2s infinite' }}/>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8 }}>{t.liveNow}</span>
                  </div>
                )}
                {c.status === 'cancelled' && (
                  <div style={{ position:'absolute', top:14, right:14,
                    padding:'3px 8px', borderRadius: 999, background:'rgba(255,107,107,0.15)',
                    color:'#FF6B6B', fontSize: 9, fontWeight: 800, letterSpacing: 0.8,
                  }}>{lang==='es'?'CANCELADA':'CANCELLED'}</div>
                )}
                <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: c.status === 'serving' ? '#000' : VA.surface2,
                    color: c.status === 'serving' ? VA.lime : VA.text,
                    fontSize: 12, fontWeight: 600,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    border: c.status === 'serving' ? 'none' : `1px solid ${VA.border}`,
                  }}>{c.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2, textDecoration: c.status === 'cancelled' ? 'line-through' : 'none' }}>{c.name}</div>
                  </div>
                  <div style={{
                    width: 22, height: 22, borderRadius: 7,
                    background: c.status === 'serving' ? 'rgba(0,0,0,0.08)' : VA.surface2,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize: 13, color: c.status === 'serving' ? '#000' : VA.muted, fontWeight: 700,
                  }}>✎</div>
                </div>
                <div style={{ fontSize: 13, color: c.status === 'serving' ? 'rgba(0,0,0,0.7)' : VA.muted, marginBottom: 10 }}>
                  {c.service}
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{
                    fontFamily:'"Instrument Serif", Georgia, serif',
                    fontSize: 20, fontWeight: 400, letterSpacing: -0.4,
                  }}>{fmtCOP(c.price)}</div>
                  {c.status === 'done' && (
                    <div style={{ display:'flex', alignItems:'center', gap: 4, fontSize: 11, color: VA.muted }}>
                      {Icon.check(VA.success, 14)} <span>done</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EARNINGS ───────────────────────────────────────────────
function VAEarnings({ t, lang }) {
  const [period, setPeriod] = React.useState('day');
  const todayTotal = CLIENTS.filter(c => c.status === 'done').reduce((s,c) => s + c.price, 0);
  const todayTips = CLIENTS.filter(c => c.status === 'done').reduce((s,c) => s + c.tip, 0);
  const done = CLIENTS.filter(c => c.status === 'done');
  const weekServices = WEEK_EARNINGS.reduce((s,d)=> s+d.v, 0) * 1000;
  const weekTips = Math.round(weekServices * 0.11);
  const monthServices = weekServices * 4.2;
  const monthTips = Math.round(monthServices * 0.11);
  const maxBar = Math.max(...WEEK_EARNINGS.map(d => d.v));

  // Period data
  const periodData = {
    day:   { total: todayTotal + todayTips, services: todayTotal, tips: todayTips, clients: done.length, delta: 18.4, label: t.todayEarnings, sub: lang==='es'?'vs. ayer':'vs. yesterday' },
    week:  { total: weekServices + weekTips,  services: weekServices, tips: weekTips, clients: 28, delta: 12.0, label: t.thisWeek, sub: lang==='es'?'vs. semana pasada':'vs. last week' },
    month: { total: monthServices + monthTips, services: monthServices, tips: monthTips, clients: 118, delta: 24.6, label: lang==='es'?'Este mes':'This month', sub: lang==='es'?'vs. mes pasado':'vs. last month' },
  };
  const p = periodData[period];
  const avg = p.clients ? Math.round(p.total / p.clients) : 0;

  // Monthly bars (4 weeks)
  const MONTH_BARS = [
    { l: lang==='es'?'S1':'W1', v: 2800 },
    { l: lang==='es'?'S2':'W2', v: 3200 },
    { l: lang==='es'?'S3':'W3', v: 2950 },
    { l: lang==='es'?'S4':'W4', v: 3440 },
  ];
  const maxMonth = Math.max(...MONTH_BARS.map(d=>d.v));

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Period filter */}
      <div style={{ padding:'8px 20px 0' }}>
        <div style={{
          display:'flex', gap: 4, padding: 4, borderRadius: 999,
          background: VA.surface, border:`1px solid ${VA.border}`,
        }}>
          {[
            {id:'day', label: lang==='es'?'Día':'Day'},
            {id:'week', label: lang==='es'?'Semana':'Week'},
            {id:'month', label: lang==='es'?'Mes':'Month'},
          ].map(f => {
            const active = period === f.id;
            return (
              <button key={f.id} onClick={() => setPeriod(f.id)} style={{
                flex: 1, padding:'9px 10px', borderRadius: 999,
                background: active ? VA.lime : 'transparent',
                color: active ? '#000' : VA.muted,
                border:'none', cursor:'pointer',
                fontSize: 12, fontWeight: 700, letterSpacing: -0.1,
                transition:'all 0.2s',
              }}>{f.label}</button>
            );
          })}
        </div>
      </div>

      {/* Hero number */}
      <div style={{ padding:'16px 24px 0' }}>
        <div style={{ fontSize: 12, color: VA.muted, fontWeight: 600, letterSpacing: 1.5 }}>{p.label.toUpperCase()}</div>
        <div style={{
          fontFamily:'"Instrument Serif", Georgia, serif',
          fontSize: 72, color: VA.text, fontWeight: 400, letterSpacing: -2.5,
          lineHeight: 0.95, marginTop: 8,
        }}>{fmtCOP(p.total)}</div>
        <div style={{ display:'flex', alignItems:'center', gap: 8, marginTop: 8 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap: 4,
            padding:'4px 10px', borderRadius: 999,
            background:'rgba(74,222,128,0.12)', color: VA.success,
            fontSize: 12, fontWeight: 700,
          }}>
            {Icon.arrowUp(VA.success, 11)} {p.delta.toFixed(1)}%
          </div>
          <span style={{ fontSize: 12, color: VA.muted }}>{p.sub}</span>
        </div>
      </div>

      {/* Chart — switches with period */}
      <div style={{ padding:'24px 20px 0' }}>
        <div style={{
          background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 24, padding: 20,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 12, color: VA.muted, fontWeight: 600, letterSpacing: 0.5 }}>
                {period === 'day' ? (lang==='es'?'POR HORA':'BY HOUR') : period === 'week' ? t.thisWeek.toUpperCase() : (lang==='es'?'POR SEMANA':'BY WEEK')}
              </div>
              <div style={{
                fontFamily:'"Instrument Serif", Georgia, serif',
                fontSize: 28, color: VA.text, fontWeight: 400, letterSpacing: -0.6, marginTop: 4,
              }}>{fmtK(p.total)}</div>
            </div>
            <div style={{
              display:'flex', alignItems:'center', gap: 4,
              padding:'5px 10px', borderRadius: 999, background:'rgba(74,222,128,0.12)', color: VA.success,
              fontSize: 11, fontWeight: 700,
            }}>{Icon.arrowUp(VA.success, 10)} {p.delta.toFixed(0)}%</div>
          </div>

          {/* Bars — vary by period */}
          {period === 'day' && (
            <div style={{ display:'flex', alignItems:'flex-end', gap: 4, height: 120 }}>
              {[ {l:'9',v:120}, {l:'10',v:45}, {l:'11',v:280}, {l:'12',v:0}, {l:'13',v:60}, {l:'14',v:0}, {l:'15',v:35}, {l:'16',v:180}, {l:'17',v:0} ].map((d,i) => {
                const h = Math.max(4, (d.v / 280) * 100);
                const active = d.v > 0;
                return (
                  <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
                    <div style={{
                      width:'100%', height:`${h}%`,
                      background: active ? VA.lime : 'rgba(255,255,255,0.06)',
                      borderRadius: 6,
                      boxShadow: active && d.v >= 180 ? '0 0 14px rgba(198,255,61,0.3)' : 'none',
                    }}/>
                    <div style={{ fontSize: 9, color: VA.muted }}>{d.l}</div>
                  </div>
                );
              })}
            </div>
          )}
          {period === 'week' && (
            <div style={{ display:'flex', alignItems:'flex-end', gap: 6, height: 120 }}>
              {WEEK_EARNINGS.map((d, i) => {
                const isToday = i === 4;
                const h = (d.v / maxBar) * 100;
                return (
                  <div key={i} style={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 8 }}>
                    <div style={{
                      width: '100%', height: `${h}%`,
                      background: isToday ? VA.lime : 'rgba(255,255,255,0.08)',
                      borderRadius: 8, position:'relative',
                      boxShadow: isToday ? '0 0 20px rgba(198,255,61,0.3)' : 'none',
                    }}>
                      {isToday && (
                        <div style={{
                          position:'absolute', top: -24, left:'50%', transform:'translateX(-50%)',
                          fontSize: 10, fontWeight: 700, color: VA.lime, whiteSpace:'nowrap',
                        }}>{fmtK(d.v * 1000)}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: isToday ? VA.text : VA.muted, fontWeight: isToday ? 700 : 500 }}>
                      {t.days[i].slice(0,1)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {period === 'month' && (
            <div style={{ display:'flex', alignItems:'flex-end', gap: 10, height: 120 }}>
              {MONTH_BARS.map((d, i) => {
                const isCurrent = i === MONTH_BARS.length - 1;
                const h = (d.v / maxMonth) * 100;
                return (
                  <div key={i} style={{ flex: 1, display:'flex', flexDirection:'column', alignItems:'center', gap: 8 }}>
                    <div style={{
                      width: '100%', height: `${h}%`,
                      background: isCurrent ? VA.lime : 'rgba(255,255,255,0.08)',
                      borderRadius: 8, position:'relative',
                      boxShadow: isCurrent ? '0 0 20px rgba(198,255,61,0.3)' : 'none',
                    }}>
                      {isCurrent && (
                        <div style={{
                          position:'absolute', top: -24, left:'50%', transform:'translateX(-50%)',
                          fontSize: 10, fontWeight: 700, color: VA.lime, whiteSpace:'nowrap',
                        }}>{fmtK(d.v * 1000)}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: isCurrent ? VA.text : VA.muted, fontWeight: isCurrent ? 700 : 500 }}>
                      {d.l}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ padding:'16px 20px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
        <div style={{ background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 20, padding: 16 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 10 }}>
            {Icon.scissors(VA.muted, 16)}
            <span style={{ fontSize: 11, color: VA.muted, fontWeight: 600, letterSpacing: 0.5 }}>{t.services.toUpperCase()}</span>
          </div>
          <div style={{ fontFamily:'"Instrument Serif", Georgia, serif', fontSize: 26, color: VA.text, letterSpacing: -0.5 }}>
            {fmtK(p.services)}
          </div>
        </div>
        <div style={{ background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 20, padding: 16 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 6, marginBottom: 10 }}>
            {Icon.spark(VA.lime, 14)}
            <span style={{ fontSize: 11, color: VA.muted, fontWeight: 600, letterSpacing: 0.5 }}>{t.tips.toUpperCase()}</span>
          </div>
          <div style={{ fontFamily:'"Instrument Serif", Georgia, serif', fontSize: 26, color: VA.text, letterSpacing: -0.5 }}>
            {fmtK(p.tips)}
          </div>
        </div>
        <div style={{ background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 20, padding: 16 }}>
          <div style={{ fontSize: 11, color: VA.muted, fontWeight: 600, letterSpacing: 0.5, marginBottom: 10 }}>{t.avgPerClient.toUpperCase()}</div>
          <div style={{ fontFamily:'"Instrument Serif", Georgia, serif', fontSize: 26, color: VA.text, letterSpacing: -0.5 }}>
            {fmtK(avg)}
          </div>
        </div>
        <div style={{ background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 20, padding: 16 }}>
          <div style={{ fontSize: 11, color: VA.muted, fontWeight: 600, letterSpacing: 0.5, marginBottom: 10 }}>{t.clientsServed.toUpperCase()}</div>
          <div style={{ fontFamily:'"Instrument Serif", Georgia, serif', fontSize: 26, color: VA.text, letterSpacing: -0.5 }}>
            {p.clients}
          </div>
          <div style={{ fontSize: 11, color: VA.muted, marginTop: 2 }}>
            {period === 'day' ? (lang==='es'?'hoy':'today') : period === 'week' ? (lang==='es'?'esta semana':'this week') : (lang==='es'?'este mes':'this month')}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── QUEUE / Fichero digital ─────────────────────────────────
function VAQueue({ t, lang }) {
  const [activeId, setActiveId] = React.useState('cut');
  const activeQueues = QUEUES.filter(q => q.active);
  const q = QUEUES.find(x => x.id === activeId) || QUEUES[0];
  const myIndex = q.clients.findIndex(c => c.isMe);
  const myPos = myIndex >= 0 ? myIndex : null;
  const myEta = q.eta;
  const nextClient = q.clients.find(c => c.status === 'next') || q.clients.find(c => !c.isMe && c.status === 'waiting');

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Service tabs */}
      <div style={{ padding:'10px 20px 0', display:'flex', gap: 8, overflowX:'auto', scrollbarWidth:'none' }}>
        {QUEUES.map(qq => {
          const active = qq.id === activeId;
          const enrolled = qq.active;
          return (
            <button key={qq.id} onClick={() => setActiveId(qq.id)} style={{
              flexShrink: 0, padding:'10px 14px', borderRadius: 999,
              background: active ? qq.color : VA.surface,
              color: active ? '#000' : enrolled ? VA.text : VA.muted,
              border: active ? 'none' : `1px solid ${VA.border}`,
              fontSize: 12, fontWeight: 700, cursor:'pointer',
              display:'flex', alignItems:'center', gap: 7, letterSpacing: -0.1,
              opacity: enrolled || active ? 1 : 0.6,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: 999,
                background: active ? '#000' : enrolled ? qq.color : VA.muted,
                boxShadow: enrolled && !active ? `0 0 6px ${qq.color}` : 'none',
              }}/>
              {qq.label}
              {enrolled && (
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  padding:'1px 6px', borderRadius: 999,
                  background: active ? 'rgba(0,0,0,0.12)' : VA.surface2,
                  color: active ? '#000' : VA.muted,
                  fontFamily:'"Instrument Serif", Georgia, serif',
                }}>{qq.active ? `#${(QUEUES.find(k=>k.id===qq.id).clients.findIndex(c=>c.isMe))+1}` : '—'}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Position hero */}
      <div style={{ padding:'14px 20px 0' }}>
        <div style={{
          background:'#000', border:`1px solid ${VA.border2}`, borderRadius: 28,
          padding:'28px 22px 24px', position:'relative', overflow:'hidden',
          transition:'all 0.3s',
        }}>
          {/* Radial pulse */}
          <div style={{
            position:'absolute', top:'50%', right:-80, transform:'translateY(-50%)',
            width: 280, height: 280, borderRadius:'50%',
            background: `radial-gradient(circle, ${q.color}22 0%, transparent 70%)`,
          }}/>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize: 11, color: q.color, fontWeight: 700, letterSpacing: 1.5 }}>
              {q.label.toUpperCase()} · {t.positionInQueue.toUpperCase()}
            </div>
            <div style={{
              fontSize: 10, color: VA.muted, fontWeight: 700, letterSpacing: 1,
              padding:'3px 8px', borderRadius: 999, border:`1px solid ${VA.border}`,
            }}>{q.clients.filter(c => !c.isMe).length} {lang==='es'?'en cola':'in queue'}</div>
          </div>

          {myPos === 0 && (
            <div style={{
              marginTop: 18, padding:'16px 18px', borderRadius: 18,
              background: q.color, color:'#000',
              display:'flex', alignItems:'center', gap: 12,
            }}>
              <div style={{
                fontFamily:'"Instrument Serif", Georgia, serif',
                fontSize: 56, lineHeight: 0.85, fontWeight: 400, letterSpacing: -2,
              }}>¡</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
                  {lang==='es' ? '¡Eres el siguiente!' : "You're up next!"}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.7, marginTop: 2 }}>
                  {lang==='es' ? 'Prepárate, tu cliente te espera' : 'Get ready, your client is waiting'}
                </div>
              </div>
            </div>
          )}

          {myPos !== 0 && (
            <div style={{ display:'flex', alignItems:'flex-end', gap: 12, marginTop: 14 }}>
              <div style={{
                fontFamily:'"Instrument Serif", Georgia, serif',
                fontSize: 120, lineHeight: 0.85, color: q.color, fontWeight: 400, letterSpacing: -5,
              }}>{(myPos ?? 0) + 1}</div>
              <div style={{ paddingBottom: 16 }}>
                <div style={{ fontSize: 40, color: VA.muted, fontFamily:'"Instrument Serif", Georgia, serif' }}>/</div>
              </div>
              <div style={{ paddingBottom: 16 }}>
                <div style={{
                  fontFamily:'"Instrument Serif", Georgia, serif',
                  fontSize: 56, color: VA.muted, fontWeight: 400, letterSpacing: -2,
                }}>{q.clients.length}</div>
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap: 24, marginTop: 20, paddingTop: 20, borderTop:`1px solid ${VA.border}` }}>
            <div>
              <div style={{ fontSize: 10, color: VA.muted, fontWeight: 600, letterSpacing: 0.8 }}>{t.estimatedWait.toUpperCase()}</div>
              <div style={{
                fontFamily:'"Instrument Serif", Georgia, serif', fontSize: 28, color: VA.text,
                fontWeight: 400, letterSpacing: -0.6, marginTop: 4,
              }}>{myEta === 0 ? (lang==='es'?'ahora':'now') : `~${myEta}`} {myEta !== 0 && <span style={{ fontSize: 15, color: VA.muted }}>{t.min}</span>}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: VA.muted, fontWeight: 600, letterSpacing: 0.8 }}>{(lang==='es'?'Siguiente cliente':'Next client').toUpperCase()}</div>
              <div style={{ fontSize: 15, color: VA.text, fontWeight: 600, marginTop: 8 }}>
                {nextClient ? nextClient.name : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Queue list */}
      <div style={{ padding:'24px 20px 0' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: VA.muted, fontWeight: 700, letterSpacing: 1 }}>
            {t.queueTitle.toUpperCase()} · {q.label.toUpperCase()}
          </div>
          <div style={{ fontSize: 10, color: q.color, fontWeight: 700, letterSpacing: 1 }}>● LIVE</div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap: 10 }}>
          {q.clients.map((cli, i) => {
            const isMe = cli.isMe;
            const isServing = cli.status === 'serving';
            return (
              <div key={cli.id} style={{
                background: isMe ? q.color : VA.surface,
                color: isMe ? '#000' : VA.text,
                border: isMe ? 'none' : isServing ? `1px solid ${VA.border2}` : `1px solid ${VA.border}`,
                borderRadius: 20, padding: 14, display:'flex', alignItems:'center', gap: 14,
                position:'relative',
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: isMe ? '#000' : isServing ? `${q.color}22` : VA.surface2,
                  color: isMe ? q.color : isServing ? q.color : VA.muted,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'"Instrument Serif", Georgia, serif',
                  fontSize: 22, fontWeight: 400,
                  flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: -0.2 }}>
                    {isMe ? (t.youAre + ' · ') : ''}{cli.name.replace('Tú — ', '')}
                  </div>
                  <div style={{ fontSize: 12, color: isMe ? 'rgba(0,0,0,0.6)' : VA.muted, marginTop: 2 }}>
                    {isMe ? (lang==='es' ? 'Tu turno' : 'Your turn') : cli.service}
                  </div>
                </div>
                {isServing && (
                  <div style={{ display:'flex', alignItems:'center', gap: 5 }}>
                    <div style={{ width:8, height:8, borderRadius:999, background: q.color, boxShadow:`0 0 8px ${q.color}`, animation:'vaBlink 1.2s infinite' }}/>
                    <span style={{ fontSize: 10, fontWeight: 700, color: q.color, letterSpacing: 0.8 }}>{t.liveNow}</span>
                  </div>
                )}
                {!isServing && (
                  <div style={{
                    fontSize: 12, fontWeight: 600,
                    color: isMe ? '#000' : VA.muted,
                    fontFamily:'"Instrument Serif", Georgia, serif',
                  }}>
                    <span style={{ fontSize: 18, letterSpacing: -0.3 }}>~{cli.eta}</span> {t.min}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CLIENTS ────────────────────────────────────────────────
function VAClients({ t, lang, onToggleStatus }) {
  const [filter, setFilter] = React.useState('all');
  const filtered = filter === 'all' ? CLIENTS :
    filter === 'done' ? CLIENTS.filter(c => c.status === 'done') :
    CLIENTS.filter(c => c.status !== 'done');

  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Search */}
      <div style={{ padding:'8px 20px 0' }}>
        <div style={{
          display:'flex', alignItems:'center', gap: 10,
          background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 999,
          padding:'10px 16px',
        }}>
          {Icon.search(VA.muted, 16)}
          <input placeholder={t.searchClients} style={{
            flex: 1, background:'transparent', border:'none', outline:'none',
            color: VA.text, fontSize: 14, fontFamily:'inherit',
          }}/>
        </div>
      </div>

      {/* Filter pills */}
      <div style={{ padding:'14px 20px 0', display:'flex', gap: 8 }}>
        {[
          {id:'all', label: lang==='es'?'Todos':'All', n: CLIENTS.length},
          {id:'done', label: t.servedToday, n: CLIENTS.filter(c=>c.status==='done').length},
          {id:'upcoming', label: t.upcoming, n: CLIENTS.filter(c=>c.status!=='done').length},
        ].map(f => {
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding:'8px 14px', borderRadius: 999,
              background: active ? VA.text : 'transparent',
              color: active ? '#000' : VA.muted,
              border: active ? 'none' : `1px solid ${VA.border}`,
              fontSize: 12, fontWeight: 600, cursor:'pointer',
              display:'flex', alignItems:'center', gap: 6,
            }}>
              {f.label}
              <span style={{
                fontSize: 10, padding:'1px 6px', borderRadius: 999,
                background: active ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)',
              }}>{f.n}</span>
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ padding:'16px 20px 0', display:'flex', flexDirection:'column', gap: 10 }}>
        {filtered.map(c => (
          <div key={c.id} style={{
            background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 20, padding: 14,
            display:'flex', alignItems:'center', gap: 14,
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, ${c.color}, ${c.color}99)`,
              color:'#000', fontWeight: 700, fontSize: 15,
              display:'flex', alignItems:'center', justifyContent:'center',
              flexShrink: 0,
            }}>{c.initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                <div style={{ fontSize: 14, color: VA.text, fontWeight: 600, letterSpacing: -0.2 }}>{c.name}</div>
                {c.tag === 'loyal' && <div style={{ padding:'2px 6px', borderRadius: 999, background: VA.limeDim, color: VA.lime, fontSize: 9, fontWeight: 700, letterSpacing: 0.3 }}>{t.loyal.toUpperCase()}</div>}
              </div>
              <div style={{ fontSize: 12, color: VA.muted, marginTop: 2 }}>{c.service}</div>
              <div style={{ display:'flex', alignItems:'center', gap: 10, marginTop: 6 }}>
                <div style={{ display:'flex', gap: 1 }}>
                  {[1,2,3,4,5].map(i => Icon.star(i <= c.rating ? VA.lime : VA.border2, i <= c.rating, 11))}
                </div>
                <span style={{ fontSize: 11, color: VA.muted }}>{c.visits} {t.totalVisits}</span>
              </div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{
                fontFamily:'"Instrument Serif", Georgia, serif',
                fontSize: 18, color: VA.text, fontWeight: 400, letterSpacing: -0.3,
              }}>{fmtK(c.price)}</div>
              {c.status === 'done' ? (
                <div style={{
                  display:'inline-flex', alignItems:'center', gap: 3, marginTop: 4,
                  fontSize: 10, color: VA.success, fontWeight: 600,
                }}>{Icon.check(VA.success, 11)} done</div>
              ) : c.status === 'serving' ? (
                <div style={{ fontSize: 10, color: VA.lime, fontWeight: 700, marginTop: 4, letterSpacing: 0.8 }}>LIVE</div>
              ) : (
                <div style={{ fontSize: 10, color: VA.muted, marginTop: 4 }}>{c.time}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PROFILE ────────────────────────────────────────────────
function VAProfile({ t, lang }) {
  const monthTotal = 8450000;
  return (
    <div style={{ paddingBottom: 120 }}>
      {/* Avatar + name */}
      <div style={{ padding:'0 20px', textAlign:'center', marginTop: 8 }}>
        <div style={{
          width: 96, height: 96, borderRadius:'50%',
          background:`linear-gradient(135deg, ${VA.lime}, #A8E82A)`,
          margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'"Instrument Serif", Georgia, serif', fontSize: 40, color:'#000',
          boxShadow:'0 12px 40px rgba(198,255,61,0.3)',
        }}>C</div>
        <div style={{
          fontFamily:'"Instrument Serif", Georgia, serif', fontSize: 32,
          color: VA.text, marginTop: 16, letterSpacing: -0.5, fontWeight: 400,
        }}>Camila Herrera</div>
        <div style={{ fontSize: 13, color: VA.muted, marginTop: 4 }}>{t.stylist} · Nivel Platinum ✦</div>
      </div>

      {/* Month + rating */}
      <div style={{ padding:'24px 20px 0', display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }}>
        <div style={{ background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 20, padding: 16 }}>
          <div style={{ fontSize: 11, color: VA.muted, fontWeight: 600, letterSpacing: 0.5 }}>{t.monthEarnings.toUpperCase()}</div>
          <div style={{
            fontFamily:'"Instrument Serif", Georgia, serif',
            fontSize: 30, color: VA.text, fontWeight: 400, letterSpacing: -0.6, marginTop: 6,
          }}>{fmtK(monthTotal)}</div>
        </div>
        <div style={{ background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 20, padding: 16 }}>
          <div style={{ fontSize: 11, color: VA.muted, fontWeight: 600, letterSpacing: 0.5 }}>{t.rating.toUpperCase()}</div>
          <div style={{ display:'flex', alignItems:'baseline', gap: 4, marginTop: 6 }}>
            <div style={{
              fontFamily:'"Instrument Serif", Georgia, serif',
              fontSize: 30, color: VA.text, fontWeight: 400, letterSpacing: -0.6,
            }}>4.9</div>
            {Icon.star(VA.lime, true, 16)}
          </div>
        </div>
      </div>

      {/* Menu */}
      <div style={{ padding:'16px 20px 0' }}>
        <div style={{
          background: VA.surface, border:`1px solid ${VA.border}`, borderRadius: 20, overflow:'hidden',
        }}>
          {[
            { label: t.settings, icon:'⚙' },
            { label: lang==='es'?'Disponibilidad':'Availability', icon:'◷' },
            { label: lang==='es'?'Servicios y precios':'Services & prices', icon:'✂' },
            { label: t.help, icon:'?' },
          ].map((item, i, arr) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', padding:'14px 16px',
              borderBottom: i < arr.length - 1 ? `1px solid ${VA.border}` : 'none',
              cursor:'pointer',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: VA.surface2,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: 14, color: VA.muted, marginRight: 12,
              }}>{item.icon}</div>
              <div style={{ flex: 1, fontSize: 14, color: VA.text, fontWeight: 500 }}>{item.label}</div>
              <div style={{ color: VA.dim }}>→</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { VASchedule, VAEarnings, VAQueue, VAClients, VAProfile });
