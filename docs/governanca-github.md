# Governança do repositório

Monorepo privado criado na conta @peguidotte por solicitação de Pedro. Nome comercial/repositório ainda em discussão com ele. A divisão de pastas e branches está em [equipe](equipe.md).

## Política do grupo

- Trabalho em branch de entrega/tarefa; main recebe pull requests revisados.
- Pedro acompanha integração e auditoria; responsáveis afetados revisam contratos.
- Squash merge mantém um conjunto revisado por alteração. Não fazer force-push na main.
- CI inicial: Contratos e fundação / Contratos e mocks compartilhados. Há smoke integrado manual preparado, ainda sem URLs de serviços reais.
- Adicionar build/testes de cada componente quando implementado; CI da fundação não é certificação das oito entregas.
- CODEOWNERS inicial aponta para @peguidotte. Outros usuários não foram informados; não presumir convite ou acesso concedido.

## Proteção técnica

Estado inicial: será conferido via API após o primeiro push. Política documentada não equivale a proteção ativa. Em repositório privado, branch protection depende do plano GitHub; se a API recusar por plano, registrar a resposta e manter disciplina de PR sem alegar bloqueio técnico.

Referência: [GitHub — protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Privacidade e acessos

Nenhum material privado do Teams, conversa local, segredo, arquivo .env, banco ou dataset bruto deve entrar no histórico. Repositório permanece privado; tornar público é decisão separada. RMs e nomes publicados aqui foram fornecidos por Pedro para identificação acadêmica.

Nomes de usuário dos demais integrantes serão pedidos por Pedro. Antes de dar acesso/configurar CODEOWNERS, confirmar identidades. O professor também precisará de acesso ao repositório privado se essa for a forma escolhida para a correção; isso não substitui o Admin no Azure Boards pedido em Testing.
