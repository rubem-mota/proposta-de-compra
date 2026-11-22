# Proposta de Compra de Imóvel

Formulário eletrônico da Adm House que gera a proposta de compra em PDF, pronta para assinatura do comprador e do vendedor.
O PDF é montado no navegador; nenhum dado preenchido é enviado para servidor.

## Novidades

- **Preenchimento automático por documentos** (RG/CNH, comprovante de endereço, certidão de casamento, escritura/matrícula, IPTU, conta de luz/água do imóvel). A leitura (PDF e OCR) acontece no navegador; os arquivos não são enviados nem guardados. Os campos preenchidos ficam marcados em azul para conferência.
- **Modo manual ou automático** (botão no topo).
- **Salvar rascunho / Salvar proposta**, salvamento automático, lista de propostas salvas e exportação/importação em `.json`.

Código-fonte em `src/` (o `index.html` é gerado a partir deles).
