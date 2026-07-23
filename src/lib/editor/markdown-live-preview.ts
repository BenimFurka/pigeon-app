import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { StateField, RangeSetBuilder } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { CursorAnchorWidget, MathWidget, TableWidget, HorizontalRuleWidget } from './markdown-widgets';


function hideMarkWidget(_markText: string): Decoration {
    return hiddenMarkStyle;
}

const boldStyle = Decoration.mark({ class: 'cm-md-bold' });
const italicStyle = Decoration.mark({ class: 'cm-md-italic' });
const strikeStyle = Decoration.mark({ class: 'cm-md-strike' });
const codeStyle = Decoration.mark({ class: 'cm-md-code' });
const spoilerStyle = Decoration.mark({ class: 'cm-md-spoiler' });
const underlineStyle = Decoration.mark({ class: 'cm-md-underline' });

const heading1Style = Decoration.mark({ class: 'cm-md-h1' });
const heading2Style = Decoration.mark({ class: 'cm-md-h2' });
const heading3Style = Decoration.mark({ class: 'cm-md-h3' });
const heading4Style = Decoration.mark({ class: 'cm-md-h4' });
const blockquoteStyle = Decoration.mark({ class: 'cm-md-blockquote' });
const listMarkerStyle = Decoration.mark({ class: 'cm-md-list-marker' });
const codeBlockStyle = Decoration.mark({ class: 'cm-md-code-block' });
const linkStyle = Decoration.mark({ class: 'cm-md-link' });
const hiddenMarkStyle = Decoration.mark({ class: 'cm-hidden-mark' });

const INLINE_NODES: Record<string, { style: Decoration; markSize: number }> = {
    'StrongEmphasis': { style: boldStyle, markSize: 2 },
    'Emphasis': { style: italicStyle, markSize: 1 },
    'Strikethrough': { style: strikeStyle, markSize: 2 },
    'InlineCode': { style: codeStyle, markSize: 1 },
    'Spoiler': { style: spoilerStyle, markSize: 2 },
    'Underline': { style: underlineStyle, markSize: 2 },
};

const HEADING_NODES: Record<string, Decoration> = {
    'ATXHeading1': heading1Style,
    'ATXHeading2': heading2Style,
    'ATXHeading3': heading3Style,
    'ATXHeading4': heading4Style,
    'ATXHeading5': heading4Style,
    'ATXHeading6': heading4Style,
};

function isCursorInsideRange(view: EditorView, from: number, to: number): boolean {
    const { from: selFrom, to: selTo } = view.state.selection.main;
    return selFrom > from && selTo < to;
}

function isCursorOnLine(view: EditorView, lineFrom: number, lineTo: number): boolean {
    const { from: selFrom } = view.state.selection.main;
    return selFrom >= lineFrom && selFrom <= lineTo;
}

function isCursorInRange(view: EditorView, from: number, to: number): boolean {
    const { from: selFrom, to: selTo } = view.state.selection.main;
    return selFrom >= from && selTo <= to;
}

function buildInlineDecorations(view: EditorView): DecorationSet {
    const ranges: { from: number; to: number; decoration: Decoration }[] = [];

    syntaxTree(view.state).iterate({
        enter: (node) => {
            const type = node.type.name;
            const from = node.from;
            const to = node.to;

            const inlineConfig = INLINE_NODES[type];
            if (inlineConfig) {
                const { style, markSize } = inlineConfig;
                const cursorInside = isCursorInsideRange(view, from, to);

                if (!cursorInside && markSize > 0) {
                    const openMark = view.state.doc.sliceString(from, from + markSize);
                    const closeMark = view.state.doc.sliceString(to - markSize, to);
                    ranges.push({ from, to: from + markSize, decoration: hideMarkWidget(openMark) });
                    ranges.push({ from: to - markSize, to, decoration: hideMarkWidget(closeMark) });
                }
                if (to - markSize > from + markSize) {
                    ranges.push({ from: from + markSize, to: to - markSize, decoration: style });
                }
                return;
            }

            if (type === 'InlineMath') {
                const cursorInside = isCursorInsideRange(view, from, to);
                if (!cursorInside) {
                    const latex = view.state.doc.sliceString(from + 1, to - 1).trim();
                    if (latex.length > 0) {
                        ranges.push({
                            from, to,
                            decoration: Decoration.replace({ widget: new MathWidget(latex) })
                        });
                    }
                }
                return;
            }

            const headingStyle = HEADING_NODES[type];
            if (headingStyle) {
                const line = view.state.doc.lineAt(from);
                const hashMatch = line.text.match(/^(#{1,6})\s*/);
                const cursorOnLine = isCursorOnLine(view, line.from, line.to);
                if (hashMatch && !cursorOnLine) {
                    ranges.push({ from, to: from + hashMatch[0].length, decoration: hideMarkWidget(hashMatch[0]) });
                }
                const markerEnd = hashMatch ? from + hashMatch[0].length : from;
                if (line.to > markerEnd) {
                    ranges.push({ from: markerEnd, to: line.to, decoration: headingStyle });
                }
                return;
            }

            if (type === 'Blockquote') {
                const doc = view.state.doc;
                let pos = from;
                while (pos < to) {
                    const line = doc.lineAt(pos);
                    const quoteMatch = line.text.match(/^(>\s*)/);
                    const cursorOnLine = isCursorOnLine(view, line.from, line.to);
                    if (quoteMatch) {
                        if (!cursorOnLine) {
                            ranges.push({
                                from: line.from,
                                to: line.from + quoteMatch[0].length,
                                decoration: hideMarkWidget(quoteMatch[0])
                            });
                        }
                        const contentStart = line.from + quoteMatch[0].length;
                        if (line.to > contentStart) {
                            ranges.push({ from: contentStart, to: line.to, decoration: blockquoteStyle });
                        }
                    }
                    pos = line.to + 1;
                }
                return;
            }

            if (type === 'ListItem') {
                const line = view.state.doc.lineAt(from);
                const listMatch = line.text.match(/^(\s*)([-*+]|\d+\.)\s/);
                if (listMatch) {
                    const markerStart = line.from + listMatch[1].length;
                    const markerEnd = markerStart + listMatch[2].length + 1;
                    ranges.push({ from: markerStart, to: markerEnd, decoration: listMarkerStyle });
                }
                return;
            }

            if (type === 'FencedCode') {
                const doc = view.state.doc;
                const cursorInside = isCursorInRange(view, from, to);
                const firstLine = doc.lineAt(from);
                const fenceMatch = firstLine.text.match(/^(`{3,}|~{3,})(.*)$/);

                if (fenceMatch && !cursorInside) {
                    ranges.push({ from: firstLine.from, to: firstLine.to, decoration: hideMarkWidget(firstLine.text) });
                    let pos = firstLine.to + 1;
                    while (pos < to) {
                        const line = doc.lineAt(pos);
                        if (line.text.match(/^(`{3,}|~{3,})\s*$/)) {
                            ranges.push({ from: line.from, to: line.to, decoration: hideMarkWidget(line.text) });
                            break;
                        }
                        pos = line.to + 1;
                    }
                }
                const contentStart = fenceMatch ? firstLine.to + 1 : from;
                if (to > contentStart) {
                    ranges.push({ from: contentStart, to, decoration: codeBlockStyle });
                }
                return;
            }


            if (type === 'Link') {
                const cursorInside = isCursorInsideRange(view, from, to);
                if (!cursorInside) {
                    const linkText = view.state.doc.sliceString(from, to);
                    const textMatch = linkText.match(/\[([^\]]+)\]\(([^)]+)\)/);
                    if (textMatch) {
                        const textContent = textMatch[1];
                        ranges.push({ 
                            from, 
                            to, 
                            decoration: Decoration.replace({ widget: new CursorAnchorWidget(textContent, 'cm-link-widget') }) 
                        });
                        ranges.push({ from, to, decoration: linkStyle });
                    }
                }
                return;
            }

        }
    });

    ranges.sort((a, b) => a.from - b.from || a.to - b.to);
    const builder = new RangeSetBuilder<Decoration>();
    for (const r of ranges) builder.add(r.from, r.to, r.decoration);
    return builder.finish();
}

export const markdownLivePreview = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
            this.decorations = buildInlineDecorations(view);
        }
        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet) {
                this.decorations = buildInlineDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

function buildBlockDecorations(view: EditorView): DecorationSet {
    const ranges: { from: number; to: number; decoration: Decoration }[] = [];

    syntaxTree(view.state).iterate({
        enter: (node) => {
            if (node.type.name === 'Table') {
                const from = node.from;
                const to = node.to;
                const cursorInside = isCursorInRange(view, from, to);

                if (!cursorInside) {
                    const tableText = view.state.doc.sliceString(from, to);
                    const dataRows = tableText.split('\n').filter(
                        l => l.trim().startsWith('|') && !/^\|(\s*:?-+:?\s*\|)+\s*$/.test(l.trim())
                    );
                    if (dataRows.length > 0) {
                        ranges.push({
                            from,
                            to,
                            decoration: Decoration.replace({
                                widget: new TableWidget(tableText),
                                block: true
                            })
                        });
                    }
                }
            }

            if (node.type.name === 'HorizontalRule') {
                const from = node.from;
                const to = node.to;
                const line = view.state.doc.lineAt(from);
                const cursorOnLine = isCursorOnLine(view, line.from, line.to);
                
                if (!cursorOnLine) {
                    ranges.push({
                        from,
                        to,
                        decoration: Decoration.replace({
                            widget: new HorizontalRuleWidget(),
                            block: true
                        })
                    });
                }
            }
        }
    });

    ranges.sort((a, b) => a.from - b.from || a.to - b.to);
    const builder = new RangeSetBuilder<Decoration>();
    for (const r of ranges) builder.add(r.from, r.to, r.decoration);
    return builder.finish();
}

export const markdownBlockPreview = StateField.define<DecorationSet>({
    create(state) {
        return buildBlockDecorationsFromState(state);
    },
    update(value, tr) {
        if (tr.docChanged || tr.selection) {
            return buildBlockDecorationsFromState(tr.state);
        }
        return value.map(tr.changes);
    },
    provide: (f) => EditorView.decorations.from(f)
});
function buildBlockDecorationsFromState(state: import('@codemirror/state').EditorState): DecorationSet {
    const ranges: { from: number; to: number; decoration: Decoration }[] = [];

    syntaxTree(state).iterate({
        enter: (node) => {
            if (node.type.name === 'Table') {
                const from = node.from;
                const to = node.to;
                
                const tableText = state.doc.sliceString(from, to);
                const dataRows = tableText.split('\n').filter(
                    l => l.trim().startsWith('|') && !/^\|(\s*:?-+:?\s*\|)+\s*$/.test(l.trim())
                );
                
                if (dataRows.length > 0) {
                    ranges.push({
                        from,
                        to,
                        decoration: Decoration.replace({
                            widget: new TableWidget(tableText),
                            block: true
                        })
                    });
                }
            }

            if (node.type.name === 'HorizontalRule') {
                const from = node.from;
                const to = node.to;
                const line = state.doc.lineAt(from);
                const { from: selFrom, to: selTo } = state.selection.main;
                const cursorOnLine = selFrom >= line.from && selFrom <= line.to;
                
                if (!cursorOnLine) {
                    ranges.push({
                        from,
                        to,
                        decoration: Decoration.replace({
                            widget: new HorizontalRuleWidget(),
                            block: true
                        })
                    });
                }
            }
        }
    });

    ranges.sort((a, b) => a.from - b.from || a.to - b.to);
    const builder = new RangeSetBuilder<Decoration>();
    for (const r of ranges) builder.add(r.from, r.to, r.decoration);
    return builder.finish();
}