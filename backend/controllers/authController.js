// =======================
// FILE: /controllers/authController.js
// =======================
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '../config/supabaseClient.js'

// ✅ Register a new farmer
export const registerFarmer = async (req, res) => {
  try {
    const { name, email, password, city, village } = req.body

    // 1️⃣ Check if farmer already exists
    const { data: existingFarmer, error: selectError } = await supabase
      .from('farmer')
      .select('email')
      .eq('email', email)
      .single() // .single() is efficient for one-or-no results

    // If selectError is not 'PGRST116' (not found), it's a real DB error
    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError
    }
    if (existingFarmer) {
      return res.status(400).json({ message: 'Farmer with this email already exists' })
    }

    // 2️⃣ Hash the password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // 3️⃣ Insert new farmer
    const { data: insertedFarmer, error: insertError } = await supabase
      .from('farmer')
      .insert([{ name, email, password: hashedPassword, city, village }])
      .select()
      .single()

    if (insertError) throw insertError

    // 4️⃣ Create JWT token
    const token = jwt.sign(
      { id: insertedFarmer.id, email: insertedFarmer.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    // 5️⃣ Send success response (excluding password)
    res.status(201).json({
      message: 'Farmer registered successfully',
      token,
      farmer: {
        id: insertedFarmer.id,
        name: insertedFarmer.name,
        email: insertedFarmer.email,
        city: insertedFarmer.city,
        village: insertedFarmer.village
      }
    })
  } catch (error) {
    console.error('Register Error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// ✅ Login existing farmer
export const loginFarmer = async (req, res) => {
  try {
    const { email, password } = req.body
    const normalizedEmail = (email || '').trim().toLowerCase()
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').trim().toLowerCase()
    const adminPassword = process.env.ADMIN_PASSWORD || 'bloom123'
    const isAdminLogin = normalizedEmail === adminEmail && password === adminPassword

    // 1️⃣ Check if farmer exists
    const { data: farmer, error: selectError } = await supabase
      .from('farmer')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (selectError) {
      return res.status(500).json({ message: 'Server error', error: selectError.message })
    }

    let ensuredFarmer = farmer
    if (!ensuredFarmer) {
      if (!isAdminLogin) {
        return res.status(400).json({ message: 'Invalid credentials' })
      }
      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(adminPassword, salt)
      const { data: insertedFarmer, error: insertError } = await supabase
        .from('farmer')
        .insert([{
          name: 'Admin',
          email: normalizedEmail,
          password: hashedPassword,
          city: 'Admin',
          village: ''
        }])
        .select()
        .single()
      if (insertError) throw insertError
      ensuredFarmer = insertedFarmer
    }

    // 2️⃣ Check password
    if (!isAdminLogin) {
      const isMatch = await bcrypt.compare(password, ensuredFarmer.password)
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' })
      }
    } else {
      const isMatch = await bcrypt.compare(adminPassword, ensuredFarmer.password)
      if (!isMatch) {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(adminPassword, salt)
        await supabase.from('farmer').update({ password: hashedPassword }).eq('id', ensuredFarmer.id)
        ensuredFarmer.password = hashedPassword
      }
    }

    // 3️⃣ Generate JWT token
    const token = jwt.sign(
      { id: ensuredFarmer.id, email: ensuredFarmer.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    )

    // 4️⃣ Send success response (excluding password)
    res.status(200).json({
      message: 'Login successful',
      token,
      farmer: {
        id: ensuredFarmer.id,
        name: ensuredFarmer.name,
        email: ensuredFarmer.email,
        city: ensuredFarmer.city,
        village: ensuredFarmer.village
      }
    })
  } catch (error) {
    console.error('Login Error:', error)
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}
