import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ApiError, authApi } from '../services/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [databaseMessage, setDatabaseMessage] = useState('')

  const checkAuthentication = useCallback(async () => {
    setLoading(true)
    try {
      const result = await authApi.me()
      setUser(result.user)
      setDatabaseMessage('')
    } catch (error) {
      setUser(null)
      if (error instanceof ApiError && error.status === 503) setDatabaseMessage(error.message)
      else setDatabaseMessage('')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    checkAuthentication()
  }, [checkAuthentication])

  const login = useCallback(async (values) => {
    const result = await authApi.login(values)
    setUser(result.user)
    setDatabaseMessage('')
    return result.user
  }, [])

  const register = useCallback((values) => authApi.register(values), [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const updateUser = useCallback((values) => {
    setUser((current) => current ? { ...current, ...values } : current)
  }, [])

  const value = useMemo(() => ({ user, loading, databaseMessage, login, logout, register, checkAuthentication, updateUser }), [
    user, loading, databaseMessage, login, logout, register, checkAuthentication, updateUser,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
