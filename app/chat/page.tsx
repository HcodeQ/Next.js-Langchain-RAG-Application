"use client"

import type React from "react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useChat } from "ai/react"
import { useRef, useEffect, useState } from "react"
import { Send, Mic, Plus, Loader2 } from 'lucide-react'
import { Card } from "@/components/ui/card"

// Déclaration de SpeechRecognition pour TypeScript
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognition
    webkitSpeechRecognition: SpeechRecognition
  }
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    onError: (e) => {
      console.log(e)
    },
  })
  const chatParent = useRef<HTMLUListElement>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Effet pour faire défiler vers le bas lorsque de nouveaux messages arrivent
  useEffect(() => {
    const domNode = chatParent.current
    if (domNode) {
      domNode.scrollTop = domNode.scrollHeight
    }
  }, [messages])

  // Nettoyage de la reconnaissance vocale lors du démontage du composant
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
        recognitionRef.current = null
      }
    }
  }, [])

  // Gestion de l'indicateur de saisie
  const handleInputChangeWithTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleInputChange(e)

    setIsTyping(true)

    // Réinitialiser le timeout précédent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Définir un nouveau timeout
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
    }, 1000)
  }

  // Fonction pour la saisie vocale
  const toggleVoiceRecognition = () => {
    if (isListening) {
      stopVoiceRecognition()
      return
    }

    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("La reconnaissance vocale n'est pas prise en charge par votre navigateur.")
      return
    }

    try {
      setIsListening(true)

      // Créer une instance de reconnaissance vocale
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition

      recognition.lang = "fr-FR"
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        // Mettre à jour l'entrée avec le texte reconnu
        const inputEvent = {
          target: { value: input + transcript },
        } as React.ChangeEvent<HTMLInputElement>

        handleInputChange(inputEvent)
      }

      recognition.onend = () => {
        // Vérifier si l'utilisateur a intentionnellement arrêté l'écoute
        if (isListening && !recognition.aborted) {
          // Tenter de redémarrer la reconnaissance si elle s'est arrêtée d'elle-même
          try {
            recognition.start()
          } catch (error) {
            console.log("Impossible de redémarrer la reconnaissance vocale:", error)
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }

      recognition.onerror = (event) => {
        console.log("Erreur de reconnaissance vocale:", event.error)

        // Ne pas afficher d'alerte pour les erreurs "aborted" car c'est un comportement normal
        if (event.error !== "aborted") {
          console.error("Erreur de reconnaissance vocale:", event.error)
        }

        // Pour les erreurs "no-speech", on peut réessayer
        if (event.error === "no-speech") {
          try {
            recognition.stop()
            setTimeout(() => {
              if (isListening) {
                recognition.start()
              }
            }, 100)
          } catch (e) {
            setIsListening(false)
          }
        } else {
          setIsListening(false)
        }
      }

      recognition.start()
    } catch (error) {
      console.error("Erreur lors du démarrage de la reconnaissance vocale:", error)
      setIsListening(false)
    }
  }

  // Fonction pour arrêter la reconnaissance vocale
  const stopVoiceRecognition = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort() // Utiliser abort() au lieu de stop() pour éviter l'erreur "aborted"
        recognitionRef.current = null
      } catch (error) {
        console.error("Erreur lors de l'arrêt de la reconnaissance vocale:", error)
      }
    }
    setIsListening(false)
  }

  // Fonction pour soumettre le formulaire avec indicateur de chargement
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (input.trim() === "") return

    // Arrêter la reconnaissance vocale si elle est active
    if (isListening) {
      stopVoiceRecognition()
    }

    handleSubmit(e)
  }

  return (
    <main className="flex flex-col w-full h-screen max-h-dvh bg-[#0f1424]">
      <header className="p-6 w-full max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-white">Tu veux discuter sur quoi ?</h1>
      </header>

      <section className="container px-4 pb-10 flex flex-col flex-grow gap-4 mx-auto max-w-4xl">
        <ul ref={chatParent} className="flex-grow rounded-lg overflow-y-auto flex flex-col gap-4 mb-4">
          {messages.map((m, index) => (
            <div key={index}>
              {m.role === "user" ? (
                <li key={m.id} className="flex flex-row justify-end">
                  <div className="rounded-2xl p-4 bg-[#3b82f6] shadow-md max-w-[75%]">
                    <p className="text-white">{m.content}</p>
                  </div>
                </li>
              ) : (
                <li key={m.id} className="flex flex-row">
                  <div className="rounded-2xl p-4 bg-[#1a1f36] shadow-md max-w-[75%]">
                    <p className="text-white">{m.content}</p>
                  </div>
                </li>
              )}
            </div>
          ))}

          {/* Indicateur de saisie */}
          {isTyping && (
            <li className="flex flex-row justify-end">
              <div className="rounded-2xl p-3 bg-[#3b82f6] bg-opacity-50 shadow-md">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </li>
          )}

          {/* Indicateur de réponse de l'IA */}
          {isLoading && (
            <li className="flex flex-row">
              <div className="rounded-2xl p-3 bg-[#1a1f36] shadow-md">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-white rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </li>
          )}
        </ul>

        <div className="text-center text-gray-400 text-sm mb-4">Il est possible que Copilot fasse des erreurs.</div>

        <div className="relative">
          <Card className="bg-[#1a1f36] border-none rounded-full px-4 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            <form onSubmit={onSubmit} className="flex w-full items-center p-1">
              <div className="flex items-center justify-center h-10 w-10 rounded-full">
                <Plus className="h-5 w-5 text-gray-400" />
              </div>
              <Input
                className="flex-1 max-h-[30px] bg-transparent border-none text-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400"
                placeholder="Message Copilot"
                type="text"
                value={input}
                onChange={handleInputChangeWithTyping}
                disabled={isLoading}
              />
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={`rounded-full relative ${isListening ? "text-red-500 bg-red-100 animate-pulse" : "text-gray-400"}`}
                  onClick={toggleVoiceRecognition}
                  disabled={isLoading}
                >
                  {isListening ? (
                    <>
                      {/* Spectrogramme */}
                      <div className="fixed top-auto bottom-[80px] left-1/2 transform -translate-x-1/2 z-[9999]">
                        <div className="spectrogram">
                          <div className="bar"></div>
                          <div className="bar"></div>
                          <div className="bar"></div>
                          <div className="bar"></div>
                          <div className="bar"></div>
                          <div className="bar"></div>
                          <div className="bar"></div>
                        </div>
                      </div>
                      {/* Ondes sonores animées */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="sound-wave">
                          <span></span>
                          <span></span>
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                      <Mic className="h-5 w-5 z-10" />
                    </>
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-gray-400"
                  disabled={isLoading || input.trim() === ""}
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </section>
    </main>
  )
}