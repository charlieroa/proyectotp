// Shared data + i18n for the stylist app
const I18N = {
  es: {
    // nav
    home: 'Inicio', schedule: 'Agenda', earnings: 'Ganancias', queue: 'Turno', clients: 'Clientes', profile: 'Perfil',
    // home
    greeting: 'Hola', goodMorning: 'Buenos días', today: 'Hoy', yourDay: 'Tu día',
    liveNow: 'EN VIVO', youAreServing: 'Atendiendo ahora', nextUp: 'Siguen',
    nextClient: 'Próximo cliente', inMinutes: 'en', min: 'min',
    viewAll: 'Ver todo', quickActions: 'Accesos rápidos',
    // earnings
    todayEarnings: 'Ganancias de hoy', totalToday: 'Total de hoy',
    services: 'Servicios', tips: 'Propinas', vsYesterday: 'vs. ayer',
    thisWeek: 'Esta semana', week: 'Semana', avgPerClient: 'Prom. por cliente',
    topService: 'Servicio top', clientsServed: 'Clientes atendidos',
    // queue / fichero
    yourTurn: 'Tu turno', youAreNext: '¡Eres el siguiente!', position: 'Posición',
    queueTitle: 'Fichero digital', positionInQueue: 'Posición en la cola',
    estimatedWait: 'Espera estimada', currentlyServing: 'Atendiendo',
    upcoming: 'Por venir', youAre: 'Tú',
    // schedule
    scheduleTitle: 'Agenda', addAppt: 'Nueva cita', todayCount: 'citas hoy',
    // clients
    clientsTitle: 'Clientes', searchClients: 'Buscar clientes',
    lastVisit: 'Última visita', totalVisits: 'visitas', servedToday: 'Atendidos hoy',
    markDone: 'Marcar atendido', loyal: 'Fiel', new: 'Nuevo',
    // profile
    stylist: 'Estilista', level: 'Nivel', rating: 'Calificación',
    monthEarnings: 'Este mes', settings: 'Ajustes', help: 'Ayuda', signOut: 'Cerrar sesión',
    days: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
    ago: 'hace',
  },
  en: {
    home: 'Home', schedule: 'Schedule', earnings: 'Earnings', queue: 'Queue', clients: 'Clients', profile: 'Profile',
    greeting: 'Hi', goodMorning: 'Good morning', today: 'Today', yourDay: 'Your day',
    liveNow: 'LIVE', youAreServing: 'Serving now', nextUp: 'Next up',
    nextClient: 'Next client', inMinutes: 'in', min: 'min',
    viewAll: 'View all', quickActions: 'Quick actions',
    todayEarnings: "Today's earnings", totalToday: 'Total today',
    services: 'Services', tips: 'Tips', vsYesterday: 'vs. yesterday',
    thisWeek: 'This week', week: 'Week', avgPerClient: 'Avg. per client',
    topService: 'Top service', clientsServed: 'Clients served',
    yourTurn: 'Your turn', youAreNext: "You're next!", position: 'Position',
    queueTitle: 'Digital queue', positionInQueue: 'Position in queue',
    estimatedWait: 'Est. wait', currentlyServing: 'Serving',
    upcoming: 'Upcoming', youAre: 'You',
    scheduleTitle: 'Schedule', addAppt: 'New booking', todayCount: 'today',
    clientsTitle: 'Clients', searchClients: 'Search clients',
    lastVisit: 'Last visit', totalVisits: 'visits', servedToday: 'Served today',
    markDone: 'Mark done', loyal: 'Loyal', new: 'New',
    stylist: 'Stylist', level: 'Level', rating: 'Rating',
    monthEarnings: 'This month', settings: 'Settings', help: 'Help', signOut: 'Sign out',
    days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    ago: 'ago',
  },
};

const CLIENTS = [
  { id:1, initials:'MC', name:'María Camila', service:'Corte + color', price:120000, tip:15000, time:'09:00', status:'done', rating:5, visits:12, tag:'loyal', color:'#E8C174' },
  { id:2, initials:'JR', name:'Jorge Ramírez', service:'Fade clásico', price:45000, tip:5000, time:'10:00', status:'done', rating:5, visits:8, tag:'loyal', color:'#D4A574' },
  { id:3, initials:'AL', name:'Ana Lucía', service:'Balayage', price:280000, tip:30000, time:'11:00', status:'serving', rating:5, visits:3, tag:'new', color:'#D97B6C' },
  { id:4, initials:'DS', name:'Daniel Sáenz', service:'Barba + corte', price:60000, tip:8000, time:'12:30', status:'upcoming', rating:4, visits:1, tag:'new', color:'#B8A0D6' },
  { id:5, initials:'VT', name:'Valentina T.', service:'Keratina', price:350000, tip:40000, time:'14:00', status:'upcoming', rating:5, visits:7, tag:'loyal', color:'#A9B5C9' },
  { id:6, initials:'SM', name:'Santiago M.', service:'Corte clásico', price:35000, tip:5000, time:'15:30', status:'upcoming', rating:5, visits:15, tag:'loyal', color:'#E8C174' },
  { id:7, initials:'LC', name:'Laura C.', service:'Color + peinado', price:180000, tip:20000, time:'17:00', status:'upcoming', rating:5, visits:4, tag:'new', color:'#D97B6C' },
];

// Multi-service queues — a stylist can be enrolled in several colas at once
const QUEUES = [
  {
    id:'cut', label:'Corte', icon:'✂', color:'#E8C174', active:true,
    myPos: 2, total: 5, eta: 35,
    clients: [
      { id:'c1', initials:'AL', name:'Ana Lucía', service:'Corte + color', status:'serving', eta:0 },
      { id:'c2', initials:'DS', name:'Daniel Sáenz', service:'Corte clásico', status:'next', eta:12 },
      { id:'c3', initials:'ME', name:'Tú — Camila', service:'—', status:'me', eta:35, isMe:true },
      { id:'c4', initials:'SM', name:'Santiago M.', service:'Corte clásico', status:'waiting', eta:65 },
      { id:'c5', initials:'RP', name:'Ricardo P.', service:'Fade', status:'waiting', eta:95 },
    ],
  },
  {
    id:'color', label:'Color', icon:'◉', color:'#D4A574', active:true,
    myPos: 0, total: 3, eta: 0,
    clients: [
      { id:'col1', initials:'ME', name:'Tú — Camila', service:'—', status:'me', eta:0, isMe:true },
      { id:'col2', initials:'VT', name:'Valentina T.', service:'Keratina', status:'waiting', eta:90 },
      { id:'col3', initials:'LC', name:'Laura C.', service:'Balayage', status:'waiting', eta:180 },
    ],
  },
  {
    id:'beard', label:'Barba', icon:'⌇', color:'#D97B6C', active:true,
    myPos: 1, total: 4, eta: 20,
    clients: [
      { id:'b1', initials:'JR', name:'Jorge Ramírez', service:'Barba + corte', status:'serving', eta:0 },
      { id:'b2', initials:'ME', name:'Tú — Camila', service:'—', status:'me', eta:20, isMe:true },
      { id:'b3', initials:'AN', name:'Andrés N.', service:'Barba', status:'waiting', eta:45 },
      { id:'b4', initials:'FG', name:'Felipe G.', service:'Barba + corte', status:'waiting', eta:70 },
    ],
  },
  {
    id:'keratin', label:'Keratina', icon:'∿', color:'#A9B5C9', active:true,
    myPos: 1, total: 3, eta: 55,
    clients: [
      { id:'k1', initials:'VT', name:'Valentina T.', service:'Keratina', status:'serving', eta:0 },
      { id:'k2', initials:'ME', name:'Tú — Camila', service:'—', status:'me', eta:55, isMe:true },
      { id:'k3', initials:'PM', name:'Paola M.', service:'Keratina', status:'waiting', eta:120 },
    ],
  },
  {
    id:'mani', label:'Manicure', icon:'✦', color:'#B8A0D6', active:true,
    myPos: 0, total: 4, eta: 0,
    clients: [
      { id:'m1', initials:'ME', name:'Tú — Camila', service:'—', status:'me', eta:0, isMe:true },
      { id:'m2', initials:'SL', name:'Sara L.', service:'Manicure gel', status:'waiting', eta:40 },
      { id:'m3', initials:'CR', name:'Carla R.', service:'Manicure', status:'waiting', eta:80 },
      { id:'m4', initials:'JP', name:'Juliana P.', service:'Pedi + mani', status:'waiting', eta:130 },
    ],
  },
  {
    id:'wash', label:'Lavado', icon:'∼', color:'#9EC17A', active:false,
    myPos: null, total: 2, eta: null,
    clients: [
      { id:'w1', initials:'ND', name:'Nataly D.', service:'Lavado + brushing', status:'serving', eta:0 },
      { id:'w2', initials:'GR', name:'Gabriela R.', service:'Lavado', status:'waiting', eta:25 },
    ],
  },
];

// Legacy QUEUE for old refs (keep minimal)
const QUEUE = QUEUES[0].clients.filter(c => !c.isMe);

// Weekly earnings COP
const WEEK_EARNINGS = [
  { d:0, v:320 }, { d:1, v:480 }, { d:2, v:410 }, { d:3, v:520 },
  { d:4, v:640 }, { d:5, v:780 }, { d:6, v:290 },
];

const fmtCOP = (n) => '$' + n.toLocaleString('es-CO');
const fmtK = (n) => {
  if (n >= 1000000) return '$' + (n/1000000).toFixed(1) + 'M';
  if (n >= 1000) return '$' + Math.round(n/1000) + 'K';
  return '$' + n;
};

Object.assign(window, { I18N, CLIENTS, QUEUE, QUEUES, WEEK_EARNINGS, fmtCOP, fmtK });
