import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Trash2,
  RefreshCw,
  Plus,
  BookOpen,
  ArrowRight,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useNotification } from '../context/NotificationContext.js';
import { Material, Subject } from '../types/index.js';

export const MaterialsView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subjectIdParam = searchParams.get('subjectId');

  const { t } = useLanguage();
  const { showToast } = useNotification();

  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjectIdParam || '');
  const [loading, setLoading] = useState<boolean>(true);

  // Upload state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const res = await api.getMaterials(selectedSubjectId || undefined);
      setMaterials(res.materials || []);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getSubjects().then((res) => {
      setSubjects(res.subjects || []);
      if (!selectedSubjectId && res.subjects?.length > 0) {
        setSelectedSubjectId(res.subjects[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedSubjectId) {
      fetchMaterials();
    }
  }, [selectedSubjectId]);

  const handleFileUpload = async (file: File) => {
    if (!selectedSubjectId) {
      showToast('Please select a subject for this document first.', 'error');
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.doc', '.pptx', '.ppt', '.txt', '.md', '.png', '.jpg', '.jpeg', '.webp'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidExt) {
      showToast('Invalid format. Please upload PDF, DOCX, PPTX, TXT, MD, or Note Photos (PNG, JPG, WEBP).', 'error');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      showToast('File size exceeds the 25MB limit.', 'error');
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('subjectId', selectedSubjectId);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    const interval = setInterval(() => {
      setUploadProgress((p) => (p < 85 ? p + 15 : p));
    }, 200);

    try {
      await api.uploadMaterial(formData);
      clearInterval(interval);
      setUploadProgress(100);
      showToast('File uploaded and AI indexed successfully! Ready to study.', 'success');
      fetchMaterials();
    } catch (err: any) {
      clearInterval(interval);
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 600);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm(t.materials.deleteConfirm)) return;

    try {
      await api.deleteMaterial(id);
      showToast('Material deleted', 'success');
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleReprocess = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      showToast('Reprocessing document chunks and embeddings...', 'info');
      await api.reprocessMaterial(id);
      showToast('Reprocessing completed!', 'success');
      fetchMaterials();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.materials.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload course slides and textbooks. AI parses text, detects sections, and indexes for instant RAG answers.
          </p>
        </div>

        {/* Subject filter selector */}
        {subjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Subject:</span>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-8 sm:p-10 rounded-3xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 relative overflow-hidden ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-blue-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm">
          <UploadCloud className="w-7 h-7" />
        </div>

        <div>
          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t.materials.dragDrop}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {t.materials.supportedFormats}
          </div>
        </div>

        <button
          type="button"
          className="mt-1 px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-sm"
        >
          {t.materials.browseFiles}
        </button>

        {/* Upload Progress Bar Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 z-10 animate-in fade-in">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 mb-3 animate-spin">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white mb-2">
              {uploadProgress < 70 ? t.materials.uploading : t.materials.processing}
            </div>
            <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="text-xs text-slate-400 mt-2 font-mono">{uploadProgress}%</div>
          </div>
        )}
      </div>

      {/* Materials List */}
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          Uploaded Study Documents ({materials.length})
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="p-10 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
            No study materials uploaded for this subject yet. Drag a PDF or lecture file above to begin!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/materials/${m.id}`)}
                className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        {m.file_type}
                      </span>
                      {m.status === 'ready' && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t.materials.ready}
                        </span>
                      )}
                      {m.status === 'processing' && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          {t.materials.processing}
                        </span>
                      )}
                      {m.status === 'failed' && (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-500">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {t.materials.failed}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleReprocess(e, m.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Reprocess document"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, m.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                        title="Delete material"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {m.title}
                  </h3>
                  <div className="text-xs text-slate-400 truncate mt-0.5">{m.filename}</div>

                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-3">
                    <span>{(m.file_size / 1024).toFixed(0)} KB</span>
                    <span>•</span>
                    <span>{m.chunk_count} AI Chunks Indexed</span>
                  </div>
                </div>

                {/* Quick actions row */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/materials/${m.id}?tab=summary`);
                      }}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 transition-colors"
                    >
                      {t.materials.viewSummary}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/ask-ai?materialId=${m.id}`);
                      }}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      {t.materials.askAi}
                    </button>
                  </div>

                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    Study <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
