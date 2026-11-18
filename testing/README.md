# Testing, Compliance & Quality Assurance

**Felipe Soares Xavier · RM 556931** · [Equipe](../README.md#equipe) · [Rubrica](../docs/disciplinas/testing.md)

[Assistir ao VIDEO PITCH GS (3min08s)](video-pitch-gs.mp4)

A jornada principal começa quando o dispositivo envia uma observação. O Java a grava uma vez, mesmo com reenvio, e o C# permite consultá-la por local e horário. Esses comportamentos orientam as Features e os Test Cases no Azure Boards.

| Jornada | Caso positivo | Caso negativo |
| --- | --- | --- |
| Ingestão | A primeira leitura retorna 201. Um reenvio idêntico retorna o mesmo registro. | A mesma identificação com dados divergentes retorna 409. |
| Consulta | Duas janelas de mesma duração a 60 e 70 dB resultam em aproximadamente 67,4 dB. | Sem observações no período, a API devolve `no_data` e nível nulo. |
| Operação | Após o retorno do banco, as APIs voltam a responder e a observação continua disponível. | Com o banco indisponível, a prontidão retorna 503. |

Os cenários completos estão na [especificação da disciplina](../docs/disciplinas/testing.md). A [demonstração integrada](../linux/README.md) permite reproduzir a jornada de ingestão e consulta.

**Entrega acadêmica:** projeto no Azure Boards com o professor como administrador, PDF com as Features, casos vinculados e critérios de aceite, e pitch no YouTube de até quatro minutos. O MP4 acima está pronto para publicação. A equipe deve confirmar os links do YouTube e do projeto de QA para finalizar o PDF de evidências.
