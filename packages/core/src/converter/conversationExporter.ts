import type { Conversation } from '../types.js';

export class ConversationExporter {
  toMarkdown(conversation: Conversation): string {
    let md = `# ${conversation.title || 'Conversation'}\n\n`;
    md += `**Date:** ${new Date(conversation.createdAt).toLocaleString()}\n`;
    md += `**Page:** [${conversation.context.title}](${conversation.context.url})\n\n---\n\n`;

    for (const message of conversation.messages) {
      if (message.role === 'system') continue;
      
      const role = message.role === 'user' ? '**You**' : '**Lumerisca**';
      md += `${role}:\n\n${message.content}\n\n---\n\n`;
    }
    return md;
  }

  toPlainText(conversation: Conversation): string {
    let text = `${conversation.title || 'Conversation'}\n`;
    text += `Date: ${new Date(conversation.createdAt).toLocaleString()}\n`;
    text += `Page: ${conversation.context.url}\n\n`;
    text += `----------------------------------------\n\n`;

    for (const message of conversation.messages) {
      if (message.role === 'system') continue;

      const role = message.role === 'user' ? 'You' : 'Lumerisca';
      text += `${role}:\n${message.content}\n\n`;
      text += `----------------------------------------\n\n`;
    }
    return text;
  }

  toHtml(conversation: Conversation): string {
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${conversation.title || 'Conversation'}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.5; }
    .meta { color: #666; margin-bottom: 2rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
    .message { margin-bottom: 2rem; }
    .role { font-weight: bold; margin-bottom: 0.5rem; }
    .user { color: #2563eb; }
    .assistant { color: #059669; }
    .content { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>${conversation.title || 'Conversation'}</h1>
  <div class="meta">
    <div>Date: ${new Date(conversation.createdAt).toLocaleString()}</div>
    <div>Page: <a href="${conversation.context.url}">${conversation.context.title}</a></div>
  </div>
`;

    for (const message of conversation.messages) {
      if (message.role === 'system') continue;
      
      const roleClass = message.role === 'user' ? 'user' : 'assistant';
      const roleName = message.role === 'user' ? 'You' : 'Lumerisca';
      
      // Basic HTML escaping
      const content = message.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

      html += `
  <div class="message">
    <div class="role ${roleClass}">${roleName}</div>
    <div class="content">${content}</div>
  </div>`;
    }

    html += `
</body>
</html>`;
    return html;
  }
}

