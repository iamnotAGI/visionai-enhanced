class VisionAI {
  constructor() {
    this.mode = 'Recognition';
    this.confidence = 99.4;
    this.detected = ['Human', 'Vehicle', 'Building'];
    this.neuralLayers = 2048;
    this.status = 'ACTIVE';
    this.accuracyThreshold = 95;
    this.changesHistory = [];
    this.listeners = new Set();
  }

  subscribe(callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('Subscriber callback must be a function.');
    }

    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(eventName, details = {}) {
    const event = {
      eventName,
      timestamp: new Date().toISOString(),
      details,
      currentState: {
        mode: this.mode,
        confidence: this.confidence,
        detected: [...this.detected],
        status: this.status,
      },
    };

    this.listeners.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('VisionAI listener failed:', error);
      }
    });

    return event;
  }

  logChange(field, oldValue, newValue) {
    const change = {
      timestamp: new Date().toISOString(),
      field,
      oldValue,
      newValue,
    };

    this.changesHistory.push(change);
    this.emit('change', change);
    return change;
  }

  detectMinifiedCode(inputText) {
    const text = String(inputText || '').trim();
    if (!text) return false;
    const compact = text.replace(/\s+/g, ' ');
    const braceDensity = (compact.match(/\{|\}/g) || []).length;
    const semicolonCount = (compact.match(/;/g) || []).length;
    const averageLength = compact.length / (compact.split(/[\s;{}()]+/).filter(Boolean).length || 1);

    return braceDensity > 10 || (semicolonCount > 10 && averageLength > 18);
  }

  extractFunctions(inputText) {
    const text = String(inputText || '');
    const patterns = [
      /function\s+([A-Za-z_$][\w$]*)\s*\(/g,
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g,
      /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?function\s*\(/g,
      /class\s+([A-Za-z_$][\w$]*)/g,
    ];

    const functions = new Set();
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1];
        if (name) functions.add(name);
      }
    }

    return [...functions];
  }

  extractIdentifiers(inputText) {
    const text = String(inputText || '');
    const matches = text.match(/\b[A-Za-z_$][\w$]*\b/g) || [];
    const commonNoise = new Set([
      'if', 'else', 'for', 'return', 'new', 'let', 'const', 'var', 'function', 'class',
      'this', 'that', 'true', 'false', 'null', 'undefined', 'typeof', 'catch', 'try', 'throw',
      'async', 'await', 'import', 'from', 'export', 'default', 'return', 'window', 'document',
      'console', 'Object', 'Array', 'String', 'Number', 'Boolean', 'Math', 'Date', 'URL', 'json',
      'error', 'code', 'client', 'version', 'runtime', 'copilot', 'searchParams', 'params'
    ]);

    return [...new Set(matches.filter((item) => !commonNoise.has(item)))].slice(0, 50);
  }

  extractSignals(inputText) {
    const text = String(inputText || '');
    const signalPatterns = [
      'searchParams', 'client_version', 'minimum_client_version', 'copilot_runtime_version',
      'error_code', 'navigator', 'window', 'document', 'qml', 'torch', 'pennylane',
      'fetch', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'browser', 'runtime',
      'setInterval', 'addEventListener', 'CustomEvent', 'dispatchEvent'
    ];

    return signalPatterns.filter((pattern) => text.includes(pattern));
  }

  classifyCode(inputText, functions, signals) {
    const text = String(inputText || '');
    const tokens = {
      browser: /window\.|document\.|navigator\.|location\.|localStorage|sessionStorage|CustomEvent/.test(text),
      runtime: /client_version|minimum_client_version|copilot_runtime_version|runtime|error_code/.test(text),
      quantum: /pennylane|qml|quantum|qubit|circuit|AngleEmbedding|BasicEntanglerLayers/.test(text),
      ai: /vision|ml|model|neural|accuracy|confidence|classifier|predict|detection/.test(text),
      utility: /function\s+[A-Za-z_]+\s*\(|const\s+[A-Za-z_]+\s*=\s*\(/.test(text),
      minified: this.detectMinifiedCode(text),
    };

    if (tokens.quantum) return 'Hybrid Quantum / ML circuit logic';
    if (tokens.browser && tokens.runtime) return 'Browser runtime / client compatibility logic';
    if (tokens.ai) return 'AI / model inference logic';
    if (functions.length >= 2 || signals.length >= 2) return 'Utility / transformation logic';
    if (tokens.minified) return 'Minified or compressed script';
    return 'General script logic';
  }

  summarizeAnalysis(inputText) {
    const text = String(inputText || '').trim();
    if (!text) {
      return 'No code content detected.';
    }

    const functions = this.extractFunctions(text);
    const identifiers = this.extractIdentifiers(text);
    const signals = this.extractSignals(text);
    const type = this.classifyCode(text, functions, signals);
    const minified = this.detectMinifiedCode(text);

    const summaryParts = [];
    summaryParts.push(`Detected ${functions.length} likely function/class entries.`);
    summaryParts.push(`Identified ${identifiers.length} relevant identifiers.`);
    summaryParts.push(`Likely code category: ${type}.`);
    summaryParts.push(minified ? 'Input appears to be minified or compressed JavaScript.' : 'Input appears readable and structured.');

    if (signals.length > 0) {
      summaryParts.push(`Runtime or compatibility signals: ${signals.join(', ')}.`);
    }

    return summaryParts.join(' ');
  }

  analyzeCodePaste(inputText) {
    const text = String(inputText || '').trim();

    if (!text) {
      return {
        status: 'empty',
        summary: 'No code detected in the pasted input.',
        confidence: 0,
        extractedDetails: {},
      };
    }

    const functions = this.extractFunctions(text);
    const identifiers = this.extractIdentifiers(text);
    const signals = this.extractSignals(text);
    const minified = this.detectMinifiedCode(text);
    const inferredType = this.classifyCode(text, functions, signals);
    const summary = this.summarizeAnalysis(text);

    const extractedDetails = {
      category: inferredType,
      functions,
      identifiers,
      runtimeSignals: signals,
      minified,
      notablePatterns: {
        includesClientVersion: signals.includes('client_version'),
        includesRuntimeVersion: signals.includes('copilot_runtime_version'),
        includesErrorCode: signals.includes('error_code'),
        includesBrowserApis: ['window', 'document', 'navigator'].some((item) => text.includes(item)),
      },
    };

    const report = {
      mode: this.mode,
      confidence: this.confidence,
      status: this.status,
      detected: [...this.detected],
      analysis: {
        summary,
        type: inferredType,
        minified,
        functions,
        identifiers,
        runtimeSignals: signals,
      },
      extractedDetails,
      actionableOutput: {
        title: 'Relevant details extracted from pasted code',
        keyFindings: [
          `Code type: ${inferredType}`,
          `Detected functions: ${functions.length || 0}`,
          `Runtime signals: ${signals.length ? signals.join(', ') : 'none'}`,
          `Minified input: ${minified ? 'yes' : 'no'}`,
        ],
      },
    };

    this.logChange('analysis', null, report.analysis.type);
    this.emit('analysisComplete', report);
    return report;
  }
}

function createVisionAI() {
  return new VisionAI();
}

module.exports = {
  VisionAI,
  createVisionAI,
};
