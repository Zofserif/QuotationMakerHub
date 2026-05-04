import { cn } from "@/lib/utils";

export const markdownTextareaPlaceholder =
  "Markdown supported. Center text with:\n:::center\nCentered text\n:::";

export function MarkdownFormatHint() {
  return (
    <p className="text-xs leading-5 text-stone-500">
      Use Markdown. Center a block with <code>:::center</code> and close it
      with <code>:::</code>.
    </p>
  );
}

export function MarkdownText({
  value,
  className,
  defaultAlign = "justify",
}: {
  value?: string;
  className?: string;
  defaultAlign?: MarkdownDefaultAlign;
}) {
  const blocks = parseBlocks(value ?? "", defaultAlign);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2 text-sm leading-6", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading = `h${block.level}` as "h2" | "h3" | "h4";

          return (
            <Heading
              className={cn("font-semibold text-stone-950", alignClass(block.align))}
              key={index}
            >
              <InlineMarkdown value={block.text} />
            </Heading>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul
              className={cn("list-disc space-y-1", listClass(block.align))}
              key={index}
            >
              {block.items.map((item, itemIndex) => (
                <li className={alignClass(block.align)} key={itemIndex}>
                  <InlineMarkdown value={item} />
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol
              className={cn("list-decimal space-y-1", listClass(block.align))}
              key={index}
            >
              {block.items.map((item, itemIndex) => (
                <li
                  className={alignClass(block.align)}
                  key={itemIndex}
                  value={item.value}
                >
                  <InlineMarkdown value={item.text} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p
            className={cn("whitespace-pre-wrap", alignClass(block.align))}
            key={index}
          >
            <InlineMarkdown value={block.text} />
          </p>
        );
      })}
    </div>
  );
}

type MarkdownDefaultAlign = "justify" | "left";
type MarkdownAlign = MarkdownDefaultAlign | "center";

type MarkdownBlock =
  | { align: MarkdownAlign; type: "heading"; level: 2 | 3 | 4; text: string }
  | { align: MarkdownAlign; type: "paragraph"; text: string }
  | { align: MarkdownAlign; type: "unordered-list"; items: string[] }
  | { align: MarkdownAlign; type: "ordered-list"; items: OrderedListItem[] };

type OrderedListItem = {
  text: string;
  value: number;
};

function parseBlocks(
  value: string,
  defaultAlign: MarkdownDefaultAlign,
): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let currentAlign: MarkdownAlign = defaultAlign;

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push({
        align: currentAlign,
        type: "paragraph",
        text: paragraph.join("\n"),
      });
      paragraph = [];
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === ":::center") {
      flushParagraph();
      currentAlign = "center";
      continue;
    }

    if (trimmed === ":::" && currentAlign === "center") {
      flushParagraph();
      currentAlign = defaultAlign;
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);

    if (heading) {
      flushParagraph();
      blocks.push({
        align: currentAlign,
        type: "heading",
        level: Math.max(2, Math.min(4, heading[1].length)) as 2 | 3 | 4,
        text: heading[2],
      });
      continue;
    }

    const unordered = /^[-*]\s+(.+)$/.exec(trimmed);

    if (unordered) {
      flushParagraph();
      const items = [unordered[1]];

      while (index + 1 < lines.length) {
        const next = /^[-*]\s+(.+)$/.exec(lines[index + 1].trim());

        if (!next) {
          break;
        }

        items.push(next[1]);
        index += 1;
      }

      blocks.push({ align: currentAlign, type: "unordered-list", items });
      continue;
    }

    const ordered = /^(\d+)\.\s+(.+)$/.exec(trimmed);

    if (ordered) {
      flushParagraph();
      const items = [
        {
          text: ordered[2],
          value: Number.parseInt(ordered[1], 10),
        },
      ];

      while (index + 1 < lines.length) {
        const next = /^(\d+)\.\s+(.+)$/.exec(lines[index + 1].trim());

        if (!next) {
          break;
        }

        items.push({
          text: next[2],
          value: Number.parseInt(next[1], 10),
        });
        index += 1;
      }

      blocks.push({ align: currentAlign, type: "ordered-list", items });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  return blocks;
}

function alignClass(align: MarkdownAlign) {
  if (align === "center") {
    return "text-center";
  }

  return align === "left" ? "text-left" : "text-justify";
}

function listClass(align: MarkdownAlign) {
  return align === "center" ? "list-inside pl-0" : "pl-5";
}

function InlineMarkdown({ value }: { value: string }) {
  const segments = value.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g);

  return (
    <>
      {segments.map((segment, index) => {
        if (!segment) {
          return null;
        }

        if (segment.startsWith("`") && segment.endsWith("`")) {
          return (
            <code
              className="rounded bg-stone-100 px-1 py-0.5 text-[0.9em] text-stone-900"
              key={index}
            >
              {segment.slice(1, -1)}
            </code>
          );
        }

        if (segment.startsWith("**") && segment.endsWith("**")) {
          return <strong key={index}>{segment.slice(2, -2)}</strong>;
        }

        if (segment.startsWith("*") && segment.endsWith("*")) {
          return <em key={index}>{segment.slice(1, -1)}</em>;
        }

        const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(segment);

        if (link && isSafeHref(link[2])) {
          return (
            <a
              className="font-medium text-stone-950 underline underline-offset-2"
              href={link[2]}
              key={index}
              rel="noreferrer"
              target="_blank"
            >
              {link[1]}
            </a>
          );
        }

        return segment;
      })}
    </>
  );
}

function isSafeHref(value: string) {
  return (
    value.startsWith("https://") ||
    value.startsWith("http://") ||
    value.startsWith("mailto:")
  );
}
