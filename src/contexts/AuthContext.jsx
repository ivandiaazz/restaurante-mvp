import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

function generateSlug(nombre) {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchRestaurant(session.user.id)
      } else {
        setAuthLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchRestaurant(session.user.id)
      } else {
        setRestaurant(null)
        setAuthLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchRestaurant(userId) {
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('user_id', userId)
      .single()
    setRestaurant(data ?? null)
    setAuthLoading(false)
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signUp(email, password, restaurantData) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    const slug = generateSlug(restaurantData.nombre)
    const { error: dbError } = await supabase.from('restaurants').insert({
      user_id: data.user.id,
      nombre: restaurantData.nombre,
      tipo: restaurantData.tipo,
      ciudad: restaurantData.ciudad,
      email,
      slug,
    })
    if (dbError) throw dbError

    return { user: data.user, slug }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, restaurant, authLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}