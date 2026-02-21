"use client"

import { useState, useRef, useEffect } from "react"
import { MessageCircle, X, Send, Sparkles, Loader, Star, Mic, Volume2, Copy, RotateCcw } from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ChatMessage {
  role: "user" | "assistant"
  content: string
  products?: Product[]
  language?: string
  originalContent?: string
  isVoiceMessage?: boolean
}

interface Product {
  id: string
  name: string
  brand: string
  price: number
  image: string
  category: string
  rating: number
  reviewCount: number
}

interface ChatContextMemory {
  sessionId: string
  userPreferences: {
    language: string
    preferredCategories: string[]
    budget: number
    style: string
  }
  conversationHistory: ChatMessage[]
  lastInteractionTime: number
}

export function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [detectedLanguage, setDetectedLanguage] = useState("en")
  const [userLanguage, setUserLanguage] = useState("en")
  const [contextMemory, setContextMemory] = useState<ChatContextMemory | null>(null)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

  const suggestedQuestions = ["Help me find a gift", "What's trending now?", "Show me men's fashion", "Affordable shoes"]

  // Initialize Web Speech API
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognition) {
        try {
          recognitionRef.current = new SpeechRecognition()
          recognitionRef.current.continuous = false
          recognitionRef.current.interimResults = true
          recognitionRef.current.lang = 'en-US'
          
          recognitionRef.current.onstart = () => setIsListening(true)
          recognitionRef.current.onend = () => setIsListening(false)
          recognitionRef.current.onerror = (error: any) => {
            console.error('Speech recognition error:', error)
            setIsListening(false)
          }
        } catch (e) {
          console.error('Failed to initialize speech recognition:', e)
        }
      }
    }
  }, [])

  // Initialize context memory (session-based)
  useEffect(() => {
    const sessionId = localStorage.getItem('assistantSessionId') || `session-${Date.now()}`
    localStorage.setItem('assistantSessionId', sessionId)
    
    setContextMemory({
      sessionId,
      userPreferences: {
        language: 'en',
        preferredCategories: [],
        budget: 10000,
        style: 'casual'
      },
      conversationHistory: [],
      lastInteractionTime: Date.now()
    })
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Detect language from text
  const detectLanguage = async (text: string): Promise<string> => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/assistant/detect-language`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      })
      if (response.ok) {
        const data = await response.json()
        return data.language || 'en'
      }
    } catch {
      // Fallback: simple detection based on character patterns
      if (/[\u0900-\u097F]/.test(text)) return 'hi' // Devanagari
      if (/[\u0E00-\u0E7F]/.test(text)) return 'th' // Thai
      if (/[\u4E00-\u9FFF]/.test(text)) return 'zh' // Chinese
    }
    return 'en'
  }

  // Translate text if needed
  const translateText = async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
    if (sourceLang === targetLang) return text
    try {
      const response = await fetch(`${BACKEND_URL}/api/assistant/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, sourceLang, targetLang })
      })
      if (response.ok) {
        const data = await response.json()
        return data.translatedText || text
      }
    } catch {
      // Fallback: return original text if translation fails
    }
    return text
  }

  // Voice input handler
  const startVoiceInput = () => {
    if (!recognitionRef.current) return
    
    // Stop if already listening
    if (isListening) {
      recognitionRef.current.stop()
      return
    }
    
    recognitionRef.current.onresult = async (event: any) => {
      let transcript = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      
      if (event.results[0].isFinal) {
        const detectedLang = await detectLanguage(transcript)
        setDetectedLanguage(detectedLang)
        
        // Translate if needed
        const translatedText = await translateText(transcript, detectedLang, 'en')
        setMessage(translatedText)
      }
    }
    
    recognitionRef.current.onerror = () => {
      setIsListening(false)
    }
    
    try {
      recognitionRef.current.start()
    } catch (e) {
      console.log('Recognition already started or error:', e)
    }
  }

  // Text-to-speech output
  const speakMessage = (text: string) => {
    if (!synth) return
    
    synth.cancel()
    setIsSpeaking(true)
    
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.onend = () => setIsSpeaking(false)
    
    synth.speak(utterance)
  }

  // Send message with enhanced context
  const handleSendMessage = async () => {
    if (!message.trim()) return

    const detectedLang = await detectLanguage(message)
    setDetectedLanguage(detectedLang)

    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      language: detectedLang,
      isVoiceMessage: false
    }
    
    setMessages([...messages, userMessage])
    setMessage("")
    setIsLoading(true)

    try {
      // Try enhanced endpoint first, fallback to standard chat
      let response
      try {
        response = await fetch(`${BACKEND_URL}/api/assistant/chat-enhanced`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            question: message,
            sessionId: contextMemory?.sessionId,
            userLanguage: userLanguage,
            detectedLanguage: detectedLang,
            userPreferences: contextMemory?.userPreferences,
            conversationContext: messages.slice(-5)
          })
        })
      } catch (e) {
        // Fallback to standard chat endpoint
        response = await fetch(`${BACKEND_URL}/api/assistant/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            question: message
          })
        })
      }

      if (response && response.ok) {
        const data = await response.json()
        
        // Translate response if needed
        let responseText = data.response
        if (detectedLang !== 'en') {
          try {
            responseText = await translateText(data.response, 'en', detectedLang)
          } catch (e) {
            // Keep original if translation fails
          }
        }
        
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: responseText,
          products: data.products || [],
          language: detectedLang,
          originalContent: data.response
        }
        
        setMessages(prev => [...prev, assistantMessage])
        
        // Auto-speak response if user used voice input
        if (userMessage.isVoiceMessage) {
          setTimeout(() => speakMessage(responseText), 500)
        }
      } else {
        const errorMessage: ChatMessage = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again."
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      console.error("Error communicating with assistant:", error)
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Sorry, I'm unable to connect to the assistant right now. Please try again later."
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleVoiceMessage = async () => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsListening(false)
    } else {
      // Start listening
      startVoiceInput()
      
      if (recognitionRef.current) {
        const originalOnEnd = recognitionRef.current.onend
        recognitionRef.current.onend = () => {
          setIsListening(false)
          if (message.trim()) {
            setMessage(message) // Message already set by onresult
          }
          if (originalOnEnd) originalOnEnd()
        }
      }
    }
  }

  const handleQuestionClick = (question: string) => {
    setMessage(question)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 sm:right-6 w-[calc(100%-2rem)] sm:w-96 bg-background rounded-2xl shadow-2xl border border-border z-40 overflow-hidden">
          {/* Header with Enhanced Features */}
          <div className="bg-primary px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-primary-foreground">AI Shopping Assistant</h3>
                <p className="text-xs text-primary-foreground/70">
                  {detectedLanguage !== 'en' ? `Detected: ${detectedLanguage.toUpperCase()}` : "Ready to help"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Clear chat"
                className="p-1.5 hover:bg-primary-foreground/10 rounded-full transition-colors"
              >
                <RotateCcw className="h-4 w-4 text-primary-foreground" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-primary-foreground/10 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-primary-foreground" />
              </button>
            </div>
          </div>

          {/* Chat Body */}
          <div className="h-80 overflow-y-auto p-4" ref={scrollRef}>
            {/* Welcome Message */}
            {messages.length === 0 && (
              <>
                <div className="flex gap-3 mb-4">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                    <p className="text-sm text-foreground">
                      Hi! I'm your AI shopping assistant. I speak multiple languages, provide personalized recommendations with INR pricing, and remember your preferences. How can I help?
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">🎙️ Voice</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">🌍 Multi-language</span>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">💡 Smart Context</span>
                    </div>
                  </div>
                </div>

                {/* Suggested Questions */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2 px-11">Quick questions:</p>
                  <div className="flex flex-wrap gap-2 px-11">
                    {suggestedQuestions.map((question) => (
                      <button
                        key={question}
                        onClick={() => handleQuestionClick(question)}
                        className="px-3 py-1.5 text-xs bg-secondary hover:bg-secondary/80 text-foreground rounded-full border border-border transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Chat Messages */}
            {messages.map((msg, index) => (
              <div key={index}>
                <div className={`flex gap-3 mb-4 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-tl-sm"
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    {msg.language && msg.language !== 'en' && (
                      <p className="text-xs opacity-70 mt-1">({msg.language.toUpperCase()})</p>
                    )}
                    {msg.role === "assistant" && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        <button
                          onClick={() => speakMessage(msg.content)}
                          className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/30 rounded transition-colors flex items-center gap-1"
                          title="Play audio"
                        >
                          <Volume2 className="h-3 w-3" /> Speak
                        </button>
                        <button
                          onClick={() => copyToClipboard(msg.content)}
                          className="text-xs px-2 py-1 bg-primary/20 hover:bg-primary/30 rounded transition-colors flex items-center gap-1"
                          title="Copy text"
                        >
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Product Recommendations with INR Pricing */}
                {msg.products && msg.products.length > 0 && (
                  <div className="mb-4 pl-11 pr-2">
                    <div className="grid grid-cols-3 gap-2">
                      {msg.products.map((product) => (
                        <a
                          key={product.id}
                          href={`/product/${product.id}`}
                          className="group rounded-lg bg-secondary/50 hover:bg-secondary p-2 transition-colors"
                        >
                          <div className="aspect-square bg-muted rounded mb-2 overflow-hidden flex items-center justify-center">
                            {product.image ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5" />
                            )}
                          </div>
                          <h4 className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {product.name}
                          </h4>
                          <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-foreground">₹{(product.price * 83).toFixed(0)}</p>
                            <div className="flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-muted-foreground">{product.rating}</span>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex gap-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Loader className="h-4 w-4 text-primary animate-spin" />
                </div>
                <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-sm text-muted-foreground">Analyzing your request...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input Area with Voice */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <button
                onClick={handleVoiceMessage}
                disabled={isLoading || isListening}
                className={`p-2.5 rounded-full transition-colors ${
                  isListening
                    ? "bg-red-500 text-white"
                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                }`}
                title="Voice input"
              >
                <Mic className={`h-4 w-4 ${isListening ? "animate-pulse" : ""}`} />
              </button>
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type or speak..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 text-sm bg-secondary rounded-full border-0 focus:outline-none focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground disabled:opacity-50"
              />
              <button
                onClick={() => {
                  handleSendMessage()
                }}
                disabled={isLoading || !message.trim()}
                className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              🌍 {userLanguage.toUpperCase()} | 💰 INR | 🎙️ Voice Enabled
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-4 sm:right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 transition-all duration-300 ${
          isOpen ? "bg-muted-foreground rotate-0" : "bg-primary hover:scale-105"
        }`}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-background" />
        ) : (
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        )}
      </button>
    </>
  )
}
