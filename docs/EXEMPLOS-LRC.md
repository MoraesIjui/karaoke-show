# Exemplo de importação de áudio próprio

O app requer um arquivo de áudio instrumental e sua letra LRC. Não acompanha gravações comerciais.

## Formato LRC

```text
[ti:Minha Música]
[ar:Autor Próprio]
[00:04.00]Chegou a hora de cantar
[00:07.00]Cada palavra vem no tempo
[00:10.00]E a melodia fica no ar
```

O app estima intervalos por palavra dentro de cada linha. Para avaliação afinada precisa, o mapeamento de sílabas e notas individuais estará na versão 0.3.

## Formato JSON de notas

```json
[
  { "start": 4.0, "end": 4.6, "midi": 60 },
  { "start": 4.6, "end": 5.2, "midi": 62 },
  { "start": 5.2, "end": 5.8, "midi": 64 },
  { "start": 5.8, "end": 7.0, "midi": 65 }
]
```

MIDI: Dó4=60, Ré4=62, Mi4=64, Fá4=65, Sol4=67, Lá4=69. Cada intervalo precisa estar em segundos, ser positivo e não sobrepor outro. Para entrar no ranking, 80% ou mais das palavras estimadas devem receber uma nota.
