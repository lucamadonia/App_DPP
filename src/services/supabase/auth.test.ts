import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockSupabase,
  mockSupabaseAuth,
  clearSupabaseMocks,
} from '@/test/mocks/supabase'

// Mock the supabase module before importing the service
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAnon: mockSupabase,
  getCurrentTenantId: vi.fn(async () => 'test-tenant-id'),
}))

import {
  signInWithEmail,
  signUpWithEmail,
  signOut,
  sendPasswordReset,
  updatePassword,
  getSession,
  getUser,
  verifyOtp,
  updateProfile,
  onAuthStateChange,
} from './auth'

describe('Auth Service', () => {
  beforeEach(() => {
    clearSupabaseMocks()
    vi.clearAllMocks()
  })

  // ==========================================
  // signInWithEmail
  // ==========================================
  describe('signInWithEmail', () => {
    it('returns user and session on successful login', async () => {
      // Arrange
      mockSupabaseAuth('signInWithPassword', {
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            user_metadata: { name: 'Test User', avatar_url: 'https://example.com/avatar.jpg' },
          },
          session: { access_token: 'token-abc', refresh_token: 'refresh-abc' },
        },
        error: null,
      })

      // Act
      const result = await signInWithEmail('test@example.com', 'password123')

      // Assert
      expect(result.error).toBeNull()
      expect(result.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      })
      expect(result.session).toBeTruthy()
      expect(result.session?.access_token).toBe('token-abc')
    })

    it('returns error on invalid credentials', async () => {
      // Arrange
      mockSupabaseAuth('signInWithPassword', {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      })

      // Act
      const result = await signInWithEmail('wrong@example.com', 'wrongpass')

      // Assert
      expect(result.error).toBeTruthy()
      expect(result.error?.message).toBe('Invalid login credentials')
      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
    })

    it('calls supabase.auth.signInWithPassword with correct params', async () => {
      // Arrange
      mockSupabaseAuth('signInWithPassword', {
        data: { user: null, session: null },
        error: null,
      })

      // Act
      await signInWithEmail('test@example.com', 'mypassword')

      // Assert
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'mypassword',
      })
    })
  })

  // ==========================================
  // signUpWithEmail
  // ==========================================
  describe('signUpWithEmail', () => {
    it('returns user on successful registration', async () => {
      // Arrange
      mockSupabaseAuth('signUp', {
        data: {
          user: {
            id: 'new-user-456',
            email: 'new@example.com',
            user_metadata: { name: 'New User', full_name: 'New User' },
          },
          session: null, // email confirmation pending
        },
        error: null,
      })

      // Act
      const result = await signUpWithEmail('new@example.com', 'password123', 'New User')

      // Assert
      expect(result.error).toBeNull()
      expect(result.user).toEqual({
        id: 'new-user-456',
        email: 'new@example.com',
        name: 'New User',
        image: undefined,
      })
    })

    it('passes name in user_metadata options', async () => {
      // Arrange
      mockSupabaseAuth('signUp', {
        data: { user: null, session: null },
        error: null,
      })

      // Act
      await signUpWithEmail('test@example.com', 'pass', 'My Name')

      // Assert
      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'pass',
        options: {
          data: { name: 'My Name', full_name: 'My Name' },
        },
      })
    })

    it('returns error when email already exists', async () => {
      // Arrange
      mockSupabaseAuth('signUp', {
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422 },
      })

      // Act
      const result = await signUpWithEmail('existing@example.com', 'password')

      // Assert
      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('already registered')
    })
  })

  // ==========================================
  // signOut
  // ==========================================
  describe('signOut', () => {
    it('returns no error on successful sign out', async () => {
      // Arrange
      mockSupabaseAuth('signOut', { error: null })

      // Act
      const result = await signOut()

      // Assert
      expect(result.error).toBeNull()
      expect(mockSupabase.auth.signOut).toHaveBeenCalled()
    })

    it('returns error if sign out fails', async () => {
      // Arrange
      mockSupabaseAuth('signOut', { error: { message: 'Network error' } })

      // Act
      const result = await signOut()

      // Assert
      expect(result.error).toBeTruthy()
      expect(result.error?.message).toBe('Network error')
    })
  })

  // ==========================================
  // sendPasswordReset
  // ==========================================
  describe('sendPasswordReset', () => {
    it('sends reset email successfully', async () => {
      // Arrange
      mockSupabaseAuth('resetPasswordForEmail', { error: null })

      // Act
      const result = await sendPasswordReset('test@example.com')

      // Assert
      expect(result.error).toBeNull()
      expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ redirectTo: expect.stringContaining('/auth/reset-password') })
      )
    })

    it('returns error for invalid email', async () => {
      // Arrange
      mockSupabaseAuth('resetPasswordForEmail', {
        error: { message: 'Unable to validate email address: invalid format' },
      })

      // Act
      const result = await sendPasswordReset('not-an-email')

      // Assert
      expect(result.error).toBeTruthy()
      expect(result.error?.message).toContain('email')
    })
  })

  // ==========================================
  // updatePassword
  // ==========================================
  describe('updatePassword', () => {
    it('updates password successfully', async () => {
      // Arrange
      mockSupabaseAuth('updateUser', { error: null })

      // Act
      const result = await updatePassword('newSecureP@ss!')

      // Assert
      expect(result.error).toBeNull()
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        password: 'newSecureP@ss!',
      })
    })
  })

  // ==========================================
  // getSession
  // ==========================================
  describe('getSession', () => {
    it('returns user and session when authenticated', async () => {
      // Arrange
      mockSupabaseAuth('getSession', {
        data: {
          session: {
            access_token: 'tok',
            user: {
              id: 'user-1',
              email: 'user@example.com',
              user_metadata: { name: 'User One' },
            },
          },
        },
        error: null,
      })

      // Act
      const result = await getSession()

      // Assert
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User One',
        image: undefined,
      })
      expect(result.session).toBeTruthy()
    })

    it('returns null user and session when not authenticated', async () => {
      // Arrange
      mockSupabaseAuth('getSession', {
        data: { session: null },
        error: null,
      })

      // Act
      const result = await getSession()

      // Assert
      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
    })

    it('returns null on error', async () => {
      // Arrange
      mockSupabaseAuth('getSession', {
        data: { session: null },
        error: { message: 'Session expired' },
      })

      // Act
      const result = await getSession()

      // Assert
      expect(result.user).toBeNull()
      expect(result.session).toBeNull()
    })
  })

  // ==========================================
  // getUser
  // ==========================================
  describe('getUser', () => {
    it('returns transformed user', async () => {
      // Arrange
      mockSupabaseAuth('getUser', {
        data: {
          user: {
            id: 'u-1',
            email: 'me@test.com',
            user_metadata: { full_name: 'Full Name', picture: 'pic.jpg' },
          },
        },
      })

      // Act
      const user = await getUser()

      // Assert
      expect(user).toEqual({
        id: 'u-1',
        email: 'me@test.com',
        name: 'Full Name',
        image: 'pic.jpg',
      })
    })

    it('returns null when not authenticated', async () => {
      // Arrange
      mockSupabaseAuth('getUser', { data: { user: null } })

      // Act
      const user = await getUser()

      // Assert
      expect(user).toBeNull()
    })
  })

  // ==========================================
  // verifyOtp
  // ==========================================
  describe('verifyOtp', () => {
    it('verifies OTP and returns user', async () => {
      // Arrange
      mockSupabaseAuth('verifyOtp', {
        data: {
          user: { id: 'u-otp', email: 'otp@test.com', user_metadata: {} },
          session: { access_token: 'otp-tok' },
        },
        error: null,
      })

      // Act
      const result = await verifyOtp('otp@test.com', '123456')

      // Assert
      expect(result.error).toBeNull()
      expect(result.user?.id).toBe('u-otp')
      expect(mockSupabase.auth.verifyOtp).toHaveBeenCalledWith({
        email: 'otp@test.com',
        token: '123456',
        type: 'email',
      })
    })
  })

  // ==========================================
  // updateProfile
  // ==========================================
  describe('updateProfile', () => {
    it('updates user metadata with name and avatar', async () => {
      // Arrange
      mockSupabaseAuth('updateUser', { error: null })

      // Act
      const result = await updateProfile({ name: 'New Name', avatar_url: 'new-pic.jpg' })

      // Assert
      expect(result.error).toBeNull()
      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: {
          name: 'New Name',
          full_name: 'New Name',
          avatar_url: 'new-pic.jpg',
        },
      })
    })
  })

  // ==========================================
  // onAuthStateChange
  // ==========================================
  describe('onAuthStateChange', () => {
    it('returns an unsubscribe function', () => {
      // Act
      const unsubscribe = onAuthStateChange(vi.fn())

      // Assert
      expect(typeof unsubscribe).toBe('function')
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
    })
  })
})
