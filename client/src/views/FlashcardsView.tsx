import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import {
  Layers,
  Sparkles,
  RotateCw,
  Bookmark,
  Plus,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Trash2,
  X,
  Keyboard,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { FlashcardDeck, Flashcard, Material } from '../types/index.js';

export const FlashcardsView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const deckIdParam = searchParams.get('deckId');
  const materialIdParam = searchParams.get('materialId');

  const { t } = useLanguage();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [dueOnly, setDueOnly] = useState(false);
  const [isDeckFinished, setIsDeckFinished] = useState(false);

  // Modals
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState(materialIdParam || '');
  const [cardCount, setCardCount] = useState(8);
  const [isGenerating, setIsGenerating] = useState(false);

  // Custom card form
  const [customCard, setCustomCard] = useState({ front: '', back: '', topic: '', hint: '' });

  const fetchDecks = async () => {
    try {
      const res = await api.getDecks();
      setDecks(res.decks || []);
      if (res.decks && res.decks.length > 0) {
        const targetDeck = deckIdParam
          ? res.decks.find((d: any) => d.id === deckIdParam) || res.decks[0]
          : res.decks[0];
        loadDeck(targetDeck.id);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const loadDeck = async (id: string) => {
    try {
      const res = await api.getDeck(id, dueOnly);
      setActiveDeck(res.deck);
      setCards(res.cards || []);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setIsDeckFinished(false);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  useEffect(() => {
    fetchDecks();
    api.getMaterials().then((res) => setMaterials(res.materials || []));
  }, []);

  useEffect(() => {
    if (activeDeck) {
      loadDeck(activeDeck.id);
    }
  }, [dueOnly]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isGenerateModalOpen || isAddCardModalOpen) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === 'ArrowRight' && currentCardIndex < cards.length - 1) {
        setCurrentCardIndex((i) => i + 1);
        setIsFlipped(false);
      } else if (e.key === 'ArrowLeft' && currentCardIndex > 0) {
        setCurrentCardIndex((i) => i - 1);
        setIsFlipped(false);
      } else if (isFlipped) {
        if (e.key === '1') handleRate('again');
        if (e.key === '2') handleRate('hard');
        if (e.key === '3') handleRate('good');
        if (e.key === '4') handleRate('easy');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentCardIndex, cards.length, isGenerateModalOpen, isAddCardModalOpen]);

  const handleRate = async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    const card = cards[currentCardIndex];
    if (!card) return;

    try {
      await api.reviewFlashcard(card.id, rating);
      showToast(`Review logged! Next interval: SM-2 spaced schedule`, 'success');

      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex((i) => i + 1);
        setIsFlipped(false);
      } else {
        setIsDeckFinished(true);
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleBookmark = async (cardId: string) => {
    try {
      const res = await api.bookmarkFlashcard(cardId);
      setCards((prev) =>
        prev.map((c) => (c.id === cardId ? { ...c, is_bookmarked: res.isBookmarked ? 1 : 0 } : c))
      );
      showToast(res.isBookmarked ? 'Card bookmarked' : 'Bookmark removed', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMaterialId) return;

    setIsGenerating(true);
    try {
      const res = await api.generateFlashcards({
        materialId: selectedMaterialId,
        count: cardCount,
      });
      showToast('Flashcard deck generated with SM-2 spaced repetition!', 'success');
      setIsGenerateModalOpen(false);
      fetchDecks();
      if (res.deck) loadDeck(res.deck.id);
    } catch (err: any) {
      showToast(err.message || 'Generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddCustomCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !customCard.front.trim() || !customCard.back.trim()) return;

    try {
      await api.addFlashcard({
        deckId: activeDeck.id,
        ...customCard,
      });
      showToast('Card added to deck', 'success');
      setIsAddCardModalOpen(false);
      setCustomCard({ front: '', back: '', topic: '', hint: '' });
      loadDeck(activeDeck.id);
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const currentCard = cards[currentCardIndex];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.flashcards.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Master definitions and formulas with 3D interactive flip cards and SM-2 spaced repetition.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Cards with AI</span>
          </button>
          {activeDeck && (
            <button
              onClick={() => setIsAddCardModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs hover:bg-slate-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Card</span>
            </button>
          )}
        </div>
      </div>

      {/* Deck Selector & Due Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Deck:</span>
          <select
            value={activeDeck?.id || ''}
            onChange={(e) => loadDeck(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.total_cards || 0} cards)
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDueOnly(!dueOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              dueOnly
                ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t.flashcards.dueToday} Only ({activeDeck?.due_cards || 0})
          </button>
        </div>
      </div>

      {/* Flashcard Practice Arena */}
      {cards.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <Layers className="w-12 h-12 text-amber-500 mx-auto" />
          <div className="font-bold text-slate-800 dark:text-slate-200 text-base">
            {dueOnly ? t.flashcards.deckFinished : 'No flashcards in this deck.'}
          </div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Generate flashcards from your uploaded study materials or add custom question-and-answer cards.
          </p>
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
          >
            Generate Cards with AI
          </button>
        </div>
      ) : isDeckFinished ? (
        <div className="p-12 text-center rounded-3xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 border border-indigo-100 dark:border-slate-800 space-y-4">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">
            {t.flashcards.deckFinished}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
            Your spaced repetition schedule has updated intervals for these cards. Take a well-deserved break or practice with a quiz!
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setCurrentCardIndex(0);
                setIsFlipped(false);
                setIsDeckFinished(false);
              }}
              className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs"
            >
              Review Deck Again
            </button>
            <button
              onClick={() => navigate('/quizzes')}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700"
            >
              Take Practice Quiz
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Card Progress Indicator */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>
              Card {currentCardIndex + 1} of {cards.length}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                {currentCard?.topic || 'Core Concept'}
              </span>
              <button
                onClick={() => handleToggleBookmark(currentCard.id)}
                className={`p-1 rounded-lg ${
                  currentCard?.is_bookmarked
                    ? 'text-amber-500 fill-amber-500'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Bookmark card"
              >
                <Bookmark className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3D Flip Card */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 h-80 sm:h-96 w-full cursor-pointer select-none group"
          >
            <div
              className={`relative w-full h-full rounded-3xl shadow-xl transition-transform duration-500 transform-style-3d border border-slate-200/80 dark:border-slate-800 ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* Card FRONT */}
              <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-900 rounded-3xl p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Question / Prompt</span>
                  <span className="text-blue-500 flex items-center gap-1 font-normal">
                    <RotateCw className="w-3.5 h-3.5" />
                    Click to flip
                  </span>
                </div>

                <div className="text-center my-auto">
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-relaxed">
                    {currentCard?.front}
                  </div>
                  {currentCard?.hint && (
                    <div className="mt-4 text-xs text-slate-400 italic">
                      💡 Hint: {currentCard.hint}
                    </div>
                  )}
                </div>

                <div className="text-center text-[11px] text-slate-400">
                  {t.flashcards.flipPrompt}
                </div>
              </div>

              {/* Card BACK */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-blue-50/80 via-white to-indigo-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 rounded-3xl p-8 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span>Answer / Explanation</span>
                  <span className="text-slate-400 flex items-center gap-1 font-normal">
                    <RotateCw className="w-3.5 h-3.5" />
                    Flip back
                  </span>
                </div>

                <div className="text-center my-auto overflow-y-auto max-h-48 pr-1">
                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                    {currentCard?.back}
                  </div>
                </div>

                <div className="text-center text-[11px] text-slate-400 font-mono">
                  Current Interval: {currentCard?.interval || 0}d • Reps: {currentCard?.repetition || 0}
                </div>
              </div>
            </div>
          </div>

          {/* SM-2 Spaced Repetition Rating Buttons */}
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              <button
                onClick={() => handleRate('again')}
                className="py-3 px-2 rounded-2xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs sm:text-sm border border-rose-200 dark:border-rose-800/80 transition-all flex flex-col items-center gap-0.5"
              >
                <span>Again</span>
                <span className="text-[10px] font-normal opacity-80">(1d) [1]</span>
              </button>

              <button
                onClick={() => handleRate('hard')}
                className="py-3 px-2 rounded-2xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm border border-amber-200 dark:border-amber-800/80 transition-all flex flex-col items-center gap-0.5"
              >
                <span>Hard</span>
                <span className="text-[10px] font-normal opacity-80">(2-3d) [2]</span>
              </button>

              <button
                onClick={() => handleRate('good')}
                className="py-3 px-2 rounded-2xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-bold text-xs sm:text-sm border border-blue-200 dark:border-blue-800/80 transition-all flex flex-col items-center gap-0.5"
              >
                <span>Good</span>
                <span className="text-[10px] font-normal opacity-80">(6d+) [3]</span>
              </button>

              <button
                onClick={() => handleRate('easy')}
                className="py-3 px-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm border border-emerald-200 dark:border-emerald-800/80 transition-all flex flex-col items-center gap-0.5"
              >
                <span>Easy</span>
                <span className="text-[10px] font-normal opacity-80">(Bonus) [4]</span>
              </button>
            </div>

            {/* Navigation and Keyboard hints */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
              <button
                onClick={() => {
                  if (currentCardIndex > 0) {
                    setCurrentCardIndex(currentCardIndex - 1);
                    setIsFlipped(false);
                  }
                }}
                disabled={currentCardIndex === 0}
                className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <div className="hidden sm:flex items-center gap-1.5 text-[11px]">
                <Keyboard className="w-3.5 h-3.5" />
                <span>{t.flashcards.keyboardTips}</span>
              </div>

              <button
                onClick={() => {
                  if (currentCardIndex < cards.length - 1) {
                    setCurrentCardIndex(currentCardIndex + 1);
                    setIsFlipped(false);
                  }
                }}
                disabled={currentCardIndex >= cards.length - 1}
                className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generate Flashcards with AI Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                Generate Flashcards with AI
              </h3>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Source Study Material *
                </label>
                <select
                  required
                  value={selectedMaterialId}
                  onChange={(e) => setSelectedMaterialId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">Select a document...</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title} ({m.file_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Number of Cards
                </label>
                <select
                  value={cardCount}
                  onChange={(e) => setCardCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value={5}>5 High-Yield Cards</option>
                  <option value={8}>8 Comprehensive Cards</option>
                  <option value={15}>15 Complete Topic Cards</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isGenerating || !selectedMaterialId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Flashcard Modal */}
      {isAddCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Add Custom Flashcard
              </h3>
              <button
                onClick={() => setIsAddCardModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCustomCard} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Front (Question / Prompt) *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. What is LL(1) parsing?"
                  value={customCard.front}
                  onChange={(e) => setCustomCard({ ...customCard, front: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Back (Answer) *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. A top-down parsing technique using 1 lookahead token..."
                  value={customCard.back}
                  onChange={(e) => setCustomCard({ ...customCard, back: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Parsing"
                    value={customCard.topic}
                    onChange={(e) => setCustomCard({ ...customCard, topic: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Hint (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Top-down"
                    value={customCard.hint}
                    onChange={(e) => setCustomCard({ ...customCard, hint: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddCardModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
