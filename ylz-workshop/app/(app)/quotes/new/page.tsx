'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Template {
  id: string
  name: string
  category: string
  description: string
  imagePath: string
  basePrice: number
  configuration: Record<string, unknown>
  sortOrder: number
}

const CATEGORY_LABELS: Record<string, string> = {
  'quick-quote': 'Quick Quote',
  'truck-body': 'Truck Body',
  'trailer': 'Trailer',
  'truck-and-trailer': 'Truck + Trailer',
}

const CATEGORY_ORDER = ['quick-quote', 'truck-body', 'trailer', 'truck-and-trailer']

function fmt(n: number) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function PlaceholderImage({ name }: { name: string }) {
  return (
    <div style={{
      width: '100%',
      aspectRatio: '16/5',
      background: '#0a0a0a',
      borderRadius: 5,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px dashed rgba(232,104,26,0.25)',
      marginBottom: 8,
    }}>
      <div style={{ fontSize: 22, opacity: 0.2 }}>🚛</div>
    </div>
  )
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)
  if (error || !src) return <PlaceholderImage name={alt} />
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setError(true)}
      style={{
        width: '100%',
        aspectRatio: '16/5',
        objectFit: 'cover',
        borderRadius: 5,
        marginBottom: 8,
        display: 'block',
      }}
    />
  )
}

export default function NewQuotePage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/templates?active=true')
      .then((r) => r.json())
      .then((data) => { setTemplates(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function handleSelect(template: Template) {
    router.push(`/quotes/builder?templateId=${template.id}`)
  }

  function handleCustomBuild() {
    router.push('/quotes/builder')
  }

  const grouped = CATEGORY_ORDER.reduce<Record<string, Template[]>>((acc, cat) => {
    const items = templates.filter((t) => t.category === cat).sort((a, b) => a.sortOrder - b.sortOrder)
    if (items.length > 0) acc[cat] = items
    return acc
  }, {})

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <button
            onClick={() => router.push('/quotes')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ← Quotes
          </button>
        </div>
        <h1 style={{
          fontFamily: "'League Spartan', sans-serif",
          fontSize: 28, fontWeight: 800, letterSpacing: 2,
          textTransform: 'uppercase', color: '#fff', margin: 0,
        }}>
          New Quote
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
          Select a quick quote template or configure a custom build from scratch.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.3)' }}>
          Loading templates...
        </div>
      ) : (
        <>
          {/* Quick Quote section */}
          {grouped['quick-quote'] && (() => {
            const isTrailerOnly = (t: Template) => (t.configuration as Record<string, unknown>).buildType === 'trailer'
            const isBeavertail  = (t: Template) => (t.configuration as Record<string, unknown>).buildType === 'beavertail'
            const hardox          = grouped['quick-quote'].filter(t => !isTrailerOnly(t) && !isBeavertail(t) && (t.name.toLowerCase().startsWith('hardox') || t.name.includes('10m3 Hardox')))
            const alloy           = grouped['quick-quote'].filter(t => !isTrailerOnly(t) && !isBeavertail(t) && t.name.toLowerCase().startsWith('alloy'))
            const trailers        = grouped['quick-quote'].filter(isTrailerOnly)
            const beavertailTrays = grouped['quick-quote'].filter(isBeavertail)
            const other           = grouped['quick-quote'].filter(t => !isTrailerOnly(t) && !isBeavertail(t) && !hardox.includes(t) && !alloy.includes(t))
            const rowGrid = (count: number, max = 4) => ({
              display: 'grid',
              gridTemplateColumns: `repeat(${Math.min(count, max)}, minmax(0, 1fr))`,
              gap: 10,
              overflowX: 'auto' as const,
            })
            return (
              <section style={{ marginBottom: 48 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff' }}>
                    ⚡ Quick Quote
                  </div>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                    Fixed-price standard builds — ready in seconds
                  </div>
                </div>

                {hardox.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#E8681A', marginBottom: 10 }}>Hardox</div>
                    <div style={{ ...rowGrid(hardox.length, 6), marginBottom: 16 }}>
                      {hardox.map(t => <QuickQuoteCard key={t.id} template={t} onSelect={handleSelect} />)}
                    </div>
                  </>
                )}

                {alloy.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Alloy</div>
                    <div style={{ ...rowGrid(alloy.length), marginBottom: trailers.length > 0 ? 20 : 0 }}>
                      {alloy.map(t => <QuickQuoteCard key={t.id} template={t} onSelect={handleSelect} />)}
                    </div>
                  </>
                )}

                {trailers.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Trailer Only</div>
                    <div style={rowGrid(trailers.length)}>
                      {trailers.map(t => <QuickQuoteCard key={t.id} template={t} onSelect={handleSelect} />)}
                    </div>
                  </>
                )}

                {beavertailTrays.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10, marginTop: trailers.length > 0 ? 20 : 0 }}>Beavertail / Trays</div>
                    <div style={{ ...rowGrid(beavertailTrays.length), marginBottom: other.length > 0 ? 20 : 0 }}>
                      {beavertailTrays.map(t => <QuickQuoteCard key={t.id} template={t} onSelect={handleSelect} />)}
                    </div>
                  </>
                )}

                {other.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 10, marginTop: (trailers.length > 0 || beavertailTrays.length > 0) ? 20 : 0 }}>Other</div>
                    <div style={rowGrid(other.length)}>
                      {other.map(t => <QuickQuoteCard key={t.id} template={t} onSelect={handleSelect} />)}
                    </div>
                  </>
                )}
              </section>
            )
          })()}

          {/* Repairs & Warranty section */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ fontFamily: "'League Spartan', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#fff' }}>
                🔩 Repairs & Warranty
              </div>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>
                Quote for repair work or warranty claims
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              <RepairCard
                label="Repairs / Warranty"
                desc="Repair work, modifications, or warranty claims on existing builds. Price on application."
                onClick={() => router.push('/quotes/builder?buildType=repairs')}
              />
            </div>
          </section>

          {/* Configure Build section */}
          <section style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 13, fontWeight: 800, letterSpacing: 2,
                textTransform: 'uppercase', color: '#fff',
              }}>
                🔧 Configure Build
              </div>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{
                fontSize: 11, color: 'rgba(255,255,255,0.3)',
                fontStyle: 'italic',
              }}>
                Start from a template and customise every option
              </div>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 16,
            }}>
              {/* Custom build card */}
              <ConfigCard
                icon="⚙️"
                label="Custom Build"
                desc="Start from scratch — full configurator with all options"
                accent
                onClick={handleCustomBuild}
              />
              {/* Template-seeded configure cards */}
              {['truck-body', 'trailer', 'truck-and-trailer'].flatMap((cat) =>
                (grouped[cat] || []).map((t) => (
                  <ConfigCard
                    key={t.id}
                    icon={cat === 'truck-body' ? '🚛' : cat === 'trailer' ? '🚜' : '🚛🚜'}
                    label={t.name}
                    desc={t.description}
                    onClick={() => handleSelect(t)}
                  />
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

// ─── Quick Quote card — prominent, shows price ───────────────────────────────
function QuickQuoteCard({
  template,
  onSelect,
}: {
  template: Template
  onSelect: (t: Template) => void
}) {
  const [hovered, setHovered] = useState(false)
  const cfg = template.configuration as Record<string, unknown>
  const isTruckAndTrailer = template.configuration.buildType === 'truck-and-trailer'

  const tags: string[] = []
  if (cfg.material) tags.push(String(cfg.material))
  if (cfg.pbsRating) tags.push(`PBS ${cfg.pbsRating}`)
  if (cfg.capacity) tags.push(String(cfg.capacity))

  const truckCfg = cfg.truckConfig as Record<string, unknown> | undefined
  const trailerCfg = cfg.trailerConfig as Record<string, unknown> | undefined

  return (
    <div
      onClick={() => onSelect(template)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#1a1a1a' : '#111',
        border: `2px solid ${hovered ? '#E8681A' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 10,
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.18s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 6px 24px rgba(232,104,26,0.12)' : 'none',
        position: 'relative',
      }}
    >
      {/* Quick Quote badge */}
      <div style={{
        position: 'absolute', top: 14, right: 14,
        fontSize: 9, fontWeight: 700, letterSpacing: 1,
        textTransform: 'uppercase',
        background: '#E8681A', color: '#fff',
        padding: '3px 8px', borderRadius: 4,
      }}>
        Quick Quote
      </div>

      <ProductImage src={template.imagePath} alt={template.name} />

      <div style={{
        fontFamily: "'League Spartan', sans-serif",
        fontSize: 14, fontWeight: 800, letterSpacing: 0.3,
        color: '#fff', marginBottom: 4, paddingRight: 70, lineHeight: 1.3,
      }}>
        {template.name}
      </div>

      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10, lineHeight: 1.4,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {template.description}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {tags.map((tag) => (
            <span key={tag} style={{
              fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 3,
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Pricing */}
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingTop: 10,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
      }}>
        {isTruckAndTrailer && truckCfg && trailerCfg ? (
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
              {template.basePrice > 0 ? 'From' : 'Price on application'}
            </div>
            {template.basePrice > 0 && (
              <div style={{
                fontFamily: "'League Spartan', sans-serif",
                fontSize: 22, fontWeight: 800, color: '#E8681A', lineHeight: 1,
              }}>
                ${fmt(template.basePrice)}
              </div>
            )}
            {template.basePrice > 0 && truckCfg.price && trailerCfg.price ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                ex GST &mdash; truck ${fmt(Number(truckCfg.price))} + trailer ${fmt(Number(trailerCfg.price))}
              </div>
            ) : template.basePrice > 0 ? (
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>ex GST</div>
            ) : null}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>
              {template.basePrice > 0 ? 'From' : 'Price on application'}
            </div>
            {template.basePrice > 0 && (
              <>
                <div style={{
                  fontFamily: "'League Spartan', sans-serif",
                  fontSize: 22, fontWeight: 800, color: '#E8681A', lineHeight: 1,
                }}>
                  ${fmt(template.basePrice)}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>ex GST</div>
              </>
            )}
          </div>
        )}

        <div style={{
          fontSize: 11, color: hovered ? '#E8681A' : 'rgba(255,255,255,0.35)',
          fontWeight: 600, transition: 'color 0.15s',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          Select →
        </div>
      </div>
    </div>
  )
}

// ─── Repair card — same style as QuickQuoteCard but no price ─────────────────
function RepairCard({ label, desc, onClick }: { label: string; desc: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#1a1a1a' : '#111',
        border: `2px solid ${hovered ? '#E8681A' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 10,
        padding: 14,
        cursor: 'pointer',
        transition: 'all 0.18s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 6px 24px rgba(232,104,26,0.12)' : 'none',
        position: 'relative',
      }}
    >
      <div style={{
        position: 'absolute', top: 14, right: 14,
        fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
        background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
        padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)',
      }}>
        Repairs
      </div>
      <div style={{ fontSize: 28, marginBottom: 8 }}>🔩</div>
      <div style={{
        fontFamily: "'League Spartan', sans-serif",
        fontSize: 14, fontWeight: 800, letterSpacing: 0.3,
        color: '#fff', marginBottom: 6, paddingRight: 70, lineHeight: 1.3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 10, lineHeight: 1.4,
      }}>
        {desc}
      </div>
      <div style={{
        borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Price on application</div>
        <div style={{
          fontSize: 11, color: hovered ? '#E8681A' : 'rgba(255,255,255,0.35)',
          fontWeight: 600, transition: 'color 0.15s',
        }}>
          Select →
        </div>
      </div>
    </div>
  )
}

// ─── Configure card — smaller, text only ─────────────────────────────────────
function ConfigCard({
  icon,
  label,
  desc,
  accent,
  onClick,
}: {
  icon: string
  label: string
  desc: string
  accent?: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? '#1a1a1a' : '#111',
        border: `1.5px solid ${hovered ? '#E8681A' : accent ? 'rgba(232,104,26,0.3)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 10,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{
        fontFamily: "'League Spartan', sans-serif",
        fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
        color: '#fff', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
        {desc}
      </div>
    </div>
  )
}
