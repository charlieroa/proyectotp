import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu, X, Scissors, ArrowRight, MessageSquare, CheckCircle2,
    Users, Star, BarChart3, MapPin, ShoppingBag, MessageCircle,
    CalendarCheck, FileText, TrendingUp, ArrowUpRight, Check,
    Send, Monitor, Smartphone, Sparkles
} from 'lucide-react';
import logoLight from '../../assets/images/logo-light.png';
import './Landing.css';

/* ========================
   NAVBAR
   ======================== */
const navLinks = [
    { label: 'Inicio', href: '#' },
    { label: 'Beneficios', href: '#features' },
    { label: 'WhatsApp IA', href: '#whatsapp-demo' },
    { label: 'Plataformas', href: '#platforms' },
];

const Navbar = () => {
    const [open, setOpen] = useState(false);

    return (
        <nav className="lp-navbar">
            <div className="lp-container lp-navbar-inner">
                <a href="#" className="lp-navbar-logo">
                    <img src={logoLight} alt="TuPelukeria" style={{ height: 36 }} />
                </a>

                <div className="lp-navbar-links">
                    {navLinks.map((l) => (
                        <a key={l.href} href={l.href} className="lp-navbar-link">{l.label}</a>
                    ))}
                    <Link to="/login" className="lp-navbar-link">Iniciar sesion</Link>
                    <Link to="/register-tenant" className="lp-navbar-cta lp-bg-gradient-brand">
                        Prueba gratis
                    </Link>
                </div>

                <button onClick={() => setOpen(!open)} className="lp-navbar-hamburger">
                    {open ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="lp-navbar-mobile"
                    >
                        {navLinks.map((l) => (
                            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
                        ))}
                        <Link to="/login" className="lp-navbar-link" onClick={() => setOpen(false)}>
                            Iniciar sesion
                        </Link>
                        <Link to="/register-tenant" className="lp-navbar-cta lp-bg-gradient-brand" onClick={() => setOpen(false)}>
                            Prueba gratis
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

/* ========================
   HERO SECTION
   ======================== */
const badges = ['Agente IA por WhatsApp', 'Analiticas inteligentes', 'Gestion automatizada'];

const HeroSection = () => (
    <section className="lp-hero">
        <div className="lp-hero-bg lp-bg-grid-pattern" style={{ opacity: 0.4 }} />
        <div className="lp-hero-bg lp-bg-radial-brand" />
        <div className="lp-hero-line" />

        <div className="lp-container lp-hero-content">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <div className="lp-trust-badge">
                    <span className="lp-pulse-dot">
                        <span className="lp-pulse-dot-ping" />
                        <span className="lp-pulse-dot-core" />
                    </span>
                    <span>Mas de 500 peluquerias confian en nosotros</span>
                </div>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
                La IA que gestiona tu peluqueria{' '}
                <span className="lp-text-gradient">100% automatica</span>
            </motion.h1>

            <motion.p className="lp-hero-subtitle" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                Agentes inteligentes por WhatsApp para duenos y clientes. Ventas, estrategias, citas y mas — todo desde una conversacion.
            </motion.p>

            <motion.div className="lp-hero-badges" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }}>
                {badges.map((b) => (
                    <span key={b} className="lp-hero-badge">
                        <CheckCircle2 size={16} style={{ color: 'var(--lp-accent)' }} />
                        {b}
                    </span>
                ))}
            </motion.div>

            <motion.div className="lp-hero-ctas" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                <Link to="/register-tenant" className="lp-btn-primary lp-bg-gradient-brand lp-glow-brand">
                    Comienza gratis ahora
                    <ArrowRight size={16} />
                </Link>
                <a href="#whatsapp-demo" className="lp-btn-secondary">
                    <MessageSquare size={16} style={{ color: 'var(--lp-accent)' }} />
                    Ver demo WhatsApp
                </a>
            </motion.div>

            <motion.div className="lp-social-proof" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.5 }}>
                <div>
                    <Users size={16} />
                    <span>+500 clientes activos</span>
                </div>
                <div>
                    <Star size={16} className="lp-star" />
                    <span>4.9/5 satisfaccion</span>
                </div>
            </motion.div>
        </div>
    </section>
);

/* ========================
   FEATURES SECTION
   ======================== */
const ownerFeatures = [
    { icon: BarChart3, title: 'Analiticas de ventas', desc: 'Sabe que se vendio, cuando y por que. Decisiones basadas en datos reales.' },
    { icon: TrendingUp, title: 'Estrategias IA', desc: 'Recomendaciones personalizadas para aumentar ingresos y fidelizar clientes.' },
    { icon: ShoppingBag, title: 'Productos estrella', desc: 'Identifica que se vende mas y optimiza tu inventario automaticamente.' },
    { icon: MapPin, title: 'Geolocalizacion', desc: 'Conoce quien esta cerca de tu peluqueria en tiempo real.' },
    { icon: MessageCircle, title: 'Gestion de quejas', desc: 'Responde y resuelve quejas de forma inteligente y automatizada.' },
    { icon: FileText, title: 'Fichero digital', desc: 'Toda la info de clientes y empleados organizada en un solo lugar.' },
];

const clientFeatures = [
    { icon: Scissors, title: 'Guia de servicios', desc: 'Explora servicios con recomendaciones personalizadas por la IA.' },
    { icon: CalendarCheck, title: 'Reagendamiento facil', desc: 'Cambia tu cita en segundos directamente por WhatsApp.' },
    { icon: Star, title: 'Sugerencias de estilo', desc: 'Cortes y tratamientos sugeridos segun tu perfil y tendencias.' },
    { icon: ShoppingBag, title: 'Compra productos', desc: 'Pide productos de belleza directamente desde la conversacion.' },
];

const FeatureCard = ({ icon: Icon, title, desc, index }: { icon: any; title: string; desc: string; index: number }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.4, delay: index * 0.06 }}
        className="lp-feature-card"
    >
        <div className="lp-feature-card-overlay" />
        <div className="lp-feature-card-body">
            <div className="lp-feature-icon">
                <Icon size={20} />
            </div>
            <div className="lp-feature-title-row">
                <h3 className="lp-feature-title">{title}</h3>
                <ArrowUpRight size={16} className="lp-feature-arrow" />
            </div>
            <p className="lp-feature-desc">{desc}</p>
        </div>
    </motion.div>
);

const SectionHeader = ({ tag, title, highlight, desc, tagColor }: { tag: string; title: string; highlight: string; desc: string; tagColor?: string }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lp-section-header">
        <span className="lp-section-tag" style={{ color: tagColor || 'var(--lp-primary)' }}>{tag}</span>
        <h2 className="lp-section-title">
            {title} <span className="lp-text-gradient">{highlight}</span>
        </h2>
        <p className="lp-section-desc">{desc}</p>
    </motion.div>
);

const FeaturesSection = () => (
    <section id="features" className="lp-section">
        <div className="lp-hero-bg lp-bg-grid-pattern" style={{ opacity: 0.2 }} />
        <div className="lp-container" style={{ position: 'relative' }}>
            <SectionHeader
                tag="Para duenos"
                title="Controla tu negocio con"
                highlight="IA"
                desc="Desde analiticas de ventas hasta gestion de quejas — tu asistente se encarga de todo."
            />
            <div className="lp-features-grid lp-features-grid-3">
                {ownerFeatures.map((f, i) => <FeatureCard key={f.title} {...f} index={i} />)}
            </div>

            <div className="lp-divider">
                <div className="lp-divider-line" />
                <div className="lp-divider-dot lp-bg-gradient-brand" />
                <div className="lp-divider-line" />
            </div>

            <SectionHeader
                tag="Para clientes"
                tagColor="var(--lp-accent)"
                title="Tu estilista virtual en"
                highlight="WhatsApp"
                desc="Agenda, compra y descubre nuevos estilos — todo desde una conversacion."
            />
            <div className="lp-features-grid lp-features-grid-4">
                {clientFeatures.map((f, i) => <FeatureCard key={f.title} {...f} index={i} />)}
            </div>
        </div>
    </section>
);

/* ========================
   WHATSAPP DEMO
   ======================== */
const chatMessages = [
    { from: 'user', text: 'Hola, quiero reagendar mi cita del viernes' },
    { from: 'bot', text: 'Hola Maria! Claro, tu cita actual es el viernes a las 3pm con Carlos. Que dia te queda mejor?' },
    { from: 'user', text: 'El sabado por la manana' },
    { from: 'bot', text: 'Perfecto, tienes disponible sabado a las 10am o 11:30am. Tambien te recomiendo nuestra promo: corte + tratamiento con 20% de descuento' },
    { from: 'user', text: 'Me apunto al de las 10! Con la promo' },
    { from: 'bot', text: 'Listo! Cita confirmada:\n\nSabado 10:00am\nCorte + Tratamiento (-20%)\nCon Carlos\n\nTe esperamos Maria!' },
];

const waFeatures = [
    'Respuestas instantaneas en lenguaje natural',
    'Reagendamiento y confirmacion de citas',
    'Venta de productos y promociones personalizadas',
    'Disponible para duenos y clientes',
];

const WhatsAppDemo = () => {
    const [visibleCount, setVisibleCount] = useState(0);

    useEffect(() => {
        if (visibleCount < chatMessages.length) {
            const timer = setTimeout(() => setVisibleCount((c) => c + 1), visibleCount === 0 ? 800 : 1200);
            return () => clearTimeout(timer);
        }
    }, [visibleCount]);

    return (
        <section id="whatsapp-demo" className="lp-section lp-wa-section">
            <div className="lp-hero-bg lp-bg-radial-brand" style={{ opacity: 0.4 }} />
            <div className="lp-container" style={{ position: 'relative' }}>
                <div className="lp-wa-grid">
                    <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                        <span className="lp-section-tag" style={{ color: 'var(--lp-accent)' }}>WhatsApp IA</span>
                        <h2 className="lp-section-title" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                            Tu agente atendiendo <span className="lp-text-gradient">24/7</span>
                        </h2>
                        <p style={{ color: 'var(--lp-muted-fg)', marginBottom: '2rem', maxWidth: '28rem', lineHeight: 1.7 }}>
                            Los clientes interactuan de forma natural con el agente IA por WhatsApp. Reagendamiento, promociones, servicios y ventas — todo automatico.
                        </p>
                        <ul className="lp-wa-list">
                            {waFeatures.map((item) => (
                                <li key={item}>
                                    <span className="lp-wa-list-icon">
                                        <Check size={12} style={{ color: 'var(--lp-accent)' }} />
                                    </span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="lp-phone-wrapper">
                        <div className="lp-phone">
                            <div className="lp-phone-frame">
                                <div className="lp-phone-header">
                                    <div className="lp-phone-avatar lp-bg-gradient-brand">
                                        <MessageSquare size={16} style={{ color: 'var(--lp-primary-fg)' }} />
                                    </div>
                                    <div>
                                        <p className="lp-phone-name">TuPelukeria IA</p>
                                        <p className="lp-phone-status">en linea</p>
                                    </div>
                                </div>

                                <div className="lp-phone-chat">
                                    {chatMessages.slice(0, visibleCount).map((msg, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ duration: 0.3 }}
                                            className={`lp-chat-msg ${msg.from === 'user' ? 'lp-chat-msg-user' : 'lp-chat-msg-bot'}`}
                                        >
                                            <div className={`lp-chat-bubble ${msg.from === 'user' ? 'lp-chat-bubble-user' : 'lp-chat-bubble-bot'}`}>
                                                {msg.text}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {visibleCount < chatMessages.length && (
                                        <div className="lp-chat-typing">
                                            <div className="lp-chat-typing-inner">
                                                <span className="lp-typing-dot" />
                                                <span className="lp-typing-dot" />
                                                <span className="lp-typing-dot" />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="lp-phone-input-bar">
                                    <div className="lp-phone-input-fake">Escribe un mensaje...</div>
                                    <div className="lp-phone-send-btn lp-bg-gradient-brand">
                                        <Send size={16} style={{ color: 'var(--lp-primary-fg)' }} />
                                    </div>
                                </div>
                            </div>
                            <div className="lp-phone-glow" />
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

/* ========================
   PLATFORMS (HOW IT WORKS)
   ======================== */
const platforms = [
    {
        icon: Monitor,
        label: 'Duenos',
        title: 'Panel Web',
        desc: 'Dashboard completo con analiticas, estrategias IA, gestion de quejas y fichero digital.',
        features: ['Analiticas en tiempo real', 'Estrategias automatizadas', 'Gestion de equipo'],
    },
    {
        icon: Smartphone,
        label: 'Estilistas',
        title: 'App Movil',
        desc: 'Cada estilista gestiona sus citas, clientes y agenda desde su propia app.',
        features: ['Agenda personalizada', 'Perfil de clientes', 'Notificaciones push'],
    },
    {
        icon: MessageSquare,
        label: 'Todos',
        title: 'WhatsApp IA',
        desc: 'Agente inteligente por WhatsApp para duenos y clientes — siempre disponible.',
        features: ['Atencion 24/7', 'Lenguaje natural', 'Reagendamiento instantaneo'],
    },
];

const HowItWorks = () => (
    <section id="platforms" className="lp-section">
        <div className="lp-hero-bg lp-bg-grid-pattern" style={{ opacity: 0.15 }} />
        <div className="lp-container" style={{ position: 'relative' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="lp-section-header">
                <span className="lp-section-tag lp-text-primary">Plataformas</span>
                <h2 className="lp-section-title">
                    Un ecosistema <span className="lp-text-gradient">completo</span>
                </h2>
                <p className="lp-section-desc">Cada rol tiene su herramienta perfecta, todo conectado por IA.</p>
            </motion.div>

            <div className="lp-platforms-grid">
                {platforms.map((p, i) => (
                    <motion.div
                        key={p.title}
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="lp-platform-card"
                    >
                        <div className="lp-platform-icon lp-bg-gradient-brand lp-glow-brand-sm">
                            <p.icon size={28} />
                        </div>
                        <span className="lp-platform-label">{p.label}</span>
                        <h3 className="lp-platform-title">{p.title}</h3>
                        <p className="lp-platform-desc">{p.desc}</p>
                        <ul className="lp-platform-features">
                            {p.features.map((f) => (
                                <li key={f}>
                                    <ArrowRight size={12} style={{ color: 'var(--lp-accent)' }} />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </div>
        </div>
    </section>
);

/* ========================
   CTA SECTION
   ======================== */
const CTASection = () => (
    <section id="cta" className="lp-section">
        <div className="lp-container">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="lp-cta-box"
            >
                <div className="lp-cta-bg lp-cta-bg-card" />
                <div className="lp-cta-bg lp-cta-bg-gradient" />
                <div className="lp-cta-bg lp-bg-grid-pattern" style={{ opacity: 0.2 }} />
                <div className="lp-cta-bg lp-cta-bg-radial lp-bg-radial-brand" />

                <div className="lp-cta-content">
                    <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: 'spring', delay: 0.2 }}
                    >
                        <div className="lp-cta-icon lp-bg-gradient-brand lp-glow-brand-intense" style={{ margin: '0 auto 2rem' }}>
                            <Sparkles size={32} />
                        </div>
                    </motion.div>

                    <h2 className="lp-cta-title">
                        Transforma tu peluqueria<br />
                        <span className="lp-text-gradient">hoy mismo</span>
                    </h2>
                    <p className="lp-cta-desc">
                        Unite a las peluquerias que ya usan IA para crecer, vender mas y ofrecer una experiencia unica.
                    </p>
                    <div className="lp-cta-buttons">
                        <Link to="/register-tenant" className="lp-btn-primary lp-bg-gradient-brand lp-glow-brand">
                            Comenzar gratis
                            <ArrowRight size={16} />
                        </Link>
                        <Link to="/login" className="lp-cta-link">
                            Ya tengo cuenta &rarr;
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    </section>
);

/* ========================
   FOOTER
   ======================== */
const LandingFooter = () => (
    <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
            <a href="#" className="lp-navbar-logo">
                <Scissors size={16} style={{ color: 'var(--lp-primary)' }} />
                <span>tu<span className="lp-text-gradient">pelukeria</span></span>
            </a>
            <div className="lp-footer-links">
                <a href="#features">Beneficios</a>
                <a href="#whatsapp-demo">WhatsApp</a>
                <a href="#platforms">Plataformas</a>
                <Link to="/login">Iniciar sesion</Link>
            </div>
            <p className="lp-footer-copy">&copy; 2025 TuPelukeria. Todos los derechos reservados.</p>
        </div>
    </footer>
);

/* ========================
   LANDING PAGE (MAIN)
   ======================== */
const Landing: React.FC = () => {
    return (
        <div className="landing-page">
            <Navbar />
            <HeroSection />
            <FeaturesSection />
            <WhatsAppDemo />
            <HowItWorks />
            <CTASection />
            <LandingFooter />
        </div>
    );
};

export default Landing;
