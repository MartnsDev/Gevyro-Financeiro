import { expect, it } from 'vitest';
import { normalizeBankDate, parseOFX } from '../src/lib/import-files';
it('OFX SGML captura identificador estável, data e caracteres sem executar HTML', () => {
  const rows = parseOFX(
    '<BANKTRANLIST><STMTTRN><DTPOSTED>20240131120000[-3:BRT]\n<TRNAMT>-123.45\n<FITID>bank-123\n<MEMO>Mercado &amp; Café\n</STMTTRN></BANKTRANLIST>',
  );
  expect(rows).toEqual([
    {
      description: 'Mercado & Café',
      amount: '-123.45',
      date: '2024-01-31',
      externalId: 'bank-123',
    },
  ]);
});
it('OFX XML aceita fechamento de tags e normaliza a mesma data civil', () => {
  const rows = parseOFX(
    '<BANKTRANLIST><STMTTRN><DTPOSTED>20240229</DTPOSTED><TRNAMT>150.00</TRNAMT><FITID>id-2</FITID><NAME>Pagamento</NAME></STMTTRN></BANKTRANLIST>',
  );
  expect(rows[0].date).toBe('2024-02-29');
  expect(rows[0].externalId).toBe('id-2');
  expect(normalizeBankDate('29/02/2024')).toBe('2024-02-29');
});
