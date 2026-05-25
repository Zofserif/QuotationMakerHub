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

        if (isListBlock(block)) {
          return <MarkdownList align={block.align} key={index} list={block} />;
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
  | (MarkdownListBlock & { align: MarkdownAlign });

type MarkdownListType = "ordered-list" | "unordered-list";

type MarkdownListBlock = {
  items: MarkdownListItem[];
  type: MarkdownListType;
};

type MarkdownListItem = {
  children: MarkdownListBlock[];
  text: string;
  value?: number;
};

type ParsedListItem = {
  indent: number;
  text: string;
  type: MarkdownListType;
  value?: number;
};

type ListStackEntry = {
  block: MarkdownListBlock;
  indent: number;
  parentItem: MarkdownListItem | null;
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

    const listItem = parseListItem(line);

    if (listItem) {
      flushParagraph();
      const items = [listItem];

      while (index + 1 < lines.length) {
        const next = parseListItem(lines[index + 1]);

        if (!next) {
          break;
        }

        items.push(next);
        index += 1;
      }

      blocks.push(
        ...parseListBlocks(items).map((block) => ({
          ...block,
          align: currentAlign,
        })),
      );
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();

  return blocks;
}

function parseListItem(line: string): ParsedListItem | null {
  const unordered = /^([ \t]*)[-*]\s+(.+)$/.exec(line);

  if (unordered) {
    return {
      indent: getIndentColumns(unordered[1]),
      text: unordered[2].trimEnd(),
      type: "unordered-list",
    };
  }

  const ordered = /^([ \t]*)(\d+)\.\s+(.+)$/.exec(line);

  if (ordered) {
    return {
      indent: getIndentColumns(ordered[1]),
      text: ordered[3].trimEnd(),
      type: "ordered-list",
      value: Number.parseInt(ordered[2], 10),
    };
  }

  return null;
}

function parseListBlocks(items: ParsedListItem[]): MarkdownListBlock[] {
  const blocks: MarkdownListBlock[] = [];
  const stack: ListStackEntry[] = [];

  for (const item of items) {
    const targetIndent = getTargetIndent(item.indent, stack);
    const current = stack.at(-1);
    let block: MarkdownListBlock;

    if (!current) {
      block = createListBlock(item.type);
      blocks.push(block);
      stack.push({ block, indent: targetIndent, parentItem: null });
    } else if (targetIndent > current.indent) {
      const parentItem = current.block.items.at(-1);

      if (parentItem) {
        block = createListBlock(item.type);
        parentItem.children.push(block);
        stack.push({ block, indent: targetIndent, parentItem });
      } else {
        block = current.block;
      }
    } else if (targetIndent === current.indent && current.block.type === item.type) {
      block = current.block;
    } else {
      block = createListBlock(item.type);

      if (current.parentItem) {
        current.parentItem.children.push(block);
      } else {
        blocks.push(block);
      }

      stack[stack.length - 1] = {
        block,
        indent: targetIndent,
        parentItem: current.parentItem,
      };
    }

    block.items.push({
      children: [],
      text: item.text,
      value: item.value,
    });
  }

  return blocks;
}

function getTargetIndent(indent: number, stack: ListStackEntry[]) {
  while (stack.length > 0 && indent < stack[stack.length - 1].indent) {
    stack.pop();
  }

  const current = stack.at(-1);

  if (current && indent > current.indent && indent - current.indent < 2) {
    return current.indent;
  }

  return indent;
}

function createListBlock(type: MarkdownListType): MarkdownListBlock {
  return { items: [], type };
}

function getIndentColumns(value: string) {
  let columns = 0;

  for (const character of value) {
    columns += character === "\t" ? 4 : 1;
  }

  return columns;
}

function isListBlock(block: MarkdownBlock): block is MarkdownListBlock & {
  align: MarkdownAlign;
} {
  return block.type === "ordered-list" || block.type === "unordered-list";
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

function MarkdownList({
  align,
  list,
  nested = false,
}: {
  align: MarkdownAlign;
  list: MarkdownListBlock;
  nested?: boolean;
}) {
  const List = list.type === "ordered-list" ? "ol" : "ul";

  return (
    <List
      className={cn(
        list.type === "ordered-list" ? "list-decimal" : "list-disc",
        nested ? "mt-1 space-y-0.5" : "space-y-1",
        listClass(align),
      )}
    >
      {list.items.map((item, itemIndex) => (
        <li
          className={alignClass(align)}
          key={itemIndex}
          value={list.type === "ordered-list" ? item.value : undefined}
        >
          <InlineMarkdown value={item.text} />
          {item.children.map((child, childIndex) => (
            <MarkdownList
              align={align}
              key={childIndex}
              list={child}
              nested
            />
          ))}
        </li>
      ))}
    </List>
  );
}

function InlineMarkdown({ value }: { value: string }) {
  const segments = value.split(
    /(`[^`]+`|\*\*[^*]+\*\*|~~[^~]+~~|<u>[^<]+<\/u>|<sup>[^<]+<\/sup>|<sub>[^<]+<\/sub>|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g,
  );

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

        if (segment.startsWith("~~") && segment.endsWith("~~")) {
          return <s key={index}>{segment.slice(2, -2)}</s>;
        }

        if (segment.startsWith("<u>") && segment.endsWith("</u>")) {
          return <u key={index}>{segment.slice(3, -4)}</u>;
        }

        if (segment.startsWith("<sup>") && segment.endsWith("</sup>")) {
          return <sup key={index}>{segment.slice(5, -6)}</sup>;
        }

        if (segment.startsWith("<sub>") && segment.endsWith("</sub>")) {
          return <sub key={index}>{segment.slice(5, -6)}</sub>;
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
