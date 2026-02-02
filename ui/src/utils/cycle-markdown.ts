/**
 * @fileoverview Utility to format cycle answers as markdown for dump/copy
 */

/**
 * @brief Single answer entry from cycle data
 */
export interface CycleAnswerEntry {
  id: number;
  questionId: string;
  answer: string;
  answeredAt: string;
  situation: string;
}

/**
 * @brief Cycle metadata and answers for markdown dump
 */
export interface CycleMarkdownInput {
  cycleNumber: number;
  startedAt: string;
  completedAt: string | null;
  answers: CycleAnswerEntry[];
}

/**
 * @brief Format a date string for display in markdown
 * @param dateString - ISO date string
 * @return Formatted date string
 */
function formatDateForMarkdown(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * @brief Escape markdown special characters in a line to avoid breaking structure
 * @param text - Raw text
 * @return Text safe for use in markdown (backticks for code blocks preserved)
 */
function escapeMarkdownInline(text: string): string {
  return text.replace(/\n/g, ' ');
}

/**
 * @brief Format cycle answers as markdown string (copyable dump)
 * @param input - Cycle number, dates, and answers
 * @return Markdown string grouped by situation
 * @pre input.answers is an array (may be empty)
 * @post Returns valid markdown with sections per situation
 */
export function formatCycleAnswersAsMarkdown(input: CycleMarkdownInput): string {
  const lines: string[] = [];
  lines.push(`# Cycle ${input.cycleNumber}`);
  lines.push('');
  lines.push(`- **Started:** ${formatDateForMarkdown(input.startedAt)}`);
  lines.push(
    `- **Completed:** ${input.completedAt ? formatDateForMarkdown(input.completedAt) : '-'}`
  );
  lines.push('');

  const textOnlyAnswers = input.answers
    .filter((a) => a.answer !== 'true' && a.answer !== 'false')
    .slice()
    .sort((a, b) => new Date(a.answeredAt).getTime() - new Date(b.answeredAt).getTime());

  if (textOnlyAnswers.length === 0) {
    lines.push('*(No text answers)*');
    return lines.join('\n');
  }

  let lastSituation = '';
  for (const a of textOnlyAnswers) {
    if (a.situation !== lastSituation) {
      lines.push(`## ${a.situation}`);
      lastSituation = a.situation;
    }
    lines.push(`### ${a.questionId}`);
    lines.push(a.answer.trim());
    lines.push(`*Answered: ${formatDateForMarkdown(a.answeredAt)}*`);
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * @brief Copy text to clipboard with fallback for cross-platform compatibility
 * 
 * @param text - Text to copy
 * @return Promise that resolves when copy succeeds, rejects on failure
 * 
 * @pre text is a string
 * @post Text is copied to clipboard (or throws error)
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (!text || typeof text !== 'string') {
    throw new Error('copyToClipboard: text must be a non-empty string');
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn('Clipboard API failed, trying fallback:', error);
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (!successful) {
      throw new Error('execCommand copy failed');
    }
  } catch (error) {
    document.body.removeChild(textArea);
    throw error;
  }
}
