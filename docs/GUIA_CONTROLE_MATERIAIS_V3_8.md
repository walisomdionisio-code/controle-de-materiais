# Controle de Materiais — Guia de Produto, Arquitetura e Manutenção

**Snapshot oficial:** V3.8  
**Aplicação:** Controle de Materiais | Agenda Comercial  
**Produção:** https://controle-de-materiais-47nf.vercel.app  
**Repositório:** https://github.com/walisomdionisio-code/controle-de-materiais  
**Branch de produção:** main  
**Stack:** HTML + CSS + JavaScript + Supabase + Vercel  
**Última consolidação deste guia:** 08/10/2026

---

## 1. Por que esta aplicação existe

O Controle de Materiais nasceu para organizar a produção e a governança das agendas comerciais. A dor original não era armazenar arquivos, mas responder com clareza:

- o que precisa ser entregue;
- quando precisa ser entregue;
- em qual etapa cada material está;
- qual é a prioridade;
- quem criou ou movimentou;
- quais itens se repetem;
- quais itens aguardam validação da Adriana;
- onde há concentração de trabalho;
- qual material precisa ser priorizado;
- o que foi alterado ou excluído.

A aplicação funciona como camada de gestão. Ela não é repositório de PPT, PDF ou documento.

**Controle de Materiais:** gestão da demanda, data, status, prioridade, recorrência e histórico.  
**SharePoint:** armazenamento dos arquivos.  
**Teams:** comunicação.  
**Reunião mensal:** planejamento e governança.

---

## 2. Princípios que não devem ser quebrados

1. O sistema deve continuar simples e rápido.
2. Status é controlado prioritariamente pelo Pipeline.
3. O arquivo final continua no SharePoint; o app guarda apenas o link.
4. Recorrência é uma propriedade do material, não do nome do material.
5. Finalizado não deve pesar como pressão operacional atual.
6. O histórico deve sobreviver à exclusão dos materiais.
7. A Home deve refletir sempre o mês corrente real.
8. A Agenda mensal pode navegar livremente sem alterar o mês operacional da Home.
9. Salvar um material e registrar histórico são operações distintas: falha secundária nunca deve gerar falso erro de salvamento.
10. Nunca expor service_role no navegador.
11. Antes de qualquer mudança estrutural, validar o comportamento atual no código e no banco.
12. Não recriar lógica especial por nome como “Acelera”, “Plano Comercial” ou “Conexão”. A recorrência atual é genérica.

---

## 3. Perfis atuais

A aplicação possui três perfis operacionais:

- **Walisom** — Produção e gestão da agenda.
- **Lais** — Produção e gestão da agenda.
- **Adriana** — Validação e acompanhamento.

O perfil é salvo no localStorage, na chave **cm_active_user**.

### Atenção

Essa seleção não é autenticação. Ela serve somente para identificação operacional e histórico.

Hoje, quem possui acesso ao endereço da aplicação pode escolher qualquer perfil. Se o sistema passar a armazenar informações sensíveis, o próximo passo deve ser autenticação corporativa e RLS restritivo.

---

## 4. Visões da aplicação

### 4.1 Hoje

É a visão operacional principal e sempre usa o mês corrente real.

Contém:

- Materiais no mês;
- Importantes e urgentes;
- Recorrentes;
- Aguardando Adriana;
- Pipeline de produção;
- Radar de capacidade;
- Leitura Executiva.

O Pipeline possui quatro etapas:

1. Planejado
2. Em produção
3. Validação
4. Finalizado

O usuário arrasta o card entre as colunas. A nova coluna define o novo status.

Ao clicar em um card do Pipeline, o modal continua abrindo com edição, histórico, Salvar, Excluir e Cancelar, mas o campo Status fica oculto. O objetivo é impedir conflito entre edição manual de status e o fluxo visual.

### 4.2 Agenda mensal

É um calendário independente da Home.

A Agenda possui um estado de mês próprio chamado **agendaMonth**. A Home possui o estado operacional **currentMonth**.

Essa separação foi criada na V3.8 após um bug em que navegar para Outubro no calendário fazia a Home também mostrar Outubro.

Regra atual:

- **currentMonth** = mês operacional da Home;
- **agendaMonth** = mês selecionado no calendário.

Ao voltar para Hoje, currentMonth é recalculado a partir da data real do navegador.

### 4.3 Visão Diretoria

Visão executiva mais limpa para acompanhamento da Adriana.

Mostra:

- data;
- nome;
- prioridade;
- recorrência;
- natureza;
- status;
- link do SharePoint, quando existir.

### 4.4 Planejamento

Tela usada para a reunião mensal.

Contém:

- Itens do mês;
- Urgentes;
- Recorrentes;
- Pico de carga;
- Materiais e ritos;
- Marcos D-7, D-4, D-2 e D-1;
- Resumo da reunião;
- Prioridades sugeridas;
- Preparações que começam no mês anterior.

---

## 5. Campos de um material

Tabela principal: **public.controle_materiais**

Campos funcionais:

| Campo | Uso |
|---|---|
| nome | Nome do material ou rito |
| data_rito | Data da entrega ou rito |
| status | Planejado, Em produção, Validação ou Finalizado |
| prioridade | Importante / não urgente ou Importante e urgente |
| natureza | Rito, Material ou Demanda extraordinária |
| recorrencia | Sob demanda, Semanal, Quinzenal ou Mensal |
| requer_validacao | Define se existe validação da Adriana |
| validador | Adriana ou Não se aplica |
| link_sharepoint | Link do arquivo |
| observacao | Informação opcional |
| criado_por | Walisom, Lais, Adriana ou Sistema |
| origem_recorrencia | Identificador técnico das ocorrências recorrentes |
| created_at | Criação no banco |
| updated_at | Última atualização registrada |

### Valores permitidos de status

- Planejado
- Em produção
- Validação
- Finalizado

---

## 6. Regras de recorrência — versão atual

Desde a V3.5, a recorrência não depende mais do nome do material.

O campo Recorrência define toda a regra.

### Sob demanda

Não gera novas ocorrências automaticamente.

### Semanal

Repete a cada 7 dias a partir da data original.

Exemplo:

- primeira data: 02/10
- próximas: 09/10, 16/10, 23/10, 30/10

### Quinzenal

Repete a cada 14 dias a partir da data original.

### Mensal

Repete no mesmo dia do mês.

Se o mês não possuir aquele dia, usa o último dia existente.

Exemplo: uma recorrência criada em 31/01 será ajustada para o último dia de fevereiro quando necessário.

### Conceito de raiz da série

Um material recorrente criado manualmente é a raiz da série e possui **origem_recorrencia = null**.

As ocorrências derivadas usam o padrão:

**series:{ID_DA_RAIZ}:{AAAA-MM-DD}**

Exemplo:

**series:402:2026-10-09**

A coluna origem_recorrencia possui UNIQUE no banco para impedir duplicidade mesmo quando o Realtime dispara duas sincronizações próximas.

---

## 7. Exclusão de materiais recorrentes

A V3.6 adicionou dois modos.

### Excluir item

Remove apenas a ocorrência selecionada.

Se for uma ocorrência derivada, a origem é registrada em:

**controle_materiais_recorrencia_excecoes**

Isso impede que a engine recrie aquela data.

Se o item excluído for a própria raiz da série, a próxima ocorrência é promovida para nova raiz e as origens restantes são reescritas para o novo ID.

Assim, “Excluir item” não interrompe a recorrência.

### Excluir tudo

Remove toda a série de uma vez, incluindo futuras ocorrências e exceções relacionadas.

Depois disso, o material pode ser criado novamente com uma nova recorrência sem apagar item por item.

### Implementação

A operação é transacional no banco por meio da função:

**public.excluir_material(p_id, p_modo, p_usuario)**

O endpoint Vercel **/api/delete-material** chama essa função.

---

## 8. Marcos automáticos de produção

A partir de data_rito:

- D-7 = Início
- D-4 = Estrutura
- D-2 = Validação
- D-1 = Final

Quando requer_validacao = false:

- D-2 = Revisão

Esses marcos são calculados no frontend e aparecem no modal e no Planejamento.

---

## 9. Big numbers da Home

### Materiais no mês

Quantidade total de registros do mês operacional.

### Importantes e urgentes

Quantidade com prioridade igual a **Importante e urgente**.

### Recorrentes

Quantidade cujo campo recorrencia é diferente de **Sob demanda**.

Importante: esse indicador conta ocorrências do mês, não apenas séries-mãe.

### Aguardando Adriana

Somente registros em que:

- requer_validacao = true
- status = Validação
- validador = Adriana

---

## 10. Radar de capacidade

O mês é dividido em faixas semanais:

- 01–07
- 08–14
- 15–21
- 22–28
- 29–fim

O Radar considera apenas materiais que ainda não estão Finalizados.

O objetivo é mostrar concentração operacional, não volume histórico concluído.

---

## 11. Leitura Executiva

A leitura é dinâmica e não deve ser substituída por texto fixo.

Prioridade de análise:

1. materiais vencidos e não finalizados;
2. próximos 14 dias;
3. itens Em produção;
4. itens em Validação;
5. prioridade Importante e urgente;
6. semana de maior concentração;
7. próxima entrega ativa.

No máximo dois materiais são citados nominalmente na recomendação.

Finalizados são ignorados como pressão operacional.

---

## 12. Ordenação

Na Home/Pipeline, a coluna define a ordem por status.

Nas visões em lista:

1. Em produção
2. Validação
3. Planejado
4. Finalizado

Dentro de Planejado, Em produção e Validação: data crescente.

Dentro de Finalizado: data decrescente.

---

## 13. Histórico e atividades

Tabela:

**public.controle_materiais_atividade**

Campos:

- id
- material_id
- usuario
- acao
- detalhe
- created_at

Exemplos de ação:

- Acessou a agenda
- Criou agenda
- Editou agenda
- Visualizou material
- Moveu no pipeline
- Duplicou agenda
- Excluiu ocorrência
- Excluiu série recorrente

A foreign key de material_id usa **ON DELETE SET NULL**. Isso foi alterado para preservar o histórico quando um material é excluído.

---

## 14. Realtime e sincronização

O Supabase Realtime escuta alterações em **controle_materiais** e inserts em **controle_materiais_atividade**.

### Problema que já ocorreu

Na V3.7, foi identificado que múltiplos eventos de Realtime podiam disparar leituras simultâneas. Uma resposta antiga podia terminar depois de uma nova e sobrescrever o estado em memória.

### Solução atual

- **materialsLoadPromise** garante uma única carga simultânea;
- **scheduleMaterialsReload** agrupa eventos próximos;
- depois de gerar recorrências é feita uma segunda leitura canônica do banco;
- voltar para Hoje força sincronização;
- Home e Agenda usam meses independentes.

Ao mexer nessa camada, não remover essas proteções sem teste de regressão.

---

## 15. Arquitetura

Fluxo principal:

**Navegador → Vercel → Supabase**

Frontend:

- index.html
- styles1.css
- styles2.css
- app1.js
- app2.js
- app3.js
- app4.js

Backend serverless:

- api/material.js
- api/status.js
- api/delete-material.js

Banco:

- Supabase PostgreSQL
- Supabase Realtime
- RLS habilitado

Deploy:

- GitHub main
- deploy automático na Vercel

---

## 16. Mapa dos arquivos ativos

### index.html

Estrutura das views, modal, seletor de perfil e carregamento dos scripts.

### styles1.css

Base visual geral: variáveis, sidebar, cards, botões, KPIs e componentes principais.

### styles2.css

Componentes de calendário, planejamento, modal, atividades, Pipeline integrado, Home com Pipeline e modal de exclusão.

### app1.js

Camada de dados e utilidades:

- conexão Supabase;
- estado global;
- transformação banco ↔ frontend;
- carregamento canônico;
- recorrências;
- perfil;
- helpers de data.

### app2.js

Renderizações principais:

- big numbers;
- capacidade;
- leitura executiva;
- calendário;
- diretoria.

### app3.js

- planejamento;
- histórico;
- Pipeline;
- drag and drop;
- mudança de mês;
- histórico individual.

### app4.js

- modal;
- criar/editar;
- salvar;
- excluir item/tudo;
- duplicar sob demanda;
- navegação;
- inicialização e Realtime.

### api/material.js

CREATE e UPDATE de material pela Vercel.

Possui retry em erro temporário.

### api/status.js

Atualiza status ao mover card no Pipeline.

Também tenta registrar “Moveu no pipeline” no histórico.

### api/delete-material.js

Chama a RPC excluir_material para exclusão transacional.

### vercel.json

Desativa cache da Home/index para evitar HTML antigo após deploy.

---

## 17. Arquivos legados que não fazem parte da produção atual

Existem arquivos remanescentes de testes anteriores:

- app5.js
- pipeline.html
- pipeline.css
- pipeline.js
- styles3.css

Eles não são carregados pelo index.html da V3.8.

Não fazer manutenção neles achando que são a versão oficial.

Se for fazer limpeza do repositório, apagar somente depois de criar backup/tag e validar que nenhum link externo ainda depende de pipeline.html.

---

## 18. Banco de dados

### controle_materiais

Tabela principal.

RLS habilitado.

### controle_materiais_atividade

Histórico.

RLS habilitado.

### controle_materiais_recorrencia_excecoes

Datas recorrentes excluídas individualmente.

RLS habilitado.

### controle_materiais_site_chunks

Tabela legada. Não faz parte do fluxo V3.8.

---

## 19. RLS atual

A versão atual é um protótipo compartilhado e possui políticas permissivas.

Em **controle_materiais**, anon e authenticated podem:

- SELECT
- INSERT
- UPDATE
- DELETE

Em **controle_materiais_atividade**:

- SELECT
- INSERT

Em **controle_materiais_recorrencia_excecoes**:

- SELECT
- INSERT
- DELETE

### Risco

O repositório GitHub está público e a aplicação usa publishable key. Publishable key pode estar no frontend, mas RLS é a fronteira real de segurança.

Antes de colocar dados sensíveis:

1. tornar o repositório privado;
2. implementar autenticação corporativa;
3. restringir RLS por usuário/perfil;
4. revisar funções SECURITY DEFINER;
5. não utilizar service_role no cliente.

---

## 20. Configuração Supabase

Projeto atual:

**jyocklhngsylbbghdsyy**

A aplicação usa:

- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY

Nunca documentar ou distribuir service_role.

### Importante: incidente de banco INACTIVE

Durante o desenvolvimento ocorreu um erro “Failed to fetch” no salvamento. A causa real era o projeto Supabase em estado INACTIVE.

A correção foi restaurar o projeto e simplificar a arquitetura para não depender de Edge Function intermediária de configuração.

Se o app parar de salvar:

1. verificar status do projeto Supabase;
2. testar uma query simples;
3. verificar /api/material;
4. verificar RLS;
5. somente depois alterar código.

---

## 21. Edge Functions legadas

Atualmente existem Edge Functions antigas no projeto Supabase:

- controle-materiais-site
- xhtml-test
- controle-materiais-config

A aplicação V3.8 não depende delas para o fluxo principal.

Não reconstruir dependência dessas funções sem uma decisão arquitetural consciente.

---

## 22. Fluxo de salvamento

Ao clicar Salvar:

1. validar perfil;
2. validar nome e data;
3. botão vira “Salvando...”;
4. montar objeto frontend;
5. converter para payload do banco;
6. POST em /api/material;
7. Vercel chama Supabase Data API;
8. banco retorna o registro;
9. frontend atualiza materials;
10. modal fecha;
11. interface redesenha;
12. histórico é registrado em operação secundária;
13. materiais e atividades são recarregados.

### Regra crítica

Se o material foi salvo e apenas o histórico falhou, não mostrar erro de salvamento.

---

## 23. Fluxo de mudança de status

1. usuário arrasta o card;
2. frontend atualiza o status otimisticamente;
3. POST /api/status;
4. endpoint faz PATCH em controle_materiais;
5. histórico “Moveu no pipeline” é tentado;
6. frontend usa o registro retornado;
7. se der erro, status volta para o valor anterior.

---

## 24. Fluxo de exclusão

1. usuário abre um card;
2. clica Excluir;
3. sistema mostra:
   - Excluir item
   - Excluir tudo
4. POST /api/delete-material;
5. endpoint chama RPC excluir_material;
6. banco executa a exclusão de forma transacional;
7. histórico é preservado;
8. frontend recarrega materiais e atividades.

---

## 25. Duplicar sob demanda

O botão da Agenda mensal duplica apenas materiais com recorrencia = Sob demanda.

Recorrências automáticas não são duplicadas manualmente.

A duplicação usa o mês atualmente aberto na Agenda, não o mês da Home.

---

## 26. Como publicar uma alteração

Fluxo recomendado:

1. Ler este guia.
2. Identificar os arquivos afetados.
3. Fazer uma mudança pequena por vez.
4. Validar sintaxe JavaScript.
5. Conferir regras de negócio.
6. Commit na branch main somente após validação.
7. Aguardar status da Vercel = success.
8. Abrir o endereço de produção.
9. Fazer teste de regressão.
10. Atualizar a versão visual se a mudança for relevante.
11. Atualizar este guia quando a regra mudar.

Produção:

https://controle-de-materiais-47nf.vercel.app

---

## 27. Checklist obrigatório de regressão

Antes de considerar qualquer mudança concluída, testar:

- selecionar Walisom;
- trocar para Lais;
- trocar para Adriana;
- criar material Sob demanda;
- criar material Semanal;
- criar material Quinzenal;
- criar material Mensal;
- verificar recorrências no calendário;
- mover Planejado → Em produção;
- mover Em produção → Validação;
- mover Validação → Finalizado;
- clicar card no Pipeline e confirmar Status oculto;
- salvar edição;
- excluir apenas uma ocorrência;
- verificar que a série continua;
- excluir série inteira;
- verificar que todas as ocorrências somem;
- navegar Agenda para outro mês;
- voltar para Hoje e confirmar mês corrente;
- comparar total do Pipeline com total do mês no banco;
- conferir Radar;
- conferir Leitura Executiva;
- abrir link SharePoint;
- conferir histórico;
- atualizar a página e verificar persistência;
- testar em tela menor.

---

## 28. Como diagnosticar números divergentes

Se Big Number, Pipeline e Agenda não baterem:

1. identificar qual mês cada view está usando;
2. consultar o banco por data_rito;
3. comparar quantidade por status;
4. conferir se recorrências do mês já foram geradas;
5. conferir origem_recorrencia;
6. verificar se houve evento Realtime durante a leitura;
7. garantir que loadMaterials está fazendo a segunda leitura canônica;
8. evitar adicionar outro estado global de mês sem necessidade.

Exemplo de SQL:

~~~sql
select
  status,
  count(*)
from public.controle_materiais
where data_rito between date '2026-09-01' and date '2026-09-30'
group by status
order by status;
~~~

---

## 29. Histórico das principais decisões

### V3.2

Base compartilhada com histórico, recorrências iniciais e Planejamento.

### V3.3

Inclusão da Lais como perfil de Produção e gestão da agenda.

### V3.4

Pipeline integrado à aplicação.

### V3.5

Pipeline substitui a antiga lista da Home.

Recorrência deixa de depender do nome e passa a ser definida pelo campo:

- Sob demanda
- Semanal
- Quinzenal
- Mensal

### V3.6

Exclusão “item” e “tudo”.

RPC transacional e preservação do histórico.

### V3.7

Correção de condição de corrida do Realtime e snapshot canônico.

### V3.8

Separação definitiva:

- currentMonth = Home/operação
- agendaMonth = calendário navegável

Corrige números errados ao voltar para Hoje.

---

## 30. Roadmap — não implementado ainda

Os itens abaixo foram discutidos, mas não fazem parte da V3.8.

### Performance operacional

Criar telemetria real de mudanças de etapa para medir:

- lead time total;
- tempo em Planejado;
- tempo em Produção;
- tempo em Validação;
- tempo até Finalizado;
- atraso médio;
- % entregue no prazo;
- quantidade de retornos Validação → Produção;
- retrabalho;
- WIP;
- entradas por período;
- capacidade;
- variação de data;
- cancelamentos;
- cancelamentos após produção iniciada;
- urgências criadas abaixo de D-7;
- tempo aguardando diretoria.

### Novos dados necessários

Para diagnóstico mais robusto, considerar futuramente:

- data_original;
- motivo_alteracao;
- motivo_cancelamento;
- agenda_confirmada;
- timestamps de entrada/saída por etapa;
- responsável operacional;
- complexidade estimada;
- esforço estimado;
- esforço real.

### Integração com Outlook

Objetivo futuro: consultar agenda executiva para identificar:

- reunião cancelada;
- reunião reagendada;
- conflito de agenda;
- agenda ainda não confirmada.

Essa integração ainda não faz parte do código da V3.8.

---

## 31. Prompt mestre de reconstrução

Use este prompt quando for necessário reconstruir, migrar ou refatorar a aplicação com outra ferramenta de desenvolvimento.

> Desenvolva uma aplicação web chamada Controle de Materiais, subtítulo Agenda Comercial. Ela deve ser uma ferramenta compartilhada de gestão de entregas comerciais, não um repositório de arquivos. Os arquivos permanecem no SharePoint e o sistema armazena apenas metadados, link, status, prioridade, recorrência, validação, observação e histórico. A aplicação possui três perfis operacionais: Walisom e Lais, responsáveis por produção e gestão da agenda, e Adriana, responsável por validação e acompanhamento. A seleção de perfil atual é operacional e salva em localStorage, não é autenticação real.
>
> Utilize HTML, CSS e JavaScript no frontend, Supabase PostgreSQL e Realtime no backend, GitHub para versionamento e Vercel para publicação. A Home deve conter quatro big numbers — Materiais no mês, Importantes e urgentes, Recorrentes e Aguardando Adriana — seguidos de um Pipeline com as colunas Planejado, Em produção, Validação e Finalizado. O status deve ser alterado arrastando os cards entre as colunas. Ao clicar em um card do Pipeline, abrir o modal de edição mantendo Salvar, Excluir e Cancelar, porém ocultando Status. A Home também deve conter Radar de capacidade e Leitura Executiva dinâmica.
>
> A recorrência deve ser definida exclusivamente pelo campo do material: Sob demanda não repete, Semanal repete a cada 7 dias, Quinzenal a cada 14 dias e Mensal no mesmo dia do mês, usando o último dia disponível quando necessário. Não criar regras especiais baseadas no nome do material. Cada série deve ter uma raiz e ocorrências derivadas identificadas por origem_recorrencia no formato series:{id_raiz}:{data}. origem_recorrencia deve ser única.
>
> Ao excluir material recorrente, oferecer Excluir item e Excluir tudo. Excluir item remove somente a ocorrência e mantém a série. Se a raiz for excluída, promover a próxima ocorrência para raiz. Excluir tudo remove toda a série. Preservar histórico de atividade mesmo após exclusão.
>
> A aplicação deve ter as views Hoje, Agenda mensal, Visão Diretoria e Planejamento. Hoje deve usar sempre o mês corrente real. Agenda mensal deve ter navegação independente usando um estado separado, sem alterar o mês da Home. Ao consultar meses futuros, gerar as ocorrências recorrentes necessárias e depois fazer uma leitura canônica do banco.
>
> Big numbers, Pipeline, Radar e Leitura Executiva devem usar o mesmo snapshot de materiais. Serializar cargas para impedir condições de corrida de Realtime. Depois de gerar recorrências, fazer uma segunda leitura do banco. Agrupar eventos Realtime próximos antes de recarregar.
>
> O modal deve conter nome, data, status, prioridade, natureza, recorrência, requer validação da Adriana, validador, link SharePoint e observação. Novos materiais começam em Planejado. Marcos automáticos: D-7 Início, D-4 Estrutura, D-2 Validação ou Revisão quando não exigir Adriana, D-1 Final.
>
> O salvamento principal deve usar um endpoint Vercel /api/material com retry e retorno do registro salvo. A mudança de status deve usar /api/status. A exclusão transacional deve usar /api/delete-material e uma RPC no Supabase. Falhas de histórico ou sincronização secundária não podem gerar falso erro de salvamento.
>
> Usar Supabase Realtime para manter usuários sincronizados. Manter histórico com usuário, ação, detalhe e timestamp. A aplicação deve ser responsiva, premium, executiva e utilizar principalmente roxo, laranja, branco e cinzas. Nunca expor service_role. Manter RLS habilitado. Antes de entregar, testar criação, edição, Pipeline, recorrência, exclusão item/tudo, navegação de mês, Home, Agenda, Diretoria, Planejamento, Realtime e responsividade.

---

## 32. Regra para futuras evoluções

Toda nova funcionalidade deve responder a três perguntas antes de entrar em produção:

1. Qual decisão de negócio ela melhora?
2. Qual dado precisa ser registrado para permitir diagnóstico futuro?
3. Como ela afeta as regras de recorrência, histórico, status e sincronização?

Se a mudança alterar regra de negócio, atualizar este guia no mesmo commit.

