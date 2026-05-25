"use client";

import {
  AlignCenter,
  Bold,
  Code2,
  Eraser,
  Eye,
  EyeOff,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
} from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import {
  MarkdownText,
  markdownTextareaPlaceholder,
} from "@/components/ui/markdown-text";
import { cn } from "@/lib/utils";

type MarkdownEditorProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value"
> & {
  onValueChange: (value: string) => void;
  previewDefaultOpen?: boolean;
  value: string;
};

type SelectionRange = {
  end: number;
  start: number;
};

type HeadingLevel = "normal" | "2" | "3" | "4";

const maxHistoryLength = 100;
const textareaClassName =
  "min-h-28 w-full border-0 bg-white px-3 py-2 text-sm text-stone-950 outline-none disabled:cursor-not-allowed disabled:bg-stone-100";
const toolbarButtonClassName =
  "inline-flex size-8 items-center justify-center rounded-sm text-stone-700 transition hover:bg-stone-100 disabled:pointer-events-none disabled:opacity-40 data-[active=true]:bg-stone-200 data-[active=true]:text-stone-950";

export function MarkdownEditor({
  className,
  disabled,
  onKeyDown,
  onValueChange,
  placeholder = markdownTextareaPlaceholder,
  previewDefaultOpen = false,
  readOnly,
  value,
  ...props
}: MarkdownEditorProps) {
  const previewId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [previewOpen, setPreviewOpen] = useState(previewDefaultOpen);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const toolbarDisabled = Boolean(disabled || readOnly);
  const currentHeading = getCurrentHeading(value, getSelection());

  function getSelection(): SelectionRange {
    const textarea = textareaRef.current;

    if (!textarea) {
      return { end: value.length, start: value.length };
    }

    return {
      end: textarea.selectionEnd,
      start: textarea.selectionStart,
    };
  }

  function focusSelection(selection: SelectionRange) {
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(selection.start, selection.end);
    });
  }

  function recordHistory(previousValue: string) {
    setUndoStack((current) =>
      [...current, previousValue].slice(-maxHistoryLength),
    );
    setRedoStack([]);
  }

  function commitValue(
    nextValue: string,
    nextSelection: SelectionRange,
    record = true,
  ) {
    if (toolbarDisabled) {
      return;
    }

    if (nextValue !== value) {
      if (record) {
        recordHistory(value);
      }

      onValueChange(nextValue);
    }

    focusSelection(nextSelection);
  }

  function handleTextareaChange(nextValue: string) {
    if (nextValue !== value) {
      recordHistory(value);
      onValueChange(nextValue);
    }
  }

  function applyInline(prefix: string, suffix = prefix, fallback = "text") {
    const selection = getSelection();
    const selectedText = value.slice(selection.start, selection.end);
    const content = selectedText || fallback;
    const replacement = `${prefix}${content}${suffix}`;
    const nextValue = replaceRange(value, selection, replacement);
    const contentStart = selection.start + prefix.length;

    commitValue(nextValue, {
      end: contentStart + content.length,
      start: contentStart,
    });
  }

  function applyLink() {
    const selection = getSelection();
    const selectedText = value.slice(selection.start, selection.end);
    const linkText = selectedText || "link text";
    const url = "https://example.com";
    const replacement = `[${linkText}](${url})`;
    const nextValue = replaceRange(value, selection, replacement);
    const urlStart = selection.start + linkText.length + 3;

    commitValue(nextValue, {
      end: urlStart + url.length,
      start: urlStart,
    });
  }

  function applyHeading(level: HeadingLevel) {
    const lineRange = getSelectedLineRange(value, getSelection());
    const selectedBlock = value.slice(lineRange.start, lineRange.end);
    const replacement = transformHeading(selectedBlock, level);
    const nextValue = replaceRange(value, lineRange, replacement);

    commitValue(nextValue, {
      end: lineRange.start + replacement.length,
      start: lineRange.start,
    });
  }

  function applyList(type: "ordered" | "unordered") {
    const lineRange = getSelectedLineRange(value, getSelection());
    const selectedBlock = value.slice(lineRange.start, lineRange.end);
    const replacement = transformList(selectedBlock, type);
    const nextValue = replaceRange(value, lineRange, replacement);

    commitValue(nextValue, {
      end: lineRange.start + replacement.length,
      start: lineRange.start,
    });
  }

  function applyCenter() {
    const selection = getSelection();
    const selectedText = value.slice(selection.start, selection.end);
    const content = selectedText || "Centered text";
    const replacement = `:::center\n${content}\n:::`;
    const nextValue = replaceRange(value, selection, replacement);
    const contentStart = selection.start + ":::center\n".length;

    commitValue(nextValue, {
      end: contentStart + content.length,
      start: contentStart,
    });
  }

  function clearFormatting() {
    const selection = getSelection();
    const range =
      selection.start === selection.end
        ? getSelectedLineRange(value, selection)
        : selection;
    const selectedText = value.slice(range.start, range.end);
    const replacement = removeMarkdownFormatting(selectedText);
    const nextValue = replaceRange(value, range, replacement);

    commitValue(nextValue, {
      end: range.start + replacement.length,
      start: range.start,
    });
  }

  function undo() {
    const previousValue = undoStack.at(-1);

    if (!previousValue) {
      return;
    }

    setUndoStack((current) => current.slice(0, -1));
    setRedoStack((current) => [...current, value].slice(-maxHistoryLength));
    onValueChange(previousValue);
    focusSelection({
      end: previousValue.length,
      start: previousValue.length,
    });
  }

  function redo() {
    const nextValue = redoStack.at(-1);

    if (!nextValue) {
      return;
    }

    setRedoStack((current) => current.slice(0, -1));
    setUndoStack((current) => [...current, value].slice(-maxHistoryLength));
    onValueChange(nextValue);
    focusSelection({
      end: nextValue.length,
      start: nextValue.length,
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);

    if (event.defaultPrevented || toolbarDisabled) {
      return;
    }

    const usesShortcut = event.metaKey || event.ctrlKey;

    if (!usesShortcut) {
      return;
    }

    if (event.key.toLowerCase() === "b") {
      event.preventDefault();
      applyInline("**");
    }

    if (event.key.toLowerCase() === "i") {
      event.preventDefault();
      applyInline("*");
    }

    if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      applyLink();
    }
  }

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-white focus-within:border-stone-400 focus-within:ring-4 focus-within:ring-stone-100">
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-stone-50 px-2 py-1.5">
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Bold"
          onClick={() => applyInline("**")}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Italic"
          onClick={() => applyInline("*")}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Underline"
          onClick={() => applyInline("<u>", "</u>")}
        >
          <Underline className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Strikethrough"
          onClick={() => applyInline("~~")}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Inline code"
          onClick={() => applyInline("`")}
        >
          <Code2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Superscript"
          onClick={() => applyInline("<sup>", "</sup>")}
        >
          <Superscript className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Subscript"
          onClick={() => applyInline("<sub>", "</sub>")}
        >
          <Subscript className="size-4" />
        </ToolbarButton>

        <Separator />

        <select
          aria-label="Heading style"
          className="h-8 rounded-sm border border-stone-200 bg-white px-2 text-xs font-medium text-stone-800 outline-none transition hover:bg-stone-100 focus:border-stone-400 disabled:pointer-events-none disabled:opacity-40"
          disabled={toolbarDisabled}
          value={currentHeading}
          onChange={(event) => applyHeading(event.target.value as HeadingLevel)}
        >
          <option value="normal">Normal</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
          <option value="4">Heading 4</option>
        </select>

        <Separator />

        <ToolbarButton
          disabled={toolbarDisabled}
          label="Bulleted list"
          onClick={() => applyList("unordered")}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Numbered list"
          onClick={() => applyList("ordered")}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Center align"
          onClick={applyCenter}
        >
          <AlignCenter className="size-4" />
        </ToolbarButton>

        <Separator />

        <ToolbarButton
          disabled={toolbarDisabled}
          label="Link"
          onClick={applyLink}
        >
          <Link className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled}
          label="Clear formatting"
          onClick={clearFormatting}
        >
          <Eraser className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled || undoStack.length === 0}
          label="Undo"
          onClick={undo}
        >
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={toolbarDisabled || redoStack.length === 0}
          label="Redo"
          onClick={redo}
        >
          <Redo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={previewOpen}
          ariaControls={previewId}
          label={previewOpen ? "Hide preview" : "Show preview"}
          onClick={() => setPreviewOpen((current) => !current)}
        >
          {previewOpen ? (
            <EyeOff className="size-4" />
          ) : (
            <Eye className="size-4" />
          )}
        </ToolbarButton>
      </div>

      <textarea
        className={cn(textareaClassName, className)}
        disabled={disabled}
        placeholder={placeholder}
        readOnly={readOnly}
        ref={textareaRef}
        value={value}
        onChange={(event) => handleTextareaChange(event.target.value)}
        onKeyDown={handleKeyDown}
        {...props}
      />

      {previewOpen ? (
        <div
          className="border-t border-stone-200 bg-stone-50 p-3"
          id={previewId}
        >
          {value.trim() ? (
            <MarkdownText className="text-stone-700" value={value} />
          ) : (
            <p className="text-sm text-stone-500">Nothing to preview yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ToolbarButton({
  active = false,
  ariaControls,
  children,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  ariaControls?: string;
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-controls={ariaControls}
      aria-label={label}
      aria-pressed={active || undefined}
      className={toolbarButtonClassName}
      data-active={active}
      disabled={disabled}
      title={label}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px bg-stone-200" />;
}

function replaceRange(
  value: string,
  range: SelectionRange,
  replacement: string,
) {
  return value.slice(0, range.start) + replacement + value.slice(range.end);
}

function getSelectedLineRange(
  value: string,
  selection: SelectionRange,
): SelectionRange {
  const adjustedEnd =
    selection.end > selection.start && value[selection.end - 1] === "\n"
      ? selection.end - 1
      : selection.end;
  const start = value.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const nextLineBreak = value.indexOf("\n", adjustedEnd);

  return {
    end: nextLineBreak === -1 ? value.length : nextLineBreak,
    start,
  };
}

function getCurrentHeading(
  value: string,
  selection: SelectionRange,
): HeadingLevel {
  const lineRange = getSelectedLineRange(value, selection);
  const line = value.slice(lineRange.start, lineRange.end).trimStart();
  const heading = /^(#{1,4})\s/.exec(line);

  if (!heading) {
    return "normal";
  }

  const level = Math.max(2, Math.min(4, heading[1].length));

  return String(level) as HeadingLevel;
}

function transformHeading(value: string, level: HeadingLevel) {
  if (!value.trim() && level !== "normal") {
    return `${"#".repeat(Number(level))} `;
  }

  return value
    .split("\n")
    .map((line) => {
      const stripped = line.replace(/^\s{0,3}#{1,4}\s+/, "");

      if (level === "normal" || !stripped.trim()) {
        return stripped;
      }

      return `${"#".repeat(Number(level))} ${stripped}`;
    })
    .join("\n");
}

function transformList(value: string, type: "ordered" | "unordered") {
  if (!value.trim()) {
    return type === "ordered" ? "1. " : "- ";
  }

  let itemIndex = 1;

  return value
    .split("\n")
    .map((line) => {
      if (!line.trim()) {
        return line;
      }

      const stripped = line.replace(/^([ \t]*)(?:[-*]|\d+\.)\s+/, "$1");
      const [, indent = "", text = ""] = /^([ \t]*)(.*)$/.exec(stripped) ?? [];
      const prefix = type === "ordered" ? `${itemIndex}. ` : "- ";

      itemIndex += 1;

      return `${indent}${prefix}${text}`;
    })
    .join("\n");
}

function removeMarkdownFormatting(value: string) {
  return value
    .replace(/^:::center\n?/gm, "")
    .replace(/\n?:::$/gm, "")
    .replace(/^([ \t]*)#{1,4}\s+/gm, "$1")
    .replace(/^([ \t]*)(?:[-*]|\d+\.)\s+/gm, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/<u>([^<]+)<\/u>/g, "$1")
    .replace(/<sup>([^<]+)<\/sup>/g, "$1")
    .replace(/<sub>([^<]+)<\/sub>/g, "$1");
}
