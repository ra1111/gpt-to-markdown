
import { ProcessingOptions } from '../types';

/**
 * Utility to strip Markdown from text with granular control.
 */
export const stripMarkdown = (md: string, options: ProcessingOptions): string => {
  if (!md) return "";

  let output = md;

  // 1. Remove Horizontal Rules
  output = output.replace(/^(-\s*|-\s*|-\s*|_\s*|_\s*|_\s*|\*\s*|\*\s*|\*\s*)$/gm, '');

  // 2. Remove Headers (but keep content)
  output = output.replace(/^#+\s+(.*)$/gm, '$1');

  // 3. Remove Blockquotes
  output = output.replace(/^\s*>\s+(.*)$/gm, '$1');

  // 4. Code Blocks
  if (options.removeCodeBlocks) {
    output = output.replace(/```[\s\S]*?```/g, '');
  } else {
    output = output.replace(/```[a-z]*\n/i, '').replace(/\n```/g, '');
  }
  
  // Inline code
  output = output.replace(/`([^`]+)`/g, '$1');

  // 5. Bold/Italic
  output = output.replace(/(\*\*|__)(.*?)\1/g, '$2');
  output = output.replace(/(\*|_)(.*?)\1/g, '$2');

  // 6. Links and Images
  if (options.removeImages) {
    output = output.replace(/!\[.*?\]\(.*?\)/g, '');
  }
  
  if (options.removeLinks) {
    output = output.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  } else {
    // Just cleanup syntax but keep URL if it's already there? 
    // Usually stripping means [Text](URL) -> Text
    output = output.replace(/\[(.*?)\]\(.*?\)/g, '$1');
  }

  // 7. Lists
  if (options.flattenLists) {
    output = output.replace(/^(\s*)[*+-]\s+/gm, '');
    output = output.replace(/^(\s*)\d+\.\s+/gm, '');
  }

  // 8. Spacing
  if (options.preserveSpacing) {
    output = output.split('\n').map(line => line.trimEnd()).join('\n');
  } else {
    output = output.replace(/\n\s*\n/g, '\n\n').trim();
  }

  return output;
};

export const calculateStats = (text: string) => {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const readTime = Math.ceil(words / 200); // Avg 200 wpm
  return { words, chars, readTime };
};
