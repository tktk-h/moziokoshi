const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const copyBtn = document.getElementById('copyBtn');
const saveBtn = document.getElementById('saveBtn');
const chatgptBtn = document.getElementById('chatgptBtn');
const geminiBtn = document.getElementById('geminiBtn');
const clearBtn = document.getElementById('clearBtn');
const themeToggle = document.getElementById('themeToggle');
const transcriptEl = document.getElementById('transcript');
const statusEl = document.getElementById('status');

// finalText/interimText要素が無ければ安全に生成する
let finalTextEl = document.getElementById('finalText');
if (!finalTextEl) {
  finalTextEl = document.createElement('span');
  finalTextEl.id = 'finalText';
  transcriptEl.appendChild(finalTextEl);
}
let interimTextEl = document.getElementById('interimText');
if (!interimTextEl) {
  interimTextEl = document.createElement('span');
  interimTextEl.id = 'interimText';
  interimTextEl.className = 'interim';
  transcriptEl.appendChild(interimTextEl);
}

// テーマ切り替え（ダーク/ライト）
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('theme', theme);
}
applyTheme(localStorage.getItem('theme') || 'light');
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// Web Speech API のセットアップ
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let finalTranscript = '';
let isRecording = false;
let lastInterimLength = 0;

if (!SpeechRecognition) {
  statusEl.textContent = 'このブラウザは音声認識に対応していません（Chrome推奨）';
  startBtn.disabled = true;
} else {
  recognition = new SpeechRecognition();
  recognition.lang = 'ja-JP';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    console.log('[1] onstart: 認識スタート');
  };

  recognition.onaudiostart = () => {
    console.log('[2] onaudiostart: マイクからの音声取得開始');
  };

  recognition.onsoundstart = () => {
    console.log('[3] onsoundstart: 何らかの音を検知');
  };

  recognition.onspeechstart = () => {
    console.log('[4] onspeechstart: 人の声を検知');
  };

  recognition.onspeechend = () => {
    console.log('[5] onspeechend: 人の声の区間が終了');
  };

  recognition.onsoundend = () => {
    console.log('[6] onsoundend: 音の検知が終了');
  };

  recognition.onaudioend = () => {
    console.log('[7] onaudioend: マイクからの音声取得終了');
  };

  recognition.onnomatch = () => {
    // 認識結果に自信がなくても処理は継続する
    console.log('[8] onnomatch: 自信のない結果（処理は継続）');
  };

  recognition.onresult = (event) => {
    console.log('[9] onresult: 結果受信', event);
    let interimTranscript = '';
    let gotFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0].transcript;
      if (result.isFinal) {
        // 確定結果はfinalTranscriptに固定で追記する（消去しない）
        finalTranscript += text;
        gotFinal = true;
      } else {
        // 暫定結果は最後尾に表示するだけで、finalTranscriptには触れない
        interimTranscript += text;
      }
    }
    // finalTextEl.textContentは追記のみ。クリアする処理はここには書かない
    finalTextEl.textContent = finalTranscript;

    if (gotFinal) {
      // 確定結果が出たので、対応する暫定表示は役目を終えてクリア
      interimTextEl.textContent = '';
      lastInterimLength = 0;
    } else if (interimTranscript.length >= lastInterimLength) {
      // AIの予測が縮む（消える）方向の更新は無視し、伸びる場合のみ表示を更新する
      interimTextEl.textContent = interimTranscript;
      lastInterimLength = interimTranscript.length;
    }

    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  };

  recognition.onerror = (event) => {
    // エラーが起きてもログのみ。停止は録音ボタン側のisRecordingフラグでのみ行う
    console.error('[ERROR] onerror発生（処理は継続）:', event.error, event);
  };

  recognition.onend = () => {
    console.log('[10] onend: 認識終了');
    interimTextEl.textContent = '';
    lastInterimLength = 0;
    if (isRecording) {
      // 停止ボタンが押されていなければ即再開（finalTranscriptは保持されたまま）
      try {
        recognition.start();
        console.log('[再開] recognition.start()を再実行しました');
      } catch (e) {
        console.error('[ERROR] 再開時に例外:', e);
      }
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      statusEl.textContent = '停止しました';
    }
  };
}

startBtn.addEventListener('click', () => {
  if (!recognition) return;
  if (finalTranscript && !finalTranscript.endsWith('\n') && !finalTranscript.endsWith(' ')) {
    finalTranscript += ' ';
  }
  isRecording = true;
  console.log('[0] 開始ボタン押下: recognition.start()を呼びます');
  try {
    recognition.start();
    startBtn.disabled = true;
    stopBtn.disabled = false;
    statusEl.textContent = '🔴 録音中…';
  } catch (e) {
    console.error('[ERROR] recognition.start()で例外:', e);
    statusEl.textContent = `開始エラー: ${e.message}`;
    isRecording = false;
  }
});

stopBtn.addEventListener('click', () => {
  if (!recognition) return;
  isRecording = false;
  recognition.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  statusEl.textContent = '停止しました';
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(finalTranscript);
    const original = copyBtn.textContent;
    copyBtn.textContent = '✅ コピーしました';
    setTimeout(() => { copyBtn.textContent = original; }, 1500);
  } catch (err) {
    const range = document.createRange();
    range.selectNode(finalTextEl);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
    document.execCommand('copy');
    window.getSelection().removeAllRanges();
  }
});

saveBtn.addEventListener('click', () => {
  const blob = new Blob([finalTranscript], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const fileName = `講義ノート_${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}.txt`;

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

function buildProofreadPrompt() {
  return `【校正依頼】
以下の文章は講義の文字起こしデータです。
1. 文脈に基づき、誤字脱字や明らかな聞き間違いを修正して文章を整えてください。
2. ノート形式（見出しや箇条書きへの変換など）にはせず、文字起こしとしての文章構成のまま整えてください。
3. 出力結果は「文章ファイル形式（.txt）」でまとめてください。

【文字起こしデータ】
${finalTranscript}`;
}

chatgptBtn.addEventListener('click', () => {
  const prompt = encodeURIComponent(buildProofreadPrompt());
  window.open(`https://chat.openai.com/?q=${prompt}`, '_blank');
});

geminiBtn.addEventListener('click', async () => {
  const prompt = buildProofreadPrompt();
  // GeminiはURLパラメータでの自動入力に対応していないため、クリップボードにコピーしてから開く
  try {
    await navigator.clipboard.writeText(prompt);
    alert('校正依頼の文章をコピーしました。Geminiの入力欄に貼り付け（Ctrl+V / Cmd+V）して送信してください。');
  } catch (err) {
    alert('クリップボードへのコピーに失敗しました。お手数ですが手動でコピーしてください。');
  }
  window.open('https://gemini.google.com/app', '_blank');
});

clearBtn.addEventListener('click', () => {
  if (!window.confirm('本当にすべての文章を削除しますか？')) {
    return;
  }
  finalTranscript = '';
  finalTextEl.textContent = '';
  interimTextEl.textContent = '';
  lastInterimLength = 0;
});
