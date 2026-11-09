# Dados acústicos reais — inspeção inicial

Fonte primária: [NoiseCapture](https://noise-planet.org/noisecapture_exploit_data.html). Download: [Brazil.zip](https://data.noise-planet.org/dump/Brazil.zip), realizado em 08/11/2026. O dump contém observações históricas; data do download não é data de medição.

Arquivo local ignorado no Git: raw/noisecapture-brazil-2026-11-08.zip, 45.844.212 bytes, SHA-256 540aef978fd95a0fcb9e09a2a59bf91ba0ee98b2a85d771f3d7f6580181df9aa.

Recorte inicial: arquivos tracks e points do município de São Paulo; 1.894 sessões e 282.021 pontos antes da limpeza, 322 datas observadas entre 2017 e 2025. [Contagens, campos e limites](../../docs/dados/noisecapture-auditoria-inicial.json).

A inspeção contou features/timestamps e pontos em retângulo exploratório; não validou calibração, representatividade, independência das observações ou cobertura contínua. Níveis zero e qualidade GPS precisam ser avaliados. Não há modelo treinado ou métricas.

A fonte informa licença ODbL. Preservar atribuição, registrar versão e conferir condições antes de redistribuir dados/derivados. Não versionar ZIP nem trajetórias identificáveis por padrão; publicar procedimento e amostras estritamente necessárias conforme licença.

Plano do experimento e critérios: [especificação ML](../../docs/disciplinas/ml.md). Documentar neste arquivo os filtros efetivamente aplicados, quantidade final, divisão e campos exportados quando o responsável executar o experimento.
