export type ScaleStatus = 'disconnected' | 'connecting' | 'connected' | 'error';
let currentStatus: ScaleStatus = 'disconnected';
type StatusListener = (status: ScaleStatus) => void;
const listeners: StatusListener[] = [];

export const onScaleStatusChange = (listener: StatusListener) => {
    listeners.push(listener);
    listener(currentStatus);
    return () => {
        const idx = listeners.indexOf(listener);
        if (idx > -1) listeners.splice(idx, 1);
    };
};

const setStatus = (status: ScaleStatus) => {
    if (currentStatus !== status) {
        currentStatus = status;
        listeners.forEach(l => l(status));
    }
};

let globalPort: any = null;
let globalReader: any = null;
let globalLatestWeight: string | null = null;
let isReading = false;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (globalReader) {
        try { globalReader.releaseLock(); } catch(e) {}
    }
    if (globalPort && globalPort.readable) {
        try { globalPort.close(); } catch(e) {}
    }
  });
}

export const autoConnectScale = async () => {
    if (typeof navigator === "undefined" || !("serial" in navigator)) return;
    if (globalPort && globalPort.readable) return;
    
    try {
        setStatus('connecting');
        const ports = await (navigator as any).serial.getPorts();
        if (ports && ports.length > 0) {
            globalPort = ports[ports.length - 1];
            if (!globalPort.readable) {
                try {
                    await globalPort.open({ baudRate: 9600 });
                    startBackgroundReader();
                    setStatus('connected');
                } catch (e: any) {
                    if (e.name !== 'InvalidStateError') {
                        globalPort = null;
                        setStatus('error');
                    } else {
                        startBackgroundReader();
                        setStatus('connected');
                    }
                }
            } else {
                setStatus('connected');
            }
        } else {
            setStatus('disconnected');
        }
    } catch (e) {
        console.error("Auto-connect da balança falhou:", e);
        setStatus('error');
    }
};

export const readWeightFromScale = async (): Promise<string> => {
  if (!("serial" in navigator)) {
    throw new Error("O seu navegador não suporta a Web Serial API. Por favor, utilize o Google Chrome ou Microsoft Edge (versões recentes).");
  }

  try {
    if (!globalPort) {
      // Verifica se já temos portas previamente autorizadas na sessão atual
      setStatus('connecting');
      const ports = await (navigator as any).serial.getPorts();
      if (ports && (ports as any[]).length > 0) {
        // Tenta usar a última porta (mais provável ser a correta se houver várias)
        globalPort = ports[ports.length - 1];
      } else {
        // Solicita ao utilizador que escolha a porta
        globalPort = await (navigator as any).serial.requestPort();
      }
    }

    if (!globalPort) {
        setStatus('disconnected');
        throw new Error("Nenhuma porta foi selecionada.");
    }

    // Se a porta não está aberta, abrimos
    if (!globalPort.readable) {
        try {
            setStatus('connecting');
            await globalPort.open({ baudRate: 9600 });
            setStatus('connected');
        } catch (e: any) {
            // Se já estiver a ser usada (ex: a tab perdeu o estado mas a porta continua aberta pelo OS)
            if (e.name !== 'InvalidStateError') {
                globalPort = null; // Limpa para forçar re-seleção
                setStatus('error');
                throw new Error("Falha ao abrir a porta da balança (pode estar retida pelo sistema operativo). Tente desligar e voltar a ligar o cabo USB, ou recarregar a página.");
            } else {
                setStatus('connected');
            }
        }
        startBackgroundReader();
    } else if (!isReading) {
        // Se a porta está aberta mas a rotina de background morreu, reiniciamos
        setStatus('connected');
        startBackgroundReader();
    } else {
        setStatus('connected');
    }

    // Aguardamos até 2.5s para receber a primeira leitura caso tenha acabado de ligar
    let attempts = 0;
    while (globalLatestWeight === null && attempts < 25) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }

    if (globalLatestWeight === null) {
        throw new Error("Não foi possível ler o peso. A balança não está a responder (verifique se está ligada e o cabo bem conectado).");
    }

    return globalLatestWeight;

  } catch (error: any) {
    setStatus('error');
    if (error.name === "NotFoundError" || error.message?.includes("No port selected")) {
       throw new Error("Nenhuma porta foi selecionada. Por favor, confirme as permissões no seu navegador.");
    }
    if (error.message && error.message.includes("Failed to open serial port")) {
       globalPort = null;
       throw new Error("Falha ao abrir a balança. A porta COM pode estar bloqueada pelo Windows. Tente desligar e ligar o cabo da balança, ou fechar outras janelas que a estejam a usar.");
    }
    throw error;
  }
};

const startBackgroundReader = async () => {
    if (isReading || !globalPort || !globalPort.readable) return;
    
    // Se o stream estiver bloqueado, tenta libertar (embora idealmente o reader deva gerir isso)
    if (globalPort.readable.locked) {
        if (globalReader) {
            try { globalReader.releaseLock(); } catch(e) {}
            globalReader = null;
        } else {
            console.warn("A porta está bloqueada mas não temos o reader para libertar.");
            setStatus('error');
            return; // Não conseguimos ler
        }
    }

    isReading = true;
    
    try {
        globalReader = globalPort.readable.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";

        while (true) {
            const { value, done } = await globalReader.read();
            if (done) {
                // A porta foi fechada ou o stream terminou
                setStatus('disconnected');
                break;
            }
            if (value) {
                buffer += decoder.decode(value, { stream: true });
                if (buffer.includes('\n') || buffer.includes('\r')) {
                    const lines = buffer.split(/[\r\n]+/);
                    // O último elemento pode ser uma linha incompleta, guardamos no buffer
                    buffer = lines.pop() || "";
                    
                    for (const line of lines) {
                        if (line.trim().length > 0) {
                            const numberMatch = line.match(/[\d]+[.,][\d]*/);
                            if (numberMatch) {
                                globalLatestWeight = numberMatch[0].replace(',', '.');
                                setStatus('connected');
                            }
                        }
                    }
                }
                
                // Prevenir buffer overflow se a balança enviar lixo sem \n
                if (buffer.length > 256) {
                    buffer = buffer.slice(-128); // Mantém apenas o final do lixo
                }
            }
        }
    } catch (e) {
        console.error("Erro na leitura da balança em background:", e);
        setStatus('error');
    } finally {
        isReading = false;
        if (globalReader) {
            try { globalReader.releaseLock(); } catch(e) {}
            globalReader = null;
        }
    }
};
