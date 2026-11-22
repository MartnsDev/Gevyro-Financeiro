# Nova tela de acesso — 22/11/2026

A tela segue a referência branca, com apresentação do produto à esquerda e card de acesso à direita, usando a identidade e a tipografia do Gevyro. No celular, o card aparece primeiro e a apresentação permanece abaixo.

## Autenticação preservada

O proprietário confirmou que o Gevyro deve continuar com **somente Google**. E-mail/senha, recuperação de senha e cadastro por senha não existiam neste aplicativo e não foram acrescentados à interface como controles fictícios. O primeiro acesso por Google utiliza o fluxo OAuth já configurado. Tokens, sessões, tabelas, regras Google/RLS e credenciais não são alterados pelo redesign.

O card mantém carregamento, bloqueio de cliques repetidos, mensagem de erro e nova tentativa. A recuperação do backup da versão anterior continua em uma seção secundária, sem criar novos dados financeiros locais.

## Apresentação

Título e texto seguem a referência: “Controle suas finanças com clareza” e os três benefícios de controle, metas e investimentos. O botão usa a marca colorida Google. Os elementos promocionais são apenas visuais; a ação de acesso chama a integração existente.

A logo completa utiliza diretamente o arquivo original enviado pelo proprietário. A imagem permanece intacta; um enquadramento CSS remove somente suas margens brancas na apresentação.

O notebook é enquadrado da imagem de referência fornecida, com recorte visual em CSS para isolar sua silhueta e preservar as proporções originais. A prévia é promocional e não interativa, com valores ocultos na referência. Não houve geração de logo, reconstrução da imagem ou captura da conta do usuário.

## Verificação

Os testes verificam o layout de 320 a 1440px, prioridade do acesso no mobile, ausência de overflow, ausência de campos de senha, encaminhamento ao OAuth Google e tratamento de falha com nova tentativa. O consentimento Google real depende da interação com uma conta do proprietário e não é substituído pelo backend simulado dos testes visuais.

O redesign não ativa serviços pagos nem cria um backend de autenticação.

## Arquivos originais aplicados

- `public/brand/gevyro-financas-logo-completa.png`: marca completa no topo da apresentação e no card de acesso.
- `public/brand/login-reference.png`: imagem de referência utilizada para apresentar o notebook.
- `public/brand/gevyro-financas-symbol.png` e `gevyro-financas-symbol-white.png`: símbolos originais fornecidos, preservados entre os assets.
