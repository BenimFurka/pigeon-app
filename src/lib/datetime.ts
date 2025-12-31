export function formatLastSeen(lastSeenAt: string | null | undefined): string | null {
    if (!lastSeenAt) return null;

    const date = new Date(lastSeenAt);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const now = new Date();
    const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const timePart = timeFormatter.format(date);

    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
        return `был(а) в ${timePart}`;
    }

    const dateFormatter = new Intl.DateTimeFormat('ru-RU', date.getFullYear() === now.getFullYear()
        ? { day: '2-digit', month: '2-digit' }
        : { day: '2-digit', month: '2-digit', year: 'numeric' }
    );
    const datePart = dateFormatter.format(date);

    return `был(а) ${datePart} в ${timePart}`;
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

export function formatDateHeader(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
        return 'Сегодня';
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
        return 'Вчера';
    }
    
    const formatter = new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long'
    });
    
    return formatter.format(date);
}
