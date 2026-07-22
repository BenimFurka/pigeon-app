import { WidgetType } from '@codemirror/view';
import katex from 'katex';
import 'katex/dist/katex.min.css';

export class CursorAnchorWidget extends WidgetType {
    constructor(readonly markText: string, readonly className: string = 'cm-cursor-anchor') {
        super();
    }

    toDOM() {
        const span = document.createElement('span');
        span.className = this.className;
        span.textContent = this.markText;
        return span;
    }

    eq(other: CursorAnchorWidget) {
        return other.markText === this.markText && other.className === this.className;
    }

    ignoreEvent() {
        return false;
    }

    get estimatedHeight() {
        return 0;
    }
}

export class MathWidget extends WidgetType {
    constructor(readonly latex: string) {
        super();
    }

    toDOM() {
        const span = document.createElement('span');
        span.className = 'cm-math-widget';
        try {
            katex.render(this.latex, span, {
                throwOnError: false,
                displayMode: false,
                output: 'html'
            });
        } catch {
            span.textContent = `$${this.latex}$`;
            span.classList.add('cm-math-error');
        }
        return span;
    }

    eq(other: MathWidget) {
        return other.latex === this.latex;
    }

    ignoreEvent() {
        return false;
    }

    destroy(dom: HTMLElement) {
        dom.innerHTML = '';
    }
}

export class HorizontalRuleWidget extends WidgetType {
    toDOM() {
        const container = document.createElement('div');
        container.className = 'cm-hr-widget-container';
        container.style.display = 'block';
        container.style.height = '1.5em';
        container.style.position = 'relative';
        
        const hr = document.createElement('hr');
        hr.className = 'cm-hr-widget';
        hr.style.position = 'absolute';
        hr.style.top = '50%';
        hr.style.left = '0';
        hr.style.right = '0';
        hr.style.margin = '0';
        
        container.appendChild(hr);
        return container;
    }

    eq(other: HorizontalRuleWidget) {
        return true;
    }

    ignoreEvent() {
        return true;
    }
}

export class TableWidget extends WidgetType {
    constructor(readonly tableText: string) {
        super();
    }

    toDOM() {
        const container = document.createElement('div');
        container.className = 'cm-table-widget';
        container.style.display = 'block';
        container.style.width = '100%';

        const lines = this.tableText.split('\n');
        const rows: string[][] = [];
        let hasHeader = false;

        for (const line of lines) {
            const trimmed = line.trim();
            if (/^\|(\s*:?-+:?\s*\|)+\s*$/.test(trimmed)) {
                hasHeader = true;
                continue;
            }
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                rows.push(trimmed.slice(1, -1).split('|').map(c => c.trim()));
            }
        }

        if (rows.length === 0) {
            container.textContent = this.tableText;
            return container;
        }

        const table = document.createElement('table');
        table.className = 'markdown-table';
        const numCols = Math.max(...rows.map(r => r.length));

        if (hasHeader && rows.length > 0) {
            const thead = document.createElement('thead');
            const tr = document.createElement('tr');
            for (let c = 0; c < numCols; c++) {
                const th = document.createElement('th');
                th.contentEditable = 'true';
                th.textContent = rows[0][c] || '';
                th.dataset.row = '0';
                th.dataset.col = String(c);
                th.addEventListener('blur', () => {
                    const event = new CustomEvent('table-cell-update', {
                        detail: {
                            row: 0,
                            col: c,
                            text: th.textContent || ''
                        },
                        bubbles: true
                    });
                    container.dispatchEvent(event);
                });
                tr.appendChild(th);
            }
            thead.appendChild(tr);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            for (let r = 1; r < rows.length; r++) {
                const tr = document.createElement('tr');
                for (let c = 0; c < numCols; c++) {
                    const td = document.createElement('td');
                    td.contentEditable = 'true';
                    td.textContent = rows[r][c] || '';
                    td.dataset.row = String(r);
                    td.dataset.col = String(c);
                    td.addEventListener('blur', () => {
                        const event = new CustomEvent('table-cell-update', {
                            detail: {
                                row: r,
                                col: c,
                                text: td.textContent || ''
                            },
                            bubbles: true
                        });
                        container.dispatchEvent(event);
                    });
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
        } else {
            const tbody = document.createElement('tbody');
            for (let r = 0; r < rows.length; r++) {
                const tr = document.createElement('tr');
                for (let c = 0; c < numCols; c++) {
                    const td = document.createElement('td');
                    td.contentEditable = 'true';
                    td.textContent = rows[r][c] || '';
                    td.dataset.row = String(r);
                    td.dataset.col = String(c);
                    td.addEventListener('blur', () => {
                        const event = new CustomEvent('table-cell-update', {
                            detail: {
                                row: r,
                                col: c,
                                text: td.textContent || ''
                            },
                            bubbles: true
                        });
                        container.dispatchEvent(event);
                    });
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
            table.appendChild(tbody);
        }

        container.appendChild(table);
        return container;
    }

    eq(other: TableWidget) {
        return other.tableText === this.tableText;
    }

    ignoreEvent() {
        return false;
    }

    destroy(dom: HTMLElement) {
        dom.innerHTML = '';
    }
}