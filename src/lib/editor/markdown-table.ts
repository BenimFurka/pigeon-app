import { EditorView } from '@codemirror/view';

export function findTableAtPosition(view: EditorView, pos: number): { from: number; to: number; text: string } | null {
    const doc = view.state.doc;
    const line = doc.lineAt(pos);
    let startLine = line;
    while (startLine.number > 1) {
        const prevLine = doc.line(startLine.number - 1);
        if (!prevLine.text.trim().startsWith('|')) break;
        startLine = prevLine;
    }
    let endLine = line;
    while (endLine.number < doc.lines) {
        const nextLine = doc.line(endLine.number + 1);
        if (!nextLine.text.trim().startsWith('|')) break;
        endLine = nextLine;
    }
    const from = startLine.from, to = endLine.to;
    const text = doc.sliceString(from, to);
    if (text.split('\n').length < 2 || !text.split('\n')[0].trim().startsWith('|')) return null;
    return { from, to, text };
}

export function reformatTable(view: EditorView, pos: number): boolean {
    const table = findTableAtPosition(view, pos);
    if (!table) return false;
    
    const lines = table.text.split('\n');
    const rows: string[][] = [];
    let hasHeader = false;
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (/^\|(\s*:?-+:?\s*\|)+\s*$/.test(trimmed)) { hasHeader = true; continue; }
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            rows.push(trimmed.slice(1, -1).split('|').map(c => c.trim()));
        }
    }
    if (rows.length === 0) return false;

    const numCols = Math.max(...rows.map(r => r.length));
    const colWidths = new Array(numCols).fill(3);
    for (const row of rows) {
        for (let c = 0; c < row.length; c++) colWidths[c] = Math.max(colWidths[c], row[c].length);
    }

    const formatRow = (cells: string[]) => {
        const padded = cells.map((cell, i) => cell.padEnd(colWidths[i] || 3));
        while (padded.length < numCols) padded.push(' '.repeat(colWidths[padded.length] || 3));
        return `| ${padded.join(' | ')} |`;
    };

    const formattedLines: string[] = [];
    if (hasHeader && rows.length > 0) {
        formattedLines.push(formatRow(rows[0]));
        formattedLines.push(`| ${colWidths.map(w => '-'.repeat(w)).join(' | ')} |`);
        for (let i = 1; i < rows.length; i++) formattedLines.push(formatRow(rows[i]));
    } else {
        for (const row of rows) formattedLines.push(formatRow(row));
    }

    const formatted = formattedLines.join('\n');
    if (formatted === table.text) return false;

    view.dispatch({ changes: { from: table.from, to: table.to, insert: formatted } });
    return true;
}

export function addTableRow(view: EditorView): void {
    const table = findTableAtPosition(view, view.state.selection.main.from);
    if (!table) return;
    const lines = table.text.split('\n');
    const dataLines = lines.filter(l => !/^\|(\s*:?-+:?\s*\|)+\s*$/.test(l.trim()));
    const numCols = Math.max(...dataLines.map(l => l.split('|').filter((_, i, a) => i > 0 && i < a.length - 1).length));
    
    const cursorLine = view.state.doc.lineAt(view.state.selection.main.from);
    const newRow = `| ${Array(numCols).fill('  ').map(c => c.padEnd(3)).join(' | ')} |`;
    
    view.dispatch({
        changes: { from: cursorLine.to, insert: '\n' + newRow },
        selection: { anchor: cursorLine.to + 3 }
    });
}

export function removeTableRow(view: EditorView): void {
    const table = findTableAtPosition(view, view.state.selection.main.from);
    if (!table) return;
    const doc = view.state.doc;
    const cursorLine = doc.lineAt(view.state.selection.main.from);
    const lines = table.text.split('\n');
    const dataLines = lines.filter(l => !/^\|(\s*:?-+:?\s*\|)+\s*$/.test(l.trim()));
    if (dataLines.length <= 1) return;

    const from = cursorLine.from;
    const to = cursorLine.number < doc.lines ? cursorLine.to + 1 : cursorLine.to;
    view.dispatch({ changes: { from, to, insert: '' } });
}

export function addTableColumn(view: EditorView): void {
    const table = findTableAtPosition(view, view.state.selection.main.from);
    if (!table) return;
    const lines = table.text.split('\n');
    const cursorLine = view.state.doc.lineAt(view.state.selection.main.from);
    const cursorCol = view.state.selection.main.from - cursorLine.from;
    
    const cells = cursorLine.text.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
    let colIndex = 0, pos = 1;
    for (let i = 0; i < cells.length; i++) {
        const cellEnd = pos + cells[i].length + 1;
        if (cursorCol <= cellEnd) { colIndex = i; break; }
        pos = cellEnd;
        colIndex = i + 1;
    }

    const newLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('|')) return line;
        const isSep = /^\|(\s*:?-+:?\s*\|)+\s*$/.test(trimmed);
        const rowCells = trimmed.slice(1, -1).split('|');
        rowCells.splice(colIndex + 1, 0, isSep ? ' ---------- ' : ' New Cell   ');
        return '| ' + rowCells.join(' | ') + ' |';
    });
    view.dispatch({ changes: { from: table.from, to: table.to, insert: newLines.join('\n') } });
}

export function removeTableColumn(view: EditorView): void {
    const table = findTableAtPosition(view, view.state.selection.main.from);
    if (!table) return;
    const cursorLine = view.state.doc.lineAt(view.state.selection.main.from);
    const cursorCol = view.state.selection.main.from - cursorLine.from;
    const cells = cursorLine.text.split('|').filter((_, i, a) => i > 0 && i < a.length - 1);
    if (cells.length <= 1) return;

    let colIndex = 0, pos = 1;
    for (let i = 0; i < cells.length; i++) {
        const cellEnd = pos + cells[i].length + 1;
        if (cursorCol <= cellEnd) { colIndex = i; break; }
        pos = cellEnd;
        colIndex = i + 1;
    }

    const newLines = table.text.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed.startsWith('|')) return line;
        const rowCells = trimmed.slice(1, -1).split('|');
        if (colIndex >= rowCells.length) return line;
        rowCells.splice(colIndex, 1);
        return '| ' + rowCells.join(' | ') + ' |';
    });
    view.dispatch({ changes: { from: table.from, to: table.to, insert: newLines.join('\n') } });
}

export function insertTable(view: EditorView, rows: number = 3, cols: number = 3): void {
    const headerCells = Array.from({ length: cols }, (_, i) => `Header ${i + 1}`.padEnd(10));
    const separatorCells = Array.from({ length: cols }, () => '----------');
    const dataLines = Array.from({ length: rows }, () => `| ${Array(cols).fill('           ').join(' | ')} |`);
    const table = [`| ${headerCells.join(' | ')} |`, `| ${separatorCells.join(' | ')} |`, ...dataLines].join('\n');

    const { from } = view.state.selection.main;
    const line = view.state.doc.lineAt(from);
    let insertPos = line.from, prefix = '';
    if (line.text.trim().length > 0) { insertPos = line.to; prefix = '\n\n'; }

    view.dispatch({
        changes: { from: insertPos, insert: prefix + table + '\n' },
        selection: { anchor: insertPos + prefix.length + 3 }
    });
    view.focus();
}