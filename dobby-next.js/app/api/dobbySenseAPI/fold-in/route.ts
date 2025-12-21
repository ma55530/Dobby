import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FoldInRequest } from '@/lib/types/DS_API/Fold-in-Request'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  const user = session?.user
  if (sessionError || !user) {
    console.log("[fold-in] Unauthorized access attempt.")
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: FoldInRequest
  try {
    payload = await request.json()
    console.log("[fold-in] Received payload:", payload)
  } catch {
    console.log("[fold-in] Invalid JSON payload.")
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const { selectedGenres } = payload
  if (!Array.isArray(selectedGenres) || selectedGenres.length === 0) {
    console.log("[fold-in] selectedGenres missing or empty:", selectedGenres)
    return NextResponse.json({ error: 'selectedGenres must be a non-empty array of genre names' }, { status: 400 })
  }

  try {
    // Fetch latest genre layer from Supabase
    console.log("[fold-in] Fetching latest genre layer from Supabase...")
    const { data: model, error: modelError } = await supabase
      .from('genre_layers')
      .select('name, genre_names, weight, bias')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (modelError) {
      console.log("[fold-in] Error fetching genre layer:", modelError)
      return NextResponse.json({ error: modelError.message }, { status: 500 })
    }
    if (!model) {
      console.log("[fold-in] No genre layer found in DB.")
      return NextResponse.json({ error: 'No genre layer found' }, { status: 500 })
    }

    console.log("[fold-in] Loaded genre layer:", model.name)
    console.log("[fold-in] Model genre_names:", model.genre_names)

    const genre_names: string[] = model.genre_names
    const W: number[][] = model.weight
    const b: number[] | undefined = model.bias

    // Build name->index map
    const nameToIdx = new Map<string, number>()
    genre_names.forEach((g, i) => nameToIdx.set(g, i))

    const selectedIdxs: number[] = []
    for (const g of selectedGenres) {
      const idx = nameToIdx.get(g)
      if (typeof idx === 'number') selectedIdxs.push(idx)
      else console.log(`[fold-in] Genre "${g}" not found in model.`)
    }
    console.log("[fold-in] Selected genre indices:", selectedIdxs)

    if (selectedIdxs.length === 0) {
      console.log("[fold-in] None of the provided genres match the model metadata.")
      return NextResponse.json({ error: 'None of the provided genres match the model metadata' }, { status: 400 })
    }

    const nFactors = W.length
    const emb = new Array<number>(nFactors).fill(0)
    for (const j of selectedIdxs) {
      for (let i = 0; i < nFactors; i++) {
        emb[i] += W[i][j]
      }
    }
    const count = selectedIdxs.length
    for (let i = 0; i < nFactors; i++) {
      emb[i] = emb[i] / count
      if (b && b.length === nFactors) emb[i] += b[i]
      if (!Number.isFinite(emb[i])) emb[i] = 0
    }

    console.log("[fold-in] Calculated embedding:", emb)

    // Upsert into user_embeddings
    const { data: upserted, error: upsertError } = await supabase
      .from('user_embeddings')
      .upsert({ user_id: user.id, embedding: emb })
      .select('*')

    if (upsertError) {
      console.log("[fold-in] Error upserting embedding:", upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    console.log("[fold-in] Embedding upserted successfully for user:", user.id)

    return NextResponse.json({ ok: true, embedding: emb, db: upserted })
  } catch (err: unknown) {
    console.log("[fold-in] Unexpected error:", err)
    if (err && typeof err === 'object' && 'message' in err) {
      return NextResponse.json({ error: String((err as { message?: string }).message) }, { status: 500 })
    }
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}