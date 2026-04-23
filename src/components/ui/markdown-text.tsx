import { cn } from "@/lib/utils";

export function MarkdownText({
  value,
  className,
}: {
  value?: string;
  className?: string;
}) {
  const blocks = parseBlocks(value ?? "");

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2 text-sm leading-6", className)}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading = `h${block.level}` as "h2" | "h3" | "h4";

          return (
            <Heading className="font-semibold text-stone-950" key={index}>
              <InlineMarkdown value={block.text} />
            </Heading>
          );
        }

        if (block.type === "unordered-list") {
          return (
            <ul className="list-disc space-y-1 pl-5" key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineMarkdown value={item} />
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol className="list-decimal space-y-1 pl-5" key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>
                  <InlineMarkdown value={item} />
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p className="whitespace-pre-wrap" key={index}>
            <InlineMarkdown value={block.text} />
          </p>
        );
      })}
    </div>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] };

function parseBlocks(value: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = value.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];

  function flushParagraph() {
    if (paragraph.length > 0) {
      blocks.push({ type: "paragraph", text: paragraph.join("\n") });
      paragraph = [];
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    const heading = /^(#{1,4})\s+(.+)$/.exec(trimmed);

    if (heading) {
      flushParagraph();
      blocks.push({
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

      blocks.push({ type: "unordered-list", items });
      continue;
    }

    const ordered = /^\d+\.\s+(.+)$/.exec(trimmed);

    if (ordered) {
      flushParagraph();
      const items = [ordered[1]];

      while (index + 1 < lines.length) {
        const next = /^\d+\.\s+(.+)$/.exec(lines[index + 1].trim());

        if (!next) {
          break;
        }

        items.push(next[1]);
        index += 1;
      }

      blocks.push({ type: "ordered-list", items });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  return blocks;
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
