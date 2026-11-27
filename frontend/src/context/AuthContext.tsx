import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient, getAccessToken, setAccessToken } from '../api/client';
import { RoleName, UsuarioPerfil } from '../types';

interface AuthContextValue {
  usuario: UsuarioPerfil | null;
  cargando: boolean;
  autenticado: boolean;
  login: (
    correo: string,
    clave: string,
    codigoMfa?: string,
  ) => Promise<{ mfaRequired?: boolean; usuario?: UsuarioPerfil }>;
  logout: () => Promise<void>;
  refrescarPerfil: () => Promise<void>;
  actualizarSesion: (token: string, usuario: UsuarioPerfil) => void;
  tieneRol: (...roles: RoleName[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<UsuarioPerfil | null>(null);
  const [cargando, setCargando] = useState(true);

  const refrescarPerfil = useCallback(async () => {
    try {
      const { data } = await apiClient.get<UsuarioPerfil>('/auth/me');
      setUsuario(data);
    } catch {
      setUsuario(null);
      setAccessToken(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const token = getAccessToken();
      if (token) {
        await refrescarPerfil();
      }
      setCargando(false);
    };
    init();
  }, [refrescarPerfil]);

  const login = async (correo: string, clave: string, codigoMfa?: string) => {
    const { data } = await apiClient.post('/auth/login', {
      correo,
      clave,
      codigoMfa: codigoMfa || undefined,
    });
    if (data.mfaRequired) {
      return { mfaRequired: true };
    }
    setAccessToken(data.accessToken);
    setUsuario(data.usuario);
    return { mfaRequired: false, usuario: data.usuario };
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // continuar cerrando sesión en cliente
    }
    setAccessToken(null);
    setUsuario(null);
  };

  const actualizarSesion = (token: string, perfil: UsuarioPerfil) => {
    setAccessToken(token);
    setUsuario(perfil);
  };

  const tieneRol = (...roles: RoleName[]) => {
    if (!usuario) return false;
    return roles.some((r) => usuario.roles.includes(r));
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        cargando,
        autenticado: !!usuario,
        login,
        logout,
        refrescarPerfil,
        actualizarSesion,
        tieneRol,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe utilizarse dentro de AuthProvider');
  return ctx;
}
