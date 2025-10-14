"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, QrCode, Copy, Check } from "lucide-react"

export function InstructionsPanel() {
  const [isOpen, setIsOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const currentUrl = typeof window !== "undefined" ? window.location.href : ""

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 left-4 z-50 bg-blue-600 hover:bg-blue-700"
        size="sm"
      >
        Show Instructions
      </Button>
    )
  }

  return (
    <Card className="fixed top-20 left-4 z-50 p-6 max-w-md bg-white shadow-2xl">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-bold text-gray-900">How to Participate</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4 text-sm text-gray-700">
        <div className="space-y-2">
          <p className="font-semibold text-blue-600">For Participants:</p>
          <ol className="list-decimal list-inside space-y-2 ml-2">
            <li>Click anywhere on the map to drop your location pin</li>
            <li>Enter your city, country, and current weather</li>
            <li>Watch as everyone's pins appear in real-time!</li>
          </ol>
        </div>

        <div className="border-t pt-4">
          <p className="font-semibold text-teal-600 mb-2">Share this page:</p>
          <div className="flex gap-2">
            <Button onClick={handleCopyLink} variant="outline" size="sm" className="flex-1 bg-transparent">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button onClick={() => setShowQR(!showQR)} variant="outline" size="sm">
              <QrCode className="w-4 h-4 mr-2" />
              QR Code
            </Button>
          </div>

          {showQR && (
            <div className="mt-4 p-4 bg-white rounded border flex flex-col items-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`}
                alt="QR Code"
                className="w-48 h-48"
              />
              <p className="text-xs text-gray-500 mt-2 text-center">Scan to join on mobile</p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-3 rounded text-xs">
          <p className="font-semibold mb-1">💡 Tip for Hosts:</p>
          <p>
            Share the link in Zoom chat or display the QR code. Screen share this page to show everyone's locations!
          </p>
        </div>
      </div>
    </Card>
  )
}
