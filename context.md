# DinastiAPI Manager - Contexto da Plataforma

## Visão Geral

Esta plataforma é um front-end Next.js para criar e gerenciar instâncias DinastiAPI de WhatsApp por QR Code.

O objetivo é permitir que o usuário:
- crie uma instância
- conecte a instância ao WhatsApp
- gere e exiba o QR Code
- confira o status real da conexão depois do QR
- envie `locationId` para o webhook de automação

## Fluxo Implementado

O fluxo foi separado em passos explícitos para evitar falhas de payload e deixar a interface mais clara:

1. `Criar Instância`
   - chama `POST /api/create-instance`
   - envia `name` e `token`
   - a API cria a instância na DinastiAPI com `POST /admin/users`

2. `Conectar Instância`
   - liberado somente após a criação bem-sucedida
   - chama `POST /api/connect-instance`
   - a API conversa com `POST /session/connect`

3. `Gerar QR Code`
   - liberado somente após a conexão
   - chama `POST /api/generate-qr`
   - a API consulta `GET /session/qr` até obter o QR válido

4. `Conferir Status da Conexão`
   - liberado após o QR Code ser gerado
   - chama `POST /api/check-connection-status`
   - a API consulta `GET /session/status`
   - se a conexão estiver ativa, dispara o webhook com `name`, `token`, `locationId` e `status`

## Comportamento da API

As integrações com a DinastiAPI usam:
- `Authorization` no endpoint administrativo `POST /admin/users`
- header `token` nos endpoints de sessão
- JSON para criação e conexão

O fluxo também trata respostas reais da DinastiAPI:
- QR Code pode vir como `data.QRCode`, `data.base64` ou variações equivalentes
- `GET /session/status` pode retornar envelope duplo
- `sql: no rows in result set` é tratado como estado de "ainda não conectado"

## Variáveis de Ambiente

Necessárias no Vercel e no ambiente local:

```bash
DINASTIAPI_BASE_URL=http://209.38.71.49:8080
DINASTIAPI_ADMIN_TOKEN=...
```

## Arquitetura Atual

Arquivos principais:
- `src/app/page.tsx`
- `src/app/api/create-instance/route.ts`
- `src/app/api/connect-instance/route.ts`
- `src/app/api/generate-qr/route.ts`
- `src/app/api/check-connection-status/route.ts`
- `src/app/api/dinasti.ts`

## Decisões Importantes

- Removemos credenciais hardcoded do runtime.
- Separar o fluxo em rotas pequenas evitou o erro `Body has already been read`.
- O parse do status foi corrigido para ler o envelope certo da resposta da DinastiAPI.
- O webhook de automação foi movido para o passo de status, onde faz mais sentido operacionalmente.
- O campo `locationId` foi adicionado para mapear corretamente a instância conectada na automação.

## Estado Validado

O fluxo foi validado localmente com:
- `npm run lint`
- `npm run build`
- smoke tests diretos nas rotas da API

Resultado:
- criação da instância funciona
- conexão da instância funciona
- geração do QR funciona
- consulta de status funciona
- webhook recebe `locationId` quando a conexão está ativa

## Resumo Final

A plataforma agora está organizada como um assistente de conexão de instância por etapas, com validação real da API, feedback claro na interface e integração com automação externa via webhook após confirmação do status.
