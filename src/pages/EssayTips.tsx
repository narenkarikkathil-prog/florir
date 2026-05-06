import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, PenLine } from 'lucide-react';
import { cn } from '@/src/lib/utils';

// ─── Content ───

const FRENCH_TIPS = {
  intro: {
    title: 'Writing a Strong Introduction',
    content: [
      {
        heading: 'Hook the Reader First',
        body: 'Don\'t open with a dictionary definition — that\'s the fastest way to lose points. Instead, open with a surprising fact, a rhetorical question, or a bold claim. Example: "Alors que le monde se numérise à toute vitesse, la question de la vie privée ne fait que gagner en urgence."',
      },
      {
        heading: 'State Your Thesis Clearly',
        body: 'Your thesis should appear in the last 1–2 sentences of your intro. Be direct. In AP French essays, vagueness is penalized. Use verbs like "soutenir," "affirmer," "démontrer" to signal your argument: "Dans cet essai, je soutiendrai que..."',
      },
      {
        heading: 'Mention Your Sources',
        body: 'If the prompt provides sources, briefly acknowledge them in the intro: "Comme le montrent les documents fournis..." This signals to the grader that you\'re engaging with the material.',
      },
      {
        heading: 'Sample Opening Sentences',
        body: '• "Depuis des décennies, le débat autour de [sujet] divise les opinions..." \n• "Face aux défis du XXIe siècle, il est essentiel de s\'interroger sur..."\n• "Nombreux sont ceux qui pensent que [idée], mais la réalité est bien plus nuancée."',
      },
    ],
  },
  conclusion: {
    title: 'Crafting Your Conclusion',
    content: [
      {
        heading: 'Never Just Repeat the Intro',
        body: 'A conclusion should feel like an arrival, not a copy-paste. Restate your thesis using different words and acknowledge the broader stakes of the argument. Think: "So what? Why does this matter?"',
      },
      {
        heading: 'Widen the Lens',
        body: 'End by zooming out to a bigger picture — society, history, or the future. Example: "À l\'avenir, il sera crucial que les gouvernements et les citoyens trouvent ensemble un équilibre entre liberté individuelle et bien commun."',
      },
      {
        heading: 'Useful Conclusion Starters',
        body: '• "En définitive, il est clair que..."\n• "Pour conclure, bien que [concession], il reste indéniable que..."\n• "Au fond, cette question nous amène à réfléchir sur..."\n• "En somme, les arguments présentés témoignent de..."',
      },
      {
        heading: 'Concede Before You Close',
        body: 'A brief concession just before your final statement shows intellectual maturity. "Certes, certains pourraient objecter que... Néanmoins, cela ne remet pas en cause le fait que..."',
      },
    ],
  },
  transitions: {
    title: 'Transition Words & Connectors',
    content: [
      {
        heading: 'Adding Ideas',
        body: 'De plus · Par ailleurs · En outre · Qui plus est · Ajoutons que · Non seulement... mais aussi · Il convient également de noter que',
      },
      {
        heading: 'Contrasting & Conceding',
        body: 'Cependant · Néanmoins · Pourtant · En revanche · Toutefois · Bien que (+ subjonctif) · Quoique (+ subjonctif) · Or · Certes... mais · Malgré cela',
      },
      {
        heading: 'Giving Examples',
        body: 'Par exemple · Prenons le cas de · À titre d\'illustration · Comme en témoigne · Selon les sources · Il suffit de constater que · C\'est notamment le cas de',
      },
      {
        heading: 'Concluding an Idea',
        body: 'Ainsi · Donc · C\'est pourquoi · Il en résulte que · Dès lors · Par conséquent · En conséquence · Voilà pourquoi',
      },
      {
        heading: 'Structuring Your Argument',
        body: 'D\'abord / Tout d\'abord · Ensuite · Puis · En second lieu · Enfin · Pour commencer · Passons maintenant à · En ce qui concerne · Quant à',
      },
    ],
  },
  vocab: {
    title: 'Theme Vocabulary by Topic',
    content: [
      {
        heading: '🌍 L\'environnement',
        body: 'le réchauffement climatique · les énergies renouvelables · l\'empreinte carbone · la durabilité · la déforestation · le développement durable · les gaz à effet de serre · la biodiversité · la conscience écologique · l\'agriculture biologique',
      },
      {
        heading: '🏫 L\'éducation',
        body: 'le système éducatif · l\'apprentissage · la réussite scolaire · l\'enseignement supérieur · le programme · les inégalités scolaires · la formation professionnelle · le numérique éducatif · le baccalauréat · l\'autonomie des élèves',
      },
      {
        heading: '💻 La technologie',
        body: 'l\'intelligence artificielle · la vie privée · les réseaux sociaux · la cybersécurité · l\'ère numérique · la désinformation · la dépendance technologique · l\'algorithme · le droit à l\'oubli · la transformation numérique',
      },
      {
        heading: '👨‍👩‍👧 La famille et la société',
        body: 'les valeurs familiales · la structure familiale · les générations · la solidarité · l\'individualisme · le rôle des parents · les changements sociaux · la cellule familiale · l\'intégration · la cohésion sociale',
      },
      {
        heading: '🎭 Les arts et la culture',
        body: 'le patrimoine culturel · l\'identité culturelle · la diversité culturelle · l\'expression artistique · la liberté d\'expression · l\'art contemporain · la francophonie · le rayonnement culturel · le mécénat · la créativité',
      },
    ],
  },
};

const SPANISH_TIPS = {
  intro: {
    title: 'Cómo Escribir una Introducción Sólida',
    content: [
      {
        heading: 'Empieza con un Gancho',
        body: 'Evita empezar con "Según el diccionario..." — es la manera más rápida de perder puntos. En cambio, abre con una pregunta retórica, un dato sorprendente o una afirmación audaz. Ejemplo: "En un mundo donde la tecnología avanza más rápido que las leyes que la regulan, proteger la privacidad se ha convertido en una batalla cotidiana."',
      },
      {
        heading: 'Tesis Clara y Directa',
        body: 'Tu tesis debe aparecer al final del párrafo introductorio. Usa verbos como "sostener," "argumentar," "demostrar" para señalar tu posición: "En este ensayo, argumentaré que..." Evita la vaguedad — el AP premia la claridad.',
      },
      {
        heading: 'Menciona las Fuentes',
        body: 'Si el examen te da fuentes, refiérete a ellas brevemente: "Como demuestran los documentos proporcionados..." Esto muestra que estás integrando evidencia desde el principio.',
      },
      {
        heading: 'Frases de Apertura Útiles',
        body: '• "Desde hace décadas, el debate sobre [tema] divide a la sociedad..."\n• "Frente a los desafíos del siglo XXI, es fundamental preguntarse..."\n• "Aunque muchos creen que [idea], la realidad es mucho más compleja."',
      },
    ],
  },
  conclusion: {
    title: 'Cómo Cerrar con Fuerza',
    content: [
      {
        heading: 'No Repitas la Introducción',
        body: 'La conclusión debe sentirse como una llegada, no un eco. Reformula tu tesis con palabras diferentes y reflexiona sobre las implicaciones más amplias de tu argumento.',
      },
      {
        heading: 'Amplía la Perspectiva',
        body: 'Termina mirando al futuro o a la sociedad en general. Ejemplo: "En adelante, será crucial que gobiernos y ciudadanos trabajen juntos para garantizar un equilibrio entre progreso y bienestar."',
      },
      {
        heading: 'Frases para Concluir',
        body: '• "En definitiva, queda claro que..."\n• "Para concluir, aunque [concesión], es innegable que..."\n• "En suma, los argumentos presentados demuestran que..."\n• "En última instancia, esta cuestión nos invita a reflexionar sobre..."',
      },
      {
        heading: 'Haz una Concesión Final',
        body: 'Una breve concesión antes de cerrar demuestra madurez intelectual: "Si bien es cierto que algunos podrían objetar que... no obstante, esto no invalida el hecho de que..."',
      },
    ],
  },
  transitions: {
    title: 'Palabras de Transición y Conectores',
    content: [
      {
        heading: 'Añadir Ideas',
        body: 'Además · Por otro lado · Asimismo · Igualmente · También · No solo... sino también · Cabe destacar que · Es importante señalar que',
      },
      {
        heading: 'Contrastar y Conceder',
        body: 'Sin embargo · No obstante · A pesar de ello · Aunque · Si bien · Por el contrario · En cambio · Pero · Aun así · Con todo',
      },
      {
        heading: 'Dar Ejemplos',
        body: 'Por ejemplo · A modo de ilustración · Como muestra · Según las fuentes · Tal como lo demuestra · Es el caso de · Basta con observar que',
      },
      {
        heading: 'Concluir una Idea',
        body: 'Por lo tanto · Así pues · En consecuencia · Por consiguiente · De ahí que · Es por ello que · De este modo · Lo que demuestra que',
      },
      {
        heading: 'Estructurar el Argumento',
        body: 'En primer lugar · En segundo lugar · Por último · Finalmente · Para empezar · Pasando ahora a · En cuanto a · Con respecto a · En lo que se refiere a',
      },
    ],
  },
  vocab: {
    title: 'Vocabulario Temático por Categoría',
    content: [
      {
        heading: '🌍 El medio ambiente',
        body: 'el calentamiento global · las energías renovables · la huella de carbono · la sostenibilidad · la deforestación · el desarrollo sostenible · los gases de efecto invernadero · la biodiversidad · la conciencia ecológica · la agricultura orgánica',
      },
      {
        heading: '🏫 La educación',
        body: 'el sistema educativo · el aprendizaje · el éxito escolar · la educación superior · el currículo · las desigualdades educativas · la formación profesional · la tecnología educativa · la autonomía estudiantil · el rendimiento académico',
      },
      {
        heading: '💻 La tecnología',
        body: 'la inteligencia artificial · la privacidad · las redes sociales · la ciberseguridad · la era digital · la desinformación · la dependencia tecnológica · el algoritmo · la brecha digital · la transformación digital',
      },
      {
        heading: '👨‍👩‍👧 La familia y la sociedad',
        body: 'los valores familiares · la estructura familiar · las generaciones · la solidaridad · el individualismo · el rol de los padres · los cambios sociales · la integración · la cohesión social · el núcleo familiar',
      },
      {
        heading: '🎭 Las artes y la cultura',
        body: 'el patrimonio cultural · la identidad cultural · la diversidad cultural · la expresión artística · la libertad de expresión · el arte contemporáneo · la herencia hispana · la creatividad · el mecenazgo · la influencia cultural',
      },
    ],
  },
};

type LangTab = 'french' | 'spanish';
type TipTab = 'intro' | 'conclusion' | 'transitions' | 'vocab';

const TIP_TABS: { id: TipTab; label: string }[] = [
  { id: 'intro', label: 'Introduction' },
  { id: 'conclusion', label: 'Conclusion' },
  { id: 'transitions', label: 'Transitions' },
  { id: 'vocab', label: 'Theme Vocab' },
];

export default function EssayTips() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initLang = searchParams.get('lang') === 'Spanish' ? 'spanish' : 'french';
  const [langTab, setLangTab] = useState<LangTab>(initLang);
  const [tipTab, setTipTab] = useState<TipTab>('intro');

  const tips = langTab === 'french' ? FRENCH_TIPS : SPANISH_TIPS;
  const section = tips[tipTab];

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/dashboard')} className="p-2 rounded-full hover:bg-beige transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <PenLine size={20} />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold">AP Essay Writing Tips</h1>
              <p className="text-xs text-dark/40">Strategies for the AP Exam</p>
            </div>
          </div>
        </div>

        {/* Language tabs */}
        <div className="flex gap-2 mb-6">
          {(['french', 'spanish'] as LangTab[]).map(l => (
            <button
              key={l}
              onClick={() => setLangTab(l)}
              className={cn(
                "px-6 py-2.5 rounded-full font-bold text-sm transition-all",
                langTab === l ? "bg-gold text-cream shadow-md shadow-gold/20" : "bg-white border border-beige-mid/20 text-dark/60 hover:border-gold/40"
              )}
            >
              {l === 'french' ? '🇫🇷 AP French' : '🇪🇸 AP Spanish'}
            </button>
          ))}
        </div>

        {/* Tip sub-tabs */}
        <div className="flex gap-1 mb-8 bg-white border border-beige-mid/20 rounded-2xl p-1.5 overflow-x-auto">
          {TIP_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTipTab(t.id)}
              className={cn(
                "flex-1 min-w-max px-4 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap",
                tipTab === t.id ? "bg-gold text-cream shadow-sm" : "text-dark/50 hover:text-dark/70"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${langTab}-${tipTab}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-serif font-bold mb-6">{section.title}</h2>

            {section.content.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-white rounded-3xl border border-beige-mid/20 p-6 shadow-sm"
              >
                <h3 className="font-bold text-dark mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gold/15 text-gold text-xs font-black flex items-center justify-center shrink-0">{i + 1}</span>
                  {item.heading}
                </h3>
                <div className="text-dark/65 text-sm leading-relaxed whitespace-pre-line">{item.body}</div>
              </motion.div>
            ))}

            {/* Pro tip callout */}
            {tipTab === 'intro' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: section.content.length * 0.07 }}
                className="bg-gold/10 border border-gold/25 rounded-3xl p-6"
              >
                <p className="text-sm font-bold text-gold mb-1">⚡ Quick AP Tip</p>
                <p className="text-sm text-dark/65 leading-relaxed">
                  {langTab === 'french'
                    ? 'The AP French exam graders look for register consistency. If you start formal, stay formal throughout — never switch between "tu" and "vous."'
                    : 'AP Spanish graders reward register consistency. Pick formal "usted" constructions and stick with them throughout your essay.'}
                </p>
              </motion.div>
            )}

            {tipTab === 'transitions' && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: section.content.length * 0.07 }}
                className="bg-blue-50/60 border border-blue-200/40 rounded-3xl p-6"
              >
                <p className="text-sm font-bold text-blue-600 mb-1">📝 Grader Note</p>
                <p className="text-sm text-dark/65 leading-relaxed">
                  {langTab === 'french'
                    ? 'Using 3+ distinct transition categories (adding, contrasting, concluding) in a single essay is one of the clearest signals of a 5-level writer. Don\'t overload on one type.'
                    : 'Using a variety of connector types signals sophistication. Avoid repeating "además" and "sin embargo" — branch out to "asimismo," "no obstante," and "por consiguiente."'}
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
