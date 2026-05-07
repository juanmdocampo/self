import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchConversations, fetchMessages, sendMessage } from '../api'

const AVATARS = ['👩‍⚕️', '🧑‍⚕️', '👨‍⚕️', '👩‍💼', '🧑‍💼']
const POLL_MS = 4000

function formatTime(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function otherUser(conv, currentUserId) {
  return conv.patient.id === currentUserId ? conv.psychologist : conv.patient
}

function ConversationList({ conversations, selectedId, onSelect, currentUserId }) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-warm-mid text-center px-6 py-20">
        <div className="text-4xl">💬</div>
        <div className="font-medium text-sm">No tenés conversaciones todavía.</div>
        <div className="text-xs">Usá el botón "Chatear" desde tus favoritos.</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-y-auto">
      {conversations.map(conv => {
        const other = otherUser(conv, currentUserId)
        const name = [other.first_name, other.last_name].filter(Boolean).join(' ') || other.username
        const avatar = AVATARS[other.id % AVATARS.length]
        const isSelected = conv.id === selectedId
        const hasUnread = conv.unread_count > 0

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={`flex items-center gap-3 px-4 py-3.5 text-left transition-all border-b border-warm-dark/[0.06] ${
              isSelected ? 'bg-sage/[0.12]' : 'hover:bg-warm-dark/[0.04]'
            }`}
          >
            <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-xl border-2 border-sage">
              {other.avatar
                ? <img src={other.avatar} alt={name} className="w-full h-full object-cover" />
                : avatar
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm truncate ${hasUnread ? 'font-semibold text-warm-dark' : 'font-medium text-warm-dark'}`}>
                  {name}
                </span>
                {conv.last_message && (
                  <span className="text-[10px] text-warm-mid flex-shrink-0">
                    {formatTime(conv.last_message.created_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <span className="text-xs text-warm-mid truncate">
                  {conv.last_message ? conv.last_message.text : 'Sin mensajes aún'}
                </span>
                {hasUnread && (
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-sage-dark text-white text-[9px] flex items-center justify-center font-bold">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function MessageBubble({ msg, isMine }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMine
            ? 'bg-warm-dark text-cream rounded-br-sm'
            : 'bg-card-bg border border-warm-dark/[0.08] text-warm-dark rounded-bl-sm'
        }`}
      >
        <p>{msg.text}</p>
        <p className={`text-[10px] mt-1 ${isMine ? 'text-cream/60' : 'text-warm-mid'}`}>
          {formatTime(msg.created_at)}
        </p>
      </div>
    </div>
  )
}

function ChatView({ conversationId, currentUserId, conversations }) {
  const { token } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const conv = conversations.find(c => c.id === conversationId)
  const other = conv ? otherUser(conv, currentUserId) : null
  const otherName = other ? ([other.first_name, other.last_name].filter(Boolean).join(' ') || other.username) : ''
  const otherAvatar = other ? AVATARS[other.id % AVATARS.length] : null

  const loadMessages = useCallback(async () => {
    const data = await fetchMessages(token, conversationId)
    setMessages(data)
  }, [token, conversationId])

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, POLL_MS)
    return () => clearInterval(interval)
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [conversationId])

  async function handleSend(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      const msg = await sendMessage(token, conversationId, trimmed)
      setMessages(prev => [...prev, msg])
      setText('')
    } catch {}
    setSending(false)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-warm-dark/[0.08] flex-shrink-0">
        <div className="w-9 h-9 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-[#C8D8C9] to-[#D8C8BE] flex items-center justify-center text-lg border-2 border-sage">
          {other?.avatar
            ? <img src={other.avatar} alt={otherName} className="w-full h-full object-cover" />
            : otherAvatar
          }
        </div>
        <div>
          <div className="font-semibold text-warm-dark text-sm">{otherName}</div>
          <div className="text-xs text-warm-mid">
            {other?.psychologist_profile ? 'Psicólogo/a' : 'Paciente'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-warm-mid text-center">
            <div className="text-3xl">👋</div>
            <div className="text-sm">Empezá la conversación.</div>
          </div>
        ) : (
          messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isMine={msg.sender_id === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-warm-dark/[0.08] flex-shrink-0">
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 px-4 py-2.5 rounded-full bg-card-bg border border-warm-dark/[0.10] text-sm text-warm-dark placeholder-warm-mid/60 focus:outline-none focus:border-sage-dark transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full bg-warm-dark text-cream flex items-center justify-center hover:bg-sage-dark transition-all disabled:opacity-40 flex-shrink-0 text-base"
        >
          ↑
        </button>
      </form>
    </div>
  )
}

export default function Chat() {
  const { token, currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)

  const selectedId = Number(searchParams.get('c')) || null

  const loadConversations = useCallback(async () => {
    if (!token) return
    const data = await fetchConversations(token)
    setConversations(data)
    setLoading(false)
  }, [token])

  useEffect(() => {
    loadConversations()
    const interval = setInterval(loadConversations, POLL_MS)
    return () => clearInterval(interval)
  }, [loadConversations])

  function handleSelect(id) {
    setSearchParams({ c: id })
  }

  return (
    <div className="flex h-[calc(100vh-65px)]">
      {/* Conversation list */}
      <div className={`flex flex-col border-r border-warm-dark/[0.08] bg-cream ${selectedId ? 'hidden md:flex md:w-80 lg:w-96' : 'flex-1 md:w-80 lg:w-96'}`}>
        <div className="px-5 py-4 border-b border-warm-dark/[0.08] flex-shrink-0">
          <h1 className="font-serif text-xl font-bold text-warm-dark">Mensajes</h1>
        </div>
        {loading ? (
          <div className="flex items-center justify-center flex-1 text-warm-mid text-sm">Cargando...</div>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelect}
            currentUserId={currentUser?.id}
          />
        )}
      </div>

      {/* Chat panel */}
      <div className={`flex-1 flex flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
        {selectedId ? (
          <>
            {/* Back button on mobile */}
            <div className="md:hidden px-4 pt-3 flex-shrink-0">
              <button
                onClick={() => setSearchParams({})}
                className="text-xs text-warm-mid hover:text-warm-dark transition-colors"
              >
                ← Volver
              </button>
            </div>
            <ChatView
              conversationId={selectedId}
              currentUserId={currentUser?.id}
              conversations={conversations}
            />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-warm-mid text-center px-10">
            <div className="text-5xl">💬</div>
            <div className="font-medium">Seleccioná una conversación</div>
            <div className="text-sm">Tus mensajes con psicólogos aparecerán acá.</div>
          </div>
        )}
      </div>
    </div>
  )
}
