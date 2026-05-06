import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, CheckCircle2, XCircle, Loader2, Database, ChevronDown } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { supabase } from '@/src/lib/supabase';

type UploadMode = 'ap' | 'vocab';
interface UploadResult { file: string; path: string; status: 'success' | 'error'; message?: string; }

// Full script — each entry is what needs to be recorded as {convId}_{turnIdx}.pcm
const SCRIPT: { id: number; title: string; turns: string[] }[] = [
  { id: 1, title: "Meeting a New Classmate", turns: ["Salut ! Je suis nouveau ici, je viens d'arriver de Lyon. Comment tu t'appelles, et tu es dans quelle classe cette année ?","Enchanté ! Moi, j'ai beaucoup de cours aujourd'hui, c'est fatigant. Tu as quels cours toi aujourd'hui ? Et lequel est ton cours préféré ?","Ah c'est intéressant ! Moi, j'adore les maths mais le français c'est difficile pour moi. Est-ce que tu aimes le français ? Qu'est-ce que tu apprends en ce moment en cours de français ?","C'est bien ! Dis-moi, est-ce que les élèves ici font des activités après les cours ? Il y a des clubs ou des sports ? Qu'est-ce que tu me recommandes ?","Super, merci pour toutes ces infos ! Est-ce qu'on peut déjeuner ensemble un de ces jours ? Tu manges à la cantine ou tu apportes ton repas ?"] },
  { id: 2, title: "Ordering at a Café", turns: ["Bonjour et bienvenue au Café de Flore ! C'est votre première visite chez nous ? Qu'est-ce que je peux vous servir comme boisson ?","Très bon choix ! Nous avons aussi de délicieuses pâtisseries aujourd'hui. Vous voulez quelque chose à manger ?","Je vous recommande particulièrement notre croque-monsieur, c'est la spécialité de la maison. Ça vous tente, ou vous préférez autre chose ?","Excellent ! Et pour le dessert, je peux vous proposer une tarte aux fraises ou une crème brûlée. Qu'est-ce qui vous ferait plaisir ?","Parfait, j'ai tout noté ! Ça fait quatorze euros cinquante. Vous payez par carte ou en espèces ?"] },
  { id: 3, title: "Weekend Plans", turns: ["Salut ! C'est enfin le week-end ! Tu es libre demain et dimanche ? Qu'est-ce que tu aimerais faire ?","Génial ! Il y a un nouveau film au cinéma et un marché en plein air. Tu préfères quoi ?","Pour l'heure, à quelle heure est-ce qu'on pourrait se retrouver ? Tu veux qu'on prenne le bus ou qu'on marche ?","Et tu veux qu'on mange quelque part après ? Il y a un bon restaurant italien, ou on pourrait faire un pique-nique. Qu'est-ce que tu en penses ?","Parfait, j'ai hâte ! Et dimanche, tu veux faire quelque chose aussi ou tu préfères te reposer ?"] },
  { id: 4, title: "At the Doctor's", turns: ["Bonjour, asseyez-vous. Qu'est-ce qui ne va pas ? Depuis quand vous ne vous sentez pas bien ?","Pouvez-vous me décrire vos symptômes plus en détail ? Avez-vous de la fièvre ou des maux de tête ?","Et qu'est-ce que vous avez fait pour vous soigner jusqu'à maintenant ? Avez-vous pris des médicaments ?","Je vais vous prescrire un traitement. Êtes-vous allergique à certains médicaments ?","Très bien. Je vous recommande de bien vous reposer et de boire beaucoup d'eau. Avez-vous des questions ?"] },
  { id: 5, title: "Shopping for Clothes", turns: ["Bonjour ! Je peux vous aider à trouver quelque chose ?","Quelle taille faites-vous ?","Nous avons plusieurs modèles. Vous préférez quelle couleur ?","Voilà ! La cabine d'essayage est par là. Ça vous plaît ?","C'est en solde aujourd'hui, vingt pour cent de réduction. Vous le prenez ?"] },
  { id: 6, title: "Birthday Party Planning", turns: ["Tu sais que l'anniversaire de Marie est samedi prochain ? On devrait organiser une fête surprise !","Bonne idée ! Où est-ce qu'on pourrait la faire, à ton avis ?","Et pour la nourriture, qu'est-ce qu'on prépare ? Marie adore la cuisine française.","Il faut aussi penser aux décorations. Tu as des idées ?","Parfait ! Et le cadeau ? Qu'est-ce qu'on pourrait lui offrir ?"] },
  { id: 7, title: "Lost in a City", turns: ["Vous avez l'air perdu ! Je peux vous aider ?","Ah, ce n'est pas loin d'ici. Vous êtes à pied ou en voiture ?","Alors, continuez tout droit pendant deux cents mètres, puis tournez à gauche. Vous voyez la boulangerie là-bas ?","C'est juste après la boulangerie, en face du parc. Mais attention, la rue est en travaux.","De rien ! Bonne journée, et n'hésitez pas si vous vous perdez encore !"] },
  { id: 8, title: "Job Interview", turns: ["Bonjour et bienvenue. Asseyez-vous. Alors, parlez-moi un peu de vous.","Intéressant. Pourquoi voulez-vous travailler chez nous cet été ?","Quelles sont vos qualités principales, d'après vous ?","Avez-vous déjà eu une expérience professionnelle ?","Très bien. Avez-vous des questions pour nous ?"] },
  { id: 9, title: "Environmental Discussion", turns: ["Pour notre projet sur l'environnement, quel sujet veux-tu choisir ? Le réchauffement climatique ou la pollution ?","Bon choix. À ton avis, quelles sont les causes principales de ce problème ?","Et dans notre vie quotidienne, qu'est-ce qu'on peut faire pour aider ?","Est-ce que tu penses que le gouvernement fait assez pour protéger l'environnement ?","Pour la conclusion, quel message principal veux-tu transmettre ?"] },
  { id: 10, title: "Travel Mishap", turns: ["Je suis désolé, votre train pour Lyon a été annulé. Que puis-je faire pour vous ?","Le prochain train direct est demain matin à sept heures. Il y a aussi un train avec correspondance dans deux heures.","Pour le remboursement, allez au guichet principal. Vous avez une réservation d'hôtel ce soir ?","On peut vous fournir un bon pour un hôtel près de la gare. Ça vous intéresse ?","Voici le bon. L'hôtel est à cinq minutes à pied. Bonne soirée et encore désolé."] },
  { id: 11, title: "Discussing a Film", turns: ["J'ai vu 'Les Intouchables' hier soir. Tu l'as déjà vu ? Qu'est-ce que tu en penses ?","Moi, j'ai aimé la relation entre les deux personnages principaux. Quel personnage t'a le plus touché ?","Est-ce que tu penses que le film représente bien la société française ?","Et la bande-son ? J'ai trouvé que la musique ajoutait beaucoup à l'émotion du film.","Si tu devais recommander un film français à quelqu'un, lequel choisirais-tu et pourquoi ?"] },
  { id: 12, title: "Volunteering", turns: ["Pour votre portfolio, parlez-moi d'une expérience de bénévolat que vous avez faite.","Qu'est-ce qui vous a motivé à faire ce bénévolat en particulier ?","Qu'avez-vous appris de cette expérience, sur le plan personnel ?","Y a-t-il eu des moments difficiles ? Comment les avez-vous surmontés ?","En quoi cette expérience a-t-elle changé votre perspective sur la communauté ?"] },
  { id: 13, title: "Technology Debate", turns: ["On dit que la technologie transforme l'éducation. Est-ce vraiment un progrès ? Qu'en penses-tu ?","Mais ne penses-tu pas que les réseaux sociaux distraient les étudiants ?","Et l'intelligence artificielle dans l'éducation ? Tu crois que ça va remplacer les professeurs ?","Si tu pouvais changer une chose dans le système éducatif grâce à la technologie, ce serait quoi ?","Penses-tu que les avantages l'emportent sur les inconvénients ?"] },
  { id: 14, title: "Family Traditions", turns: ["Dans ma famille, Noël est très important. On fait un grand repas. Et toi, quelle est ta fête préférée ?","Comment est-ce que ta famille célèbre cette fête ? Il y a des traditions spéciales ?","Chez nous, on a aussi la Fête de la Musique en juin. Est-ce qu'il y a un équivalent où tu habites ?","Est-ce que les traditions familiales sont toujours aussi importantes pour les jeunes d'aujourd'hui ?","Si tu pouvais créer une nouvelle tradition pour ta famille, qu'est-ce que ce serait ?"] },
  { id: 15, title: "University Choices", turns: ["Alors, avez-vous réfléchi à vos projets universitaires ? Quelle filière vous intéresse ?","C'est excellent. Avez-vous pensé à étudier à l'étranger, peut-être en France ?","Les études en France offrent beaucoup d'avantages. Quels seraient les défis, selon vous ?","Et après l'université, quel genre de carrière envisagez-vous ?","Si vous pouviez donner un conseil à un étudiant qui hésite entre plusieurs filières, que diriez-vous ?"] },
  { id: 16, title: "Immigration and Identity", turns: ["L'immigration est un sujet complexe. Quels sont les principaux défis auxquels font face les immigrés ?","Comment la société d'accueil peut-elle faciliter l'intégration des nouveaux arrivants ?","Certains disent que l'immigration enrichit la culture d'un pays. Êtes-vous d'accord ?","Peut-on être fidèle à ses traditions tout en s'adaptant à une nouvelle culture ?","Quel rôle l'éducation devrait-elle jouer dans la promotion du dialogue interculturel ?"] },
  { id: 17, title: "Art and Society", turns: ["À quoi sert l'art dans notre société contemporaine ? Est-ce un luxe ou une nécessité ?","Pensez-vous que les romans peuvent changer la société ?","Et l'art engagé comme le street art de Banksy — est-ce de l'art véritable ?","Y a-t-il une œuvre d'art qui vous a profondément marqué ? Laquelle et pourquoi ?","Si vous deviez défendre le financement public des arts, quels arguments avanceriez-vous ?"] },
  { id: 18, title: "Global Health Crisis", turns: ["La pandémie a transformé notre façon de vivre. Quels changements vous ont le plus marqué ?","Comment évaluez-vous la réponse de votre pays face à cette crise sanitaire ?","Pensez-vous que cette expérience nous a mieux préparés pour de futures crises ?","La télémédecine et le travail à distance sont devenus courants. Est-ce un progrès durable ?","Quelle leçon principale devrait-on retenir de cette expérience collective ?"] },
  { id: 19, title: "Ethics of AI", turns: ["L'IA progresse à une vitesse vertigineuse. Quels sont les risques éthiques les plus préoccupants ?","Certains craignent que l'IA remplace des millions d'emplois. Comment la société devrait-elle se préparer ?","Les algorithmes collectent nos données en permanence. Où faut-il tracer la limite ?","Si vous pouviez établir une règle fondamentale pour le développement de l'IA, quelle serait-elle ?","Êtes-vous optimiste ou pessimiste quant à l'avenir de l'IA dans notre société ?"] },
  { id: 20, title: "Francophonie", turns: ["La Francophonie représente plus de trois cents millions de locuteurs. Pourquoi préserver la diversité linguistique ?","Le français évolue différemment au Québec, en Afrique, et en Europe. Est-ce une richesse ou une menace ?","Quel rôle la langue française joue-t-elle dans la diplomatie internationale aujourd'hui ?","Avec la domination de l'anglais sur Internet, comment peut-on promouvoir le français en ligne ?","Si vous deviez convaincre quelqu'un d'apprendre le français, quels arguments utiliseriez-vous ?"] },
];

export default function AdminAudioUpload() {
  const [expandedConv, setExpandedConv] = useState<number | null>(null);
  const [mode, setMode] = useState<UploadMode>('ap');
  const [lang, setLang] = useState<'french' | 'spanish'>('french');
  const [convId, setConvId] = useState<number>(1);
  const [turnIdx, setTurnIdx] = useState<number>(0);
  const [questionId, setQuestionId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getStoragePath = () => {
    if (mode === 'ap') {
      return `${lang}/conversation/${convId}/${turnIdx}.pcm`;
    } else {
      return `${lang}/${questionId}.pcm`;
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !supabase) return;
    setIsUploading(true);
    const path = getStoragePath();
    const bucket = mode === 'ap' ? 'ap-audio' : 'vocab-audio';
    try {
      const { error } = await supabase.storage.from(bucket).upload(path, selectedFile, { upsert: true });
      if (error) {
        setResults(prev => [...prev, { file: selectedFile.name, path, status: 'error', message: error.message }]);
      } else {
        setResults(prev => [...prev, { file: selectedFile.name, path, status: 'success' }]);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } catch (e: any) {
      setResults(prev => [...prev, { file: selectedFile.name, path, status: 'error', message: e.message }]);
    }
    setIsUploading(false);
  };

  const handleBatchUpload = async (files: FileList) => {
    if (!supabase) return;
    setIsUploading(true);
    const bucket = mode === 'ap' ? 'ap-audio' : 'vocab-audio';
    const newResults: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Expect filename pattern: {convId}_{turnIdx}.pcm or {questionId}.pcm
      const name = file.name.replace(/\.[^.]+$/, '');
      let path = '';
      if (mode === 'ap') {
        const parts = name.split('_');
        if (parts.length === 2) {
          path = `${lang}/conversation/${parts[0]}/${parts[1]}.pcm`;
        } else {
          newResults.push({ file: file.name, path: '', status: 'error', message: 'Filename must be {convId}_{turnIdx}.pcm' });
          continue;
        }
      } else {
        path = `${lang}/${name}.pcm`;
      }

      try {
        const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
        newResults.push({ file: file.name, path, status: error ? 'error' : 'success', message: error?.message });
      } catch (e: any) {
        newResults.push({ file: file.name, path, status: 'error', message: e.message });
      }
    }
    setResults(prev => [...prev, ...newResults]);
    setIsUploading(false);
  };

  return (
    <div className="min-h-screen bg-cream">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-dark/5 flex items-center justify-center">
            <Database size={20} className="text-dark/60" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold">Audio Upload Panel</h1>
            <p className="text-xs text-dark/40">Admin only — not visible to users</p>
          </div>
        </div>

        {/* Mode picker */}
        <div className="flex gap-2 mb-6">
          {(['ap', 'vocab'] as UploadMode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-5 py-2.5 rounded-full font-bold text-sm transition-all",
                mode === m ? "bg-gold text-cream" : "bg-white border border-beige-mid/20 text-dark/60 hover:border-gold/40"
              )}
            >
              {m === 'ap' ? 'AP Conversations' : 'Vocabulary'}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-beige-mid/20 p-6 shadow-sm space-y-5 mb-6">
          {/* Language */}
          <div>
            <label className="block text-sm font-bold mb-2 text-dark/60">Language</label>
            <div className="flex gap-2">
              {(['french', 'spanish'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-bold text-sm capitalize transition-all",
                    lang === l ? "bg-gold/10 text-gold border border-gold/30" : "bg-beige/30 text-dark/50 hover:bg-beige"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {mode === 'ap' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-dark/60">Conversation ID (1–20)</label>
                <input
                  type="number" min={1} max={20} value={convId}
                  onChange={e => setConvId(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-beige-mid/30 focus:outline-none focus:border-gold text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-dark/60">Turn Index (0–4)</label>
                <input
                  type="number" min={0} max={4} value={turnIdx}
                  onChange={e => setTurnIdx(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl border border-beige-mid/30 focus:outline-none focus:border-gold text-sm"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold mb-2 text-dark/60">Question UUID</label>
              <input
                type="text" value={questionId}
                onChange={e => setQuestionId(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                className="w-full px-4 py-2 rounded-xl border border-beige-mid/30 focus:outline-none focus:border-gold text-sm font-mono"
              />
            </div>
          )}

          {/* Storage path preview */}
          <div className="bg-beige/40 rounded-xl px-4 py-3">
            <p className="text-xs text-dark/40 font-bold mb-1">Storage Path</p>
            <code className="text-xs text-dark/60">{mode === 'ap' ? 'ap-audio' : 'vocab-audio'}/{getStoragePath()}</code>
          </div>

          {/* Single file upload */}
          <div>
            <label className="block text-sm font-bold mb-2 text-dark/60">Audio File (.pcm or .mp3)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pcm,.mp3,.wav"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-dark/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-bold file:bg-gold/10 file:text-gold hover:file:bg-gold/20"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full py-3 bg-gold text-cream rounded-full font-bold text-sm hover:bg-gold/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>
        </div>

        {/* Batch upload */}
        <div className="bg-white rounded-3xl border border-beige-mid/20 p-6 shadow-sm mb-6">
          <h3 className="font-serif font-bold mb-2">Batch Upload</h3>
          <p className="text-xs text-dark/40 mb-4">
            {mode === 'ap'
              ? 'Name files as {convId}_{turnIdx}.pcm — e.g. "1_0.pcm", "1_1.pcm"'
              : 'Name files as {questionId}.pcm — e.g. "550e8400-...pcm"'}
          </p>
          <input
            type="file"
            accept=".pcm,.mp3,.wav"
            multiple
            onChange={e => e.target.files && handleBatchUpload(e.target.files)}
            className="w-full text-sm text-dark/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-bold file:bg-dark/5 file:text-dark/60 hover:file:bg-dark/10"
          />
        </div>

        {/* Script reference */}
        {mode === 'ap' && (
          <div className="bg-white rounded-3xl border border-beige-mid/20 p-6 shadow-sm mb-6">
            <h3 className="font-serif font-bold mb-1">AP Conversation Scripts</h3>
            <p className="text-xs text-dark/40 mb-4">Record each line as the file shown. Click a conversation to expand its script.</p>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {SCRIPT.map(conv => (
                <div key={conv.id} className="border border-beige-mid/20 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setExpandedConv(expandedConv === conv.id ? null : conv.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-beige/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-dark/30">#{conv.id}</span>
                      <span className="font-bold text-sm">{conv.title}</span>
                    </div>
                    <ChevronDown size={14} className={cn('text-dark/30 transition-transform', expandedConv === conv.id && 'rotate-180')} />
                  </button>
                  {expandedConv === conv.id && (
                    <div className="px-4 pb-4 space-y-2">
                      {conv.turns.map((text, i) => (
                        <div key={i} className="bg-beige/30 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded">{conv.id}_{i}.pcm</code>
                            <span className="text-[10px] text-dark/30">Turn {i + 1}</span>
                          </div>
                          <p className="text-sm text-dark/70 leading-relaxed">{text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-dark/60">Upload Log</h3>
              <button onClick={() => setResults([])} className="text-xs text-dark/30 hover:text-dark/60">Clear</button>
            </div>
            {[...results].reverse().map((r, i) => (
              <div key={i} className={cn(
                "flex items-start gap-3 p-3 rounded-xl border text-sm",
                r.status === 'success' ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
              )}>
                {r.status === 'success' ? <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> : <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-bold">{r.file}</p>
                  <p className="text-dark/40 font-mono text-xs">{r.path}</p>
                  {r.message && <p className="text-red-500 text-xs mt-1">{r.message}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
