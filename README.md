# ⚽ Craques do LED

Jogo de futebol simples e divertido para crianças de 6 a 8 anos. Feito só com HTML, CSS e JavaScript: não precisa instalar nada.

## Como abrir

- Abra o arquivo `index.html` no navegador (Chrome, Edge ou Firefox), **ou**
- Publique pelo GitHub Pages (veja abaixo).

Depois que a página carrega, o jogo funciona sem internet. Ele não usa nada de fora: nenhuma fonte, imagem ou biblioteca baixada da internet, nenhum anúncio, link externo, chat ou coleta de dados. Nada fica salvo no computador.

## Modos de jogo

| Modo | Como funciona |
| --- | --- |
| 🧒 x 💻 **Partida Solo** | A criança contra o computador. Dificuldade 🐢 Fácil, 🐇 Médio ou 🐆 Difícil. No Fácil, os adversários e o goleiro são bem lentos e a mira ajuda a bola a ir para o gol. |
| 🧒 x 👧 **2 Jogadores** | Duas crianças no mesmo teclado. Jogador 1: **W A S D** para correr e **Espaço** para chutar. Jogador 2: **setas** para correr e **Enter** para chutar. |
| 🥅 **Pênaltis** | Só com o mouse: clique no gol para chutar e clique para onde o goleiro pula. Em 2 jogadores, as crianças se revezam como batedor e goleiro. São 5 cobranças para cada time, com morte súbita se empatar. |

Nas partidas:

- 3 contra 3 (goleiro + 2 na linha), campo visto de cima. O computador controla os colegas de time.
- A criança controla quem está mais perto da bola (marcado com uma setinha). A troca é automática.
- Tempo de 2, 3 ou 5 minutos. O placar e o cronômetro ficam sempre visíveis.
- Comemoração com confete a cada gol e tela final com o resultado. Se terminar empatado, dá para decidir nos pênaltis.

Antes de jogar, cada criança dá um nome ao time (ou sorteia um com 🎲) e escolhe as cores da camisa e do calção. Todos os times são inventados. Cada time tem meninas e meninos com aparências variadas (🔄 sorteia outros jogadores).

## Para o laboratório

- 🔇 **O som começa desligado.** O botão **Som**, no canto de cima, liga o apito e a torcida. Os sons são criados pelo próprio navegador, sem arquivos de áudio.
- ⏸️ O botão **Pausar** fica sempre visível. A tecla **P** (ou **Esc**) também pausa. O jogo pausa sozinho quando a criança troca de janela.
- O jogo se ajusta ao tamanho da tela e roda leve em notebooks simples.

## Arquivos

```
index.html        as telas do jogo
css/estilo.css    cores, botões e letras
js/som.js         apito, chute e torcida (desligados no começo)
js/desenho.js     cores, nomes inventados e o desenho dos jogadores
js/partida.js     a partida com campo visto de cima
js/penaltis.js    a disputa de pênaltis
js/app.js         as telas, as escolhas, a pausa e o resultado
```
