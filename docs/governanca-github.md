# Governança do repositório

Monorepo privado criado na conta @peguidotte por solicitação de Pedro. Repositório atual: https://github.com/peguidotte/sonora. Sonora é o produto aprovado; a marca ampla da empresa/plataforma continua em aberto. Disponibilidade comercial não foi validada. A divisão de pastas e branches está em [equipe](equipe.md).

## Política do grupo

- Trabalho em branch de entrega/tarefa; main recebe pull requests revisados.
- Pedro acompanha integração e auditoria; responsáveis afetados revisam contratos.
- Squash merge mantém um conjunto revisado por alteração. Não fazer force-push na main.
- CI inicial: Contratos e fundação / Contratos e mocks compartilhados. Há smoke integrado manual preparado, ainda sem URLs de serviços reais.
- Adicionar build/testes de cada componente quando implementado; CI da fundação não é certificação das oito entregas.
- CODEOWNERS inicial aponta para @peguidotte. Outros usuários não foram informados; não presumir convite ou acesso concedido.

## Proteção técnica

**Verificado em 08/11/2026: proteção de main não está ativa.** A API recusou a configuração com HTTP 403: “Upgrade to GitHub Pro or make this repository public to enable this feature”. O repositório foi mantido privado e nenhum plano foi alterado. Assim, a política de PR/revisão depende da disciplina do grupo enquanto o recurso não estiver disponível; não há bloqueio técnico de push direto/merge sem aprovação nesta conta.

Configurações aplicadas: main como branch padrão, squash merge habilitado, merge commit/rebase merge desabilitados e exclusão de branch após merge. A proteção solicitada exigia check de contratos, uma aprovação e bloqueio de force-push/exclusão; a recusa não aplicou esses bloqueios.

## Estado da CI remota

Em 08/11, os primeiros runs de push e workflow_dispatch terminaram em startup_failure antes de criar qualquer job. A API não retornou anotações/causa específica. As mesmas validações passaram localmente; actionlint 1.7.12, obtido do release oficial e conferido por SHA-256, não apontou erro nos dois workflows. Isso não demonstra sucesso da execução no GitHub.

A inspeção da mensagem visual ficou indisponível porque navegação local está desativada nas configurações do aplicativo. Pendente conferir o erro na aba Actions e eventuais restrições da conta/execução. Não afirmar que a CI remota está verde nem atribuir a falha a faturamento sem evidência. Referências dos runs iniciais: 42538039118 e 42538127838 (os links anteriores redirecionam após renomear o repositório para sonora).

Referência: [GitHub — protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Privacidade e acessos

Nenhum material privado do Teams, conversa local, segredo, arquivo .env, banco ou dataset bruto deve entrar no histórico. Repositório permanece privado; tornar público é decisão separada. RMs e nomes publicados aqui foram fornecidos por Pedro para identificação acadêmica.

Nomes de usuário dos demais integrantes serão pedidos por Pedro. Antes de dar acesso/configurar CODEOWNERS, confirmar identidades. O professor também precisará de acesso ao repositório privado se essa for a forma escolhida para a correção; isso não substitui o Admin no Azure Boards pedido em Testing.
