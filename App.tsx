import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, Copy, AlertTriangle, Search, Upload, Camera as CameraIcon, Loader2, Check, Pencil, Plus } from 'lucide-react';
import CameraModal from './components/CameraModal';
import { validarCPF, capitalizarNome, resizeImage } from './lib/utils';

interface Person {
  id: string;
  name: string;
  cpf: string;
  email: string;
  checked: boolean;
  validCpf: boolean;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [ocrText, setOcrText] = useState("Nenhum texto extraído ainda.");
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [invalidCpfPeople, setInvalidCpfPeople] = useState<Person[]>([]);
  const [missingCpfPeople, setMissingCpfPeople] = useState<Person[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [emailTime, setEmailTime] = useState("Bom dia");
  const [emailNames, setEmailNames] = useState("PEDRO HENRIQUE");
  const [notification, setNotification] = useState({ msg: '', isError: false, visible: false });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectOptions, setSelectOptions] = useState({
    galpao: ['MOACIR ANDRADE', 'ROBSON BRITO', 'JOSENIAS', 'LSP'],
    operador: ['MULT-PEDRO', 'GMILL-PEDRO', 'AGUIA-PEDRO', 'IDEAL-PEDRO', 'MJM-PEDRO', 'B11-PEDRO', 'MPI-PEDRO', 'ENTREVISTA-PEDRO', 'GEOLAB-PEDRO'],
    empresa: ['MULT', 'AGUIA', 'GMILL', 'IDEAL', 'MJM', 'B11', '20', 'MPI'],
    tipo: ['DIARISTA', 'MOTORISTA', 'AJUDANTE', 'VISITA', 'ENTREVISTA', 'HOMOLOGAÇÃO']
  });

  const [selectedValues, setSelectedValues] = useState({
    galpao: selectOptions.galpao[0],
    operador: selectOptions.operador[0],
    empresa: selectOptions.empresa[0],
    tipo: selectOptions.tipo[0]
  });

  const [optionModal, setOptionModal] = useState<{isOpen: boolean, group: keyof typeof selectOptions | '', mode: 'add' | 'edit', value: string}>({
    isOpen: false,
    group: '',
    mode: 'add',
    value: ''
  });

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'disabled') {
      setDarkMode(false);
      document.body.classList.add('light-mode');
    } else {
      setDarkMode(true);
      document.body.classList.remove('light-mode');
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    if (newMode) {
      localStorage.setItem('darkMode', 'enabled');
      document.body.classList.remove('light-mode');
    } else {
      localStorage.setItem('darkMode', 'disabled');
      document.body.classList.add('light-mode');
    }
  };

  const showNotification = (msg: string, isError = false) => {
    setNotification({ msg, isError, visible: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showNotification("Copiado com sucesso!");
    } catch (err) {
      showNotification("Erro ao copiar texto.", true);
    }
  };

  const handleOcrProcess = async (files: FileList | File[]) => {
    if (files.length === 0) {
      showNotification("Por favor, selecione uma ou mais imagens.", true);
      return;
    }

    setIsOcrProcessing(true);
    setOcrText("Processando imagens...");
    let allExtractedText = [];

    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      showNotification(`Processando imagem ${i + 1} de ${files.length}...`);

      if (file.size === 0) {
        allExtractedText.push(`--- IMAGEM ${i + 1} VAZIA ---`);
        continue;
      }

      let imageToSend: Blob = file;
      if (file.size > 1024 * 1024) {
        const resized = await resizeImage(file, 1200, 1200, 0.8);
        if (resized) imageToSend = resized;
      }

      const formData = new FormData();
      formData.append("apikey", "K89510033988957");
      formData.append("language", "por");
      formData.append("file", imageToSend, `image_${i}.jpg`);
      formData.append("OCREngine", "2");

      try {
        const response = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (data.IsErroredOnProcessing || !data.ParsedResults || data.ParsedResults.length === 0) {
          allExtractedText.push(`--- ERRO NA IMAGEM ${i + 1} ---`);
        } else {
          allExtractedText.push(`--- TEXTO DA IMAGEM ${i + 1} ---\n${data.ParsedResults[0].ParsedText.trim()}`);
        }
      } catch (err) {
        allExtractedText.push(`--- ERRO NA IMAGEM ${i + 1} ---`);
      }
    }

    setOcrText(allExtractedText.join("\n\n"));
    showNotification("Processamento concluído!");
    setIsOcrProcessing(false);
  };

  const handleUsePhoto = async (blob: Blob) => {
    setIsCameraOpen(false);
    await handleOcrProcess([new File([blob], "camera_photo.jpg", { type: "image/jpeg" })]);
  };

  const transferToInput = () => {
    if (ocrText && ocrText !== "Nenhum texto extraído ainda." && ocrText !== "Processando imagens...") {
      setInputText(ocrText);
      generateTable(ocrText);
      showNotification("Texto transferido para o editor!");
    } else {
      showNotification("Não há texto extraído para transferir.", true);
    }
  };

  const generateTable = (textToProcess: string = inputText) => {
    const lines = textToProcess.split("\n").map(l => l.trim()).filter(l => l !== "");
    const regexCPF = /[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2}/;
    const regexNome = /^(?:[0-9]{1,3}\s*[-–—]?\s*)?([A-ZÀ-Ýa-zà-ÿ'\´`\s]+(?:da|de|do|dos|das|e|santo|santa)?(?:\s+[A-ZÀ-Ýa-zà-ÿ'\´`\s]+)*)/;
    const regexEmail = /[\w.-]+@[\w.-]+\.\w+/;

    let currentName: string | null = null;
    let currentCPF: string | null = null;
    let currentEmail: string | null = null;
    const newPeople: Person[] = [];
    const newInvalidCpfPeople: Person[] = [];
    const newMissingCpfPeople: Person[] = [];

    const addPerson = (name: string, cpf: string | null, email: string | null) => {
      const finalCpf = cpf || '-';
      const finalEmail = email || '-';
      const isValid = finalCpf !== '-' ? validarCPF(finalCpf) : false;
      
      const person = {
        id: Math.random().toString(36).substr(2, 9),
        name: name.trim().replace(/\s+/g, ' '),
        cpf: finalCpf,
        email: finalEmail,
        checked: false,
        validCpf: isValid
      };

      if (finalCpf === '-') {
        newMissingCpfPeople.push(person);
      } else if (!isValid) {
        newInvalidCpfPeople.push(person);
      } else {
        newPeople.push(person);
      }
    };

    lines.forEach(line => {
      if (line.toUpperCase().includes("6:00 H ATE 21:00 H")) return;

      const cpfMatch = line.match(regexCPF);
      const nameMatch = line.match(regexNome);
      const emailMatch = line.match(regexEmail);

      if (nameMatch && nameMatch[1]) {
        if (currentName) {
          addPerson(currentName, currentCPF, currentEmail);
        }
        currentName = capitalizarNome(nameMatch[1].trim());
        currentCPF = null;
        currentEmail = null;
      }

      if (cpfMatch) {
        currentCPF = cpfMatch[0].replace(/[Oo]/g, '0').replace(/\D/g, '');
      }

      if (emailMatch) {
        currentEmail = emailMatch[0].toLowerCase();
      }

      if (currentName && currentCPF) {
        addPerson(currentName, currentCPF, currentEmail);
        currentName = null;
        currentCPF = null;
        currentEmail = null;
      }
    });

    if (currentName) {
      addPerson(currentName, currentCPF, currentEmail);
    }

    setPeople(newPeople);
    setInvalidCpfPeople(newInvalidCpfPeople);
    setMissingCpfPeople(newMissingCpfPeople);
  };

  const togglePersonCheck = (id: string) => {
    setPeople(prev => {
      const updated = prev.map(p => p.id === id ? { ...p, checked: !p.checked } : p);
      const unchecked = updated.filter(p => !p.checked);
      const checked = updated.filter(p => p.checked);
      return [...unchecked, ...checked];
    });
  };

  const filteredPeople = people.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const remainingCount = people.filter(p => !p.checked).length;
  const formattedList = people.filter(p => p.validCpf).map(p => `[NOME]: ${p.name} [CPF]: ${p.cpf}`).join('\n');

  const generatedEmail = `Prezados,\n\n${emailTime},\n\nEstou passando para informar que todas as pessoas mencionados na lista estão cadastradas.\nCaso a foto ou Qr code da pessoa não funcione, é necessário entrar em contato com o CCOS para fazer a correção.\n\nAtenciosamente,\n\n${emailNames.split(',').map(n => n.trim()).join('\n')}`;

  const panelClass = darkMode 
    ? "bg-zinc-900/60 border-amber-500/20 shadow-2xl" 
    : "bg-white/90 border-zinc-200 shadow-xl";
  
  const innerPanelClass = darkMode
    ? "bg-black/20 border-white/5"
    : "bg-zinc-50 border-zinc-200";

  const inputClass = darkMode
    ? "bg-zinc-950/50 border-zinc-800 text-zinc-100 focus:border-amber-500 focus:ring-amber-500/20"
    : "bg-white border-zinc-300 text-zinc-900 focus:border-amber-500 focus:ring-amber-500/20";

  const btnPrimary = "bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold shadow-lg shadow-amber-500/20 transition-all";
  const btnSecondary = darkMode 
    ? "bg-zinc-800/80 hover:bg-zinc-700 text-amber-400 border border-zinc-700/50" 
    : "bg-zinc-200 hover:bg-zinc-300 text-zinc-800 border border-zinc-300";

  const cellBoxClass = `block w-full text-left px-4 py-2.5 rounded-xl border transition-all ${
    darkMode 
      ? 'bg-black/40 border-zinc-700/50 hover:border-amber-500/50 hover:bg-zinc-800/80 shadow-inner' 
      : 'bg-white border-zinc-200 hover:border-amber-400 hover:bg-zinc-50 shadow-sm'
  }`;

  return (
    <div className="min-h-screen pb-20 selection:bg-amber-500/30">
      {/* Dark Mode Toggle */}
      <button 
        onClick={toggleDarkMode}
        className={`fixed top-4 right-4 md:top-6 md:right-6 z-40 p-3 rounded-full shadow-lg transition-all ${
          darkMode ? 'bg-zinc-800/80 text-amber-400 border border-zinc-700/50 backdrop-blur-md hover:bg-zinc-700' : 'bg-white/80 text-zinc-800 border border-zinc-200 backdrop-blur-md hover:bg-zinc-50'
        }`}
        aria-label="Toggle Dark Mode"
      >
        {darkMode ? <Sun size={24} /> : <Moon size={24} />}
      </button>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 md:pt-20">
        <div className="text-center mb-12 md:mb-16">
          <div className="relative inline-block">
            <div className={`absolute inset-0 blur-3xl rounded-full opacity-20 ${darkMode ? 'bg-amber-500' : 'bg-transparent'}`}></div>
            <img src="https://i.imgur.com/xtHJbRG.png" alt="Logo CCOS" className="relative h-32 md:h-48 mx-auto mb-6 drop-shadow-2xl object-contain" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-600 drop-shadow-sm">
            Processamento de Dados
          </h1>
        </div>

        {/* Step 1: OCR */}
        <section className={`rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 mb-8 border backdrop-blur-md ${panelClass}`}>
          <h2 className="text-xl sm:text-2xl font-bold mb-6 pb-4 border-b border-zinc-800/50 flex items-center gap-3">
            <span className="bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-black shadow-lg shadow-amber-500/20">1</span>
            <span className={darkMode ? 'text-zinc-100' : 'text-zinc-800'}>Extrair Texto de Imagem</span>
          </h2>
          
          <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${innerPanelClass}`}>
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-6">
              <button onClick={() => setIsCameraOpen(true)} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 sm:py-4 rounded-xl ${btnPrimary}`}>
                <CameraIcon size={20} /> Tirar Foto
              </button>
              
              <div className="relative flex-1 sm:flex-none">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={(e) => e.target.files && handleOcrProcess(e.target.files)}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()} 
                  className={`w-full flex items-center justify-center gap-2 px-6 py-3 sm:py-4 rounded-xl ${btnSecondary}`}
                >
                  <Upload size={20} /> Enviar Imagens
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-base sm:text-lg font-medium text-amber-400 mb-3">Texto Extraído:</h3>
              <div className="relative">
                <pre className={`p-4 rounded-xl font-mono text-xs sm:text-sm whitespace-pre-wrap max-h-60 overflow-y-auto border ${
                  darkMode ? 'bg-black/40 border-zinc-800 text-emerald-400/90' : 'bg-zinc-100 border-zinc-300 text-emerald-700'
                }`}>
                  {isOcrProcessing ? (
                    <span className="flex items-center gap-2"><Loader2 className="animate-spin" /> Processando...</span>
                  ) : ocrText}
                </pre>
              </div>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-4">
                <button onClick={() => copyToClipboard(ocrText)} className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-3 sm:py-2 rounded-xl text-sm ${btnSecondary}`}>
                  <Copy size={16} /> Copiar Texto
                </button>
                <button onClick={transferToInput} className={`flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-3 sm:py-2 rounded-xl text-sm ${btnPrimary}`}>
                  <Check size={16} /> Usar no Editor
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: Process */}
        <section className={`rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 mb-8 border backdrop-blur-md ${panelClass}`}>
          <h2 className="text-xl sm:text-2xl font-bold mb-6 pb-4 border-b border-zinc-800/50 flex items-center gap-3">
            <span className="bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-black shadow-lg shadow-amber-500/20">2</span>
            <span className={darkMode ? 'text-zinc-100' : 'text-zinc-800'}>Gerar Tabela</span>
          </h2>
          
          <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${innerPanelClass}`}>
            <textarea 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cole sua lista desorganizada aqui..."
              className={`w-full h-48 p-4 rounded-xl border focus:outline-none focus:ring-2 transition-all resize-y ${inputClass}`}
            />
            
            <button onClick={() => generateTable()} className={`mt-4 w-full sm:w-auto px-8 py-4 rounded-xl text-base sm:text-lg ${btnPrimary}`}>
              Gerar Tabela
            </button>

            {/* Quick Selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-8">
              {[
                { label: 'Galpão', id: 'galpao' as const },
                { label: 'Empresa / Operador', id: 'operador' as const },
                { label: 'Empresa', id: 'empresa' as const },
                { label: 'Tipo', id: 'tipo' as const }
              ].map(group => (
                <div key={group.id} className={`p-4 rounded-xl border flex flex-col gap-3 ${darkMode ? 'bg-black/20 border-zinc-800' : 'bg-white border-zinc-200'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <label className="text-xs sm:text-sm font-bold text-amber-500 uppercase tracking-wider leading-tight flex-1 min-w-0 break-words mt-1">{group.label}</label>
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => setOptionModal({ isOpen: true, group: group.id, mode: 'edit', value: selectedValues[group.id] })} 
                        className="p-1.5 rounded-md text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        title="Editar selecionado"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={() => setOptionModal({ isOpen: true, group: group.id, mode: 'add', value: '' })} 
                        className="p-1.5 rounded-md text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                        title="Adicionar novo"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  <select 
                    id={group.id} 
                    value={selectedValues[group.id]}
                    onChange={(e) => setSelectedValues(prev => ({ ...prev, [group.id]: e.target.value }))}
                    className={`p-2.5 rounded-lg border text-sm ${inputClass}`}
                  >
                    {selectOptions[group.id].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <button 
                    onClick={() => copyToClipboard(selectedValues[group.id])}
                    className={`py-2 px-3 rounded-lg text-xs mt-auto ${btnSecondary}`}
                  >
                    Copiar
                  </button>
                </div>
              ))}
            </div>

            {/* Table Area */}
            <div className="mt-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="relative w-full sm:w-auto flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar nome..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border ${inputClass}`}
                  />
                </div>
                <div className="text-base sm:text-lg font-medium whitespace-nowrap bg-amber-500/10 text-amber-500 px-4 py-2 rounded-xl border border-amber-500/20">
                  Restantes: <span className="font-black text-xl ml-1">{remainingCount}</span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-zinc-800 mb-8 shadow-inner">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className={darkMode ? 'bg-zinc-900 text-zinc-400 text-sm uppercase tracking-wider' : 'bg-zinc-100 text-zinc-500 text-sm uppercase tracking-wider'}>
                      <th className="p-4 border-b border-zinc-800 w-16 text-center font-semibold">Feito</th>
                      <th className="p-4 border-b border-zinc-800 font-semibold">Nome</th>
                      <th className="p-4 border-b border-zinc-800 font-semibold">CPF</th>
                      <th className="p-4 border-b border-zinc-800 font-semibold">E-mail</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm sm:text-base">
                    {filteredPeople.map(person => (
                      <tr key={person.id} className={`
                        border-b border-zinc-800/50 transition-colors
                        ${person.checked ? (darkMode ? 'bg-zinc-950/80 opacity-40' : 'bg-zinc-50 opacity-50') : (darkMode ? 'hover:bg-zinc-800/30' : 'hover:bg-zinc-50')}
                      `}>
                        <td className="p-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={person.checked}
                            onChange={() => togglePersonCheck(person.id)}
                            className="w-5 h-5 sm:w-6 sm:h-6 accent-amber-500 cursor-pointer rounded-md"
                          />
                        </td>
                        <td className="p-3">
                          <button 
                            onClick={() => copyToClipboard(person.name)}
                            className={`${cellBoxClass} ${person.checked ? 'line-through opacity-50' : ''}`}
                            disabled={person.checked}
                          >
                            {person.name}
                          </button>
                        </td>
                        <td className="p-3 relative">
                          <button 
                            onClick={() => copyToClipboard(person.cpf)}
                            className={`${cellBoxClass} ${person.checked ? 'line-through opacity-50' : ''} ${!person.validCpf ? '!border-red-500/50 !text-red-400 !bg-red-500/10' : 'font-mono'}`}
                            disabled={person.checked}
                          >
                            {person.cpf}
                          </button>
                          {!person.validCpf && (
                            <AlertTriangle className="absolute right-6 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none" size={16} title="CPF Inválido" />
                          )}
                        </td>
                        <td className="p-3">
                          <button 
                            onClick={() => copyToClipboard(person.email)}
                            className={`${cellBoxClass} ${person.checked ? 'line-through opacity-50' : ''} text-zinc-500`}
                            disabled={person.checked}
                          >
                            {person.email}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {people.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-zinc-500">Nenhum dado gerado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {invalidCpfPeople.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-base sm:text-lg font-medium text-red-400 mb-3 flex items-center gap-2">
                    <AlertTriangle size={20} /> Nomes com CPF Inválido ({invalidCpfPeople.length})
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-red-900/30">
                    <table className="w-full text-left border-collapse min-w-[500px]">
                      <thead>
                        <tr className={darkMode ? 'bg-red-950/30 text-red-400 text-sm uppercase' : 'bg-red-50 text-red-700 text-sm uppercase'}>
                          <th className="p-4 border-b border-red-900/20 font-semibold">Nome</th>
                          <th className="p-4 border-b border-red-900/20 font-semibold">CPF</th>
                          <th className="p-4 border-b border-red-900/20 font-semibold">E-mail</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm sm:text-base">
                        {invalidCpfPeople.map(person => (
                          <tr key={person.id} className={`border-b border-red-900/10 ${darkMode ? 'bg-black/20 hover:bg-red-950/20' : 'bg-white hover:bg-red-50/50'}`}>
                            <td className="p-3">
                              <button onClick={() => copyToClipboard(person.name)} className={`${cellBoxClass} !border-red-900/30 hover:!border-red-500/50`}>{person.name}</button>
                            </td>
                            <td className="p-3">
                              <button onClick={() => copyToClipboard(person.cpf)} className={`${cellBoxClass} !border-red-900/30 hover:!border-red-500/50 font-bold text-red-500 font-mono`}>{person.cpf}</button>
                            </td>
                            <td className="p-3">
                              <button onClick={() => copyToClipboard(person.email)} className={`${cellBoxClass} !border-red-900/30 hover:!border-red-500/50 text-zinc-500`}>{person.email}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {missingCpfPeople.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-base sm:text-lg font-medium text-amber-500 mb-3 flex items-center gap-2">
                    <AlertTriangle size={20} /> Nomes sem CPF ({missingCpfPeople.length})
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-amber-900/30">
                    <table className="w-full text-left border-collapse min-w-[400px]">
                      <thead>
                        <tr className={darkMode ? 'bg-amber-950/30 text-amber-400 text-sm uppercase' : 'bg-amber-50 text-amber-700 text-sm uppercase'}>
                          <th className="p-4 border-b border-amber-900/20 font-semibold">Nome</th>
                          <th className="p-4 border-b border-amber-900/20 font-semibold">E-mail</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm sm:text-base">
                        {missingCpfPeople.map(person => (
                          <tr key={person.id} className={`border-b border-amber-900/10 ${darkMode ? 'bg-black/20 hover:bg-amber-950/20' : 'bg-white hover:bg-amber-50/50'}`}>
                            <td className="p-3">
                              <button onClick={() => copyToClipboard(person.name)} className={`${cellBoxClass} !border-amber-900/30 hover:!border-amber-500/50`}>{person.name}</button>
                            </td>
                            <td className="p-3">
                              <button onClick={() => copyToClipboard(person.email)} className={`${cellBoxClass} !border-amber-900/30 hover:!border-amber-500/50 text-zinc-500`}>{person.email}</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <h3 className="text-base sm:text-lg font-medium text-amber-400 mb-3">Lista Organizada</h3>
                <pre className={`p-4 sm:p-6 rounded-xl font-mono text-xs sm:text-sm whitespace-pre-wrap max-h-60 overflow-y-auto border mb-4 ${
                  darkMode ? 'bg-black/40 border-zinc-800 text-emerald-400/90' : 'bg-zinc-100 border-zinc-300 text-emerald-700'
                }`}>
                  {formattedList || "Nenhuma lista gerada."}
                </pre>
                <button onClick={() => copyToClipboard(formattedList)} className={`w-full sm:w-auto px-8 py-4 rounded-xl text-base sm:text-lg ${btnPrimary}`}>
                  COPIAR LISTA
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: Email */}
        <section className={`rounded-2xl md:rounded-3xl p-5 sm:p-6 md:p-8 mb-8 border backdrop-blur-md ${panelClass}`}>
          <h2 className="text-xl sm:text-2xl font-bold mb-6 pb-4 border-b border-zinc-800/50 flex items-center gap-3">
            <span className="bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-950 w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-base font-black shadow-lg shadow-amber-500/20">3</span>
            <span className={darkMode ? 'text-zinc-100' : 'text-zinc-800'}>Resposta Rápida</span>
          </h2>
          
          <div className={`rounded-xl sm:rounded-2xl p-4 sm:p-6 border ${innerPanelClass} flex flex-col gap-6`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-amber-500 uppercase tracking-wider">Horário do dia:</label>
                <select 
                  value={emailTime}
                  onChange={(e) => setEmailTime(e.target.value)}
                  className={`p-3.5 rounded-xl border ${inputClass}`}
                >
                  <option value="Bom dia">Bom dia</option>
                  <option value="Boa tarde">Boa tarde</option>
                  <option value="Boa noite">Boa noite</option>
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-amber-500 uppercase tracking-wider">Nomes (separados por vírgula):</label>
                <input 
                  type="text"
                  value={emailNames}
                  onChange={(e) => setEmailNames(e.target.value)}
                  placeholder="Ex: PEDRO HENRIQUE, ANDRESSA CAMILLO"
                  className={`p-3.5 rounded-xl border ${inputClass}`}
                />
              </div>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-medium text-amber-400 mb-3">E-mail Gerado:</h3>
              <pre className={`p-4 sm:p-6 rounded-xl font-mono text-xs sm:text-sm whitespace-pre-wrap border mb-4 ${
                darkMode ? 'bg-black/40 border-zinc-800 text-emerald-400/90' : 'bg-zinc-100 border-zinc-300 text-emerald-700'
              }`}>
                {generatedEmail}
              </pre>
              <button onClick={() => copyToClipboard(generatedEmail)} className={`w-full sm:w-auto px-8 py-4 rounded-xl text-base sm:text-lg ${btnPrimary}`}>
                Copiar E-mail
              </button>
            </div>
          </div>
        </section>
      </div>

      <CameraModal 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onUsePhoto={handleUsePhoto}
        showNotification={showNotification}
      />

      {/* Option Edit Modal */}
      {optionModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-sm rounded-2xl p-6 border shadow-2xl ${darkMode ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
            <h3 className="text-lg font-bold mb-4 text-amber-500">
              {optionModal.mode === 'add' ? 'Adicionar Nova Opção' : 'Editar Opção'}
            </h3>
            <input
              type="text"
              value={optionModal.value}
              onChange={(e) => setOptionModal(prev => ({ ...prev, value: e.target.value }))}
              className={`w-full p-3 rounded-xl border mb-6 ${inputClass}`}
              placeholder="Digite o nome..."
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setOptionModal({ ...optionModal, isOpen: false })}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium ${btnSecondary}`}
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (!optionModal.value.trim()) return;
                  const group = optionModal.group as keyof typeof selectOptions;
                  const newValue = optionModal.value.trim();
                  
                  if (optionModal.mode === 'add') {
                    setSelectOptions(prev => ({ ...prev, [group]: [...prev[group], newValue] }));
                  } else {
                    const oldValue = selectedValues[group];
                    setSelectOptions(prev => ({
                      ...prev,
                      [group]: prev[group].map(opt => opt === oldValue ? newValue : opt)
                    }));
                  }
                  setSelectedValues(prev => ({ ...prev, [group]: newValue }));
                  setOptionModal({ ...optionModal, isOpen: false });
                  showNotification(optionModal.mode === 'add' ? "Opção adicionada!" : "Opção atualizada!");
                }}
                className={`px-5 py-2.5 rounded-xl text-sm ${btnPrimary}`}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Toast */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-xl text-white font-medium transition-all duration-300 z-50 flex items-center gap-2 ${
        notification.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      } ${notification.isError ? 'bg-red-500' : 'bg-emerald-500'}`}>
        {notification.isError ? <AlertTriangle size={20} /> : <Check size={20} />}
        {notification.msg}
      </div>
    </div>
  );
}
