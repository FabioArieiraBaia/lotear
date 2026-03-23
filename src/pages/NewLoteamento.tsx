import React, { useState, useEffect } from 'react';
import { resolveUrl } from '../utils/url';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(import.meta.env.BASE_URL + 'pdf.worker.min.js', window.location.origin).href;

export default function NewLoteamento() {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/admin/login');
    }
  }, [navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const isPdfFile = selected.type === 'application/pdf' || selected.name.toLowerCase().endsWith('.pdf');
      setIsPdf(isPdfFile);

      if (isPdfFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const typedarray = new Uint8Array(e.target?.result as ArrayBuffer);
          try {
            const pdf = await pdfjs.getDocument(resolveUrl(typedarray)).promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              await page.render({ canvasContext: context, viewport, canvas } as any).promise;
              setPreview(canvas.toDataURL());
            }
          } catch (err) {
            console.error("Error generating PDF preview:", err);
          }
        };
        reader.readAsArrayBuffer(selected);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(selected);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !file) {
      setError("Preencha o nome e selecione um arquivo.");
      return;
    }

    setLoading(true);
    setError(null);

    const token = localStorage.getItem('adminToken');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('image', file);

      const response = await fetch(import.meta.env.BASE_URL + 'api/loteamentos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('adminToken');
          navigate('/admin/login');
          return;
        }
        const errText = await response.text();
        throw new Error(`Erro do servidor: ${errText}`);
      }

      const data = await response.json();
      navigate(`/admin/loteamento/${data.id}`);
    } catch (err: any) {
      console.error("Error creating loteamento:", err);
      setError(err.message || "Ocorreu um erro ao processar a planta.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <Link to="/admin" className="inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800 font-medium">
          <ArrowLeft className="w-4 h-4" />
          Voltar para Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Novo Loteamento</h2>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Loteamento
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Ex: Residencial das Flores"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Planta do Loteamento (Imagem ou PDF)
            </label>
            
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors relative overflow-hidden group">
              {preview ? (
                <div className="absolute inset-0 w-full h-full">
                  {isPdf ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-gray-50">
                      <img src={preview} alt="PDF Preview" className="h-full object-contain" />
                      <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded">PDF</div>
                    </div>
                  ) : (
                    <img src={preview} alt="Preview" className="w-full h-full object-contain" />
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white font-medium flex items-center gap-2">
                      <UploadCloud className="w-5 h-5" /> Trocar arquivo
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <span className="relative cursor-pointer bg-white rounded-md font-medium text-emerald-600 hover:text-emerald-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-emerald-500">
                      Fazer upload de um arquivo
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, PDF até 20MB</p>
                </div>
              )}
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                required={!preview && !isPdf}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file || !name}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Criando Loteamento...
              </>
            ) : (
              'Criar Loteamento'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
