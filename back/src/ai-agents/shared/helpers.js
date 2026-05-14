'use strict';

const { formatInTimeZone, zonedTimeToUtc } = require('date-fns-tz');

const TIME_ZONE = 'America/Bogota';

function normalizeDateKeyword(dateStr) {
    if (!dateStr) return formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd');
    const s = String(dateStr).toLowerCase();
    const now = new Date();
    const today = formatInTimeZone(now, TIME_ZONE, 'yyyy-MM-dd');
    const tomorrow = formatInTimeZone(new Date(now.getTime() + 24 * 60 * 60 * 1000), TIME_ZONE, 'yyyy-MM-dd');
    const yesterday = formatInTimeZone(new Date(now.getTime() - 24 * 60 * 60 * 1000), TIME_ZONE, 'yyyy-MM-dd');
    if (s.includes('mañana') || s.includes('manana')) return tomorrow;
    if (s.includes('ayer')) return yesterday;
    if (s.includes('hoy')) return today;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    return today;
}

function normalizeHumanTimeToHHMM(t) {
    if (!t) return null;
    let s = String(t).toLowerCase().replace(/\s+/g, '').replace(/dela|de|la/g, '');
    const m = s.match(/^(\d{1,2})(?::?(\d{2}))?(am|pm|mañana|tarde|noche)?$/);
    if (!m) {
        const basic = s.match(/^(\d{1,2}):?(\d{2})$/);
        if (basic) return `${String(basic[1]).padStart(2, '0')}:${basic[2]}`;
        return null;
    }
    let h = parseInt(m[1], 10);
    let mm = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3];
    if (!ampm && h >= 1 && h <= 6) h += 12;
    if ((ampm === 'pm' || ampm === 'tarde' || ampm === 'noche') && h < 12) h += 12;
    if ((ampm === 'am' || ampm === 'mañana') && h === 12) h = 0;
    return `${String(Math.min(23, h)).padStart(2, '0')}:${String(Math.min(59, mm)).padStart(2, '0')}`;
}

function makeLocalUtc(dateStr, timeStr) {
    const t = (timeStr && timeStr.length === 5) ? `${timeStr}:00` : (timeStr || '00:00:00');
    return zonedTimeToUtc(`${dateStr} ${t}`, TIME_ZONE);
}

function getPeriodDays(periodo) {
    const p = String(periodo || 'mes').toLowerCase();
    if (p.includes('semana')) return 7;
    if (p.includes('año') || p.includes('anual')) return 365;
    if (p.includes('quincena')) return 15;
    if (p.includes('hoy')) return 1;
    return 30;
}

function periodToDateRange(periodo) {
    const days = getPeriodDays(periodo);
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return { start, end };
}

function nowBogota() {
    return formatInTimeZone(new Date(), TIME_ZONE, 'yyyy-MM-dd hh:mm a');
}

function fmtMoney(n) {
    const num = Number(n) || 0;
    return `$${num.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function fmtTime(d) {
    if (!d) return '';
    return formatInTimeZone(d, TIME_ZONE, 'hh:mm a');
}

function fmtDate(d) {
    if (!d) return '';
    return formatInTimeZone(d, TIME_ZONE, 'yyyy-MM-dd');
}

module.exports = {
    TIME_ZONE,
    normalizeDateKeyword,
    normalizeHumanTimeToHHMM,
    makeLocalUtc,
    getPeriodDays,
    periodToDateRange,
    nowBogota,
    fmtMoney,
    fmtTime,
    fmtDate,
    formatInTimeZone,
    zonedTimeToUtc,
};
