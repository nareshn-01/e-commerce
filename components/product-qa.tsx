"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThumbsUp, MessageCircle } from "lucide-react"

interface Question {
  id: string
  question: string
  author: string
  date: string
  upvotes: number
  answers: Answer[]
}

interface Answer {
  id: string
  answer: string
  author: string
  date: string
  upvotes: number
  verified: boolean
}

const mockQuestions: Question[] = [
  {
    id: "1",
    question: "What is the material quality? Is it pure cotton?",
    author: "Rajesh K.",
    date: "2 days ago",
    upvotes: 12,
    answers: [
      {
        id: "a1",
        answer: "Yes, it's 100% pure cotton. Very comfortable and breathable!",
        author: "Priya M.",
        date: "1 day ago",
        upvotes: 8,
        verified: true
      },
      {
        id: "a2",
        answer: "The quality is excellent. I've washed it 3 times and no shrinkage.",
        author: "Amit S.",
        date: "1 day ago",
        upvotes: 5,
        verified: false
      }
    ]
  },
  {
    id: "2",
    question: "Does it fit true to size? Should I order one size up?",
    author: "Neha P.",
    date: "5 days ago",
    upvotes: 24,
    answers: [
      {
        id: "a3",
        answer: "It fits perfectly as per size chart. No need to size up.",
        author: "Vikram D.",
        date: "4 days ago",
        upvotes: 15,
        verified: true
      }
    ]
  },
  {
    id: "3",
    question: "Is this suitable for formal occasions?",
    author: "Suresh B.",
    date: "1 week ago",
    upvotes: 7,
    answers: []
  }
]

export function ProductQuestionsAnswers() {
  const [questions] = useState<Question[]>(mockQuestions)
  const [showAskQuestion, setShowAskQuestion] = useState(false)
  const [newQuestion, setNewQuestion] = useState("")

  const handleAskQuestion = () => {
    if (newQuestion.trim()) {
      // In production, this would call an API
      console.log("New question:", newQuestion)
      setNewQuestion("")
      setShowAskQuestion(false)
    }
  }

  return (
    <div className="border-t border-border pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Questions & Answers</h2>
          <p className="text-sm text-muted-foreground mt-1">{questions.length} questions</p>
        </div>
        <Button onClick={() => setShowAskQuestion(!showAskQuestion)}>
          <MessageCircle className="mr-2 h-4 w-4" />
          Ask a Question
        </Button>
      </div>

      {showAskQuestion && (
        <div className="mb-6 p-4 border border-border rounded-lg bg-secondary/20">
          <h3 className="font-semibold mb-3">Ask your question</h3>
          <Textarea
            placeholder="What would you like to know about this product?"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            rows={3}
            className="mb-3"
          />
          <div className="flex gap-2">
            <Button onClick={handleAskQuestion}>Submit Question</Button>
            <Button variant="outline" onClick={() => setShowAskQuestion(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {questions.map((q) => (
          <div key={q.id} className="border-b border-border pb-6 last:border-b-0">
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 bg-primary/10">
                <AvatarFallback>{q.author[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-foreground">{q.question}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{q.author}</span>
                      <span>•</span>
                      <span>{q.date}</span>
                    </div>
                  </div>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{q.upvotes}</span>
                  </button>
                </div>

                {q.answers.length > 0 && (
                  <div className="mt-4 space-y-3 ml-4 border-l-2 border-border pl-4">
                    {q.answers.map((answer) => (
                      <div key={answer.id} className="bg-secondary/30 rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6 bg-primary/10">
                              <AvatarFallback className="text-xs">{answer.author[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{answer.author}</span>
                                {answer.verified && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                    Verified Purchase
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{answer.date}</p>
                            </div>
                          </div>
                          <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                            <ThumbsUp className="h-3 w-3" />
                            <span>{answer.upvotes}</span>
                          </button>
                        </div>
                        <p className="text-sm text-foreground">{answer.answer}</p>
                      </div>
                    ))}
                  </div>
                )}

                {q.answers.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2 italic">No answers yet. Be the first to answer!</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {questions.length > 3 && (
        <div className="mt-6 text-center">
          <Button variant="outline">See All Questions ({questions.length})</Button>
        </div>
      )}
    </div>
  )
}
