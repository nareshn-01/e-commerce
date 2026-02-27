"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Mail, MessageSquare } from "lucide-react"

export function FeedbackForm() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("https://formspree.io/f/meegkylb", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success!",
          description: "Your feedback has been sent successfully. Thank you!",
        })
        setFormData({
          name: "",
          email: "",
          subject: "",
          message: "",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to send feedback. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Feedback form error:", error)
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 rounded-lg border border-primary/20 mb-8">
        <div className="flex items-center gap-3 mb-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">We'd Love Your Feedback</h2>
        </div>
        <p className="text-muted-foreground">Help us improve by sharing your thoughts, suggestions, or reporting issues.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Name *</label>
          <Input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your name"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email *
          </label>
          <Input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your.email@example.com"
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Subject *</label>
        <Input
          type="text"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="What is your feedback about?"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Message *</label>
        <Textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Tell us what you think. We read every message!"
          rows={6}
          disabled={loading}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Feedback"}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        We appreciate your feedback and will review it shortly.
      </p>
    </form>
  )
}
