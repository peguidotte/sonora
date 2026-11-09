# Como trabalhar no monorepo

Leia [equipe](docs/equipe.md), [sua especificação](docs/disciplinas/README.md), [contratos](contracts/README.md) e [regras de negócio](docs/regras-de-negocio.md).

## Branches e pull requests

Uma branch por entrega/tarefa mantém o escopo revisável. As oito branches iniciais estão na tabela da equipe. Para começar:

```bash
git clone https://github.com/peguidotte/sonora.git
cd sonora
git switch leo/csharp
git fetch origin
git merge origin/main
```

Substitua pela sua branch. Antes de abrir o PR, traga a main novamente, resolva conflitos e execute seus testes. Não fazer force-push na main. Não trabalhar diretamente na main após o bootstrap do repositório.

Abrir pull request para main com o modelo disponível, descrevendo problema/comportamento, como rodar sozinho, como integrar, quais contratos mudou e o que foi testado. Commits pequenos; não esperar o projeto inteiro para abrir um draft. Pedro faz revisão inicial e os responsáveis afetados revisam mudanças de interface.

Branches iniciais podem ser usadas como área de trabalho, mas novas tarefas podem usar leo/csharp/ingestao, por exemplo. Para evitar conflito entre nomes de refs, prefira leo/csharp-ingestao quando leo/csharp já existir. Não manter cópias divergentes do contrato em cada pasta.

## O que cada entrega deve conter

- README com equipe, instalação, versões, configuração e comandos reais.
- Modo standalone sem credencial de nuvem, usando seed/fixture explícita; bibliotecas podem exigir internet para instalação inicial.
- Modo integrado com URLs externas por ambiente; timeout, erro e indisponibilidade visíveis.
- Testes próprios e verificação do contrato compartilhado.
- Evidências reais e limitações; mock não prova integração ou requisito que exige dados reais.
- component.json atualizado: planned -> in_progress -> ready, com comandos reproduzíveis. Ready exige evidência; não é rótulo automático de CI.

## Escopo e segurança de colaboração

Cada diretório tem responsável, mas mudanças em outro diretório são possíveis quando necessárias e revisadas. Não usar versão pessoal duplicada da API. Não commitar .env, chaves, dados de moradores, materiais privados do Teams ou ZIP bruto do NoiseCapture. Exemplos positivos de PII em Cyber são sintéticos e identificados.

Não enviar convites, comentários a professores/colegas ou entregas acadêmicas sem solicitação explícita. O PR é a unidade de revisão do código; Testing continua com sua entrega obrigatória no Azure Boards.

## Verificações compartilhadas

```bash
python -m venv .venv
# Linux/macOS:
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/python tools/validate_contracts.py
.venv/bin/python -m unittest discover -s tools -p 'test_*.py' -v
# Windows: trocar .venv/bin/python por .venv/Scripts/python.exe
```

CI compartilhada verde comprova apenas contratos, fixtures e ferramentas comuns. O responsável deve adicionar o job de build/teste real de seu componente ao implementá-lo. Ela não comprova que as oito entregas estão concluídas.
