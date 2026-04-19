import React from "react";

// Code block: ```...```
const CODE_BLOCK_REGEX = /```([\s\S]*?)```/g;
// Inline code: `...`
const INLINE_CODE_REGEX = /`([^`]+)`/g;

export function formatMessage(text: string): React.ReactNode[] {
  // Process in order: code blocks first (protect from other formatting)
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Split by code blocks first
  const codeBlockParts = text.split(CODE_BLOCK_REGEX);

  for (let i = 0; i < codeBlockParts.length; i++) {
    if (i % 2 === 1) {
      // This is inside a code block
      parts.push(
        <pre key={key++} className="msg-code-block">
          <code>{codeBlockParts[i].trim()}</code>
        </pre>
      );
    } else {
      // Regular text — apply inline formatting
      const inlineParts = formatInline(codeBlockParts[i], key);
      parts.push(...inlineParts.nodes);
      key = inlineParts.nextKey;
    }
  }

  return parts;
}

function formatInline(
  text: string,
  startKey: number
): { nodes: React.ReactNode[]; nextKey: number } {
  // Split by inline code first
  const nodes: React.ReactNode[] = [];
  let key = startKey;
  const inlineCodeParts = text.split(INLINE_CODE_REGEX);

  for (let i = 0; i < inlineCodeParts.length; i++) {
    if (i % 2 === 1) {
      nodes.push(
        <code key={key++} className="msg-inline-code">
          {inlineCodeParts[i]}
        </code>
      );
    } else {
      // Apply bold, italic, links
      const formatted = applyTextFormatting(inlineCodeParts[i], key);
      nodes.push(...formatted.nodes);
      key = formatted.nextKey;
    }
  }

  return { nodes, nextKey: key };
}

function applyTextFormatting(
  text: string,
  startKey: number
): { nodes: React.ReactNode[]; nextKey: number } {
  const nodes: React.ReactNode[] = [];
  let key = startKey;

  // Combined regex for all inline formatting
  const combined = /(\*[^*]+\*)|(_[^_]+_)|(https?:\/\/[^\s<>'"]+)/g;
  let lastIndex = 0;
  let match;

  while ((match = combined.exec(text)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const m = match[0];
    if (m.startsWith("*") && m.endsWith("*")) {
      nodes.push(<strong key={key++}>{m.slice(1, -1)}</strong>);
    } else if (m.startsWith("_") && m.endsWith("_")) {
      nodes.push(<em key={key++}>{m.slice(1, -1)}</em>);
    } else if (m.startsWith("http")) {
      nodes.push(
        <a
          key={key++}
          href={m}
          target="_blank"
          rel="noopener noreferrer"
          className="msg-link"
        >
          {m}
        </a>
      );
    }

    lastIndex = match.index + m.length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  if (nodes.length === 0) nodes.push(text);

  return { nodes, nextKey: key };
}
