import type { MarkdownExtension, InlineContext } from '@lezer/markdown';

function inlineMarkParser(mark: string, nodeName: string): MarkdownExtension {
    const codes = [...mark].map(c => c.charCodeAt(0));
    const markLen = mark.length;

    return {
        defineNodes: [{ name: nodeName }],
        parseInline: [{
            name: nodeName,
            parse(cx: InlineContext, _next: number, pos: number): number {
                for (let i = 0; i < markLen; i++) {
                    if (cx.char(pos + i) !== codes[i]) return -1;
                }

                const start = pos + markLen;
                let end = start;

                while (end <= cx.end - markLen) {
                    if (cx.char(end) === 10) return -1;

                    let match = true;
                    for (let i = 0; i < markLen; i++) {
                        if (cx.char(end + i) !== codes[i]) {
                            match = false;
                            break;
                        }
                    }

                    if (match && end > start) {
                        const endPos = end + markLen;
                        return cx.addElement(cx.elt(nodeName, pos, endPos));
                    }
                    end++;
                }
                return -1;
            }
        }]
    };
}

export const spoilerExtension = inlineMarkParser('||', 'Spoiler');
export const underlineExtension = inlineMarkParser('++', 'Underline');
export const inlineMathExtension = inlineMarkParser('$', 'InlineMath');