# Prompt Mestre — Reconstrução do Controle de Materiais V3.8

Quero reconstruir uma aplicação web completa chamada Controle de Materiais, subtítulo Agenda Comercial. Ela é uma ferramenta compartilhada de gestão de entregas comerciais e não deve ser usada como repositório de arquivos. Os arquivos permanecem no SharePoint; a aplicação armazena nome, data, status, prioridade, natureza, recorrência, validação, link, observação e histórico.

Os perfis atuais são Walisom e Lais, ambos com papel “Produção e gestão da agenda”, e Adriana, com papel “Validação e acompanhamento”. A seleção de perfil é operacional, salva em localStorage e não representa autenticação real.

Utilize HTML, CSS e JavaScript, Supabase PostgreSQL + Realtime, GitHub e Vercel. A Home deve sempre refletir o mês corrente real e conter os big numbers Materiais no mês, Importantes e urgentes, Recorrentes e Aguardando Adriana. Em seguida, mostrar um Pipeline com Planejado, Em produção, Validação e Finalizado. O status deve mudar por drag and drop. Clicar em um card deve abrir o modal para edição, mantendo Salvar, Excluir e Cancelar, mas ocultando o campo Status quando a abertura vier do Pipeline.

A Home também deve manter Radar de capacidade e Leitura Executiva dinâmica. Finalizados não devem pesar como carga operacional. A leitura deve priorizar vencidos, próximos 14 dias, urgentes, Em produção, Validação, semana de maior concentração e próxima entrega ativa.

A Agenda mensal deve navegar de forma independente da Home. Use dois estados diferentes: currentMonth para a operação/Home e agendaMonth para o calendário. Navegar para outro mês na Agenda nunca pode alterar o mês da Home. Ao voltar para Hoje, currentMonth deve ser redefinido pelo mês corrente real.

A recorrência é definida apenas pelo campo do material. Sob demanda não se repete. Semanal repete a cada 7 dias. Quinzenal repete a cada 14 dias. Mensal repete no mesmo dia do mês e usa o último dia disponível quando necessário. Não implemente regras por nome. Um material recorrente criado manualmente é a raiz da série. Ocorrências derivadas usam origem_recorrencia no padrão series:{ID_RAIZ}:{AAAA-MM-DD}. Essa origem deve ser única.

Ao excluir um item recorrente, mostrar Excluir item e Excluir tudo. Excluir item deve remover somente a ocorrência e manter a série. Se a raiz for removida, promover a próxima ocorrência para raiz e reescrever as origens. Excluir tudo deve remover a série completa. Preservar o histórico mesmo depois da exclusão.

Marcos automáticos: D-7 Início, D-4 Estrutura, D-2 Validação ou Revisão quando não exigir Adriana, D-1 Final.

O salvamento deve usar /api/material. O endpoint deve fazer POST/PATCH no Supabase Data API, com retry em erros temporários e return=representation. A mudança de status deve usar /api/status. A exclusão deve usar /api/delete-material chamando uma RPC transacional no Supabase.

A tabela principal é controle_materiais. Criar também controle_materiais_atividade e controle_materiais_recorrencia_excecoes. Ativar RLS. Nunca usar service_role no frontend. Usar publishable key e considerar RLS como fronteira de segurança.

A sincronização deve ser robusta. Não permita cargas concorrentes de materials. Após gerar recorrências, faça uma segunda leitura canônica do banco. Agrupe eventos Realtime próximos antes de recarregar. Big numbers, Pipeline, Radar e calendário devem trabalhar sobre snapshots consistentes.

Views obrigatórias: Hoje, Agenda mensal, Visão Diretoria e Planejamento. A Diretoria mostra uma agenda limpa com prioridade, data, recorrência, natureza, status e link SharePoint. Planejamento mostra indicadores mensais, materiais e ritos, marcos D-7/D-4/D-2/D-1, resumo da reunião, prioridades sugeridas e preparações que começam no mês anterior.

A aplicação deve ser responsiva, executiva e premium, com identidade roxa/laranja, cards claros, boa hierarquia e pouco ruído. Antes de concluir, testar perfis, criação, edição, status via Pipeline, recorrência semanal/quinzenal/mensal, Sob demanda, exclusão item/tudo, navegação de mês, Home, Agenda, Diretoria, Planejamento, Realtime, histórico e responsividade.
