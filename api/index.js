// server/app.ts
import cors from "cors";
import dotenv3 from "dotenv";
import express, { Router as Router2 } from "express";

// server/authService.ts
import bcrypt2 from "bcryptjs";
import crypto from "crypto";

// server/db.ts
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { Pool } from "pg";

// server/seedData.ts
var INITIAL_SNE_CURRICULA = [
  {
    slug: "sne-bio-10",
    subject: "Biologia",
    grade: "10.\xAA Classe",
    gradeNumber: 10,
    cycle: "10-12",
    totalPages: 168,
    priceMt: 17,
    topics: [
      {
        unitLabel: "Bioenerg\xE9tica",
        title: "Fotoss\xEDntese e Fase Fotoqu\xEDmica",
        pageNumber: 84,
        pageEnd: 91,
        readingMinutes: 5,
        summaryHalfParagraph: "As plantas convertem luz solar, \xE1gua e CO\u2082 em glicose e oxig\xE9nio nos cloroplastos. O processo divide-se em fase fotoqu\xEDmica nos tilacoides e ciclo de Calvin no estroma.",
        keyTakeaways: [
          "Equa\xE7\xE3o global: 6 CO\u2082 + 6 H\u2082O + Luz \u2192 C\u2086H\u2081\u2082O\u2086 + 6 O\u2082.",
          "A fase fotoqu\xEDmica decorre nos tilacoides e liberta O\u2082 a partir da fot\xF3lise da \xE1gua.",
          "O ciclo de Calvin fixa CO\u2082 no estroma usando ATP e NADPH para formar glicose.",
          "Luz, CO\u2082 e temperatura atuam como fatores limitantes da taxa fotossint\xE9tica."
        ],
        keywords: [
          "fotoss\xEDntese",
          "cloroplastos",
          "clorofila",
          "tilacoides",
          "ciclo de calvin",
          "glicose",
          "fase clara",
          "estroma"
        ],
        previewParagraphs: [
          "A fotoss\xEDntese \xE9 o processo bioqu\xEDmico fundamental que sustenta quase toda a vida na Terra. Realizada por organismos autotr\xF3ficos como as plantas terrestres, as algas e as cianobact\xE9rias, consiste na capta\xE7\xE3o de energia luminosa do Sol para transformar \xE1gua (H\u2082O) e di\xF3xido de carbono (CO\u2082) em glicose (C\u2086H\u2081\u2082O\u2086), libertando oxig\xE9nio (O\u2082) para a atmosfera.",
          "Nas c\xE9lulas vegetais, este fen\xF3meno ocorre no interior dos cloroplastos. A clorofila, pigmento verde localizado nas membranas dos tilacoides, absorve preferencialmente radia\xE7\xF5es azuis e vermelhas, iniciando a cadeia de rea\xE7\xF5es da chamada fase fotoqu\xEDmica ou fase dependente da luz."
        ],
        paragraphs: [
          "A fotoss\xEDntese \xE9 o processo bioqu\xEDmico fundamental que sustenta quase toda a vida na Terra. Realizada por organismos autotr\xF3ficos como as plantas terrestres, as algas e as cianobact\xE9rias, consiste na capta\xE7\xE3o de energia luminosa do Sol para transformar \xE1gua (H\u2082O) e di\xF3xido de carbono (CO\u2082) em glicose (C\u2086H\u2081\u2082O\u2086), libertando oxig\xE9nio (O\u2082) para a atmosfera.",
          "Nas c\xE9lulas vegetais, este fen\xF3meno ocorre no interior dos cloroplastos. A clorofila, pigmento verde localizado nas membranas dos tilacoides, absorve preferencialmente radia\xE7\xF5es azuis e vermelhas, iniciando a cadeia de rea\xE7\xF5es da chamada fase fotoqu\xEDmica ou fase dependente da luz.",
          "Durante a fase fotoqu\xEDmica, a energia luminosa excita eletr\xF5es das mol\xE9culas de clorofila nos fotossistemas II e I. Simultaneamente ocorre a fot\xF3lise da \xE1gua, isto \xE9, a quebra de mol\xE9culas de H\u2082O em prot\xF5es (H\u207A), eletr\xF5es e oxig\xE9nio molecular (O\u2082), que se difunde para fora da folha atrav\xE9s dos estomas. A passagem dos eletr\xF5es pela cadeia transportadora permite sintetizar ATP (fotofosforila\xE7\xE3o) e reduzir NADP\u207A em NADPH.",
          "A segunda etapa designa-se fase qu\xEDmica ou ciclo de Calvin e decorre no estroma do cloroplasto. Embora n\xE3o dependa da incid\xEAncia imediata de luz, utiliza obrigatoriamente o ATP e o NADPH produzidos antes. A enzima RuBisCO catalisa a fixa\xE7\xE3o do CO\u2082 atmosf\xE9rico numa mol\xE9cula de cinco carbonos (RuBP), originando trioses-fosfato precursoras da glicose e do amido.",
          "A velocidade da fotoss\xEDntese depende de tr\xEAs fatores ambientais principais: intensidade luminosa, concentra\xE7\xE3o de CO\u2082 e temperatura. Ao aumentar a luz, a taxa cresce at\xE9 atingir o ponto de satura\xE7\xE3o luminosa, a partir do qual outro fator passa a limitar o processo.",
          "Nota importante para exame: o oxig\xE9nio libertado na fotoss\xEDntese prov\xE9m exclusivamente da fot\xF3lise da \xE1gua e n\xE3o do CO\u2082. Em climas quentes como o de Mo\xE7ambique, culturas como milho e cana-de-a\xE7\xFAcar usam a via C4 para conservar \xE1gua nos estomas mantendo elevada produtividade."
        ],
        pages: [
          {
            pageNumber: 84,
            paragraphs: [
              "A fotoss\xEDntese \xE9 o processo bioqu\xEDmico fundamental que sustenta quase toda a vida na Terra. Realizada por organismos autotr\xF3ficos como as plantas terrestres, as algas e as cianobact\xE9rias, consiste na capta\xE7\xE3o de energia luminosa do Sol para transformar \xE1gua (H\u2082O) e di\xF3xido de carbono (CO\u2082) em glicose (C\u2086H\u2081\u2082O\u2086), libertando oxig\xE9nio (O\u2082) para a atmosfera.",
              "Nas c\xE9lulas vegetais, este fen\xF3meno ocorre no interior dos cloroplastos. A clorofila, pigmento verde localizado nas membranas dos tilacoides, absorve preferencialmente radia\xE7\xF5es azuis e vermelhas, iniciando a cadeia de rea\xE7\xF5es da chamada fase fotoqu\xEDmica ou fase dependente da luz."
            ]
          },
          {
            pageNumber: 85,
            paragraphs: [
              "Durante a fase fotoqu\xEDmica, a energia luminosa excita eletr\xF5es das mol\xE9culas de clorofila nos fotossistemas II e I. Simultaneamente ocorre a fot\xF3lise da \xE1gua, isto \xE9, a quebra de mol\xE9culas de H\u2082O em prot\xF5es (H\u207A), eletr\xF5es e oxig\xE9nio molecular (O\u2082), que se difunde para fora da folha atrav\xE9s dos estomas. A passagem dos eletr\xF5es pela cadeia transportadora permite sintetizar ATP (fotofosforila\xE7\xE3o) e reduzir NADP\u207A em NADPH.",
              "A segunda etapa designa-se fase qu\xEDmica ou ciclo de Calvin e decorre no estroma do cloroplasto. Embora n\xE3o dependa da incid\xEAncia imediata de luz, utiliza obrigatoriamente o ATP e o NADPH produzidos antes. A enzima RuBisCO catalisa a fixa\xE7\xE3o do CO\u2082 atmosf\xE9rico numa mol\xE9cula de cinco carbonos (RuBP), originando trioses-fosfato precursoras da glicose e do amido."
            ]
          },
          {
            pageNumber: 86,
            paragraphs: [
              "A velocidade da fotoss\xEDntese depende de tr\xEAs fatores ambientais principais: intensidade luminosa, concentra\xE7\xE3o de CO\u2082 e temperatura. Ao aumentar a luz, a taxa cresce at\xE9 atingir o ponto de satura\xE7\xE3o luminosa, a partir do qual outro fator passa a limitar o processo.",
              "Nota importante para exame: o oxig\xE9nio libertado na fotoss\xEDntese prov\xE9m exclusivamente da fot\xF3lise da \xE1gua e n\xE3o do CO\u2082. Em climas quentes como o de Mo\xE7ambique, culturas como milho e cana-de-a\xE7\xFAcar usam a via C4 para conservar \xE1gua nos estomas mantendo elevada produtividade."
            ]
          }
        ],
        visuals: [
          {
            id: "vec-bio-10-foto",
            kind: "vector_diagram",
            pageNumber: 84,
            title: "Esquema da Fotoss\xEDntese nos Cloroplastos",
            caption: "Fluxo energ\xE9tico desde a absor\xE7\xE3o luminosa nos tilacoides at\xE9 \xE0 s\xEDntese de glicose no estroma.",
            diagram: {
              type: "flow",
              formula: "6 CO\u2082 + 6 H\u2082O + Luz Solar \u2192 C\u2086H\u2081\u2082O\u2086 + 6 O\u2082",
              steps: [
                {
                  label: "Capta\xE7\xE3o da Luz e Fot\xF3lise da \xC1gua",
                  badge: "Tilacoides",
                  detail: "A clorofila absorve luz solar; H\u2082O quebra-se libertando O\u2082, ATP e NADPH."
                },
                {
                  label: "Ciclo de Calvin (Fixa\xE7\xE3o de CO\u2082)",
                  badge: "Estroma",
                  detail: "A enzima RuBisCO fixa CO\u2082 usando ATP e NADPH da fase fotoqu\xEDmica."
                },
                {
                  label: "Produ\xE7\xE3o de Compostos Org\xE2nicos",
                  badge: "Produto Final",
                  detail: "S\xEDntese de glicose (C\u2086H\u2081\u2082O\u2086) e amido para nutri\xE7\xE3o celular da planta."
                }
              ]
            }
          }
        ]
      },
      {
        unitLabel: "Bioenerg\xE9tica",
        title: "Respira\xE7\xE3o Celular Aer\xF3bia e Mitoc\xF4ndrias",
        pageNumber: 96,
        pageEnd: 103,
        readingMinutes: 4,
        summaryHalfParagraph: "Degrada\xE7\xE3o completa da glicose na presen\xE7a de oxig\xE9nio atrav\xE9s da glic\xF3lise, ciclo de Krebs e cadeia respirat\xF3ria, produzindo elevado rendimento de ATP nas mitoc\xF4ndrias.",
        keyTakeaways: [
          "A glic\xF3lise decorre no citoplasma sem oxig\xE9nio e rende 2 piruvatos e 2 ATP l\xEDquidos.",
          "O ciclo de Krebs realiza-se na matriz mitocondrial libertando CO\u2082, NADH e FADH\u2082.",
          "A fosforila\xE7\xE3o oxidativa nas cristas mitocondriais gera a maior parte do ATP."
        ],
        keywords: ["respira\xE7\xE3o celular", "mitoc\xF4ndria", "atp", "glic\xF3lise", "ciclo de krebs", "aer\xF3bia"],
        previewParagraphs: [
          "A respira\xE7\xE3o celular aer\xF3bia \xE9 o principal mecanismo pelo qual as c\xE9lulas eucari\xF3ticas extraem energia qu\xEDmica armazenada na glicose. Ao contr\xE1rio da fermenta\xE7\xE3o, exige oxig\xE9nio como recetor final de eletr\xF5es para oxidar completamente o substrato.",
          "O processo organiza-se em tr\xEAs fases sequenciais: glic\xF3lise no hialoplasma, ciclo de Krebs na matriz mitocondrial e fosforila\xE7\xE3o oxidativa nas cristas da mitoc\xF4ndria."
        ],
        paragraphs: [
          "A respira\xE7\xE3o celular aer\xF3bia \xE9 o principal mecanismo pelo qual as c\xE9lulas eucari\xF3ticas extraem energia qu\xEDmica armazenada na glicose. Ao contr\xE1rio da fermenta\xE7\xE3o, exige oxig\xE9nio como recetor final de eletr\xF5es para oxidar completamente o substrato.",
          "O processo organiza-se em tr\xEAs fases sequenciais: glic\xF3lise no hialoplasma, ciclo de Krebs na matriz mitocondrial e fosforila\xE7\xE3o oxidativa nas cristas da mitoc\xF4ndria.",
          "Na glic\xF3lise, uma mol\xE9cula de glicose (6 carbonos) divide-se em duas mol\xE9culas de piruvato (3 carbonos), com saldo direto de 2 ATP e 2 NADH. Com oxig\xE9nio dispon\xEDvel, o piruvato entra na mitoc\xF4ndria e converte-se em acetil-CoA.",
          "No ciclo de Krebs, o grupo acetilo liga-se ao oxaloacetato formando citrato, libertando CO\u2082 e carregando coenzimas transportadoras de eletr\xF5es (NADH e FADH\u2082).",
          "Na cadeia respirat\xF3ria, o fluxo de eletr\xF5es cria um gradiente de prot\xF5es que aciona a enzima ATP-sintase, originando entre 30 e 32 mol\xE9culas de ATP por glicose degradada e \xE1gua como produto final."
        ],
        visuals: [
          {
            id: "vec-bio-10-resp",
            kind: "vector_diagram",
            pageNumber: 96,
            title: "Etapas da Respira\xE7\xE3o Celular Aer\xF3bia",
            caption: "Localiza\xE7\xE3o celular e rendimento energ\xE9tico em cada etapa da degrada\xE7\xE3o da glicose.",
            diagram: {
              type: "flow",
              formula: "C\u2086H\u2081\u2082O\u2086 + 6 O\u2082 \u2192 6 CO\u2082 + 6 H\u2082O + 30\u201332 ATP",
              steps: [
                {
                  label: "1. Glic\xF3lise",
                  badge: "Citoplasma",
                  detail: "Glicose (6C) divide-se em 2 piruvatos (3C). Saldo imediato: 2 ATP e 2 NADH."
                },
                {
                  label: "2. Ciclo de Krebs",
                  badge: "Matriz Mitocondrial",
                  detail: "Acetil-CoA oxida-se completamente libertando CO\u2082, NADH e FADH\u2082."
                },
                {
                  label: "3. Cadeia Respirat\xF3ria",
                  badge: "Cristas",
                  detail: "ATP-sintase produz ~28 ATP usando oxig\xE9nio como recetor final (forma H\u2082O)."
                }
              ]
            }
          }
        ]
      }
    ]
  },
  {
    slug: "sne-mat-9",
    subject: "Matem\xE1tica",
    grade: "9.\xAA Classe",
    gradeNumber: 9,
    cycle: "7-9",
    totalPages: 194,
    priceMt: 17,
    topics: [
      {
        unitLabel: "\xC1lgebra",
        title: "Equa\xE7\xF5es do 2.\xBA Grau e F\xF3rmula Resolvente",
        pageNumber: 112,
        pageEnd: 121,
        readingMinutes: 5,
        summaryHalfParagraph: "Resolu\xE7\xE3o de equa\xE7\xF5es ax\xB2 + bx + c = 0 atrav\xE9s do discriminante \u0394 = b\xB2 - 4ac e da f\xF3rmula resolvente, incluindo an\xE1lise do n\xFAmero de ra\xEDzes reais e casos incompletos.",
        keyTakeaways: [
          "Forma can\xF3nica: ax\xB2 + bx + c = 0, com a \u2260 0.",
          "Discriminante \u0394 = b\xB2 - 4ac indica quantas ra\xEDzes reais existem.",
          "F\xF3rmula resolvente: x = (-b \xB1 \u221A\u0394) / (2a).",
          "Rela\xE7\xF5es de Vi\xE8te: soma das ra\xEDzes = -b/a e produto = c/a."
        ],
        keywords: [
          "equa\xE7\xF5es do 2.\xBA grau",
          "equa\xE7\xE3o quadr\xE1tica",
          "delta",
          "discriminante",
          "f\xF3rmula resolvente",
          "bhaskara",
          "ra\xEDzes",
          "\xE1lgebra"
        ],
        previewParagraphs: [
          "Chama-se equa\xE7\xE3o do 2.\xBA grau a uma inc\xF3gnita x toda a equa\xE7\xE3o redut\xEDvel \xE0 forma can\xF3nica ax\xB2 + bx + c = 0, onde a, b e c s\xE3o coeficientes reais com a \u2260 0. Quando todos os coeficientes s\xE3o n\xE3o nulos, a equa\xE7\xE3o diz-se completa; se b = 0 ou c = 0, diz-se incompleta.",
          "Para resolver qualquer equa\xE7\xE3o completa do 2.\xBA grau, calcula-se primeiro o discriminante Delta: \u0394 = b\xB2 - 4ac. O sinal de \u0394 indica de imediato quantas solu\xE7\xF5es reais a equa\xE7\xE3o admite antes de finalizar o c\xE1lculo."
        ],
        paragraphs: [
          "Chama-se equa\xE7\xE3o do 2.\xBA grau a uma inc\xF3gnita x toda a equa\xE7\xE3o redut\xEDvel \xE0 forma can\xF3nica ax\xB2 + bx + c = 0, onde a, b e c s\xE3o coeficientes reais com a \u2260 0. Quando todos os coeficientes s\xE3o n\xE3o nulos, a equa\xE7\xE3o diz-se completa; se b = 0 ou c = 0, diz-se incompleta.",
          "Para resolver qualquer equa\xE7\xE3o completa do 2.\xBA grau, calcula-se primeiro o discriminante Delta: \u0394 = b\xB2 - 4ac. O sinal de \u0394 indica de imediato quantas solu\xE7\xF5es reais a equa\xE7\xE3o admite antes de finalizar o c\xE1lculo.",
          "An\xE1lise do discriminante: se \u0394 > 0 existem duas ra\xEDzes reais distintas; se \u0394 = 0 existe uma raiz real dupla x = -b / (2a); se \u0394 < 0 n\xE3o existem ra\xEDzes reais e o conjunto-solu\xE7\xE3o \xE9 vazio (S = \u2205).",
          "Exemplo resolvido: resolver x\xB2 - 5x + 6 = 0. Identificamos a = 1, b = -5 e c = 6. Calculamos \u0394 = (-5)\xB2 - 4(1)(6) = 25 - 24 = 1. Aplicando x = (5 \xB1 \u221A1) / 2 obtemos x\u2081 = 3 e x\u2082 = 2. Logo, S = {2, 3}.",
          "Nas equa\xE7\xF5es incompletas, o caminho \xE9 direto: se c = 0 (ex.: 2x\xB2 - 8x = 0), evidencia-se x(2x - 8) = 0, obtendo x = 0 ou x = 4. Se b = 0 (ex.: x\xB2 - 9 = 0), isola-se x\xB2 = 9 e extrai-se x = \xB13.",
          "Verifica\xE7\xE3o r\xE1pida pela Soma e Produto: x\u2081 + x\u2082 = -b/a e x\u2081 \xB7 x\u2082 = c/a. No exemplo, 2 + 3 = 5 e 2 \xD7 3 = 6, confirmando a exatid\xE3o."
        ],
        visuals: [
          {
            id: "vec-mat-9-delta",
            kind: "vector_diagram",
            pageNumber: 112,
            title: "Interpreta\xE7\xE3o Geom\xE9trica do Discriminante (\u0394)",
            caption: "Rela\xE7\xE3o entre o sinal de \u0394 e os pontos onde a par\xE1bola interseta o eixo das abcissas (x).",
            diagram: {
              type: "parabola_delta",
              equation: "ax\xB2 + bx + c = 0   (a \u2260 0)",
              formula: "\u0394 = b\xB2 \u2212 4ac   |   x = (\u2212b \xB1 \u221A\u0394) / 2a",
              cases: [
                { condition: "\u0394 > 0", label: "2 ra\xEDzes reais" },
                { condition: "\u0394 = 0", label: "1 raiz dupla" },
                { condition: "\u0394 < 0", label: "Sem ra\xEDzes reais" }
              ]
            }
          }
        ]
      },
      {
        unitLabel: "Geometria",
        title: "Teorema de Pit\xE1goras e Tri\xE2ngulos Ret\xE2ngulos",
        pageNumber: 74,
        pageEnd: 81,
        readingMinutes: 4,
        summaryHalfParagraph: "Num tri\xE2ngulo ret\xE2ngulo, o quadrado da hipotenusa iguala a soma dos quadrados dos catetos (h\xB2 = a\xB2 + b\xB2), permitindo calcular lados desconhecidos e dist\xE2ncias reais.",
        keyTakeaways: [
          "A hipotenusa \xE9 o lado oposto ao \xE2ngulo de 90\xB0 e o maior lado.",
          "Rela\xE7\xE3o fundamental: h\xB2 = a\xB2 + b\xB2.",
          "Ternos pitag\xF3ricos \xFAteis: (3, 4, 5) e (5, 12, 13)."
        ],
        keywords: ["pit\xE1goras", "hipotenusa", "catetos", "tri\xE2ngulo ret\xE2ngulo", "geometria"],
        previewParagraphs: [
          "Em todo o tri\xE2ngulo ret\xE2ngulo, o lado oposto ao \xE2ngulo reto designa-se hipotenusa e os dois lados que formam o \xE2ngulo de 90\xB0 designam-se catetos. O Teorema de Pit\xE1goras estabelece que a \xE1rea do quadrado sobre a hipotenusa iguala a soma das \xE1reas dos quadrados sobre os catetos.",
          "Algebricamente escreve-se h\xB2 = a\xB2 + b\xB2. Conhecendo quaisquer dois lados de um tri\xE2ngulo ret\xE2ngulo, determina-se com exatid\xE3o o terceiro lado."
        ],
        paragraphs: [
          "Em todo o tri\xE2ngulo ret\xE2ngulo, o lado oposto ao \xE2ngulo reto designa-se hipotenusa e os dois lados que formam o \xE2ngulo de 90\xB0 designam-se catetos. O Teorema de Pit\xE1goras estabelece que a \xE1rea do quadrado sobre a hipotenusa iguala a soma das \xE1reas dos quadrados sobre os catetos.",
          "Algebricamente escreve-se h\xB2 = a\xB2 + b\xB2. Conhecendo quaisquer dois lados de um tri\xE2ngulo ret\xE2ngulo, determina-se com exatid\xE3o o terceiro lado.",
          "Exemplo pr\xE1tico: uma escada de 5 m encosta numa parede vertical com a base afastada 3 m. Pela f\xF3rmula: 5\xB2 = 3\xB2 + h\xB2 \u21D2 25 = 9 + h\xB2 \u21D2 h\xB2 = 16 \u21D2 h = 4 metros de altura.",
          "O rec\xEDproco do teorema confirma \xE2ngulos retos na pr\xE1tica: se tr\xEAs medidas satisfazem c\xB2 = a\xB2 + b\xB2, ent\xE3o o \xE2ngulo oposto ao lado c mede exatamente 90\xB0."
        ],
        visuals: [
          {
            id: "vec-mat-9-pit",
            kind: "vector_diagram",
            pageNumber: 74,
            title: "Esquema Geom\xE9trico do Teorema de Pit\xE1goras",
            caption: "Identifica\xE7\xE3o dos catetos adjacentes ao \xE2ngulo de 90\xB0 e da hipotenusa oposta.",
            diagram: {
              type: "geometry_triangle",
              sideA: "Cateto (a)",
              sideB: "Cateto (b)",
              hypotenuse: "Hipotenusa (h)",
              formula: "h\xB2 = a\xB2 + b\xB2",
              note: "Ex.: 5\xB2 = 4\xB2 + 3\xB2"
            }
          }
        ]
      }
    ]
  },
  {
    slug: "sne-his-10",
    subject: "Hist\xF3ria",
    grade: "10.\xAA Classe",
    gradeNumber: 10,
    cycle: "10-12",
    totalPages: 152,
    priceMt: 17,
    topics: [
      {
        unitLabel: "Mo\xE7ambique Contempor\xE2neo",
        title: "Luta de Liberta\xE7\xE3o e Independ\xEAncia de Mo\xE7ambique",
        pageNumber: 67,
        pageEnd: 76,
        readingMinutes: 5,
        summaryHalfParagraph: "Da funda\xE7\xE3o da FRELIMO (1962) e in\xEDcio da luta armada em Chai (1964) aos Acordos de Lusaka e proclama\xE7\xE3o da Independ\xEAncia Nacional a 25 de Junho de 1975.",
        keyTakeaways: [
          "25 de Junho de 1962: funda\xE7\xE3o da FRELIMO em Dar-es-Salaam sob Eduardo Mondlane.",
          "25 de Setembro de 1964: in\xEDcio da Luta Armada em Chai, Cabo Delgado.",
          "7 de Setembro de 1974: assinatura dos Acordos de Lusaka.",
          "25 de Junho de 1975: proclama\xE7\xE3o oficial da Independ\xEAncia por Samora Machel."
        ],
        keywords: [
          "independ\xEAncia de mo\xE7ambique",
          "frelimo",
          "eduardo mondlane",
          "samora machel",
          "acordos de lusaka",
          "25 de junho",
          "1975",
          "chai"
        ],
        previewParagraphs: [
          "O caminho para a soberania nacional de Mo\xE7ambique consolidou-se com a unifica\xE7\xE3o dos movimentos UDENAMO, MANU e UNAMI na Frente de Liberta\xE7\xE3o de Mo\xE7ambique (FRELIMO), fundada a 25 de Junho de 1962 em Dar-es-Salaam sob lideran\xE7a de Eduardo Chivambo Mondlane.",
          "Perante a recusa colonial em negociar a autodetermina\xE7\xE3o pac\xEDfica, iniciou-se a Luta Armada de Liberta\xE7\xE3o Nacional a 25 de Setembro de 1964, com o ataque ao posto de Chai em Cabo Delgado, expandindo as zonas libertadas no norte do pa\xEDs."
        ],
        paragraphs: [
          "O caminho para a soberania nacional de Mo\xE7ambique consolidou-se com a unifica\xE7\xE3o dos movimentos UDENAMO, MANU e UNAMI na Frente de Liberta\xE7\xE3o de Mo\xE7ambique (FRELIMO), fundada a 25 de Junho de 1962 em Dar-es-Salaam sob lideran\xE7a de Eduardo Chivambo Mondlane.",
          "Perante a recusa colonial em negociar a autodetermina\xE7\xE3o pac\xEDfica, iniciou-se a Luta Armada de Liberta\xE7\xE3o Nacional a 25 de Setembro de 1964, com o ataque ao posto de Chai em Cabo Delgado, expandindo as zonas libertadas no norte do pa\xEDs.",
          "Nas zonas libertadas organizaram-se escolas comunit\xE1rias, postos de sa\xFAde e cooperativas agr\xEDcolas. Ap\xF3s o assassinato de Eduardo Mondlane a 3 de Fevereiro de 1969, Samora Mois\xE9s Machel assumiu a lideran\xE7a e estendeu as frentes de combate a sul do rio Zambeze.",
          "O desgaste das guerras coloniais precipitou o 25 de Abril de 1974 em Portugal, abrindo caminho aos Acordos de Lusaka (7 de Setembro de 1974), que estabeleceram o cessar-fogo e o Governo de Transi\xE7\xE3o chefiado por Joaquim Chissano.",
          "\xC0 meia-noite de 25 de Junho de 1975, no Est\xE1dio da Machava em Maputo, Samora Machel proclamou a Independ\xEAncia Total e Completa de Mo\xE7ambique, marcando o nascimento do Estado soberano mo\xE7ambicano."
        ],
        visuals: [
          {
            id: "vec-his-10-indep",
            kind: "vector_diagram",
            pageNumber: 67,
            title: "Cronologia da Independ\xEAncia de Mo\xE7ambique",
            caption: "Marcos hist\xF3ricos decisivos desde a funda\xE7\xE3o da FRELIMO at\xE9 \xE0 proclama\xE7\xE3o da soberania.",
            diagram: {
              type: "timeline",
              events: [
                { date: "25 Jun 1962", label: "Funda\xE7\xE3o da FRELIMO", detail: "Unifica\xE7\xE3o dos movimentos em Dar-es-Salaam (Eduardo Mondlane)." },
                { date: "25 Set 1964", label: "In\xEDcio da Luta Armada", detail: "Ataque ao posto de Chai em Cabo Delgado." },
                { date: "7 Set 1974", label: "Acordos de Lusaka", detail: "Cessar-fogo e Governo de Transi\xE7\xE3o chefiado por Joaquim Chissano." },
                { date: "25 Jun 1975", label: "Independ\xEAncia Nacional", detail: "Proclama\xE7\xE3o oficial por Samora Machel no Est\xE1dio da Machava." }
              ]
            }
          }
        ]
      }
    ]
  },
  {
    slug: "sne-por-6",
    subject: "Portugu\xEAs",
    grade: "6.\xAA Classe",
    gradeNumber: 6,
    cycle: "1-6",
    totalPages: 128,
    priceMt: 17,
    topics: [
      {
        unitLabel: "Funcionamento da L\xEDngua",
        title: "Classes de Palavras: Nomes, Adjetivos e Verbos",
        pageNumber: 45,
        pageEnd: 52,
        readingMinutes: 4,
        summaryHalfParagraph: "Identifica\xE7\xE3o pr\xE1tica das tr\xEAs classes vari\xE1veis essenciais da frase: nomes pr\xF3prios e comuns, concord\xE2ncia dos adjetivos e conjuga\xE7\xF5es verbais.",
        keyTakeaways: [
          "Nomes designam seres, lugares, objetos e sentimentos (pr\xF3prios ou comuns).",
          "Adjetivos caracterizam o nome e concordam sempre em g\xE9nero e n\xFAmero.",
          "Verbos exprimem a\xE7\xF5es, estados ou fen\xF3menos da natureza (-ar, -er, -ir)."
        ],
        keywords: [
          "classes de palavras",
          "nomes",
          "substantivos",
          "adjetivos",
          "verbos",
          "gram\xE1tica",
          "portugu\xEAs"
        ],
        previewParagraphs: [
          "As palavras que usamos para falar e escrever organizam-se em classes de palavras conforme a fun\xE7\xE3o que desempenham na frase. Dominar nomes, adjetivos e verbos garante frases claras e concord\xE2ncia correta.",
          "O nome (ou substantivo) identifica pessoas, animais, lugares, objetos e sentimentos. Pode ser pr\xF3prio, escrito com mai\xFAscula (ex.: Inhambane, Amina), ou comum, designando todos os seres da mesma esp\xE9cie (ex.: escola, rio)."
        ],
        paragraphs: [
          "As palavras que usamos para falar e escrever organizam-se em classes de palavras conforme a fun\xE7\xE3o que desempenham na frase. Dominar nomes, adjetivos e verbos garante frases claras e concord\xE2ncia correta.",
          "O nome (ou substantivo) identifica pessoas, animais, lugares, objetos e sentimentos. Pode ser pr\xF3prio, escrito com mai\xFAscula (ex.: Inhambane, Amina), ou comum, designando todos os seres da mesma esp\xE9cie (ex.: escola, rio).",
          'O adjetivo acompanha o nome para atribuir uma qualidade ou estado. Na frase "A estudante dedicada leu o caderno novo", "dedicada" e "novo" s\xE3o adjetivos que concordam em g\xE9nero e n\xFAmero com os nomes respetivos.',
          "O verbo constitui o n\xFAcleo da frase verbal, indicando a\xE7\xE3o (estudar, escrever), estado (ser, estar) ou fen\xF3meno natural (chover). Agrupa-se em tr\xEAs conjuga\xE7\xF5es: 1.\xAA (-ar), 2.\xAA (-er) e 3.\xAA (-ir).",
          'Exerc\xEDcio resolvido: em "O vento fresco agitava as folhas verdes", "vento" e "folhas" s\xE3o nomes comuns, "fresco" e "verdes" s\xE3o adjetivos e "agitava" \xE9 verbo da 1.\xAA conjuga\xE7\xE3o.'
        ],
        visuals: [
          {
            id: "vec-por-6-classes",
            kind: "vector_diagram",
            pageNumber: 45,
            title: "Quadro Comparativo das Classes de Palavras",
            caption: "Como identificar rapidamente nomes, adjetivos e verbos dentro da frase.",
            diagram: {
              type: "compare",
              columns: [
                {
                  title: "Nomes",
                  badge: "Seres / Coisas",
                  points: ["Identificam pessoas, lugares e objetos", "Pr\xF3prios (Maputo, Amina)", "Comuns (escola, rio, vento)"]
                },
                {
                  title: "Adjetivos",
                  badge: "Qualidades",
                  points: ["Caracterizam o nome", "Concordam em g\xE9nero e n\xFAmero", "Ex.: dedicada, fresco, verdes"]
                },
                {
                  title: "Verbos",
                  badge: "A\xE7\xF5es / Estados",
                  points: ["N\xFAcleo da frase verbal", "Conjuga\xE7\xF5es: -ar, -er, -ir", "Ex.: estudar, correr, chover"]
                }
              ]
            }
          }
        ]
      }
    ]
  },
  {
    slug: "sne-fis-11",
    subject: "F\xEDsica",
    grade: "11.\xAA Classe",
    gradeNumber: 11,
    cycle: "10-12",
    totalPages: 180,
    priceMt: 17,
    topics: [
      {
        unitLabel: "Mec\xE2nica",
        title: "Cinem\xE1tica: Movimento Retil\xEDneo Uniformemente Variado (MRUV)",
        pageNumber: 38,
        pageEnd: 47,
        readingMinutes: 5,
        summaryHalfParagraph: "Estudo do movimento em linha reta com acelera\xE7\xE3o constante: equa\xE7\xF5es hor\xE1rias da velocidade e posi\xE7\xE3o, equa\xE7\xE3o de Torricelli e leitura de gr\xE1ficos v(t).",
        keyTakeaways: [
          "Acelera\xE7\xE3o escalar constante: a = (v - v\u2080) / \u0394t (unidade SI: m/s\xB2).",
          "Velocidade: v = v\u2080 + a\xB7t e posi\xE7\xE3o: x = x\u2080 + v\u2080\xB7t + \xBD\xB7a\xB7t\xB2.",
          "Equa\xE7\xE3o de Torricelli (sem tempo): v\xB2 = v\u2080\xB2 + 2\xB7a\xB7\u0394x."
        ],
        keywords: [
          "cinem\xE1tica",
          "mruv",
          "acelera\xE7\xE3o",
          "velocidade",
          "torricelli",
          "movimento retil\xEDneo",
          "f\xEDsica"
        ],
        previewParagraphs: [
          "A Cinem\xE1tica descreve o movimento dos corpos sem analisar as for\xE7as que o provocam. Quando um m\xF3vel segue trajet\xF3ria retil\xEDnea com varia\xE7\xF5es iguais de velocidade em intervalos iguais de tempo, realiza um Movimento Retil\xEDneo Uniformemente Variado (MRUV).",
          "A grandeza central deste movimento \xE9 a acelera\xE7\xE3o escalar constante (a), definida pela raz\xE3o a = \u0394v / \u0394t e medida em m/s\xB2 no Sistema Internacional."
        ],
        paragraphs: [
          "A Cinem\xE1tica descreve o movimento dos corpos sem analisar as for\xE7as que o provocam. Quando um m\xF3vel segue trajet\xF3ria retil\xEDnea com varia\xE7\xF5es iguais de velocidade em intervalos iguais de tempo, realiza um Movimento Retil\xEDneo Uniformemente Variado (MRUV).",
          "A grandeza central deste movimento \xE9 a acelera\xE7\xE3o escalar constante (a), definida pela raz\xE3o a = \u0394v / \u0394t e medida em m/s\xB2 no Sistema Internacional.",
          "Quando velocidade e acelera\xE7\xE3o t\xEAm o mesmo sinal, o movimento \xE9 acelerado; quando t\xEAm sinais opostos, como numa travagem, o movimento \xE9 retardado.",
          "Equa\xE7\xF5es fundamentais do MRUV: v(t) = v\u2080 + a\xB7t; x(t) = x\u2080 + v\u2080\xB7t + \xBD\xB7a\xB7t\xB2; e equa\xE7\xE3o de Torricelli v\xB2 = v\u2080\xB2 + 2\xB7a\xB7\u0394x para problemas sem informa\xE7\xE3o de tempo.",
          "Exemplo resolvido: um autocarro parte do repouso (v\u2080 = 0) com a = 2 m/s\xB2 durante 6 s. Atinge v = 12 m/s e percorre \u0394x = \xBD \xD7 2 \xD7 6\xB2 = 36 metros, valor equivalente \xE0 \xE1rea sob o gr\xE1fico v(t)."
        ],
        visuals: [
          {
            id: "vec-fis-11-mruv",
            kind: "vector_diagram",
            pageNumber: 38,
            title: "Gr\xE1fico Velocidade-Tempo v(t) e Equa\xE7\xF5es do MRUV",
            caption: "A inclina\xE7\xE3o da reta representa a acelera\xE7\xE3o (a) e a \xE1rea sombreada corresponde ao deslocamento \u0394x.",
            diagram: {
              type: "kinematics_graph",
              xLabel: "Tempo (s)",
              yLabel: "v (m/s)",
              areaLabel: "\xC1rea = \u0394x",
              equations: [
                "a = (v \u2212 v\u2080) / \u0394t",
                "v = v\u2080 + a\xB7t",
                "x = x\u2080 + v\u2080\xB7t + \xBD\xB7a\xB7t\xB2",
                "v\xB2 = v\u2080\xB2 + 2\xB7a\xB7\u0394x"
              ]
            }
          }
        ]
      }
    ]
  },
  {
    slug: "sne-cn-5",
    subject: "Ci\xEAncias Naturais",
    grade: "5.\xAA Classe",
    gradeNumber: 5,
    cycle: "1-6",
    totalPages: 96,
    priceMt: 17,
    topics: [
      {
        unitLabel: "A \xC1gua e a Natureza",
        title: "O Ciclo da \xC1gua na Natureza",
        pageNumber: 31,
        pageEnd: 36,
        readingMinutes: 3,
        summaryHalfParagraph: "Circula\xE7\xE3o cont\xEDnua da \xE1gua entre rios, oceanos, nuvens e solo atrav\xE9s da evapora\xE7\xE3o, condensa\xE7\xE3o, precipita\xE7\xE3o e infiltra\xE7\xE3o impulsionadas pelo calor do Sol.",
        keyTakeaways: [
          "Evapora\xE7\xE3o: o calor solar transforma \xE1gua l\xEDquida em vapor.",
          "Condensa\xE7\xE3o: o vapor arrefece em altitude formando nuvens.",
          "Precipita\xE7\xE3o e infiltra\xE7\xE3o devolvem \xE1gua aos rios e len\xE7\xF3is subterr\xE2neos."
        ],
        keywords: ["ciclo da \xE1gua", "evapora\xE7\xE3o", "condensa\xE7\xE3o", "precipita\xE7\xE3o", "nuvens", "chuva"],
        previewParagraphs: [
          "A \xE1gua na Terra circula continuamente entre o estado l\xEDquido e o estado gasoso. A este percurso permanente entre a superf\xEDcie terrestre e a atmosfera d\xE1-se o nome de ciclo da \xE1gua ou ciclo hidrol\xF3gico.",
          "O motor deste ciclo \xE9 a energia solar. Ao aquecer oceanos, solos h\xFAmidos e rios como o Zambeze e o Limpopo, o calor provoca a evapora\xE7\xE3o, fazendo subir vapor de \xE1gua para a atmosfera."
        ],
        paragraphs: [
          "A \xE1gua na Terra circula continuamente entre o estado l\xEDquido e o estado gasoso. A este percurso permanente entre a superf\xEDcie terrestre e a atmosfera d\xE1-se o nome de ciclo da \xE1gua ou ciclo hidrol\xF3gico.",
          "O motor deste ciclo \xE9 a energia solar. Ao aquecer oceanos, solos h\xFAmidos e rios como o Zambeze e o Limpopo, o calor provoca a evapora\xE7\xE3o, fazendo subir vapor de \xE1gua para a atmosfera.",
          "Ao subir para camadas mais frias da atmosfera, o vapor arrefece e forma min\xFAsculas got\xEDculas l\xEDquidas num processo chamado condensa\xE7\xE3o, originando as nuvens.",
          "Quando as got\xEDculas ficam pesadas, caem sob a forma de chuva (precipita\xE7\xE3o). Parte escorre pelos rios de volta ao mar e outra parte infiltra-se no solo, alimentando po\xE7os e nascentes."
        ],
        visuals: [
          {
            id: "vec-cn-5-agua",
            kind: "vector_diagram",
            pageNumber: 31,
            title: "Esquema do Ciclo da \xC1gua na Natureza",
            caption: "Movimento cont\xEDnuo impulsionado pela energia solar entre superf\xEDcie, atmosfera e solo.",
            diagram: {
              type: "cycle",
              centerLabel: "Ciclo da \xC1gua",
              nodes: [
                { label: "Evapora\xE7\xE3o", detail: "Calor solar transforma \xE1gua em vapor" },
                { label: "Condensa\xE7\xE3o", detail: "Vapor arrefece e forma nuvens" },
                { label: "Precipita\xE7\xE3o", detail: "Queda de chuva sobre a terra" },
                { label: "Infiltra\xE7\xE3o", detail: "Alimenta rios e \xE1guas subterr\xE2neas" }
              ]
            }
          }
        ]
      }
    ]
  }
];

// server/db.ts
dotenv.config();
var connectionString = process.env.DATABASE_URL;
var pool = connectionString ? new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 25e3
}) : null;
function normalizeSearchText(input) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();
}
async function ensureSchema() {
  if (!pool) {
    return { connected: false, error: "DATABASE_URL n\xE3o configurada" };
  }
  try {
    try {
      const fastCheck = await pool.query(
        `SELECT key FROM folio_meta WHERE key = 'schema_ready_v3' LIMIT 1`
      );
      if (fastCheck.rows.length > 0) {
        return { connected: true };
      }
    } catch {
    }
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folio_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT UNIQUE NOT NULL,
        device_label TEXT NOT NULL DEFAULT 'Dispositivo',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
      ON user_sessions (user_id, last_seen_at DESC);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS curricula (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE,
        grade TEXT NOT NULL,
        grade_number INT NOT NULL,
        cycle TEXT NOT NULL,
        subject TEXT NOT NULL,
        total_pages INT NOT NULL DEFAULT 1,
        price_mt NUMERIC(10, 2) NOT NULL DEFAULT 17.00,
        status TEXT NOT NULL DEFAULT 'published',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_curricula_status_cycle
      ON curricula (status, cycle, grade_number);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
        topic_order INT NOT NULL DEFAULT 0,
        unit_label TEXT,
        title TEXT NOT NULL,
        page_number INT NOT NULL,
        page_end INT NOT NULL DEFAULT 1,
        summary_half_paragraph TEXT NOT NULL,
        preview_paragraphs JSONB NOT NULL DEFAULT '[]'::jsonb,
        key_takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
        keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
        full_text TEXT NOT NULL,
        pages JSONB,
        visuals JSONB NOT NULL DEFAULT '[]'::jsonb,
        visuals_count INT NOT NULL DEFAULT 0,
        reading_minutes INT NOT NULL DEFAULT 3,
        search_normalized TEXT NOT NULL DEFAULT ''
      );
    `);
    await pool.query(`
      ALTER TABLE topics ADD COLUMN IF NOT EXISTS visuals JSONB NOT NULL DEFAULT '[]'::jsonb;
    `);
    await pool.query(`
      ALTER TABLE topics ADD COLUMN IF NOT EXISTS visuals_count INT NOT NULL DEFAULT 0;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_topics_curriculum_order
      ON topics (curriculum_id, topic_order);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_unlocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
        payment_provider TEXT NOT NULL,
        phone_masked TEXT NOT NULL DEFAULT '\u2022\u2022\u2022',
        amount_mt NUMERIC(10, 2) NOT NULL DEFAULT 17.00,
        transaction_ref TEXT NOT NULL,
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, curriculum_id)
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_unlocks_user_id
      ON user_unlocks (user_id, unlocked_at DESC);
    `);
    await bootstrapAdminUser();
    await seedInitialCurriculaOnce();
    await backfillSeedVisualsOnce();
    await pool.query(`
      UPDATE topics
      SET visuals_count = jsonb_array_length(COALESCE(visuals, '[]'::jsonb))::int
      WHERE visuals_count = 0 AND visuals IS NOT NULL AND jsonb_array_length(visuals) > 0
    `);
    await pool.query(
      `INSERT INTO folio_meta (key, value) VALUES ('schema_ready_v3', 'true') ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = now()`
    );
    return { connected: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { connected: false, error: message };
  }
}
async function bootstrapAdminUser() {
  if (!pool) return;
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  if (!adminEmail || !adminPassword || adminPassword.length < 6) return;
  const existing = await pool.query("SELECT id, role FROM users WHERE email = $1", [adminEmail]);
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'admin') ON CONFLICT (email) DO NOTHING`,
      [adminEmail, hash]
    );
  } else if (existing.rows[0].role !== "admin") {
    await pool.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [existing.rows[0].id]);
  }
}
async function seedInitialCurriculaOnce() {
  if (!pool) return;
  const flag = await pool.query(`SELECT value FROM folio_meta WHERE key = 'initial_sne_seeded_v1'`);
  if (flag.rows.length > 0) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const curr of INITIAL_SNE_CURRICULA) {
      const inserted = await client.query(
        `
        INSERT INTO curricula (slug, grade, grade_number, cycle, subject, total_pages, price_mt, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'published')
        ON CONFLICT (slug) DO NOTHING
        RETURNING id
        `,
        [
          curr.slug,
          curr.grade,
          curr.gradeNumber,
          curr.cycle,
          curr.subject,
          curr.totalPages,
          curr.priceMt
        ]
      );
      const curriculumId = inserted.rows[0]?.id;
      if (!curriculumId) continue;
      for (let i = 0; i < curr.topics.length; i++) {
        const t = curr.topics[i];
        const fullText = t.paragraphs.join("\n\n");
        const searchNorm = normalizeSearchText(
          [
            curr.subject,
            curr.grade,
            t.unitLabel || "",
            t.title,
            t.summaryHalfParagraph,
            ...t.keywords,
            ...t.keyTakeaways,
            fullText.slice(0, 1800)
          ].join(" ")
        );
        await client.query(
          `
          INSERT INTO topics (
            curriculum_id, topic_order, unit_label, title, page_number, page_end,
            summary_half_paragraph, preview_paragraphs, key_takeaways, keywords,
            full_text, pages, visuals, visuals_count, reading_minutes, search_normalized
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12::jsonb,$13::jsonb,$14,$15,$16)
          `,
          [
            curriculumId,
            i,
            t.unitLabel || null,
            t.title,
            t.pageNumber,
            t.pageEnd,
            t.summaryHalfParagraph,
            JSON.stringify(t.previewParagraphs),
            JSON.stringify(t.keyTakeaways),
            JSON.stringify(t.keywords),
            fullText,
            t.pages ? JSON.stringify(t.pages) : null,
            JSON.stringify(t.visuals || []),
            (t.visuals || []).length,
            t.readingMinutes,
            searchNorm
          ]
        );
      }
    }
    await client.query(
      `INSERT INTO folio_meta (key, value) VALUES ('initial_sne_seeded_v1', 'true') ON CONFLICT (key) DO NOTHING`
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function backfillSeedVisualsOnce() {
  if (!pool) return;
  const flag = await pool.query(`SELECT value FROM folio_meta WHERE key = 'seed_visuals_v1'`);
  if (flag.rows.length > 0) return;
  for (const curr of INITIAL_SNE_CURRICULA) {
    const cRes = await pool.query(`SELECT id FROM curricula WHERE slug = $1`, [curr.slug]);
    if (cRes.rows.length === 0) continue;
    const curriculumId = String(cRes.rows[0].id);
    for (let i = 0; i < curr.topics.length; i++) {
      const t = curr.topics[i];
      if (!t.visuals || t.visuals.length === 0) continue;
      await pool.query(
        `
        UPDATE topics
        SET visuals = $1::jsonb, visuals_count = $4
        WHERE curriculum_id = $2
          AND topic_order = $3
          AND (visuals IS NULL OR jsonb_array_length(visuals) = 0)
        `,
        [JSON.stringify(t.visuals), curriculumId, i, t.visuals.length]
      );
    }
  }
  await pool.query(
    `INSERT INTO folio_meta (key, value) VALUES ('seed_visuals_v1', 'true') ON CONFLICT (key) DO NOTHING`
  );
}

// server/authService.ts
var MAX_CONCURRENT_SESSIONS = 1;
var SESSION_TTL_DAYS = 30;
function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
function generateSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}
function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length >= 20 ? token : null;
}
function normalizeEmail(raw) {
  return raw.trim().toLowerCase();
}
function validateEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
async function hashPassword(plain) {
  return bcrypt2.hash(plain, 10);
}
async function verifyPassword(plain, hash) {
  return bcrypt2.compare(plain, hash);
}
async function createSessionWithDeviceLimit(userId, deviceLabel) {
  if (!pool) throw new Error("Base de dados indispon\xEDvel");
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1e3).toISOString();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM user_sessions WHERE user_id = $1 AND expires_at <= now()`,
      [userId]
    );
    const activeRes = await client.query(
      `
      SELECT id
      FROM user_sessions
      WHERE user_id = $1
      ORDER BY last_seen_at DESC, created_at DESC
      `,
      [userId]
    );
    let evictedOldSession = false;
    if (activeRes.rows.length >= MAX_CONCURRENT_SESSIONS) {
      const keepCount = Math.max(0, MAX_CONCURRENT_SESSIONS - 1);
      const toEvict = activeRes.rows.slice(keepCount).map((r) => String(r.id));
      if (toEvict.length > 0) {
        await client.query(`DELETE FROM user_sessions WHERE id = ANY($1::uuid[])`, [toEvict]);
        evictedOldSession = true;
      }
    }
    await client.query(
      `
      INSERT INTO user_sessions (user_id, token_hash, device_label, expires_at)
      VALUES ($1, $2, $3, $4)
      `,
      [userId, tokenHash, deviceLabel.slice(0, 80) || "Dispositivo m\xF3vel", expiresAt]
    );
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS cnt FROM user_sessions WHERE user_id = $1 AND expires_at > now()`,
      [userId]
    );
    await client.query("COMMIT");
    return {
      token: rawToken,
      activeSessions: Number(countRes.rows[0]?.cnt ?? 1),
      evictedOldSession
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
async function revokeSessionByToken(rawToken) {
  if (!pool) return;
  const tokenHash = hashToken(rawToken);
  await pool.query(`DELETE FROM user_sessions WHERE token_hash = $1`, [tokenHash]);
}
async function resolveUserFromRequest(req) {
  if (!pool) return null;
  const rawToken = extractBearerToken(req);
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);
  const res = await pool.query(
    `
    SELECT
      s.id AS session_id,
      u.id AS user_id,
      u.email,
      u.role,
      u.created_at
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1 AND s.expires_at > now()
    LIMIT 1
    `,
    [tokenHash]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  void pool.query(`UPDATE user_sessions SET last_seen_at = now() WHERE id = $1`, [row.session_id]);
  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM user_sessions WHERE user_id = $1 AND expires_at > now()`,
    [row.user_id]
  );
  return {
    sessionId: String(row.session_id),
    activeSessions: Number(countRes.rows[0]?.cnt ?? 1),
    user: {
      id: String(row.user_id),
      email: String(row.email),
      role: row.role === "admin" ? "admin" : "student",
      createdAt: new Date(String(row.created_at)).toISOString()
    }
  };
}
async function attachOptionalAuth(req, res, next) {
  try {
    const suppliedToken = extractBearerToken(req);
    const resolved = await resolveUserFromRequest(req);
    if (resolved) {
      req.authUser = resolved.user;
      req.authSessionId = resolved.sessionId;
    } else if (suppliedToken) {
      res.setHeader("X-Session-Revoked", "1");
    }
  } catch {
  }
  next();
}
async function requireAuth(req, res, next) {
  try {
    const suppliedToken = extractBearerToken(req);
    const resolved = await resolveUserFromRequest(req);
    if (!resolved) {
      if (suppliedToken) {
        res.setHeader("X-Session-Revoked", "1");
      }
      res.status(401).json({
        error: suppliedToken ? "A tua sess\xE3o foi encerrada porque a conta iniciou sess\xE3o noutro dispositivo." : "Inicia sess\xE3o para continuar.",
        code: suppliedToken ? "SESSION_REVOKED" : "SESSION_REQUIRED"
      });
      return;
    }
    req.authUser = resolved.user;
    req.authSessionId = resolved.sessionId;
    next();
  } catch (err) {
    console.error("[requireAuth]", err);
    res.status(500).json({ error: "Erro ao validar sess\xE3o" });
  }
}
async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (!req.authUser || req.authUser.role !== "admin") {
      res.status(403).json({
        error: "Acesso restrito a administradores autorizados.",
        code: "ADMIN_REQUIRED"
      });
      return;
    }
    next();
  });
}

// server/groqService.ts
import dotenv2 from "dotenv";
dotenv2.config();
var GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
var PREFERRED_MODELS = [
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-120b"
];
var MAX_HALF_PARAGRAPH_CHARS = 220;
function sanitizeGroqVectorVisual(raw, pageNumber, topicIndex) {
  if (!raw || typeof raw !== "object" || !raw.diagram || typeof raw.diagram !== "object") {
    return null;
  }
  const d = raw.diagram;
  const type = String(d.type || "");
  const title = typeof raw.title === "string" && raw.title.trim().length >= 4 ? raw.title.trim().slice(0, 88) : "Esquema Ilustrativo";
  const caption = typeof raw.caption === "string" && raw.caption.trim().length >= 8 ? raw.caption.trim().slice(0, 180) : void 0;
  let spec = null;
  if (type === "flow" && Array.isArray(d.steps)) {
    const steps = d.steps.filter((s) => Boolean(s && typeof s === "object" && typeof s.label === "string")).slice(0, 5).map((s) => ({
      label: String(s.label).trim().slice(0, 54),
      detail: typeof s.detail === "string" ? s.detail.trim().slice(0, 105) : void 0,
      badge: typeof s.badge === "string" ? s.badge.trim().slice(0, 20) : void 0
    })).filter((s) => s.label.length >= 2);
    if (steps.length >= 2) {
      spec = {
        type: "flow",
        formula: typeof d.formula === "string" && d.formula.trim() ? d.formula.trim().slice(0, 72) : void 0,
        steps
      };
    }
  } else if (type === "cycle" && Array.isArray(d.nodes)) {
    const nodes = d.nodes.filter((n) => Boolean(n && typeof n === "object" && typeof n.label === "string")).slice(0, 6).map((n) => ({
      label: String(n.label).trim().slice(0, 26),
      detail: typeof n.detail === "string" ? n.detail.trim().slice(0, 48) : void 0
    })).filter((n) => n.label.length >= 2);
    if (nodes.length >= 3) {
      spec = {
        type: "cycle",
        centerLabel: typeof d.centerLabel === "string" && d.centerLabel.trim() ? d.centerLabel.trim().slice(0, 28) : title.slice(0, 28),
        nodes
      };
    }
  } else if (type === "compare" && Array.isArray(d.columns)) {
    const columns = d.columns.filter((c) => Boolean(c && typeof c === "object" && typeof c.title === "string" && Array.isArray(c.points))).slice(0, 3).map((c) => ({
      title: String(c.title).trim().slice(0, 32),
      badge: typeof c.badge === "string" ? c.badge.trim().slice(0, 20) : void 0,
      points: c.points.map((pt) => String(pt).trim().slice(0, 95)).filter((pt) => pt.length >= 3).slice(0, 4)
    })).filter((c) => c.title.length >= 2 && c.points.length >= 1);
    if (columns.length >= 2) {
      spec = { type: "compare", columns };
    }
  } else if (type === "timeline" && Array.isArray(d.events)) {
    const events = d.events.filter((e) => Boolean(e && typeof e === "object" && typeof e.date === "string" && typeof e.label === "string")).slice(0, 6).map((e) => ({
      date: String(e.date).trim().slice(0, 16),
      label: String(e.label).trim().slice(0, 48),
      detail: typeof e.detail === "string" ? e.detail.trim().slice(0, 90) : void 0
    })).filter((e) => e.date.length >= 2 && e.label.length >= 2);
    if (events.length >= 2) {
      spec = { type: "timeline", events };
    }
  } else if (type === "geometry_triangle" && typeof d.formula === "string") {
    spec = {
      type: "geometry_triangle",
      sideA: String(d.sideA || "Cateto (a)").slice(0, 20),
      sideB: String(d.sideB || "Cateto (b)").slice(0, 20),
      hypotenuse: String(d.hypotenuse || "Hipotenusa (h)").slice(0, 22),
      formula: String(d.formula).slice(0, 30),
      note: typeof d.note === "string" ? d.note.slice(0, 48) : void 0
    };
  } else if (type === "atom_model" && Array.isArray(d.shells)) {
    const shells = d.shells.map((s) => String(s).trim().slice(0, 32)).filter(Boolean).slice(0, 4);
    if (shells.length >= 1) {
      spec = {
        type: "atom_model",
        nucleusLabel: String(d.nucleusLabel || "N\xFAcleo").slice(0, 14),
        shells,
        note: typeof d.note === "string" ? d.note.slice(0, 64) : void 0
      };
    }
  } else if (type === "kinematics_graph" && Array.isArray(d.equations)) {
    const equations = d.equations.map((eq) => String(eq).trim().slice(0, 28)).filter(Boolean).slice(0, 4);
    if (equations.length >= 1) {
      spec = {
        type: "kinematics_graph",
        xLabel: String(d.xLabel || "Tempo (s)").slice(0, 16),
        yLabel: String(d.yLabel || "v (m/s)").slice(0, 16),
        areaLabel: String(d.areaLabel || "\xC1rea = \u0394x").slice(0, 16),
        equations
      };
    }
  }
  if (!spec) return null;
  return {
    id: `vec-ai-p${pageNumber}-${topicIndex + 1}`,
    kind: "vector_diagram",
    pageNumber,
    title,
    caption,
    diagram: spec
  };
}
function isGroqConfigured() {
  const key = process.env.GROQ_API_KEY?.trim();
  return Boolean(key && key.length > 10);
}
function getPreferredGroqModel() {
  const custom = process.env.GROQ_MODEL?.trim();
  return custom || PREFERRED_MODELS[0];
}
function getModelCascade() {
  const custom = process.env.GROQ_MODEL?.trim();
  const list = custom ? [custom, ...PREFERRED_MODELS] : [...PREFERRED_MODELS];
  return Array.from(new Set(list));
}
function clampHalfParagraph(raw, maxChars = MAX_HALF_PARAGRAPH_CHARS) {
  const clean = raw.replace(/\b(pdf|livro|manual|módulo|modulo|ficheiro)\b/gi, "mat\xE9ria").replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  const slice = clean.slice(0, maxChars);
  const lastSentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (lastSentenceEnd >= 90) {
    return slice.slice(0, lastSentenceEnd + 1).trim();
  }
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = (lastSpace > 80 ? slice.slice(0, lastSpace) : slice).replace(/[,;:\s]+$/, "");
  return trimmed.endsWith(".") ? trimmed : `${trimmed}\u2026`;
}
function extractJsonObject(raw) {
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error("JSON inv\xE1lido na resposta da Groq");
  }
}
async function callGroqTopicBatch(meta, batch) {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error("GROQ_API_KEY n\xE3o configurada");
  const hasOcrTopics = batch.some((b) => b.topic.sourceWasOcr);
  const payload = batch.map(({ index, topic }) => ({
    index,
    pageNumber: topic.pageNumber,
    unitLabel: topic.unitLabel ?? "",
    detectedTitle: topic.title,
    sourceWasOcr: Boolean(topic.sourceWasOcr),
    paragraphs: topic.sourceWasOcr ? topic.paragraphs.slice(0, 12).map((p) => p.slice(0, 750)) : void 0,
    excerpt: topic.paragraphs.join("\n\n").slice(0, 3200)
  }));
  const systemPrompt = [
    "\xC9s o editor pedag\xF3gico oficial do aplicativo escolar mo\xE7ambicano F\xF3lio (Sistema Nacional de Educa\xE7\xE3o, 1.\xAA \xE0 12.\xAA classe).",
    "A tua miss\xE3o \xE9 resumir, limpar erros de digitaliza\xE7\xE3o (OCR) e estruturar mat\xE9rias curriculares para leitura imediata no telem\xF3vel.",
    "REGRAS OBRIGAT\xD3RIAS:",
    '1. Escreve em portugu\xEAs de Mo\xE7ambique (norma europeia/mo\xE7ambicana: "eletr\xF5es", "prot\xF5es", "neutr\xF5es", "i\xF3nica", "at\xF3mica", sem brasileirismos), adequado \xE0 classe indicada.',
    '2. PROIBIDO usar as palavras "PDF", "livro", "manual", "m\xF3dulo", "ficheiro" ou marcas de scanner como "CamScanner". Fala sempre em tema, mat\xE9ria ou assunto.',
    '3. "summaryHalfParagraph" DEVE ter extens\xE3o rigorosa de MEIO PAR\xC1GRAFO: exatamente 2 frases objetivas, no m\xE1ximo 215 caracteres (contando espa\xE7os), para caber num cart\xE3o de telem\xF3vel.',
    "4. Fidelidade total ao conte\xFAdo do excerto: nunca inventes datas, nomes ou f\xF3rmulas.",
    hasOcrTopics ? '5. Quando "sourceWasOcr" for true, devolve tamb\xE9m "cleanedParagraphs" corrigindo gralhas evidentes de OCR (ex: letras trocadas, acentos em falta, ru\xEDdo de margens/fotos) mantendo rigorosamente o texto original completo de cada par\xE1grafo.' : "5. Foca em t\xEDtulos claros, resumos rigorosos de \xBD par\xE1grafo e palavras-chave \xFAteis para busca.",
    '6. Sempre que o tema envolver processo, classifica\xE7\xE3o, compara\xE7\xE3o, medi\xE7\xE3o, f\xF3rmula, cronologia ou ciclo, cria TAMB\xC9M um "vectorDiagram" did\xE1tico fiel ao conte\xFAdo escolhendo UM destes tipos: "flow" (steps: [{label, badge?, detail?}], formula?), "compare" (columns: [{title, badge?, points[]}]), "cycle" (centerLabel, nodes: [{label, detail?}]), "timeline" (events: [{date, label, detail?}]), "atom_model" (nucleusLabel, shells[], note?), "geometry_triangle" (sideA, sideB, hypotenuse, formula, note?) ou "kinematics_graph" (xLabel, yLabel, areaLabel, equations[]).',
    "7. Devolve APENAS JSON v\xE1lido neste formato exato (usa um t\xEDtulo espec\xEDfico do tema em vectorDiagram.title, nunca texto gen\xE9rico):",
    '{"topics":[{"index":0,"title":"t\xEDtulo limpo do tema","summaryHalfParagraph":"2 frases objetivas at\xE9 215 caracteres.","keyTakeaways":["ponto concreto 1","ponto concreto 2","ponto concreto 3"],"keywords":["termo1","termo2","termo3","termo4","termo5","termo6"],"cleanedParagraphs":["par\xE1grafo 1 corrigido..."],"vectorDiagram":{"title":"t\xEDtulo espec\xEDfico do esquema","caption":"explica\xE7\xE3o curta do esquema","diagram":{"type":"compare","columns":[{"title":"...","points":["..."]}]}}}]}',
    '8. Em "keywords", inclui 5 a 7 termos em min\xFAsculas que estudantes ou pais pesquisariam (incluindo sin\xF3nimos escolares comuns).'
  ].join("\n");
  const userPrompt = JSON.stringify({
    subject: meta.subject,
    grade: meta.grade,
    topics: payload
  });
  const models = getModelCascade();
  let lastError = "Falha ao contactar Groq";
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const body = {
          model,
          temperature: 0.2,
          max_completion_tokens: hasOcrTopics ? 4200 : 2400,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        };
        if (model.includes("gpt-oss")) {
          body.reasoning_effort = "low";
        }
        const res = await fetch(GROQ_CHAT_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(28e3)
        });
        if (res.status === 429 && attempt === 0) {
          const retryAfter = Number(res.headers.get("retry-after") || "2");
          await new Promise((r) => setTimeout(r, Math.min(4500, Math.max(1200, retryAfter * 1e3))));
          continue;
        }
        const data = await res.json();
        if (!res.ok) {
          lastError = data.error?.message || `HTTP ${res.status} (${model})`;
          break;
        }
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          lastError = `Resposta vazia (${model})`;
          break;
        }
        const parsed = extractJsonObject(content);
        if (!parsed || !Array.isArray(parsed.topics)) {
          lastError = `JSON sem array topics (${model})`;
          break;
        }
        return { items: parsed.topics, model: data.model || model };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (/timed?\s*out|abort/i.test(msg)) {
          lastError = "O servi\xE7o de intelig\xEAncia artificial demorou a responder (tempo limite de liga\xE7\xE3o). Tenta novamente.";
        } else {
          lastError = msg;
        }
      }
    }
  }
  if (/timed?\s*out|abort/i.test(lastError)) {
    throw new Error("O servi\xE7o de intelig\xEAncia artificial demorou a responder (tempo limite excedido). Tenta novamente.");
  }
  throw new Error(lastError);
}
async function enrichTopicsWithGroq(meta, topics) {
  if (!isGroqConfigured()) {
    return {
      topics: topics.map((t) => ({
        ...t,
        summaryHalfParagraph: clampHalfParagraph(t.summaryHalfParagraph)
      })),
      enrichedCount: 0,
      totalCount: topics.length,
      modelUsed: null,
      warnings: ["GROQ_API_KEY n\xE3o configurada no servidor."]
    };
  }
  const hasAnyOcr = topics.some((t) => t.sourceWasOcr);
  const batchSize = hasAnyOcr ? 2 : 3;
  const enrichedByIndex = /* @__PURE__ */ new Map();
  const warnings = [];
  let modelUsed = null;
  const limit = Math.min(topics.length, 36);
  if (topics.length > 36) {
    warnings.push("Os primeiros 36 temas foram resumidos pela Groq; os restantes usaram resumo base.");
  }
  for (let i = 0; i < limit; i += batchSize) {
    const batch = [];
    for (let j = i; j < Math.min(limit, i + batchSize); j++) {
      batch.push({ index: j, topic: topics[j] });
    }
    try {
      const { items, model } = await callGroqTopicBatch(meta, batch);
      modelUsed = modelUsed || model;
      for (const item of items) {
        if (item && typeof item.index === "number") {
          enrichedByIndex.set(item.index, item);
        }
      }
    } catch (err) {
      warnings.push(
        `Lote ${Math.floor(i / batchSize) + 1}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
    if (i + batchSize < limit) {
      await new Promise((r) => setTimeout(r, 260));
    }
  }
  let enrichedCount = 0;
  const updatedTopics = topics.map((topic, idx) => {
    const ai = enrichedByIndex.get(idx);
    if (!ai) {
      return {
        ...topic,
        summaryHalfParagraph: clampHalfParagraph(topic.summaryHalfParagraph)
      };
    }
    const summary = typeof ai.summaryHalfParagraph === "string" && ai.summaryHalfParagraph.trim().length >= 25 ? clampHalfParagraph(ai.summaryHalfParagraph) : clampHalfParagraph(topic.summaryHalfParagraph);
    const title = typeof ai.title === "string" && ai.title.trim().length >= 3 && ai.title.trim().length <= 130 ? ai.title.trim() : topic.title;
    const keyTakeaways = Array.isArray(ai.keyTakeaways) && ai.keyTakeaways.length > 0 ? ai.keyTakeaways.map((k) => String(k).trim()).filter((k) => k.length >= 8).slice(0, 4) : topic.keyTakeaways;
    const keywords = Array.isArray(ai.keywords) && ai.keywords.length > 0 ? Array.from(
      new Set(
        [...ai.keywords.map((k) => String(k).trim().toLowerCase()), ...topic.keywords].filter(
          (k) => k.length >= 3
        )
      )
    ).slice(0, 8) : topic.keywords;
    const cleanedParas = topic.sourceWasOcr && Array.isArray(ai.cleanedParagraphs) && ai.cleanedParagraphs.length > 0 ? ai.cleanedParagraphs.map((p) => String(p).replace(/\s+/g, " ").trim()).filter((p) => p.length >= 20 && !/camscanner|scanned\s+by/i.test(p)) : null;
    const origLen = topic.paragraphs.join(" ").length;
    const cleanedLen = cleanedParas ? cleanedParas.join(" ").length : 0;
    const usedCleaned = Boolean(cleanedParas && cleanedLen >= Math.min(120, origLen * 0.45));
    const finalParagraphs = usedCleaned ? [...cleanedParas, ...topic.paragraphs.slice(12)] : topic.paragraphs;
    let finalPages = topic.pages;
    if (usedCleaned && topic.pages && topic.pages.length > 0) {
      if (topic.pages.length === 1) {
        finalPages = [{ ...topic.pages[0], paragraphs: finalParagraphs }];
      } else {
        let cursor = 0;
        finalPages = topic.pages.map((pg, idx2) => {
          const isLast = idx2 === topic.pages.length - 1;
          const count = isLast ? Math.max(0, finalParagraphs.length - cursor) : Math.min(pg.paragraphs.length, Math.max(1, Math.round(finalParagraphs.length / topic.pages.length)));
          const slice = finalParagraphs.slice(cursor, cursor + count);
          cursor += count;
          return { pageNumber: pg.pageNumber, paragraphs: slice };
        }).filter((pg) => pg.paragraphs.length > 0);
      }
    }
    const existingExtracted = (topic.visuals || []).filter((v) => v.kind === "extracted_figure");
    const existingVectors = (topic.visuals || []).filter((v) => v.kind === "vector_diagram");
    const aiVector = sanitizeGroqVectorVisual(ai.vectorDiagram, topic.pageNumber, idx);
    const mergedVisuals = [
      ...existingExtracted,
      ...aiVector ? [aiVector] : existingVectors
    ];
    enrichedCount += 1;
    return {
      ...topic,
      title,
      summaryHalfParagraph: summary,
      keyTakeaways: keyTakeaways.length > 0 ? keyTakeaways : topic.keyTakeaways,
      keywords,
      paragraphs: finalParagraphs,
      previewParagraphs: finalParagraphs.slice(0, 2),
      pages: finalPages,
      visuals: mergedVisuals
    };
  });
  return {
    topics: updatedTopics,
    enrichedCount,
    totalCount: topics.length,
    modelUsed,
    warnings
  };
}

// server/paymentService.ts
import crypto2 from "crypto";
function validateMozambiqueMobile(provider, rawPhone) {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length !== 9) {
    return { valid: false, digits, error: "O n\xFAmero mo\xE7ambicano deve ter exatamente 9 d\xEDgitos." };
  }
  if (provider === "mpesa" && !/^8[45]/.test(digits)) {
    return { valid: false, digits, error: "M-Pesa (Vodacom) exige prefixo 84 ou 85." };
  }
  if (provider === "emola" && !/^8[67]/.test(digits)) {
    return { valid: false, digits, error: "e-Mola (Movitel) exige prefixo 86 ou 87." };
  }
  return { valid: true, digits };
}
function maskPhoneNumber(digits) {
  if (digits.length < 9) return "\u2022\u2022\u2022";
  return `${digits.slice(0, 2)}\u2022\u2022\u2022\u2022${digits.slice(-3)}`;
}
async function processMobilePayment(req) {
  const validation = validateMozambiqueMobile(req.provider, req.phone);
  if (!validation.valid) {
    return {
      approved: false,
      provider: req.provider,
      phoneMasked: maskPhoneNumber(validation.digits),
      amountMt: req.amountMt,
      transactionRef: "",
      mode: "simulation",
      error: validation.error
    };
  }
  const prefix = req.provider === "mpesa" ? "MP" : "EM";
  const rand = crypto2.randomBytes(3).toString("hex").toUpperCase();
  const transactionRef = `FL-${prefix}-${(/* @__PURE__ */ new Date()).getFullYear()}-${rand}`;
  return {
    approved: true,
    provider: req.provider,
    phoneMasked: maskPhoneNumber(validation.digits),
    amountMt: Number(req.amountMt.toFixed(2)),
    transactionRef,
    mode: "simulation"
  };
}

// server/seoRoutes.ts
import { Router } from "express";

// server/seoUtils.ts
var SITE_NAME = "F\xF3lio";
var DEFAULT_SITE_URL = "https://folio-one-snowy.vercel.app";
var OG_IMAGE_PATH = "/og-folio.png";
var OG_IMAGE_WIDTH = 1200;
var OG_IMAGE_HEIGHT = 630;
var OG_IMAGE_ALT = "F\xF3lio \u2014 A p\xE1gina certa para cada d\xFAvida. Mat\xE9rias escolares da 1.\xAA \xE0 12.\xAA classe em Mo\xE7ambique.";
var DEFAULT_TITLE = "F\xF3lio \u2014 Mat\xE9rias Escolares de Mo\xE7ambique (1.\xAA\u201312.\xAA)";
var SEO_LIMITS = {
  titleMin: 10,
  titleMax: 60,
  descriptionMin: 70,
  descriptionMax: 160
};
function getSiteUrl() {
  const envUrl = process.env.SITE_URL || process.env.VITE_SITE_URL;
  const raw = (envUrl || DEFAULT_SITE_URL).trim();
  return raw.replace(/\/+$/, "") || DEFAULT_SITE_URL;
}
function toCanonicalPath(pathname) {
  const clean = pathname.split("?")[0].split("#")[0].trim();
  if (!clean || clean === "/") return "/";
  const withLeading = clean.startsWith("/") ? clean : `/${clean}`;
  return withLeading.replace(/\/+$/, "") || "/";
}
function toCanonicalUrl(pathname, siteUrl = getSiteUrl()) {
  const path = toCanonicalPath(pathname);
  return path === "/" ? `${siteUrl}/` : `${siteUrl}${path}`;
}
function cleanWhitespace(input) {
  return input.replace(/\s+/g, " ").trim();
}
function sanitizePublicSeoCopy(input) {
  return cleanWhitespace(
    input.replace(/\b(pdf|ficheiro|ficheiros|manual|manuais|livro|livros|m[oó]dulo|m[oó]dulos|cockroachdb|groq)\b/gi, "mat\xE9ria").replace(/\bmatéria\s+matéria\b/gi, "mat\xE9ria")
  );
}
function clampSeoTitle(rawTitle, suffix = " \u2014 F\xF3lio") {
  const clean = sanitizePublicSeoCopy(rawTitle);
  const maxTotal = SEO_LIMITS.titleMax;
  if (!clean) return DEFAULT_TITLE;
  if (clean.endsWith(suffix)) {
    if (clean.length <= maxTotal) return clean;
    const base = clean.slice(0, clean.length - suffix.length).trim();
    return clampSeoTitle(base, suffix);
  }
  const combined = `${clean}${suffix}`;
  if (combined.length <= maxTotal && combined.length >= SEO_LIMITS.titleMin) {
    return combined;
  }
  const budget = Math.max(12, maxTotal - suffix.length - 1);
  let cut = clean.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > budget * 0.55) {
    cut = cut.slice(0, lastSpace);
  }
  cut = cut.replace(/[\s,.;:–—-]+$/g, "");
  return `${cut}\u2026${suffix}`.slice(0, maxTotal);
}
function clampSeoDescription(rawDescription, fallbackTail) {
  let text = sanitizePublicSeoCopy(rawDescription);
  const tail = sanitizePublicSeoCopy(
    fallbackTail || "L\xEA o resumo gr\xE1tis, confirma a p\xE1gina exata e estuda 100% offline no F\xF3lio (Mo\xE7ambique)."
  );
  if (text.length < SEO_LIMITS.descriptionMin) {
    text = text ? `${text.replace(/[.!?]*$/, ".")} ${tail}` : tail;
  }
  if (text.length <= SEO_LIMITS.descriptionMax) {
    return text;
  }
  let cut = text.slice(0, SEO_LIMITS.descriptionMax - 1);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > SEO_LIMITS.descriptionMax * 0.65) {
    cut = cut.slice(0, lastSpace);
  }
  cut = cut.replace(/[\s,.;:–—-]+$/g, "");
  return `${cut}\u2026`;
}

// server/seoRoutes.ts
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var INDEXNOW_KEY_RE = /^[A-Za-z0-9-]{8,128}$/;
var CACHE_TTL_MS = 6e4;
var cachedSnapshot = null;
var inflightSnapshot = null;
function invalidateSeoCache() {
  cachedSnapshot = null;
}
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escapeXml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function safeJsonLd(data) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
function abbreviateSubject(subject) {
  const map = {
    "L\xEDngua Portuguesa": "Portugu\xEAs",
    "Ci\xEAncias Naturais": "Ci\xEAncias Nat.",
    "Ci\xEAncias Sociais": "Ci\xEAncias Soc.",
    "Educa\xE7\xE3o Visual": "Ed. Visual",
    "Agro-Pecu\xE1ria": "Agro-Pec."
  };
  return map[subject] || (subject.length > 14 ? `${subject.slice(0, 12).trim()}.` : subject);
}
function clampPublicPreviewParagraphs(paragraphs, fallbackSummary) {
  const source = paragraphs.length > 0 ? paragraphs.slice(0, 2) : [fallbackSummary];
  const MAX_TOTAL_CHARS = 460;
  const result = [];
  let used = 0;
  for (const raw of source) {
    const clean = raw.replace(/\s+/g, " ").trim();
    if (!clean) continue;
    const remaining = MAX_TOTAL_CHARS - used;
    if (remaining < 60) break;
    if (clean.length <= remaining) {
      result.push(clean);
      used += clean.length;
    } else {
      let cut = clean.slice(0, remaining - 1);
      const sp = cut.lastIndexOf(" ");
      if (sp > remaining * 0.6) cut = cut.slice(0, sp);
      result.push(`${cut.replace(/[\s,.;:–—-]+$/g, "")}\u2026`);
      break;
    }
  }
  return result.length > 0 ? result : [fallbackSummary];
}
function buildUniqueTopicTitle(topic, usedTitles) {
  const shortSubj = abbreviateSubject(topic.subject);
  const compactSuffix = ` \xB7 ${shortSubj} ${topic.gradeNumber}.\xAA P.${topic.pageNumber}`;
  let candidate = clampSeoTitle(topic.title, compactSuffix);
  if (!usedTitles.has(candidate.toLowerCase())) {
    usedTitles.add(candidate.toLowerCase());
    return candidate;
  }
  const orderSuffix = ` (#${topic.topicOrder + 1}) \xB7 ${shortSubj} ${topic.gradeNumber}.\xAA`;
  candidate = clampSeoTitle(topic.title, orderSuffix);
  if (!usedTitles.has(candidate.toLowerCase())) {
    usedTitles.add(candidate.toLowerCase());
    return candidate;
  }
  const hashSuffix = ` [${topic.id.slice(0, 4)}] \xB7 F\xF3lio`;
  candidate = clampSeoTitle(topic.title, hashSuffix);
  usedTitles.add(candidate.toLowerCase());
  return candidate;
}
function buildUniqueTopicDescription(topic, usedDescs) {
  const baseLead = `${topic.subject} (${topic.grade}, P\xE1g. ${topic.pageNumber}) \u2014 ${topic.title}: ${topic.summaryHalfParagraph}`;
  const tail = `L\xEA o resumo gr\xE1tis e estuda ${topic.subject} (${topic.grade}) 100% offline no F\xF3lio.`;
  let candidate = clampSeoDescription(baseLead, tail);
  if (!usedDescs.has(candidate.toLowerCase())) {
    usedDescs.add(candidate.toLowerCase());
    return candidate;
  }
  const disambiguated = `${topic.subject} ${topic.grade}, P\xE1g. ${topic.pageNumber} (Tema ${topic.topicOrder + 1}) \u2014 ${topic.title}. ${topic.summaryHalfParagraph}`;
  candidate = clampSeoDescription(disambiguated, tail);
  usedDescs.add(candidate.toLowerCase());
  return candidate;
}
async function loadPublicSeoSnapshot(ensureDbReady2) {
  if (cachedSnapshot && Date.now() - cachedSnapshot.fetchedAt < CACHE_TTL_MS) {
    return cachedSnapshot;
  }
  if (inflightSnapshot) return inflightSnapshot;
  inflightSnapshot = (async () => {
    const empty = {
      fetchedAt: Date.now(),
      curricula: [],
      topicsById: /* @__PURE__ */ new Map(),
      uniqueTitleById: /* @__PURE__ */ new Map(),
      uniqueDescById: /* @__PURE__ */ new Map()
    };
    const ready = await ensureDbReady2();
    if (!pool || !ready) return empty;
    const res = await pool.query(
      `
      SELECT
        t.id,
        t.curriculum_id,
        t.topic_order,
        t.unit_label,
        t.title,
        t.page_number,
        t.page_end,
        t.summary_half_paragraph,
        t.preview_paragraphs,
        t.key_takeaways,
        t.reading_minutes,
        t.visuals_count,
        c.subject,
        c.grade,
        c.grade_number,
        c.cycle,
        c.price_mt,
        c.created_at
      FROM topics t
      JOIN curricula c ON c.id = t.curriculum_id
      WHERE c.status = 'published'
      ORDER BY c.grade_number ASC, c.subject ASC, c.created_at DESC, t.topic_order ASC
      LIMIT 600
      `
    );
    const curriculaMap = /* @__PURE__ */ new Map();
    const topicsById = /* @__PURE__ */ new Map();
    const usedTitles = /* @__PURE__ */ new Set();
    const usedDescs = /* @__PURE__ */ new Set();
    const uniqueTitleById = /* @__PURE__ */ new Map();
    const uniqueDescById = /* @__PURE__ */ new Map();
    for (const r of res.rows) {
      const updatedAt = r.created_at ? new Date(String(r.created_at)).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
      const topic = {
        id: String(r.id),
        curriculumId: String(r.curriculum_id),
        topicOrder: Number(r.topic_order || 0),
        unitLabel: r.unit_label ? String(r.unit_label) : null,
        title: String(r.title || "").trim(),
        pageNumber: Number(r.page_number || 1),
        pageEnd: Number(r.page_end || r.page_number || 1),
        summaryHalfParagraph: String(r.summary_half_paragraph || "").trim(),
        previewParagraphs: Array.isArray(r.preview_paragraphs) ? r.preview_paragraphs.slice(0, 2) : [],
        keyTakeaways: Array.isArray(r.key_takeaways) ? r.key_takeaways.slice(0, 2) : [],
        readingMinutes: Number(r.reading_minutes || 3),
        visualsCount: Number(r.visuals_count || 0),
        subject: String(r.subject),
        grade: String(r.grade),
        gradeNumber: Number(r.grade_number),
        cycle: ["1-6", "7-9", "10-12"].includes(String(r.cycle)) ? String(r.cycle) : "10-12",
        priceMt: Number(r.price_mt || 17),
        updatedAt
      };
      topicsById.set(topic.id, topic);
      uniqueTitleById.set(topic.id, buildUniqueTopicTitle(topic, usedTitles));
      uniqueDescById.set(topic.id, buildUniqueTopicDescription(topic, usedDescs));
      let group = curriculaMap.get(topic.curriculumId);
      if (!group) {
        group = {
          id: topic.curriculumId,
          subject: topic.subject,
          grade: topic.grade,
          gradeNumber: topic.gradeNumber,
          cycle: topic.cycle,
          priceMt: topic.priceMt,
          updatedAt,
          topics: []
        };
        curriculaMap.set(topic.curriculumId, group);
      }
      group.topics.push(topic);
    }
    const snap = {
      fetchedAt: Date.now(),
      curricula: Array.from(curriculaMap.values()),
      topicsById,
      uniqueTitleById,
      uniqueDescById
    };
    cachedSnapshot = snap;
    return snap;
  })().finally(() => {
    inflightSnapshot = null;
  });
  return inflightSnapshot;
}
var EDITORIAL_SSR_CSS = `
  :root {
    --parchment: #f3ebd6;
    --ivory: #fcf8ee;
    --sand: #e3d7ba;
    --sand-strong: #d2c39d;
    --forest: #083b27;
    --forest-hover: #0d4f35;
    --ink: #041a11;
    --ink-soft: #2f4238;
    --ink-muted: #646050;
    --amber: #ea9222;
    --amber-soft: #f8e3be;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0;
    background: var(--parchment);
    color: var(--ink);
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  a { color: var(--forest); text-underline-offset: 3px; }
  a:hover { color: var(--forest-hover); }
  .topbar {
    position: sticky; top: 0; z-index: 20;
    background: rgba(243, 235, 214, 0.94);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--sand);
  }
  .topbar-inner {
    max-width: 880px; margin: 0 auto; padding: 12px 20px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
  }
  .brand-link { display: inline-flex; align-items: center; text-decoration: none; }
  .nav-cta {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--forest); color: var(--ivory); text-decoration: none;
    font-weight: 700; font-size: 13px; padding: 9px 16px; border-radius: 999px;
  }
  .nav-cta:hover { background: var(--forest-hover); color: var(--ivory); }
  .wrap { max-width: 880px; margin: 0 auto; padding: 28px 20px 64px; }
  .breadcrumb {
    display: flex; flex-wrap: wrap; align-items: center; gap: 6px;
    font-size: 12.5px; color: var(--ink-muted); margin-bottom: 18px;
  }
  .breadcrumb a { color: var(--forest); font-weight: 600; text-decoration: none; }
  .breadcrumb a:hover { text-decoration: underline; }
  .kicker {
    font-size: 11.5px; font-weight: 800; letter-spacing: 0.11em;
    text-transform: uppercase; color: var(--forest); margin: 0 0 8px;
  }
  h1 {
    font-size: clamp(1.7rem, 4vw, 2.35rem);
    line-height: 1.12; letter-spacing: -0.03em; margin: 0 0 12px; color: var(--ink);
  }
  h2 {
    font-size: 1.18rem; line-height: 1.3; letter-spacing: -0.015em;
    margin: 28px 0 12px; color: var(--forest);
  }
  h3 {
    font-size: 1.02rem; line-height: 1.35; margin: 0 0 8px; color: var(--ink);
  }
  .lead { font-size: 16px; color: var(--ink-soft); max-width: 64ch; margin: 0 0 22px; }
  .card {
    background: var(--ivory); border: 1px solid var(--sand);
    border-radius: 18px; padding: 20px 22px; margin-bottom: 16px;
  }
  .page-pill {
    display: inline-block; background: var(--amber-soft); border: 1px solid rgba(234,146,34,0.35);
    color: var(--ink); font-weight: 800; font-size: 12px; padding: 3px 10px;
    border-radius: 8px; font-variant-numeric: tabular-nums;
  }
  .cycle-pills { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 26px; }
  .cycle-pill {
    display: inline-block; background: var(--ivory); border: 1px solid var(--sand-strong);
    color: var(--forest); font-weight: 700; font-size: 13px; text-decoration: none;
    padding: 8px 14px; border-radius: 999px;
  }
  .cycle-pill:hover { background: var(--forest); color: var(--ivory); border-color: var(--forest); }
  .topic-list { list-style: none; padding: 0; margin: 12px 0 0; }
  .topic-row {
    padding: 12px 0; border-top: 1px solid var(--sand);
    display: flex; flex-direction: column; gap: 4px;
  }
  .topic-row:first-child { border-top: 0; padding-top: 4px; }
  .topic-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
  .topic-link { font-weight: 700; font-size: 15.5px; color: var(--ink); text-decoration: none; }
  .topic-link:hover { color: var(--forest); text-decoration: underline; }
  .topic-summary { margin: 0; font-size: 14px; color: var(--ink-soft); }
  .serif-prose {
    font-family: 'Merriweather', Georgia, serif;
    font-size: 16.5px; line-height: 1.78; color: var(--ink); max-width: 62ch;
  }
  .cta-bar {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px;
    background: var(--forest); color: var(--ivory);
    border-radius: 18px; padding: 20px 22px; margin: 24px 0;
  }
  .cta-btn {
    display: inline-flex; align-items: center; justify-content: center;
    background: var(--amber); color: var(--ink); text-decoration: none;
    font-weight: 800; font-size: 15px; padding: 13px 22px; border-radius: 14px;
  }
  .cta-btn:hover { background: #f2a137; color: var(--ink); }
  .site-footer {
    margin-top: 44px; padding-top: 20px; border-top: 1px solid var(--sand);
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;
    font-size: 13px; color: var(--ink-muted);
  }
  .footer-links { display: flex; flex-wrap: wrap; gap: 14px; }
`;
function renderSeoDocument(opts) {
  const siteUrl = getSiteUrl();
  const canonicalUrl = toCanonicalUrl(opts.canonicalPath, siteUrl);
  const ogImageUrl = `${siteUrl}${OG_IMAGE_PATH}`;
  const robots = opts.robots ?? "index, follow, max-image-preview:large, max-snippet:-1";
  return `<!doctype html>
<html lang="pt-MZ">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#f3ebd6" />
    <meta name="robots" content="${escapeHtml(robots)}" />
    <title>${escapeHtml(opts.title)}</title>
    <meta name="description" content="${escapeHtml(opts.description)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="/assets/folio-symbol.png" />
    <link rel="icon" type="image/png" href="/assets/folio-symbol.png" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:type" content="${opts.ogType}" />
    <meta property="og:locale" content="pt_MZ" />
    <meta property="og:title" content="${escapeHtml(opts.title)}" />
    <meta property="og:description" content="${escapeHtml(opts.description)}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:width" content="${OG_IMAGE_WIDTH}" />
    <meta property="og:image:height" content="${OG_IMAGE_HEIGHT}" />
    <meta property="og:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(opts.title)}" />
    <meta name="twitter:description" content="${escapeHtml(opts.description)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
    <meta name="twitter:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />
    <script type="application/ld+json">${safeJsonLd(opts.jsonLd)}</script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
    <style>${EDITORIAL_SSR_CSS}</style>
  </head>
  <body>
    <header class="topbar">
      <div class="topbar-inner">
        <a href="/" class="brand-link" aria-label="F\xF3lio \u2014 P\xE1gina Inicial">
          <img src="/assets/folio-logo.png" alt="F\xF3lio" width="124" height="32" style="height:30px;width:auto;" />
        </a>
        <a href="/#pesquisar" class="nav-cta">Pesquisar no F\xF3lio</a>
      </div>
    </header>
    <main id="main" class="wrap">
      ${opts.bodyHtml}
      <footer class="site-footer">
        <span>F\xF3lio \xB7 A p\xE1gina certa para cada d\xFAvida \xB7 Mo\xE7ambique (1.\xAA\u201312.\xAA Classe)</span>
        <nav class="footer-links" aria-label="Navega\xE7\xE3o do rodap\xE9">
          <a href="/">In\xEDcio</a>
          <a href="/materias">\xCDndice de Mat\xE9rias</a>
          <a href="/#pesquisar">Abrir Pesquisa</a>
        </nav>
      </footer>
    </main>
  </body>
</html>`;
}
async function notifyIndexNow(paths) {
  const key = (process.env.INDEXNOW_KEY || "").trim();
  if (!key || !INDEXNOW_KEY_RE.test(key) || paths.length === 0) return;
  const siteUrl = getSiteUrl();
  let host;
  try {
    host = new URL(siteUrl).host;
  } catch {
    return;
  }
  const urlList = Array.from(new Set(paths.map((p) => toCanonicalUrl(p, siteUrl)))).slice(0, 1e4);
  const payload = {
    host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList
  };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5e3);
    await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);
  } catch {
  }
}
function createSeoRouter(ensureDbReady2) {
  const router = Router();
  router.use((req, res, next) => {
    if (req.method === "GET" && req.path.length > 1 && req.path.endsWith("/") && (req.path === "/materias/" || req.path.startsWith("/tema/"))) {
      const cleanPath = req.path.replace(/\/+$/, "");
      return res.redirect(301, cleanPath);
    }
    return next();
  });
  router.get("/sitemap.xml", async (_req, res) => {
    try {
      const siteUrl = getSiteUrl();
      const snap = await loadPublicSeoSnapshot(ensureDbReady2);
      const todayIso = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const latestCurrDate = snap.curricula[0]?.updatedAt?.slice(0, 10) || todayIso;
      const urls = [
        { loc: toCanonicalUrl("/", siteUrl), lastmod: latestCurrDate, changefreq: "weekly", priority: "1.0" },
        { loc: toCanonicalUrl("/materias", siteUrl), lastmod: latestCurrDate, changefreq: "daily", priority: "0.9" }
      ];
      for (const curr of snap.curricula) {
        for (const t of curr.topics) {
          urls.push({
            loc: toCanonicalUrl(`/tema/${t.id}`, siteUrl),
            lastmod: t.updatedAt.slice(0, 10),
            changefreq: "monthly",
            priority: "0.8"
          });
        }
      }
      const xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map(
          (u) => `  <url><loc>${escapeXml(u.loc)}</loc><lastmod>${escapeXml(u.lastmod)}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
        ),
        "</urlset>"
      ].join("\n");
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
      return res.status(200).send(xml);
    } catch (err) {
      console.error("[GET /sitemap.xml]", err);
      const siteUrl = getSiteUrl();
      const fallbackXml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        `  <url><loc>${escapeXml(toCanonicalUrl("/", siteUrl))}</loc><priority>1.0</priority></url>`,
        `  <url><loc>${escapeXml(toCanonicalUrl("/materias", siteUrl))}</loc><priority>0.9</priority></url>`,
        "</urlset>"
      ].join("\n");
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      return res.status(200).send(fallbackXml);
    }
  });
  router.get(["/materias", "/materias/"], async (_req, res) => {
    try {
      const siteUrl = getSiteUrl();
      const snap = await loadPublicSeoSnapshot(ensureDbReady2);
      const totalTopics = snap.topicsById.size;
      const totalCurricula = snap.curricula.length;
      const cycles = [
        {
          id: "1-6",
          title: "Ensino Prim\xE1rio (1.\xAA \xE0 6.\xAA Classe)",
          subtitle: "Bases s\xF3lidas em Portugu\xEAs, Matem\xE1tica, Ci\xEAncias Naturais e Ci\xEAncias Sociais."
        },
        {
          id: "7-9",
          title: "1.\xBA Ciclo do Ensino Secund\xE1rio (7.\xAA \xE0 9.\xAA Classe)",
          subtitle: "Disciplinas do ensino secund\xE1rio geral com f\xF3rmulas, resumos e p\xE1gina exata."
        },
        {
          id: "10-12",
          title: "2.\xBA Ciclo do Ensino Secund\xE1rio (10.\xAA \xE0 12.\xAA Classe)",
          subtitle: "Mat\xE9rias organizadas para prepara\xE7\xE3o de exames nacionais em Mo\xE7ambique."
        }
      ];
      const cycleSectionsHtml = cycles.map((cyc) => {
        const matching = snap.curricula.filter((c) => c.cycle === cyc.id);
        const innerHtml = matching.length === 0 ? `<div class="card"><p class="topic-summary">Novas mat\xE9rias deste ciclo est\xE3o em prepara\xE7\xE3o. Usa a <a href="/#pesquisar">pesquisa do F\xF3lio</a> para explorar todas as disciplinas dispon\xEDveis.</p></div>` : matching.map(
          (curr) => `
          <article class="card">
            <h3>${escapeHtml(curr.subject)} \xB7 ${escapeHtml(curr.grade)}</h3>
            <p class="topic-summary">${curr.topics.length} ${curr.topics.length === 1 ? "tema indexado" : "temas indexados"} \xB7 Resumo gr\xE1tis e estudo offline por ${curr.priceMt} MT</p>
            <ul class="topic-list">
              ${curr.topics.map(
            (t) => `
                <li class="topic-row">
                  <div class="topic-head">
                    <a class="topic-link" href="/tema/${escapeHtml(t.id)}">${escapeHtml(sanitizePublicSeoCopy(t.title))}</a>
                    <span class="page-pill">P\xE1g. ${t.pageNumber}</span>
                  </div>
                  <p class="topic-summary">${escapeHtml(sanitizePublicSeoCopy(t.summaryHalfParagraph))}</p>
                </li>`
          ).join("")}
            </ul>
          </article>`
        ).join("");
        return `
        <section id="ciclo-${cyc.id}" aria-labelledby="heading-ciclo-${cyc.id}">
          <h2 id="heading-ciclo-${cyc.id}">${escapeHtml(cyc.title)}</h2>
          <p class="topic-summary" style="margin-bottom:14px;">${escapeHtml(cyc.subtitle)}</p>
          ${innerHtml}
        </section>`;
      }).join("");
      const itemListElements = Array.from(snap.topicsById.values()).slice(0, 60).map((t, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        url: toCanonicalUrl(`/tema/${t.id}`, siteUrl),
        name: `${sanitizePublicSeoCopy(t.title)} \u2014 ${t.subject} (${t.grade})`
      }));
      const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "In\xEDcio", item: toCanonicalUrl("/", siteUrl) },
              {
                "@type": "ListItem",
                position: 2,
                name: "\xCDndice de Mat\xE9rias",
                item: toCanonicalUrl("/materias", siteUrl)
              }
            ]
          },
          {
            "@type": "CollectionPage",
            name: "\xCDndice de Mat\xE9rias Escolares de Mo\xE7ambique (1.\xAA\u201312.\xAA Classe)",
            url: toCanonicalUrl("/materias", siteUrl),
            inLanguage: "pt-MZ",
            description: "Diret\xF3rio p\xFAblico de mat\xE9rias escolares da 1.\xAA \xE0 12.\xAA classe em Mo\xE7ambique com resumo gr\xE1tis e refer\xEAncia de p\xE1gina exata.",
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: totalTopics,
              itemListElement: itemListElements
            }
          }
        ]
      };
      const bodyHtml = `
        <nav class="breadcrumb" aria-label="Caminho de navega\xE7\xE3o">
          <a href="/">In\xEDcio</a>
          <span aria-hidden="true">/</span>
          <span>\xCDndice de Mat\xE9rias</span>
        </nav>

        <p class="kicker">Sistema Nacional de Educa\xE7\xE3o \xB7 Mo\xE7ambique</p>
        <h1>\xCDndice de Mat\xE9rias Escolares (1.\xAA\u201312.\xAA Classe)</h1>
        <p class="lead">
          Explora ${totalTopics > 0 ? `${totalTopics} temas escolares distribu\xEDdos por ${totalCurricula} disciplinas` : "as mat\xE9rias escolares de Mo\xE7ambique"} com resumo gratuito de meio par\xE1grafo, n\xFAmero exato da p\xE1gina e pr\xE9-visualiza\xE7\xE3o imediata sem precisar de conta.
        </p>

        <nav class="cycle-pills" aria-label="Ir para ciclo escolar">
          <a class="cycle-pill" href="#ciclo-1-6">1.\xAA\u20136.\xAA Classe</a>
          <a class="cycle-pill" href="#ciclo-7-9">7.\xAA\u20139.\xAA Classe</a>
          <a class="cycle-pill" href="#ciclo-10-12">10.\xAA\u201312.\xAA Classe</a>
        </nav>

        ${cycleSectionsHtml}

        <section class="cta-bar" aria-label="Pesquisa interativa">
          <div>
            <p class="kicker" style="color:#f8e3be;margin-bottom:4px;">Procuras um tema espec\xEDfico?</p>
            <p style="margin:0;font-size:15px;color:#fcf8ee;">
              Pesquisa diretamente no F\xF3lio e desbloqueia a disciplina completa por 17 MT (M-Pesa ou e-Mola) para estudar 100% offline.
            </p>
          </div>
          <a href="/#pesquisar" class="cta-btn">Pesquisar Mat\xE9ria Agora</a>
        </section>
      `;
      const html = renderSeoDocument({
        title: clampSeoTitle("\xCDndice de Mat\xE9rias Escolares (1.\xAA\u201312.\xAA)"),
        description: clampSeoDescription(
          "Explora mat\xE9rias escolares da 1.\xAA \xE0 12.\xAA classe em Mo\xE7ambique por ciclo e disciplina. Consulta resumos gr\xE1tis, p\xE1gina exata e estudo offline."
        ),
        canonicalPath: "/materias",
        ogType: "website",
        jsonLd,
        bodyHtml
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
      return res.status(200).send(html);
    } catch (err) {
      console.error("[GET /materias]", err);
      return res.status(500).send("Servi\xE7o temporariamente indispon\xEDvel.");
    }
  });
  router.get(["/tema/:id", "/tema/:id/"], async (req, res) => {
    const id = String(req.params.id || "").trim();
    const siteUrl = getSiteUrl();
    if (!UUID_RE.test(id)) {
      const notFoundHtml = renderSeoDocument({
        title: "Tema escolar n\xE3o encontrado \u2014 F\xF3lio",
        description: "O tema escolar solicitado n\xE3o est\xE1 dispon\xEDvel neste endere\xE7o. Explora o \xEDndice completo de mat\xE9rias da 1.\xAA \xE0 12.\xAA classe no F\xF3lio.",
        canonicalPath: "/materias",
        ogType: "website",
        robots: "noindex, follow",
        jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: "Tema n\xE3o encontrado" },
        bodyHtml: `
          <h1>Tema escolar n\xE3o encontrado</h1>
          <p class="lead">O endere\xE7o solicitado n\xE3o corresponde a nenhum tema publicado no F\xF3lio. Podes consultar todas as disciplinas e p\xE1ginas dispon\xEDveis no \xEDndice escolar.</p>
          <p><a class="nav-cta" href="/materias">Ver \xCDndice de Mat\xE9rias</a></p>
        `
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(404).send(notFoundHtml);
    }
    try {
      const snap = await loadPublicSeoSnapshot(ensureDbReady2);
      const topic = snap.topicsById.get(id);
      if (!topic) {
        const notFoundHtml = renderSeoDocument({
          title: "Tema escolar n\xE3o encontrado \u2014 F\xF3lio",
          description: "O tema escolar solicitado n\xE3o est\xE1 dispon\xEDvel neste endere\xE7o. Explora o \xEDndice completo de mat\xE9rias da 1.\xAA \xE0 12.\xAA classe no F\xF3lio.",
          canonicalPath: "/materias",
          ogType: "website",
          robots: "noindex, follow",
          jsonLd: { "@context": "https://schema.org", "@type": "WebPage", name: "Tema n\xE3o encontrado" },
          bodyHtml: `
            <h1>Tema escolar n\xE3o encontrado</h1>
            <p class="lead">Este tema pode ter sido atualizado ou removido do cat\xE1logo escolar. Explora todas as disciplinas dispon\xEDveis da 1.\xAA \xE0 12.\xAA classe.</p>
            <p><a class="nav-cta" href="/materias">Voltar ao \xCDndice de Mat\xE9rias</a></p>
          `
        });
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        return res.status(404).send(notFoundHtml);
      }
      const currGroup = snap.curricula.find((c) => c.id === topic.curriculumId);
      const siblings = (currGroup?.topics || []).filter((t) => t.id !== topic.id).slice(0, 10);
      const curriculumTopicsCount = currGroup?.topics.length || 1;
      const pageTitle = snap.uniqueTitleById.get(topic.id) || clampSeoTitle(topic.title);
      const pageDesc = snap.uniqueDescById.get(topic.id) || clampSeoDescription(topic.summaryHalfParagraph);
      const cleanTitle = sanitizePublicSeoCopy(topic.title);
      const cleanSummary = sanitizePublicSeoCopy(topic.summaryHalfParagraph);
      const previewParas = clampPublicPreviewParagraphs(topic.previewParagraphs, cleanSummary);
      const canonicalPath = `/tema/${topic.id}`;
      const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "In\xEDcio", item: toCanonicalUrl("/", siteUrl) },
              {
                "@type": "ListItem",
                position: 2,
                name: "\xCDndice de Mat\xE9rias",
                item: toCanonicalUrl("/materias", siteUrl)
              },
              {
                "@type": "ListItem",
                position: 3,
                name: cleanTitle,
                item: toCanonicalUrl(canonicalPath, siteUrl)
              }
            ]
          },
          {
            "@type": "LearningResource",
            name: cleanTitle,
            headline: cleanTitle,
            description: pageDesc,
            url: toCanonicalUrl(canonicalPath, siteUrl),
            inLanguage: "pt-MZ",
            educationalLevel: topic.grade,
            about: {
              "@type": "Thing",
              name: `${topic.subject} \u2014 ${topic.grade} (Mo\xE7ambique)`
            },
            teaches: topic.keyTakeaways.length > 0 ? topic.keyTakeaways : [cleanTitle],
            timeRequired: `PT${Math.max(1, topic.readingMinutes)}M`,
            isAccessibleForFree: false,
            hasPart: {
              "@type": "WebPageElement",
              isAccessibleForFree: true,
              cssSelector: ".free-preview"
            },
            provider: {
              "@type": "Organization",
              name: SITE_NAME,
              url: toCanonicalUrl("/", siteUrl)
            }
          }
        ]
      };
      const takeawaysHtml = topic.keyTakeaways.length > 0 ? `<ul style="margin:12px 0 0;padding-left:20px;color:#2f4238;">${topic.keyTakeaways.map((pt) => `<li style="margin-bottom:6px;">${escapeHtml(sanitizePublicSeoCopy(pt))}</li>`).join("")}</ul>` : "";
      const visualsNote = topic.visualsCount > 0 ? ` Esta mat\xE9ria inclui tamb\xE9m ${topic.visualsCount} ${topic.visualsCount === 1 ? "esquema ilustrativo" : "esquemas e ilustra\xE7\xF5es did\xE1ticas"} dispon\xEDveis no leitor offline.` : "";
      const siblingsHtml = siblings.length > 0 ? `
        <section class="card" aria-labelledby="heading-siblings">
          <h2 id="heading-siblings" style="margin-top:0;">Outros temas de ${escapeHtml(topic.subject)} \xB7 ${escapeHtml(topic.grade)}</h2>
          <ul class="topic-list">
            ${siblings.map(
        (s) => `
              <li class="topic-row">
                <div class="topic-head">
                  <a class="topic-link" href="/tema/${escapeHtml(s.id)}">${escapeHtml(sanitizePublicSeoCopy(s.title))}</a>
                  <span class="page-pill">P\xE1g. ${s.pageNumber}</span>
                </div>
              </li>`
      ).join("")}
          </ul>
        </section>` : "";
      const bodyHtml = `
        <nav class="breadcrumb" aria-label="Caminho de navega\xE7\xE3o">
          <a href="/">In\xEDcio</a>
          <span aria-hidden="true">/</span>
          <a href="/materias">\xCDndice de Mat\xE9rias</a>
          <span aria-hidden="true">/</span>
          <a href="/materias#ciclo-${topic.cycle}">${escapeHtml(topic.subject)} \xB7 ${escapeHtml(topic.grade)}</a>
          <span aria-hidden="true">/</span>
          <span>P\xE1g. ${topic.pageNumber}</span>
        </nav>

        <p class="kicker">${escapeHtml(topic.unitLabel || `${topic.subject} \xB7 ${topic.grade}`)} \xB7 P\xE1gina ${topic.pageNumber}${topic.pageEnd > topic.pageNumber ? `\u2013${topic.pageEnd}` : ""}</p>
        <h1>${escapeHtml(cleanTitle)}</h1>
        <p class="lead">
          Pr\xE9-visualiza\xE7\xE3o gratuita da mat\xE9ria de <strong>${escapeHtml(topic.subject)} (${escapeHtml(topic.grade)})</strong> \u2014 refer\xEAncia exata na <strong>P\xE1gina ${topic.pageNumber}</strong>, tempo estimado de ${topic.readingMinutes} minutos de estudo.
        </p>

        <section class="card free-preview" aria-labelledby="heading-resumo">
          <h2 id="heading-resumo" style="margin-top:0;">Resumo R\xE1pido (Gr\xE1tis)</h2>
          <p style="margin:0;color:#041a11;font-size:15.5px;">${escapeHtml(cleanSummary)}</p>
          ${takeawaysHtml}
        </section>

        <article class="card free-preview" aria-labelledby="heading-excerto">
          <h2 id="heading-excerto" style="margin-top:0;">Excerto da P\xE1gina ${topic.pageNumber}</h2>
          <div class="serif-prose">
            ${previewParas.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
          </div>
          <p style="margin:18px 0 0;font-size:13.5px;color:#646050;">
            A continua\xE7\xE3o completa desta li\xE7\xE3o, explica\xE7\xF5es passo a passo e todos os ${curriculumTopicsCount} ${curriculumTopicsCount === 1 ? "tema" : "temas"} de ${escapeHtml(topic.subject)} (${escapeHtml(topic.grade)}) ficam dispon\xEDveis no leitor offline do F\xF3lio.${escapeHtml(visualsNote)}
          </p>
        </article>

        <section class="cta-bar" aria-label="Abrir mat\xE9ria no F\xF3lio">
          <div>
            <p class="kicker" style="color:#f8e3be;margin-bottom:4px;">Taxa \xFAnica \xB7 ${topic.priceMt} MT (M-Pesa ou e-Mola)</p>
            <p style="margin:0;font-size:15px;color:#fcf8ee;">
              Abre diretamente na P\xE1gina ${topic.pageNumber} e estuda ${escapeHtml(topic.subject)} (${escapeHtml(topic.grade)}) 100% offline.
            </p>
          </div>
          <a href="/#tema=${escapeHtml(topic.id)}" class="cta-btn">Abrir no F\xF3lio (P\xE1g. ${topic.pageNumber})</a>
        </section>

        <section class="card" aria-labelledby="heading-sobre">
          <h2 id="heading-sobre" style="margin-top:0;">Como estudar ${escapeHtml(topic.subject)} (${escapeHtml(topic.grade)}) sem internet</h2>
          <p style="margin:0;color:#2f4238;font-size:14.5px;">
            No F\xF3lio, os estudantes do Sistema Nacional de Educa\xE7\xE3o de Mo\xE7ambique encontram a mat\xE9ria exata da ${escapeHtml(topic.grade)} sem perder tempo. A consulta do tema, do resumo de meio par\xE1grafo e do n\xFAmero da p\xE1gina \xE9 sempre gratuita e n\xE3o exige registo. Ao efetuar a sincroniza\xE7\xE3o \xFAnica de ${topic.priceMt} MT via M-Pesa ou e-Mola, toda a disciplina fica protegida na tua conta para estudo 100% offline, com leitura em modo Papel, S\xE9pia ou Noite, ajuste de tamanho da letra e marcadores de p\xE1gina.
          </p>
        </section>

        ${siblingsHtml}
      `;
      const html = renderSeoDocument({
        title: pageTitle,
        description: pageDesc,
        canonicalPath,
        ogType: "article",
        jsonLd,
        bodyHtml
      });
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
      return res.status(200).send(html);
    } catch (err) {
      console.error("[GET /tema/:id]", err);
      return res.status(500).send("Erro ao carregar pr\xE9-visualiza\xE7\xE3o da mat\xE9ria.");
    }
  });
  router.get("/:key.txt", (req, res, next) => {
    const configuredKey = (process.env.INDEXNOW_KEY || "").trim();
    const requestedKey = String(req.params.key || "").trim();
    if (!configuredKey || !INDEXNOW_KEY_RE.test(configuredKey) || requestedKey !== configuredKey) {
      return next();
    }
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(configuredKey);
  });
  return router;
}

// server/app.ts
dotenv3.config();
var app = express();
app.use(
  cors({
    exposedHeaders: ["X-Session-Revoked"]
  })
);
app.use(express.json({ limit: "45mb" }));
var schemaInitPromise = null;
var dbReady = false;
var dbError;
async function ensureDbReady() {
  if (dbReady) return true;
  if (!schemaInitPromise) {
    schemaInitPromise = ensureSchema().then((status) => {
      dbReady = status.connected;
      dbError = status.error;
      if (!status.connected) {
        schemaInitPromise = null;
      }
      return status;
    });
  }
  const res = await schemaInitPromise;
  return res.connected;
}
function gradeNumberToLabel(gradeNumber) {
  const clamped = Math.max(1, Math.min(12, Math.round(gradeNumber)));
  return `${clamped}.\xAA Classe`;
}
function gradeNumberToCycle(gradeNumber) {
  if (gradeNumber <= 6) return "1-6";
  if (gradeNumber <= 9) return "7-9";
  return "10-12";
}
function buildTrigrams(str) {
  const padded = `  ${str} `;
  const set = /* @__PURE__ */ new Set();
  for (let i = 0; i <= padded.length - 3; i++) {
    set.add(padded.slice(i, i + 3));
  }
  return set;
}
function trigramOverlap(queryToken, targetWords) {
  if (queryToken.length < 3) return 0;
  const qTri = buildTrigrams(queryToken);
  let best = 0;
  for (const w of targetWords) {
    if (w.length < 3) continue;
    if (w.includes(queryToken) || queryToken.includes(w)) return 1;
    const wTri = buildTrigrams(w);
    let common = 0;
    for (const g of qTri) {
      if (wTri.has(g)) common += 1;
    }
    const sim = 2 * common / (qTri.size + wTri.size);
    if (sim > best) best = sim;
  }
  return best;
}
function scoreTopicQuery(queryNorm, titleNorm, subjectGradeNorm, summaryNorm, searchNorm) {
  if (!queryNorm) return 10;
  let score = 0;
  if (titleNorm.includes(queryNorm)) score += 75;
  if (subjectGradeNorm.includes(queryNorm)) score += 35;
  if (summaryNorm.includes(queryNorm)) score += 32;
  if (searchNorm.includes(queryNorm)) score += 22;
  const qTokens = queryNorm.split(" ").filter((t) => t.length >= 2);
  const titleWords = titleNorm.split(" ");
  const corpusWords = Array.from(new Set(searchNorm.split(" "))).slice(0, 140);
  let matchedTokens = 0;
  for (const tok of qTokens) {
    if (titleNorm.includes(tok)) {
      score += 22;
      matchedTokens += 1;
    } else if (searchNorm.includes(tok)) {
      score += 10;
      matchedTokens += 1;
    } else {
      const titleSim = trigramOverlap(tok, titleWords);
      if (titleSim >= 0.48) {
        score += Math.round(titleSim * 24);
        matchedTokens += 1;
      } else {
        const bodySim = trigramOverlap(tok, corpusWords);
        if (bodySim >= 0.54) {
          score += Math.round(bodySim * 14);
          matchedTokens += 1;
        }
      }
    }
  }
  if (qTokens.length > 1 && matchedTokens === qTokens.length) {
    score += 25;
  }
  return score;
}
function getDeviceLabel(req) {
  const ua = String(req.headers["user-agent"] || "");
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/windows/i.test(ua)) return "Windows";
  if (/macintosh/i.test(ua)) return "Mac";
  return "Navegador Web";
}
var apiRouter = Router2();
apiRouter.use((_req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});
apiRouter.get("/health", async (_req, res) => {
  const ready = await ensureDbReady();
  return res.json({
    ok: true,
    dbConnected: ready
  });
});
apiRouter.get("/topics", attachOptionalAuth, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Servi\xE7o temporariamente indispon\xEDvel", topics: [] });
  }
  const rawQ = String(req.query.q || "").trim();
  const cycle = String(req.query.cycle || "all").trim();
  const focusTopicId = String(req.query.topicId || "").trim();
  const queryNorm = normalizeSearchText(rawQ);
  try {
    const params = [];
    const conditions = [`c.status = 'published'`];
    if (cycle !== "all" && ["1-6", "7-9", "10-12"].includes(cycle)) {
      params.push(cycle);
      conditions.push(`c.cycle = $${params.length}`);
    }
    const rowsRes = await pool.query(
      `
      SELECT
        t.id,
        t.curriculum_id,
        t.unit_label,
        t.title,
        t.page_number,
        t.page_end,
        t.summary_half_paragraph,
        t.preview_paragraphs,
        t.key_takeaways,
        t.reading_minutes,
        t.search_normalized,
        t.visuals_count,
        c.subject,
        c.grade,
        c.grade_number,
        c.cycle,
        c.total_pages,
        c.price_mt,
        (SELECT COUNT(*)::int FROM topics t2 WHERE t2.curriculum_id = c.id) AS curriculum_topics_count
      FROM topics t
      JOIN curricula c ON c.id = t.curriculum_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY c.created_at DESC, t.topic_order ASC
      LIMIT 300
      `,
      params
    );
    const unlockedIds = /* @__PURE__ */ new Set();
    if (req.authUser) {
      if (req.authUser.role === "admin") {
        for (const r of rowsRes.rows) unlockedIds.add(String(r.curriculum_id));
      } else {
        const uRes = await pool.query(
          `SELECT curriculum_id FROM user_unlocks WHERE user_id = $1`,
          [req.authUser.id]
        );
        for (const u of uRes.rows) unlockedIds.add(String(u.curriculum_id));
      }
    }
    const scored = [];
    for (const r of rowsRes.rows) {
      const titleNorm = normalizeSearchText(String(r.title));
      const subjGradeNorm = normalizeSearchText(`${r.subject} ${r.grade}`);
      const summaryNorm = normalizeSearchText(String(r.summary_half_paragraph));
      const searchNorm = String(r.search_normalized || "");
      let score = scoreTopicQuery(queryNorm, titleNorm, subjGradeNorm, summaryNorm, searchNorm);
      if (focusTopicId && String(r.id) === focusTopicId) {
        score += 1e3;
      }
      if (queryNorm && score < 8) continue;
      const takeaways = Array.isArray(r.key_takeaways) ? r.key_takeaways : [];
      const previews = Array.isArray(r.preview_paragraphs) ? r.preview_paragraphs.slice(0, 2) : [];
      scored.push({
        score,
        item: {
          id: String(r.id),
          curriculumId: String(r.curriculum_id),
          subject: String(r.subject),
          grade: String(r.grade),
          gradeNumber: Number(r.grade_number),
          cycle: String(r.cycle),
          unitLabel: r.unit_label ? String(r.unit_label) : void 0,
          title: String(r.title),
          pageNumber: Number(r.page_number),
          pageEnd: Number(r.page_end || r.page_number),
          summaryHalfParagraph: clampHalfParagraph(String(r.summary_half_paragraph)),
          previewParagraphs: previews,
          keyTakeawaysPreview: takeaways.slice(0, 2),
          readingMinutes: Number(r.reading_minutes || 3),
          priceMt: Number(r.price_mt || 17),
          curriculumTopicsCount: Number(r.curriculum_topics_count || 1),
          totalPages: Number(r.total_pages || 1),
          visualsCount: Number(r.visuals_count || 0),
          unlocked: unlockedIds.has(String(r.curriculum_id))
        }
      });
    }
    scored.sort((a, b) => b.score - a.score || a.item.pageNumber - b.item.pageNumber);
    return res.json({
      topics: scored.slice(0, 50).map((s) => s.item),
      totalCurricula: new Set(rowsRes.rows.map((r) => String(r.curriculum_id))).size
    });
  } catch (err) {
    console.error("[GET /api/topics]", err);
    return res.status(500).json({ error: "Erro ao pesquisar mat\xE9rias", topics: [] });
  }
});
apiRouter.get("/curricula/:id/preview", async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  try {
    const cRes = await pool.query(
      `SELECT id, subject, grade, grade_number, cycle, total_pages, price_mt FROM curricula WHERE id = $1 AND status = 'published'`,
      [req.params.id]
    );
    if (cRes.rows.length === 0) {
      return res.status(404).json({ error: "Mat\xE9ria n\xE3o encontrada" });
    }
    const tRes = await pool.query(
      `SELECT id, title, unit_label, page_number, page_end, reading_minutes, visuals_count FROM topics WHERE curriculum_id = $1 ORDER BY topic_order ASC`,
      [req.params.id]
    );
    const c = cRes.rows[0];
    const preview = {
      id: String(c.id),
      subject: String(c.subject),
      grade: String(c.grade),
      gradeNumber: Number(c.grade_number),
      cycle: String(c.cycle),
      totalPages: Number(c.total_pages),
      priceMt: Number(c.price_mt || 17),
      topics: tRes.rows.map((t) => ({
        id: String(t.id),
        title: String(t.title),
        unitLabel: t.unit_label ? String(t.unit_label) : void 0,
        pageNumber: Number(t.page_number),
        pageEnd: Number(t.page_end || t.page_number),
        readingMinutes: Number(t.reading_minutes || 3),
        visualsCount: Number(t.visuals_count || 0)
      }))
    };
    return res.json({ curriculum: preview });
  } catch (err) {
    console.error("[GET /api/curricula/:id/preview]", err);
    return res.status(500).json({ error: "Erro ao carregar pr\xE9-visualiza\xE7\xE3o" });
  }
});
apiRouter.post("/auth/register", async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  const email = normalizeEmail(String(req.body?.email || ""));
  const password = String(req.body?.password || "");
  if (!validateEmailFormat(email)) {
    return res.status(400).json({ error: "Introduz um endere\xE7o de e-mail v\xE1lido." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres." });
  }
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "J\xE1 existe uma conta com este e-mail. Inicia sess\xE3o." });
    }
    const passwordHash = await hashPassword(password);
    const created = await pool.query(
      `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'student') RETURNING id, email, role, created_at`,
      [email, passwordHash]
    );
    const userRow = created.rows[0];
    const session = await createSessionWithDeviceLimit(String(userRow.id), getDeviceLabel(req));
    return res.status(201).json({
      user: {
        id: String(userRow.id),
        email: String(userRow.email),
        role: "student",
        createdAt: new Date(String(userRow.created_at)).toISOString()
      },
      token: session.token,
      activeSessions: session.activeSessions,
      maxSessions: MAX_CONCURRENT_SESSIONS,
      evictedOldSession: session.evictedOldSession,
      unlockedCurriculumIds: []
    });
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return res.status(500).json({ error: "N\xE3o foi poss\xEDvel criar a conta agora." });
  }
});
apiRouter.post("/auth/login", async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  const email = normalizeEmail(String(req.body?.email || ""));
  const password = String(req.body?.password || "");
  if (!email || !password) {
    return res.status(400).json({ error: "Preenche o e-mail e a senha." });
  }
  try {
    const uRes = await pool.query(
      `SELECT id, email, password_hash, role, created_at FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (uRes.rows.length === 0) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }
    const row = uRes.rows[0];
    const valid = await verifyPassword(password, String(row.password_hash));
    if (!valid) {
      return res.status(401).json({ error: "E-mail ou senha incorretos." });
    }
    const session = await createSessionWithDeviceLimit(String(row.id), getDeviceLabel(req));
    const unlockRes = await pool.query(
      `SELECT curriculum_id FROM user_unlocks WHERE user_id = $1`,
      [row.id]
    );
    return res.json({
      user: {
        id: String(row.id),
        email: String(row.email),
        role: row.role === "admin" ? "admin" : "student",
        createdAt: new Date(String(row.created_at)).toISOString()
      },
      token: session.token,
      activeSessions: session.activeSessions,
      maxSessions: MAX_CONCURRENT_SESSIONS,
      evictedOldSession: session.evictedOldSession,
      unlockedCurriculumIds: unlockRes.rows.map((r) => String(r.curriculum_id))
    });
  } catch (err) {
    console.error("[POST /api/auth/login]", err);
    return res.status(500).json({ error: "Erro ao iniciar sess\xE3o." });
  }
});
apiRouter.get("/auth/me", async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  try {
    const resolved = await resolveUserFromRequest(req);
    if (!resolved) {
      const hadBearer = Boolean(req.headers.authorization?.startsWith("Bearer "));
      if (hadBearer) {
        res.setHeader("X-Session-Revoked", "1");
      }
      return res.status(401).json({
        error: hadBearer ? "A tua sess\xE3o foi encerrada porque a conta iniciou sess\xE3o noutro dispositivo." : "N\xE3o autenticado",
        code: hadBearer ? "SESSION_REVOKED" : "SESSION_REQUIRED"
      });
    }
    const unlockRes = await pool.query(
      `SELECT curriculum_id FROM user_unlocks WHERE user_id = $1`,
      [resolved.user.id]
    );
    return res.json({
      user: resolved.user,
      activeSessions: resolved.activeSessions,
      maxSessions: MAX_CONCURRENT_SESSIONS,
      unlockedCurriculumIds: unlockRes.rows.map((r) => String(r.curriculum_id))
    });
  } catch (err) {
    console.error("[GET /api/auth/me]", err);
    return res.status(500).json({ error: "Erro ao verificar sess\xE3o" });
  }
});
apiRouter.post("/auth/logout", async (req, res) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    await revokeSessionByToken(header.slice(7).trim());
  }
  return res.json({ ok: true });
});
apiRouter.post("/unlocks", requireAuth, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  const curriculumId = String(req.body?.curriculumId || "").trim();
  const provider = String(req.body?.provider || "");
  const phone = String(req.body?.phone || "").trim();
  if (!curriculumId || !["mpesa", "emola"].includes(provider)) {
    return res.status(400).json({ error: "Seleciona uma mat\xE9ria e carteira m\xF3vel v\xE1lida." });
  }
  try {
    const cRes = await pool.query(
      `SELECT id, price_mt, subject, grade FROM curricula WHERE id = $1 AND status = 'published'`,
      [curriculumId]
    );
    if (cRes.rows.length === 0) {
      return res.status(404).json({ error: "Mat\xE9ria curricular n\xE3o encontrada." });
    }
    const curriculum = cRes.rows[0];
    const amountMt = Number(curriculum.price_mt || 17);
    const existing = await pool.query(
      `SELECT payment_provider, phone_masked, amount_mt, transaction_ref, unlocked_at FROM user_unlocks WHERE user_id = $1 AND curriculum_id = $2`,
      [req.authUser.id, curriculumId]
    );
    if (existing.rows.length > 0) {
      const ex = existing.rows[0];
      return res.json({
        receipt: {
          curriculumId,
          provider: ex.payment_provider,
          phoneMasked: String(ex.phone_masked),
          amountMt: Number(ex.amount_mt),
          transactionRef: String(ex.transaction_ref),
          unlockedAt: new Date(String(ex.unlocked_at)).toISOString()
        },
        alreadyUnlocked: true
      });
    }
    const payment = await processMobilePayment({
      provider,
      phone,
      amountMt,
      curriculumId,
      userId: req.authUser.id
    });
    if (!payment.approved) {
      return res.status(400).json({ error: payment.error || "Pagamento n\xE3o autorizado." });
    }
    const inserted = await pool.query(
      `
      INSERT INTO user_unlocks (user_id, curriculum_id, payment_provider, phone_masked, amount_mt, transaction_ref)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, curriculum_id) DO NOTHING
      RETURNING unlocked_at
      `,
      [
        req.authUser.id,
        curriculumId,
        payment.provider,
        payment.phoneMasked,
        payment.amountMt,
        payment.transactionRef
      ]
    );
    const unlockedAt = inserted.rows[0]?.unlocked_at ? new Date(String(inserted.rows[0].unlocked_at)).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
    return res.status(201).json({
      receipt: {
        curriculumId,
        provider: payment.provider,
        phoneMasked: payment.phoneMasked,
        amountMt: payment.amountMt,
        transactionRef: payment.transactionRef,
        unlockedAt
      },
      mode: payment.mode
    });
  } catch (err) {
    console.error("[POST /api/unlocks]", err);
    return res.status(500).json({ error: "Erro ao confirmar desbloqueio." });
  }
});
apiRouter.get("/my-subjects", requireAuth, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  try {
    const cRes = await pool.query(
      `
      SELECT
        c.id,
        c.subject,
        c.grade,
        c.grade_number,
        c.cycle,
        c.total_pages,
        c.price_mt,
        u.payment_provider,
        u.transaction_ref,
        u.unlocked_at
      FROM user_unlocks u
      JOIN curricula c ON c.id = u.curriculum_id
      WHERE u.user_id = $1 AND c.status = 'published'
      ORDER BY u.unlocked_at DESC
      `,
      [req.authUser.id]
    );
    const ids = cRes.rows.map((r) => String(r.id));
    const topicsByCurr = /* @__PURE__ */ new Map();
    if (ids.length > 0) {
      const tRes = await pool.query(
        `
        SELECT id, curriculum_id, title, page_number
        FROM topics
        WHERE curriculum_id = ANY($1::uuid[])
        ORDER BY topic_order ASC
        `,
        [ids]
      );
      for (const t of tRes.rows) {
        const cid = String(t.curriculum_id);
        const list = topicsByCurr.get(cid) ?? [];
        list.push({
          id: String(t.id),
          title: String(t.title),
          pageNumber: Number(t.page_number)
        });
        topicsByCurr.set(cid, list);
      }
    }
    return res.json({
      subjects: cRes.rows.map((r) => ({
        id: String(r.id),
        subject: String(r.subject),
        grade: String(r.grade),
        gradeNumber: Number(r.grade_number),
        cycle: String(r.cycle),
        totalPages: Number(r.total_pages),
        priceMt: Number(r.price_mt || 17),
        paymentProvider: String(r.payment_provider),
        transactionRef: String(r.transaction_ref),
        unlockedAt: new Date(String(r.unlocked_at)).toISOString(),
        topics: topicsByCurr.get(String(r.id)) ?? []
      }))
    });
  } catch (err) {
    console.error("[GET /api/my-subjects]", err);
    return res.status(500).json({ error: "Erro ao carregar as tuas mat\xE9rias." });
  }
});
apiRouter.get("/curricula/:id/content", requireAuth, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  const curriculumId = String(req.params.id);
  try {
    let unlockRow = null;
    if (req.authUser.role !== "admin") {
      const uRes = await pool.query(
        `SELECT payment_provider, transaction_ref, unlocked_at FROM user_unlocks WHERE user_id = $1 AND curriculum_id = $2`,
        [req.authUser.id, curriculumId]
      );
      if (uRes.rows.length === 0) {
        return res.status(403).json({
          error: "Mat\xE9ria ainda n\xE3o desbloqueada nesta conta. Efetua a taxa de 17 MT para aceder.",
          code: "UNLOCK_REQUIRED"
        });
      }
      unlockRow = uRes.rows[0];
    }
    const cRes = await pool.query(
      `SELECT id, subject, grade, grade_number, cycle, total_pages, price_mt FROM curricula WHERE id = $1`,
      [curriculumId]
    );
    if (cRes.rows.length === 0) {
      return res.status(404).json({ error: "Mat\xE9ria n\xE3o encontrada" });
    }
    const tRes = await pool.query(
      `
      SELECT
        id, unit_label, title, page_number, page_end, summary_half_paragraph,
        key_takeaways, keywords, full_text, pages, visuals, reading_minutes
      FROM topics
      WHERE curriculum_id = $1
      ORDER BY topic_order ASC
      `,
      [curriculumId]
    );
    const c = cRes.rows[0];
    const curriculum = {
      id: String(c.id),
      subject: String(c.subject),
      grade: String(c.grade),
      gradeNumber: Number(c.grade_number),
      cycle: String(c.cycle),
      totalPages: Number(c.total_pages),
      priceMt: Number(c.price_mt || 17),
      paymentProvider: unlockRow ? String(unlockRow.payment_provider) : void 0,
      transactionRef: unlockRow ? String(unlockRow.transaction_ref) : void 0,
      unlockedAt: unlockRow ? new Date(String(unlockRow.unlocked_at)).toISOString() : void 0,
      topics: tRes.rows.map((t) => ({
        id: String(t.id),
        curriculumId: String(c.id),
        unitLabel: t.unit_label ? String(t.unit_label) : void 0,
        title: String(t.title),
        pageNumber: Number(t.page_number),
        pageEnd: Number(t.page_end || t.page_number),
        summaryHalfParagraph: clampHalfParagraph(String(t.summary_half_paragraph)),
        keyTakeaways: Array.isArray(t.key_takeaways) ? t.key_takeaways : [],
        keywords: Array.isArray(t.keywords) ? t.keywords : [],
        paragraphs: String(t.full_text || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
        pages: Array.isArray(t.pages) ? t.pages : void 0,
        visuals: Array.isArray(t.visuals) ? t.visuals : [],
        readingMinutes: Number(t.reading_minutes || 3)
      }))
    };
    return res.json({ curriculum });
  } catch (err) {
    console.error("[GET /api/curricula/:id/content]", err);
    return res.status(500).json({ error: "Erro ao transferir conte\xFAdo da mat\xE9ria." });
  }
});
apiRouter.get("/admin/curricula", requireAdmin, async (_req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  try {
    const [currRes, topicsRes, statsRes] = await Promise.all([
      pool.query(
        `
        SELECT
          c.id, c.subject, c.grade, c.grade_number, c.cycle, c.total_pages,
          c.price_mt, c.status, c.created_at,
          (SELECT COUNT(*)::int FROM topics t WHERE t.curriculum_id = c.id) AS topics_count,
          (SELECT COUNT(*)::int FROM user_unlocks u WHERE u.curriculum_id = c.id) AS unlocks_count
        FROM curricula c
        ORDER BY c.created_at DESC
        `
      ),
      pool.query(
        `
        SELECT
          id, curriculum_id, title, page_number, summary_half_paragraph, visuals_count
        FROM topics
        ORDER BY curriculum_id, topic_order ASC
        `
      ),
      pool.query(
        `
        SELECT
          (SELECT COUNT(*)::int FROM curricula) AS total_curricula,
          (SELECT COUNT(*)::int FROM topics) AS total_topics,
          (SELECT COUNT(*)::int FROM users WHERE role = 'student') AS total_students,
          (SELECT COUNT(*)::int FROM user_unlocks) AS total_unlocks,
          (SELECT COALESCE(SUM(amount_mt), 0)::float8 FROM user_unlocks) AS revenue_mt
        `
      )
    ]);
    const previewsByCurr = /* @__PURE__ */ new Map();
    for (const t of topicsRes.rows) {
      const cid = String(t.curriculum_id);
      const list = previewsByCurr.get(cid) ?? [];
      list.push({
        id: String(t.id),
        title: String(t.title),
        pageNumber: Number(t.page_number),
        summaryHalfParagraph: String(t.summary_half_paragraph),
        visualsCount: Number(t.visuals_count || 0)
      });
      previewsByCurr.set(cid, list);
    }
    const curricula = currRes.rows.map((c) => ({
      id: String(c.id),
      subject: String(c.subject),
      grade: String(c.grade),
      gradeNumber: Number(c.grade_number),
      cycle: String(c.cycle),
      totalPages: Number(c.total_pages),
      priceMt: Number(c.price_mt || 17),
      status: c.status === "processing" ? "processing" : "published",
      topicsCount: Number(c.topics_count || 0),
      unlocksCount: Number(c.unlocks_count || 0),
      createdAt: new Date(String(c.created_at)).toISOString(),
      topicsPreview: previewsByCurr.get(String(c.id)) ?? []
    }));
    const st = statsRes.rows[0] ?? {};
    return res.json({
      curricula,
      stats: {
        totalCurricula: Number(st.total_curricula || 0),
        totalTopics: Number(st.total_topics || 0),
        totalStudents: Number(st.total_students || 0),
        totalUnlocks: Number(st.total_unlocks || 0),
        revenueMt: Number(st.revenue_mt || 0),
        groqEnabled: isGroqConfigured(),
        groqModel: isGroqConfigured() ? getPreferredGroqModel() : void 0
      }
    });
  } catch (err) {
    console.error("[GET /api/admin/curricula]", err);
    return res.status(500).json({ error: "Erro ao carregar painel administrativo." });
  }
});
apiRouter.post("/admin/curricula", requireAdmin, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  const gradeNumber = Number(req.body?.gradeNumber);
  const subject = String(req.body?.subject || "").trim();
  const totalPages = Math.max(1, Number(req.body?.totalPages || 1));
  const rawTopics = req.body?.topics;
  if (!gradeNumber || gradeNumber < 1 || gradeNumber > 12 || !subject || !Array.isArray(rawTopics) || rawTopics.length === 0) {
    return res.status(400).json({ error: "Seleciona Classe (1\u201312), Disciplina e anexa um PDF com texto." });
  }
  const meaningfulChars = rawTopics.map((t) => (t.paragraphs || []).join(" ")).join(" ").replace(/\b(scanned\s+(by|with)\s+\w+|camscanner|digitalizado\s+com\s+\w+)\b/gi, "").trim().length;
  if (meaningfulChars < 40) {
    return res.status(400).json({
      error: "O PDF n\xE3o cont\xE9m texto did\xE1tico v\xE1lido (apenas marcas de scanner). Ativa o OCR autom\xE1tico antes de publicar."
    });
  }
  const grade = gradeNumberToLabel(gradeNumber);
  const cycle = gradeNumberToCycle(gradeNumber);
  try {
    const currInsert = await pool.query(
      `
      INSERT INTO curricula (grade, grade_number, cycle, subject, total_pages, price_mt, status)
      VALUES ($1, $2, $3, $4, $5, 17.00, 'processing')
      RETURNING id, created_at
      `,
      [grade, gradeNumber, cycle, subject, totalPages]
    );
    const curriculumId = String(currInsert.rows[0].id);
    const aiResult = await enrichTopicsWithGroq({ subject, grade }, rawTopics);
    const insertedTopicIds = [];
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (let i = 0; i < aiResult.topics.length; i++) {
        const t = aiResult.topics[i];
        const fullText = (t.paragraphs || []).join("\n\n");
        const preview = (t.previewParagraphs?.length ? t.previewParagraphs : t.paragraphs || []).slice(0, 2);
        const summary = clampHalfParagraph(t.summaryHalfParagraph);
        const searchNorm = normalizeSearchText(
          [
            subject,
            grade,
            t.unitLabel || "",
            t.title,
            summary,
            ...t.keywords || [],
            ...t.keyTakeaways || [],
            fullText.slice(0, 1800)
          ].join(" ")
        );
        const insRes = await client.query(
          `
          INSERT INTO topics (
            curriculum_id, topic_order, unit_label, title, page_number, page_end,
            summary_half_paragraph, preview_paragraphs, key_takeaways, keywords,
            full_text, pages, visuals, visuals_count, reading_minutes, search_normalized
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$12::jsonb,$13::jsonb,$14,$15,$16)
          RETURNING id
          `,
          [
            curriculumId,
            i,
            t.unitLabel || null,
            t.title,
            t.pageNumber,
            t.pageEnd || t.pageNumber,
            summary,
            JSON.stringify(preview),
            JSON.stringify(t.keyTakeaways || []),
            JSON.stringify(t.keywords || []),
            fullText,
            t.pages ? JSON.stringify(t.pages) : null,
            JSON.stringify(t.visuals || []),
            (t.visuals || []).length,
            t.readingMinutes || 3,
            searchNorm
          ]
        );
        if (insRes.rows[0]?.id) {
          insertedTopicIds.push(String(insRes.rows[0].id));
        }
      }
      await client.query(`UPDATE curricula SET status = 'published' WHERE id = $1`, [curriculumId]);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      await pool.query(`DELETE FROM curricula WHERE id = $1`, [curriculumId]);
      throw err;
    } finally {
      client.release();
    }
    invalidateSeoCache();
    void notifyIndexNow([
      "/",
      "/materias",
      ...insertedTopicIds.map((id) => `/tema/${id}`)
    ]);
    return res.status(201).json({
      published: true,
      curriculumId,
      subject,
      grade,
      topicsCount: aiResult.topics.length,
      groqEnrichedCount: aiResult.enrichedCount,
      groqModel: aiResult.modelUsed,
      warnings: aiResult.warnings
    });
  } catch (err) {
    console.error("[POST /api/admin/curricula]", err);
    return res.status(500).json({ error: "Erro ao processar e publicar mat\xE9ria curricular." });
  }
});
apiRouter.post("/admin/curricula/:id/enrich", requireAdmin, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  try {
    const cRes = await pool.query(`SELECT id, subject, grade FROM curricula WHERE id = $1`, [req.params.id]);
    if (cRes.rows.length === 0) return res.status(404).json({ error: "Mat\xE9ria n\xE3o encontrada" });
    const curr = cRes.rows[0];
    const tRes = await pool.query(
      `SELECT * FROM topics WHERE curriculum_id = $1 ORDER BY topic_order ASC`,
      [curr.id]
    );
    const drafts = tRes.rows.map((t) => ({
      unitLabel: t.unit_label ? String(t.unit_label) : void 0,
      title: String(t.title),
      pageNumber: Number(t.page_number),
      pageEnd: Number(t.page_end || t.page_number),
      summaryHalfParagraph: String(t.summary_half_paragraph),
      previewParagraphs: Array.isArray(t.preview_paragraphs) ? t.preview_paragraphs : [],
      keyTakeaways: Array.isArray(t.key_takeaways) ? t.key_takeaways : [],
      keywords: Array.isArray(t.keywords) ? t.keywords : [],
      paragraphs: String(t.full_text || "").split(/\n{2,}/).filter(Boolean),
      pages: Array.isArray(t.pages) ? t.pages : void 0,
      visuals: Array.isArray(t.visuals) ? t.visuals : [],
      readingMinutes: Number(t.reading_minutes || 3)
    }));
    const aiResult = await enrichTopicsWithGroq(
      { subject: String(curr.subject), grade: String(curr.grade) },
      drafts
    );
    for (let i = 0; i < tRes.rows.length; i++) {
      const origId = String(tRes.rows[i].id);
      const updated = aiResult.topics[i];
      const searchNorm = normalizeSearchText(
        [
          curr.subject,
          curr.grade,
          updated.unitLabel || "",
          updated.title,
          updated.summaryHalfParagraph,
          ...updated.keywords,
          ...updated.keyTakeaways,
          updated.paragraphs.join(" ").slice(0, 1800)
        ].join(" ")
      );
      await pool.query(
        `
        UPDATE topics
        SET title = $1,
            summary_half_paragraph = $2,
            key_takeaways = $3::jsonb,
            keywords = $4::jsonb,
            visuals = $5::jsonb,
            visuals_count = $6,
            search_normalized = $7
        WHERE id = $8
        `,
        [
          updated.title,
          updated.summaryHalfParagraph,
          JSON.stringify(updated.keyTakeaways),
          JSON.stringify(updated.keywords),
          JSON.stringify(updated.visuals || []),
          (updated.visuals || []).length,
          searchNorm,
          origId
        ]
      );
    }
    invalidateSeoCache();
    return res.json({
      enrichedCount: aiResult.enrichedCount,
      totalCount: aiResult.totalCount,
      modelUsed: aiResult.modelUsed,
      warnings: aiResult.warnings
    });
  } catch (err) {
    console.error("[POST /api/admin/curricula/:id/enrich]", err);
    return res.status(500).json({ error: "Erro ao reprocessar resumos com Groq." });
  }
});
apiRouter.delete("/admin/curricula/:id", requireAdmin, async (req, res) => {
  const ready = await ensureDbReady();
  if (!pool || !ready) {
    return res.status(503).json({ error: "Base de dados indispon\xEDvel" });
  }
  try {
    await pool.query(`DELETE FROM curricula WHERE id = $1`, [req.params.id]);
    invalidateSeoCache();
    return res.json({ deleted: true });
  } catch (err) {
    console.error("[DELETE /api/admin/curricula/:id]", err);
    return res.status(500).json({ error: "Erro ao remover mat\xE9ria curricular." });
  }
});
app.use("/", createSeoRouter(ensureDbReady));
app.use("/api", apiRouter);
app.use("/", apiRouter);
app.use((err, _req, res, _next) => {
  console.error("[F\xF3lio Server Error]:", err);
  if (res.headersSent) return;
  const status = typeof err?.status === "number" ? err.status : 500;
  let message = err?.message || "Erro interno no servidor ao processar o pedido.";
  if (err instanceof SyntaxError && "body" in err) {
    message = "Formato de dados JSON inv\xE1lido no pedido.";
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(status).json({
    error: message,
    code: err?.code || "SERVER_ERROR"
  });
});
var app_default = app;

// server/serverless.ts
function handler(req, res) {
  try {
    return app_default(req, res);
  } catch (err) {
    console.error("[API Serverless Error]:", err);
    if (!res.headersSent) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.status(500).json({
        error: "Erro no servidor ao processar o pedido: " + (err?.message || String(err))
      });
    }
  }
}
export {
  handler as default
};
