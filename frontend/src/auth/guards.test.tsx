import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, roleDefaultPath } from './AuthContext';
import { RequireAuth, RequireRole } from './guards';
import { setStoredToken } from '../api/client';

describe('roleDefaultPath', () => {
  it('routes each role to its workspace', () => {
    expect(roleDefaultPath('tourist')).toBe('/');
    expect(roleDefaultPath('guide')).toBe('/provider');
    expect(roleDefaultPath('agency_manager')).toBe('/provider');
    expect(roleDefaultPath('admin')).toBe('/admin');
  });
});

describe('Route guards (<RequireAuth> & <RequireRole>)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('redirects unauthenticated visitors to /login', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/me']}>
          <Routes>
            <Route path="/login" element={<div>Login Screen</div>} />
            <Route
              path="/me"
              element={
                <RequireAuth>
                  <div>Private Profile</div>
                </RequireAuth>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    expect(await screen.findByText('Login Screen')).toBeInTheDocument();
  });

  it('renders 403 Forbidden when an authenticated user lacks the required role', async () => {
    setStoredToken('valid-token');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            id: 2,
            email: 'guide@tis.kz',
            full_name: 'Aidar Guide',
            phone: '+77011112233',
            role: 'guide',
            created_at: '2026-11-01T00:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <RequireRole roles={['admin']}>
                  <div>Secret Admin Console</div>
                </RequireRole>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Access Restricted \(403 Forbidden\)/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Secret Admin Console')).not.toBeInTheDocument();
  });
});
