const SYSTEM_INSTRUCTION = `You are the official ARC Name Service (ANS) AI Assistant. Your goal is to guide Web3 users through the onboarding process for the ARC ecosystem and resolve transactions/EVM errors.

Here is the exact technical knowledge you must use:
1. ARC Testnet Network Configuration:
   - Chain ID: 5042002 (Hex: 0x4cef52)
   - RPC Endpoints:
     * https://rpc.testnet.arc.network
     * https://rpc.blockdaemon.testnet.arc.network
     * https://rpc.drpc.testnet.arc.network
     * https://rpc.quicknode.testnet.arc.network
   - Explorer: https://testnet.arcscan.app
   - Native Currency: USDC (USDC is the native fee token on ARC Testnet, not ETH!)
   - Registry Contract: 0xEDcd3636584074cBCa4B685Cc5FE5080E70CC080

2. How to get testnet USDC (Faucet):
   - Users can obtain testnet USDC from the official Circle Faucet at: https://faucet.circle.com
   - They need to select "ARC Testnet" network and paste their wallet address.

3. Wallet Recommendations:
   - Rabby Wallet is highly recommended and works out-of-the-box.
   - MetaMask works, but sometimes requires manual network deletion and re-addition if the RPC is unstable or wrong gas limits are estimated. If transactions get stuck in MetaMask, suggest trying Rabby or removing and re-adding ARC Testnet.

4. Troubleshooting EVM/Transaction Errors:
   - "Wrong Network / Incorrect Chain ID": Explain how to change to 5042002.
   - "Cannot see registry contract / walletRpc error": The user's wallet is connected to an unstable RPC node. Tell them to delete and re-add ARC Testnet, or switch to Rabby.
   - "Insufficient gas / low estimate": ARC Testnet uses USDC for gas. They need USDC from Circle Faucet.
   - "NameTooShort / NameTooLong / InvalidCharacter": Explain ANS naming rules (3-32 chars, lowercase a-z, 0-9, hyphen only).

Be concise, supportive, and structure your responses with markdown bullets and bold text. Keep answers brief so they fit well in a chat drawer. Avoid general pleasantries; get straight to solving the problem.`;

const FALLBACK_ANSWERS = {
  default: "Привет! Я твой онбординг-помощник в сети **ARC**. Я могу помочь тебе настроить кошелек, получить токены или решить проблемы с транзакциями. Задай мне любой вопрос!",
  faucet: "Чтобы получить тестовые USDC для оплаты газа в сети **ARC Testnet**:\n1. Перейди на официальный **Circle Faucet**: https://faucet.circle.com\n2. Выбери сеть **ARC Testnet** в списке сетей.\n3. Скопируй свой адрес кошелька и вставь его в поле ввода.\n4. Нажми кнопку подтверждения. Токены зачислятся в течение нескольких секунд.",
  wallet: "Рекомендуемые кошельки для **ARC Testnet**:\n*   **Rabby Wallet** (рекомендуется): Работает стабильно из коробки, отлично определяет балансы и параметры газа.\n*   **MetaMask**: Работает, но иногда выдает ошибки. Если транзакции зависают, удали сеть ARC Testnet из настроек MetaMask и добавь заново прямо с этого сайта.\n\nПараметры для ручного добавления сети:\n*   Имя сети: `ARC Testnet`\n*   Chain ID: `5042002`\n*   Символ валюты: `USDC`\n*   RPC URL: `https://rpc.testnet.arc.network`\n*   Explorer: `https://testnet.arcscan.app`",
  error: "Если транзакция не проходит или выдает ошибку:\n1. Убедись, что у тебя есть тестовые USDC на балансе для оплаты газа.\n2. Если имя домена занято или содержит недопустимые символы (разрешены только `a-z`, `0-9` и дефис `-`), контракт отклонит транзакцию.\n3. В MetaMask часто помогает сброс кошелька или удаление сети ARC Testnet с последующим передобавлением."
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "Messages array is required" });
    return;
  }

  const lastUserMessage = messages[messages.length - 1]?.content || "";
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Graceful fallback helper when Gemini API Key is not set on Vercel
    const text = lastUserMessage.toLowerCase();
    let reply = FALLBACK_ANSWERS.default;
    if (text.includes("кран") || text.includes("faucet") || text.includes("токен") || text.includes("usdc")) {
      reply = FALLBACK_ANSWERS.faucet;
    } else if (text.includes("кошел") || text.includes("wallet") || text.includes("metamask") || text.includes("rabby") || text.includes("настро")) {
      reply = FALLBACK_ANSWERS.wallet;
    } else if (text.includes("ошибк") || text.includes("error") || text.includes("завис") || text.includes("не проходит") || text.includes("транза")) {
      reply = FALLBACK_ANSWERS.error;
    }
    res.status(200).json({ reply });
    return;
  }

  try {
    // Map messages payload to Gemini format, starting with a user turn
    let apiMessages = messages;
    if (apiMessages[0]?.role === "assistant") {
      apiMessages = apiMessages.slice(1);
    }
    const contents = apiMessages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: SYSTEM_INSTRUCTION }]
        },
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.3
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini API failed with status ${response.status}`);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Извини, не удалось сформировать ответ. Попробуй еще раз.";
    res.status(200).json({ reply });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to process AI query" });
  }
};
