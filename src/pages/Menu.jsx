import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://vhaulvmtgomjgfkeqavg.supabase.co',
  'sb_publishable_bFCrDNP_8oFJIC9mttAfxA_J34xZVXw'
)

export default function Menu() {
  const { restaurantId, tableId } = useParams()
  const navigate = useNavigate()
  const [platos, setPlatos] = useState([])
  const [car