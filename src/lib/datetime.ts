import { locale } from 'svelte-i18n';

type MessageFormatter = (id: string, values?: Record<string, any>) => string;

export function formatLastSeen(
    lastSeenAt: string | null | undefined, 
    format?: MessageFormatter
): string | null {
    if (!lastSeenAt) return null;

    const date = new Date(lastSeenAt);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const now = new Date();
    let currentLocale = 'en'; // fallback
    const unsubscribe = locale.subscribe((value: string | null | undefined) => {
        currentLocale = value || 'en';
    });
    unsubscribe();
    const timeFormatter = new Intl.DateTimeFormat(currentLocale, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: currentLocale === 'en'
    });
    const timePart = timeFormatter.format(date);

    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
        return format 
            ? format('datetime.was_today_at', { values: { time: timePart } })
            : `was today at ${timePart}`;
    }

    const dateFormatter = new Intl.DateTimeFormat(currentLocale, date.getFullYear() === now.getFullYear()
        ? { day: 'numeric', month: 'short' }
        : { day: 'numeric', month: 'short', year: 'numeric' }
    );
    const datePart = dateFormatter.format(date);

    return format 
        ? format('datetime.was_on_date_at', { values: { date: datePart, time: timePart } })
        : `was on ${datePart} at ${timePart}`;
}

export function isOlderThan(
    date: Date | string | number | null | undefined,
    duration: {
        years?: number;
        months?: number;
        weeks?: number;
        days?: number;
        hours?: number;
        minutes?: number;
        seconds?: number;
        milliseconds?: number;
    }
): boolean {
    if (!date) return false;
    
    const targetDate = typeof date === 'string' || typeof date === 'number' 
        ? new Date(date) 
        : date;
    
    if (isNaN(targetDate.getTime())) {
        return false;
    }
    
    const now = new Date();
    const compareDate = new Date(now);
    
    if (duration.years) compareDate.setFullYear(now.getFullYear() - duration.years);
    if (duration.months) compareDate.setMonth(now.getMonth() - duration.months);
    if (duration.weeks) compareDate.setDate(now.getDate() - (duration.weeks * 7));
    if (duration.days) compareDate.setDate(now.getDate() - duration.days);
    if (duration.hours) compareDate.setHours(now.getHours() - duration.hours);
    if (duration.minutes) compareDate.setMinutes(now.getMinutes() - duration.minutes);
    if (duration.seconds) compareDate.setSeconds(now.getSeconds() - duration.seconds);
    if (duration.milliseconds) compareDate.setMilliseconds(now.getMilliseconds() - duration.milliseconds);
    
    return targetDate < compareDate;
}

export function formatDateHeader(timestamp: string, format?: MessageFormatter): string {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
        return format ? format('datetime.today') : 'Today';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return format ? format('datetime.yesterday') : 'Yesterday';
    }
    
    let currentLocale = 'en'; // fallback
    const unsubscribe = locale.subscribe((value: string | null | undefined) => {
        currentLocale = value || 'en';
    });
    unsubscribe();
    
    const formatter = new Intl.DateTimeFormat(currentLocale, {
        day: 'numeric',
        month: 'long'
    });
    
    return formatter.format(date);
}

export function formatMessageTime(timestamp: string, format?: MessageFormatter): string {
    const date = new Date(timestamp);
    const now = new Date();
    
    let currentLocale = 'en'; // fallback
    const unsubscribe = locale.subscribe((value: string | null | undefined) => {
        currentLocale = value || 'en';
    });
    unsubscribe();
    
    const timeFormatter = new Intl.DateTimeFormat(currentLocale, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: currentLocale === 'en'
    });
    
    return timeFormatter.format(date);
}

export function formatChatListTime(timestamp: string, format?: MessageFormatter): string {
    const date = new Date(timestamp);
    const now = new Date();
    
    let currentLocale = 'en'; // fallback
    const unsubscribe = locale.subscribe((value: string | null | undefined) => {
        currentLocale = value || 'en';
    });
    unsubscribe();
    
    const isToday = 
        date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear();
    
    if (isToday) {
        const timeFormatter = new Intl.DateTimeFormat(currentLocale, {
            hour: 'numeric',
            minute: '2-digit',
            hour12: currentLocale === 'en'
        });
        return timeFormatter.format(date);
    } else {
        const dateFormatter = new Intl.DateTimeFormat(currentLocale, {
            day: 'numeric',
            month: 'short',
            year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
        return dateFormatter.format(date);
    }
}
