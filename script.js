// Variáveis globais para a câmera
let currentStream;
let rotationAngle = 0; // Variável para o ângulo de rotação em graus (0, 90, 180, 270)
let originalPhotoDataURL; // Armazena a imagem original do vídeo como Data URL para rotações

// --- FUNÇÕES DA CÂMERA ---
function openCameraModal() {
    document.getElementById('cameraModal').style.display = 'block';
    startCamera();
}

function closeCameraModal() {
    document.getElementById('cameraModal').style.display = 'none';
    stopCamera();
    resetCameraControls();
}

async function startCamera() {
    const video = document.getElementById('camera-feed');
    const takePhotoButton = document.getElementById('take-photo-button');
    const retryPhotoButton = document.getElementById('retry-photo-button');
    const usePhotoButton = document.getElementById('use-photo-button');
    const rotateLeftButton = document.getElementById('rotate-left-button');
    const rotateRightButton = document.getElementById('rotate-right-button');
    const downloadPhotoButton = document.getElementById('download-photo-button');

    try {
        // Solicita acesso à câmera
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); // Tenta usar a câmera traseira
        video.srcObject = currentStream;
        video.play();

        takePhotoButton.style.display = 'inline-block';
        retryPhotoButton.style.display = 'none';
        usePhotoButton.style.display = 'none';
        rotateLeftButton.style.display = 'none';
        rotateRightButton.style.display = 'none';
        downloadPhotoButton.style.display = 'none';
        video.style.display = 'block';
        document.getElementById('photo-canvas').style.display = 'none'; // Garante que o canvas esteja escondido
        rotationAngle = 0; // Reseta o ângulo ao iniciar a câmera
        originalPhotoDataURL = null; // Reseta a imagem original

    } catch (err) {
        console.error("Erro ao acessar a câmera: ", err);
        showNotification("Não foi possível acessar a câmera. Verifique as permissões ou se há outra aplicação usando-a.", true);
        closeCameraModal();
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
}

function takePhoto() {
    const video = document.getElementById('camera-feed');
    const photoCanvas = document.getElementById('photo-canvas');
    const context = photoCanvas.getContext('2d');

    photoCanvas.width = video.videoWidth;
    photoCanvas.height = video.videoHeight;

    context.drawImage(video, 0, 0, photoCanvas.width, photoCanvas.height);

    // Armazena a imagem capturada como Data URL para rotações futuras
    originalPhotoDataURL = photoCanvas.toDataURL('image/jpeg', 0.95);

    // Esconde o vídeo e mostra a imagem capturada no canvas
    video.style.display = 'none';
    photoCanvas.style.display = 'block';

    // Atualiza os botões de controle
    document.getElementById('take-photo-button').style.display = 'none';
    document.getElementById('retry-photo-button').style.display = 'inline-block';
    document.getElementById('use-photo-button').style.display = 'inline-block';
    document.getElementById('rotate-left-button').style.display = 'inline-block';
    document.getElementById('rotate-right-button').style.display = 'inline-block';
    document.getElementById('download-photo-button').style.display = 'inline-block';

    rotationAngle = 0; // Reseta o ângulo ao tirar a foto
}

function retryPhoto() {
    startCamera(); // Reinicia a câmera e o estado dos botões
    resetCameraControls(); // Chama para garantir que tudo esteja no estado inicial
}

// Função para redimensionar a imagem
async function resizeImage(fileBlob, maxWidth = 1200, maxHeight = 1200, quality = 0.8) {
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

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
        };
        reader.readAsDataURL(fileBlob);
    });
}

// Função para desenhar a imagem no canvas com rotação
async function drawRotatedImage() {
    if (!originalPhotoDataURL) return; // Usa originalPhotoDataURL para redesenhar

    const img = new Image();
    img.src = originalPhotoDataURL;

    img.onload = () => {
        const photoCanvas = document.getElementById('photo-canvas');
        const context = photoCanvas.getContext('2d');

        // Determina as novas dimensões do canvas após a rotação
        let newWidth = img.width;
        let newHeight = img.height;
        if (rotationAngle === 90 || rotationAngle === 270) {
            newWidth = img.height;
            newHeight = img.width;
        }

        photoCanvas.width = newWidth;
        photoCanvas.height = newHeight;

        context.clearRect(0, 0, photoCanvas.width, photoCanvas.height); // Limpa o canvas

        context.save(); // Salva o estado atual do canvas

        // Move o ponto de origem para o centro do novo canvas
        context.translate(photoCanvas.width / 2, photoCanvas.height / 2);

        // Rotaciona
        context.rotate(rotationAngle * Math.PI / 180);

        // Desenha a imagem original centrada (usando as dimensões originais da imagem)
        context.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);

        context.restore(); // Restaura o estado anterior do canvas
    };
}

// Funções para girar a imagem
function rotateLeft() {
    rotationAngle = (rotationAngle - 90 + 360) % 360; // Garante que o ângulo fique entre 0 e 270
    drawRotatedImage();
}

function rotateRight() {
    rotationAngle = (rotationAngle + 90) % 360;
    drawRotatedImage();
}

// Função para iniciar o download da foto
function downloadPhoto() {
    const photoCanvas = document.getElementById('photo-canvas');
    if (photoCanvas.style.display === 'none' || !originalPhotoDataURL) { // Verifica se há uma imagem no canvas
        showNotification("Não há foto para baixar.", true);
        return;
    }

    photoCanvas.toBlob((blob) => {
        if (!blob) {
            showNotification("Falha ao gerar a imagem para download.", true);
            return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'foto_capturada.jpg'; // Nome do arquivo a ser baixado
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // Libera o URL do objeto
        showNotification("Foto baixada!", false);
    }, 'image/jpeg', 0.95);
}


async function usePhoto() {
    const photoCanvas = document.getElementById('photo-canvas');
    if (photoCanvas.style.display === 'none' || !originalPhotoDataURL) { // Verifica se há uma imagem no canvas
        showNotification("Nenhuma foto foi capturada ou processada no canvas.", true);
        return;
    }

    closeCameraModal(); // Fecha o modal da câmera

    const ocrSpinner = document.getElementById('ocr-spinner');
    const extractButton = document.querySelector('button[onclick="enviarImagemOCR()"]');
    extractButton.disabled = true;
    ocrSpinner.style.display = 'inline-block';
    showNotification("Enviando foto para OCR...", false);

    // Gerar o blob da imagem atualmente no canvas (com rotação aplicada)
    photoCanvas.toBlob(async (blob) => {
        if (!blob) {
            showNotification("Falha ao gerar a imagem para envio.", true);
            extractButton.disabled = false;
            ocrSpinner.style.display = 'none';
            return;
        }

        let imageToSend = blob;

        // Verifica o tamanho do arquivo e redimensiona se for maior que 1MB
        if (blob.size > 1024 * 1024) { // 1MB em bytes
            showNotification("Redimensionando imagem para envio...", false);
            imageToSend = await resizeImage(blob, 1200, 1200, 0.8);
            if (!imageToSend) {
                showNotification("Falha ao redimensionar a imagem.", true);
                extractButton.disabled = false;
                ocrSpinner.style.display = 'none';
                return;
            }
        }

        const formData = new FormData();
        formData.append("apikey", "K89510033988957");
        formData.append("language", "por");
        formData.append("file", imageToSend, "camera_photo.jpg");
        formData.append("OCREngine", "2");

        try {
            const resposta = await fetch("https://api.ocr.space/parse/image", {
                method: "POST",
                body: formData,
            });
            const dados = await resposta.json();

            if (dados.IsErroredOnProcessing || !dados.ParsedResults || dados.ParsedResults.length === 0) {
                const errorMessage = dados.ErrorMessage ? dados.ErrorMessage.join(". ") : "Ocorreu um erro desconhecido no OCR.";
                showNotification("Erro ao processar a imagem: " + errorMessage, true);
                return;
            }

            const textoExtraido = dados.ParsedResults[0].ParsedText;
            document.getElementById("display-ocr-text").textContent = textoExtraido;
            document.getElementById("ocr-display-area").style.display = 'block';
            showNotification("Texto extraído com sucesso!", false);

        } catch (erro) {
            console.error("Falha na requisição OCR:", erro);
            showNotification("Falha na requisição OCR: " + erro.message, true);
        } finally {
            extractButton.disabled = false;
            ocrSpinner.style.display = 'none';
        }
    }, 'image/jpeg', 0.95);
}

// Reseta o estado dos controles da câmera e variáveis de rotação
function resetCameraControls() {
    document.getElementById('take-photo-button').style.display = 'inline-block';
    document.getElementById('retry-photo-button').style.display = 'none';
    document.getElementById('use-photo-button').style.display = 'none';
    document.getElementById('rotate-left-button').style.display = 'none';
    document.getElementById('rotate-right-button').style.display = 'none';
    document.getElementById('download-photo-button').style.display = 'none';
    document.getElementById('camera-feed').style.display = 'block';
    document.getElementById('photo-canvas').style.display = 'none';
    rotationAngle = 0; // Reseta o ângulo
    originalPhotoDataURL = null; // Adicionado para resetar a imagem original
}

// Adicione os event listeners para os botões da câmera e de rotação
document.getElementById('take-photo-button').addEventListener('click', takePhoto);
document.getElementById('retry-photo-button').addEventListener('click', retryPhoto);
document.getElementById('use-photo-button').addEventListener('click', usePhoto);
document.getElementById('rotate-left-button').addEventListener('click', rotateLeft);
document.getElementById('rotate-right-button').addEventListener('click', rotateRight);
document.getElementById('download-photo-button').addEventListener('click', downloadPhoto);


// NOVA FUNÇÃO: Transferir texto do OCR para o textarea de input
function transferirParaInput() {
    const textoOCR = document.getElementById("display-ocr-text").textContent;
    if (textoOCR && textoOCR !== "Nenhum texto extraído ainda.") {
        document.getElementById("input-lista").value = textoOCR;
        gerarTabela(); // Já chama a função para gerar a tabela automaticamente
        showNotification("Texto transferido para o editor!", false);
    } else {
        showNotification("Não há texto extraído para transferir.", true);
    }
}


// --- FUNÇÕES DE LÓGICA E MANIPULAÇÃO DA TABELA ---

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
    const inputText = document.getElementById("input-lista").value;
    const linhas = inputText.split("\n").map(l => l.trim()).filter(l => l !== "");

    const listaFormatada = [];
    const nomesSemCPF = [];
    const tabela = document.getElementById("tabela-gerada");
    tabela.innerHTML = ""; // Limpa a tabela existente

    // Regex para CPF, mais flexível para 'O' ou '0' e diversos separadores
    const regexCPF = /[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2,3}[^\w\d]*[Oo0-9]{2}/;
    // Regex para nomes: tenta capturar nomes que possam ter números de linha na frente (ex: "1 - NOME SOBRENOME")
    const regexNome = /^(?:[0-9]{1,3}\s*[-–—]?\s*)?([A-ZÀ-Ýa-zà-ÿ'\´`\s]+(?:da|de|do|dos|das|e|santo|santa)?(?:\s+[A-ZÀ-Ýa-zà-ÿ'\´`\s]+)*)/;
    const regexEmail = /[\w.-]+@[\w.-]+\.\w+/; // Regex para e-mail

    let currentName = null;
    let currentCPF = null;
    let currentEmail = null;

    linhas.forEach(linha => {
        // Ignorar linhas que contêm a frase de horário
        if (linha.toUpperCase().includes("6:00 H ATE 21:00 H")) {
            return;
        }

        const cpfMatch = linha.match(regexCPF);
        const nameMatch = linha.match(regexNome);
        const emailMatch = linha.match(regexEmail);

        if (nameMatch && nameMatch[1]) {
            // Se um novo nome é encontrado, e já temos um nome e CPF pendentes, processamos o anterior
            if (currentName && currentCPF) {
                adicionarRegistro(currentName, currentCPF, currentEmail);
            }
            currentName = capitalizarNome(nameMatch[1].trim());
            currentCPF = null; // Reseta CPF e Email para o novo nome
            currentEmail = null;
        }

        if (cpfMatch) {
            currentCPF = cpfMatch[0].replace(/[Oo]/g, '0').replace(/\D/g, '');
        }

        if (emailMatch) {
            currentEmail = emailMatch[0].toLowerCase();
        }

        // Se temos um nome e agora um CPF, adicionamos (ou se o email foi encontrado)
        if (currentName && currentCPF) {
            adicionarRegistro(currentName, currentCPF, currentEmail);
            currentName = null;
            currentCPF = null;
            currentEmail = null;
        } else if (currentName && currentEmail && !currentCPF) {
            // Caso raro: tem nome e email mas não CPF. Pode ser um registro incompleto.
            // Por enquanto, vou esperar pelo CPF.
        }
    });

    // Adiciona o último registro se houver dados pendentes
    if (currentName && (currentCPF || currentEmail)) {
        adicionarRegistro(currentName, currentCPF, currentEmail);
    } else if (currentName && !currentCPF && !currentEmail) {
        // Se restou apenas um nome sem CPF/Email detectável
        nomesSemCPF.push(currentName);
    }


    function adicionarRegistro(nome, cpf, email) {
        const cpfFinal = cpf || '-'; // Garante que não é null
        const emailFinal = email || '-'; // Garante que não é null

        adicionarNaTabela(nome, cpfFinal, emailFinal);

        if (validarCPF(cpfFinal)) {
            listaFormatada.push(`[NOME]: ${nome} [CPF]: ${cpfFinal}`);
        } else {
            nomesSemCPF.push(`${nome} (CPF Inválido: ${cpfFinal})`);
        }
    }

    document.getElementById("output-lista").textContent = listaFormatada.join("\n");
    updateNomeCount();

    if (nomesSemCPF.length > 0) {
        alert("Os seguintes nomes não contêm CPF válido ou detectável (ou foram ignorados):\n" + nomesSemCPF.join("\n"));
    }
}


function capitalizarNome(nome) {
    return nome.split(" ").map(p => {
        const lower = p.toLowerCase();
        // Removido 'santo', 'santa' da lista de exceções para capitalização
        if (['da', 'de', 'do', 'dos', 'das', 'e'].includes(lower)) {
            return lower;
        }
        return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    }).join(" ");
}

function adicionarNaTabela(nome, cpf, email) {
    let tabela = document.getElementById("tabela-gerada");
    const cpfValido = validarCPF(cpf);
    // Adiciona uma classe para CPF inválido, para poder estilizá-lo com CSS
    const classeCPF = cpfValido ? "" : "cpf-invalido";
    const titleCPF = cpfValido ? "" : "title='CPF inválido!'";

    let novaLinha = `
        <tr>
            <td><input type="checkbox"></td>
            <td><button onclick="copiarTexto('${nome}')">${nome || '-'}</button></td>
            <td class="${classeCPF}" ${titleCPF}><button onclick="copiarTexto('${cpf}')">${cpf || '-'}</button></td>
            <td><button onclick="copiarTexto('${email}')">${email || '-'}</button></td>
        </tr>
    `;
    tabela.innerHTML += novaLinha;
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
    const horario = document.getElementById("horario").value;
    const nomesInput = document.getElementById("nomes").value;
    const nomes = nomesInput.split(',').map(nome => nome.trim()).join('\n');

    const emailText = `Prezados,

${horario},

Estou passando para informar que todas as pessoas mencionados na lista estão cadastradas.
Caso a foto ou Qr code da pessoa não funcione, é necessário entrar em contato com o CCOS para fazer a correção.

Atenciosamente,

${nomes}`;

    document.getElementById("email-gerado").textContent = emailText.trim();
    showNotification("E-mail gerado!", false);
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
}

// --- INTEGRAÇÃO COM OCR.space ---
async function enviarImagemOCR() {
    const inputFile = document.getElementById("imagem-upload");
    const files = inputFile.files; // Obtenha todos os arquivos selecionados

    if (files.length === 0) {
        showNotification("Por favor, selecione uma ou mais imagens para enviar.", true);
        return;
    }

    const ocrSpinner = document.getElementById('ocr-spinner');
    const extractButton = document.querySelector('button[onclick="enviarImagemOCR()"]');

    extractButton.disabled = true;
    ocrSpinner.style.display = 'inline-block';
    document.getElementById("display-ocr-text").textContent = "Processando imagens..."; // Limpa a área de texto anterior
    document.getElementById("ocr-display-area").style.display = 'block';

    let allExtractedText = []; // Array para armazenar o texto de todas as imagens

    for (let i = 0; i < files.length; i++) {
        let arquivo = files[i];
        showNotification(`Processando imagem ${i + 1} de ${files.length}...`, false);

        if (arquivo.size === 0) { // Adicionado: tratamento para arquivos vazios
            showNotification(`Imagem ${i + 1} (${arquivo.name}) está vazia e será ignorada.`, true);
            allExtractedText.push(`--- IMAGEM ${i + 1} (${arquivo.name}) VAZIA ---`);
            continue; // Pula esta imagem
        }

        // Verifica o tamanho do arquivo e redimensiona se for maior que 1MB
        if (arquivo.size > 1024 * 1024) { // 1MB em bytes
            showNotification(`Redimensionando imagem ${arquivo.name} para envio...`, false);
            arquivo = await resizeImage(arquivo, 1200, 1200, 0.8);
            if (!arquivo) {
                showNotification(`Falha ao redimensionar a imagem ${arquivo.name}.`, true);
                allExtractedText.push(`--- ERRO NA IMAGEM ${i + 1} (Falha ao redimensionar) ---`);
                continue; // Pula para a próxima imagem
            }
        }

        const formData = new FormData();
        formData.append("apikey", "K89510033988957");
        formData.append("language", "por");
        formData.append("file", arquivo, `uploaded_image_${i}.jpg`); // Adicione um nome de arquivo único
        formData.append("OCREngine", "2");

        try {
            const resposta = await fetch("https://api.ocr.space/parse/image", {
                method: "POST",
                body: formData,
            });
            const dados = await resposta.json();

            if (dados.IsErroredOnProcessing || !dados.ParsedResults || dados.ParsedResults.length === 0) {
                const errorMessage = dados.ErrorMessage ? dados.ErrorMessage.join(". ") : "Ocorreu um erro desconhecido no OCR.";
                showNotification(`Erro ao processar a imagem ${arquivo.name}: ` + errorMessage, true);
                allExtractedText.push(`--- ERRO NA IMAGEM ${i + 1} (${arquivo.name}) ---`);
            } else {
                const textoExtraido = dados.ParsedResults[0].ParsedText;
                allExtractedText.push(`--- TEXTO DA IMAGEM ${i + 1} (${arquivo.name}) ---\n${textoExtraido.trim()}`);
            }

        } catch (erro) {
            console.error(`Falha na requisição OCR para imagem ${arquivo.name}:`, erro);
            showNotification(`Falha na requisição OCR para imagem ${arquivo.name}: ` + erro.message, true);
            allExtractedText.push(`--- ERRO NA IMAGEM ${i + 1} (${arquivo.name}): ${erro.message} ---`);
        }
    }

    document.getElementById("display-ocr-text").textContent = allExtractedText.join("\n\n"); // Concatena todo o texto
    showNotification("Processamento de todas as imagens concluído!", false);
    extractButton.disabled = false;
    ocrSpinner.style.display = 'none';
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
        this.setAttribute('aria-label', 'Alternar para modo claro');
    } else {
        localStorage.setItem('darkMode', 'disabled');
        this.textContent = '🌙';
        this.setAttribute('aria-label', 'Alternar para modo escuro');
    }
});

// Verifica a preferência do usuário ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        darkModeToggle.textContent = '☀️';
        darkModeToggle.setAttribute('aria-label', 'Alternar para modo claro');
    } else {
        darkModeToggle.textContent = '🌙';
        darkModeToggle.setAttribute('aria-label', 'Alternar para modo escuro');
    }
    updateNomeCount();
    // Esconde a área de exibição do OCR no carregamento inicial
    document.getElementById("ocr-display-area").style.display = 'none';
});
