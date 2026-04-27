import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Mic, MicOff, Play, CheckCircle2, Clock, ChevronRight, RotateCcw, Star, Volume2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GeminiService } from '@/src/services/gemini';
import { Language } from '@/src/types';
import { supabase } from '@/src/lib/supabase';
import { Modality } from '@google/genai';

// ─── AP Conversation Prompts (20, progressively harder) ─── 

const AP_CONVERSATIONS: {
  id: number;
  title: string;
  difficulty: string;
  intro: string;
  turns: { speaker: 'ai'; text: string }[];
}[] = [
  {
    id: 1, title: "Meeting a New Classmate", difficulty: "Easy",
    intro: "You meet a new student at school during the lunch break. They greet you and want to learn about your life at this school.",
    turns: [
      { speaker: 'ai', text: "Salut ! Je suis nouveau ici, je viens d'arriver de Lyon. Comment tu t'appelles, et tu es dans quelle classe cette année ?" },
      { speaker: 'ai', text: "Enchanté ! Moi, j'ai beaucoup de cours aujourd'hui, c'est fatigant. Tu as quels cours toi aujourd'hui ? Et lequel est ton cours préféré ?" },
      { speaker: 'ai', text: "Ah c'est intéressant ! Moi, j'adore les maths mais le français c'est difficile pour moi. Est-ce que tu aimes le français ? Qu'est-ce que tu apprends en ce moment en cours de français ?" },
      { speaker: 'ai', text: "C'est bien ! Dis-moi, est-ce que les élèves ici font des activités après les cours ? Il y a des clubs ou des sports ? Qu'est-ce que tu me recommandes ?" },
      { speaker: 'ai', text: "Super, merci pour toutes ces infos ! Est-ce qu'on peut déjeuner ensemble un de ces jours ? Tu manges à la cantine ou tu apportes ton repas ? Qu'est-ce qu'on mange ici normalement ?" },
    ],
  },
  {
    id: 2, title: "Ordering at a Café", difficulty: "Easy",
    intro: "You are at a French café with outdoor seating. The friendly server comes to take your order and makes recommendations.",
    turns: [
      { speaker: 'ai', text: "Bonjour et bienvenue au Café de Flore ! C'est votre première visite chez nous ? Asseyez-vous, il fait beau aujourd'hui. Qu'est-ce que je peux vous servir comme boisson ?" },
      { speaker: 'ai', text: "Très bon choix ! Nous avons aussi de délicieuses pâtisseries aujourd'hui, des croissants tout frais du matin et un gâteau au chocolat. Vous voulez quelque chose à manger ?" },
      { speaker: 'ai', text: "Je vous recommande particulièrement notre croque-monsieur, c'est la spécialité de la maison. On le prépare avec du fromage gruyère et du jambon de qualité. Ça vous tente, ou vous préférez autre chose ?" },
      { speaker: 'ai', text: "Excellent ! Et pour le dessert, je peux vous proposer une tarte aux fraises ou une crème brûlée. On a aussi des glaces artisanales. Qu'est-ce qui vous ferait plaisir ?" },
      { speaker: 'ai', text: "Parfait, j'ai tout noté ! Ça fait quatorze euros cinquante pour le tout. Vous payez par carte ou en espèces ? Et je vous apporte l'addition maintenant ou vous voulez rester un peu profiter du soleil ?" },
    ],
  },
  {
    id: 3, title: "Weekend Plans", difficulty: "Easy",
    intro: "A friend calls you on Friday evening to make plans for a fun weekend together. You need to decide on activities, timing, and logistics.",
    turns: [
      { speaker: 'ai', text: "Salut ! C'est enfin le week-end, je suis tellement content ! Tu es libre demain et dimanche ? J'ai plein d'idées pour nous amuser. Qu'est-ce que tu aimerais faire ?" },
      { speaker: 'ai', text: "Génial ! J'ai vu qu'il y a un nouveau film au cinéma, et aussi un marché en plein air au parc du centre-ville avec de la musique. Tu préfères quoi ? On pourrait aussi faire les deux si tu veux !" },
      { speaker: 'ai', text: "Bonne idée ! Pour l'heure, je ne suis pas du matin le week-end, mais je ne veux pas arriver trop tard non plus. À quelle heure est-ce qu'on pourrait se retrouver ? Et tu veux qu'on prenne le bus ou qu'on marche ?" },
      { speaker: 'ai', text: "D'accord, et tu veux qu'on mange quelque part après ? Il y a un bon restaurant italien près du cinéma, ou on pourrait préparer un pique-nique au parc. Qu'est-ce que tu en penses ?" },
      { speaker: 'ai', text: "Parfait, j'ai hâte ! Et dimanche, tu veux faire quelque chose aussi ou tu préfères te reposer ? On pourrait inviter d'autres amis si tu veux. Qu'est-ce que tu proposes ?" },
    ],
  },
  {
    id: 4, title: "At the Doctor's Office", difficulty: "Easy",
    intro: "You visit the doctor because you have been feeling unwell for several days. The doctor asks you detailed questions about your symptoms and daily habits.",
    turns: [
      { speaker: 'ai', text: "Bonjour, asseyez-vous. Alors, dites-moi, qu'est-ce qui ne va pas ? Comment vous sentez-vous aujourd'hui, et depuis quand vous ne vous sentez pas bien exactement ?" },
      { speaker: 'ai', text: "Je vois. Pouvez-vous me décrire vos symptômes plus en détail ? Avez-vous de la fièvre, des maux de tête, ou des douleurs dans le corps ? Est-ce que vous dormez bien la nuit ?" },
      { speaker: 'ai', text: "D'accord. Et qu'est-ce que vous avez fait pour vous soigner jusqu'à maintenant ? Avez-vous pris des médicaments, bu des tisanes, ou essayé des remèdes de grand-mère ?" },
      { speaker: 'ai', text: "Je vais vous prescrire un traitement. Mais d'abord, est-ce que vous êtes allergique à certains médicaments ? Et prenez-vous d'autres médicaments en ce moment pour autre chose ?" },
      { speaker: 'ai', text: "Très bien, tout est noté. Je vous recommande de bien vous reposer, de boire beaucoup d'eau et de manger léger. Revenez me voir dans une semaine si les symptômes ne s'améliorent pas. Avez-vous des questions pour moi ?" },
    ],
  },
  {
    id: 5, title: "Shopping for Clothes", difficulty: "Medium",
    intro: "You are at a clothing store looking for something specific.",
    turns: [
      { speaker: 'ai', text: "Bonjour ! Je peux vous aider à trouver quelque chose ?" },
      { speaker: 'ai', text: "Quelle taille faites-vous ?" },
      { speaker: 'ai', text: "Nous avons plusieurs modèles. Vous préférez quelle couleur ?" },
      { speaker: 'ai', text: "Voilà ! La cabine d'essayage est par là. Ça vous plaît ?" },
      { speaker: 'ai', text: "C'est en solde aujourd'hui, vingt pour cent de réduction. Vous le prenez ?" },
    ],
  },
  {
    id: 6, title: "Birthday Party Planning", difficulty: "Medium",
    intro: "You and a friend are planning a surprise birthday party for another friend.",
    turns: [
      { speaker: 'ai', text: "Tu sais que l'anniversaire de Marie est samedi prochain ? On devrait organiser une fête surprise !" },
      { speaker: 'ai', text: "Bonne idée ! Où est-ce qu'on pourrait la faire, à ton avis ?" },
      { speaker: 'ai', text: "Et pour la nourriture, qu'est-ce qu'on prépare ? Marie adore la cuisine française." },
      { speaker: 'ai', text: "Il faut aussi penser aux décorations. Tu as des idées ?" },
      { speaker: 'ai', text: "Parfait ! Et le cadeau ? Qu'est-ce qu'on pourrait lui offrir ?" },
    ],
  },
  {
    id: 7, title: "Lost in a City", difficulty: "Medium",
    intro: "You are lost in a French city and ask a local for directions.",
    turns: [
      { speaker: 'ai', text: "Vous avez l'air perdu ! Je peux vous aider ?" },
      { speaker: 'ai', text: "Ah, ce n'est pas loin d'ici. Vous êtes à pied ou en voiture ?" },
      { speaker: 'ai', text: "Alors, continuez tout droit pendant deux cents mètres, puis tournez à gauche. Vous voyez la boulangerie là-bas ?" },
      { speaker: 'ai', text: "C'est juste après la boulangerie, en face du parc. Mais attention, la rue est en travaux." },
      { speaker: 'ai', text: "De rien ! Bonne journée, et n'hésitez pas à demander si vous vous perdez encore !" },
    ],
  },
  {
    id: 8, title: "Job Interview", difficulty: "Medium",
    intro: "You are being interviewed for a summer job at a French company.",
    turns: [
      { speaker: 'ai', text: "Bonjour et bienvenue. Asseyez-vous. Alors, parlez-moi un peu de vous." },
      { speaker: 'ai', text: "Intéressant. Pourquoi voulez-vous travailler chez nous cet été ?" },
      { speaker: 'ai', text: "Quelles sont vos qualités principales, d'après vous ?" },
      { speaker: 'ai', text: "Avez-vous déjà eu une expérience professionnelle ?" },
      { speaker: 'ai', text: "Très bien. Avez-vous des questions pour nous ?" },
    ],
  },
  {
    id: 9, title: "Environmental Discussion", difficulty: "Hard",
    intro: "You discuss environmental issues with a classmate for a school project.",
    turns: [
      { speaker: 'ai', text: "Pour notre projet sur l'environnement, quel sujet veux-tu choisir ? Le réchauffement climatique ou la pollution ?" },
      { speaker: 'ai', text: "Bon choix. À ton avis, quelles sont les causes principales de ce problème ?" },
      { speaker: 'ai', text: "Et dans notre vie quotidienne, qu'est-ce qu'on peut faire pour aider ?" },
      { speaker: 'ai', text: "C'est vrai. Est-ce que tu penses que le gouvernement fait assez pour protéger l'environnement ?" },
      { speaker: 'ai', text: "Pour la conclusion de notre projet, quel message principal veux-tu transmettre ?" },
    ],
  },
  {
    id: 10, title: "Travel Mishap", difficulty: "Hard",
    intro: "You are at a train station and your train has been cancelled. You speak with the agent.",
    turns: [
      { speaker: 'ai', text: "Je suis désolé, votre train pour Lyon a été annulé en raison d'une grève. Que puis-je faire pour vous ?" },
      { speaker: 'ai', text: "Le prochain train direct est demain matin à sept heures. Sinon, il y a un train avec une correspondance à Dijon dans deux heures." },
      { speaker: 'ai', text: "Pour le remboursement, il faut aller au guichet principal avec votre billet. Vous avez une réservation d'hôtel à Lyon ce soir ?" },
      { speaker: 'ai', text: "Je comprends, c'est frustrant. On peut vous fournir un bon pour un hôtel près de la gare. Ça vous intéresse ?" },
      { speaker: 'ai', text: "Très bien. Voici le bon. L'hôtel est à cinq minutes à pied. Bonne soirée et encore désolé pour le désagrément." },
    ],
  },
  {
    id: 11, title: "Discussing a Film", difficulty: "Hard",
    intro: "You discuss a French film you recently watched with a friend.",
    turns: [
      { speaker: 'ai', text: "J'ai vu 'Les Intouchables' hier soir. Tu l'as déjà vu ? Qu'est-ce que tu en penses ?" },
      { speaker: 'ai', text: "Moi, ce que j'ai aimé, c'est la relation entre les deux personnages principaux. Quel personnage t'a le plus touché ?" },
      { speaker: 'ai', text: "C'est intéressant. Est-ce que tu penses que le film représente bien la société française ?" },
      { speaker: 'ai', text: "Et la bande-son ? J'ai trouvé que la musique ajoutait beaucoup à l'émotion du film." },
      { speaker: 'ai', text: "Si tu devais recommander un film français à quelqu'un, lequel choisirais-tu et pourquoi ?" },
    ],
  },
  {
    id: 12, title: "Volunteering Experience", difficulty: "Hard",
    intro: "A teacher asks you about a volunteering experience for your portfolio.",
    turns: [
      { speaker: 'ai', text: "Pour votre portfolio, parlez-moi d'une expérience de bénévolat que vous avez faite." },
      { speaker: 'ai', text: "Qu'est-ce qui vous a motivé à faire ce bénévolat en particulier ?" },
      { speaker: 'ai', text: "Qu'avez-vous appris de cette expérience, sur le plan personnel ?" },
      { speaker: 'ai', text: "Y a-t-il eu des moments difficiles pendant cette expérience ? Comment les avez-vous surmontés ?" },
      { speaker: 'ai', text: "En quoi cette expérience a-t-elle changé votre perspective sur la communauté ?" },
    ],
  },
  {
    id: 13, title: "Technology Debate", difficulty: "Hard",
    intro: "You debate the role of technology in education with a classmate.",
    turns: [
      { speaker: 'ai', text: "On dit que la technologie transforme l'éducation. Mais est-ce vraiment un progrès ? Qu'en penses-tu ?" },
      { speaker: 'ai', text: "C'est un bon point. Mais ne penses-tu pas que les réseaux sociaux distraient les étudiants ?" },
      { speaker: 'ai', text: "Et l'intelligence artificielle dans l'éducation ? Tu crois que ça va remplacer les professeurs un jour ?" },
      { speaker: 'ai', text: "Si tu pouvais changer une chose dans le système éducatif grâce à la technologie, ce serait quoi ?" },
      { speaker: 'ai', text: "Pour conclure notre débat, penses-tu que les avantages l'emportent sur les inconvénients ?" },
    ],
  },
  {
    id: 14, title: "Family Traditions", difficulty: "Hard",
    intro: "You discuss family traditions and cultural celebrations with a French exchange student.",
    turns: [
      { speaker: 'ai', text: "Dans ma famille, Noël est très important. On fait un grand repas avec toute la famille élargie. Et toi, quelle est ta fête préférée ?" },
      { speaker: 'ai', text: "C'est intéressant ! Comment est-ce que ta famille célèbre cette fête ? Il y a des traditions spéciales ?" },
      { speaker: 'ai', text: "Chez nous en France, on a aussi la Fête de la Musique en juin. Est-ce qu'il y a un équivalent où tu habites ?" },
      { speaker: 'ai', text: "À ton avis, est-ce que les traditions familiales sont toujours aussi importantes pour les jeunes d'aujourd'hui ?" },
      { speaker: 'ai', text: "Si tu pouvais créer une nouvelle tradition pour ta famille, qu'est-ce que ce serait ?" },
    ],
  },
  {
    id: 15, title: "University Choices", difficulty: "Advanced",
    intro: "You discuss your university plans with a guidance counselor.",
    turns: [
      { speaker: 'ai', text: "Alors, avez-vous réfléchi à vos projets universitaires ? Quelle filière vous intéresse ?" },
      { speaker: 'ai', text: "C'est un excellent domaine. Avez-vous pensé à étudier à l'étranger, peut-être en France ?" },
      { speaker: 'ai', text: "Les études en France offrent beaucoup d'avantages. Mais quels seraient les défis, selon vous ?" },
      { speaker: 'ai', text: "Et après l'université, quel genre de carrière envisagez-vous ?" },
      { speaker: 'ai', text: "Pour conclure, si vous pouviez donner un conseil à un étudiant qui hésite entre plusieurs filières, que diriez-vous ?" },
    ],
  },
  {
    id: 16, title: "Immigration and Identity", difficulty: "Advanced",
    intro: "You discuss the theme of immigration and cultural identity in a class debate.",
    turns: [
      { speaker: 'ai', text: "L'immigration est un sujet complexe en France. À votre avis, quels sont les principaux défis auxquels font face les immigrés ?" },
      { speaker: 'ai', text: "Comment pensez-vous que la société d'accueil peut faciliter l'intégration des nouveaux arrivants ?" },
      { speaker: 'ai', text: "Certains disent que l'immigration enrichit la culture d'un pays. Êtes-vous d'accord ? Pourquoi ?" },
      { speaker: 'ai', text: "Et la question de l'identité culturelle — peut-on être fidèle à ses traditions tout en s'adaptant à une nouvelle culture ?" },
      { speaker: 'ai', text: "Pour terminer, quel rôle l'éducation devrait-elle jouer dans la promotion du dialogue interculturel ?" },
    ],
  },
  {
    id: 17, title: "Art and Society", difficulty: "Advanced",
    intro: "You discuss the role of art in modern society during a philosophy class.",
    turns: [
      { speaker: 'ai', text: "À quoi sert l'art dans notre société contemporaine ? Est-ce un luxe ou une nécessité ?" },
      { speaker: 'ai', text: "Prenons l'exemple de la littérature. Pensez-vous que les romans peuvent changer la société ?" },
      { speaker: 'ai', text: "Et l'art engagé — comme le street art de Banksy ou les chansons protestataires — est-ce de l'art véritable ?" },
      { speaker: 'ai', text: "Dans votre propre vie, y a-t-il une œuvre d'art qui vous a profondément marqué ? Laquelle et pourquoi ?" },
      { speaker: 'ai', text: "Si vous deviez défendre le financement public des arts auprès d'un sceptique, quels arguments avanceriez-vous ?" },
    ],
  },
  {
    id: 18, title: "Global Health Crisis", difficulty: "Advanced",
    intro: "You discuss the impact of a global health crisis on society.",
    turns: [
      { speaker: 'ai', text: "La pandémie a transformé notre façon de vivre. Quels changements vous ont le plus marqué personnellement ?" },
      { speaker: 'ai', text: "Comment évaluez-vous la réponse de votre pays face à cette crise sanitaire ?" },
      { speaker: 'ai', text: "Pensez-vous que cette expérience nous a mieux préparés pour de futures crises ? Pourquoi ?" },
      { speaker: 'ai', text: "La télémédecine et le travail à distance sont devenus courants. Est-ce un progrès durable ou temporaire ?" },
      { speaker: 'ai', text: "Quelle leçon principale devrait-on retenir de cette expérience collective ?" },
    ],
  },
  {
    id: 19, title: "Ethics of AI", difficulty: "Advanced",
    intro: "You participate in a roundtable about artificial intelligence ethics.",
    turns: [
      { speaker: 'ai', text: "L'intelligence artificielle progresse à une vitesse vertigineuse. Quels sont, selon vous, les risques éthiques les plus préoccupants ?" },
      { speaker: 'ai', text: "Certains craignent que l'IA remplace des millions d'emplois. Comment la société devrait-elle se préparer à cette transition ?" },
      { speaker: 'ai', text: "Et la question de la vie privée ? Les algorithmes collectent nos données en permanence. Où faut-il tracer la limite ?" },
      { speaker: 'ai', text: "Si vous pouviez établir une règle fondamentale pour le développement de l'IA, quelle serait-elle ?" },
      { speaker: 'ai', text: "Pour conclure, êtes-vous optimiste ou pessimiste quant à l'avenir de l'IA dans notre société ?" },
    ],
  },
  {
    id: 20, title: "Francophonie and Global French", difficulty: "Advanced",
    intro: "You discuss the concept of Francophonie and the global role of the French language.",
    turns: [
      { speaker: 'ai', text: "La Francophonie représente plus de trois cents millions de locuteurs dans le monde. Pourquoi est-ce important de préserver la diversité linguistique ?" },
      { speaker: 'ai', text: "Le français évolue différemment au Québec, en Afrique, et en Europe. Pensez-vous que ces variations enrichissent ou menacent la langue ?" },
      { speaker: 'ai', text: "Quel rôle la langue française joue-t-elle dans la diplomatie et les organisations internationales aujourd'hui ?" },
      { speaker: 'ai', text: "Avec la domination de l'anglais sur Internet, comment peut-on promouvoir le français dans le monde numérique ?" },
      { speaker: 'ai', text: "Si vous deviez convaincre quelqu'un d'apprendre le français plutôt qu'une autre langue, quels arguments utiliseriez-vous ?" },
    ],
  },
];

// ─── AP Cultural Comparison Prompts (20, progressively harder) ───

const AP_CULTURAL_COMPARISONS: {
  id: number;
  title: string;
  difficulty: string;
  prompt: string;
}[] = [
  { id: 1, title: "School Life", difficulty: "Easy", prompt: "Comparez le système scolaire de votre pays avec celui de la France. Parlez des horaires, des matières, et de la vie des élèves." },
  { id: 2, title: "Family Meals", difficulty: "Easy", prompt: "Comparez les habitudes alimentaires et les repas en famille dans votre culture et dans une communauté francophone." },
  { id: 3, title: "Sports and Leisure", difficulty: "Easy", prompt: "Comparez le rôle du sport dans la vie quotidienne de votre pays et dans un pays francophone." },
  { id: 4, title: "Holidays and Celebrations", difficulty: "Easy", prompt: "Comparez une fête importante dans votre culture avec une fête célébrée dans un pays francophone." },
  { id: 5, title: "Social Media Usage", difficulty: "Medium", prompt: "Comparez l'utilisation des réseaux sociaux par les jeunes dans votre pays et dans un pays francophone. Discutez des avantages et des inconvénients." },
  { id: 6, title: "Education Systems", difficulty: "Medium", prompt: "Comparez l'importance des examens dans le système éducatif de votre pays avec le baccalauréat en France." },
  { id: 7, title: "Urban vs Rural Life", difficulty: "Medium", prompt: "Comparez la vie urbaine et la vie rurale dans votre pays et dans un pays francophone. Quel mode de vie préférez-vous ?" },
  { id: 8, title: "Fashion and Identity", difficulty: "Medium", prompt: "Comparez le rôle de la mode dans l'expression de l'identité personnelle dans votre culture et dans la culture française." },
  { id: 9, title: "Music and Culture", difficulty: "Medium", prompt: "Comparez l'influence de la musique sur la culture des jeunes dans votre pays et dans un pays francophone." },
  { id: 10, title: "Environmental Awareness", difficulty: "Medium", prompt: "Comparez les attitudes envers l'environnement et le développement durable dans votre pays et dans un pays francophone." },
  { id: 11, title: "Work-Life Balance", difficulty: "Hard", prompt: "Comparez l'équilibre entre la vie professionnelle et la vie personnelle dans votre pays avec celui de la France. Discutez des congés, des horaires de travail, et de la qualité de vie." },
  { id: 12, title: "Healthcare Systems", difficulty: "Hard", prompt: "Comparez le système de santé de votre pays avec le système de santé français. Discutez de l'accessibilité, du coût, et de la qualité des soins." },
  { id: 13, title: "Immigration Policies", difficulty: "Hard", prompt: "Comparez les politiques d'immigration de votre pays avec celles de la France. Comment ces politiques affectent-elles la société ?" },
  { id: 14, title: "Art and Architecture", difficulty: "Hard", prompt: "Comparez le rôle de l'art et de l'architecture dans le patrimoine culturel de votre pays et de la France." },
  { id: 15, title: "Gender Equality", difficulty: "Hard", prompt: "Comparez les progrès en matière d'égalité des sexes dans votre pays et dans un pays francophone. Quels défis restent à relever ?" },
  { id: 16, title: "Cuisine and Gastronomy", difficulty: "Advanced", prompt: "Comparez la philosophie culinaire de votre pays avec la gastronomie française. Discutez du rôle de la cuisine dans l'identité nationale et de la reconnaissance par l'UNESCO." },
  { id: 17, title: "Colonial Legacy", difficulty: "Advanced", prompt: "Comparez l'impact de l'histoire coloniale sur la société et la culture dans votre pays et dans un pays francophone. Comment cet héritage influence-t-il les relations internationales aujourd'hui ?" },
  { id: 18, title: "Youth Activism", difficulty: "Advanced", prompt: "Comparez le rôle de l'activisme des jeunes dans votre pays et dans un pays francophone. Comment les jeunes influencent-ils le changement social et politique ?" },
  { id: 19, title: "Technology and Privacy", difficulty: "Advanced", prompt: "Comparez les attitudes envers la technologie et la protection de la vie privée dans votre pays et en France, notamment en ce qui concerne le RGPD." },
  { id: 20, title: "Literature and Society", difficulty: "Advanced", prompt: "Comparez le rôle de la littérature dans la formation de l'identité nationale dans votre pays et dans le monde francophone. Citez des exemples d'œuvres influentes." },
];

// ─── Types ─── 

type APPhase = 'select' | 'preview' | 'conversation' | 'recording' | 'grading' | 'results';

// ─── Component ─── 

export default function APSession({ mode }: { mode: 'ap-simulated' | 'ap-speaking' }) {
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang') as Language || 'French';
  const navigate = useNavigate();

  const [phase, setPhase] = useState<APPhase>('select');
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [completedIds, setCompletedIds] = useState<number[]>([]);
  const [timer, setTimer] = useState(0);
  const [maxTimer, setMaxTimer] = useState(0);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [userResponses, setUserResponses] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [isGrading, setIsGrading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const geminiRef = useRef<GeminiService | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentRecordingRef = useRef<string>('');
  const isSpeakingRef = useRef<boolean>(false);
  const shouldRecordRef = useRef<boolean>(false);

  const isConversation = mode === 'ap-simulated';
  const prompts = isConversation ? AP_CONVERSATIONS : AP_CULTURAL_COMPARISONS;

  // Load completed IDs from Supabase (with localStorage fallback)
  useEffect(() => {
    const loadProgress = async () => {
      const localKey = `orati_ap_${mode}_completed`;
      
      // Try Supabase first
      if (supabase) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('ap_progress')
              .eq('id', user.id)
              .single();
            
            if (profile?.ap_progress) {
              const progressKey = mode === 'ap-simulated' ? 'conversation' : 'speaking';
              const ids = profile.ap_progress[progressKey] || [];
              setCompletedIds(ids);
              // Sync to localStorage as cache
              localStorage.setItem(localKey, JSON.stringify(ids));
              return;
            }
          }
        } catch (e) {
          console.warn('Could not load AP progress from Supabase:', e);
        }
      }

      // Fallback to localStorage
      const saved = localStorage.getItem(localKey);
      if (saved) setCompletedIds(JSON.parse(saved));
    };

    loadProgress();
  }, [mode]);

  // Init Gemini for TTS and grading
  useEffect(() => {
    const key = import.meta.env.VITE_GEMINI_TTS_API_KEY || import.meta.env.VITE_VERTEX_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (key) {
      geminiRef.current = new GeminiService(key, key);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch {}
      }
    };
  }, []);

  const saveCompleted = async (id: number) => {
    const localKey = `orati_ap_${mode}_completed`;
    const newIds = [...new Set([...completedIds, id])];
    setCompletedIds(newIds);
    
    // Save to localStorage (fast cache)
    localStorage.setItem(localKey, JSON.stringify(newIds));

    // Save to Supabase
    if (supabase) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const progressKey = mode === 'ap-simulated' ? 'conversation' : 'speaking';
          
          // Get current progress
          const { data: profile } = await supabase
            .from('profiles')
            .select('ap_progress')
            .eq('id', user.id)
            .single();
          
          const currentProgress = profile?.ap_progress || {};
          const updatedProgress = { ...currentProgress, [progressKey]: newIds };
          
          await supabase
            .from('profiles')
            .update({ ap_progress: updatedProgress })
            .eq('id', user.id);
        }
      } catch (e) {
        console.warn('Could not save AP progress to Supabase:', e);
      }
    }
  };

  // ─── TTS: Play AI speech using Gemini TTS (with mutex) ─── 
  const speakText = useCallback(async (text: string): Promise<void> => {
    // Mutex to prevent double playback
    if (isSpeakingRef.current || !geminiRef.current) return;
    isSpeakingRef.current = true;
    setIsSpeaking(true);
    try {
      const base64Audio = await geminiRef.current.generateSpeech(text, 'Kore');
      if (base64Audio) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioContext();
        }
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const pcm = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) float32[i] = pcm[i] / 32768.0;
        const buffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
        buffer.getChannelData(0).set(float32);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        return new Promise<void>((resolve) => {
          source.onended = () => {
            isSpeakingRef.current = false;
            setIsSpeaking(false);
            resolve();
          };
          source.start();
        });
      }
    } catch (e) {
      console.error('TTS error:', e);
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
  }, []);

  // ─── STT: Browser Speech Recognition (with proper accumulation) ─── 
  const accumulatedTextRef = useRef<string>('');

  const startSTT = useCallback(async () => {
    // Request microphone permission explicitly first
    try {
      const localSettings = localStorage.getItem('user_settings');
      const microphoneId = localSettings ? JSON.parse(localSettings).microphone_id : null;
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: microphoneId ? { deviceId: { exact: microphoneId } } : true 
      });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.start(1000);
    } catch (e) {
      console.warn('Mic permission denied:', e);
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('No browser STT support');
      setIsRecording(true);
      shouldRecordRef.current = true;
      return;
    }

    // Reset ALL transcript state for this recording session
    accumulatedTextRef.current = '';
    currentRecordingRef.current = '';
    shouldRecordRef.current = true;

    const createRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.lang = lang === 'French' ? 'fr-FR' : lang === 'Spanish' ? 'es-ES' : 'en-US';
      recognition.interimResults = true;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (e: any) => {
        // Build transcript from current session results
        let sessionTranscript = '';
        for (let i = 0; i < e.results.length; i++) {
          sessionTranscript += e.results[i][0].transcript;
        }
        // APPEND to accumulated text (from previous auto-restarts)
        currentRecordingRef.current = accumulatedTextRef.current + sessionTranscript;
        console.log('[STT] Captured:', currentRecordingRef.current);
      };

      recognition.onerror = (e: any) => {
        console.warn('STT error:', e.error);
        if ((e.error === 'no-speech' || e.error === 'aborted') && shouldRecordRef.current) {
          // Save what we have before restart
          accumulatedTextRef.current = currentRecordingRef.current;
          setTimeout(() => {
            try {
              const newRec = createRecognition();
              newRec.start();
              recognitionRef.current = newRec;
            } catch {}
          }, 200);
        }
      };

      recognition.onend = () => {
        if (shouldRecordRef.current) {
          // Save accumulated text before restart
          accumulatedTextRef.current = currentRecordingRef.current;
          setTimeout(() => {
            try {
              const newRec = createRecognition();
              newRec.start();
              recognitionRef.current = newRec;
            } catch {}
          }, 200);
        }
      };

      return recognition;
    };

    const recognition = createRecognition();
    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch (e) {
      console.error('Failed to start STT:', e);
    }
  }, [lang]);

  const stopSTT = useCallback((): string => {
    shouldRecordRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch {}
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    const result = currentRecordingRef.current;
    console.log('[STT] Final captured text:', result);
    return result;
  }, []);

  // Listen for device changes (like changing default mic in Chrome)
  useEffect(() => {
    const handleDeviceChange = () => {
      if (isRecording) {
        console.log('Microphone device change detected during recording, restarting STT...');
        stopSTT();
        startSTT();
      }
    };
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [isRecording, startSTT, stopSTT]);

  // ─── Timer helpers ─── 
  const startTimer = (seconds: number, onComplete: () => void) => {
    setTimer(seconds);
    setMaxTimer(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ─── AP Conversation Flow ─── 
  const userResponsesRef = useRef<string[]>([]);

  const startConversation = async () => {
    if (!selectedPromptId) return;
    const conv = AP_CONVERSATIONS.find(c => c.id === selectedPromptId)!;
    setPhase('preview');
    setCurrentTurnIndex(0);
    setUserResponses([]);
    userResponsesRef.current = [];

    // 60s preview
    startTimer(60, () => runConversationTurn(conv, 0));
  };

  const runConversationTurn = async (conv: typeof AP_CONVERSATIONS[0], turnIdx: number) => {
    if (turnIdx >= conv.turns.length) {
      // Done — grade using the ref (guaranteed fresh)
      setPhase('grading');
      setIsRecording(false);
      setTimer(0);
      await gradeConversation(conv, userResponsesRef.current);
      return;
    }

    // Reset timer and recording state before AI speaks
    setIsRecording(false);
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);

    setPhase('conversation');
    setCurrentTurnIndex(turnIdx);

    // AI speaks (timer hidden during this)
    await speakText(conv.turns[turnIdx].text);

    // NOW start STT + 20s timer for user response
    await startSTT();
    startTimer(20, async () => {
      const response = stopSTT();
      console.log(`[Turn ${turnIdx + 1}] User said: "${response}"`);
      userResponsesRef.current = [...userResponsesRef.current, response];
      setUserResponses([...userResponsesRef.current]);
      // Move to next turn
      await runConversationTurn(conv, turnIdx + 1);
    });
  };

  // ─── AP Cultural Comparison Flow ─── 
  const startCulturalComparison = () => {
    if (!selectedPromptId) return;
    setPhase('recording');
    setUserResponses([]);

    // 2 minute timer
    startSTT();
    startTimer(120, async () => {
      const response = stopSTT();
      setUserResponses([response]);
      setPhase('grading');
      const prompt = AP_CULTURAL_COMPARISONS.find(p => p.id === selectedPromptId)!;
      await gradeCulturalComparison(prompt, response);
    });
  };

  // ─── Grading (single Gemini text call — cheap) ─── 
  const gradeConversation = async (conv: typeof AP_CONVERSATIONS[0], responses: string[]) => {
    setIsGrading(true);
    try {
      const liveKey = import.meta.env.VITE_GEMINI_LIVE_API_KEY || import.meta.env.VITE_VERTEX_API_KEY;
      if (!liveKey || !geminiRef.current) return;

      const transcriptText = conv.turns.map((t, i) => 
        `AI: ${t.text}\nUser: ${responses[i] || '(no response)'}`
      ).join('\n\n');

      const response = await geminiRef.current.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AP French exam grader. Grade this simulated conversation out of 5 using AP standards.

Conversation topic: ${conv.title}
Introduction: ${conv.intro}

Transcript:
${transcriptText}

Return ONLY valid JSON (no markdown, no code fences):
{
  "score": <1-5>,
  "maintainingConversation": { "score": <1-5>, "comment": "<brief>" },
  "vocabulary": { "score": <1-5>, "comment": "<brief>" },  
  "grammar": { "score": <1-5>, "comment": "<brief>" },
  "pronunciation": { "score": <1-5>, "comment": "<brief>" },
  "overallComment": "<2-3 sentences>",
  "tips": ["<tip1>", "<tip2>", "<tip3>"]
}`,
      });
      
      const text = response.text || '';
      const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const result = JSON.parse(jsonStr);
      setGradeResult(result);
      saveCompleted(selectedPromptId!);
    } catch (e) {
      console.error('Grading error:', e);
      setGradeResult({ score: 0, overallComment: 'Unable to grade. Please try again.', tips: [] });
    }
    setIsGrading(false);
    setPhase('results');
  };

  const gradeCulturalComparison = async (prompt: typeof AP_CULTURAL_COMPARISONS[0], response: string) => {
    setIsGrading(true);
    try {
      if (!geminiRef.current) return;
      const genResponse = await geminiRef.current.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an AP French exam grader. Grade this cultural comparison speaking task out of 5 using AP standards.

Prompt: ${prompt.prompt}
Student response (2 min): ${response || '(no response)'}

Return ONLY valid JSON (no markdown, no code fences):
{
  "score": <1-5>,
  "treatmentOfTopic": { "score": <1-5>, "comment": "<brief>" },
  "comparison": { "score": <1-5>, "comment": "<brief>" },
  "vocabulary": { "score": <1-5>, "comment": "<brief>" },
  "grammar": { "score": <1-5>, "comment": "<brief>" },
  "overallComment": "<2-3 sentences>",
  "tips": ["<tip1>", "<tip2>", "<tip3>"]
}`,
      });
      const text = genResponse.text || '';
      const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const result = JSON.parse(jsonStr);
      setGradeResult(result);
      saveCompleted(selectedPromptId!);
    } catch (e) {
      console.error('Grading error:', e);
      setGradeResult({ score: 0, overallComment: 'Unable to grade. Please try again.', tips: [] });
    }
    setIsGrading(false);
    setPhase('results');
  };

  const resetSession = () => {
    setPhase('select');
    setSelectedPromptId(null);
    setCurrentTurnIndex(0);
    setUserResponses([]);
    setGradeResult(null);
    setTimer(0);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
  };

  // ─── Render: Prompt Selection ─── 
  const renderSelect = () => {
    const nextUncompletedId = prompts.find(p => !completedIds.includes(p.id))?.id;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl md:text-2xl font-serif font-bold">
            {isConversation ? 'AP Simulated Conversation' : 'Cultural Comparison Speaking'}
          </h2>
          <span className="text-sm text-dark/40 font-bold">
            {completedIds.length} / {prompts.length} completed
          </span>
        </div>
        <p className="text-dark/50 text-sm mb-4">
          {isConversation 
            ? 'Practice AP-style conversations. The AI speaks, then you have 20 seconds to respond.' 
            : 'Speak for 2 minutes comparing cultures. Graded on AP standards.'}
        </p>

        {/* Progress bar */}
        <div className="w-full h-2 bg-beige-mid/20 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-gold to-petal rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(completedIds.length / prompts.length) * 100}%` }}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 md:pr-2">
          {prompts.map((p) => {
            const isCompleted = completedIds.includes(p.id);
            const isNext = p.id === nextUncompletedId;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedPromptId(p.id)}
                className={cn(
                  "p-4 rounded-2xl border-2 text-left transition-all group",
                  selectedPromptId === p.id
                    ? "border-gold bg-gold/5 shadow-lg shadow-gold/10"
                    : isCompleted
                    ? "border-green-200 bg-green-50/30 hover:border-green-300"
                    : isNext
                    ? "border-gold/40 bg-gold/5 hover:border-gold"
                    : "border-beige-mid/20 hover:border-beige-mid/40 bg-white"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-dark/30">#{p.id}</span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                        (p as any).difficulty === 'Easy' && "bg-green-100 text-green-600",
                        (p as any).difficulty === 'Medium' && "bg-yellow-100 text-yellow-600",
                        (p as any).difficulty === 'Hard' && "bg-orange-100 text-orange-600",
                        (p as any).difficulty === 'Advanced' && "bg-red-100 text-red-600",
                      )}>
                        {(p as any).difficulty}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-sm">{p.title}</h3>
                  </div>
                  {isCompleted ? (
                    <CheckCircle2 size={18} className="text-green-500 shrink-0 mt-0.5" />
                  ) : isNext ? (
                    <ChevronRight size={18} className="text-gold shrink-0 mt-0.5" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        {selectedPromptId && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <button
              onClick={() => isConversation ? startConversation() : startCulturalComparison()}
              className="flex-1 py-4 bg-gold text-cream rounded-full font-bold text-lg hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
            >
              {completedIds.includes(selectedPromptId) ? 'Redo' : 'Start'} →
            </button>
          </motion.div>
        )}
      </div>
    );
  };

  // ─── Render: Preview (60s reading time) ─── 
  const renderPreview = () => {
    const conv = AP_CONVERSATIONS.find(c => c.id === selectedPromptId)!;
    return (
      <div className="text-center space-y-8">
        <div className="bg-gold/10 rounded-3xl p-8 border border-gold/20">
          <p className="text-sm text-gold font-bold uppercase tracking-wider mb-4">Read the introduction</p>
          <h2 className="text-2xl font-serif font-bold mb-4">{conv.title}</h2>
          <p className="text-dark/70 text-lg leading-relaxed">{conv.intro}</p>
        </div>
        <div className="space-y-2">
          <div className="text-4xl md:text-6xl font-bold text-gold font-mono">{timer}s</div>
          <p className="text-dark/40 text-sm">Reading time remaining</p>
          <div className="w-64 mx-auto h-2 bg-beige-mid/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gold rounded-full"
              style={{ width: `${(timer / maxTimer) * 100}%` }}
            />
          </div>
        </div>
        <button
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
            runConversationTurn(conv, 0);
          }}
          className="px-8 py-3 bg-dark/10 text-dark/60 rounded-full font-bold text-sm hover:bg-dark/20 transition-all"
        >
          Skip →
        </button>
      </div>
    );
  };

  // ─── Render: Conversation in progress ─── 
  const renderConversation = () => {
    const conv = AP_CONVERSATIONS.find(c => c.id === selectedPromptId)!;
    const currentTurn = conv.turns[currentTurnIndex];
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <span className="text-sm text-dark/40 font-bold">
            Turn {currentTurnIndex + 1} of {conv.turns.length}
          </span>
          <div className="flex gap-1">
            {conv.turns.map((_, i) => (
              <div key={i} className={cn(
                "w-8 h-1.5 rounded-full transition-all",
                i < currentTurnIndex ? "bg-green-400" : i === currentTurnIndex ? "bg-gold" : "bg-beige-mid/20"
              )} />
            ))}
          </div>
        </div>

        {/* AI speaking bubble */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-beige-mid/20 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={cn("w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center", isSpeaking && "animate-pulse")}>
                <Volume2 size={14} className="text-gold" />
              </div>
              <span className="text-sm font-bold text-dark/40">AI Partner</span>
            </div>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className={cn(
                "text-xs font-bold px-3 py-1.5 rounded-full transition-all",
                showTranscript ? "bg-gold/10 text-gold" : "bg-beige-mid/10 text-dark/30 hover:text-dark/50"
              )}
            >
              {showTranscript ? 'Hide Text' : 'Show Text'}
            </button>
          </div>
          <AnimatePresence>
            {showTranscript ? (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="text-lg font-serif text-dark leading-relaxed"
              >
                {currentTurn?.text}
              </motion.p>
            ) : (
              <p className="text-sm text-dark/30 italic">Listening mode — click "Show Text" to see the transcript</p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Timer + Recording indicator */}
        {isRecording && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-50 border border-red-200 rounded-full">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-bold text-red-600">Your turn — speak now</span>
            </div>
            <div className="text-4xl md:text-6xl font-bold text-gold font-mono">{timer}s</div>
            <div className="w-48 mx-auto h-2 bg-beige-mid/20 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gold rounded-full"
                style={{ width: `${(timer / 20) * 100}%` }}
              />
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  // ─── Render: Cultural Comparison Recording ─── 
  const renderRecording = () => {
    const prompt = AP_CULTURAL_COMPARISONS.find(p => p.id === selectedPromptId)!;
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return (
      <div className="space-y-8">
        <div className="bg-gold/10 rounded-3xl p-6 border border-gold/20">
          <p className="text-sm text-gold font-bold uppercase tracking-wider mb-3">Prompt</p>
          <p className="text-dark/70 text-lg leading-relaxed font-serif">{prompt.prompt}</p>
        </div>
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-red-50 border border-red-200 rounded-full">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-red-600">Speaking — {minutes}:{seconds.toString().padStart(2, '0')}</span>
          </div>
          <div className="text-5xl md:text-7xl font-bold text-gold font-mono">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
          <div className="w-64 mx-auto h-2 bg-beige-mid/20 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-gold to-petal rounded-full"
              style={{ width: `${(timer / 120) * 100}%` }}
            />
          </div>
          <p className="text-dark/40 text-sm">Speak in {lang} for the full 2 minutes</p>
        </div>
      </div>
    );
  };

  // ─── Render: Grading spinner ─── 
  const renderGrading = () => (
    <div className="text-center space-y-6 py-12">
      <div className="w-16 h-16 border-4 border-gold border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-xl font-serif font-bold text-dark/60">Grading your response...</p>
      <p className="text-sm text-dark/30">Using AP French exam standards</p>
    </div>
  );

  // ─── Render: Results ─── 
  const renderResults = () => {
    if (!gradeResult) return null;
    const score = gradeResult.score || 0;
    const categories = isConversation
      ? [
          { label: 'Conversation Flow', data: gradeResult.maintainingConversation },
          { label: 'Vocabulary', data: gradeResult.vocabulary },
          { label: 'Grammar', data: gradeResult.grammar },
          { label: 'Pronunciation', data: gradeResult.pronunciation },
        ]
      : [
          { label: 'Treatment of Topic', data: gradeResult.treatmentOfTopic },
          { label: 'Cultural Comparison', data: gradeResult.comparison },
          { label: 'Vocabulary', data: gradeResult.vocabulary },
          { label: 'Grammar', data: gradeResult.grammar },
        ];

    return (
      <div className="space-y-6">
        {/* Score header */}
        <div className="text-center bg-gradient-to-br from-gold/10 to-petal/10 rounded-[32px] p-8 border border-gold/20">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={28} className={s <= score ? "text-gold fill-gold" : "text-beige-mid/30"} />
            ))}
          </div>
          <div className="text-4xl md:text-5xl font-bold text-gold mb-2">{score} / 5</div>
          <p className="text-dark/50 text-sm">AP Score</p>
        </div>

        {/* Category breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {categories.map((cat, i) => (
            <div key={i} className="bg-white rounded-2xl border border-beige-mid/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-dark/70">{cat.label}</span>
                <span className="text-sm font-bold text-gold">{cat.data?.score || 0}/5</span>
              </div>
              <div className="w-full h-1.5 bg-beige-mid/20 rounded-full overflow-hidden mb-2">
                <div 
                  className="h-full bg-gold rounded-full transition-all" 
                  style={{ width: `${((cat.data?.score || 0) / 5) * 100}%` }}
                />
              </div>
              <p className="text-xs text-dark/40">{cat.data?.comment || ''}</p>
            </div>
          ))}
        </div>

        {/* Overall comment */}
        <div className="bg-white rounded-2xl border border-beige-mid/20 p-6">
          <h3 className="font-serif font-bold mb-2">Overall Feedback</h3>
          <p className="text-dark/60 text-sm leading-relaxed">{gradeResult.overallComment}</p>
        </div>

        {/* Tips */}
        {gradeResult.tips?.length > 0 && (
          <div className="bg-blue-50/50 rounded-2xl border border-blue-200/30 p-6">
            <h3 className="font-serif font-bold mb-3 text-blue-700">Tips to Improve</h3>
            <ul className="space-y-2">
              {gradeResult.tips.map((tip: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-600">
                  <ChevronRight size={14} className="shrink-0 mt-0.5" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={resetSession}
            className="flex-1 py-4 bg-white border-2 border-beige-mid/20 rounded-full font-bold hover:bg-beige/30 transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} /> Back to Prompts
          </button>
          <button
            onClick={() => {
              resetSession();
              // Select the next prompt
              const nextId = prompts.find(p => !completedIds.includes(p.id) && p.id !== selectedPromptId)?.id;
              if (nextId) setSelectedPromptId(nextId);
            }}
            className="flex-1 py-4 bg-gold text-cream rounded-full font-bold hover:bg-gold/90 transition-all shadow-lg shadow-gold/20"
          >
            Next Prompt →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => phase === 'select' ? navigate('/dashboard') : resetSession()}
            className="p-2 rounded-full hover:bg-beige transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-serif font-bold">
              {isConversation ? 'AP Conversation' : 'AP Cultural Comparison'}
            </h1>
            <p className="text-xs text-dark/40">{lang}</p>
          </div>
        </div>

        {/* Phase content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {phase === 'select' && renderSelect()}
            {phase === 'preview' && renderPreview()}
            {phase === 'conversation' && renderConversation()}
            {phase === 'recording' && renderRecording()}
            {phase === 'grading' && renderGrading()}
            {phase === 'results' && renderResults()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
