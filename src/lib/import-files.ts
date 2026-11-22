export interface ImportRow {
  description: string;
  amount: string;
  date: string;
  category?: string;
  externalId?: string;
  allowSimilar?: boolean;
}
export function normalizeBankDate(input: string): string {
  const value = input.trim();
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : value.slice(0, 10);
}
export function parseOFX(content: string): ImportRow[] {
  const matches = [
    ...content.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>))/gi),
  ];
  const field = (block: string, tag: string) =>
    block.match(new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i'))?.[1]?.trim() || '';
  const decode = (value: string) =>
    value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  return matches.map((m) => {
    const date = field(m[1], 'DTPOSTED').slice(0, 8);
    return {
      description: decode(field(m[1], 'MEMO') || field(m[1], 'NAME') || 'Movimentação importada'),
      amount: field(m[1], 'TRNAMT'),
      date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`,
      externalId: field(m[1], 'FITID') || undefined,
    };
  });
}
