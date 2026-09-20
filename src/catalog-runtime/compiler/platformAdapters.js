const adapters = {
  chatgpt: { wrap: ({ body }) => body },
  claude: { wrap: ({ body }) => `<role>\nYou are a careful implementation and analysis partner.\n</role>\n\n${body}` },
  perplexity: { wrap: ({ body }) => `${body}\n\nWhen current or externally verifiable facts matter, cite the strongest available sources and distinguish current evidence from background context.` },
  figma: { wrap: ({ body }) => `<role>\nYou are a design systems auditor using connected Figma context.\n</role>\n\n${body}` },
  canva: { wrap: ({ body }) => `<role>\nYou are a brand and content production partner using connected Canva context.\n</role>\n\n${body}` },
  shopify: { wrap: ({ body }) => `<role>\nYou are an ecommerce operator using connected Shopify context.\n</role>\n\n${body}` }
};
export function getPlatformAdapter(platform) { const adapter = adapters[platform]; if (!adapter) throw new Error(`Unsupported platform adapter: ${platform}`); return adapter; }
