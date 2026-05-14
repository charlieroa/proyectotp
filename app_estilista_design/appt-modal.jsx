// Appointment state + modal — shared between variants A & B
// Uses a tiny pub/sub so both variants see the same list.

const APPT_SERVICES = [
  { name:'Corte clásico', price:35000, dur:30 },
  { name:'Fade clásico', price:45000, dur:30 },
  { name:'Barba + corte', price:60000, dur:45 },
  { name:'Corte + color', price:120000, dur:90 },
  { name:'Color + peinado', price:180000, dur:75 },
  { name:'Balayage', price:280000, dur:150 },
  { name:'Keratina', price:350000, dur:180 },
];

const TIME_SLOTS = ['09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'];

// Seed store from CLIENTS
const _apptListeners = new Set();
let _apptStore = CLIENTS.map(c => ({ ...c }));
const apptStore = {
  get: () => _apptStore,
  set: (next) => { _apptStore = next; _apptListeners.forEach(fn => fn()); },
  update: (id, patch) => apptStore.set(_apptStore.map(a => a.id === id ? { ...a, ...patch } : a)),
  remove: (id) => apptStore.set(_apptStore.filter(a => a.id !== id)),
  add: (appt) => apptStore.set([..._apptStore, { id: Date.now(), ...appt }].sort((a,b) => a.time.localeCompare(b.time))),
  subscribe: (fn) => { _apptListeners.add(fn); return () => _apptListeners.delete(fn); },
};

function useAppts() {
  const [, force] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => apptStore.subscribe(force), []);
  return apptStore.get();
}

// ── Shared Bottom Sheet modal ─────────────────────────────
function ApptModal({ appt, onClose, onSave, onDelete, t, lang, theme }) {
  const isNew = !appt?.id || appt._new;
  const [draft, setDraft] = React.useState(() => ({
    name: appt?.name || '',
    service: appt?.service || APPT_SERVICES[0].name,
    price: appt?.price ?? APPT_SERVICES[0].price,
    time: appt?.time || '14:00',
    initials: appt?.initials || '',
    color: appt?.color || '#C6FF3D',
    status: appt?.status || 'upcoming',
    rating: appt?.rating || 5,
    visits: appt?.visits || 1,
    tag: appt?.tag || 'new',
    tip: appt?.tip || 0,
  }));
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const onService = (name) => {
    const s = APPT_SERVICES.find(x => x.name === name);
    setDraft(d => ({ ...d, service: name, price: s.price }));
  };

  const initialsFrom = (name) => {
    const parts = name.trim().split(/\s+/);
    return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
  };

  const handleSave = () => {
    const payload = {
      ...draft,
      initials: draft.initials || initialsFrom(draft.name).toUpperCase() || 'NN',
    };
    if (isNew) apptStore.add(payload);
    else apptStore.update(appt.id, payload);
    onClose();
  };

  const handleDelete = () => {
    apptStore.remove(appt.id);
    onClose();
  };

  const handleCancel = () => {
    apptStore.update(appt.id, { status: 'cancelled' });
    onClose();
  };

  // Theme tokens (VA or VB)
  const T = theme;

  return (
    <div onClick={onClose} style={{
      position:'absolute', inset: 0, zIndex: 100,
      background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'flex-end', animation:'fadeIn 180ms ease-out',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width:'100%', maxHeight:'90%', overflowY:'auto',
        background: T.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        border: `1px solid ${T.border2}`, borderBottom:'none',
        padding:'12px 20px 30px',
        animation:'slideUp 260ms cubic-bezier(0.22,0.9,0.3,1)',
      }}>
        {/* grabber */}
        <div style={{ width: 40, height: 4, borderRadius: 999, background: T.border2, margin:'0 auto 18px' }}/>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 18 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>
            {isNew ? (lang==='es'?'Nueva cita':'New booking') : (lang==='es'?'Editar cita':'Edit booking')}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius:'50%',
            background: T.surface, border:`1px solid ${T.border2}`, color: T.text,
            fontSize: 16, cursor:'pointer',
          }}>×</button>
        </div>

        {/* Name */}
        <Field label={lang==='es'?'Nombre del cliente':'Client name'} T={T}>
          <input value={draft.name} onChange={(e) => setDraft(d => ({ ...d, name: e.target.value }))}
            placeholder={lang==='es'?'Ej. María Camila':'e.g. Maria'} style={inputStyle(T)}/>
        </Field>

        {/* Service picker */}
        <Field label={lang==='es'?'Servicio':'Service'} T={T}>
          <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
            {APPT_SERVICES.map(s => {
              const active = draft.service === s.name;
              return (
                <button key={s.name} onClick={() => onService(s.name)} style={{
                  padding:'8px 12px', borderRadius: 999, border:'none', cursor:'pointer',
                  background: active ? T.lime : T.surface,
                  color: active ? '#000' : T.text,
                  fontSize: 12, fontWeight: 600,
                }}>{s.name}</button>
              );
            })}
          </div>
        </Field>

        {/* Time */}
        <Field label={lang==='es'?'Hora':'Time'} T={T}>
          <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
            {TIME_SLOTS.map(slot => {
              const active = draft.time === slot;
              return (
                <button key={slot} onClick={() => setDraft(d => ({ ...d, time: slot }))} style={{
                  padding:'7px 11px', borderRadius: 10, border:'none', cursor:'pointer',
                  background: active ? T.lime : T.surface,
                  color: active ? '#000' : T.text,
                  fontSize: 12, fontWeight: 700, fontFamily:'"JetBrains Mono", monospace',
                }}>{slot}</button>
              );
            })}
          </div>
        </Field>

        {/* Price */}
        <Field label={lang==='es'?'Precio (COP)':'Price (COP)'} T={T}>
          <input type="number" value={draft.price} onChange={(e) => setDraft(d => ({ ...d, price: Number(e.target.value) }))}
            style={inputStyle(T)}/>
        </Field>

        {/* Status */}
        {!isNew && (
          <Field label={lang==='es'?'Estado':'Status'} T={T}>
            <div style={{ display:'flex', gap: 6 }}>
              {[
                { id:'upcoming', label: lang==='es'?'Próxima':'Upcoming' },
                { id:'serving', label: lang==='es'?'Atendiendo':'Serving' },
                { id:'done', label: lang==='es'?'Completada':'Done' },
              ].map(s => {
                const active = draft.status === s.id;
                return (
                  <button key={s.id} onClick={() => setDraft(d => ({ ...d, status: s.id }))} style={{
                    flex: 1, padding:'10px 0', borderRadius: 10, border:'none', cursor:'pointer',
                    background: active ? T.lime : T.surface,
                    color: active ? '#000' : T.text, fontSize: 12, fontWeight: 700,
                  }}>{s.label}</button>
                );
              })}
            </div>
          </Field>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap: 8, marginTop: 22 }}>
          <button onClick={onClose} style={{
            flex: 1, padding:'14px 0', borderRadius: 14, cursor:'pointer',
            background: T.surface, color: T.text, border:`1px solid ${T.border2}`,
            fontSize: 13, fontWeight: 600,
          }}>{lang==='es'?'Cerrar':'Close'}</button>
          <button onClick={handleSave} style={{
            flex: 2, padding:'14px 0', borderRadius: 14, border:'none', cursor:'pointer',
            background: T.lime, color:'#000', fontSize: 14, fontWeight: 700, letterSpacing: 0.2,
          }}>{isNew ? (lang==='es'?'Crear cita':'Create booking') : (lang==='es'?'Guardar cambios':'Save changes')}</button>
        </div>

        {!isNew && draft.status !== 'cancelled' && (
          <button onClick={handleCancel} style={{
            marginTop: 10, width:'100%', padding:'12px 0', borderRadius: 14, cursor:'pointer',
            background:'rgba(251,176,64,0.08)', color:'#FBB040', border:`1px solid rgba(251,176,64,0.3)`,
            fontSize: 13, fontWeight: 600,
          }}>⊘ {lang==='es'?'Cancelar esta cita':'Cancel this booking'}</button>
        )}

        {!isNew && (
          <div style={{ marginTop: 10 }}>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{
                width:'100%', padding:'12px 0', borderRadius: 14, cursor:'pointer',
                background:'transparent', color:'#FF6B6B', border:`1px solid rgba(255,107,107,0.3)`,
                fontSize: 13, fontWeight: 600,
              }}>🗑 {lang==='es'?'Eliminar cita':'Delete booking'}</button>
            ) : (
              <div style={{
                padding: 14, borderRadius: 14,
                background:'rgba(255,107,107,0.08)', border:`1px solid rgba(255,107,107,0.3)`,
              }}>
                <div style={{ fontSize: 13, color: T.text, fontWeight: 600, marginBottom: 10 }}>
                  {lang==='es'?'¿Eliminar permanentemente?':'Delete permanently?'}
                </div>
                <div style={{ display:'flex', gap: 8 }}>
                  <button onClick={handleDelete} style={{
                    flex: 1, padding:'10px 0', borderRadius: 10, border:'none', cursor:'pointer',
                    background:'#FF6B6B', color:'#fff', fontSize: 12, fontWeight: 700,
                  }}>{lang==='es'?'Sí, eliminar':'Yes, delete'}</button>
                  <button onClick={() => setConfirmDelete(false)} style={{
                    flex: 1, padding:'10px 0', borderRadius: 10, cursor:'pointer',
                    background: T.surface, color: T.text, border:`1px solid ${T.border2}`,
                    fontSize: 12, fontWeight: 600,
                  }}>{lang==='es'?'Atrás':'Back'}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, T, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: 0.6, marginBottom: 8 }}>
        {label.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function inputStyle(T) {
  return {
    width:'100%', padding:'12px 14px', borderRadius: 12,
    background: T.surface, border:`1px solid ${T.border2}`, color: T.text,
    fontSize: 14, fontFamily:'inherit', outline:'none',
  };
}

Object.assign(window, { apptStore, useAppts, ApptModal, APPT_SERVICES, TIME_SLOTS });
