import type { AdminTopicDraft, SchoolCycle } from '../src/types/folio';

export interface SeedCurriculum {
  slug: string;
  subject: string;
  grade: string;
  gradeNumber: number;
  cycle: Exclude<SchoolCycle, 'all'>;
  totalPages: number;
  priceMt: number;
  topics: AdminTopicDraft[];
}

export const INITIAL_SNE_CURRICULA: SeedCurriculum[] = [
  {
    slug: 'sne-bio-10',
    subject: 'Biologia',
    grade: '10.ª Classe',
    gradeNumber: 10,
    cycle: '10-12',
    totalPages: 168,
    priceMt: 17,
    topics: [
      {
        unitLabel: 'Bioenergética',
        title: 'Fotossíntese e Fase Fotoquímica',
        pageNumber: 84,
        pageEnd: 91,
        readingMinutes: 5,
        summaryHalfParagraph:
          'As plantas convertem luz solar, água e CO₂ em glicose e oxigénio nos cloroplastos. O processo divide-se em fase fotoquímica nos tilacoides e ciclo de Calvin no estroma.',
        keyTakeaways: [
          'Equação global: 6 CO₂ + 6 H₂O + Luz → C₆H₁₂O₆ + 6 O₂.',
          'A fase fotoquímica decorre nos tilacoides e liberta O₂ a partir da fotólise da água.',
          'O ciclo de Calvin fixa CO₂ no estroma usando ATP e NADPH para formar glicose.',
          'Luz, CO₂ e temperatura atuam como fatores limitantes da taxa fotossintética.',
        ],
        keywords: [
          'fotossíntese',
          'cloroplastos',
          'clorofila',
          'tilacoides',
          'ciclo de calvin',
          'glicose',
          'fase clara',
          'estroma',
        ],
        previewParagraphs: [
          'A fotossíntese é o processo bioquímico fundamental que sustenta quase toda a vida na Terra. Realizada por organismos autotróficos como as plantas terrestres, as algas e as cianobactérias, consiste na captação de energia luminosa do Sol para transformar água (H₂O) e dióxido de carbono (CO₂) em glicose (C₆H₁₂O₆), libertando oxigénio (O₂) para a atmosfera.',
          'Nas células vegetais, este fenómeno ocorre no interior dos cloroplastos. A clorofila, pigmento verde localizado nas membranas dos tilacoides, absorve preferencialmente radiações azuis e vermelhas, iniciando a cadeia de reações da chamada fase fotoquímica ou fase dependente da luz.',
        ],
        paragraphs: [
          'A fotossíntese é o processo bioquímico fundamental que sustenta quase toda a vida na Terra. Realizada por organismos autotróficos como as plantas terrestres, as algas e as cianobactérias, consiste na captação de energia luminosa do Sol para transformar água (H₂O) e dióxido de carbono (CO₂) em glicose (C₆H₁₂O₆), libertando oxigénio (O₂) para a atmosfera.',
          'Nas células vegetais, este fenómeno ocorre no interior dos cloroplastos. A clorofila, pigmento verde localizado nas membranas dos tilacoides, absorve preferencialmente radiações azuis e vermelhas, iniciando a cadeia de reações da chamada fase fotoquímica ou fase dependente da luz.',
          'Durante a fase fotoquímica, a energia luminosa excita eletrões das moléculas de clorofila nos fotossistemas II e I. Simultaneamente ocorre a fotólise da água, isto é, a quebra de moléculas de H₂O em protões (H⁺), eletrões e oxigénio molecular (O₂), que se difunde para fora da folha através dos estomas. A passagem dos eletrões pela cadeia transportadora permite sintetizar ATP (fotofosforilação) e reduzir NADP⁺ em NADPH.',
          'A segunda etapa designa-se fase química ou ciclo de Calvin e decorre no estroma do cloroplasto. Embora não dependa da incidência imediata de luz, utiliza obrigatoriamente o ATP e o NADPH produzidos antes. A enzima RuBisCO catalisa a fixação do CO₂ atmosférico numa molécula de cinco carbonos (RuBP), originando trioses-fosfato precursoras da glicose e do amido.',
          'A velocidade da fotossíntese depende de três fatores ambientais principais: intensidade luminosa, concentração de CO₂ e temperatura. Ao aumentar a luz, a taxa cresce até atingir o ponto de saturação luminosa, a partir do qual outro fator passa a limitar o processo.',
          'Nota importante para exame: o oxigénio libertado na fotossíntese provém exclusivamente da fotólise da água e não do CO₂. Em climas quentes como o de Moçambique, culturas como milho e cana-de-açúcar usam a via C4 para conservar água nos estomas mantendo elevada produtividade.',
        ],
        pages: [
          {
            pageNumber: 84,
            paragraphs: [
              'A fotossíntese é o processo bioquímico fundamental que sustenta quase toda a vida na Terra. Realizada por organismos autotróficos como as plantas terrestres, as algas e as cianobactérias, consiste na captação de energia luminosa do Sol para transformar água (H₂O) e dióxido de carbono (CO₂) em glicose (C₆H₁₂O₆), libertando oxigénio (O₂) para a atmosfera.',
              'Nas células vegetais, este fenómeno ocorre no interior dos cloroplastos. A clorofila, pigmento verde localizado nas membranas dos tilacoides, absorve preferencialmente radiações azuis e vermelhas, iniciando a cadeia de reações da chamada fase fotoquímica ou fase dependente da luz.',
            ],
          },
          {
            pageNumber: 85,
            paragraphs: [
              'Durante a fase fotoquímica, a energia luminosa excita eletrões das moléculas de clorofila nos fotossistemas II e I. Simultaneamente ocorre a fotólise da água, isto é, a quebra de moléculas de H₂O em protões (H⁺), eletrões e oxigénio molecular (O₂), que se difunde para fora da folha através dos estomas. A passagem dos eletrões pela cadeia transportadora permite sintetizar ATP (fotofosforilação) e reduzir NADP⁺ em NADPH.',
              'A segunda etapa designa-se fase química ou ciclo de Calvin e decorre no estroma do cloroplasto. Embora não dependa da incidência imediata de luz, utiliza obrigatoriamente o ATP e o NADPH produzidos antes. A enzima RuBisCO catalisa a fixação do CO₂ atmosférico numa molécula de cinco carbonos (RuBP), originando trioses-fosfato precursoras da glicose e do amido.',
            ],
          },
          {
            pageNumber: 86,
            paragraphs: [
              'A velocidade da fotossíntese depende de três fatores ambientais principais: intensidade luminosa, concentração de CO₂ e temperatura. Ao aumentar a luz, a taxa cresce até atingir o ponto de saturação luminosa, a partir do qual outro fator passa a limitar o processo.',
              'Nota importante para exame: o oxigénio libertado na fotossíntese provém exclusivamente da fotólise da água e não do CO₂. Em climas quentes como o de Moçambique, culturas como milho e cana-de-açúcar usam a via C4 para conservar água nos estomas mantendo elevada produtividade.',
            ],
          },
        ],
      },
      {
        unitLabel: 'Bioenergética',
        title: 'Respiração Celular Aeróbia e Mitocôndrias',
        pageNumber: 96,
        pageEnd: 103,
        readingMinutes: 4,
        summaryHalfParagraph:
          'Degradação completa da glicose na presença de oxigénio através da glicólise, ciclo de Krebs e cadeia respiratória, produzindo elevado rendimento de ATP nas mitocôndrias.',
        keyTakeaways: [
          'A glicólise decorre no citoplasma sem oxigénio e rende 2 piruvatos e 2 ATP líquidos.',
          'O ciclo de Krebs realiza-se na matriz mitocondrial libertando CO₂, NADH e FADH₂.',
          'A fosforilação oxidativa nas cristas mitocondriais gera a maior parte do ATP.',
        ],
        keywords: ['respiração celular', 'mitocôndria', 'atp', 'glicólise', 'ciclo de krebs', 'aeróbia'],
        previewParagraphs: [
          'A respiração celular aeróbia é o principal mecanismo pelo qual as células eucarióticas extraem energia química armazenada na glicose. Ao contrário da fermentação, exige oxigénio como recetor final de eletrões para oxidar completamente o substrato.',
          'O processo organiza-se em três fases sequenciais: glicólise no hialoplasma, ciclo de Krebs na matriz mitocondrial e fosforilação oxidativa nas cristas da mitocôndria.',
        ],
        paragraphs: [
          'A respiração celular aeróbia é o principal mecanismo pelo qual as células eucarióticas extraem energia química armazenada na glicose. Ao contrário da fermentação, exige oxigénio como recetor final de eletrões para oxidar completamente o substrato.',
          'O processo organiza-se em três fases sequenciais: glicólise no hialoplasma, ciclo de Krebs na matriz mitocondrial e fosforilação oxidativa nas cristas da mitocôndria.',
          'Na glicólise, uma molécula de glicose (6 carbonos) divide-se em duas moléculas de piruvato (3 carbonos), com saldo direto de 2 ATP e 2 NADH. Com oxigénio disponível, o piruvato entra na mitocôndria e converte-se em acetil-CoA.',
          'No ciclo de Krebs, o grupo acetilo liga-se ao oxaloacetato formando citrato, libertando CO₂ e carregando coenzimas transportadoras de eletrões (NADH e FADH₂).',
          'Na cadeia respiratória, o fluxo de eletrões cria um gradiente de protões que aciona a enzima ATP-sintase, originando entre 30 e 32 moléculas de ATP por glicose degradada e água como produto final.',
        ],
      },
    ],
  },
  {
    slug: 'sne-mat-9',
    subject: 'Matemática',
    grade: '9.ª Classe',
    gradeNumber: 9,
    cycle: '7-9',
    totalPages: 194,
    priceMt: 17,
    topics: [
      {
        unitLabel: 'Álgebra',
        title: 'Equações do 2.º Grau e Fórmula Resolvente',
        pageNumber: 112,
        pageEnd: 121,
        readingMinutes: 5,
        summaryHalfParagraph:
          'Resolução de equações ax² + bx + c = 0 através do discriminante Δ = b² - 4ac e da fórmula resolvente, incluindo análise do número de raízes reais e casos incompletos.',
        keyTakeaways: [
          'Forma canónica: ax² + bx + c = 0, com a ≠ 0.',
          'Discriminante Δ = b² - 4ac indica quantas raízes reais existem.',
          'Fórmula resolvente: x = (-b ± √Δ) / (2a).',
          'Relações de Viète: soma das raízes = -b/a e produto = c/a.',
        ],
        keywords: [
          'equações do 2.º grau',
          'equação quadrática',
          'delta',
          'discriminante',
          'fórmula resolvente',
          'bhaskara',
          'raízes',
          'álgebra',
        ],
        previewParagraphs: [
          'Chama-se equação do 2.º grau a uma incógnita x toda a equação redutível à forma canónica ax² + bx + c = 0, onde a, b e c são coeficientes reais com a ≠ 0. Quando todos os coeficientes são não nulos, a equação diz-se completa; se b = 0 ou c = 0, diz-se incompleta.',
          'Para resolver qualquer equação completa do 2.º grau, calcula-se primeiro o discriminante Delta: Δ = b² - 4ac. O sinal de Δ indica de imediato quantas soluções reais a equação admite antes de finalizar o cálculo.',
        ],
        paragraphs: [
          'Chama-se equação do 2.º grau a uma incógnita x toda a equação redutível à forma canónica ax² + bx + c = 0, onde a, b e c são coeficientes reais com a ≠ 0. Quando todos os coeficientes são não nulos, a equação diz-se completa; se b = 0 ou c = 0, diz-se incompleta.',
          'Para resolver qualquer equação completa do 2.º grau, calcula-se primeiro o discriminante Delta: Δ = b² - 4ac. O sinal de Δ indica de imediato quantas soluções reais a equação admite antes de finalizar o cálculo.',
          'Análise do discriminante: se Δ > 0 existem duas raízes reais distintas; se Δ = 0 existe uma raiz real dupla x = -b / (2a); se Δ < 0 não existem raízes reais e o conjunto-solução é vazio (S = ∅).',
          'Exemplo resolvido: resolver x² - 5x + 6 = 0. Identificamos a = 1, b = -5 e c = 6. Calculamos Δ = (-5)² - 4(1)(6) = 25 - 24 = 1. Aplicando x = (5 ± √1) / 2 obtemos x₁ = 3 e x₂ = 2. Logo, S = {2, 3}.',
          'Nas equações incompletas, o caminho é direto: se c = 0 (ex.: 2x² - 8x = 0), evidencia-se x(2x - 8) = 0, obtendo x = 0 ou x = 4. Se b = 0 (ex.: x² - 9 = 0), isola-se x² = 9 e extrai-se x = ±3.',
          'Verificação rápida pela Soma e Produto: x₁ + x₂ = -b/a e x₁ · x₂ = c/a. No exemplo, 2 + 3 = 5 e 2 × 3 = 6, confirmando a exatidão.',
        ],
      },
      {
        unitLabel: 'Geometria',
        title: 'Teorema de Pitágoras e Triângulos Retângulos',
        pageNumber: 74,
        pageEnd: 81,
        readingMinutes: 4,
        summaryHalfParagraph:
          'Num triângulo retângulo, o quadrado da hipotenusa iguala a soma dos quadrados dos catetos (h² = a² + b²), permitindo calcular lados desconhecidos e distâncias reais.',
        keyTakeaways: [
          'A hipotenusa é o lado oposto ao ângulo de 90° e o maior lado.',
          'Relação fundamental: h² = a² + b².',
          'Ternos pitagóricos úteis: (3, 4, 5) e (5, 12, 13).',
        ],
        keywords: ['pitágoras', 'hipotenusa', 'catetos', 'triângulo retângulo', 'geometria'],
        previewParagraphs: [
          'Em todo o triângulo retângulo, o lado oposto ao ângulo reto designa-se hipotenusa e os dois lados que formam o ângulo de 90° designam-se catetos. O Teorema de Pitágoras estabelece que a área do quadrado sobre a hipotenusa iguala a soma das áreas dos quadrados sobre os catetos.',
          'Algebricamente escreve-se h² = a² + b². Conhecendo quaisquer dois lados de um triângulo retângulo, determina-se com exatidão o terceiro lado.',
        ],
        paragraphs: [
          'Em todo o triângulo retângulo, o lado oposto ao ângulo reto designa-se hipotenusa e os dois lados que formam o ângulo de 90° designam-se catetos. O Teorema de Pitágoras estabelece que a área do quadrado sobre a hipotenusa iguala a soma das áreas dos quadrados sobre os catetos.',
          'Algebricamente escreve-se h² = a² + b². Conhecendo quaisquer dois lados de um triângulo retângulo, determina-se com exatidão o terceiro lado.',
          'Exemplo prático: uma escada de 5 m encosta numa parede vertical com a base afastada 3 m. Pela fórmula: 5² = 3² + h² ⇒ 25 = 9 + h² ⇒ h² = 16 ⇒ h = 4 metros de altura.',
          'O recíproco do teorema confirma ângulos retos na prática: se três medidas satisfazem c² = a² + b², então o ângulo oposto ao lado c mede exatamente 90°.',
        ],
      },
    ],
  },
  {
    slug: 'sne-his-10',
    subject: 'História',
    grade: '10.ª Classe',
    gradeNumber: 10,
    cycle: '10-12',
    totalPages: 152,
    priceMt: 17,
    topics: [
      {
        unitLabel: 'Moçambique Contemporâneo',
        title: 'Luta de Libertação e Independência de Moçambique',
        pageNumber: 67,
        pageEnd: 76,
        readingMinutes: 5,
        summaryHalfParagraph:
          'Da fundação da FRELIMO (1962) e início da luta armada em Chai (1964) aos Acordos de Lusaka e proclamação da Independência Nacional a 25 de Junho de 1975.',
        keyTakeaways: [
          '25 de Junho de 1962: fundação da FRELIMO em Dar-es-Salaam sob Eduardo Mondlane.',
          '25 de Setembro de 1964: início da Luta Armada em Chai, Cabo Delgado.',
          '7 de Setembro de 1974: assinatura dos Acordos de Lusaka.',
          '25 de Junho de 1975: proclamação oficial da Independência por Samora Machel.',
        ],
        keywords: [
          'independência de moçambique',
          'frelimo',
          'eduardo mondlane',
          'samora machel',
          'acordos de lusaka',
          '25 de junho',
          '1975',
          'chai',
        ],
        previewParagraphs: [
          'O caminho para a soberania nacional de Moçambique consolidou-se com a unificação dos movimentos UDENAMO, MANU e UNAMI na Frente de Libertação de Moçambique (FRELIMO), fundada a 25 de Junho de 1962 em Dar-es-Salaam sob liderança de Eduardo Chivambo Mondlane.',
          'Perante a recusa colonial em negociar a autodeterminação pacífica, iniciou-se a Luta Armada de Libertação Nacional a 25 de Setembro de 1964, com o ataque ao posto de Chai em Cabo Delgado, expandindo as zonas libertadas no norte do país.',
        ],
        paragraphs: [
          'O caminho para a soberania nacional de Moçambique consolidou-se com a unificação dos movimentos UDENAMO, MANU e UNAMI na Frente de Libertação de Moçambique (FRELIMO), fundada a 25 de Junho de 1962 em Dar-es-Salaam sob liderança de Eduardo Chivambo Mondlane.',
          'Perante a recusa colonial em negociar a autodeterminação pacífica, iniciou-se a Luta Armada de Libertação Nacional a 25 de Setembro de 1964, com o ataque ao posto de Chai em Cabo Delgado, expandindo as zonas libertadas no norte do país.',
          'Nas zonas libertadas organizaram-se escolas comunitárias, postos de saúde e cooperativas agrícolas. Após o assassinato de Eduardo Mondlane a 3 de Fevereiro de 1969, Samora Moisés Machel assumiu a liderança e estendeu as frentes de combate a sul do rio Zambeze.',
          'O desgaste das guerras coloniais precipitou o 25 de Abril de 1974 em Portugal, abrindo caminho aos Acordos de Lusaka (7 de Setembro de 1974), que estabeleceram o cessar-fogo e o Governo de Transição chefiado por Joaquim Chissano.',
          'À meia-noite de 25 de Junho de 1975, no Estádio da Machava em Maputo, Samora Machel proclamou a Independência Total e Completa de Moçambique, marcando o nascimento do Estado soberano moçambicano.',
        ],
      },
    ],
  },
  {
    slug: 'sne-por-6',
    subject: 'Português',
    grade: '6.ª Classe',
    gradeNumber: 6,
    cycle: '1-6',
    totalPages: 128,
    priceMt: 17,
    topics: [
      {
        unitLabel: 'Funcionamento da Língua',
        title: 'Classes de Palavras: Nomes, Adjetivos e Verbos',
        pageNumber: 45,
        pageEnd: 52,
        readingMinutes: 4,
        summaryHalfParagraph:
          'Identificação prática das três classes variáveis essenciais da frase: nomes próprios e comuns, concordância dos adjetivos e conjugações verbais.',
        keyTakeaways: [
          'Nomes designam seres, lugares, objetos e sentimentos (próprios ou comuns).',
          'Adjetivos caracterizam o nome e concordam sempre em género e número.',
          'Verbos exprimem ações, estados ou fenómenos da natureza (-ar, -er, -ir).',
        ],
        keywords: [
          'classes de palavras',
          'nomes',
          'substantivos',
          'adjetivos',
          'verbos',
          'gramática',
          'português',
        ],
        previewParagraphs: [
          'As palavras que usamos para falar e escrever organizam-se em classes de palavras conforme a função que desempenham na frase. Dominar nomes, adjetivos e verbos garante frases claras e concordância correta.',
          'O nome (ou substantivo) identifica pessoas, animais, lugares, objetos e sentimentos. Pode ser próprio, escrito com maiúscula (ex.: Inhambane, Amina), ou comum, designando todos os seres da mesma espécie (ex.: escola, rio).',
        ],
        paragraphs: [
          'As palavras que usamos para falar e escrever organizam-se em classes de palavras conforme a função que desempenham na frase. Dominar nomes, adjetivos e verbos garante frases claras e concordância correta.',
          'O nome (ou substantivo) identifica pessoas, animais, lugares, objetos e sentimentos. Pode ser próprio, escrito com maiúscula (ex.: Inhambane, Amina), ou comum, designando todos os seres da mesma espécie (ex.: escola, rio).',
          'O adjetivo acompanha o nome para atribuir uma qualidade ou estado. Na frase "A estudante dedicada leu o caderno novo", "dedicada" e "novo" são adjetivos que concordam em género e número com os nomes respetivos.',
          'O verbo constitui o núcleo da frase verbal, indicando ação (estudar, escrever), estado (ser, estar) ou fenómeno natural (chover). Agrupa-se em três conjugações: 1.ª (-ar), 2.ª (-er) e 3.ª (-ir).',
          'Exercício resolvido: em "O vento fresco agitava as folhas verdes", "vento" e "folhas" são nomes comuns, "fresco" e "verdes" são adjetivos e "agitava" é verbo da 1.ª conjugação.',
        ],
      },
    ],
  },
  {
    slug: 'sne-fis-11',
    subject: 'Física',
    grade: '11.ª Classe',
    gradeNumber: 11,
    cycle: '10-12',
    totalPages: 180,
    priceMt: 17,
    topics: [
      {
        unitLabel: 'Mecânica',
        title: 'Cinemática: Movimento Retilíneo Uniformemente Variado (MRUV)',
        pageNumber: 38,
        pageEnd: 47,
        readingMinutes: 5,
        summaryHalfParagraph:
          'Estudo do movimento em linha reta com aceleração constante: equações horárias da velocidade e posição, equação de Torricelli e leitura de gráficos v(t).',
        keyTakeaways: [
          'Aceleração escalar constante: a = (v - v₀) / Δt (unidade SI: m/s²).',
          'Velocidade: v = v₀ + a·t e posição: x = x₀ + v₀·t + ½·a·t².',
          'Equação de Torricelli (sem tempo): v² = v₀² + 2·a·Δx.',
        ],
        keywords: [
          'cinemática',
          'mruv',
          'aceleração',
          'velocidade',
          'torricelli',
          'movimento retilíneo',
          'física',
        ],
        previewParagraphs: [
          'A Cinemática descreve o movimento dos corpos sem analisar as forças que o provocam. Quando um móvel segue trajetória retilínea com variações iguais de velocidade em intervalos iguais de tempo, realiza um Movimento Retilíneo Uniformemente Variado (MRUV).',
          'A grandeza central deste movimento é a aceleração escalar constante (a), definida pela razão a = Δv / Δt e medida em m/s² no Sistema Internacional.',
        ],
        paragraphs: [
          'A Cinemática descreve o movimento dos corpos sem analisar as forças que o provocam. Quando um móvel segue trajetória retilínea com variações iguais de velocidade em intervalos iguais de tempo, realiza um Movimento Retilíneo Uniformemente Variado (MRUV).',
          'A grandeza central deste movimento é a aceleração escalar constante (a), definida pela razão a = Δv / Δt e medida em m/s² no Sistema Internacional.',
          'Quando velocidade e aceleração têm o mesmo sinal, o movimento é acelerado; quando têm sinais opostos, como numa travagem, o movimento é retardado.',
          'Equações fundamentais do MRUV: v(t) = v₀ + a·t; x(t) = x₀ + v₀·t + ½·a·t²; e equação de Torricelli v² = v₀² + 2·a·Δx para problemas sem informação de tempo.',
          'Exemplo resolvido: um autocarro parte do repouso (v₀ = 0) com a = 2 m/s² durante 6 s. Atinge v = 12 m/s e percorre Δx = ½ × 2 × 6² = 36 metros, valor equivalente à área sob o gráfico v(t).',
        ],
      },
    ],
  },
  {
    slug: 'sne-cn-5',
    subject: 'Ciências Naturais',
    grade: '5.ª Classe',
    gradeNumber: 5,
    cycle: '1-6',
    totalPages: 96,
    priceMt: 17,
    topics: [
      {
        unitLabel: 'A Água e a Natureza',
        title: 'O Ciclo da Água na Natureza',
        pageNumber: 31,
        pageEnd: 36,
        readingMinutes: 3,
        summaryHalfParagraph:
          'Circulação contínua da água entre rios, oceanos, nuvens e solo através da evaporação, condensação, precipitação e infiltração impulsionadas pelo calor do Sol.',
        keyTakeaways: [
          'Evaporação: o calor solar transforma água líquida em vapor.',
          'Condensação: o vapor arrefece em altitude formando nuvens.',
          'Precipitação e infiltração devolvem água aos rios e lençóis subterrâneos.',
        ],
        keywords: ['ciclo da água', 'evaporação', 'condensação', 'precipitação', 'nuvens', 'chuva'],
        previewParagraphs: [
          'A água na Terra circula continuamente entre o estado líquido e o estado gasoso. A este percurso permanente entre a superfície terrestre e a atmosfera dá-se o nome de ciclo da água ou ciclo hidrológico.',
          'O motor deste ciclo é a energia solar. Ao aquecer oceanos, solos húmidos e rios como o Zambeze e o Limpopo, o calor provoca a evaporação, fazendo subir vapor de água para a atmosfera.',
        ],
        paragraphs: [
          'A água na Terra circula continuamente entre o estado líquido e o estado gasoso. A este percurso permanente entre a superfície terrestre e a atmosfera dá-se o nome de ciclo da água ou ciclo hidrológico.',
          'O motor deste ciclo é a energia solar. Ao aquecer oceanos, solos húmidos e rios como o Zambeze e o Limpopo, o calor provoca a evaporação, fazendo subir vapor de água para a atmosfera.',
          'Ao subir para camadas mais frias da atmosfera, o vapor arrefece e forma minúsculas gotículas líquidas num processo chamado condensação, originando as nuvens.',
          'Quando as gotículas ficam pesadas, caem sob a forma de chuva (precipitação). Parte escorre pelos rios de volta ao mar e outra parte infiltra-se no solo, alimentando poços e nascentes.',
        ],
      },
    ],
  },
];
