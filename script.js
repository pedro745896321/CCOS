// Variáveis globais para a câmera
let currentStream;
let photoTakenBlob; // Para armazenar o blob da imagem capturada

// --- FUNÇÕES DA CÂMERA ---
function openCameraModal() {
    console.log("Abrindo modal da câmera.");
    document.getElementById('cameraModal').style.display = 'block';
    startCamera();
}

function closeCameraModal() {
    console.log("Fechando modal da câmera.");
    document.getElementById('cameraModal').style.display = 'none';
    stopCamera();
    resetCameraControls();
}

async function startCamera() {
    console.log("Iniciando câmera...");
    const video = document.getElementById('camera-feed');
    const takePhotoButton = document.getElementById('take-photo-button');
    const retryPhotoButton = document.getElementById('retry-photo-button');
    const usePhotoButton = document.getElementById('use-photo-button');
    const photoCanvas = document.getElementById('photo-canvas');
    const context = photoCanvas.getContext('2d');

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = currentStream;
        await video.play(); // Usar await para garantir que o vídeo comece a tocar
        console.log("Câmera iniciada com sucesso.");

        takePhotoButton.style.display = 'inline-block';
        retryPhotoButton.style.display = 'none';
        usePhotoButton.style.display = 'none';
        video.style.display = 'block';
        photoCanvas.style.display = 'none';

    } catch (err) {
        console.error("Erro ao acessar a câmera: ", err);
        alert("Não foi possível acessar a câmera. Verifique as permissões ou se há outra aplicação usando-a. Erro: " + err.name + " - " + err.message);
        closeCameraModal();
    }
}

function stopCamera() {
    console.log("Parando câmera...");
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        console.log("Câmera parada.");
    }
}

function takePhoto() {
    console.log("Tirando foto...");
    const video = document.getElementById('camera-feed');
    const photoCanvas = document.getElementById('photo-canvas');
    const context = photoCanvas.getContext('2d');

    photoCanvas.width = video.videoWidth;
    photoCanvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);

    // --- Pré-processamento: Converter para tons de cinza ---
    const imageData = context.getImageData(0, 0, photoCanvas.width, photoCanvas.height);
    const pixels = imageData.data;
    for (let i = 0; i < pixels.length; i += 4) {
        const lightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
        pixels[i] = lightness;
        pixels[i + 1] = lightness;
        pixels[i + 2] = lightness;
    }
    context.putImageData(imageData, 0, 0);
    console.log("Imagem convertida para tons de cinza no canvas.");

    video.style.display = 'none';
    photoCanvas.style.display = 'block';

    document.getElementById('take-photo-button').style.display = 'none';
    document.getElementById('retry-photo-button').style.display = 'inline-block';
    document.getElementById('use-photo-button').style.display = 'inline-block';

    photoCanvas.toBlob((blob) => {
        if (blob) {
            photoTakenBlob = blob;
            console.log("Foto capturada e convertida para Blob. Tamanho:", blob.size, "bytes");
        } else {
            console.error("Erro: Blob da foto é nulo.");
        }
    }, 'image/jpeg', 0.95);
}

function retryPhoto() {
    console.log("Tentando tirar foto novamente.");
    startCamera();
    document.getElementById('photo-canvas').style.display = 'none';
    document.getElementById('camera-feed').style.display = 'block';
    document.getElementById('take-photo-button').style.display = 'inline-block';
    document.getElementById('retry-photo-button').style.display = 'none';
    document.getElementById('use-photo-button').style.display = 'none';
    photoTakenBlob = null;
}

// Função para redimensionar e pré-processar a imagem (com tons de cinza)
async function resizeImage(fileBlob, maxWidth = 1200, maxHeight = 1200, quality = 0.9) {
    console.log("Iniciando redimensionamento/pré-processamento de imagem. Tamanho original:", fileBlob.size, "bytes");
    return new Promise((resolve) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (e) => {
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // --- Pré-processamento: Converter para tons de cinza ---
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;
                for (let i = 0; i < pixels.length; i += 4) {
                    const lightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
                    pixels[i] = lightness;
                    pixels[i + 1] = lightness;
                    pixels[i + 2] = lightness;
                }
                ctx.putImageData(imageData, 0, 0);
                console.log("Imagem redimensionada e convertida para tons de cinza no canvas.");

                canvas.toBlob((blob) => {
                    if (blob) {
                        console.log("Blob redimensionado gerado. Tamanho final:", blob.size, "bytes");
                        resolve(blob);
                    } else {
                        console.error("Erro: Blob redimensionado é nulo.");
                        resolve(null); // Resolve com null em caso de erro na geração do blob
                    }
                }, 'image/jpeg', quality);
            };
        };
        reader.readAsDataURL(fileBlob);
    });
}

async function usePhoto() {
    console.log("Usando foto para OCR...");
    if (!photoTakenBlob) {
        alert("Nenhuma foto foi capturada.");
        console.error("Erro: photoTakenBlob é nulo ao tentar usar a foto.");
        return;
    }

    closeCameraModal();

    const ocrSpinner = document.getElementById('ocr-spinner');
    const extractButton = document.querySelector('button[onclick="enviarImagemOCR()"]');
    extractButton.disabled = true;
    ocrSpinner.style.display = 'inline-block';
    showNotification("Enviando foto para OCR...", false);
    console.log("Spinner ativado e botão desativado para OCR da câmera.");

    let imageToSend = photoTakenBlob;

    if (photoTakenBlob.size > 1024 * 1024) { // 1MB em bytes
        showNotification("Redimensionando imagem para envio...", false);
        console.log("Imagem da câmera > 1MB. Redimensionando...");
        imageToSend = await resizeImage(photoTakenBlob, 1200, 1200, 0.9);
        if (!imageToSend) {
            showNotification("Falha ao redimensionar a imagem.", true);
            extractButton.disabled = false;
            ocrSpinner.style.display = 'none';
            console.error("Erro: Falha no redimensionamento da imagem da câmera.");
            return;
        }
        console.log("Redimensionamento da imagem da câmera concluído. Novo tamanho:", imageToSend.size, "bytes");
    } else {
        console.log("Imagem da câmera <= 1MB. Sem redimensionamento necessário. Tamanho:", imageToSend.size, "bytes");
    }

    const formData = new FormData();
    formData.append("apikey", "K89510033988957"); // Considere obter sua própria chave API
    formData.append("language", "por");
    formData.append("file", imageToSend, "camera_photo.jpg");
    formData.append("OCREngine", "2"); // Tente OCREngine=1 se persistir o erro

    console.log("FormData para OCR da câmera preparado.");
    console.log("Verificando se o arquivo está no FormData:", formData.get('file') ? "Sim" : "Não");
    if (formData.get('file')) {
        console.log("Nome do arquivo no FormData:", formData.get('file').name);
        console.log("Tipo do arquivo no FormData:", formData.get('file').type);
        console.log("Tamanho do arquivo no FormData:", formData.get('file').size, "bytes");
    }


    try {
        console.log("Iniciando requisição fetch (câmera) para OCR.space...");
        const resposta = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: formData,
        });
        console.log("Resposta do fetch (câmera) recebida. Status:", resposta.status, resposta.statusText);
        const dados = await resposta.json();
        console.log("Dados do OCR (câmera) recebidos:", dados);

        if (dados.IsErroredOnProcessing || !dados.ParsedResults || dados.ParsedResults.length === 0) {
            const errorMessage = dados.ErrorMessage ? dados.ErrorMessage.join(". ") : "Ocorreu um erro desconhecido no OCR.";
            showNotification("Erro ao processar a imagem: " + errorMessage, true);
            console.error("Erro de processamento OCR (câmera):", dados);
            return;
        }

        const textoExtraido = dados.ParsedResults[0].ParsedText;
        document.getElementById("input-lista").value = textoExtraido;
        gerarTabela();
        showNotification("Texto extraído com sucesso!", false);
        console.log("Texto OCR (câmera) extraído com sucesso:", textoExtraido);

    } catch (erro) {
        console.error("Falha fatal na requisição OCR (câmera):", erro);
        showNotification("Falha na requisição OCR: " + erro.message, true);
    } finally {
        extractButton.disabled = false;
        ocrSpinner.style.display = 'none';
        console.log("Finalizado processo OCR da câmera. Spinner desativado.");
    }
}

function resetCameraControls() {
    console.log("Resetando controles da câmera.");
    document.getElementById('take-photo-button').style.display = 'inline-block';
    document.getElementById('retry-photo-button').style.display = 'none';
    document.getElementById('use-photo-button').style.display = 'none';
    document.getElementById('camera-feed').style.display = 'block';
    document.getElementById('photo-canvas').style.display = 'none';
    photoTakenBlob = null;
}

document.getElementById('take-photo-button').addEventListener('click', takePhoto);
document.getElementById('retry-photo-button').addEventListener('click', retryPhoto);
document.getElementById('use-photo-button').addEventListener('click', usePhoto);


// --- FUNÇÕES DE LÓGICA E MANIPULAÇÃO DA TABELA (Originais mantidas e aprimoradas) ---

function updateNomeCount() {
    const totalNomes = document.querySelectorAll("#tabela-gerada tr").length;
    const nomesConcluidos = document.querySelectorAll("#tabela-gerada input[type='checkbox']:checked").length;
    const nomesRestantes = totalNomes - nomesConcluidos;
    document.getElementById("contador-nomes").textContent = nomesRestantes;
}

function validarCPF(cpf) {
    cpf = cpf.replace(/\D/g, ''); // Garante que só há números aqui

    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const calcDigito = (base, peso) => {
        let soma = 0;
        for (let i = 0; i < base.length; i++) {
            soma += parseInt(base.charAt(i)) * (peso - i);
        }
        let resto = (soma * 10) % 11;
        return (resto === 10 || resto === 11) ? 0 : resto;
    };

    const digito1 = calcDigito(cpf.substring(0, 9), 10);
    const digito2 = calcDigito(cpf.substring(0, 9) + digito1, 11);

    return cpf.endsWith(`${digito1}${digito2}`);
}

function gerarTabela() {
    console.log("Gerando tabela a partir do input-lista...");
    const inputText = document.getElementById("input-lista").value;
    const linhas = inputText.split("\n").map(l => l.trim()).filter(l => l !== "");

    const listaFormatada = [];
    const nomesSemCPF = [];
    const tabela = document.getElementById("tabela-gerada");
    tabela.innerHTML = ""; // Limpa a tabela existente

    const regexCPF = /[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2}/;
    const regexNome = /^(?:[0-9]{1,2}\s*-\s*)?([A-ZÀ-Ýa-zà-ÿ'´`]+\s+[A-ZÀ-Ýa-zà-ÿ'´`]+(?:(?:\s+|,\s*)[A-ZÀ-Ýa-zà-ÿ'´`]+)*)/;
    const regexEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

    let nomeEncontrado = "";
    let cpfEncontrado = "";
    let emailEncontrado = "-";

    linhas.forEach(linha => {
        if (linha.toUpperCase().includes("6:00 H ATE 21:00 H")) {
            return;
        }

        const cpfsMatch = linha.match(regexCPF);
        if (cpfsMatch) {
            cpfEncontrado = cpfsMatch[0].replace(/[Oo]/g, '0').replace(/\D/g, '');
        }

        const nomesMatch = linha.match(regexNome);
        if (nomesMatch && nomesMatch[1]) {
            nomeEncontrado = capitalizarNome(nomesMatch[1].trim());
        }

        const emailMatch = linha.match(regexEmail);
        if (emailMatch) {
            emailEncontrado = emailMatch[0];
        }

        if (nomeEncontrado && cpfEncontrado) {
            adicionarNaTabela(nomeEncontrado, cpfEncontrado, emailEncontrado);

            if (validarCPF(cpfEncontrado)) {
                listaFormatada.push(`[NOME]: ${nomeEncontrado} [CPF]: ${cpfEncontrado}`);
            } else {
                nomesSemCPF.push(`${nomeEncontrado} (CPF Inválido: ${cpfEncontrado})`);
            }

            nomeEncontrado = "";
            cpfEncontrado = "";
            emailEncontrado = "-";
        }
    });

    if (nomeEncontrado && !cpfEncontrado) {
        nomesSemCPF.push(nomeEncontrado);
        adicionarNaTabela(nomeEncontrado, 'Não Detectado', emailEncontrado);
    }

    document.getElementById("output-lista").textContent = listaFormatada.join("\n");
    updateNomeCount();

    if (nomesSemCPF.length > 0) {
        alert("Os seguintes nomes não contêm CPF válido ou detectável (ou foram ignorados):\n" + nomesSemCPF.join("\n"));
    }
    console.log("Tabela gerada. Nomes sem CPF:", nomesSemCPF);
}

function capitalizarNome(nome) {
    return nome.split(" ").map(p => {
        const lower = p.toLowerCase();
        if (['da', 'de', 'do', 'dos', 'das', 'e', 'santo', 'santa'].includes(lower)) {
            return lower;
        }
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    }).join(" ");
}

function adicionarNaTabela(nome, cpf, email) {
    let tabela = document.getElementById("tabela-gerada");
    const cpfValido = validarCPF(cpf);
    const classeCPF = cpfValido ? "" : "cpf-invalido";
    const titleCPF = cpfValido ? "" : "CPF inválido!";

    const tr = document.createElement("tr");

    const tdCheckbox = document.createElement("td");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    tdCheckbox.appendChild(checkbox);
    tr.appendChild(tdCheckbox);

    const tdNome = document.createElement("td");
    const btnNome = document.createElement("button");
    btnNome.onclick = () => copiarTexto(nome);
    btnNome.textContent = nome || '-';
    tdNome.appendChild(btnNome);
    tr.appendChild(tdNome);

    const tdCPF = document.createElement("td");
    tdCPF.classList.add(classeCPF);
    tdCPF.setAttribute('title', titleCPF);
    const btnCPF = document.createElement("button");
    btnCPF.onclick = () => copiarTexto(cpf);
    btnCPF.textContent = cpf || '-';
    tdCPF.appendChild(btnCPF);
    tr.appendChild(tdCPF);

    const tdEmail = document.createElement("td");
    const btnEmail = document.createElement("button");
    btnEmail.onclick = () => copiarTexto(email);
    btnEmail.textContent = email || '-';
    tdEmail.appendChild(btnEmail);
    tr.appendChild(tdEmail);

    tabela.appendChild(tr);
    console.log(`Adicionado à tabela: Nome: ${nome}, CPF: ${cpf}, Email: ${email}`);
}

function filtrarTabela() {
    const termo = document.getElementById("pesquisa").value.toLowerCase();
    const linhas = document.getElementById("tabela-gerada").getElementsByTagName("tr");

    for (let i = 0; i < linhas.length; i++) {
        const nome = linhas[i].getElementsByTagName("td")[1];
        if (nome) {
            const textoNome = nome.textContent.toLowerCase();
            linhas[i].style.display = textoNome.includes(termo) ? "" : "none";
        }
    }
}

function copiarLista() {
    let texto = document.getElementById("output-lista").textContent;
    copiarTexto(texto);
    showNotification("Lista copiada!", false);
}

function gerarEmail() {
    console.log("Gerando email...");
    const horario = document.getElementById("horario").value;
    const nomesSelect = document.getElementById("nomes");
    const nomesSelecionados = Array.from(nomesSelect.options)
                                 .filter(option => option.selected)
                                 .map(option => option.value)
                                 .join('\n');

    const emailText = `Prezados,

${horario},

Estou passando para informar que todas as pessoas mencionados na lista estão cadastrados.
Caso a foto dos colaboradores não seja aceita, é necessário que se dirijam ao setor fiscal da unidade para fazer a correção.

Atenciosamente,

${nomesSelecionados}`;

    document.getElementById("email-gerado").textContent = emailText.trim();
    showNotification("E-mail gerado!", false);
    console.log("Email gerado.");
}

function copiarTexto(texto) {
    const tempInput = document.createElement("textarea");
    tempInput.value = texto;
    tempInput.style.position = "absolute";
    tempInput.style.left = "-9999px";
    document.body.appendChild(tempInput);

    tempInput.select();
    try {
        document.execCommand("copy");
        showNotification("Copiado com sucesso!", false);
        console.log("Texto copiado para a área de transferência.");
    } catch (err) {
        console.error("Erro ao copiar texto:", err);
        showNotification("Erro ao copiar texto.", true);
    } finally {
        document.body.removeChild(tempInput);
    }
}

function copiarEmail() {
    const emailText = document.getElementById("email-gerado").textContent;
    copiarTexto(emailText);
}

function showNotification(message, isError) {
    const notification = document.getElementById("copy-notification");
    notification.textContent = message;
    notification.style.backgroundColor = isError ? "#f44336" : "#4CAF50";
    notification.classList.add("show");
    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
    console.log("Notificação exibida: " + message);
}

// --- INTEGRAÇÃO COM OCR.space ---
async function enviarImagemOCR() {
    console.log("Iniciando envio de imagem por upload para OCR...");
    const inputFile = document.getElementById("imagem-upload");
    if (inputFile.files.length === 0) {
        showNotification("Por favor, selecione uma imagem para enviar.", true);
        console.warn("Nenhum arquivo selecionado para upload.");
        return;
    }

    let arquivo = inputFile.files[0];
    const ocrSpinner = document.getElementById('ocr-spinner');
    const extractButton = document.querySelector('button[onclick="enviarImagemOCR()"]');

    extractButton.disabled = true;
    ocrSpinner.style.display = 'inline-block';
    showNotification("Enviando imagem para OCR...", false);
    console.log("Spinner ativado e botão desativado para OCR de upload.");

    if (arquivo.size > 1024 * 1024) { // 1MB em bytes
        showNotification("Redimensionando imagem para envio...", false);
        console.log("Imagem de upload > 1MB. Redimensionando...");
        arquivo = await resizeImage(arquivo, 1200, 1200, 0.9);
        if (!arquivo) {
            showNotification("Falha ao redimensionar a imagem.", true);
            extractButton.disabled = false;
            ocrSpinner.style.display = 'none';
            console.error("Erro: Falha no redimensionamento da imagem de upload.");
            return;
        }
        console.log("Redimensionamento da imagem de upload concluído. Novo tamanho:", arquivo.size, "bytes");
    } else {
        console.log("Imagem de upload <= 1MB. Sem redimensionamento necessário. Tamanho:", arquivo.size, "bytes");
    }

    const formData = new FormData();
    formData.append("apikey", "K89510033988957"); // Considere obter sua própria chave API
    formData.append("language", "por");
    formData.append("file", arquivo, "uploaded_image.jpg");
    formData.append("OCREngine", "2"); // Tente OCREngine=1 se persistir o erro

    console.log("FormData para OCR de upload preparado.");
    console.log("Verificando se o arquivo está no FormData:", formData.get('file') ? "Sim" : "Não");
    if (formData.get('file')) {
        console.log("Nome do arquivo no FormData:", formData.get('file').name);
        console.log("Tipo do arquivo no FormData:", formData.get('file').type);
        console.log("Tamanho do arquivo no FormData:", formData.get('file').size, "bytes");
    }

    try {
        console.log("Iniciando requisição fetch (upload) para OCR.space...");
        const resposta = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: formData,
        });
        console.log("Resposta do fetch (upload) recebida. Status:", resposta.status, resposta.statusText);
        const dados = await resposta.json();
        console.log("Dados do OCR (upload) recebidos:", dados);

        if (dados.IsErroredOnProcessing || !dados.ParsedResults || dados.ParsedResults.length === 0) {
            const errorMessage = dados.ErrorMessage ? dados.ErrorMessage.join(". ") : "Ocorreu um erro desconhecido no OCR.";
            showNotification("Erro ao processar a imagem: " + errorMessage, true);
            console.error("Erro de processamento OCR (upload):", dados);
            return;
        }

        const textoExtraido = dados.ParsedResults[0].ParsedText;
        document.getElementById("input-lista").value = textoExtraido;
        gerarTabela();
        showNotification("Texto extraído com sucesso!", false);
        console.log("Texto OCR (upload) extraído com sucesso:", textoExtraido);

    } catch (erro) {
        console.error("Falha fatal na requisição OCR (upload):", erro);
        showNotification("Falha na requisição OCR: " + erro.message, true);
    } finally {
        extractButton.disabled = false;
        ocrSpinner.style.display = 'none';
        console.log("Finalizado processo OCR de upload. Spinner desativado.");
    }
}

// --- EVENTOS DA TABELA ---
document.getElementById("tabela-gerada").addEventListener("change", function(e) {
    if (e.target.type === "checkbox") {
        const linha = e.target.closest("tr");
        if (!linha) return;

        const estaMarcado = e.target.checked;

        linha.querySelectorAll("td button").forEach(botao => {
            if (estaMarcado) {
                botao.classList.add("riscado", "desativado");
            } else {
                botao.classList.remove("riscado", "desativado");
            }
        });

        linha.querySelectorAll("td").forEach(td => {
            if (estaMarcado) {
                td.classList.add("riscado");
            } else {
                td.classList.remove("riscado");
            }
        });

        if (estaMarcado) {
            const tbody = linha.parentElement;
            tbody.appendChild(linha);

            linha.classList.add("pular");
            linha.addEventListener('animationend', () => {
                linha.classList.remove("pular");
            }, { once: true });
        }
        updateNomeCount();
    }
});

// Lógica para alternar o modo noturno e carregar preferência
document.getElementById('dark-mode-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
        this.textContent = '☀️';
    } else {
        localStorage.setItem('darkMode', 'disabled');
        this.textContent = '🌙';
    }
});

// Verifica a preferência do usuário ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').textContent = '☀️';
    } else {
        document.getElementById('dark-mode-toggle').textContent = '🌙';
    }
    updateNomeCount();
});
